import GameObject from "@/visual/GameObject";
import Animation from "@/visual/Animation";
import Alignment from "@/core/Alignment";
import Rectangle from "@/core/Rectangle";
import ResourceId from "@/resources/ResourceId";
import Timeline from "@/visual/Timeline";
import KeyFrame from "@/visual/KeyFrame";
import RGBAColor from "@/core/RGBAColor";
import resolution from "@/resolution";
import * as GameSceneConstants from "@/gameScene/constants";
import type GameSceneInit from "../init";

export function initCandy(this: GameSceneInit): void {
    // candy
    const candyResourceId = this.getCandyResourceId();
    const candyFxResourceId = this.getCandyFxResourceId();
    const constants = this.getCandyConstants();

    this.candyResourceId = candyResourceId;
    this.candy = new GameObject();
    this.candy.initTextureWithId(candyResourceId);
    this.candy.setTextureQuad(constants.candy_bottom);
    this.candy.doRestoreCutTransparency();
    this.candy.anchor = Alignment.CENTER;
    this.candy.bb = Rectangle.copy(resolution.CANDY_BB);
    this.candy.passTransformationsToChilds = false;
    this.candy.scaleX = this.candy.scaleY = 0.71;
    this.candy.drawPosIncrement = 0.0001;

    // candy main
    this.candyMain = new GameObject();
    this.candyMain.initTextureWithId(candyResourceId);
    this.candyMain.setTextureQuad(constants.candy_main);
    this.candyMain.doRestoreCutTransparency();
    this.candyMain.anchor = this.candyMain.parentAnchor = Alignment.CENTER;
    this.candy.addChild(this.candyMain);
    this.candyMain.scaleX = this.candyMain.scaleY = 0.71;
    this.candyMain.drawPosIncrement = 0.0001;

    // candy top
    this.candyTop = new GameObject();
    this.candyTop.initTextureWithId(candyResourceId);
    this.candyTop.setTextureQuad(constants.candy_top);
    this.candyTop.doRestoreCutTransparency();
    this.candyTop.anchor = this.candyTop.parentAnchor = Alignment.CENTER;
    this.candy.addChild(this.candyTop);
    this.candyTop.scaleX = this.candyTop.scaleY = 0.71;
    this.candyTop.drawPosIncrement = 0.0001;

    // candy blink
    this.candyBlink = new Animation();
    this.candyBlink.initTextureWithId(candyFxResourceId);
    this.candyBlink.doRestoreCutTransparency();
    this.candyBlink.addAnimationEndpoints(
        GameSceneConstants.CandyBlink.INITIAL,
        0.07,
        Timeline.LoopType.NO_LOOP,
        constants.highlight_start,
        constants.highlight_end
    );
    const initialTimeline = this.candyBlink.getTimeline(GameSceneConstants.CandyBlink.INITIAL);
    if (initialTimeline) {
        initialTimeline.onFinished = () => {
            this.candyBlink.stopCurrentTimeline();
        };
    }
    this.candyBlink.addAnimationSequence(
        GameSceneConstants.CandyBlink.STAR,
        0.3, // delay
        Timeline.LoopType.NO_LOOP,
        2, // count
        [constants.glow, constants.glow]
    );
    const gt = this.candyBlink.getTimeline(GameSceneConstants.CandyBlink.STAR);
    if (gt) {
        gt.addKeyFrame(
            KeyFrame.makeColor(RGBAColor.solidOpaque.copy(), KeyFrame.TransitionType.LINEAR, 0)
        );
        gt.addKeyFrame(
            KeyFrame.makeColor(RGBAColor.transparent.copy(), KeyFrame.TransitionType.LINEAR, 0.2)
        );
    }
    this.candyBlink.visible = false;
    this.candyBlink.anchor = this.candyBlink.parentAnchor = Alignment.CENTER;
    this.candyBlink.scaleX = this.candyBlink.scaleY = 0.71;
    this.candy.addChild(this.candyBlink);
    (this.candyBlink as Animation & { drawPosIncrement?: number }).drawPosIncrement = 0.0001;

    // candy bubble
    this.candyBubbleAnimation = new Animation();
    this.candyBubbleAnimation.initTextureWithId(ResourceId.IMG_OBJ_BUBBLE_FLIGHT);
    this.candyBubbleAnimation.x = this.candy.x;
    this.candyBubbleAnimation.y = this.candy.y;
    this.candyBubbleAnimation.parentAnchor = this.candyBubbleAnimation.anchor = Alignment.CENTER;
    this.candyBubbleAnimation.addAnimationDelay(
        0.05,
        Timeline.LoopType.REPLAY,
        GameSceneConstants.IMG_OBJ_BUBBLE_FLIGHT_Frame_1,
        GameSceneConstants.IMG_OBJ_BUBBLE_FLIGHT_Frame_13
    );
    this.candyBubbleAnimation.playTimeline(0);
    this.candy.addChild(this.candyBubbleAnimation);
    this.candyBubbleAnimation.visible = false;
    (this.candyBubbleAnimation as Animation & { drawPosIncrement?: number }).drawPosIncrement =
        0.0001;
}
