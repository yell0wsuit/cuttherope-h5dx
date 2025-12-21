import Alignment from "@/core/Alignment";
import RGBAColor from "@/core/RGBAColor";
import Vector from "@/core/Vector";
import ConstrainedPoint from "@/physics/ConstrainedPoint";
import ResourceId from "@/resources/ResourceId";
import resolution from "@/resolution";
import SoundMgr from "@/game/CTRSoundMgr";
import { DelayedDispatcher } from "@/utils/DelayedDispatcher";
import * as GameSceneConstants from "@/gameScene/constants";
import KeyFrame from "@/visual/KeyFrame";
import Timeline from "@/visual/Timeline";
import CTRGameObject from "./CTRGameObject";
import GameObject from "@/visual/GameObject";

const FIRE_QUAD = GameSceneConstants.IMG_OBJ_LANTERN_fire;
const LANTERN_END_QUAD = GameSceneConstants.IMG_OBJ_LANTERN_lantern_end;
const LANTERN_START_QUAD = GameSceneConstants.IMG_OBJ_LANTERN_lantern_start;
const INNER_CANDY_START_QUAD = GameSceneConstants.IMG_OBJ_LANTERN_inner_candy_start;
const LANTERN_QUAD_IN_CANDY_TEXTURE = GameSceneConstants.IMG_OBJ_LANTERN_CANDY_QUAD;

const INNER_CANDY_APPEAR_TIMELINE_ID = 0;
const INNER_CANDY_HIDE_TIMELINE_ID = 1;
const INNER_CANDY_IDLE_TIMELINE_ID = 2;

const LANTERN_INACTIVE_DELAY = 0.4;

const enum LanternState {
    INACTIVE = 0,
    ACTIVE = 1,
}

const enum LanternActivation {
    ACTIVATION = 0,
    DEACTIVATION = 1,
    FIRE_BOUNCE = 2,
}

class Lantern extends CTRGameObject {
    static readonly STATE = {
        INACTIVE: LanternState.INACTIVE,
        ACTIVE: LanternState.ACTIVE,
    } as const;
    static readonly CANDY_REVEAL_TIME = GameSceneConstants.LANTERN_CANDY_REVEAL_TIME;

    static getAllLanterns(): Lantern[] {
        return Lantern.allLanterns;
    }

    static removeAllLanterns(): void {
        Lantern.sharedCandyPoint = null;
        Lantern.allLanterns.length = 0;
    }

    static sharedCandyPoint: ConstrainedPoint | null = null;
    private static allLanterns: Lantern[] = [];

    lanternState: LanternState;
    prevPos: Vector;

    private idleForm: GameObject;
    private activeForm: GameObject;
    private innerCandy: GameObject;
    private fire: GameObject;
    private readonly delayedDispatcher: DelayedDispatcher;

    constructor(x: number, y: number, selectedCandySkin: number, candyResourceId: number) {
        super();

        this.prevPos = Vector.newZero();
        this.delayedDispatcher = new DelayedDispatcher();
        this.lanternState = LanternState.INACTIVE;

        this.initTextureWithId(ResourceId.IMG_OBJ_LANTERN);
        Lantern.getAllLanterns().push(this);

        this.x = x;
        this.y = y;

        this.fire = new GameObject();
        this.fire.initTextureWithId(ResourceId.IMG_OBJ_LANTERN);
        this.fire.setTextureQuad(FIRE_QUAD);
        this.fire.anchor = this.fire.parentAnchor = Alignment.CENTER;
        this.fire.color = RGBAColor.transparent.copy();
        this.fire.doRestoreCutTransparency();
        this.addChild(this.fire);

        const fireTimeline = new Timeline();
        fireTimeline.addKeyFrame(KeyFrame.makeScale(1.4, 1.0, KeyFrame.TransitionType.LINEAR, 0));
        fireTimeline.addKeyFrame(
            KeyFrame.makeScale(1.05, 1.3, KeyFrame.TransitionType.EASE_OUT, 0.5)
        );
        fireTimeline.addKeyFrame(
            KeyFrame.makeColor(new RGBAColor(0.7, 0.7, 0.7, 0.7), KeyFrame.TransitionType.LINEAR, 0)
        );
        fireTimeline.addKeyFrame(
            KeyFrame.makeColor(RGBAColor.solidOpaque.copy(), KeyFrame.TransitionType.LINEAR, 0.5)
        );
        fireTimeline.loopType = Timeline.LoopType.PING_PONG;
        this.fire.addTimelineWithID(fireTimeline, LanternActivation.FIRE_BOUNCE);

        this.idleForm = new GameObject();
        this.idleForm.initTextureWithId(ResourceId.IMG_OBJ_LANTERN);
        this.idleForm.setTextureQuad(LANTERN_START_QUAD);
        this.idleForm.anchor = this.idleForm.parentAnchor = Alignment.CENTER;
        this.idleForm.doRestoreCutTransparency();
        this.addChild(this.idleForm);

        const idleActivation = new Timeline();
        idleActivation.addKeyFrame(
            KeyFrame.makeColor(RGBAColor.solidOpaque.copy(), KeyFrame.TransitionType.LINEAR, 0)
        );
        idleActivation.addKeyFrame(
            KeyFrame.makeColor(RGBAColor.transparent.copy(), KeyFrame.TransitionType.LINEAR, 0.3)
        );
        this.idleForm.addTimelineWithID(idleActivation, LanternActivation.ACTIVATION);

        const idleDeactivation = new Timeline();
        idleDeactivation.addKeyFrame(
            KeyFrame.makeColor(RGBAColor.transparent.copy(), KeyFrame.TransitionType.LINEAR, 0)
        );
        idleDeactivation.addKeyFrame(
            KeyFrame.makeColor(RGBAColor.solidOpaque.copy(), KeyFrame.TransitionType.LINEAR, 0.3)
        );
        this.idleForm.addTimelineWithID(idleDeactivation, LanternActivation.DEACTIVATION);

        this.activeForm = new GameObject();
        this.activeForm.initTextureWithId(ResourceId.IMG_OBJ_LANTERN);
        this.activeForm.setTextureQuad(LANTERN_END_QUAD);
        this.activeForm.anchor = this.activeForm.parentAnchor = Alignment.CENTER;
        this.activeForm.color = RGBAColor.transparent.copy();
        this.activeForm.y = 1;
        this.activeForm.doRestoreCutTransparency();
        this.addChild(this.activeForm);

        const activeActivation = new Timeline();
        activeActivation.addKeyFrame(
            KeyFrame.makeColor(RGBAColor.transparent.copy(), KeyFrame.TransitionType.LINEAR, 0)
        );
        activeActivation.addKeyFrame(
            KeyFrame.makeColor(RGBAColor.solidOpaque.copy(), KeyFrame.TransitionType.LINEAR, 0.3)
        );
        this.activeForm.addTimelineWithID(activeActivation, LanternActivation.ACTIVATION);

        const activeDeactivation = new Timeline();
        activeDeactivation.addKeyFrame(
            KeyFrame.makeColor(RGBAColor.solidOpaque.copy(), KeyFrame.TransitionType.LINEAR, 0)
        );
        activeDeactivation.addKeyFrame(
            KeyFrame.makeColor(RGBAColor.transparent.copy(), KeyFrame.TransitionType.LINEAR, 0.3)
        );
        this.activeForm.addTimelineWithID(activeDeactivation, LanternActivation.DEACTIVATION);

        let innerCandyResource: number = ResourceId.IMG_OBJ_LANTERN;
        let innerCandyQuad = INNER_CANDY_START_QUAD + selectedCandySkin;
        if (selectedCandySkin >= 3) {
            innerCandyResource = candyResourceId;
            innerCandyQuad = LANTERN_QUAD_IN_CANDY_TEXTURE;
        }

        this.innerCandy = new GameObject();
        this.innerCandy.initTextureWithId(innerCandyResource);
        this.innerCandy.setTextureQuad(innerCandyQuad);
        this.innerCandy.anchor = this.innerCandy.parentAnchor = Alignment.CENTER;
        this.innerCandy.color = RGBAColor.transparent.copy();
        this.innerCandy.y = -4;
        this.innerCandy.doRestoreCutTransparency();
        this.addChild(this.innerCandy);

        const candyAppear = new Timeline();
        candyAppear.addKeyFrame(
            KeyFrame.makeColor(RGBAColor.transparent.copy(), KeyFrame.TransitionType.LINEAR, 0)
        );
        candyAppear.addKeyFrame(
            KeyFrame.makeColor(RGBAColor.solidOpaque.copy(), KeyFrame.TransitionType.LINEAR, 0.2)
        );
        candyAppear.addKeyFrame(KeyFrame.makeScale(1.0, 1.0, KeyFrame.TransitionType.LINEAR, 0));
        candyAppear.addKeyFrame(KeyFrame.makeScale(1.0, 0.8, KeyFrame.TransitionType.LINEAR, 0.07));
        candyAppear.addKeyFrame(
            KeyFrame.makeScale(0.85, 1.05, KeyFrame.TransitionType.LINEAR, 0.05)
        );
        candyAppear.addKeyFrame(KeyFrame.makeScale(1.0, 1.0, KeyFrame.TransitionType.LINEAR, 0.05));
        candyAppear.addKeyFrame(KeyFrame.makePos(0.0, -4.0, KeyFrame.TransitionType.LINEAR, 0));
        candyAppear.addKeyFrame(KeyFrame.makePos(0.0, 0.0, KeyFrame.TransitionType.LINEAR, 0.1));
        candyAppear.addKeyFrame(KeyFrame.makePos(0.0, -1.0, KeyFrame.TransitionType.LINEAR, 0.05));
        this.innerCandy.addTimelineWithID(candyAppear, INNER_CANDY_APPEAR_TIMELINE_ID);

        const candyHide = new Timeline();
        candyHide.addKeyFrame(
            KeyFrame.makeColor(RGBAColor.solidOpaque.copy(), KeyFrame.TransitionType.LINEAR, 0)
        );
        candyHide.addKeyFrame(
            KeyFrame.makeColor(
                new RGBAColor(0.6, 0.6, 0.6, 0.6),
                KeyFrame.TransitionType.LINEAR,
                0.06
            )
        );
        candyHide.addKeyFrame(
            KeyFrame.makeColor(RGBAColor.transparent.copy(), KeyFrame.TransitionType.LINEAR, 0.04)
        );
        candyHide.addKeyFrame(KeyFrame.makeScale(1.0, 1.0, KeyFrame.TransitionType.LINEAR, 0));
        candyHide.addKeyFrame(KeyFrame.makeScale(1.15, 0.8, KeyFrame.TransitionType.LINEAR, 0.06));
        candyHide.addKeyFrame(KeyFrame.makeScale(1.0, 1.0, KeyFrame.TransitionType.LINEAR, 0.04));
        candyHide.addKeyFrame(KeyFrame.makePos(0.0, 0.0, KeyFrame.TransitionType.LINEAR, 0));
        candyHide.addKeyFrame(KeyFrame.makePos(0.0, -4.0, KeyFrame.TransitionType.EASE_OUT, 0.06));
        candyHide.addKeyFrame(KeyFrame.makePos(0.0, 4.0, KeyFrame.TransitionType.EASE_IN, 0.04));
        this.innerCandy.addTimelineWithID(candyHide, INNER_CANDY_HIDE_TIMELINE_ID);

        const candyIdle = new Timeline();
        candyIdle.addKeyFrame(KeyFrame.makeScale(1.0, 1.0, KeyFrame.TransitionType.IMMEDIATE, 0));
        candyIdle.addKeyFrame(
            KeyFrame.makeScale(0.93, 0.93, KeyFrame.TransitionType.EASE_IN, 0.35)
        );
        candyIdle.addKeyFrame(
            KeyFrame.makeScale(0.87, 0.87, KeyFrame.TransitionType.EASE_OUT, 0.35)
        );
        candyIdle.addKeyFrame(
            KeyFrame.makeScale(0.93, 0.93, KeyFrame.TransitionType.EASE_IN, 0.35)
        );
        candyIdle.addKeyFrame(KeyFrame.makeScale(1.0, 1.0, KeyFrame.TransitionType.EASE_OUT, 0.35));
        candyIdle.loopType = Timeline.LoopType.REPLAY;
        this.innerCandy.addTimelineWithID(candyIdle, INNER_CANDY_IDLE_TIMELINE_ID);
    }

    captureCandyFromDispatcher(candyPoint: ConstrainedPoint): void {
        this.captureCandy(candyPoint);
    }

    captureCandy(candyPoint: ConstrainedPoint): void {
        SoundMgr.playSound(ResourceId.SND_LANTERN_TELEPORT_IN);

        Lantern.sharedCandyPoint = candyPoint;
        candyPoint.disableGravity = true;
        candyPoint.pos.x = this.x;
        candyPoint.pos.y = this.y;
        candyPoint.prevPos.x = this.x;
        candyPoint.prevPos.y = this.y;

        for (const lantern of Lantern.getAllLanterns()) {
            lantern.lanternState = LanternState.ACTIVE;
            lantern.idleForm.playTimeline(LanternActivation.ACTIVATION);
            lantern.activeForm.playTimeline(LanternActivation.ACTIVATION);
            lantern.innerCandy.playTimeline(INNER_CANDY_APPEAR_TIMELINE_ID);
            lantern.fire.scaleX = 1.4;
            lantern.fire.scaleY = 1;
            lantern.fire.color = new RGBAColor(0.7, 0.7, 0.7, 0.7);
            lantern.delayedDispatcher.cancelAllDispatches();
            lantern.delayedDispatcher.callObject(
                lantern,
                lantern.playFireBounceTimeline,
                null,
                0.4 * Math.random()
            );
            lantern.delayedDispatcher.callObject(
                lantern,
                lantern.playInnerCandyIdleTimeline,
                null,
                0.2 + 0.2 * Math.random()
            );
        }
    }

    override update(delta: number): void {
        this.prevPos = new Vector(this.x, this.y);
        super.update(delta);
        this.delayedDispatcher.update(delta);
        if (Lantern.sharedCandyPoint) {
            Lantern.sharedCandyPoint.pos.x = this.x;
            Lantern.sharedCandyPoint.pos.y = this.y;
            Lantern.sharedCandyPoint.prevPos.x = this.x;
            Lantern.sharedCandyPoint.prevPos.y = this.y;
            if (this.lanternState !== LanternState.ACTIVE) {
                this.lanternState = LanternState.ACTIVE;
            }
        }
    }

    override onTouchDown(tx: number, ty: number): boolean {
        const distance = Vector.distance(tx, ty, this.x, this.y);
        if (
            this.lanternState === LanternState.ACTIVE &&
            Lantern.sharedCandyPoint &&
            distance < (resolution.LANTERN_TOUCH_RADIUS ?? 85)
        ) {
            this.initiateReleasingCandy();
            return true;
        }
        return false;
    }

    private releaseCandy(): void {
        if (!Lantern.sharedCandyPoint) {
            return;
        }
        Lantern.sharedCandyPoint.disableGravity = false;
        Lantern.sharedCandyPoint.pos.x = this.x;
        Lantern.sharedCandyPoint.pos.y = this.y;
        Lantern.sharedCandyPoint.prevPos = this.prevPos.copy();
        Lantern.sharedCandyPoint = null;
    }

    private static becomeCandyAware(...args: unknown[]): void {
        const lantern = args[0] as Lantern;
        lantern.lanternState = LanternState.INACTIVE;
    }

    initiateReleasingCandy(): void {
        SoundMgr.playSound(ResourceId.SND_LANTERN_TELEPORT_OUT);
        for (const lantern of Lantern.getAllLanterns()) {
            lantern.idleForm.playTimeline(LanternActivation.DEACTIVATION);
            lantern.activeForm.playTimeline(LanternActivation.DEACTIVATION);
            lantern.innerCandy.playTimeline(INNER_CANDY_HIDE_TIMELINE_ID);
            const fireTimeline = lantern.fire.getTimeline(LanternActivation.FIRE_BOUNCE);
            if (fireTimeline && fireTimeline.state === Timeline.StateType.PLAYING) {
                lantern.fire.stopCurrentTimeline();
            }
            lantern.fire.color = RGBAColor.transparent.copy();
            lantern.delayedDispatcher.cancelAllDispatches();
            lantern.delayedDispatcher.callObject(
                lantern,
                Lantern.becomeCandyAware,
                [lantern],
                LANTERN_INACTIVE_DELAY + 0.1
            );
        }
        this.delayedDispatcher.callObject(this, this.releaseCandy, null, 0.01);
    }

    private playFireBounceTimeline(): void {
        this.fire.playTimeline(LanternActivation.FIRE_BOUNCE);
    }

    private playInnerCandyIdleTimeline(): void {
        this.innerCandy.playTimeline(INNER_CANDY_IDLE_TIMELINE_ID);
    }
}

export default Lantern;
