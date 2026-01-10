import CTRGameObject from "@/game/CTRGameObject";
import Radians from "@/utils/Radians";
import Bungee from "@/game/Bungee";
import SoundMgr from "@/game/CTRSoundMgr";
import ResourceId from "@/resources/ResourceId";
import Vector from "@/core/Vector";
import Mover from "@/utils/Mover";
import Constants from "@/utils/Constants";
import resolution from "@/resolution";
import LevelState from "@/game/LevelState";
import Animation from "@/visual/Animation";
import Alignment from "@/core/Alignment";
import ImageElement from "@/visual/ImageElement";
import Canvas from "@/utils/Canvas";
import RGBAColor from "@/core/RGBAColor";
import Timeline from "@/visual/Timeline";
import MathHelper from "@/utils/MathHelper";
import HorizontallyTiledImage from "@/visual/HorizontallyTiledImage";
import GrabMoveBackground from "@/game/GrabMoveBackground";

const SpiderState = {
    START: 0,
    WALK: 1,
    BUSTER: 2,
    CATCH: 3,
} as const;

const GunState = {
    SHOW: 0,
    HIDE: 1,
} as const;

// TODO: move into spider
const IMG_OBJ_SPIDER_activation_start = 0;
const IMG_OBJ_SPIDER_activation_end = 6;
const IMG_OBJ_SPIDER_crawl_start = 7;
const IMG_OBJ_SPIDER_crawl_end = 10;

const IMG_OBJ_HOOK_AUTO_bottom = 0;
const IMG_OBJ_HOOK_AUTO_top = 1;

const IMG_OBJ_HOOK_01_bottom = 0;
const IMG_OBJ_HOOK_01_top = 1;

const IMG_OBJ_HOOK_02_bottom = 0;
const IMG_OBJ_HOOK_02_top = 1;

const IMG_OBJ_HOOK_REGULATED_bottom = 0;
const IMG_OBJ_HOOK_REGULATED_rope = 1;
const IMG_OBJ_HOOK_REGULATED_active = 2;
const IMG_OBJ_HOOK_REGULATED_top = 3;

const IMG_OBJ_HOOK_MOVABLE_active = 3;
const IMG_OBJ_HOOK_MOVABLE_top = 4;

// bees
const IMG_OBJ_BEE_HD__rotation_center = 0;
const IMG_OBJ_BEE_HD_obj_bee = 1;
const IMG_OBJ_BEE_HD_wings_start = 2;
const IMG_OBJ_BEE_HD_wings_end = 4;

const grabCircleCache: Record<string, HTMLCanvasElement> = {};

class Grab extends CTRGameObject {
    rope: Bungee | null;
    gun: boolean;
    gunFired: boolean;
    invisible: boolean;
    kicked: boolean;
    wheel: boolean;
    wheelOperating: number;
    lastWheelTouch: Vector;
    moveLength: number;
    moveVertical: boolean;
    moveOffset: number;
    moveBackground: GrabMoveBackground | null;
    grabMoverHighlight: ImageElement | null;
    grabMover: ImageElement | null;
    moverDragging: number;
    minMoveValue: number;
    maxMoveValue: number;
    hasSpider: boolean;
    spiderActive: boolean;
    spider: Animation | null;
    spiderPos: number;
    shouldActivate: boolean;
    wheelDirty: boolean;
    launcher: boolean;
    launcherSpeed: number;
    launcherIncreaseSpeed: boolean;
    hideRadius: boolean;
    radiusAlpha: number;
    radius: number;
    previousRadius: number | undefined;
    balloon: boolean;
    bee: ImageElement | null;
    wheelImage?: ImageElement;
    wheelImage2?: ImageElement;
    wheelImage3?: ImageElement;
    wheelHighlight?: ImageElement;
    back: ImageElement | null;
    front: ImageElement | null;
    gunBack: ImageElement | null;
    gunArrow: ImageElement | null;
    gunCup: ImageElement | null;
    kickable?: boolean;

    constructor() {
        super();
        this.rope = null;

        this.gun = false;
        this.gunFired = false;
        this.invisible = false;
        this.kicked = false;

        this.wheel = false;
        this.wheelOperating = Constants.UNDEFINED;
        this.lastWheelTouch = Vector.newZero();

        this.moveLength = 0;
        this.moveVertical = false;
        this.moveOffset = 0;
        this.moveBackground = null;
        this.grabMoverHighlight = null;
        this.grabMover = null;
        this.moverDragging = 0;
        this.minMoveValue = 0;
        this.maxMoveValue = 0;

        this.hasSpider = false;
        this.spiderActive = false;
        this.spider = null;
        this.spiderPos = 0;
        this.shouldActivate = false;

        this.wheelDirty = false;

        this.launcher = false;
        this.launcherSpeed = 0;
        this.launcherIncreaseSpeed = false;

        this.hideRadius = false;
        this.radiusAlpha = 0;
        this.radius = 0;
        this.previousRadius = undefined;

        this.balloon = false;
        this.bee = null;
        this.back = null;
        this.front = null;
        this.gunBack = null;
        this.gunArrow = null;
        this.gunCup = null;
    }

    getRotateAngle(v1: Vector, v2: Vector, c: Vector) {
        const m1 = Vector.subtract(v1, c);
        const m2 = Vector.subtract(v2, c);

        const a = m2.normalizedAngle() - m1.normalizedAngle();
        return Radians.toDegrees(a);
    }

    handleWheelTouch(x: number, y: number) {
        this.lastWheelTouch.x = x;
        this.lastWheelTouch.y = y;
    }

    handleWheelRotate(v: Vector) {
        SoundMgr.playSound(ResourceId.SND_WHEEL);

        const center = new Vector(this.x, this.y);
        let a = this.getRotateAngle(this.lastWheelTouch, v, center);
        if (a > 180) {
            a -= 360;
        } else if (a < -180) {
            a += 360;
        }

        if (!this.wheelImage2 || !this.wheelImage3 || !this.wheelHighlight) {
            return;
        }

        this.wheelImage2.rotation += a;
        this.wheelImage3.rotation += a;
        this.wheelHighlight.rotation += a;

        a =
            a > 0
                ? Math.min(Math.max(1, a), resolution.GRAB_WHEEL_MAX_ROTATION)
                : Math.max(Math.min(-1, a), -resolution.GRAB_WHEEL_MAX_ROTATION);

        if (this.rope) {
            if (a > 0) {
                if (this.rope.getLength() < resolution.GRAB_ROPE_ROLL_MAX_LENGTH) {
                    this.rope.roll(a, null);
                }
            } else if (a !== 0) {
                if (this.rope.parts.length > 3) {
                    this.rope.rollBack(-a);
                }
            }
            this.wheelDirty = true;
        }
        this.lastWheelTouch.copyFrom(v);
    }

    override update(delta: number) {
        super.update(delta);

        if (this.launcher && this.rope) {
            const anchor = this.rope.bungeeAnchor;
            let moveResult;
            anchor.pos.x = this.x;
            anchor.pos.y = this.y;
            anchor.pin.copyFrom(anchor.pos);

            if (this.launcherIncreaseSpeed) {
                moveResult = Mover.moveToTargetWithStatus(this.launcherSpeed, 200, 30, delta);
                this.launcherSpeed = moveResult.value;
                if (moveResult.reachedZero) {
                    this.launcherIncreaseSpeed = false;
                }
            } else {
                moveResult = Mover.moveToTargetWithStatus(this.launcherSpeed, 130, 30, delta);
                this.launcherSpeed = moveResult.value;
                if (moveResult.reachedZero) {
                    this.launcherIncreaseSpeed = true;
                }
            }

            if (this.mover) {
                this.mover.setMoveSpeed(this.launcherSpeed);
            }
        }

        if (this.hideRadius) {
            this.radiusAlpha -= 1.5 * delta;
            if (this.radiusAlpha <= 0) {
                this.radius = Constants.UNDEFINED;
                this.hideRadius = false;
            }
        }

        if (this.bee && this.mover) {
            const vt = this.mover.path[this.mover.targetPoint];
            const vp = this.mover.pos;
            const MAX_ANGLE = 10;
            let a = 0;

            if (vt) {
                const v = Vector.subtract(vt, vp);
                if (Math.abs(v.x) > 15) {
                    a = v.x > 0 ? MAX_ANGLE : -MAX_ANGLE;
                }
            }

            this.bee.rotation = Mover.moveToTarget(this.bee.rotation, a, 60, delta);
        }

        if (this.wheel && this.wheelDirty && this.rope && this.wheelImage2) {
            const len = this.rope.getLength() * 0.7;
            if (len === 0) {
                this.wheelImage2.scaleX = this.wheelImage2.scaleY = 0;
            } else {
                const scale = Math.max(
                    0,
                    Math.min(1.2, 1 - len / resolution.GRAB_WHEEL_SCALE_DIVISOR)
                );
                this.wheelImage2.scaleX = scale;
                this.wheelImage2.scaleY = scale;
            }
        }
    }

    updateSpider(delta: number) {
        if (this.spider && this.hasSpider && this.shouldActivate) {
            this.shouldActivate = false;
            this.spiderActive = true;
            SoundMgr.playSound(ResourceId.SND_SPIDER_ACTIVATE);
            this.spider.playTimeline(SpiderState.START);
        }

        if (this.spider && this.hasSpider && this.spiderActive) {
            if (this.spider.currentTimelineIndex !== SpiderState.START) {
                this.spiderPos += delta * resolution.SPIDER_SPEED;
            }

            let checkingPos = 0;
            let reachedCandy = false;

            if (this.rope) {
                const drawPts = this.rope.drawPts;
                const BUNGEE_REST_LEN = resolution.BUNGEE_REST_LEN;
                const a = (2 * BUNGEE_REST_LEN) / 3;

                for (let i = 0, numPts = drawPts.length; i < numPts; i++) {
                    const c1 = drawPts[i];
                    const c2 = drawPts[i + 1];
                    if (!c1 || !c2) {
                        continue;
                    }
                    const b = c1.distance(c2);
                    const len = a > b ? a : b;

                    if (
                        this.spiderPos >= checkingPos &&
                        (this.spiderPos < checkingPos + len || i > numPts - 3)
                    ) {
                        const overlay = this.spiderPos - checkingPos;
                        const c3 = Vector.subtract(c2, c1);
                        c3.multiply(overlay / len);
                        this.spider.x = c1.x + c3.x;
                        this.spider.y = c1.y + c3.y;

                        if (i > numPts - 3) {
                            reachedCandy = true;
                        }

                        if (this.spider.currentTimelineIndex !== SpiderState.START) {
                            this.spider.rotation = c3.normalizedAngle() * 57.29577951308232 + 270;
                        }

                        break;
                    } else {
                        checkingPos += len;
                    }
                }
            }

            if (reachedCandy) {
                this.spiderPos = Constants.UNDEFINED;
            }
        }
    }

    drawBack() {
        if (this.invisible) {
            return;
        }
        if (this.gun) {
            return;
        }

        if (this.kickable && this.kicked && this.rope) {
            const pos = this.rope.bungeeAnchor.pos;
            this.x = pos.x;
            this.y = pos.y;
        }

        // Apply mover interpolation for smooth rendering on high refresh displays
        let originalX: number | undefined;
        let originalY: number | undefined;
        let originalRotation: number | undefined;
        if (this.mover && this.interpolationAlpha < 1) {
            originalX = this.x;
            originalY = this.y;
            originalRotation = this.rotation;

            const interp = this.mover.getInterpolated(this.interpolationAlpha);
            this.x = interp.x;
            this.y = interp.y;
            this.rotation = interp.angle;
        }

        this.preDraw();

        if (this.moveLength > 0) {
            this.moveBackground?.draw();
        } else {
            this.back?.draw();
        }

        if (this.radius !== Constants.UNDEFINED || this.hideRadius) {
            const color = new RGBAColor(0.2, 0.5, 0.9, this.radiusAlpha);
            const drawRadius =
                this.radius !== Constants.UNDEFINED ? this.radius : this.previousRadius;
            this.drawGrabCircle(this.x, this.y, drawRadius, color);
        }

        // Restore original position for physics consistency
        if (originalX !== undefined) {
            this.x = originalX;
            this.y = originalY!;
            this.rotation = originalRotation!;
        }
    }

    drawGrabCircle(x: number, y: number, radius: number | undefined, color: RGBAColor) {
        if (!radius) {
            return;
        }

        if (radius < 0) {
            return;
        }

        // generate a key for the cache
        const key = `${radius.toString()}|${color.rgbaStyle()}`;
        let circleCnv: HTMLCanvasElement;

        // check the cache first
        if (grabCircleCache[key]) {
            circleCnv = grabCircleCache[key];
            //console.log("EXISTS IN CACHE")
        } else {
            //otherwise create it
            circleCnv = document.createElement("canvas");
            circleCnv.width = circleCnv.height = radius * 2 + 4;

            //document.body.appendChild(circleCnv)

            const ctx = circleCnv.getContext("2d");
            const totalRadians = 2 * Math.PI;
            const radiusScaleFactor = resolution.CANVAS_SCALE * 2;
            const scaledRadius = radius / radiusScaleFactor;
            let segments = Math.max(16, Math.round(scaledRadius));

            // make sure we have an even number of segments
            if (segments % 2 !== 0) {
                segments++;
            }

            if (ctx) {
                ctx.lineWidth = 2;
                ctx.strokeStyle = color.rgbaStyle();
            }

            const segmentRadians = totalRadians / segments;
            for (let i = 0; i < segments; i++) {
                // only draw every other segment for dashed circle
                if (i % 2 === 0) {
                    const startRadians = (i / segments) * totalRadians;
                    if (ctx) {
                        ctx.beginPath();
                        ctx.arc(
                            radius + 2,
                            radius + 2,
                            radius,
                            startRadians,
                            startRadians + segmentRadians,
                            false
                        );
                        ctx.stroke();
                        ctx.closePath();
                    }
                }
            }

            grabCircleCache[key] = circleCnv;
            //console.log("DRAW GRAB CIRCLE", circleCnv)
        }

        const mainCtx = Canvas.context;
        if (!mainCtx) {
            return;
        }
        mainCtx.drawImage(circleCnv, x - radius - 2, y - radius - 2);
    }

    override drawBB() {
        if (this.wheel) {
            this.drawGrabCircle(this.x, this.y, resolution.GRAB_WHEEL_RADIUS, RGBAColor.red);
        }
    }

    override draw() {
        if (this.invisible) {
            return;
        }

        // NOTE: we do pre-draw when drawing the back so the position
        // of the back is adjusted. Otherwise the back can be offset
        // when there are large moves to position (grab is on DJ disc)

        // Apply mover interpolation for smooth rendering on high refresh displays
        let originalX: number | undefined;
        let originalY: number | undefined;
        let originalRotation: number | undefined;
        if (this.mover && this.interpolationAlpha < 1) {
            originalX = this.x;
            originalY = this.y;
            originalRotation = this.rotation;

            const interp = this.mover.getInterpolated(this.interpolationAlpha);
            this.x = interp.x;
            this.y = interp.y;
            this.rotation = interp.angle;
        }

        const b = this.rope;

        if (this.wheel) {
            if (this.wheelHighlight && this.wheelImage3 && this.wheelImage) {
                this.wheelHighlight.visible = this.wheelOperating !== Constants.UNDEFINED;
                this.wheelImage3.visible = this.wheelOperating === Constants.UNDEFINED;
                this.wheelImage.draw();
            }
        }

        if (this.gun) {
            this.gunBack?.draw();
            if (!this.gunFired) {
                this.gunArrow?.draw();
            }
        }

        if (b) {
            b.draw();
        }

        if (this.moveLength <= 0) {
            this.front?.draw();
        } else {
            if (this.moverDragging != Constants.UNDEFINED) {
                this.grabMoverHighlight?.draw();
            } else {
                this.grabMover?.draw();
            }
        }

        if (this.wheel) {
            this.wheelImage2?.draw();
        }

        this.postDraw();

        // Restore original position for physics consistency
        if (originalX !== undefined) {
            this.x = originalX;
            this.y = originalY!;
            this.rotation = originalRotation!;
        }
    }

    drawSpider() {
        this.spider?.draw();
    }

    drawGunCup() {
        this.gunCup?.draw();
    }

    /**
     * @param {Bungee} rope
     */
    setRope(rope: Bungee) {
        this.rope = rope;
        this.previousRadius = this.radius;
        this.radius = Constants.UNDEFINED;
        if (this.hasSpider) {
            this.shouldActivate = true;
        }
    }

    setLauncher() {
        this.launcher = true;
        this.launcherIncreaseSpeed = true;
        this.launcherSpeed = 130;
        const m = new Mover(100, this.launcherSpeed, 0);
        m.setPathFromString("RC30", new Vector(this.x, this.y));
        this.setMover(m);
        m.start();
    }

    setRadius(radius: number) {
        this.previousRadius = this.radius;
        this.radius = radius;

        // TODO: handle gun

        if (radius === Constants.UNDEFINED || radius === Constants.CANDY2_FLAG) {
            const imageId = MathHelper.randomRange(
                ResourceId.IMG_OBJ_HOOK_01,
                ResourceId.IMG_OBJ_HOOK_02
            );
            this.back = ImageElement.create(imageId, IMG_OBJ_HOOK_01_bottom);
            this.back.doRestoreCutTransparency();
            this.back.anchor = this.back.parentAnchor = Alignment.CENTER;
            this.front = ImageElement.create(imageId, IMG_OBJ_HOOK_01_top);
            this.front.anchor = this.front.parentAnchor = Alignment.CENTER;
            this.addChild(this.back);
            this.addChild(this.front);
            this.back.visible = false;
            this.front.visible = false;
        } else {
            this.back = ImageElement.create(ResourceId.IMG_OBJ_HOOK_AUTO, IMG_OBJ_HOOK_AUTO_bottom);
            this.back.doRestoreCutTransparency();
            this.back.anchor = this.back.parentAnchor = Alignment.CENTER;
            this.front = ImageElement.create(ResourceId.IMG_OBJ_HOOK_AUTO, IMG_OBJ_HOOK_AUTO_top);
            this.front.anchor = this.front.parentAnchor = Alignment.CENTER;
            this.addChild(this.back);
            this.addChild(this.front);
            this.back.visible = false;
            this.front.visible = false;

            this.radiusAlpha = resolution.GRAB_RADIUS_ALPHA;
            this.hideRadius = false;
        }

        if (this.wheel) {
            this.wheelImage = ImageElement.create(
                ResourceId.IMG_OBJ_HOOK_REGULATED,
                IMG_OBJ_HOOK_REGULATED_bottom
            );
            this.wheelImage.anchor = this.wheelImage.parentAnchor = Alignment.CENTER;
            this.addChild(this.wheelImage);
            this.wheelImage.visible = false;

            this.wheelImage2 = ImageElement.create(
                ResourceId.IMG_OBJ_HOOK_REGULATED,
                IMG_OBJ_HOOK_REGULATED_rope
            );
            this.wheelImage2.passTransformationsToChilds = false;

            this.wheelHighlight = ImageElement.create(
                ResourceId.IMG_OBJ_HOOK_REGULATED,
                IMG_OBJ_HOOK_REGULATED_active
            );
            this.wheelHighlight.anchor = this.wheelHighlight.parentAnchor = Alignment.CENTER;
            this.wheelImage2.addChild(this.wheelHighlight);

            this.wheelImage3 = ImageElement.create(
                ResourceId.IMG_OBJ_HOOK_REGULATED,
                IMG_OBJ_HOOK_REGULATED_top
            );
            this.wheelImage3.anchor =
                this.wheelImage3.parentAnchor =
                this.wheelImage2.anchor =
                this.wheelImage2.parentAnchor =
                    Alignment.CENTER;
            this.wheelImage2.addChild(this.wheelImage3);
            this.addChild(this.wheelImage2);
            this.wheelImage2.visible = false;
            this.wheelDirty = false;
        }
    }

    setMoveLength(length: number, vertical: boolean, offset: number) {
        this.moveLength = length;
        this.moveVertical = vertical;
        this.moveOffset = offset;

        if (this.moveLength > 0) {
            this.moveBackground = new GrabMoveBackground(length);
            this.moveBackground.rotationCenterX =
                -Math.round(this.moveBackground.width / 2) + resolution.GRAB_MOVE_BG_X_OFFSET;
            this.moveBackground.x = -resolution.GRAB_MOVE_BG_X_OFFSET;

            this.grabMoverHighlight = ImageElement.create(
                ResourceId.IMG_OBJ_HOOK_MOVABLE,
                IMG_OBJ_HOOK_MOVABLE_active
            );
            this.grabMoverHighlight.visible = false;
            this.grabMoverHighlight.anchor = this.grabMoverHighlight.parentAnchor =
                Alignment.CENTER;
            this.addChild(this.grabMoverHighlight);

            this.grabMover = ImageElement.create(
                ResourceId.IMG_OBJ_HOOK_MOVABLE,
                IMG_OBJ_HOOK_MOVABLE_top
            );
            this.grabMover.visible = false;
            this.grabMover.anchor = this.grabMover.parentAnchor = Alignment.CENTER;
            this.addChild(this.grabMover);
            this.grabMover.addChild(this.moveBackground);

            if (this.moveVertical) {
                this.moveBackground.rotation = 90;
                this.moveBackground.y = -this.moveOffset;
                this.minMoveValue = this.y - this.moveOffset;
                this.maxMoveValue = this.y + (this.moveLength - this.moveOffset);
                this.grabMover.rotation = 90;
                this.grabMoverHighlight.rotation = 90;
            } else {
                this.minMoveValue = this.x - this.moveOffset;
                this.maxMoveValue = this.x + (this.moveLength - this.moveOffset);
                this.moveBackground.x += -this.moveOffset;
            }
            this.moveBackground.anchor = Alignment.VCENTER | Alignment.LEFT;
            this.moveBackground.x += this.x;
            this.moveBackground.y += this.y;
            this.moveBackground.visible = false;
        }

        this.moverDragging = Constants.UNDEFINED;
    }

    setBee() {
        this.bee = ImageElement.create(ResourceId.IMG_OBJ_BEE_HD, IMG_OBJ_BEE_HD_obj_bee);
        this.bee.doRestoreCutTransparency();
        this.bee.parentAnchor = Alignment.CENTER;

        const wings = new Animation();
        wings.initTextureWithId(ResourceId.IMG_OBJ_BEE_HD);
        wings.parentAnchor = wings.anchor = Alignment.TOP | Alignment.LEFT;
        wings.doRestoreCutTransparency();
        wings.addAnimationDelay(
            0.03,
            Timeline.LoopType.PING_PONG,
            IMG_OBJ_BEE_HD_wings_start,
            IMG_OBJ_BEE_HD_wings_end
        );
        wings.playTimeline(0);
        wings.jumpTo(
            MathHelper.randomRange(0, IMG_OBJ_BEE_HD_wings_end - IMG_OBJ_BEE_HD_wings_start)
        );
        this.bee.addChild(wings);

        const texture = this.bee.texture;
        const p = texture?.offsets[IMG_OBJ_BEE_HD__rotation_center];
        if (p) {
            this.bee.x = -p.x;
            this.bee.y = -p.y;

            this.bee.rotationCenterX = p.x - this.bee.width / 2;
            this.bee.rotationCenterY = p.y - this.bee.width / 2;
        }
        this.bee.scaleX = this.bee.scaleY = 1 / 1.3;

        this.addChild(this.bee);
    }

    setSpider(hasSpider: boolean) {
        this.hasSpider = hasSpider;
        this.shouldActivate = false;
        this.spiderActive = false;

        this.spider = new Animation();
        this.spider.initTextureWithId(ResourceId.IMG_OBJ_SPIDER);
        this.spider.doRestoreCutTransparency();
        this.spider.anchor = Alignment.CENTER;
        this.spider.x = this.x;
        this.spider.y = this.y;
        this.spider.visible = false;

        // add spider animations
        this.spider.addAnimationEndpoints(
            SpiderState.START,
            0.05,
            Timeline.LoopType.NO_LOOP,
            IMG_OBJ_SPIDER_activation_start,
            IMG_OBJ_SPIDER_activation_end
        );
        this.spider.setDelay(0.4, 5, SpiderState.START);
        this.spider.addAnimationEndpoints(
            SpiderState.WALK,
            0.1,
            Timeline.LoopType.REPLAY,
            IMG_OBJ_SPIDER_crawl_start,
            IMG_OBJ_SPIDER_crawl_end
        );
        this.spider.switchToAnimation(SpiderState.WALK, SpiderState.START, 0.05);

        this.addChild(this.spider);
    }

    destroyRope() {
        this.rope = null;
    }
}

export default Grab;
