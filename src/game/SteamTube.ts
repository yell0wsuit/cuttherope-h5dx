import Alignment from "@/core/Alignment";
import Vector from "@/core/Vector";
import MathHelper from "@/utils/MathHelper";
import Radians from "@/utils/Radians";
import Canvas from "@/utils/Canvas";
import Animation from "@/visual/Animation";
import BaseElement from "@/visual/BaseElement";
import ImageElement from "@/visual/ImageElement";
import KeyFrame from "@/visual/KeyFrame";
import Timeline from "@/visual/Timeline";
import SoundMgr from "@/game/CTRSoundMgr";
import ResourceId from "@/resources/ResourceId";
import resolution from "@/resolution";
import DelayedDispatcher from "@/utils/DelayedDispatcher";
import * as GameSceneConstants from "@/gameScene/constants";

class SteamTube extends BaseElement {
    steamState: number;
    private heightScale: number;
    private phase: number;
    private tube: ImageElement;
    private valve: ImageElement;
    private steamBack: BaseElement;
    private steamFront: BaseElement;
    private onConveyor = false;

    constructor(position: Vector, angle: number, heightScale = resolution.PM) {
        super();

        this.heightScale = heightScale;
        this.steamState = 0;
        this.phase = 0;

        this.anchor = Alignment.CENTER;
        this.x = position.x;
        this.y = position.y;
        this.rotation = angle;

        this.tube = ImageElement.create(
            ResourceId.IMG_OBJ_PIPE,
            GameSceneConstants.IMG_OBJ_PIPE_pipe
        );
        this.tube.anchor = Alignment.TOP | Alignment.HCENTER;
        this.tube.parentAnchor = Alignment.CENTER;
        this.tube.x = 0;
        this.tube.y = 0;
        this.addChild(this.tube);

        this.valve = ImageElement.create(
            ResourceId.IMG_OBJ_PIPE,
            GameSceneConstants.IMG_OBJ_PIPE_valve
        );
        this.valve.anchor = Alignment.CENTER;
        this.valve.parentAnchor = Alignment.CENTER;
        this.valve.x = 0;
        this.valve.y = 27 * this.heightScale;
        this.addChild(this.valve);

        this.steamBack = new BaseElement();
        this.steamBack.anchor = this.steamBack.parentAnchor = Alignment.CENTER;
        this.addChild(this.steamBack);

        this.steamFront = new BaseElement();
        this.steamFront.anchor = this.steamFront.parentAnchor = Alignment.CENTER;
        this.addChild(this.steamFront);

        this.adjustSteam();
        this.setupValveTimelines();
    }

    drawBack(): void {
        const ctx = Canvas.context;
        this.preDraw();
        this.tube.draw();
        this.valve.draw();
        this.steamBack.draw();
        ctx?.restore();
    }

    drawFront(): void {
        const ctx = Canvas.context;
        this.preDraw();
        this.steamFront.draw();
        ctx?.restore();
    }

    getCurrentHeightModulated(): number {
        const currentHeight = this.getCurrentHeight();
        return currentHeight + this.heightScale * Math.sin(6 * this.phase);
    }

    getHeightScale(): number {
        return this.heightScale;
    }

    override update(delta: number): void {
        super.update(delta);
        this.phase += delta;
    }

    override onTouchDown(x: number, y: number): boolean {
        // When on conveyor, use base position; otherwise add valve offset
        let valvePos: Vector;
        if (this.onConveyor) {
            valvePos = new Vector(this.x, this.y);
        } else {
            const offset = new Vector(0, 27 * this.heightScale);
            offset.rotate(Radians.fromDegrees(this.rotation));
            valvePos = Vector.add(new Vector(this.x, this.y), offset);
        }
        const distance = Vector.distance(x, y, valvePos.x, valvePos.y);

        if (distance >= 30) {
            return false;
        }

        let timelineIndex = 0;
        switch (this.steamState) {
            case 0:
                this.steamState = 1;
                SoundMgr.playSound(ResourceId.SND_STEAM_START2);
                break;
            case 1:
                this.steamState = 2;
                SoundMgr.playSound(ResourceId.SND_STEAM_START);
                break;
            default:
                this.steamState = 0;
                timelineIndex = 1;
                SoundMgr.playSound(ResourceId.SND_STEAM_END);
                break;
        }

        this.adjustSteam();

        const cwTimeline = this.valve.getTimeline(0);
        const ccwTimeline = this.valve.getTimeline(1);

        if (
            cwTimeline?.state !== Timeline.StateType.PLAYING &&
            ccwTimeline?.state !== Timeline.StateType.PLAYING
        ) {
            this.valve.playTimeline(timelineIndex);
        }

        return true;
    }

    private setupValveTimelines(): void {
        const clockwise = new Timeline();
        clockwise.addKeyFrame(KeyFrame.makeRotation(0, KeyFrame.TransitionType.LINEAR, 0));
        clockwise.addKeyFrame(KeyFrame.makeRotation(180, KeyFrame.TransitionType.LINEAR, 0.55));
        this.valve.addTimelineWithID(clockwise, 0);

        const counterClockwise = new Timeline();
        counterClockwise.addKeyFrame(KeyFrame.makeRotation(0, KeyFrame.TransitionType.LINEAR, 0));
        counterClockwise.addKeyFrame(
            KeyFrame.makeRotation(-180, KeyFrame.TransitionType.LINEAR, 0.55)
        );
        this.valve.addTimelineWithID(counterClockwise, 1);
    }

    private getCurrentHeight(): number {
        const baseHeight =
            this.steamState === 0
                ? 32.9
                : this.steamState === 1
                  ? 94
                  : this.steamState === 2
                    ? 141
                    : 0;
        return baseHeight * this.heightScale;
    }

    private adjustSteam(): void {
        this.phase = 0;

        const setExistingPuffsToNoLoop = (container: BaseElement) => {
            for (const child of container.getChildren()) {
                const timeline = child.getTimeline(0);
                if (timeline) {
                    timeline.loopType = Timeline.LoopType.NO_LOOP;
                }
            }
        };

        setExistingPuffsToNoLoop(this.steamBack);
        setExistingPuffsToNoLoop(this.steamFront);

        if (this.steamState === 3) {
            return;
        }

        this.steamBack.anchor = this.steamBack.parentAnchor = Alignment.CENTER;
        this.steamFront.anchor = this.steamFront.parentAnchor = Alignment.CENTER;

        let totalPuffs = 7;
        if (this.steamState === 1) {
            totalPuffs = 14;
        } else if (this.steamState === 2) {
            totalPuffs = 20;
        }

        for (let i = 0; i < totalPuffs; i++) {
            let startFrame = GameSceneConstants.IMG_OBJ_PIPE_particle_3_start;
            let endFrame = GameSceneConstants.IMG_OBJ_PIPE_particle_3_end;

            if (i % 3 === 1) {
                startFrame = GameSceneConstants.IMG_OBJ_PIPE_particle_2_start;
                endFrame = GameSceneConstants.IMG_OBJ_PIPE_particle_2_end;
            } else if (i % 3 === 2) {
                startFrame = GameSceneConstants.IMG_OBJ_PIPE_particle_1_start;
                endFrame = GameSceneConstants.IMG_OBJ_PIPE_particle_1_end;
            }

            const lifetime = 0.6;
            const frameDelay = lifetime / (endFrame - startFrame + 1);
            let verticalOffset = -this.getCurrentHeight();
            verticalOffset *= 1 + 0.1 * MathHelper.randomMinus1to1();

            if (this.steamState === 1 && (i % 3 === 1 || i % 3 === 2)) {
                verticalOffset *= 0.95;
            }
            if (this.steamState === 2 && (i % 3 === 1 || i % 3 === 2)) {
                verticalOffset *= 0.94;
            }

            let horizontalOffset = 1;
            if (i % 3 === 0) {
                horizontalOffset = 0;
            } else if (i % 3 === 1) {
                horizontalOffset *= this.steamState;
            } else if (i % 3 === 2) {
                horizontalOffset *= -this.steamState;
            }

            const animation = new Animation();
            animation.initTextureWithId(ResourceId.IMG_OBJ_PIPE);
            animation.doRestoreCutTransparency();
            animation.addAnimationEndpoints(
                0,
                frameDelay,
                Timeline.LoopType.REPLAY,
                startFrame,
                endFrame
            );
            animation.anchor = animation.parentAnchor = Alignment.CENTER;

            const timeline = new Timeline();
            timeline.addKeyFrame(KeyFrame.makePos(0, 0, KeyFrame.TransitionType.IMMEDIATE, 0));
            timeline.addKeyFrame(
                KeyFrame.makePos(
                    horizontalOffset,
                    verticalOffset,
                    KeyFrame.TransitionType.EASE_OUT,
                    lifetime
                )
            );
            timeline.addKeyFrame(KeyFrame.makeScale(1, 1, KeyFrame.TransitionType.IMMEDIATE, 0));
            timeline.addKeyFrame(
                KeyFrame.makeScale(1.5, 1.5, KeyFrame.TransitionType.LINEAR, lifetime)
            );
            timeline.loopType = Timeline.LoopType.REPLAY;
            timeline.onFinished = this.removeFinishedPuff;

            const puff = new BaseElement();
            puff.anchor = puff.parentAnchor = Alignment.CENTER;
            puff.addTimelineWithID(timeline, 0);
            puff.setEnabled(false);
            puff.addChild(animation);

            const delay = (lifetime * i) / totalPuffs;
            DelayedDispatcher.callObject(
                this,
                this.startPuffFloatingAndAnimation as (...args: unknown[]) => void,
                [puff],
                delay
            );

            if (i % 3 === 0) {
                this.steamBack.addChild(puff);
            } else {
                this.steamFront.addChild(puff);
            }
        }
    }

    private startPuffFloatingAndAnimation(puff: BaseElement): void {
        puff.setEnabled(true);
        puff.playTimeline(0);
        const lastChildIndex = puff.childCount() - 1;
        const lastChild = puff.getChild(lastChildIndex);
        lastChild?.playTimeline(0);
    }

    private removeFinishedPuff(timeline: Timeline): void {
        const element = timeline.element as BaseElement | null;
        const parent = element?.parent;
        if (parent && element) {
            parent.removeChild(element);
        }
    }

    getConveyorSize(): Vector {
        // Returns fixed (40, 56) without scaling
        return new Vector(40, 56);
    }

    getConveyorPadding(): number {
        // 0.3 × pipe width
        return 40 * 0.3;
    }

    setConveyorPosition(pos: Vector): void {
        // Original positions (3, 3, -27, -27) need to be scaled by heightScale
        // since normal mode uses scaled positions (e.g., valve.y = 27 * heightScale)
        // tube has TOP anchor; in normal mode offset from valve is 27*heightScale,
        // so for conveyor: tube.y = 3*heightScale - 27*heightScale = -24*heightScale
        this.onConveyor = true;
        this.tube.y = -24 * this.heightScale;
        this.valve.y = 3 * this.heightScale;
        this.steamBack.y = -27 * this.heightScale;
        this.steamFront.y = -27 * this.heightScale;
        this.x = pos.x;
        this.y = pos.y;
    }
}

export default SteamTube;
