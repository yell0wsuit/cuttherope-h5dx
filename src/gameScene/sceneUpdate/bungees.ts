import Bungee from "@/game/Bungee";
import Camera2D from "@/visual/Camera2D";
import * as GameSceneConstants from "@/gameScene/constants";
import Radians from "@/utils/Radians";
import ResourceId from "@/resources/ResourceId";
import SoundMgr from "@/game/CTRSoundMgr";
import Vector from "@/core/Vector";
import Constants from "@/utils/Constants";
import resolution from "@/resolution";
import Grab from "@/game/Grab";
import type { GameScene, SceneStar } from "@/types/game-scene";

type SceneGrab = GameScene["bungees"][number];

export function updateBungees(this: GameScene, delta: number): number {
    const numGrabs = this.bungees.length;
    if (numGrabs > 0) {
        let handledRotation = false;
        let handledRotationL = false;
        let handledRotationR = false;

        for (let i = 0; i < numGrabs; i++) {
            const grab: SceneGrab | undefined = this.bungees[i];
            if (!grab) {
                continue;
            }

            grab.update(delta);

            const rope = grab.rope;

            if (grab.mover && rope) {
                rope.bungeeAnchor.pos.x = grab.x;
                rope.bungeeAnchor.pos.y = grab.y;
                rope.bungeeAnchor.pin.copyFrom(rope.bungeeAnchor.pos);
            }

            if (rope && grab.stickTimer !== Constants.UNDEFINED) {
                grab.stickTimer += delta;
                if (grab.stickTimer > Grab.STICK_DELAY) {
                    const inBounds =
                        grab.rectInObject(0, 0, this.mapWidth, this.mapHeight) ?? false;
                    if (inBounds) {
                        rope.bungeeAnchor.pin.copyFrom(rope.bungeeAnchor.pos);
                        grab.kicked = false;
                        rope.bungeeAnchor.setWeight(0.02);
                        grab.updateKickState();
                        SoundMgr.playSound(ResourceId.SND_EXP_SUCKER_LAND);
                    }
                    grab.stickTimer = Constants.UNDEFINED;
                }
            }

            if (rope) {
                if (rope.cut !== Constants.UNDEFINED && rope.cutTime === 0) {
                    grab.destroyRope();
                    continue;
                }

                rope.update(delta * this.ropePhysicsSpeed);

                if (grab.hasSpider) {
                    if (this.camera.type !== Camera2D.SpeedType.PIXELS || !this.ignoreTouches) {
                        grab.updateSpider(delta);
                    }

                    if (grab.spiderPos === Constants.UNDEFINED) {
                        this.spiderWon(grab);
                        break;
                    }
                }
            }

            if (grab.radius !== Constants.UNDEFINED && !grab.rope) {
                const STAR_RADIUS = resolution.STAR_RADIUS;
                const createRope = (star: SceneStar, attachCandy: boolean): boolean => {
                    const l = new Vector(grab.x, grab.y).distance(star.pos);
                    if (l > grab.radius + STAR_RADIUS) {
                        return false;
                    }

                    const newRope = new Bungee(
                        null,
                        grab.x,
                        grab.y,
                        star,
                        star.pos.x,
                        star.pos.y,
                        grab.radius + STAR_RADIUS
                    );
                    newRope.bungeeAnchor.pin.copyFrom(newRope.bungeeAnchor.pos);
                    grab.hideRadius = true;
                    grab.setRope(newRope);

                    if (attachCandy) {
                        // If mouse already has this candy, immediately cut the rope
                        if (this.miceManager?.activeMouseHasCandy()) {
                            newRope.setCut(newRope.parts.length - 2);
                            this.detachCandy();
                        } else {
                            this.attachCandy();
                        }
                    }

                    SoundMgr.playSound(ResourceId.SND_ROPE_GET);
                    if (grab.mover) {
                        SoundMgr.playSound(ResourceId.SND_BUZZ);
                    }
                    return true;
                };

                if (this.twoParts !== GameSceneConstants.PartsType.NONE) {
                    if (!this.noCandyL) {
                        createRope(this.starL, true);
                    }
                    if (!this.noCandyR && grab.rope == null) {
                        createRope(this.starR, true);
                    }
                } else {
                    createRope(this.star, true);
                }

                if (grab.rope == null && this.lightbulbs.length > 0) {
                    for (const bulb of this.lightbulbs) {
                        if (!bulb || bulb.attachedSock != null) {
                            continue;
                        }
                        if (createRope(bulb.constraint, false)) {
                            break;
                        }
                    }
                }
            }

            if (rope) {
                const prev = rope.bungeeAnchor;
                const tail = rope.parts[rope.parts.length - 1];
                if (!tail) {
                    continue;
                }

                const v = Vector.subtract(prev.pos, tail.pos);
                let hasCandy = false;

                if (!handledRotation) {
                    if (this.twoParts !== GameSceneConstants.PartsType.NONE) {
                        if (tail === this.starL && !this.noCandyL && !handledRotationL) {
                            hasCandy = true;
                        } else if (tail === this.starR && !this.noCandyR && !handledRotationR) {
                            hasCandy = true;
                        }
                    } else if (!this.noCandy && !handledRotation) {
                        hasCandy = true;
                    }
                }

                if (rope.relaxed !== 0 && rope.cut === Constants.UNDEFINED && hasCandy) {
                    const angle = Radians.toDegrees(v.normalizedAngle());
                    if (this.twoParts !== GameSceneConstants.PartsType.NONE) {
                        const candyPart = tail === this.starL ? this.candyL : this.candyR;
                        if (!rope.chosenOne) {
                            rope.initialCandleAngle = candyPart.rotation - angle;
                        }

                        if (tail === this.starL) {
                            this.lastCandyRotateDeltaL =
                                angle + rope.initialCandleAngle - candyPart.rotation;
                            handledRotationL = true;
                        } else {
                            this.lastCandyRotateDeltaR =
                                angle + rope.initialCandleAngle - candyPart.rotation;
                            handledRotationR = true;
                        }
                        candyPart.rotation = angle + rope.initialCandleAngle;
                    } else if (!this.noCandy && tail === this.star) {
                        if (!rope.chosenOne) {
                            rope.initialCandleAngle = this.candyMain.rotation - angle;
                        }
                        this.lastCandyRotateDelta =
                            angle + rope.initialCandleAngle - this.candyMain.rotation;
                        this.candyMain.rotation = angle + rope.initialCandleAngle;
                        handledRotation = true;
                    }

                    rope.chosenOne = true;
                } else {
                    rope.chosenOne = false;
                }
            }
        }

        if (this.twoParts !== GameSceneConstants.PartsType.NONE) {
            if (!handledRotationL && !this.noCandyL) {
                this.candyL.rotation += Math.min(5, this.lastCandyRotateDeltaL);
                this.lastCandyRotateDeltaL *= 0.98;
            }
            if (!handledRotationR && !this.noCandyR) {
                this.candyR.rotation += Math.min(5, this.lastCandyRotateDeltaR);
                this.lastCandyRotateDeltaR *= 0.98;
            }
        } else if (!handledRotation && !this.noCandy) {
            this.candyMain.rotation += Math.min(5, this.lastCandyRotateDelta);
            this.lastCandyRotateDelta *= 0.98;
        }
    }

    return numGrabs;
}
