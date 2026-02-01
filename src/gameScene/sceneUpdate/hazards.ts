import CandyBreak from "@/game/CandyBreak";
import Mover from "@/utils/Mover";
import Radians from "@/utils/Radians";
import Rectangle from "@/core/Rectangle";
import ResourceId from "@/resources/ResourceId";
import ResourceMgr from "@/resources/ResourceMgr";
import Sock from "@/game/Sock";
import SoundMgr from "@/game/CTRSoundMgr";
import Vector from "@/core/Vector";
import resolution from "@/resolution";
import * as GameSceneConstants from "@/gameScene/constants";
import { IS_XMAS } from "@/utils/SpecialEvents";
import Lantern from "@/game/Lantern";
import KeyFrame from "@/visual/KeyFrame";
import Timeline from "@/visual/Timeline";
import RGBAColor from "@/core/RGBAColor";
import Constants from "@/utils/Constants";
import { applyStarImpulse, isCandyHit } from "./collisionHelpers";
import { triggerSpecialTutorial } from "./special";
import type GameObject from "@/visual/GameObject";
import type BaseElement from "@/visual/BaseElement";
import type Bubble from "@/game/Bubble";
import type Bouncer from "@/game/Bouncer";
import type Grab from "@/game/Grab";
import type LightBulb from "@/game/LightBulb";
import type Pump from "@/game/Pump";
import type RotatedCircle from "@/game/RotatedCircle";
import type SteamTube from "@/game/SteamTube";
import type Spikes from "@/game/Spikes";
import type LanternType from "@/game/Lantern";
import type Mouse from "@/game/Mouse";
import type MiceObject from "@/game/MiceObject";
import type { GameScene, SceneStar } from "@/types/game-scene";

type SockState = (typeof Sock.StateType)[keyof typeof Sock.StateType];

type SceneSock = Sock & { state: SockState };

interface Rocket {
    update(delta: number): void;
}

type RotatedCircleWithContents = RotatedCircle & {
    containedObjects: (Grab | Bubble)[];
    removeOnNextUpdate?: boolean;
};

type HazardScene = GameScene & {
    PM: number;
    rockets: Rocket[];
    teleport(): void;
    operatePump(pump: Pump, delta: number): void;
    lanterns: LanternType[];
    releaseAllRopes(left: boolean): void;
    popCandyBubble(isLeft: boolean): void;
    candy: GameObject;
    candyMain: GameObject;
    candyTop: GameObject;
    candyBubble: Bubble | null;
    isCandyInLantern: boolean;
    handleBounce(bouncer: Bouncer, star: SceneStar, delta: number): void;
    cut(razor: BaseElement | null, v1: Vector, v2: Vector, immediate: boolean): number;
    candyResourceId: (typeof ResourceId)[keyof typeof ResourceId];
    socks: SceneSock[];
    rotatedCircles: RotatedCircleWithContents[];
    spikes: Spikes[];
    tubes: SteamTube[];
    mice: Mouse[];
    miceManager: MiceObject | null;
};

function releaseLightBulbRopes(scene: HazardScene, bulb: LightBulb): void {
    for (const grab of scene.bungees) {
        const rope = grab.rope;
        if (!rope || rope.tail !== bulb.constraint) {
            continue;
        }

        if (rope.cut === Constants.UNDEFINED) {
            rope.setCut(rope.parts.length - 2);
        } else {
            rope.hideTailParts = true;
        }

        if (grab.hasSpider && grab.spiderActive) {
            scene.spiderBusted(grab);
        }
    }
}

function dropLightBulbFromSock(this: HazardScene, bulb: LightBulb): void {
    if (!bulb.attachedSock) {
        return;
    }

    const sock = bulb.attachedSock;
    const light = sock.light;
    if (light) {
        light.playTimeline(0);
        light.visible = true;
    }

    const offset = new Vector(0, resolution.SOCK_TELEPORT_Y);
    offset.rotate(Radians.fromDegrees(sock.rotation));

    bulb.constraint.pos.x = sock.x;
    bulb.constraint.pos.y = sock.y;
    bulb.constraint.pos.add(offset);

    bulb.constraint.prevPos.copyFrom(bulb.constraint.pos);

    bulb.constraint.v.x = 0;
    bulb.constraint.v.y = -1;
    bulb.constraint.v.rotate(Radians.fromDegrees(sock.rotation));
    bulb.constraint.v.multiply(bulb.sockSpeed);

    bulb.constraint.posDelta.copyFrom(bulb.constraint.v);
    bulb.constraint.posDelta.divide(60);
    bulb.constraint.prevPos.copyFrom(bulb.constraint.pos);
    bulb.constraint.prevPos.subtract(bulb.constraint.posDelta);

    bulb.attachedSock = null;
    bulb.sockSpeed = 0;
}

function operateSteamTube(scene: HazardScene, tube: SteamTube, delta: number): void {
    const tubeScale = tube.getHeightScale();
    let damping = 5;
    const angle = Radians.fromDegrees(tube.rotation);
    const tubeWidth = 10 * tubeScale;
    const currentHeight = tube.getCurrentHeightModulated();
    const verticalOffset = 1 * tubeScale;
    const collisionRadius = 17.5 * tubeScale;
    const gravityInverted = !!scene.gravityButton && !scene.gravityNormal;

    const rectLeft = tube.x - tubeWidth / 2;
    const rectTop = tube.y - currentHeight - verticalOffset;
    const rectRight = tube.x + tubeWidth / 2;
    const rectBottom = tube.y - collisionRadius;

    const applyImpulse = (star: SceneStar): boolean => {
        const position = star.pos.copy();
        const velocity = star.v.copy();

        position.rotateAround(-angle, tube.x, tube.y);
        velocity.rotate(-angle);

        const insideTube = Rectangle.rectInRect(
            position.x - collisionRadius,
            position.y - collisionRadius / 2,
            position.x + collisionRadius,
            position.y + collisionRadius,
            rectLeft,
            rectTop,
            rectRight,
            rectBottom
        );

        if (!insideTube) {
            return false;
        }

        for (const bouncer of scene.bouncers) {
            if (bouncer) {
                bouncer.skip = 0;
            }
        }

        let horizontalImpulse = 0;
        if (
            (tube.rotation === 0 && !gravityInverted) ||
            (tube.rotation === 180 && gravityInverted)
        ) {
            const deltaX = tube.x - position.x;
            horizontalImpulse =
                Math.abs(deltaX) > tubeWidth / 4
                    ? -velocity.x / damping + 0.25 * deltaX
                    : Math.abs(velocity.x) < 1
                      ? -velocity.x
                      : -velocity.x / damping;
        }

        const alignedWithGravity =
            (tube.rotation === 0 && !gravityInverted) || (tube.rotation === 180 && gravityInverted);
        let gravityCompensation = (-32 / star.weight) * Math.sqrt(tubeScale);
        if (!alignedWithGravity) {
            damping *= 15;
            if (tube.rotation === 90 || tube.rotation === 270) {
                gravityCompensation /= 4;
            } else {
                gravityCompensation /= 2;
            }
        }

        const impulse = new Vector(horizontalImpulse, -velocity.y / damping + gravityCompensation);

        const distanceBelowValve = tube.y - position.y;
        if (distanceBelowValve > currentHeight + collisionRadius) {
            const attenuation = Math.exp(
                -2 * (distanceBelowValve - (currentHeight + collisionRadius))
            );
            impulse.multiply(attenuation);
        }

        impulse.rotate(angle);
        star.applyImpulse(impulse, delta);
        return true;
    };

    if (scene.twoParts === GameSceneConstants.PartsType.NONE) {
        if (!scene.noCandy) {
            applyImpulse(scene.star);
        }
    } else {
        if (!scene.noCandyL) {
            applyImpulse(scene.starL);
        }
        if (!scene.noCandyR) {
            applyImpulse(scene.starR);
        }
    }

    for (const bulb of scene.lightbulbs) {
        if (!bulb || bulb.attachedSock != null) {
            continue;
        }
        applyImpulse(bulb.constraint);
    }
}

export function updateHazards(this: HazardScene, delta: number, numGrabs: number): boolean {
    let removeCircleIndex = -1;
    for (let i = 0, len = this.rotatedCircles.length; i < len; i++) {
        const rc = this.rotatedCircles[i]!;
        const containedObjects = rc.containedObjects;

        for (let j = 0; j < numGrabs; j++) {
            const g = this.bungees[j]!;
            const gIndex = containedObjects.indexOf(g);
            const distance = Vector.distance(g.x, g.y, rc.x, rc.y);

            if (distance <= rc.sizeInPixels + 5 * this.PM) {
                if (gIndex < 0) {
                    containedObjects.push(g);
                }
            } else if (gIndex >= 0) {
                containedObjects.splice(gIndex, 1);
            }
        }

        const numBubbles = this.bubbles.length;
        for (let j = 0; j < numBubbles; j++) {
            const b = this.bubbles[j]!;
            const distance = Vector.distance(b.x, b.y, rc.x, rc.y);
            const bIndex = containedObjects.indexOf(b);

            if (distance <= rc.sizeInPixels + 10 * this.PM) {
                if (bIndex < 0) {
                    containedObjects.push(b);
                }
            } else if (bIndex >= 0) {
                containedObjects.splice(bIndex, 1);
            }
        }

        if (rc.removeOnNextUpdate) {
            removeCircleIndex = i;
        }

        rc.update(delta);
    }

    if (removeCircleIndex >= 0) {
        this.rotatedCircles.splice(removeCircleIndex, 1);
    }

    if (this.miceManager) {
        this.miceManager.update(delta);

        const pickTarget = (): { star: SceneStar; candy: GameObject; isLeft: boolean } | null => {
            if (this.twoParts !== GameSceneConstants.PartsType.NONE) {
                if (!this.noCandyL) {
                    return { star: this.starL, candy: this.candyL, isLeft: true };
                }
                if (!this.noCandyR) {
                    return { star: this.starR, candy: this.candyR, isLeft: false };
                }
                return null;
            }

            if (this.noCandy) {
                return null;
            }

            return { star: this.star, candy: this.candy, isLeft: false };
        };

        const target = pickTarget();
        if (
            target &&
            !this.miceManager.activeMouseHasCandy() &&
            this.miceManager.isActiveMouseInRange(target.star)
        ) {
            this.miceManager.grabWithActiveMouse(target.star, target.candy, target.isLeft);
            triggerSpecialTutorial(this, 4);
        }
    }

    // rockets
    for (let i = 0, len = this.rockets.length; i < len; i++) {
        const r = this.rockets[i]!;
        r.update(delta);

        // TODO: finish
    }

    // socks / magic hats
    for (let i = 0, len = this.socks.length; i < len; i++) {
        const s = this.socks[i]!;
        s.update(delta);
        const moveStatus = Mover.moveToTargetWithStatus(s.idleTimeout, 0, 1, delta);
        s.idleTimeout = moveStatus.value;
        if (moveStatus.reachedZero) {
            s.state = Sock.StateType.IDLE;
        }

        const savedRotation = s.rotation;
        s.rotation = 0;
        s.updateRotation();
        const invRotation = Radians.fromDegrees(-savedRotation);
        const rs = this.star.posDelta.copy();
        rs.rotate(invRotation);
        s.rotation = savedRotation;
        s.updateRotation();

        const bbX = this.star.pos.x - resolution.STAR_SOCK_RADIUS;
        const bbY = this.star.pos.y - resolution.STAR_SOCK_RADIUS;
        const bbW = resolution.STAR_SOCK_RADIUS * 2;
        const bbH = bbW;

        const wasIdle = s.state === Sock.StateType.IDLE;
        const candyHits =
            rs.y >= 0 &&
            (Rectangle.lineInRect(s.t1.x, s.t1.y, s.t2.x, s.t2.y, bbX, bbY, bbW, bbH) ||
                Rectangle.lineInRect(s.b1.x, s.b1.y, s.b2.x, s.b2.y, bbX, bbY, bbW, bbH));
        let bulbHits = false;

        if (!wasIdle && this.lightbulbs.length > 0) {
            for (const bulb of this.lightbulbs) {
                if (!bulb || bulb.attachedSock != null) {
                    continue;
                }

                const bulbDelta = bulb.constraint.posDelta.copy();
                bulbDelta.rotate(invRotation);
                const bulbX = bulb.constraint.pos.x - resolution.STAR_SOCK_RADIUS;
                const bulbY = bulb.constraint.pos.y - resolution.STAR_SOCK_RADIUS;
                const bulbHit =
                    bulbDelta.y >= 0 &&
                    (Rectangle.lineInRect(s.t1.x, s.t1.y, s.t2.x, s.t2.y, bulbX, bulbY, bbW, bbH) ||
                        Rectangle.lineInRect(
                            s.b1.x,
                            s.b1.y,
                            s.b2.x,
                            s.b2.y,
                            bulbX,
                            bulbY,
                            bbW,
                            bbH
                        ));

                if (bulbHit) {
                    bulbHits = true;
                    break;
                }
            }
        }

        if (!wasIdle) {
            if (!candyHits && !bulbHits && s.idleTimeout === 0) {
                s.idleTimeout = Sock.IDLE_TIMEOUT;
            }
            continue;
        }

        if (candyHits && !this.targetSock) {
            // look for a receiving sock
            for (let j = 0; j < len; j++) {
                const n = this.socks[j]!;
                if (n !== s && n.group === s.group) {
                    n.state = Sock.StateType.THROWING;
                    n.idleTimeout = Sock.IDLE_TIMEOUT;
                    this.releaseAllRopes(false);

                    this.savedSockSpeed =
                        GameSceneConstants.SOCK_SPEED_K *
                        this.star.v.getLength() *
                        resolution.PHYSICS_SPEED_MULTIPLIER;
                    this.targetSock = n;

                    const { light } = s;
                    if (light) {
                        // Set to first glow quad before making visible to prevent brief hat quad flash
                        light.setTextureQuad(Sock.Quads.IMG_OBJ_SOCKS_glow_start);
                        light.visible = true;
                        light.playTimeline(0);
                    }

                    const teleportSound = IS_XMAS
                        ? ResourceId.SND_TELEPORT_XMAS
                        : ResourceId.SND_TELEPORT;
                    SoundMgr.playSound(teleportSound);

                    this.dd.callObject(this, this.teleport, null, 0.1);
                    break;
                }
            }
        }

        if (this.lightbulbs.length > 0) {
            let bulbTeleported = false;
            for (const bulb of this.lightbulbs) {
                if (!bulb || bulb.attachedSock != null) {
                    continue;
                }

                const bulbDelta = bulb.constraint.posDelta.copy();
                bulbDelta.rotate(invRotation);
                const bulbX = bulb.constraint.pos.x - resolution.STAR_SOCK_RADIUS;
                const bulbY = bulb.constraint.pos.y - resolution.STAR_SOCK_RADIUS;
                const bulbHit =
                    bulbDelta.y >= 0 &&
                    (Rectangle.lineInRect(s.t1.x, s.t1.y, s.t2.x, s.t2.y, bulbX, bulbY, bbW, bbH) ||
                        Rectangle.lineInRect(
                            s.b1.x,
                            s.b1.y,
                            s.b2.x,
                            s.b2.y,
                            bulbX,
                            bulbY,
                            bbW,
                            bbH
                        ));

                if (!bulbHit) {
                    continue;
                }

                bulbHits = true;

                for (let j = 0; j < len; j++) {
                    const n = this.socks[j]!;
                    if (n !== s && n.group === s.group) {
                        n.state = Sock.StateType.THROWING;
                        n.idleTimeout = Sock.IDLE_TIMEOUT;
                        releaseLightBulbRopes(this, bulb);

                        bulb.sockSpeed =
                            GameSceneConstants.SOCK_SPEED_K *
                            bulb.constraint.v.getLength() *
                            resolution.PHYSICS_SPEED_MULTIPLIER;
                        bulb.attachedSock = n;

                        const { light } = s;
                        if (light) {
                            light.setTextureQuad(Sock.Quads.IMG_OBJ_SOCKS_glow_start);
                            light.visible = true;
                            light.playTimeline(0);
                        }

                        const teleportSound = IS_XMAS
                            ? ResourceId.SND_TELEPORT_XMAS
                            : ResourceId.SND_TELEPORT;
                        SoundMgr.playSound(teleportSound);

                        this.dd.callObject(this, dropLightBulbFromSock, [bulb], 0.1);
                        bulbTeleported = true;
                        break;
                    }
                }

                if (bulbTeleported) {
                    break;
                }
            }
        }
    }

    // pumps
    for (let i = 0, len = this.pumps.length; i < len; i++) {
        const p = this.pumps[i]!;
        p.update(delta);

        const moveStatus = Mover.moveToTargetWithStatus(p.touchTimer, 0, 1, delta);
        p.touchTimer = moveStatus.value;
        if (moveStatus.reachedZero) {
            this.operatePump(p, delta);
        }
    }

    // steam tubes
    for (const tube of this.tubes) {
        if (!tube) {
            continue;
        }
        tube.update(delta);
        if (tube.steamState !== 3) {
            operateSteamTube(this, tube, delta);
        }
    }

    const lanternCaptureRadius = resolution.LANTERN_CAPTURE_RADIUS ?? resolution.STAR_RADIUS;
    for (const lantern of this.lanterns) {
        lantern.update(delta);
        const activeLantern =
            lantern.lanternState === Lantern.STATE.INACTIVE &&
            Vector.distance(this.star.pos.x, this.star.pos.y, lantern.x, lantern.y) <
                lanternCaptureRadius;
        if (!this.noCandy && !this.isCandyInLantern && activeLantern) {
            this.isCandyInLantern = true;
            this.candy.passTransformationsToChilds = true;
            this.candyMain.scaleX = this.candyMain.scaleY = 1;
            this.candyTop.scaleX = this.candyTop.scaleY = 1;
            const candyTimeline = new Timeline();
            candyTimeline.addKeyFrame(
                KeyFrame.makePos(this.candy.x, this.candy.y, KeyFrame.TransitionType.LINEAR, 0)
            );
            candyTimeline.addKeyFrame(
                KeyFrame.makePos(lantern.x, lantern.y, KeyFrame.TransitionType.LINEAR, 0.1)
            );
            candyTimeline.addKeyFrame(
                KeyFrame.makeScale(0.71, 0.71, KeyFrame.TransitionType.LINEAR, 0)
            );
            candyTimeline.addKeyFrame(
                KeyFrame.makeScale(0.3, 0.3, KeyFrame.TransitionType.LINEAR, 0.1)
            );
            candyTimeline.addKeyFrame(
                KeyFrame.makeColor(RGBAColor.solidOpaque.copy(), KeyFrame.TransitionType.LINEAR, 0)
            );
            candyTimeline.addKeyFrame(
                KeyFrame.makeColor(
                    RGBAColor.transparent.copy(),
                    KeyFrame.TransitionType.LINEAR,
                    0.1
                )
            );
            this.candy.removeTimeline(0);
            this.candy.addTimelineWithID(candyTimeline, 0);
            this.candy.playTimeline(0);
            this.releaseAllRopes(false);
            if (this.candyBubble) {
                this.popCandyBubble(false);
            }
            this.dd.callObject(lantern, lantern.captureCandyFromDispatcher, [this.star], 0.05);

            // Tutorial special flag 3: triggers when candy is captured by lantern
            // This shows lantern-specific tutorial elements and hides others
            triggerSpecialTutorial(this, 3);
        }
    }

    // razors
    for (let i = 0, len = this.razors.length; i < len; i++) {
        const r = this.razors[i]!;
        r.update(delta);
        this.cut(r, Vector.zero, Vector.zero, false);
    }

    // spikes
    const starSpikeRadius = resolution.STAR_SPIKE_RADIUS;

    for (let i = 0, len = this.spikes.length; i < len; i++) {
        const s = this.spikes[i]!;

        // only update if something happens
        if (s.mover || s.shouldUpdateRotation || s.electro) {
            s.update(delta);
        }

        if (this.isCandyInLantern) {
            continue;
        }

        if (!s.electro || s.electroOn) {
            let candyHits = false;
            let left = false;
            if (this.twoParts !== GameSceneConstants.PartsType.NONE) {
                candyHits = !this.noCandyL && isCandyHit(s, this.starL, starSpikeRadius);
                if (candyHits) {
                    left = true;
                } else {
                    candyHits = !this.noCandyR && isCandyHit(s, this.starR, starSpikeRadius);
                }
            } else {
                candyHits = !this.noCandy && isCandyHit(s, this.star, starSpikeRadius);
            }

            if (candyHits) {
                if (this.twoParts !== GameSceneConstants.PartsType.NONE) {
                    if (left) {
                        if (this.candyBubbleL) {
                            this.popCandyBubble(true);
                        }
                    } else if (this.candyBubbleR) {
                        this.popCandyBubble(false);
                    }
                } else if (this.candyBubble) {
                    this.popCandyBubble(false);
                }

                const candyTexture = ResourceMgr.getTexture(this.candyResourceId);
                if (candyTexture) {
                    const breakEffect = new CandyBreak(5, candyTexture, {
                        resourceId: this.candyResourceId,
                    });
                    if (this.gravityButton && !this.gravityNormal) {
                        breakEffect.gravity.y = -500;
                        breakEffect.angle = 90;
                    }

                    breakEffect.onFinished = this.aniPool.particlesFinishedDelegate();

                    if (this.twoParts !== GameSceneConstants.PartsType.NONE) {
                        if (left) {
                            breakEffect.x = this.candyL.x;
                            breakEffect.y = this.candyL.y;
                        } else {
                            breakEffect.x = this.candyR.x;
                            breakEffect.y = this.candyR.y;
                        }
                    } else {
                        breakEffect.x = this.candy.x;
                        breakEffect.y = this.candy.y;
                    }

                    breakEffect.startSystem(5);
                    this.aniPool.addChild(breakEffect);
                }

                if (this.twoParts !== GameSceneConstants.PartsType.NONE) {
                    if (left) {
                        this.noCandyL = true;
                    } else {
                        this.noCandyR = true;
                    }
                } else {
                    this.noCandy = true;
                }
                SoundMgr.playSound(ResourceId.SND_CANDY_BREAK);
                this.releaseAllRopes(left);

                if (this.restartState !== GameSceneConstants.RestartState.FADE_IN) {
                    this.dd.callObject(this, this.gameLost, null, 0.3);
                }

                return false;
            }
        }
    }

    // bouncers
    const bouncerRadius = resolution.BOUNCER_RADIUS;

    for (let i = 0, len = this.bouncers.length; i < len; i++) {
        const bouncer = this.bouncers[i]!;
        bouncer.update(delta);
        bouncer.updateRotation();

        let candyHits = false;
        let left = false;
        if (this.twoParts !== GameSceneConstants.PartsType.NONE) {
            candyHits = !this.noCandyL && isCandyHit(bouncer, this.starL, bouncerRadius);
            if (candyHits) {
                left = true;
            } else {
                candyHits = !this.noCandyR && isCandyHit(bouncer, this.starR, bouncerRadius);
            }
        } else {
            candyHits = !this.noCandy && isCandyHit(bouncer, this.star, bouncerRadius);
        }

        if (candyHits) {
            if (this.twoParts !== GameSceneConstants.PartsType.NONE) {
                if (left) {
                    this.handleBounce(bouncer, this.starL, delta);
                } else {
                    this.handleBounce(bouncer, this.starR, delta);
                }
            } else {
                this.handleBounce(bouncer, this.star, delta);
            }
        }

        let bulbHits = false;
        if (this.lightbulbs.length > 0) {
            for (const bulb of this.lightbulbs) {
                if (!bulb || bulb.attachedSock != null) {
                    continue;
                }
                if (isCandyHit(bouncer, bulb.constraint, bouncerRadius)) {
                    this.handleBounce(bouncer, bulb.constraint, delta);
                    bulbHits = true;
                }
            }
        }

        if (candyHits) {
            break; // stop after hit
        } else if (!bulbHits) {
            bouncer.skip = 0;
        }
    }

    // apply force to bubbles
    const gravityMultiplier = this.gravityButton && !this.gravityNormal ? -1 : 1;
    const yImpulse = resolution.BUBBLE_IMPULSE_Y * gravityMultiplier;
    const rd = resolution.BUBBLE_IMPULSE_RD;

    // apply candy impulse
    if (this.twoParts === GameSceneConstants.PartsType.SEPARATE) {
        if (this.candyBubbleL) {
            applyStarImpulse(this.starL, rd, yImpulse, delta);
        }
        if (this.candyBubbleR) {
            applyStarImpulse(this.starR, rd, yImpulse, delta);
        }
    }
    if (this.twoParts === GameSceneConstants.PartsType.DISTANCE) {
        if (this.candyBubbleL || this.candyBubbleR) {
            applyStarImpulse(this.starL, rd, yImpulse, delta);
            applyStarImpulse(this.starR, rd, yImpulse, delta);
        }
    } else if (this.candyBubble) {
        applyStarImpulse(this.star, rd, yImpulse, delta);
    }

    if (this.lightbulbs.length > 0) {
        for (const bulb of this.lightbulbs) {
            if (!bulb || bulb.attachedSock != null || !bulb.capturingBubble) {
                continue;
            }
            applyStarImpulse(bulb.constraint, rd, yImpulse, delta);
        }
    }

    return true;
}
