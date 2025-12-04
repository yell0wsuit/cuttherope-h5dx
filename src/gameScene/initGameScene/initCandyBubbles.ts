import Animation from "@/visual/Animation";
import Alignment from "@/core/Alignment";
import ResourceId from "@/resources/ResourceId";
import Timeline from "@/visual/Timeline";
import * as GameSceneConstants from "@/gameScene/constants";
import CandyInGhostBubbleAnimation from "@/game/CandyInGhostBubbleAnimation";
import type GameSceneInit from "../init";

export function initCandyBubbles(this: GameSceneInit): void {
    // add the animations for the bubbles
    if (this.twoParts !== GameSceneConstants.PartsType.NONE) {
        this.candyBubbleAnimationL = new Animation();
        this.candyBubbleAnimationL.initTextureWithId(ResourceId.IMG_OBJ_BUBBLE_FLIGHT);
        this.candyBubbleAnimationL.parentAnchor = this.candyBubbleAnimationL.anchor =
            Alignment.CENTER;
        this.candyBubbleAnimationL.addAnimationDelay(
            0.05,
            Timeline.LoopType.REPLAY,
            GameSceneConstants.IMG_OBJ_BUBBLE_FLIGHT_Frame_1,
            GameSceneConstants.IMG_OBJ_BUBBLE_FLIGHT_Frame_13
        );
        this.candyBubbleAnimationL.playTimeline(0);
        this.candyL.addChild(this.candyBubbleAnimationL);
        this.candyBubbleAnimationL.visible = false;
        (this.candyBubbleAnimationL as Animation & { drawPosIncrement?: number }).drawPosIncrement =
            0.0001;

        this.candyBubbleAnimationR = new Animation();
        this.candyBubbleAnimationR.initTextureWithId(ResourceId.IMG_OBJ_BUBBLE_FLIGHT);
        this.candyBubbleAnimationR.parentAnchor = this.candyBubbleAnimationR.anchor =
            Alignment.CENTER;
        this.candyBubbleAnimationR.addAnimationDelay(
            0.05,
            Timeline.LoopType.REPLAY,
            GameSceneConstants.IMG_OBJ_BUBBLE_FLIGHT_Frame_1,
            GameSceneConstants.IMG_OBJ_BUBBLE_FLIGHT_Frame_13
        );
        this.candyBubbleAnimationR.playTimeline(0);
        this.candyR.addChild(this.candyBubbleAnimationR);
        this.candyBubbleAnimationR.visible = false;
        (this.candyBubbleAnimationR as Animation & { drawPosIncrement?: number }).drawPosIncrement =
            0.0001;

        // Create ghost bubble animations for left and right
        this.candyGhostBubbleAnimationL = new CandyInGhostBubbleAnimation().initWithResId(
            ResourceId.IMG_OBJ_BUBBLE_FLIGHT
        );
        this.candyL.addChild(this.candyGhostBubbleAnimationL);

        this.candyGhostBubbleAnimationR = new CandyInGhostBubbleAnimation().initWithResId(
            ResourceId.IMG_OBJ_BUBBLE_FLIGHT
        );
        this.candyR.addChild(this.candyGhostBubbleAnimationR);
    } else {
        // Create ghost bubble animation for single candy
        this.candyGhostBubbleAnimation = new CandyInGhostBubbleAnimation().initWithResId(
            ResourceId.IMG_OBJ_BUBBLE_FLIGHT
        );
        this.candy.addChild(this.candyGhostBubbleAnimation);
    }
}
