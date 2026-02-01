import Alignment from "@/core/Alignment";
import Vector from "@/core/Vector";
import SoundMgr from "@/game/CTRSoundMgr";
import * as GameSceneConstants from "@/gameScene/constants";
import ResourceId from "@/resources/ResourceId";
import Animation from "@/visual/Animation";
import BaseElement from "@/visual/BaseElement";
import ImageElement from "@/visual/ImageElement";
import type ConstrainedPoint from "@/physics/ConstrainedPoint";
import type GameObject from "@/visual/GameObject";
import type MiceObject from "./MiceObject";

interface SharedMouseSprites {
    container: BaseElement;
    body: Animation;
    eyes: Animation;
}

interface PathPoint {
    offset: Vector;
    time: number;
}

class MouthPathPlayer {
    private path: PathPoint[] = [];
    private duration = 0;
    private elapsed = 0;
    private active = false;
    private currentOffset: Vector = Vector.newZero();

    play(path: PathPoint[]): void {
        this.path = path;
        this.duration = path[path.length - 1]?.time ?? 0;
        this.elapsed = 0;
        this.active = this.duration > 0;
        if (path.length > 0) {
            this.currentOffset = path[0]!.offset.copy();
        }
    }

    update(delta: number): Vector {
        if (!this.active || this.path.length === 0) {
            return this.currentOffset;
        }

        this.elapsed += delta;
        if (this.elapsed >= this.duration) {
            this.elapsed = this.duration;
            this.active = false;
            this.currentOffset = this.path[this.path.length - 1]!.offset.copy();
            return this.currentOffset;
        }

        let startIndex = 0;
        while (
            startIndex < this.path.length - 1 &&
            this.path[startIndex + 1]!.time <= this.elapsed
        ) {
            startIndex++;
        }

        const start = this.path[startIndex]!;
        const end = this.path[startIndex + 1] ?? start;
        const span = Math.max(end.time - start.time, 0.0001);
        const t = Math.min(Math.max((this.elapsed - start.time) / span, 0), 1);

        this.currentOffset.x = start.offset.x + (end.offset.x - start.offset.x) * t;
        this.currentOffset.y = start.offset.y + (end.offset.y - start.offset.y) * t;

        return this.currentOffset;
    }

    isPlaying(): boolean {
        return this.active;
    }
}

const enum MouseAnimationId {
    ENTRY_EMPTY = 0,
    ENTRY_WITH_CANDY = 1,
    EXIT_EMPTY = 2,
    EXIT_WITH_CANDY = 3,
    RETREAT = 4,
    IDLE = 5,
}

class Mouse extends BaseElement {
    index: number;
    grabRadius: number;
    activeDuration: number;
    angleDeg: number;

    isActive: boolean;
    private elapsedActive: number;
    private carriedStar: ConstrainedPoint | null;
    private carriedCandy: GameObject | null;
    private readonly entryOffsets: Vector[];
    private readonly exitOffsets: Vector[];
    private readonly mouthPathPlayer: MouthPathPlayer;
    private readonly mouseGroup: BaseElement;
    private readonly holeSprite: ImageElement;
    private sharedSprites: SharedMouseSprites | null;
    private retreating: boolean;
    private grabAnimating: boolean;
    private manager: MiceObject;

    constructor(manager: MiceObject) {
        super();
        this.manager = manager;
        this.index = 0;
        this.grabRadius = 0;
        this.activeDuration = 0;
        this.angleDeg = 0;

        this.isActive = false;
        this.retreating = false;
        this.elapsedActive = 0;
        this.carriedStar = null;
        this.carriedCandy = null;
        this.grabAnimating = false;

        this.entryOffsets = [];
        this.exitOffsets = [];
        this.mouthPathPlayer = new MouthPathPlayer();
        this.sharedSprites = null;

        this.mouseGroup = new BaseElement();
        this.mouseGroup.anchor = this.mouseGroup.parentAnchor = Alignment.CENTER;

        this.holeSprite = ImageElement.create(
            ResourceId.IMG_OBJ_GAP,
            GameSceneConstants.IMG_OBJ_GAP_cheese_hole
        );
        this.holeSprite.anchor = this.holeSprite.parentAnchor = Alignment.CENTER;
        this.holeSprite.scaleX = this.holeSprite.scaleY = 1;
        this.holeSprite.doRestoreCutTransparency();

        //this.addChild(this.holeSprite);
        this.addChild(this.mouseGroup);
    }

    initialize(position: Vector, angleDeg: number, grabRadius: number, activeDuration: number) {
        this.x = position.x;
        this.y = position.y;
        this.angleDeg = angleDeg;
        this.grabRadius = grabRadius;
        this.activeDuration = activeDuration;
        this.isActive = false;
        this.retreating = false;
        this.elapsedActive = 0;
        this.carriedStar = null;
        this.carriedCandy = null;

        const angleRad = (angleDeg * Math.PI) / 180;
        const origin = Vector.newZero();
        const rotate = (v: Vector) => {
            const copy = v.copy();
            copy.rotate(angleRad);
            return copy;
        };

        this.entryOffsets[0] = Vector.add(origin, rotate(new Vector(0, -4.4)));
        // candy position after grabbing
        this.entryOffsets[1] = Vector.add(origin, rotate(new Vector(0, -48)));
        this.entryOffsets[2] = Vector.add(origin, rotate(new Vector(0, -57)));
        this.entryOffsets[3] = Vector.add(origin, rotate(new Vector(0, -53)));

        this.exitOffsets[0] = Vector.add(origin, rotate(new Vector(0, -36.4)));
        this.exitOffsets[1] = Vector.add(origin, rotate(new Vector(0, -43.2)));
        this.exitOffsets[2] = Vector.add(origin, rotate(new Vector(0, -9.2)));
    }

    spawn(
        sharedSprites: SharedMouseSprites,
        carriedCandy: GameObject | null,
        carriedStar?: ConstrainedPoint | null
    ): void {
        this.sharedSprites = sharedSprites;
        this.carriedCandy = carriedCandy;
        this.carriedStar = carriedStar ?? null;

        this.mouseGroup.removeAllChildren();
        this.mouseGroup.addChild(sharedSprites.container);
        sharedSprites.container.parent = this.mouseGroup;

        // Ensure candy visuals are positioned at the mouth even if the physics point is missing
        if (carriedCandy && !carriedStar) {
            const offset = this.entryOffsets[3] ?? Vector.newZero();
            carriedCandy.x = this.x + offset.x;
            carriedCandy.y = this.y + offset.y;
        }

        this.playAnimation(
            carriedCandy ? MouseAnimationId.ENTRY_WITH_CANDY : MouseAnimationId.ENTRY_EMPTY
        );
        this.retreating = false;
        this.isActive = false;
        this.elapsedActive = 0;
        this.grabAnimating = false;

        sharedSprites.eyes.visible = false;

        if (carriedStar) {
            this.attachExistingCandy(carriedStar, carriedCandy);
        }

        SoundMgr.playSound(ResourceId.SND_MOUSE_RUSTLE);
    }

    private createEntryPath(): PathPoint[] {
        return [
            { offset: this.entryOffsets[0] ?? Vector.newZero(), time: 0 },
            { offset: this.entryOffsets[1] ?? Vector.newZero(), time: 0.05 },
            { offset: this.entryOffsets[2] ?? Vector.newZero(), time: 0.1 },
            { offset: this.entryOffsets[3] ?? Vector.newZero(), time: 0.15 },
        ];
    }

    private createExitPath(): PathPoint[] {
        return [
            { offset: this.exitOffsets[0] ?? Vector.newZero(), time: 0 },
            { offset: this.exitOffsets[1] ?? Vector.newZero(), time: 0.05 },
            { offset: this.exitOffsets[2] ?? Vector.newZero(), time: 0.1 },
        ];
    }

    private playAnimation(id: MouseAnimationId) {
        const shared = this.sharedSprites;
        if (!shared) {
            return;
        }
        shared.body.playTimeline(id);
        if (shared.body.currentTimeline) {
            shared.body.currentTimeline.onFinished = this.onAnimationFinished.bind(this);
        }
    }

    private enableEyesBlink(): void {
        const shared = this.sharedSprites;
        if (!shared) {
            return;
        }
        shared.eyes.visible = true;
        shared.eyes.playTimeline(0);
    }

    onAnimationFinished(): void {
        const shared = this.sharedSprites;
        const currentId = shared?.body.currentTimelineIndex ?? MouseAnimationId.IDLE;

        if (
            currentId === MouseAnimationId.EXIT_EMPTY ||
            currentId === MouseAnimationId.EXIT_WITH_CANDY
        ) {
            if (shared) {
                this.mouseGroup.removeChild(shared.container);
                this.sharedSprites = null;
            } else {
                this.mouseGroup.removeAllChildren();
            }
            this.manager.advanceToNextMouse();
            return;
        }

        if (
            currentId === MouseAnimationId.ENTRY_EMPTY ||
            currentId === MouseAnimationId.ENTRY_WITH_CANDY
        ) {
            this.isActive = true;
            this.elapsedActive = 0;

            if (currentId === MouseAnimationId.ENTRY_EMPTY && Math.random() < 0.5) {
                this.playAnimation(MouseAnimationId.IDLE);
                this.enableEyesBlink();
            }
        }
    }

    isWithinGrabRadius(target: ConstrainedPoint): boolean {
        return Vector.distance(this.x, this.y, target.pos.x, target.pos.y) < this.grabRadius;
    }

    grabCandy(star: ConstrainedPoint, candy: GameObject): void {
        this.carriedStar = star;
        this.carriedCandy = candy;

        star.disableGravity = true;
        star.v.x = 0;
        star.v.y = 0;
        const offset = this.entryOffsets[3] ?? Vector.newZero();
        star.pos.x = this.x + offset.x;
        star.pos.y = this.y + offset.y;
        star.prevPos.copyFrom(star.pos);
        this.mouthPathPlayer.play(this.createEntryPath());
        this.grabAnimating = true;

        const shared = this.sharedSprites;
        if (shared) {
            shared.body.setTextureQuad(GameSceneConstants.IMG_OBJ_GAP_MOUSE_0008);
        }

        SoundMgr.playSound(ResourceId.SND_MOUSE_IDLE);
    }

    dropCandy(): void {
        if (!this.carriedStar) {
            return;
        }

        this.carriedStar.disableGravity = false;
        this.carriedStar.prevPos.copyFrom(this.carriedStar.pos);
        this.carriedStar = null;
        this.carriedCandy = null;
        this.grabAnimating = false;
        SoundMgr.playSound(ResourceId.SND_MOUSE_TAP);
    }

    dropCandyAndRetreat(): void {
        this.dropCandy();
        this.beginRetreat();
    }

    beginRetreat(): void {
        if (this.retreating) {
            return;
        }
        const shared = this.sharedSprites;
        if (shared) {
            shared.eyes.visible = false;
        }
        this.retreating = true;
        this.isActive = false;
        this.elapsedActive = 0;
        this.grabAnimating = false;

        this.mouthPathPlayer.play(this.createExitPath());
        this.playAnimation(
            this.carriedStar ? MouseAnimationId.EXIT_WITH_CANDY : MouseAnimationId.EXIT_EMPTY
        );
    }

    override update(delta: number): void {
        super.update(delta);

        const shared = this.sharedSprites;
        // Only the mouse that currently owns the shared sprites should mutate them
        if (shared && shared.container.parent === this.mouseGroup) {
            shared.container.rotation = this.angleDeg;
            shared.container.scaleX = shared.container.scaleY = 1;
        }

        const mouthOffset = this.mouthPathPlayer.update(delta);
        if (this.grabAnimating && !this.mouthPathPlayer.isPlaying()) {
            this.grabAnimating = false;
        }
        if (this.carriedStar) {
            const star = this.carriedStar;
            star.pos.x = this.x + mouthOffset.x;
            star.pos.y = this.y + mouthOffset.y;
            star.prevPos.copyFrom(star.pos);
        }

        if (this.isActive && !this.retreating && !this.grabAnimating) {
            this.elapsedActive += delta;
            if (this.elapsedActive >= this.activeDuration) {
                this.beginRetreat();
            }
        }

        this.mouseGroup.x = this.x;
        this.mouseGroup.y = this.y;
    }

    attachExistingCandy(star: ConstrainedPoint, candy: GameObject | null): void {
        this.carriedStar = star;
        this.carriedCandy = candy ?? null;
        star.disableGravity = true;
        star.v.x = 0;
        star.v.y = 0;
        const offset = this.entryOffsets[3] ?? Vector.newZero();
        star.pos.x = this.x + offset.x;
        star.pos.y = this.y + offset.y;
        star.prevPos.copyFrom(star.pos);
        this.mouthPathPlayer.play(this.createEntryPath());
        this.grabAnimating = true;
    }

    hasCandy(): boolean {
        return !!this.carriedStar;
    }

    isClickable(clickX: number, clickY: number): boolean {
        if (!this.isActive || !this.carriedStar || this.retreating) {
            return false;
        }
        return Vector.distance(this.x, this.y, clickX, clickY) < this.grabRadius;
    }

    drawHole(): void {
        this.holeSprite.x = this.x;
        this.holeSprite.y = this.y;
        this.holeSprite.draw();
    }

    drawMouse(): void {
        this.mouseGroup.draw();
    }

    lock(): void {
        this.retreating = true;
        this.isActive = false;
    }

    detachCarriedCandy(): { star: ConstrainedPoint | null; candy: GameObject | null } {
        const star = this.carriedStar;
        const candy = this.carriedCandy;
        this.carriedStar = null;
        this.carriedCandy = null;
        return { star, candy };
    }
}

export type { SharedMouseSprites };
export default Mouse;
