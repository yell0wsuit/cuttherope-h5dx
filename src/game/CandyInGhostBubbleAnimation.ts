import Alignment from "@/core/Alignment";
import Animation from "@/visual/Animation";
import ImageElement from "@/visual/ImageElement";
import KeyFrame from "@/visual/KeyFrame";
import Timeline from "@/visual/Timeline";
import * as GameSceneConstants from "@/gameScene/constants";
import ResourceId from "@/resources/ResourceId";

type Transition = (typeof KeyFrame.TransitionType)[keyof typeof KeyFrame.TransitionType];

class CandyInGhostBubbleAnimation extends Animation {
    initWithResId(resId: number): this {
        this.initTextureWithId(resId);
        this.parentAnchor = this.anchor = Alignment.CENTER;
        this.addAnimationDelay(
            0.05,
            Timeline.LoopType.REPLAY,
            GameSceneConstants.IMG_OBJ_BUBBLE_FLIGHT_Frame_1,
            GameSceneConstants.IMG_OBJ_BUBBLE_FLIGHT_Frame_13
        );
        this.visible = false;
        this.addSupportingCloudsTimelines();
        this.playTimeline(0);
        return this;
    }

    addSupportingCloudsTimelines(): void {
        // Cloud quad 6 - right
        this.createPulsingCloud(6, this.x + 63.75, this.y + 18.75, [
            {
                scale: 0.8,
                dx: 1,
                dy: 1,
                transition: KeyFrame.TransitionType.IMMEDIATE,
                duration: 0,
            },
            {
                scale: 0.78,
                dx: 0,
                dy: 0,
                transition: KeyFrame.TransitionType.EASE_IN,
                duration: 0.48,
            },
            {
                scale: 0.76,
                dx: -1,
                dy: -1,
                transition: KeyFrame.TransitionType.EASE_OUT,
                duration: 0.48,
            },
            {
                scale: 0.78,
                dx: 0,
                dy: 0,
                transition: KeyFrame.TransitionType.EASE_IN,
                duration: 0.48,
            },
            {
                scale: 0.8,
                dx: 1,
                dy: 1,
                transition: KeyFrame.TransitionType.EASE_OUT,
                duration: 0.48,
            },
        ]);

        // Cloud quad 5 - right bottom
        this.createPulsingCloud(5, this.x + 48.75, this.y + 41.25, [
            {
                scale: 0.93,
                dx: 1,
                dy: 1,
                transition: KeyFrame.TransitionType.IMMEDIATE,
                duration: 0,
            },
            {
                scale: 0.965,
                dx: 0,
                dy: 0,
                transition: KeyFrame.TransitionType.EASE_IN,
                duration: 0.4,
            },
            {
                scale: 1,
                dx: -1,
                dy: -1,
                transition: KeyFrame.TransitionType.EASE_OUT,
                duration: 0.4,
            },
            {
                scale: 0.965,
                dx: 0,
                dy: 0,
                transition: KeyFrame.TransitionType.EASE_IN,
                duration: 0.4,
            },
            {
                scale: 0.93,
                dx: 1,
                dy: 1,
                transition: KeyFrame.TransitionType.EASE_OUT,
                duration: 0.4,
            },
        ]);

        // Cloud quad 5 - left
        this.createPulsingCloud(5, this.x - 67.5, this.y + 11.25, [
            {
                scale: 0.33,
                dx: 1,
                dy: 1,
                transition: KeyFrame.TransitionType.IMMEDIATE,
                duration: 0,
            },
            {
                scale: 0.365,
                dx: 0,
                dy: 0,
                transition: KeyFrame.TransitionType.EASE_IN,
                duration: 0.43,
            },
            {
                scale: 0.4,
                dx: -1,
                dy: -1,
                transition: KeyFrame.TransitionType.EASE_OUT,
                duration: 0.43,
            },
            {
                scale: 0.365,
                dx: 0,
                dy: 0,
                transition: KeyFrame.TransitionType.EASE_IN,
                duration: 0.43,
            },
            {
                scale: 0.33,
                dx: 1,
                dy: 1,
                transition: KeyFrame.TransitionType.EASE_OUT,
                duration: 0.43,
            },
        ]);

        // Cloud quad 6 - left bottom
        this.createPulsingCloud(6, this.x - 56.25, this.y + 33.75, [
            {
                scale: 0.6,
                dx: -1,
                dy: 1,
                transition: KeyFrame.TransitionType.IMMEDIATE,
                duration: 0,
            },
            {
                scale: 0.565,
                dx: 0,
                dy: 0,
                transition: KeyFrame.TransitionType.EASE_IN,
                duration: 0.42,
            },
            {
                scale: 0.53,
                dx: 1,
                dy: -1,
                transition: KeyFrame.TransitionType.EASE_OUT,
                duration: 0.42,
            },
            {
                scale: 0.565,
                dx: 0,
                dy: 0,
                transition: KeyFrame.TransitionType.EASE_IN,
                duration: 0.42,
            },
            {
                scale: 0.6,
                dx: -1,
                dy: 1,
                transition: KeyFrame.TransitionType.EASE_OUT,
                duration: 0.42,
            },
        ]);

        // Cloud quad 2 - bottom center (with rotation)
        const front = this.createPulsingCloud(2, this.x - 15, this.y + 56.25, [
            {
                scale: 0.93,
                dx: 1,
                dy: -1,
                transition: KeyFrame.TransitionType.IMMEDIATE,
                duration: 0,
            },
            {
                scale: 0.965,
                dx: 0,
                dy: 0,
                transition: KeyFrame.TransitionType.EASE_IN,
                duration: 0.47,
            },
            {
                scale: 1,
                dx: -1,
                dy: 1,
                transition: KeyFrame.TransitionType.EASE_OUT,
                duration: 0.47,
            },
            {
                scale: 0.965,
                dx: 0,
                dy: 0,
                transition: KeyFrame.TransitionType.EASE_IN,
                duration: 0.47,
            },
            {
                scale: 0.93,
                dx: 1,
                dy: -1,
                transition: KeyFrame.TransitionType.EASE_OUT,
                duration: 0.47,
            },
        ]);

        const rotation = new Timeline();
        rotation.addKeyFrame(KeyFrame.makeRotation(350, KeyFrame.TransitionType.IMMEDIATE, 0));
        front.addTimeline(rotation);
        front.playTimeline(0);

        this.passColorToChilds = true;
    }

    private createPulsingCloud(
        quadIndex: number,
        x: number,
        y: number,
        steps: { scale: number; dx: number; dy: number; transition: Transition; duration: number }[]
    ): ImageElement {
        const cloud = ImageElement.create(ResourceId.IMG_OBJ_GHOST, quadIndex);
        cloud.anchor = cloud.parentAnchor = Alignment.CENTER;
        cloud.x = x;
        cloud.y = y;
        this.addChild(cloud);

        const timeline = new Timeline();
        timeline.loopType = Timeline.LoopType.REPLAY;

        for (const step of steps) {
            timeline.addKeyFrame(
                KeyFrame.makeScale(step.scale, step.scale, step.transition, step.duration)
            );
            timeline.addKeyFrame(
                KeyFrame.makePos(
                    cloud.x + step.dx,
                    cloud.y + step.dy,
                    step.transition,
                    step.duration
                )
            );
        }

        cloud.addTimeline(timeline);
        cloud.playTimeline(0);
        return cloud;
    }
}

export default CandyInGhostBubbleAnimation;
