import GameObject from "@/visual/GameObject";
import Mover from "@/utils/Mover";
import SoundMgr from "@/game/CTRSoundMgr";
import Vector from "@/core/Vector";
import resolution from "@/resolution";
import * as GameSceneConstants from "@/gameScene/constants";
import ResourceId from "@/resources/ResourceId";
import type { GameScene } from "@/types/game-scene";

export function updateTargetState(this: GameScene, delta: number): boolean {
    let targetVector: Vector | undefined;
    if (!this.noCandy) {
        const mouthOpenRadius = resolution.MOUTH_OPEN_RADIUS;
        if (!this.mouthOpen) {
            targetVector = new Vector(this.target.x, this.target.y);
            if (!this.isCandyInLantern && this.star.pos.distance(targetVector) < mouthOpenRadius) {
                this.mouthOpen = true;
                this.target.playTimeline(GameSceneConstants.CharAnimation.MOUTH_OPEN);
                SoundMgr.playSound(ResourceId.SND_MONSTER_OPEN);
                this.mouthCloseTimer = GameSceneConstants.MOUTH_OPEN_TIME;
            }
        } else if (this.mouthCloseTimer > 0) {
            this.mouthCloseTimer = Mover.moveToTarget(this.mouthCloseTimer, 0, 1, delta);

            if (this.mouthCloseTimer <= 0) {
                targetVector = new Vector(this.target.x, this.target.y);
                if (
                    this.isCandyInLantern ||
                    this.star.pos.distance(targetVector) > mouthOpenRadius
                ) {
                    this.mouthOpen = false;
                    this.target.playTimeline(GameSceneConstants.CharAnimation.MOUTH_CLOSE);
                    SoundMgr.playSound(ResourceId.SND_MONSTER_CLOSE);
                } else {
                    this.mouthCloseTimer = GameSceneConstants.MOUTH_OPEN_TIME;
                }
            }
        }

        if (this.restartState !== GameSceneConstants.RestartState.FADE_IN) {
            const candyIntersectingTarget = GameObject.intersect(this.candy, this.target) ?? false;
            if (candyIntersectingTarget) {
                this.gameWon();
                return false;
            }
        }
    }

    const outOfScreen =
        this.twoParts === GameSceneConstants.PartsType.NONE &&
        this.pointOutOfScreen(this.star) &&
        !this.noCandy;
    const outOfScreenL =
        this.twoParts !== GameSceneConstants.PartsType.NONE &&
        this.pointOutOfScreen(this.starL) &&
        !this.noCandyL;
    const outOfScreenR =
        this.twoParts !== GameSceneConstants.PartsType.NONE &&
        this.pointOutOfScreen(this.starR) &&
        !this.noCandyR;

    if (outOfScreen || outOfScreenL || outOfScreenR) {
        if (outOfScreen) {
            this.noCandy = true;
        }
        if (outOfScreenL) {
            this.noCandyL = true;
        }
        if (outOfScreenR) {
            this.noCandyR = true;
        }

        if (this.restartState !== GameSceneConstants.RestartState.FADE_IN) {
            if (
                this.twoParts !== GameSceneConstants.PartsType.NONE &&
                this.noCandyL &&
                this.noCandyR
            ) {
                return false;
            }
            this.gameLost();
            return false;
        }
    }

    return true;
}
