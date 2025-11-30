import Alignment from "@/core/Alignment";
import Radians from "@/utils/Radians";
import Bouncer from "@/game/Bouncer";
import ImageElement from "@/visual/ImageElement";
import KeyFrame from "@/visual/KeyFrame";
import Timeline from "@/visual/Timeline";
import ResourceId from "@/resources/ResourceId";
import type Ghost from "@/game/Ghost";

const CLOUD_RADIUS = Math.sqrt(5060);

class GhostBouncer extends Bouncer {
    backCloud: ImageElement;
    backCloud2: ImageElement;
    ghost: Ghost | undefined;
    backCloudOffset: { x: number; y: number };
    backCloud2Offset: { x: number; y: number };

    constructor(x: number, y: number, width: number, angle: number, ghost?: Ghost) {
        super(x, y, width, angle);
        this.ghost = ghost;

        // Cloud quad 4 - back cloud 2 at angle + 170°
        const angle2 = angle + 170;
        this.backCloud2Offset = {
            x: CLOUD_RADIUS * Math.cos(Radians.fromDegrees(angle2)),
            y: CLOUD_RADIUS * Math.sin(Radians.fromDegrees(angle2)),
        };
        this.backCloud2 = this.createCloud(0, 4);
        this.backCloud2.visible = false;
        this.addFloatTimeline(this.backCloud2, 0.35, 0.7, 0.55, 0.4);

        // Cloud quad 4 - back cloud at angle + 10°
        const angle1 = angle + 10;
        this.backCloudOffset = {
            x: CLOUD_RADIUS * Math.cos(Radians.fromDegrees(angle1)),
            y: CLOUD_RADIUS * Math.sin(Radians.fromDegrees(angle1)),
        };
        this.backCloud = this.createCloud(0, 4);
        this.backCloud.visible = false;
        this.addFloatTimeline(this.backCloud, 0.39, 0.9, 0.8, 0.7);

        // Cloud quad 3 - right cloud
        const rightCloud = ImageElement.create(ResourceId.IMG_OBJ_GHOST, 3);
        rightCloud.anchor = rightCloud.parentAnchor = Alignment.CENTER;
        rightCloud.x = 45;
        rightCloud.y = 41.25;
        this.addChild(rightCloud);
        this.addFloatTimeline(rightCloud, 0.45, 1.1, 1, 0.9);

        // Cloud quad 2 - left cloud
        const leftCloud = ImageElement.create(ResourceId.IMG_OBJ_GHOST, 2);
        leftCloud.anchor = leftCloud.parentAnchor = Alignment.CENTER;
        leftCloud.x = -37.5;
        leftCloud.y = 41.25;
        this.addChild(leftCloud);
        this.addFloatTimeline(leftCloud, 0.5, 1.1, 1, 0.9);

        // Child clouds inherit parent color and transformations
        this.passTransformationsToChilds = true;
    }

    override playTimeline(index: number): void {
        // Only allow explicit timeline playback (e.g., morph in/out)
        // and prevent the default bounce animation loop from triggering automatically.
        if (index === undefined) {
            return;
        }
        super.playTimeline(index);
    }

    override update(delta: number): void {
        super.update(delta);

        // Update back clouds manually since they're not children
        this.backCloud.update(delta);
        this.backCloud2.update(delta);

        // Position back clouds relative to bouncer's current position
        this.backCloud.x = this.x + this.backCloudOffset.x;
        this.backCloud.y = this.y + this.backCloudOffset.y;
        this.backCloud2.x = this.x + this.backCloud2Offset.x;
        this.backCloud2.y = this.y + this.backCloud2Offset.y;
    }

    override draw(): void {
        // Sync back clouds color with bouncer (they're not children so don't auto-inherit)
        this.backCloud.color = this.color;
        this.backCloud2.color = this.color;

        // Draw back clouds independently (they're not children)
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
