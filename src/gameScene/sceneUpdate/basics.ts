import * as GameSceneConstants from "@/gameScene/constants";
import Constants from "@/utils/Constants";
import Mover from "@/utils/Mover";
import BaseElement from "@/visual/BaseElement";
import { updateLightBulbPhysics, updateNightLevel } from "./nightLevel";
import type { FingerCutTrail, GameScene } from "@/types/game-scene";

type FadingFingerCut = FingerCutTrail[number];

export function updateBasics(this: GameScene, delta: number): void {
    for (const drawing of this.drawings) {
        drawing.update(delta);
    }

    // Call parent class's update method
    BaseElement.prototype.update.call(this, delta);
    this.dd.update(delta);

    if (this.pollenDrawer) {
        this.pollenDrawer.update(delta);
    }

    for (let i = 0; i < Constants.MAX_TOUCHES; i++) {
        const cuts = this.fingerCuts[i];
        if (!cuts) {
            continue;
        }

        let numCuts = cuts.length;
        let k = 0;

        while (k < numCuts) {
            const fc: FadingFingerCut | undefined = cuts[k];
            if (!fc) {
                k++;
                continue;
            }

            const moveResult = Mover.moveToTargetWithStatus(fc.color.a, 0, 10, delta);
            fc.color.a = moveResult.value;
            if (moveResult.reachedZero) {
                cuts.splice(k, 1);
                numCuts--;
            } else {
                k++;
            }
        }
    }

    for (const earthAnimation of this.earthAnims) {
        earthAnimation.update(delta);
    }

    this.ropesAtOnceTimer = Mover.moveToTarget(this.ropesAtOnceTimer, 0, 1, delta);

    if (this.attachCount === 0) {
        this.juggleTimer += delta;

        // has it been 30 secs since the candy was attached?
        if (this.juggleTimer > GameSceneConstants.CANDY_JUGGLER_TIME) {
            //Achievements.increment(AchievementId.CANDY_JUGGLER);
            // reset the timer
            this.juggleTimer = 0;
        }
    }

    updateLightBulbPhysics(this, delta);
    updateNightLevel.call(this, delta);

    if (delta > 0) {
        let remaining = delta;
        while (remaining > 0) {
            const step = Math.min(0.01, remaining);
            this.conveyors.update(step);
            this.conveyors.processItems(this.bubbles);
            this.conveyors.processItems(this.stars);
            this.conveyors.processItems(this.bouncers);
            this.conveyors.processItems(this.socks);
            this.conveyors.processItems(this.tubes);
            this.conveyors.processItems(this.pumps);
            remaining -= step;
        }
    }
}
