import Constants from "@/utils/Constants";
import Gravity from "@/physics/Gravity";
import * as GameSceneConstants from "@/gameScene/constants";
import type GameSceneInit from "../init";

export function initPostLoad(this: GameSceneInit): void {
    for (const circle of this.rotatedCircles) {
        circle.operating = Constants.UNDEFINED;
        circle.circles = this.rotatedCircles;
    }

    this.startCamera();

    this.conveyors.attachItems(this.stars);
    this.conveyors.attachItems(this.socks);
    this.conveyors.attachItems(this.bubbles);
    this.conveyors.attachItems(this.tubes);
    this.conveyors.attachItems(this.pumps);
    this.conveyors.attachItems(this.bouncers);
    this.conveyors.sortBelts();

    this.tummyTeasers = 0;

    this.starsCollected = 0;
    this.candyBubble = null;
    this.candyBubbleL = null;
    this.candyBubbleR = null;

    this.mouthOpen = false;
    this.noCandy = this.twoParts !== GameSceneConstants.PartsType.NONE;
    this.noCandyL = false;
    this.noCandyR = false;
    this.blink.playTimeline(0);
    this.spiderTookCandy = false;
    this.time = 0;
    this.score = 0;

    this.gravityNormal = true;
    Gravity.reset();

    this.dimTime = 0;

    this.ropesCutAtOnce = 0;
    this.ropesAtOnceTimer = 0;

    // delay start candy blink
    this.dd.callObject(this, this.doCandyBlink, null, 1);
}
