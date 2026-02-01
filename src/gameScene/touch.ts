import Vector from "@/core/Vector";
import Constants from "@/utils/Constants";
import * as GameSceneConstants from "@/gameScene/constants";
import Camera2D from "@/visual/Camera2D";
import Rectangle from "@/core/Rectangle";
import MathHelper from "@/utils/MathHelper";
import SoundMgr from "@/game/CTRSoundMgr";
import ResourceId from "@/resources/ResourceId";
import Gravity from "@/physics/Gravity";
import resolution from "@/resolution";
import GravityButton from "@/game/GravityButton";
import PubSub from "@/utils/PubSub";
import FingerCut from "@/game/FingerCut";
import RGBAColor from "@/core/RGBAColor";
import EarthImage from "@/game/EarthImage";
import Timeline from "@/visual/Timeline";
import KeyFrame from "@/visual/KeyFrame";
import Radians from "@/utils/Radians";
import type RotatedCircle from "@/game/RotatedCircle";
import type Grab from "@/game/Grab";
import type ConstrainedPoint from "@/physics/ConstrainedPoint";
import type GenericButton from "@/visual/GenericButton";
import type LightBulb from "@/game/LightBulb";
import GameSceneUpdate from "./update";

class GameSceneTouch extends GameSceneUpdate {
    /**
     * Number of ropes cut in quick succession (initialized in parent class)
     */
    // ropesCutAtOnce: number = 0;

    /**
     * Timer for tracking concurrent rope cuts (initialized in parent class)
     */
    // ropesAtOnceTimer: number = 0;

    overOmNom = false;

    declare handleBubbleTouch: (star: ConstrainedPoint, x: number, y: number) => boolean;
    declare handleLightBulbBubbleTouch: (bulb: LightBulb, x: number, y: number) => boolean;
    declare getNearestBungeeGrabByBezierPoints: (out: Vector, x: number, y: number) => Grab | null;
    declare getNearestBungeeSegmentByConstraints: (cutPos: Vector, grab: Grab) => boolean;
    declare cut: (target: unknown, start: Vector, end: Vector, shouldPlaySound: boolean) => number;
    declare animateLevelRestart: () => void;
    declare isFadingIn: () => boolean;
    touchDown(x: number, y: number, touchIndex: number): boolean {
        if (this.ignoreTouches) {
            if (this.camera.type === Camera2D.SpeedType.PIXELS) {
                this.fastenCamera = true;
            }
            return true;
        }

        if (touchIndex >= Constants.MAX_TOUCHES) {
            return true;
        }

        this.overOmNom = false;

        if (this.gravityButton) {
            const childIndex = this.gravityButton.isOn() ? 1 : 0;
            const child = this.gravityButton.getChild(childIndex) as GenericButton | undefined;
            if (child?.isInTouchZone(x + this.camera.pos.x, y + this.camera.pos.y, true)) {
                this.gravityTouchDown = touchIndex;
                return true;
            }
        }

        const cameraPos = this.camera.pos;
        const cameraAdjustedX = x + cameraPos.x;
        const cameraAdjustedY = y + cameraPos.y;

        // mouse tap should take priority over bubble touches when carrying candy
        if (this.miceManager?.handleClick(cameraAdjustedX, cameraAdjustedY)) {
            return true;
        }

        if (this.candyBubble) {
            if (this.handleBubbleTouch(this.star, x, y)) {
                return true;
            }
        }

        if (this.twoParts !== GameSceneConstants.PartsType.NONE) {
            if (this.candyBubbleL) {
                if (this.handleBubbleTouch(this.starL, x, y)) {
                    return true;
                }
            }
            if (this.candyBubbleR) {
                if (this.handleBubbleTouch(this.starR, x, y)) {
                    return true;
                }
            }
        }

        if (this.lightbulbs.length > 0) {
            for (const bulb of this.lightbulbs) {
                if (!bulb?.capturingBubble) {
                    continue;
                }
                if (this.handleLightBulbBubbleTouch(bulb, x, y)) {
                    return true;
                }
            }
        }

        const touch = new Vector(x, y);
        if (!this.dragging[touchIndex]) {
            this.dragging[touchIndex] = true;
            const startPos =
                this.startPos[touchIndex] ?? (this.startPos[touchIndex] = Vector.newZero());
            const prevStartPos =
                this.prevStartPos[touchIndex] ?? (this.prevStartPos[touchIndex] = Vector.newZero());
            startPos.copyFrom(touch);
            prevStartPos.copyFrom(touch);
        }

        // handle rotating spikes
        for (const spike of this.spikes) {
            if (!spike?.rotateButton) {
                continue;
            }
            if (
                spike.touchIndex === Constants.UNDEFINED &&
                spike.rotateButton.onTouchDown(cameraAdjustedX, cameraAdjustedY)
            ) {
                spike.touchIndex = touchIndex;
                return true;
            }
        }

        // handle pump touches
        for (const pump of this.pumps) {
            if (!pump) {
                continue;
            }
            if (pump.pointInObject(cameraAdjustedX, cameraAdjustedY)) {
                pump.touchTimer = GameSceneConstants.PUMP_TIMEOUT;
                pump.touch = touchIndex;
                return true;
            }
        }

        for (const tube of this.tubes) {
            if (tube?.onTouchDown(cameraAdjustedX, cameraAdjustedY)) {
                return true;
            }
        }

        for (const lantern of this.lanterns) {
            if (lantern?.onTouchDown(cameraAdjustedX, cameraAdjustedY)) {
                this.dd.callObject(
                    this,
                    this.revealCandyFromLantern,
                    null,
                    GameSceneConstants.LANTERN_CANDY_REVEAL_TIME
                );
                return true;
            }
        }

        let activeCircle: RotatedCircle | null = null;
        let hasCircleInside = false;
        let intersectsAnotherCircle = false;
        for (const [index, r] of this.rotatedCircles.entries()) {
            const handle1 = r?.handle1;
            const handle2 = r?.handle2;
            if (!r || !handle1 || !handle2) {
                continue;
            }
            const d1 = Vector.distance(cameraAdjustedX, cameraAdjustedY, handle1.x, handle1.y);
            const d2 = Vector.distance(cameraAdjustedX, cameraAdjustedY, handle2.x, handle2.y);
            if (
                (d1 < resolution.RC_CONTROLLER_RADIUS && !r.hasOneHandle()) ||
                d2 < resolution.RC_CONTROLLER_RADIUS
            ) {
                //check for overlapping
                for (const r2 of this.rotatedCircles.slice(index + 1)) {
                    if (!r2) {
                        continue;
                    }
                    const d3 = Vector.distance(r2.x, r2.y, r.x, r.y);

                    if (d3 + r2.sizeInPixels <= r.sizeInPixels) {
                        hasCircleInside = true;
                    }

                    if (d3 <= r.sizeInPixels + r2.sizeInPixels) {
                        intersectsAnotherCircle = true;
                    }
                }

                r.lastTouch.x = cameraAdjustedX;
                r.lastTouch.y = cameraAdjustedY;
                r.operating = touchIndex;

                if (d1 < resolution.RC_CONTROLLER_RADIUS) {
                    r.setIsLeftControllerActive(true);
                }
                if (d2 < resolution.RC_CONTROLLER_RADIUS) {
                    r.setIsRightControllerActive(true);
                }

                activeCircle = r;

                break;
            }
        }

        // circle fading
        const activeCircleIndex = activeCircle ? this.rotatedCircles.indexOf(activeCircle) : -1;
        if (
            activeCircle &&
            activeCircleIndex !== this.rotatedCircles.length - 1 &&
            intersectsAnotherCircle &&
            !hasCircleInside
        ) {
            const fadeIn = new Timeline();
            fadeIn.addKeyFrame(
                KeyFrame.makeColor(RGBAColor.transparent.copy(), KeyFrame.TransitionType.LINEAR, 0)
            );
            fadeIn.addKeyFrame(
                KeyFrame.makeColor(
                    RGBAColor.solidOpaque.copy(),
                    KeyFrame.TransitionType.LINEAR,
                    0.2
                )
            );

            const fadeOut = new Timeline();
            fadeOut.addKeyFrame(
                KeyFrame.makeColor(
                    RGBAColor.solidOpaque.copy(),
                    KeyFrame.TransitionType.LINEAR,
                    0.2
                )
            );
            fadeOut.onFinished = this.onRotatedCircleTimelineFinished.bind(this);

            const fadingOutCircle = activeCircle.copy();
            if (fadingOutCircle) {
                fadingOutCircle.addTimeline(fadeOut);
                fadingOutCircle.playTimeline(0);

                activeCircle.addTimeline(fadeIn);
                activeCircle.playTimeline(0);

                if (activeCircleIndex >= 0) {
                    this.rotatedCircles[activeCircleIndex] = fadingOutCircle;
                }
                this.rotatedCircles.push(activeCircle);
            }
            activeCircle = null;
        }

        for (const ghost of this.ghosts) {
            if (ghost?.onTouchDown(cameraAdjustedX, cameraAdjustedY)) {
                return true;
            }
        }

        const GRAB_WHEEL_RADIUS = resolution.GRAB_WHEEL_RADIUS;
        const GRAB_WHEEL_DIAMETER = GRAB_WHEEL_RADIUS * 2;
        const GRAB_MOVE_RADIUS = resolution.GRAB_MOVE_RADIUS;
        const GRAB_MOVE_DIAMETER = GRAB_MOVE_RADIUS * 2;
        for (const grab of this.bungees) {
            if (!grab) {
                continue;
            }
            if (grab.wheel) {
                if (
                    Rectangle.pointInRect(
                        cameraAdjustedX,
                        cameraAdjustedY,
                        grab.x - GRAB_WHEEL_RADIUS,
                        grab.y - GRAB_WHEEL_RADIUS,
                        GRAB_WHEEL_DIAMETER,
                        GRAB_WHEEL_DIAMETER
                    )
                ) {
                    grab.handleWheelTouch(cameraAdjustedX, cameraAdjustedY);
                    grab.wheelOperating = touchIndex;
                }
            }

            if (grab.moveLength > 0) {
                if (
                    Rectangle.pointInRect(
                        cameraAdjustedX,
                        cameraAdjustedY,
                        grab.x - GRAB_MOVE_RADIUS,
                        grab.y - GRAB_MOVE_RADIUS,
                        GRAB_MOVE_DIAMETER,
                        GRAB_MOVE_DIAMETER
                    )
                ) {
                    grab.moverDragging = touchIndex;
                    return true;
                }
            }
        }

        if (this.conveyors.onPointerDown(cameraAdjustedX, cameraAdjustedY, touchIndex)) {
            this.dragging[touchIndex] = false;
            return true;
        }

        if (this.clickToCut) {
            const cutPos = Vector.newZero();
            const grab = this.getNearestBungeeGrabByBezierPoints(
                cutPos,
                cameraAdjustedX,
                cameraAdjustedY
            ) as Grab | null;
            const bungee = grab?.rope ?? null;
            if (bungee?.highlighted && grab) {
                if (this.getNearestBungeeSegmentByConstraints(cutPos, grab)) {
                    this.cut(null, cutPos, cutPos, false);
                }
            }
        }

        // easter egg check must be last to avoid affecting other elements
        if (this.target.pointInDrawQuad(x, y)) {
            this.overOmNom = true;
        }

        return true;
    }
    doubleClick(x: number, y: number, touchIndex: number): boolean {
        if (this.ignoreTouches) {
            return true;
        }

        return true;
    }
    touchUp(x: number, y: number, touchIndex: number): boolean {
        if (this.ignoreTouches) {
            return true;
        }

        this.dragging[touchIndex] = false;

        // see if the user clicked on OmNom
        if (this.overOmNom && this.target.pointInDrawQuad(x, y)) {
            this.overOmNom = false;
            PubSub.publish(PubSub.ChannelId.OmNomClicked);
            return true;
        } else {
            this.overOmNom = false;
        }

        const cameraPos = this.camera.pos;
        const cameraAdjustedX = x + cameraPos.x;
        const cameraAdjustedY = y + cameraPos.y;

        // drawings
        for (const [index, drawing] of this.drawings.entries()) {
            if (!drawing) {
                continue;
            }
            if (drawing.pointInObject(cameraAdjustedX, cameraAdjustedY)) {
                drawing.showDrawing();

                // remove the drawing
                this.drawings.splice(index, 1);
                break;
            }
        }

        if (this.gravityButton && this.gravityTouchDown === touchIndex) {
            const childIndex = this.gravityButton.isOn() ? 1 : 0;
            const child = this.gravityButton.getChild(childIndex) as GenericButton | undefined;
            if (child?.isInTouchZone(x + this.camera.pos.x, y + this.camera.pos.y, true)) {
                this.gravityButton.toggle();
                this.onButtonPressed(GravityButton.DefaultId);
            }
            this.gravityTouchDown = Constants.UNDEFINED;
        }

        for (const spike of this.spikes) {
            if (!spike?.rotateButton) {
                continue;
            }
            if (spike.touchIndex === touchIndex) {
                spike.touchIndex = Constants.UNDEFINED;
                if (spike.rotateButton.onTouchUp(x + this.camera.pos.x, y + this.camera.pos.y)) {
                    return true;
                }
            }
        }

        for (const r of this.rotatedCircles) {
            if (!r) {
                continue;
            }
            if (r.operating === touchIndex) {
                r.operating = Constants.UNDEFINED;
                r.soundPlaying = Constants.UNDEFINED;
                r.setIsLeftControllerActive(false);
                r.setIsRightControllerActive(false);
            }
        }

        for (const grab of this.bungees) {
            if (!grab) {
                continue;
            }
            if (grab.wheel && grab.wheelOperating === touchIndex) {
                grab.wheelOperating = Constants.UNDEFINED;
            }

            if (grab.moveLength > 0 && grab.moverDragging === touchIndex) {
                grab.moverDragging = Constants.UNDEFINED;
            }
        }

        this.conveyors.onPointerUp(cameraAdjustedX, cameraAdjustedY, touchIndex);

        return true;
    }
    touchMove(x: number, y: number, touchIndex: number): boolean {
        if (this.ignoreTouches) {
            return true;
        }

        if (touchIndex >= Constants.MAX_TOUCHES) {
            return true;
        }

        const touch = new Vector(x, y);
        const startPos = this.startPos[touchIndex];
        if (startPos && startPos.distance(touch) > 10) {
            for (const pump of this.pumps) {
                if (!pump) {
                    continue;
                }

                // cancel pump touch if we moved
                if (pump.touch === touchIndex && pump.touchTimer !== 0) {
                    pump.touchTimer = 0;
                }
            }
        }

        this.slastTouch.copyFrom(touch);

        const cameraAdjustedTouch = new Vector(x + this.camera.pos.x, y + this.camera.pos.y);

        for (const r of this.rotatedCircles) {
            if (!r || !r.handle1 || !r.handle2) {
                continue;
            }
            if (r.operating === touchIndex) {
                const c = new Vector(r.x, r.y);
                if (c.distance(cameraAdjustedTouch) < r.sizeInPixels / 10) {
                    r.lastTouch.copyFrom(cameraAdjustedTouch);
                }

                const m1 = Vector.subtract(r.lastTouch, c),
                    m2 = Vector.subtract(cameraAdjustedTouch, c);
                let a = m2.normalizedAngle() - m1.normalizedAngle();

                if (a > Math.PI) {
                    a = a - 2 * Math.PI;
                } else if (a < -Math.PI) {
                    a = a + 2 * Math.PI;
                }

                r.handle1.rotateAround(a, r.x, r.y);
                r.handle2.rotateAround(a, r.x, r.y);
                r.rotation += Radians.toDegrees(a);

                let soundToPlay: number =
                    a > 0 ? ResourceId.SND_SCRATCH_IN : ResourceId.SND_SCRATCH_OUT;

                if (Math.abs(a) < 0.07) {
                    soundToPlay = Constants.UNDEFINED;
                }

                if (r.soundPlaying != soundToPlay && soundToPlay != Constants.UNDEFINED) {
                    SoundMgr.playSound(soundToPlay);
                    r.soundPlaying = soundToPlay;
                }

                for (const g of this.bungees) {
                    if (!g) {
                        continue;
                    }
                    const gn = new Vector(g.x, g.y);
                    if (gn.distance(c) <= r.sizeInPixels + 5 * this.PM) {
                        gn.rotateAround(a, r.x, r.y);
                        g.x = gn.x;
                        g.y = gn.y;
                        if (g.rope) {
                            g.rope.bungeeAnchor.pos.copyFrom(gn);
                            g.rope.bungeeAnchor.pin.copyFrom(gn);
                        }
                    }
                }

                for (const g of this.pumps) {
                    if (!g) {
                        continue;
                    }
                    const gn = new Vector(g.x, g.y);
                    if (gn.distance(c) <= r.sizeInPixels + 5 * this.PM) {
                        gn.rotateAround(a, r.x, r.y);
                        g.x = gn.x;
                        g.y = gn.y;
                        g.rotation += Radians.toDegrees(a);
                        g.updateRotation();
                    }
                }

                for (const g of this.bubbles) {
                    if (!g) {
                        continue;
                    }
                    const gn = new Vector(g.x, g.y);
                    if (
                        gn.distance(c) <= r.sizeInPixels + 10 * this.PM &&
                        g !== this.candyBubble &&
                        g !== this.candyBubbleR &&
                        g !== this.candyBubbleL
                    ) {
                        gn.rotateAround(a, r.x, r.y);
                        g.x = gn.x;
                        g.y = gn.y;
                    }
                }

                if (
                    Rectangle.pointInRect(
                        this.target.x,
                        this.target.y,
                        r.x - r.size,
                        r.y - r.size,
                        2 * r.size,
                        2 * r.size
                    )
                ) {
                    const gn = new Vector(this.target.x, this.target.y);
                    gn.rotateAround(a, r.x, r.y);
                    this.target.x = gn.x;
                    this.target.y = gn.y;
                }

                r.lastTouch.copyFrom(cameraAdjustedTouch);

                return true;
            }
        }

        for (const grab of this.bungees) {
            if (!grab) {
                continue;
            }

            if (grab.wheel && grab.wheelOperating === touchIndex) {
                grab.handleWheelRotate(cameraAdjustedTouch);
                return true;
            }

            if (grab.moveLength > 0 && grab.moverDragging === touchIndex) {
                if (grab.moveVertical) {
                    grab.y = MathHelper.fitToBoundaries(
                        cameraAdjustedTouch.y,
                        grab.minMoveValue,
                        grab.maxMoveValue
                    );
                } else {
                    grab.x = MathHelper.fitToBoundaries(
                        cameraAdjustedTouch.x,
                        grab.minMoveValue,
                        grab.maxMoveValue
                    );
                }

                if (grab.rope) {
                    const ba = grab.rope.bungeeAnchor;
                    ba.pos.x = ba.pin.x = grab.x;
                    ba.pos.y = ba.pin.y = grab.y;
                }

                return true;
            }
        }

        if (
            this.conveyors.onPointerMove(cameraAdjustedTouch.x, cameraAdjustedTouch.y, touchIndex)
        ) {
            return true;
        }

        if (this.dragging[touchIndex]) {
            const startPosForCut = this.startPos[touchIndex];
            const prevStartPos = this.prevStartPos[touchIndex];
            const currentCuts = this.fingerCuts[touchIndex] ?? (this.fingerCuts[touchIndex] = []);

            if (!startPosForCut || !prevStartPos) {
                return true;
            }

            const fc = new FingerCut(
                Vector.add(startPosForCut, this.camera.pos),
                Vector.add(touch, this.camera.pos),
                5, // start size
                5, // end size
                RGBAColor.white.copy()
            );
            let ropeCuts = 0;

            currentCuts.push(fc);
            for (const fcc of currentCuts) {
                if (!fcc) {
                    continue;
                }
                ropeCuts += this.cut(null, fcc.start, fcc.end, false);
            }

            if (ropeCuts > 0) {
                this.freezeCamera = false;

                if (this.ropesCutAtOnce > 0 && this.ropesAtOnceTimer > 0) {
                    this.ropesCutAtOnce += ropeCuts;
                } else {
                    this.ropesCutAtOnce = ropeCuts;
                }
                this.ropesAtOnceTimer = GameSceneConstants.ROPE_CUT_AT_ONCE_TIMEOUT;

                // rope cut achievements
                // Achievements.increment(AchievementId.ROPE_CUTTER);
                // Achievements.increment(AchievementId.ROPE_CUTTER_MANIAC);
                // Achievements.increment(AchievementId.ULTIMATE_ROPE_CUTTER);

                // // concurrent cut rope achievements
                // if (this.ropesCutAtOnce >= 5) {
                //     Achievements.increment(AchievementId.MASTER_FINGER);
                // } else if (this.ropesCutAtOnce >= 3) {
                //     Achievements.increment(AchievementId.QUICK_FINGER);
                // }
            }

            prevStartPos.copyFrom(startPosForCut);
            startPosForCut.copyFrom(touch);
        }

        return true;
    }
    touchDragged(x: number, y: number, touchIndex: number): boolean {
        if (touchIndex > Constants.MAX_TOUCHES) {
            return false;
        }

        this.slastTouch.x = x;
        this.slastTouch.y = y;
        return true;
    }
    override onButtonPressed = (_id: number): void => {
        Gravity.toggle();
        this.gravityNormal = Gravity.isNormal();
        SoundMgr.playSound(
            this.gravityNormal ? ResourceId.SND_GRAVITY_OFF : ResourceId.SND_GRAVITY_ON
        );

        for (const earthImage of this.earthAnims) {
            if (!earthImage) {
                continue;
            }
            if (Gravity.isNormal()) {
                earthImage.playTimeline(EarthImage.TimelineId.NORMAL);
            } else {
                earthImage.playTimeline(EarthImage.TimelineId.UPSIDE_DOWN);
            }
        }
    };

    override rotateAllSpikesWithId = (sid: number): void => {
        for (const spike of this.spikes) {
            if (!spike) {
                continue;
            }
            if (spike.getToggled() === sid) {
                spike.rotateSpikes();
            }
        }
    };

    revealCandyFromLantern(): void {
        this.isCandyInLantern = false;
        this.candy.color = RGBAColor.solidOpaque.copy();
        this.candy.passTransformationsToChilds = false;
        this.candy.scaleX = this.candy.scaleY = 0.71;
        this.candyMain.scaleX = this.candyMain.scaleY = 0.71;
        this.candyTop.scaleX = this.candyTop.scaleY = 0.71;
    }
}

export default GameSceneTouch;
