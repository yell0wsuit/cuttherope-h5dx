import Alignment from "@/core/Alignment";
import Radians from "@/utils/Radians";
import Bouncer from "@/game/Bouncer";
import ImageElement from "@/visual/ImageElement";
import KeyFrame from "@/visual/KeyFrame";
import Timeline from "@/visual/Timeline";
import ResourceId from "@/resources/ResourceId";

const CLOUD_RADIUS = Math.sqrt(9000);

class GhostBouncer extends Bouncer {
    backCloud: ImageElement;
    backCloud2: ImageElement;
    ghost?: any;

    constructor(x: number, y: number, width: number, angle: number, ghost?: any) {
        super(x, y, width, angle);
        this.ghost = ghost;

        // Cloud quad 4 (index 4) - back cloud 2 at angle + 170°
        this.backCloud2 = this.createCloud(angle + 170, 4);
        this.backCloud2.visible = false;
        this.addChild(this.backCloud2);
        this.addFloatTimeline(this.backCloud2, 0.35, 0.7, 0.55, 0.4);

        // Cloud quad 4 (index 4) - back cloud at angle + 10°
        this.backCloud = this.createCloud(angle + 10, 4);
        this.backCloud.visible = false;
        this.addChild(this.backCloud);
        this.addFloatTimeline(this.backCloud, 0.39, 0.9, 0.8, 0.7);

        // Cloud quad 3 (index 3) - right cloud
        const rightCloud = ImageElement.create(
            ResourceId.IMG_OBJ_GHOST,
            3
        );
        rightCloud.anchor = rightCloud.parentAnchor = Alignment.CENTER;
        rightCloud.x = 60;
        rightCloud.y = 55;
        this.addChild(rightCloud);
        this.addFloatTimeline(rightCloud, 0.45, 1.1, 1, 0.9);

        // Cloud quad 2 (index 2) - left cloud
        const leftCloud = ImageElement.create(
            ResourceId.IMG_OBJ_GHOST,
            2
        );
        leftCloud.anchor = leftCloud.parentAnchor = Alignment.CENTER;
        leftCloud.x = -50;
        leftCloud.y = 55;
        this.addChild(leftCloud);
        this.addFloatTimeline(leftCloud, 0.5, 1.1, 1, 0.9);

        // Child clouds inherit parent color and transformations
        (this as any).passTransformationsToChilds = true;
    }

    override playTimeline(index?: number): void {
        // Allow bounce animation (timeline 0) to play
        // Block automatic timeline playback after morphIn completes (no index)
        if (index === 0) {
            super.playTimeline(0);
        }
    }

    override draw(): void {
        this.backCloud.draw();
        this.backCloud2.draw();
        super.draw();

        // Draw morphing effects on top of the bouncer
        if (this.ghost?.morphingBubbles) {
            this.ghost.morphingBubbles.draw();
        }
        if (this.ghost?.morphingCloud) {
            this.ghost.morphingCloud.draw();
        }
    }

    private createCloud(angle: number, quadIndex: number): ImageElement {
        const cloud = ImageElement.create(ResourceId.IMG_OBJ_GHOST, quadIndex);
        cloud.anchor = cloud.parentAnchor = Alignment.CENTER;
        cloud.x = CLOUD_RADIUS * Math.cos(Radians.fromDegrees(angle));
        cloud.y = CLOUD_RADIUS * Math.sin(Radians.fromDegrees(angle));
        return cloud;
    }

    private addFloatTimeline(
        target: ImageElement,
        duration: number,
        startScale: number,
        midScale: number,
        endScale: number
    ): void {
        const timeline = new Timeline();
        timeline.loopType = Timeline.LoopType.REPLAY;
        timeline.addKeyFrame(
            KeyFrame.makeScale(startScale, startScale, KeyFrame.TransitionType.IMMEDIATE, 0)
        );
        timeline.addKeyFrame(
            KeyFrame.makeScale(midScale, midScale, KeyFrame.TransitionType.EASE_IN, duration)
        );
        timeline.addKeyFrame(
            KeyFrame.makeScale(endScale, endScale, KeyFrame.TransitionType.EASE_OUT, duration)
        );
        timeline.addKeyFrame(
            KeyFrame.makeScale(midScale, midScale, KeyFrame.TransitionType.EASE_IN, duration)
        );
        timeline.addKeyFrame(
            KeyFrame.makeScale(startScale, startScale, KeyFrame.TransitionType.EASE_OUT, duration)
        );
        timeline.addKeyFrame(
            KeyFrame.makePos(target.x + 1, target.y + 1, KeyFrame.TransitionType.IMMEDIATE, 0)
        );
        timeline.addKeyFrame(
            KeyFrame.makePos(target.x, target.y, KeyFrame.TransitionType.EASE_IN, duration)
        );
        timeline.addKeyFrame(
            KeyFrame.makePos(target.x - 1, target.y - 1, KeyFrame.TransitionType.EASE_OUT, duration)
        );
        timeline.addKeyFrame(
            KeyFrame.makePos(target.x, target.y, KeyFrame.TransitionType.EASE_IN, duration)
        );
        timeline.addKeyFrame(
            KeyFrame.makePos(target.x + 1, target.y + 1, KeyFrame.TransitionType.EASE_OUT, duration)
        );
        target.addTimeline(timeline);
        target.playTimeline(0);
    }
}

export default GhostBouncer;
