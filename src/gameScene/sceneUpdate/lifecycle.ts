import * as GameSceneConstants from "@/gameScene/constants";
import Constants from "@/utils/Constants";
import KeyFrame from "@/visual/KeyFrame";
import PubSub from "@/utils/PubSub";
import RGBAColor from "@/core/RGBAColor";
import ResourceId from "@/resources/ResourceId";
import SoundMgr from "@/game/CTRSoundMgr";
import Timeline from "@/visual/Timeline";
import settings from "@/game/CTRSettings";
import type { GameScene } from "@/types/game-scene";

function animateLevelRestart(scene: GameScene): void {
    scene.restartState = GameSceneConstants.RestartState.FADE_IN;
    scene.dimTime = Constants.DIM_TIMEOUT;
}

function isFadingIn(scene: GameScene): boolean {
    return scene.restartState === GameSceneConstants.RestartState.FADE_IN;
}

function calculateScore(scene: GameScene): void {
    scene.timeBonus = Math.max(0, 30 - scene.time) * 100;
    scene.timeBonus /= 10;
    scene.timeBonus *= 10;
    scene.starBonus = 1000 * scene.starsCollected;
    scene.score = Math.ceil(scene.timeBonus + scene.starBonus);
}

function gameWon(scene: GameScene): void {
    scene.dd.cancelAllDispatches();

    scene.target.playTimeline(GameSceneConstants.CharAnimation.WIN);
    SoundMgr.playSound(ResourceId.SND_MONSTER_CHEWING);

    if (scene.candyBubble) {
        scene.popCandyBubble(false);
    }

    scene.noCandy = true;

    // Make mouse retreat after winning
    if (scene.miceManager) {
        if (scene.miceManager.activeMouse) {
            scene.miceManager.activeMouse.beginRetreat();
        }
        scene.miceManager.lockActiveMouse();
    }

    scene.candy.passTransformationsToChilds = true;
    scene.candyMain.scaleX = 1;
    scene.candyMain.scaleY = 1;
    scene.candyTop.scaleX = 1;
    scene.candyTop.scaleY = 1;

    const tl = new Timeline();
    tl.addKeyFrame(
        KeyFrame.makePos(scene.candy.x, scene.candy.y, KeyFrame.TransitionType.LINEAR, 0)
    );
    tl.addKeyFrame(
        KeyFrame.makePos(scene.target.x, scene.target.y + 10, KeyFrame.TransitionType.LINEAR, 0.1)
    );
    tl.addKeyFrame(KeyFrame.makeScale(0.71, 0.71, KeyFrame.TransitionType.LINEAR, 0));
    tl.addKeyFrame(KeyFrame.makeScale(0, 0, KeyFrame.TransitionType.LINEAR, 0.1));
    tl.addKeyFrame(
        KeyFrame.makeColor(RGBAColor.solidOpaque.copy(), KeyFrame.TransitionType.LINEAR, 0)
    );
    tl.addKeyFrame(
        KeyFrame.makeColor(RGBAColor.transparent.copy(), KeyFrame.TransitionType.LINEAR, 0.1)
    );
    scene.candy.addTimelineWithID(tl, 0);
    scene.candy.playTimeline(0);
    tl.onFinished = scene.aniPool.timelineFinishedDelegate();
    scene.aniPool.addChild(scene.candy);

    scene.calculateScore();
    scene.releaseAllRopes(false);

    const onLevelWonAppCallback = () => {
        PubSub.publish(PubSub.ChannelId.LevelWon, {
            stars: scene.starsCollected,
            time: scene.time,
            score: scene.score,
            fps: 1 / scene.gameController.avgDelta,
        });
    };

    // the closing doors animation takes 850ms so we want it to
    // finish before the game level deactivates (and freezes)
    if (settings.showMenu) {
        scene.dd.callObject(scene, onLevelWonAppCallback, null, 1);
    }

    // stop the electro after 1.5 seconds
    scene.dd.callObject(
        scene,
        () => {
            // stop the electro spikes sound from looping
            SoundMgr.stopSound(ResourceId.SND_ELECTRIC);
        },
        null,
        1.5
    );

    // fire level won callback after 2 secs
    const onLevelWon = () => {
        scene.gameController.onLevelWon.call(scene.gameController);
    };
    scene.dd.callObject(scene, onLevelWon, null, 1.8);
}

function gameLost(scene: GameScene): void {
    if (scene.gameLostTriggered) {
        return;
    }
    scene.gameLostTriggered = true;

    scene.dd.cancelAllDispatches();
    if (scene.sleepAnimPrimary) {
        scene.sleepAnimPrimary.visible = false;
        scene.sleepAnimPrimary.getTimeline(0)?.stop();
    }
    if (scene.sleepAnimSecondary) {
        scene.sleepAnimSecondary.visible = false;
        scene.sleepAnimSecondary.getTimeline(0)?.stop();
    }
    scene.target.playTimeline(GameSceneConstants.CharAnimation.FAIL);
    SoundMgr.playSound(ResourceId.SND_MONSTER_SAD);

    // fire level lost callback after 1 sec
    const onLevelLost = () => {
        scene.gameController.onLevelLost.call(scene.gameController);
        PubSub.publish(PubSub.ChannelId.LevelLost, { time: scene.time });
    };
    scene.dd.callObject(scene, onLevelLost, null, 1);

    // Make mouse retreat
    if (scene.miceManager) {
        if (scene.miceManager.activeMouse) {
            scene.miceManager.activeMouse.beginRetreat();
        }
        scene.miceManager.lockActiveMouse();
    }
}

class GameSceneLifecycleDelegate {
    private readonly scene: GameScene;

    constructor(scene: GameScene) {
        this.scene = scene;
    }

    animateLevelRestart(): void {
        return animateLevelRestart(this.scene);
    }

    isFadingIn(): boolean {
        return isFadingIn(this.scene);
    }

    calculateScore(): void {
        return calculateScore(this.scene);
    }

    gameWon(): void {
        return gameWon(this.scene);
    }

    gameLost(): void {
        return gameLost(this.scene);
    }
}

export default GameSceneLifecycleDelegate;
