import Alignment from "@/core/Alignment";
import Vector from "@/core/Vector";
import KeyFrame from "@/visual/KeyFrame";
import Timeline from "@/visual/Timeline";
import BaseElement from "@/visual/BaseElement";
import ImageElement from "@/visual/ImageElement";
import Bungee from "@/game/Bungee";
import GhostBubble from "@/game/GhostBubble";
import GhostMorphingParticles from "@/game/GhostMorphingParticles";
import GhostMorphingCloud from "@/game/GhostMorphingCloud";
import GhostGrab from "@/game/GhostGrab";
import GhostBouncer from "@/game/GhostBouncer";
import ResourceId from "@/resources/ResourceId";
import RES_DATA from "@/resources/ResData";
import SoundMgr from "@/game/CTRSoundMgr";
import * as GameSceneConstants from "@/gameScene/constants";
import resolution from "@/resolution";
import Constants from "@/utils/Constants";
import RGBAColor from "@/core/RGBAColor";
import type ConstrainedPoint from "@/physics/ConstrainedPoint";
import type GameSceneInit from "@/gameScene/init";

const GHOST_TOUCH_RADIUS = 80;
const DEFAULT_BOUNCER_WIDTH = 1;
const DEFAULT_GHOST_STATE = 1;
const GHOST_MORPHING_BUBBLES_COUNT = 7;
const GHOST_MORPHING_APPEAR_TIME = 0.36;
const GHOST_MORPHING_DISAPPEAR_TIME = 0.16;

class Ghost extends BaseElement {
    ghostState: number;
    bubble: GhostBubble | null;
    grab: GhostGrab | null;
    bouncer: GhostBouncer | null;
    cyclingEnabled: boolean;
    grabRadius: number;
    candyBreak: boolean;
    possibleStatesMask: number;
    bouncerAngle: number;
    ghostImage: BaseElement;
    ghostImageBody: ImageElement;
    ghostImageFace: ImageElement;
    morphingBubbles: GhostMorphingParticles | null;
    morphingCloud: GhostMorphingCloud | null;
    private readonly scene: GameSceneInit;

    constructor(
        position: Vector,
        possibleStateMask: number,
        grabRadius: number,
        bouncerAngle: number,
        scene: GameSceneInit
    ) {
        super();
        this.scene = scene;
        this.possibleStatesMask = possibleStateMask | DEFAULT_GHOST_STATE;
        this.ghostState = DEFAULT_GHOST_STATE;
        this.bouncerAngle = bouncerAngle;
        this.grabRadius = grabRadius;
        this.bubble = null;
        this.grab = null;
        this.bouncer = null;
        this.cyclingEnabled = true;
        this.candyBreak = false;

        this.x = position.x;
        this.y = position.y;

        this.ghostImage = new BaseElement();
        this.addChild(this.ghostImage);

        this.ghostImageFace = ImageElement.create(
            ResourceId.IMG_OBJ_GHOST,
            GameSceneConstants.IMG_OBJ_GHOST_face
        );
        this.ghostImageFace.anchor = this.ghostImageFace.parentAnchor = Alignment.CENTER;
        this.ghostImageFace.x = this.x;
        this.ghostImageFace.y = this.y;

        this.ghostImageBody = ImageElement.create(
            ResourceId.IMG_OBJ_GHOST,
            GameSceneConstants.IMG_OBJ_GHOST_body
        );
        this.ghostImageBody.anchor = this.ghostImageBody.parentAnchor = Alignment.CENTER;
        this.ghostImageBody.x = this.x;
        this.ghostImageBody.y = this.y;

        this.ghostImage.addChild(this.ghostImageFace);
        this.ghostImage.addChild(this.ghostImageBody);

        this.addFloatTimeline(this.ghostImageFace, 2);
        this.addFloatTimeline(this.ghostImageBody, 3);

        // Set up appear/disappear timelines for ghost image
        const appearTimeline = new Timeline();
        appearTimeline.addKeyFrame(
            KeyFrame.makeColor(RGBAColor.transparent.copy(), KeyFrame.TransitionType.IMMEDIATE, 0)
        );
        appearTimeline.addKeyFrame(
            KeyFrame.makeColor(RGBAColor.solidOpaque.copy(), KeyFrame.TransitionType.LINEAR, GHOST_MORPHING_APPEAR_TIME)
        );
        this.ghostImage.addTimelineWithID(appearTimeline, 10);

        const disappearTimeline = new Timeline();
        disappearTimeline.addKeyFrame(
            KeyFrame.makeColor(RGBAColor.solidOpaque.copy(), KeyFrame.TransitionType.IMMEDIATE, 0)
        );
        disappearTimeline.addKeyFrame(
            KeyFrame.makeColor(RGBAColor.transparent.copy(), KeyFrame.TransitionType.LINEAR, GHOST_MORPHING_DISAPPEAR_TIME)
        );
        this.ghostImage.addTimelineWithID(disappearTimeline, 11);
        this.ghostImage.playTimeline(10);

        const ghostTexture = RES_DATA[ResourceId.IMG_OBJ_GHOST]?.texture ?? null;
        this.morphingBubbles = ghostTexture ? new GhostMorphingParticles(ghostTexture) : null;
        this.morphingCloud = ghostTexture ? new GhostMorphingCloud(ghostTexture) : null;

        if (this.morphingBubbles) {
            this.morphingBubbles.x = position.x;
            this.morphingBubbles.y = position.y;
            this.addChild(this.morphingBubbles);
        }

        if (this.morphingCloud) {
            this.morphingCloud.x = position.x;
            this.morphingCloud.y = position.y;
            this.addChild(this.morphingCloud);
        }
    }

    updateGhost(delta: number): void {

        // Check for bubble fade-out completion
        if (this.bubble && this.bubble.currentTimelineIndex === 11 && this.bubble.currentTimeline?.state === Timeline.StateType.STOPPED) {
            this.removeFromSceneArray(this.scene.bubbles, this.bubble);
            this.bubble = null;
        }

        // Check for bouncer fade-out completion
        if (this.bouncer && this.bouncer.currentTimelineIndex === 11 && this.bouncer.currentTimeline?.state === Timeline.StateType.STOPPED) {
            this.removeFromSceneArray(this.scene.bouncers, this.bouncer);
            this.bouncer = null;
        }

        // Check for grab fade-out completion
        if (this.grab && this.grab.currentTimelineIndex === 11 && this.grab.currentTimeline?.state === Timeline.StateType.STOPPED) {
            this.grab.destroyRope();
            this.removeFromSceneArray(this.scene.bungees, this.grab);
            this.grab = null;
        }


        super.update(delta);

        // Monitor rope cut while grab is on timeline 10 (visible/active)
        if (this.grab && this.grab.rope && this.grab.rope.cut !== Constants.UNDEFINED && this.grab.currentTimelineIndex === 10) {
            this.cyclingEnabled = true;
            this.resetToState(DEFAULT_GHOST_STATE);
        }
    }

    resetToNextState(): void {
        let state = this.ghostState;
        do {
            state = state << 1;
            if (state === 16) {
                state = 2;
            }
        } while ((state & this.possibleStatesMask) === 0);

        this.resetToState(state);
    }

    resetToState(newState: number): void {
        if ((newState & this.possibleStatesMask) === 0) {
            return;
        }

        this.ghostState = newState;

        const morphOut = new Timeline();
        morphOut.addKeyFrame(
            KeyFrame.makeColor(RGBAColor.solidOpaque.copy(), KeyFrame.TransitionType.IMMEDIATE, 0)
        );
        morphOut.addKeyFrame(
            KeyFrame.makeColor(RGBAColor.transparent.copy(), KeyFrame.TransitionType.LINEAR, GHOST_MORPHING_DISAPPEAR_TIME)
        );

        // Handle bubble fade-out
        if (this.bubble) {
            if (this.bubble.currentTimelineIndex === 11) {
                this.removeFromSceneArray(this.scene.bubbles, this.bubble);
                this.bubble = null;
            } else {
                this.bubble.addTimelineWithID(morphOut, 11);
                this.bubble.playTimeline(11);
                this.bubble.popped = true;
            }
        }

        // Handle grab fade-out and rope
        if (this.grab) {
            const rope = this.grab.rope;
            if (rope) {
                rope.forceWhite = true;
                rope.cutTime = GHOST_MORPHING_APPEAR_TIME;
                if (rope.cut === Constants.UNDEFINED) {
                    rope.cut = 0;
                }
            }

            if (this.grab.currentTimelineIndex === 11) {
                this.grab.destroyRope();
                this.removeFromSceneArray(this.scene.bungees, this.grab);
                this.grab = null;
            } else {
                this.grab.addTimelineWithID(morphOut, 11);
                this.grab.playTimeline(11);
            }
        }

        // Handle bouncer fade-out
        if (this.bouncer) {
            if (this.bouncer.currentTimelineIndex !== 11) {
                this.bouncer.addTimelineWithID(morphOut, 11);
                this.bouncer.playTimeline(11);
            }
            this.removeFromSceneArray(this.scene.bouncers, this.bouncer);
            this.bouncer = null;
        }

        // Handle ghost image fade
        if (this.ghostImage.currentTimelineIndex === 10) {
            this.ghostImage.playTimeline(11);
        }

        const morphIn = new Timeline();
        morphIn.addKeyFrame(
            KeyFrame.makeColor(RGBAColor.transparent.copy(), KeyFrame.TransitionType.IMMEDIATE, 0)
        );
        morphIn.addKeyFrame(
            KeyFrame.makeColor(RGBAColor.solidOpaque.copy(), KeyFrame.TransitionType.LINEAR, GHOST_MORPHING_APPEAR_TIME)
        );

        switch (newState) {
            case DEFAULT_GHOST_STATE:
                this.ghostImage.playTimeline(10);
                break;
            case 2: {
                const ghostBubble = new GhostBubble().initAt(this.x, this.y);
                ghostBubble.addTimelineWithID(morphIn, 10);
                ghostBubble.playTimeline(10);
                this.scene.bubbles.push(ghostBubble);
                this.bubble = ghostBubble;
                break;
            }
            case 4: {
                const grab = new GhostGrab().initAt(this.x, this.y);
                grab.wheel = false;
                grab.spider = null;
                grab.setRadius(this.grabRadius);

                if (this.grabRadius === -1) {
                    const anchor = this.getGhostRopeAnchor();
                    if (anchor) {
                        const ropeLength = Math.max(
                            Vector.distance(this.x, this.y, anchor.pos.x, anchor.pos.y),
                            resolution.BUNGEE_REST_LEN
                        );
                        const rope = new Bungee(
                            null,
                            this.x,
                            this.y,
                            anchor,
                            anchor.pos.x,
                            anchor.pos.y,
                            ropeLength
                        );
                        rope.bungeeAnchor.pin.copyFrom(rope.bungeeAnchor.pos);
                        grab.setRope(rope);
                    }
                }

                this.scene.bungees.push(grab);
                this.grab = grab;
                grab.addTimelineWithID(morphIn, 10);
                grab.playTimeline(10);
                break;
            }
            case 8: {
                const bouncer = new GhostBouncer(
                    this.x,
                    this.y,
                    DEFAULT_BOUNCER_WIDTH,
                    this.bouncerAngle,
                    this
                );
                this.scene.bouncers.push(bouncer);
                bouncer.addTimelineWithID(morphIn, 10);
                bouncer.playTimeline();
                this.bouncer = bouncer;
                break;
            }
            default:
                break;
        }

        SoundMgr.playSound(ResourceId.SND_GHOST_PUFF);

        this.morphingBubbles?.startSystem(GHOST_MORPHING_BUBBLES_COUNT);
        this.morphingCloud?.startSystem();
    }

    override onTouchDown(tx: number, ty: number): boolean {
        const distance = Vector.distance(tx, ty, this.x, this.y);
        if (this.cyclingEnabled && !this.candyBreak && distance < GHOST_TOUCH_RADIUS) {
            this.resetToNextState();
            return true;
        }
        return false;
    }

    private removeFromSceneArray<T>(collection: T[], target: T | null): void {
        if (!target) {
            return;
        }

        const index = collection.indexOf(target);
        if (index !== -1) {
            collection.splice(index, 1);
        }
    }

    private addFloatTimeline(element: BaseElement, offset: number) {
        const float = new Timeline();
        float.loopType = Timeline.LoopType.REPLAY;
        float.addKeyFrame(
            KeyFrame.makePos(
                element.x,
                element.y - offset,
                KeyFrame.TransitionType.IMMEDIATE,
                0
            )
        );
        float.addKeyFrame(
            KeyFrame.makePos(
                element.x,
                element.y,
                KeyFrame.TransitionType.EASE_IN,
                0.38
            )
        );
        float.addKeyFrame(
            KeyFrame.makePos(
                element.x,
                element.y + offset,
                KeyFrame.TransitionType.EASE_OUT,
                0.38
            )
        );
        float.addKeyFrame(
            KeyFrame.makePos(
                element.x,
                element.y,
                KeyFrame.TransitionType.EASE_IN,
                0.38
            )
        );
        float.addKeyFrame(
            KeyFrame.makePos(
                element.x,
                element.y - offset,
                KeyFrame.TransitionType.EASE_OUT,
                0.38
            )
        );
        element.addTimeline(float);
        element.playTimeline(0);
    }

    private getGhostRopeAnchor(): ConstrainedPoint | null {
        if (this.scene.twoParts === GameSceneConstants.PartsType.NONE) {
            return !this.scene.noCandy && this.scene.star
                ? this.scene.star
                : (this.scene.star ?? this.scene.starL ?? this.scene.starR);
        }

        let best: ConstrainedPoint | null = null;
        let bestDistance = Number.MAX_VALUE;

        const consider = (candidate: ConstrainedPoint | null, candyMissing: boolean) => {
            if (!candidate || candyMissing) {
                return;
            }

            const distance = Vector.distance(this.x, this.y, candidate.pos.x, candidate.pos.y);
            if (distance < bestDistance) {
                bestDistance = distance;
                best = candidate;
            }
        };

        consider(this.scene.starL, this.scene.noCandyL);
        consider(this.scene.starR, this.scene.noCandyR);

        return best
            ? best
            : !this.scene.noCandy && this.scene.star
              ? this.scene.star
              : (this.scene.star ?? this.scene.starL ?? this.scene.starR);
    }
}

export default Ghost;
