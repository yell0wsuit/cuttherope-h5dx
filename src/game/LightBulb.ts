import Alignment from "@/core/Alignment";
import Rectangle from "@/core/Rectangle";
import RGBAColor from "@/core/RGBAColor";
import Animation from "@/visual/Animation";
import Timeline from "@/visual/Timeline";
import Canvas from "@/utils/Canvas";
import GameObject from "@/visual/GameObject";
import ConstrainedPoint from "@/physics/ConstrainedPoint";
import ResourceId from "@/resources/ResourceId";
import CTRGameObject from "./CTRGameObject";
import resolution from "@/resolution";
import type Bubble from "@/game/Bubble";
import type Sock from "@/game/Sock";
import * as GameSceneConstants from "@/gameScene/constants";
import CandyInGhostBubbleAnimation from "@/game/CandyInGhostBubbleAnimation";
import { getInterpolatedPosition } from "@/utils/interpolation";

const IMG_OBJ_LIGHTER_light = 0;
const IMG_OBJ_LIGHTER_bottle = 1;
const IMG_OBJ_LIGHTER_top = 2;
const IMG_OBJ_LIGHTER_firefly_start = 3;
const IMG_OBJ_LIGHTER_firefly_end = 42;

const LIGHTBULB_ROOT_SCALE = 1;

// Maximum reasonable distance for interpolation (prevents jumps on teleport/state changes)
const MAX_LIGHTBULB_INTERP_DISTANCE = 100;
const MAX_LIGHTBULB_INTERP_DISTANCE_SQ = MAX_LIGHTBULB_INTERP_DISTANCE * MAX_LIGHTBULB_INTERP_DISTANCE;

class LightBulbGlow extends GameObject {
    override draw(): void {
        const ctx = Canvas.context;
        if (!ctx) {
            super.draw();
            return;
        }

        const previousComposite = ctx.globalCompositeOperation;
        ctx.globalCompositeOperation = "lighter";
        super.draw();
        ctx.globalCompositeOperation = previousComposite;
    }
}

class LightBulb extends CTRGameObject {
    lightRadius: number;
    rotationVelocity: number;
    constraint: ConstrainedPoint;
    attachedSock: Sock | null;
    capturingBubble: Bubble | null;
    capturingGhostBubble: boolean;
    sockSpeed: number;
    localBounds: Rectangle;
    worldBounds: Rectangle;

    private readonly lightGlow: GameObject;
    private readonly firefly: Animation;
    private readonly bottle: GameObject;
    private readonly top: GameObject;
    private readonly bubbleAnimation: Animation;
    private readonly ghostBubbleAnimation: CandyInGhostBubbleAnimation;
    PM: number;

    constructor(lightRadius: number, constraint: ConstrainedPoint) {
        super();

        this.lightRadius = lightRadius;
        this.rotationVelocity = 0;
        this.constraint = constraint;
        this.attachedSock = null;
        this.capturingBubble = null;
        this.capturingGhostBubble = false;
        this.sockSpeed = 0;
        this.scaleX = LIGHTBULB_ROOT_SCALE;
        this.scaleY = LIGHTBULB_ROOT_SCALE;
        this.PM = resolution.PM;

        this.lightGlow = new LightBulbGlow();
        this.lightGlow.initTextureWithId(ResourceId.IMG_OBJ_LIGHTER);
        this.lightGlow.setTextureQuad(IMG_OBJ_LIGHTER_light);
        this.lightGlow.anchor = this.lightGlow.parentAnchor = Alignment.CENTER;
        this.lightGlow.color = new RGBAColor(1, 1, 1, 0.4);
        //this.lightGlow.doRestoreCutTransparency();
        this.addChild(this.lightGlow);

        this.bottle = new GameObject();
        this.bottle.initTextureWithId(ResourceId.IMG_OBJ_LIGHTER);
        this.bottle.setTextureQuad(IMG_OBJ_LIGHTER_bottle);
        this.bottle.anchor = this.bottle.parentAnchor = Alignment.CENTER;
        this.bottle.doRestoreCutTransparency();
        this.addChild(this.bottle);

        this.top = new GameObject();
        this.top.initTextureWithId(ResourceId.IMG_OBJ_LIGHTER);
        this.top.setTextureQuad(IMG_OBJ_LIGHTER_top);
        this.top.anchor = this.top.parentAnchor = Alignment.CENTER;
        this.top.doRestoreCutTransparency();
        this.addChild(this.top);

        this.firefly = new Animation();
        this.firefly.initTextureWithId(ResourceId.IMG_OBJ_LIGHTER);
        this.firefly.anchor = this.firefly.parentAnchor = Alignment.CENTER;
        //this.firefly.doRestoreCutTransparency();
        this.firefly.addAnimationDelay(
            0.05,
            Timeline.LoopType.REPLAY,
            IMG_OBJ_LIGHTER_firefly_start,
            IMG_OBJ_LIGHTER_firefly_end
        );
        this.firefly.playTimeline(0);
        this.addChild(this.firefly);

        this.bubbleAnimation = new Animation();
        this.bubbleAnimation.initTextureWithId(ResourceId.IMG_OBJ_BUBBLE_FLIGHT);
        this.bubbleAnimation.anchor = this.bubbleAnimation.parentAnchor = Alignment.CENTER;
        this.bubbleAnimation.addAnimationDelay(
            0.05,
            Timeline.LoopType.REPLAY,
            GameSceneConstants.IMG_OBJ_BUBBLE_FLIGHT_Frame_1,
            GameSceneConstants.IMG_OBJ_BUBBLE_FLIGHT_Frame_13
        );
        this.bubbleAnimation.playTimeline(0);
        this.bubbleAnimation.visible = false;
        this.addChild(this.bubbleAnimation);

        this.ghostBubbleAnimation = new CandyInGhostBubbleAnimation().initWithResId(
            ResourceId.IMG_OBJ_BUBBLE_FLIGHT
        );
        this.ghostBubbleAnimation.visible = false;
        this.addChild(this.ghostBubbleAnimation);

        // Use candy bounding box size for bounds
        const boundWidth = resolution.CANDY_BB.w;
        const boundHeight = resolution.CANDY_BB.h;
        const halfWidth = (boundWidth * LIGHTBULB_ROOT_SCALE) / 2;
        const halfHeight = (boundHeight * LIGHTBULB_ROOT_SCALE) / 2;
        this.localBounds = new Rectangle(-halfWidth, -halfHeight, halfWidth * 2, halfHeight * 2);
        this.worldBounds = Rectangle.copy(this.localBounds);

        this.applyGlowScale();
        this.syncToConstraint();
    }

    applyGlowScale(): void {
        const width = this.lightGlow.width;
        if (width <= 0) {
            return;
        }
        const scale = (((this.lightRadius * this.PM) / width) * 1.5) / LIGHTBULB_ROOT_SCALE;
        this.lightGlow.scaleX = scale;
        this.lightGlow.scaleY = scale;
    }

    syncToConstraint(): void {
        this.x = this.constraint.pos.x;
        this.y = this.constraint.pos.y;
        this.updateBounds();
    }

    private updateBounds(): void {
        this.worldBounds.x = this.x + this.localBounds.x;
        this.worldBounds.y = this.y + this.localBounds.y;
        this.worldBounds.w = this.localBounds.w;
        this.worldBounds.h = this.localBounds.h;
    }

    override update(delta: number): void {
        super.update(delta);
        this.visible = this.attachedSock == null;
        const hasBubble = this.capturingBubble != null && this.attachedSock == null;
        this.bubbleAnimation.visible = hasBubble && !this.capturingGhostBubble;
        this.ghostBubbleAnimation.visible = hasBubble && this.capturingGhostBubble;
        if (this.rotationVelocity !== 0) {
            this.rotation += Math.min(5, this.rotationVelocity);
            this.rotationVelocity *= 0.98;
        }
        this.updateBounds();
    }

    /**
     * Applies interpolation to position for smooth rendering on high refresh displays.
     * Returns the original position so it can be restored after drawing.
     */
    private applyInterpolation(): { originalX: number; originalY: number } {
        const originalX = this.x;
        const originalY = this.y;

        if (this.interpolationAlpha < 1) {
            const interpPos = getInterpolatedPosition(
                this.constraint.prevPos,
                this.constraint.pos,
                this.interpolationAlpha,
                MAX_LIGHTBULB_INTERP_DISTANCE_SQ
            );
            this.x = interpPos.x;
            this.y = interpPos.y;
        }

        return { originalX, originalY };
    }

    /**
     * Draws only the light glow effect. Call this before stars.
     */
    drawLight(): void {
        if (!this.visible) {
            return;
        }

        const { originalX, originalY } = this.applyInterpolation();

        this.preDraw();
        this.lightGlow.draw();

        // Restore original position for physics consistency
        this.x = originalX;
        this.y = originalY;
    }

    /**
     * Draws the bottle, top, and firefly. Call this after stars.
     */
    drawBottleAndFirefly(): void {
        if (!this.visible) {
            return;
        }

        const { originalX, originalY } = this.applyInterpolation();

        this.bottle.draw();
        this.top.draw();
        this.firefly.draw();
        if (this.bubbleAnimation.visible) {
            this.bubbleAnimation.draw();
        }
        if (this.ghostBubbleAnimation.visible) {
            this.ghostBubbleAnimation.draw();
        }
        this.postDrawNoChildren();

        // Restore original position for physics consistency
        this.x = originalX;
        this.y = originalY;
    }

    private postDrawNoChildren(): void {
        const ctx = Canvas.context;
        if (ctx) {
            ctx.restore();
        }
    }
}

export default LightBulb;
