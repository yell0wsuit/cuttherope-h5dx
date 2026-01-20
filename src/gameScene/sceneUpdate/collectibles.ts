import Animation from "@/visual/Animation";
import Alignment from "@/core/Alignment";
import Bungee from "@/game/Bungee";
import Camera2D from "@/visual/Camera2D";
import ConstraintType from "@/physics/ConstraintType";
import * as GameSceneConstants from "@/gameScene/constants";
import GameObject from "@/visual/GameObject";
import Mover from "@/utils/Mover";
import SoundMgr from "@/game/CTRSoundMgr";
import Timeline from "@/visual/Timeline";
import Vector from "@/core/Vector";
import ResourceId from "@/resources/ResourceId";
import { disableGhostCycleForBubble, enableGhostCycleForBubble, isGhostBubble } from "./bubbles";
import type AnimationPool from "@/visual/AnimationPool";
import type Bubble from "@/game/Bubble";
import type { GameScene } from "@/types/game-scene";

type CollectiblesScene = GameScene & {
    partsDist: number;
    starDisappearPool: Animation[];
    hudStars: Animation[];
    candyResourceId: (typeof ResourceId)[keyof typeof ResourceId];
    isBubbleCapture(
        bubble: Bubble,
        candy: GameObject,
        candyBubble: Bubble | null,
        candyBubbleAnimation: Animation | AnimationPool
    ): boolean;
};

export function updateCollectibles(this: CollectiblesScene, delta: number): boolean {
    let moveResult: ReturnType<typeof Mover.moveToTargetWithStatus> | undefined;
    if (!this.noCandy) {
        this.candy.update(delta);
        this.star.update(delta * this.ropePhysicsSpeed);
    }

    const syncCandyPositions = (): void => {
        if (!this.noCandy && !this.isCandyInLantern) {
            this.candy.x = this.star.pos.x;
            this.candy.y = this.star.pos.y;
            this.candy.calculateTopLeft();
        }

        if (this.twoParts !== GameSceneConstants.PartsType.NONE) {
            if (!this.noCandyL) {
                this.candyL.x = this.starL.pos.x;
                this.candyL.y = this.starL.pos.y;
                this.candyL.calculateTopLeft();
            }
            if (!this.noCandyR) {
                this.candyR.x = this.starR.pos.x;
                this.candyR.y = this.starR.pos.y;
                this.candyR.calculateTopLeft();
            }
        }
    };

    if (this.twoParts !== GameSceneConstants.PartsType.NONE) {
        const ropeDelta = delta * this.ropePhysicsSpeed;
        this.candyL.update(delta);
        this.starL.update(ropeDelta);
        this.candyR.update(delta);
        this.starR.update(ropeDelta);
        if (this.twoParts === GameSceneConstants.PartsType.DISTANCE) {
            for (let i = 0; i < Bungee.BUNGEE_RELAXION_TIMES; i++) {
                this.starL.satisfyConstraints();
                this.starR.satisfyConstraints();
            }
        }
        if (this.partsDist > 0) {
            moveResult = Mover.moveToTargetWithStatus(this.partsDist, 0, 200, delta);
            this.partsDist = moveResult.value;
            if (moveResult.reachedZero) {
                SoundMgr.playSound(ResourceId.SND_CANDY_LINK);
                this.twoParts = GameSceneConstants.PartsType.NONE;
                this.noCandy = false;
                this.noCandyL = true;
                this.noCandyR = true;

                //Achievements.increment(AchievementId.ROMANTIC_SOUL);

                if (this.candyBubbleL || this.candyBubbleR) {
                    this.candyBubble = this.candyBubbleL ? this.candyBubbleL : this.candyBubbleR;
                    const isGhost = isGhostBubble(this, this.candyBubble);
                    this.candyBubbleAnimation.visible = !isGhost;
                    if (isGhost) {
                        // Reparent ghost bubble animation from half candy to merged candy
                        const ghostBubbleAni = this.candyBubbleL
                            ? this.candyGhostBubbleAnimationL
                            : this.candyGhostBubbleAnimationR;
                        if (ghostBubbleAni) {
                            const oldParent = this.candyBubbleL ? this.candyL : this.candyR;
                            oldParent.removeChild(ghostBubbleAni);
                            this.candy.addChild(ghostBubbleAni);
                            this.candyGhostBubbleAnimation = ghostBubbleAni;
                            ghostBubbleAni.visible = true;
                        }
                    }
                }

                this.lastCandyRotateDelta = 0;
                this.lastCandyRotateDeltaL = 0;
                this.lastCandyRotateDeltaR = 0;

                this.star.pos.x = this.starL.pos.x;
                this.star.pos.y = this.starL.pos.y;
                this.candy.x = this.star.pos.x;
                this.candy.y = this.star.pos.y;
                this.candy.calculateTopLeft();

                const lv = Vector.subtract(this.starL.pos, this.starL.prevPos);
                const rv = Vector.subtract(this.starR.pos, this.starR.prevPos);
                const sv = new Vector((lv.x + rv.x) / 2, (lv.y + rv.y) / 2);
                this.star.prevPos.copyFrom(this.star.pos);
                this.star.prevPos.subtract(sv);

                for (const grab of this.bungees) {
                    const rope = grab.rope;
                    if (
                        rope &&
                        rope.cut !== rope.parts.length - 3 &&
                        (rope.tail === this.starL || rope.tail === this.starR)
                    ) {
                        const prev = rope.parts[rope.parts.length - 2]!;
                        const heroRestLen = rope.tail.restLength(prev);
                        this.star.addConstraint(prev, heroRestLen, ConstraintType.DISTANCE);
                        rope.tail = this.star;
                        rope.parts[rope.parts.length - 1] = this.star;
                        rope.initialCandleAngle = 0;
                        rope.chosenOne = false;
                    }
                }

                const constants = this.getCandyConstants();
                const candyFxResourceId = this.getCandyFxResourceId();

                const transform = new Animation();
                transform.initTextureWithId(candyFxResourceId);
                transform.doRestoreCutTransparency();
                transform.x = this.candy.x;
                transform.y = this.candy.y;
                transform.anchor = Alignment.CENTER;
                const a = transform.addAnimationDelay(
                    0.05,
                    Timeline.LoopType.NO_LOOP,
                    constants.part_fx_start,
                    constants.part_fx_end
                );
                const transformTimeline = transform.getTimeline(a);
                if (transformTimeline) {
                    transformTimeline.onFinished = this.aniPool.timelineFinishedDelegate();
                }
                transform.playTimeline(0);
                this.aniPool.addChild(transform);
            } else {
                this.starL.changeRestLength(this.starR, this.partsDist);
                this.starR.changeRestLength(this.starL, this.partsDist);
            }
        }

        if (
            !this.noCandyL &&
            !this.noCandyR &&
            this.twoParts === GameSceneConstants.PartsType.SEPARATE &&
            GameObject.intersect(this.candyL, this.candyR)
        ) {
            this.twoParts = GameSceneConstants.PartsType.DISTANCE;
            this.partsDist = this.starL.pos.distance(this.starR.pos);
            this.starL.addConstraint(this.starR, this.partsDist, ConstraintType.NOT_MORE_THAN);
            this.starR.addConstraint(this.starL, this.partsDist, ConstraintType.NOT_MORE_THAN);
        }
    }

    this.target.update(delta);
    syncCandyPositions();

    if (this.camera.type !== Camera2D.SpeedType.PIXELS || !this.ignoreTouches) {
        for (let i = 0, len = this.stars.length; i < len; i++) {
            const s = this.stars[i];
            if (!s) {
                continue;
            }
            s.update(delta);

            if (s.timeout > 0 && s.time === 0) {
                const starTimeline = s.getTimeline(1);
                if (starTimeline) {
                    starTimeline.onFinished = this.aniPool.timelineFinishedDelegate();
                }
                this.aniPool.addChild(s);
                this.stars.splice(i, 1);
                s.timedAnim?.playTimeline(1);
                s.playTimeline(1);
                break;
            } else {
                let hits = false;
                if (this.twoParts !== GameSceneConstants.PartsType.NONE) {
                    hits =
                        (!!GameObject.intersect(this.candyL, s) && !this.noCandyL) ||
                        (!!GameObject.intersect(this.candyR, s) && !this.noCandyR);
                } else {
                    hits = !!GameObject.intersect(this.candy, s) && !this.noCandy;
                }

                if (hits) {
                    this.candyBlink.playTimeline(GameSceneConstants.CandyBlink.STAR);
                    this.starsCollected++;
                    this.hudStars[this.starsCollected - 1]!.playTimeline(0);

                    const starDisappear = this.starDisappearPool[i]!;
                    starDisappear.x = s.x;
                    starDisappear.y = s.y;

                    starDisappear.playTimeline(0);
                    this.aniPool.addChild(starDisappear);

                    this.stars[i] = null;
                    SoundMgr.playSound(ResourceId.SND_STAR_1 + this.starsCollected - 1);

                    if (
                        this.target.currentTimelineIndex === GameSceneConstants.CharAnimation.IDLE
                    ) {
                        this.target.playTimeline(GameSceneConstants.CharAnimation.EXCITED);
                    }

                    break;
                }
            }
        }
    }

    for (const bubble of this.bubbles) {
        bubble.update(delta);

        if (!bubble.popped) {
            if (this.twoParts !== GameSceneConstants.PartsType.NONE) {
                if (
                    !this.noCandyL &&
                    this.isBubbleCapture(
                        bubble,
                        this.candyL,
                        this.candyBubbleL,
                        this.candyBubbleAnimationL
                    )
                ) {
                    enableGhostCycleForBubble(this, this.candyBubbleL);
                    this.candyBubbleL = bubble;
                    const leftHasGhost = disableGhostCycleForBubble(this, bubble);
                    this.candyBubbleAnimationL.visible = !leftHasGhost;
                    if (this.candyGhostBubbleAnimationL) {
                        this.candyGhostBubbleAnimationL.visible = leftHasGhost;
                    }
                    break;
                }

                if (
                    !this.noCandyR &&
                    this.isBubbleCapture(
                        bubble,
                        this.candyR,
                        this.candyBubbleR,
                        this.candyBubbleAnimationR
                    )
                ) {
                    enableGhostCycleForBubble(this, this.candyBubbleR);
                    this.candyBubbleR = bubble;
                    const rightHasGhost = disableGhostCycleForBubble(this, bubble);
                    this.candyBubbleAnimationR.visible = !rightHasGhost;
                    if (this.candyGhostBubbleAnimationR) {
                        this.candyGhostBubbleAnimationR.visible = rightHasGhost;
                    }
                    break;
                }
            } else if (
                !this.noCandy &&
                this.isBubbleCapture(
                    bubble,
                    this.candy,
                    this.candyBubble,
                    this.candyBubbleAnimation
                )
            ) {
                enableGhostCycleForBubble(this, this.candyBubble);
                const hasGhost = disableGhostCycleForBubble(this, bubble);
                this.candyBubble = bubble;
                this.candyBubbleAnimation.visible = !hasGhost;
                if (this.candyGhostBubbleAnimation) {
                    this.candyGhostBubbleAnimation.visible = hasGhost;
                }
                break;
            }
        }

        if (!bubble.withoutShadow) {
            const numRotatedCircles = this.rotatedCircles.length;
            for (let j = 0; j < numRotatedCircles; j++) {
                const rc = this.rotatedCircles[j]!;
                const distanceToCircle = Vector.distance(bubble.x, bubble.y, rc.x, rc.y);
                if (distanceToCircle < rc.sizeInPixels) {
                    bubble.withoutShadow = true;
                }
            }
        }
    }

    for (const ghost of this.ghosts) {
        ghost.updateGhost(delta);
    }

    // tutorial text
    for (let i = 0, len = this.tutorials.length; i < len; i++) {
        const t = this.tutorials[i]!;
        t.update(delta);
    }

    // tutorial images
    for (let i = 0, len = this.tutorialImages.length; i < len; i++) {
        const t = this.tutorialImages[i]!;
        t.update(delta);
    }

    return true;
}
