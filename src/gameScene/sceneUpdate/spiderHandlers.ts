import Alignment from "@/core/Alignment";
import ImageElement from "@/visual/ImageElement";
import KeyFrame from "@/visual/KeyFrame";
import MathHelper from "@/utils/MathHelper";
import ResourceId from "@/resources/ResourceId";
import SoundMgr from "@/game/CTRSoundMgr";
import Timeline from "@/visual/Timeline";
import * as GameSceneConstants from "@/gameScene/constants";
import resolution from "@/resolution";
import Constants from "@/utils/Constants";
import RGBAColor from "@/core/RGBAColor";
import Grab from "@/game/Grab";
import type { GameScene } from "@/types/game-scene";
import type Animation from "@/visual/Animation";

function spiderBusted(scene: GameScene, grab: Grab): void {
    SoundMgr.playSound(ResourceId.SND_SPIDER_FALL);
    grab.hasSpider = false;

    const spider = grab.spider;
    if (!spider) {
        return;
    }

    const bustedSpider = ImageElement.create(
        ResourceId.IMG_OBJ_SPIDER,
        GameSceneConstants.IMG_OBJ_SPIDER_busted
    );
    bustedSpider.doRestoreCutTransparency();

    const timeline = new Timeline();
    if (scene.gravityButton && !scene.gravityNormal) {
        timeline.addKeyFrame(
            KeyFrame.makePos(spider.x, spider.y, KeyFrame.TransitionType.EASE_OUT, 0)
        );
        timeline.addKeyFrame(
            KeyFrame.makePos(spider.x, spider.y + 50, KeyFrame.TransitionType.EASE_OUT, 0.3)
        );
        timeline.addKeyFrame(
            KeyFrame.makePos(
                spider.x,
                spider.y - resolution.CANVAS_HEIGHT,
                KeyFrame.TransitionType.EASE_IN,
                1
            )
        );
    } else {
        timeline.addKeyFrame(
            KeyFrame.makePos(spider.x, spider.y, KeyFrame.TransitionType.EASE_OUT, 0)
        );
        timeline.addKeyFrame(
            KeyFrame.makePos(spider.x, spider.y - 50, KeyFrame.TransitionType.EASE_OUT, 0.3)
        );
        timeline.addKeyFrame(
            KeyFrame.makePos(
                spider.x,
                spider.y + resolution.CANVAS_HEIGHT,
                KeyFrame.TransitionType.EASE_IN,
                1
            )
        );
    }

    timeline.addKeyFrame(KeyFrame.makeRotation(0, 0, 0));
    timeline.addKeyFrame(KeyFrame.makeRotation(MathHelper.randomRange(-120, 120), 0, 1));

    bustedSpider.addTimelineWithID(timeline, 0);
    bustedSpider.playTimeline(0);
    bustedSpider.x = spider.x;
    bustedSpider.y = spider.y;
    bustedSpider.anchor = Alignment.CENTER;

    timeline.onFinished = scene.aniPool.timelineFinishedDelegate();
    scene.aniPool.addChild(bustedSpider);

    grab.spider = null;
}

function detachCandyFromRope(scene: GameScene, grab: Grab, ropeSpider: Animation | null): void {
    const rope = grab.rope;
    if (!rope || rope.tail !== scene.star) {
        return;
    }

    if (rope.cut !== Constants.UNDEFINED) {
        grab.destroyRope();
    } else {
        rope.setCut(rope.parts.length - 2);
        scene.detachCandy();
        rope.forceWhite = false;
    }

    if (grab.hasSpider && grab.spiderActive && ropeSpider !== grab.spider) {
        scene.spiderBusted(grab);
    }

    if (grab.gun && grab.gunCup?.color.equals(RGBAColor.solidOpaque)) {
        grab.gunCup.playTimeline(Grab.GunCup.DROP_AND_HIDE);
    }
}

function spiderWon(scene: GameScene, grab: Grab): void {
    SoundMgr.playSound(ResourceId.SND_SPIDER_WIN);

    const spider = grab.spider;
    if (!spider) {
        return;
    }

    for (const otherGrab of scene.bungees) {
        detachCandyFromRope(scene, otherGrab, spider);
    }

    grab.hasSpider = false;
    scene.spiderTookCandy = true;
    scene.noCandy = true;

    const stealingSpider = ImageElement.create(
        ResourceId.IMG_OBJ_SPIDER,
        GameSceneConstants.IMG_OBJ_SPIDER_stealing
    );
    stealingSpider.doRestoreCutTransparency();

    scene.candy.anchor = scene.candy.parentAnchor = Alignment.CENTER;
    scene.candy.x = 0;
    scene.candy.y = -5;

    stealingSpider.addChild(scene.candy);

    const timeline = new Timeline();
    if (scene.gravityButton && !scene.gravityNormal) {
        timeline.addKeyFrame(
            KeyFrame.makePos(spider.x, spider.y - 10, KeyFrame.TransitionType.EASE_OUT, 0)
        );
        timeline.addKeyFrame(
            KeyFrame.makePos(spider.x, spider.y + 70, KeyFrame.TransitionType.EASE_OUT, 0.3)
        );
        timeline.addKeyFrame(
            KeyFrame.makePos(
                spider.x,
                spider.y - resolution.CANVAS_HEIGHT,
                KeyFrame.TransitionType.EASE_IN,
                1
            )
        );
    } else {
        timeline.addKeyFrame(
            KeyFrame.makePos(spider.x, spider.y - 10, KeyFrame.TransitionType.EASE_OUT, 0)
        );
        timeline.addKeyFrame(
            KeyFrame.makePos(spider.x, spider.y - 70, KeyFrame.TransitionType.EASE_OUT, 0.3)
        );
        timeline.addKeyFrame(
            KeyFrame.makePos(
                spider.x,
                spider.y + resolution.CANVAS_HEIGHT,
                KeyFrame.TransitionType.EASE_IN,
                1
            )
        );
    }

    stealingSpider.addTimelineWithID(timeline, 0);
    stealingSpider.playTimeline(0);
    stealingSpider.x = spider.x;
    stealingSpider.y = spider.y - 10;
    stealingSpider.anchor = Alignment.CENTER;

    timeline.onFinished = scene.aniPool.timelineFinishedDelegate();
    scene.aniPool.addChild(stealingSpider);

    if (scene.restartState !== GameSceneConstants.RestartState.FADE_IN) {
        scene.dd.callObject(scene, scene.gameLost, null, 2);
    }
}

class GameSceneSpiderHandlersDelegate {
    private readonly scene: GameScene;

    constructor(scene: GameScene) {
        this.scene = scene;
    }

    spiderBusted(grab: Grab): void {
        spiderBusted(this.scene, grab);
    }

    spiderWon(grab: Grab): void {
        spiderWon(this.scene, grab);
    }
}

export default GameSceneSpiderHandlersDelegate;
