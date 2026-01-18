import Alignment from "@/core/Alignment";
import type ConstrainedPoint from "@/physics/ConstrainedPoint";
import * as GameSceneConstants from "@/gameScene/constants";
import ResourceId from "@/resources/ResourceId";
import Animation from "@/visual/Animation";
import BaseElement from "@/visual/BaseElement";
import Timeline from "@/visual/Timeline";
import Mouse, { type SharedMouseSprites } from "./Mouse";
import type { GameScene } from "@/types/game-scene";
import type GameObject from "@/visual/GameObject";

class MiceObject {
    readonly mice: Mouse[] = [];
    activeMouse: Mouse | null = null;
    activeIndex = -1;
    sharedSpriteContainer: SharedMouseSprites | null = null;
    advanceLocked = false;
    carriedStar: ConstrainedPoint | null = null;
    carriedCandy: GameObject | null = null;

    private readonly scene: GameScene;

    constructor(scene: GameScene) {
        this.scene = scene;
    }

    update(delta: number): void {
        for (const mouse of this.mice) {
            mouse.update(delta);
        }
    }

    drawHoles(): void {
        for (const mouse of this.mice) {
            mouse.drawHole();
        }
    }

    drawMice(): void {
        for (const mouse of this.mice) {
            if (mouse === this.activeMouse) {
                mouse.drawMouse();
            }
        }
    }

    registerMouse(mouse: Mouse, index: number): void {
        mouse.index = index;
        this.mice.push(mouse);

        if (!this.sharedSpriteContainer) {
            this.sharedSpriteContainer = this.createSharedSprites();
        }

        const hasIndexOne = this.mice.some((m) => m.index === 1);
        if (this.sharedSpriteContainer && (index === 1 || (!this.activeMouse && !hasIndexOne))) {
            this.activeMouse = mouse;
            this.activeIndex = index;
            mouse.spawn(this.sharedSpriteContainer, this.carriedCandy, this.carriedStar);
        }
    }

    isActiveMouseInRange(target: ConstrainedPoint): boolean {
        const active = this.activeMouse;
        if (!active) {
            return false;
        }
        return active.isActive && active.isWithinGrabRadius(target);
    }

    grabWithActiveMouse(star: ConstrainedPoint, candy: GameObject, isLeft: boolean): void {
        const active = this.activeMouse;
        if (!active || active.hasCandy()) {
            return;
        }

        // detach existing ropes to avoid conflicts
        this.scene.releaseAllRopes(isLeft);
        this.scene.attachCount = 0;
        this.scene.detachCandy();

        this.carriedStar = star;
        this.carriedCandy = candy;
        active.grabCandy(star, candy);
    }

    activeMouseHasCandy(): boolean {
        return !!this.activeMouse?.hasCandy();
    }

    handleClick(x: number, y: number): boolean {
        const active = this.activeMouse;
        if (!active || !active.hasCandy()) {
            return false;
        }

        if (active.isClickable(x, y)) {
            active.dropCandyAndRetreat();
            this.carriedStar = null;
            this.carriedCandy = null;
            return true;
        }

        return false;
    }

    advanceToNextMouse(): void {
        if (this.advanceLocked || !this.sharedSpriteContainer) {
            return;
        }

        if (!this.activeMouse || this.mice.length === 0) {
            return;
        }

        const ordered = [...this.mice].sort((a, b) => a.index - b.index);
        const currentMouse = ordered.find((mouse) => mouse.index === this.activeIndex);
        const currentIdx = currentMouse ? ordered.indexOf(currentMouse) : -1;
        const nextIdx = (currentIdx + 1) % ordered.length;
        const nextMouse = ordered[nextIdx] ?? ordered[0];

        if (!currentMouse || !nextMouse) {
            return;
        }

        currentMouse.detachCarriedCandy();
        this.activeIndex = nextMouse.index;
        this.activeMouse = nextMouse;
        nextMouse.spawn(this.sharedSpriteContainer, this.carriedCandy, this.carriedStar);
    }

    lockActiveMouse(): void {
        this.advanceLocked = true;
        this.activeMouse?.lock();
    }

    private createSharedSprites(): SharedMouseSprites {
        const container = new BaseElement();
        container.anchor = container.parentAnchor = Alignment.CENTER;

        const body = new Animation();
        body.initTextureWithId(ResourceId.IMG_OBJ_GAP);
        body.anchor = body.parentAnchor = Alignment.CENTER;
        body.doRestoreCutTransparency();
        body.addAnimationSequence(0, 0.05, Timeline.LoopType.NO_LOOP, 3, [
            GameSceneConstants.IMG_OBJ_GAP_MOUSE_start,
            GameSceneConstants.IMG_OBJ_GAP_MOUSE_start + 1,
            GameSceneConstants.IMG_OBJ_GAP_MOUSE_start + 2,
        ]);
        body.addAnimationSequence(1, 0.05, Timeline.LoopType.NO_LOOP, 3, [
            GameSceneConstants.IMG_OBJ_GAP_MOUSE_start + 3,
            GameSceneConstants.IMG_OBJ_GAP_MOUSE_start + 4,
            GameSceneConstants.IMG_OBJ_GAP_MOUSE_0008,
        ]);
        body.addAnimationSequence(2, 0.05, Timeline.LoopType.NO_LOOP, 4, [
            GameSceneConstants.IMG_OBJ_GAP_MOUSE_start + 2,
            GameSceneConstants.IMG_OBJ_GAP_MOUSE_start + 6,
            GameSceneConstants.IMG_OBJ_GAP_MOUSE_start + 7,
            GameSceneConstants.IMG_OBJ_GAP_MOUSE_end,
        ]);
        body.addAnimationSequence(3, 0.05, Timeline.LoopType.NO_LOOP, 4, [
            GameSceneConstants.IMG_OBJ_GAP_MOUSE_0008,
            GameSceneConstants.IMG_OBJ_GAP_MOUSE_start + 9,
            GameSceneConstants.IMG_OBJ_GAP_MOUSE_start + 10,
            GameSceneConstants.IMG_OBJ_GAP_MOUSE_end,
        ]);
        body.addAnimationEndpoints(
            5,
            0.05,
            Timeline.LoopType.NO_LOOP,
            GameSceneConstants.IMG_OBJ_GAP_idle,
            GameSceneConstants.IMG_OBJ_GAP_idle
        );

        container.addChild(body);

        const eyes = new Animation();
        eyes.initTextureWithId(ResourceId.IMG_OBJ_GAP);
        eyes.anchor = eyes.parentAnchor = Alignment.CENTER;
        eyes.doRestoreCutTransparency();
        eyes.addAnimationEndpoints(
            0,
            0.05,
            Timeline.LoopType.NO_LOOP,
            GameSceneConstants.IMG_OBJ_GAP_eyes_start,
            GameSceneConstants.IMG_OBJ_GAP_eyes_end
        );
        container.addChild(eyes);
        eyes.visible = false;

        return { container, body, eyes };
    }
}

export default MiceObject;
