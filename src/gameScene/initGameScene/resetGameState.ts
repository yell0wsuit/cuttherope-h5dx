import Constants from "@/utils/Constants";
import ResourceId from "@/resources/ResourceId";
import SoundMgr from "@/game/CTRSoundMgr";
import ConstrainedPoint from "@/physics/ConstrainedPoint";
import * as GameSceneConstants from "@/gameScene/constants";
import type GameSceneInit from "../init";
import Lantern from "@/game/Lantern";

export function resetGameState(this: GameSceneInit): void {
    this.gravityButton = null;
    this.gravityTouchDown = Constants.UNDEFINED;

    this.twoParts = GameSceneConstants.PartsType.NONE;
    this.partsDist = 0;

    this.targetSock = null;

    SoundMgr.stopSound(ResourceId.SND_ELECTRIC);

    for (const ghost of this.ghosts) {
        ghost?.destroy();
    }

    this.bungees = [];
    this.razors = [];
    this.spikes = [];
    this.stars = [];
    this.bubbles = [];
    this.tubes = [];
    this.pumps = [];
    this.lanterns = [];
    this.rockets = [];
    this.socks = [];
    this.ghosts = [];
    this.tutorialImages = [];
    this.tutorials = [];
    this.drawings = [];
    this.bouncers = [];
    this.rotatedCircles = [];
    this.pollenDrawer = null;

    this.star = new ConstrainedPoint();
    this.star.setWeight(1);
    this.starL = new ConstrainedPoint();
    this.starL.setWeight(1);
    this.starR = new ConstrainedPoint();
    this.starR.setWeight(1);
    this.isCandyInLantern = false;
    Lantern.removeAllLanterns();
}
