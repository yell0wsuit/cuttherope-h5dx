import Alignment from "@/core/Alignment";
import Rectangle from "@/core/Rectangle";
import KeyFrame from "@/visual/KeyFrame";
import Timeline from "@/visual/Timeline";
import Bubble from "@/game/Bubble";
import ImageElement from "@/visual/ImageElement";
import ResourceId from "@/resources/ResourceId";
import resolution from "@/resolution";
import * as GameSceneConstants from "@/gameScene/constants";

class GhostBubble extends Bubble {
    private readonly clouds: ImageElement[];
    private bubbleOutlineIndex = -1;

    constructor() {
        super();
        this.clouds = [];
    }

    initAt(x: number, y: number): this {
        this.initTextureWithId(ResourceId.IMG_OBJ_BUBBLE_ATTACHED);
        // Set random texture quad for bubble variation (like regular bubbles)
        const randomQuad = Math.floor(Math.random() * 2) + 1; // Random 1-2
        this.setTextureQuad(randomQuad);
        this.doRestoreCutTransparency();

        this.bb = Rectangle.copy(resolution.BUBBLE_BB);
        this.x = x;
        this.y = y;
        this.anchor = Alignment.CENTER;
        this.popped = false;

        this.addSupportingClouds();

        const bubble = ImageElement.create(
            ResourceId.IMG_OBJ_BUBBLE_ATTACHED,
            GameSceneConstants.IMG_OBJ_BUBBLE_ATTACHED_bubble
        );
        bubble.doRestoreCutTransparency();
        bubble.parentAnchor = bubble.anchor = Alignment.CENTER;
        this.addChild(bubble);
        this.bubbleOutlineIndex = this.children.indexOf(bubble);

        return this;
    }

    private addSupportingClouds() {
        // Cloud quad 6 (index 6) - right
        this.addBackCloud(85, 25, 6, 0.8, 0.78, 0.76, 0.48);
        // Cloud quad 5 (index 5) - right bottom
        this.addBackCloud(65, 55, 5, 0.93, 0.965, 1, 0.4);
        // Cloud quad 5 (index 5) - left
        this.addBackCloud(-90, 15, 5, 0.33, 0.365, 0.4, 0.43);
        // Cloud quad 6 (index 6) - left bottom
        this.addBackCloud(-75, 45, 6, 0.6, 0.565, 0.53, 0.42, -1, 1);
        // Cloud quad 2 (index 2) - bottom center (with rotation)
        this.addBackCloud(-20, 75, 2, 0.93, 0.965, 1, 0.47, 1, -1, 350);

        // Child clouds inherit parent color and transformations
        this.passTransformationsToChilds = true;
        this.passColorToChilds = true;
    }

    private addBackCloud(
        offsetX: number,
        offsetY: number,
        quad: number,
        startScale: number,
        midScale: number,
        endScale: number,
        duration: number,
        posDeltaX = 1,
        posDeltaY = 1,
        rotation = 0
    ): void {
        const cloud = ImageElement.create(ResourceId.IMG_OBJ_GHOST, quad);
        cloud.anchor = cloud.parentAnchor = Alignment.CENTER;
        cloud.x = offsetX;
        cloud.y = offsetY;
        this.addChild(cloud);
        this.clouds.push(cloud);

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

        // Position keyframes use relative offsets from parent center
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

        if (rotation !== 0) {
            timeline.addKeyFrame(
                KeyFrame.makeRotation(rotation, KeyFrame.TransitionType.IMMEDIATE, 0)
            );
        }

        cloud.addTimeline(timeline);
        cloud.playTimeline(0);
    }

    override removeChildWithID(id: number): void {
        // For GhostBubble, when removing child 0, remove the bubble outline instead
        // (which is the last child added, not the first)
        if (id === 0 && this.bubbleOutlineIndex !== -1) {
            super.removeChildWithID(this.bubbleOutlineIndex);
            return;
        }
        super.removeChildWithID(id);
    }

    override draw(): void {
        // When popped, temporarily hide all clouds before drawing
        if (this.popped) {
            for (const cloud of this.clouds) {
                cloud.visible = false;
            }
        }
        // Call parent Bubble draw which will call preDraw, draw texture, and postDraw
        super.draw();
        // Restore cloud visibility after drawing (will be managed by timeline/fade-out)
        if (this.popped) {
            for (const cloud of this.clouds) {
                cloud.visible = true;
            }
        }
    }
}

export default GhostBubble;
