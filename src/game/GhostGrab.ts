import Alignment from "@/core/Alignment";
import Grab from "@/game/Grab";
import ImageElement from "@/visual/ImageElement";
import KeyFrame from "@/visual/KeyFrame";
import Timeline from "@/visual/Timeline";
import ResourceId from "@/resources/ResourceId";
import RGBAColor from "@/core/RGBAColor";

class GhostGrab extends Grab {
    private backClouds: ImageElement[] = [];

    initAt(px: number, py: number): this {
        this.x = px;
        this.y = py;

        // Cloud quad 5 (index 5) - left
        const leftCloud = ImageElement.create(ResourceId.IMG_OBJ_GHOST, 5);
        leftCloud.anchor = leftCloud.parentAnchor = Alignment.CENTER;
        leftCloud.x = -60;
        leftCloud.y = 2;
        this.addChild(leftCloud);
        this.backClouds.push(leftCloud);
        this.addFloatTimeline(leftCloud, 0.65, 0.43, 0.465, 0.5, -1, 1);

        // Cloud quad 4 (index 4) - right
        const rightCloud = ImageElement.create(ResourceId.IMG_OBJ_GHOST, 4);
        rightCloud.anchor = rightCloud.parentAnchor = Alignment.CENTER;
        rightCloud.x = 58;
        rightCloud.y = 18;
        this.addChild(rightCloud);
        this.backClouds.push(rightCloud);
        this.addFloatTimeline(rightCloud, 0.45, 0.9, 0.8, 0.7, 1, 1);

        // Cloud quad 2 (index 2) - center
        const centerCloud = ImageElement.create(ResourceId.IMG_OBJ_GHOST, 2);
        centerCloud.anchor = centerCloud.parentAnchor = Alignment.CENTER;
        centerCloud.x = -15;
        centerCloud.y = 45;
        this.addChild(centerCloud);
        this.backClouds.push(centerCloud);
        this.addFloatTimeline(centerCloud, 0.5, 1.1, 1, 0.9, -1, 1);

        // Child clouds inherit parent color and transformations
        this.passTransformationsToChilds = true;

        return this;
    }

    override draw(): void {
        if (!this.visible) return;

        this.preDraw();

        // Draw back sprite
        if (this.back) {
            this.back.color = this.color;
            this.back.draw();
        }

        // Draw backcloud decorations
        for (const cloud of this.backClouds) {
            cloud.draw();
        }

        // Draw radius circle if auto-rope
        if (this.radius !== undefined || this.hideRadius) {
            const color = new RGBAColor(0.2, 0.5, 0.9, this.radiusAlpha);
            const drawRadius = this.radius !== undefined ? this.radius : this.previousRadius;
            this.drawGrabCircle(this.x, this.y, drawRadius, color);
        }

        // Draw rope if it exists
        if (this.rope) {
            this.rope.draw();
        }

        // Draw front sprite
        if (this.front) {
            this.front.color = this.color;
            this.front.draw();
        }

        this.postDraw();
    }

    override drawBack(): void {
        // Skip the default back draw - we handle it in draw()
    }

    private addFloatTimeline(
        target: ImageElement,
        duration: number,
        startScale: number,
        midScale: number,
        endScale: number,
        posDeltaX: number,
        posDeltaY: number
    ): void {
        const offsetX = target.x;
        const offsetY = target.y;
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
            KeyFrame.makePos(
                offsetX + posDeltaX,
                offsetY + posDeltaY,
                KeyFrame.TransitionType.IMMEDIATE,
                0
            )
        );
        timeline.addKeyFrame(
            KeyFrame.makePos(offsetX, offsetY, KeyFrame.TransitionType.EASE_IN, duration)
        );
        timeline.addKeyFrame(
            KeyFrame.makePos(
                offsetX - posDeltaX,
                offsetY - posDeltaY,
                KeyFrame.TransitionType.EASE_OUT,
                duration
            )
        );
        timeline.addKeyFrame(
            KeyFrame.makePos(offsetX, offsetY, KeyFrame.TransitionType.EASE_IN, duration)
        );
        timeline.addKeyFrame(
            KeyFrame.makePos(
                offsetX + posDeltaX,
                offsetY + posDeltaY,
                KeyFrame.TransitionType.EASE_OUT,
                duration
            )
        );
        target.addTimeline(timeline);
        target.playTimeline(0);
    }
}

export default GhostGrab;
