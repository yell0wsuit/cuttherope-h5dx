import Constants from "@/utils/Constants";
import RGBAColor from "@/core/RGBAColor";
import Grab from "@/game/Grab";
import type { GameScene } from "@/types/game-scene";

function releaseAllRopes(scene: GameScene, left: boolean): void {
    for (const grab of scene.bungees) {
        const rope = grab.rope;

        if (
            rope &&
            (rope.tail === scene.star ||
                (rope.tail === scene.starL && left) ||
                (rope.tail === scene.starR && !left))
        ) {
            if (rope.cut === Constants.UNDEFINED) {
                rope.setCut(rope.parts.length - 2);
                scene.detachCandy();
            } else {
                rope.hideTailParts = true;
            }

            if (grab.hasSpider && grab.spiderActive) {
                scene.spiderBusted(grab);
            }

            if (grab.gun && grab.gunCup?.color.equals(RGBAColor.solidOpaque)) {
                grab.gunCup.playTimeline(Grab.GunCup.DROP_AND_HIDE);
            }
        }
    }
}

function attachCandy(scene: GameScene): void {
    scene.attachCount += 1;
}

function detachCandy(scene: GameScene): void {
    scene.attachCount -= 1;
    scene.juggleTimer = 0;
}

class GameSceneRopeManagementDelegate {
    private readonly scene: GameScene;

    constructor(scene: GameScene) {
        this.scene = scene;
    }

    releaseAllRopes(left: boolean): void {
        releaseAllRopes(this.scene, left);
    }

    attachCandy(): void {
        attachCandy(this.scene);
    }

    detachCandy(): void {
        detachCandy(this.scene);
    }
}

export default GameSceneRopeManagementDelegate;
