import CTRGameObject from "@/game/CTRGameObject";
import Animation from "@/visual/Animation";
import ResourceId from "@/resources/ResourceId";
import Alignment from "@/core/Alignment";
import Timeline from "@/visual/Timeline";
import KeyFrame from "@/visual/KeyFrame";
import RGBAColor from "@/core/RGBAColor";
import Rectangle from "@/core/Rectangle";
import Vector from "@/core/Vector";
import MathHelper from "@/utils/MathHelper";
import Mover from "@/utils/Mover";
import resolution from "@/resolution";
import GameObject from "@/visual/GameObject";
import SoundMgr from "@/game/CTRSoundMgr";
import Canvas from "@/utils/Canvas";

class StarLightUpAnim extends Animation {
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

const IMG_OBJ_STAR_IDLE_glow = 0;
const IMG_OBJ_STAR_IDLE_idle_start = 1;
const IMG_OBJ_STAR_IDLE_idle_end = 18;
const IMG_OBJ_STAR_IDLE_timed_start = 19;
const IMG_OBJ_STAR_IDLE_timed_end = 55;
const IMG_OBJ_STAR_NIGHT_glow = 0;
const IMG_OBJ_STAR_NIGHT_idle_off_start = 1;
const IMG_OBJ_STAR_NIGHT_idle_off_end = 18;
const IMG_OBJ_STAR_NIGHT_light_down_start = 19;
const IMG_OBJ_STAR_NIGHT_light_down_end = 24;
const IMG_OBJ_STAR_NIGHT_light_up_start = 25;
const IMG_OBJ_STAR_NIGHT_light_up_end = 30;
const STAR_LIGHT_SOUNDS = [ResourceId.SND_STAR_LIGHT_1, ResourceId.SND_STAR_LIGHT_2];
const STAR_CONVEYOR_SIZE_SCALE = 0.9;
const STAR_CONVEYOR_PADDING_JS = 8;
const JS_PM = 1.2;

class Star extends CTRGameObject {
    conveyorId = -1;
    time: number;
    timeout: number;
    timedAnim: Animation | null;
    isLit: boolean | null;
    private nightMode: boolean;
    private idleSprite: Animation | null;
    private dimmedIdleSprite: Animation | null;
    private glowSprite: GameObject | null;
    private lightUpAnim: Animation | null;
    private lightDownAnim: Animation | null;
    private bobTime = 0;

    constructor() {
        super();

        this.time = 0;
        this.timeout = 0;
        this.timedAnim = null;
        this.isLit = null;
        this.nightMode = false;
        this.idleSprite = null;
        this.dimmedIdleSprite = null;
        this.glowSprite = null;
        this.lightUpAnim = null;
        this.lightDownAnim = null;

        // typically we pixel align image coordinates, but the star animation
        // occurs along a small distance so we use a smaller increment so they
        // don't appear jerky. It's good to use a value that evenly divides 1
        // so that at least some of the positions are on pixel boundaries.
        this.drawPosIncrement = 0.0001;
    }

    enableNightMode(): void {
        this.nightMode = true;
    }

    createAnimations() {
        let t: Timeline;
        if (this.timeout > 0) {
            // create animation
            this.timedAnim = new Animation();
            this.timedAnim.initTextureWithId(ResourceId.IMG_OBJ_STAR_IDLE);
            this.timedAnim.anchor = this.timedAnim.parentAnchor = Alignment.CENTER;
            const delay =
                this.timeout / (IMG_OBJ_STAR_IDLE_timed_end - IMG_OBJ_STAR_IDLE_timed_start + 1);
            this.timedAnim.addAnimationEndpoints(
                0,
                delay,
                Timeline.LoopType.NO_LOOP,
                IMG_OBJ_STAR_IDLE_timed_start,
                IMG_OBJ_STAR_IDLE_timed_end
            );

            // play and add as child
            this.timedAnim.playTimeline(0);
            this.time = this.timeout;
            this.timedAnim.visible = false;
            this.addChild(this.timedAnim);

            // timeline for animation color fade
            const tt = new Timeline();
            tt.addKeyFrame(
                KeyFrame.makeColor(RGBAColor.solidOpaque.copy(), KeyFrame.TransitionType.LINEAR, 0)
            );
            tt.addKeyFrame(
                KeyFrame.makeColor(
                    RGBAColor.transparent.copy(),
                    KeyFrame.TransitionType.LINEAR,
                    0.5
                )
            );
            this.timedAnim.addTimelineWithID(tt, 1);

            // timeline for element scale and color fade
            t = new Timeline();
            t.addKeyFrame(KeyFrame.makeScale(1, 1, KeyFrame.TransitionType.LINEAR, 0));
            t.addKeyFrame(KeyFrame.makeScale(0, 0, KeyFrame.TransitionType.LINEAR, 0.25));
            t.addKeyFrame(
                KeyFrame.makeColor(RGBAColor.solidOpaque.copy(), KeyFrame.TransitionType.LINEAR, 0)
            );
            t.addKeyFrame(
                KeyFrame.makeColor(
                    RGBAColor.transparent.copy(),
                    KeyFrame.TransitionType.LINEAR,
                    0.25
                )
            );
            this.addTimelineWithID(t, 1);
        }

        this.bb = Rectangle.copy(resolution.STAR_DEFAULT_BB);
        this.bobTime = MathHelper.randomRange(0, 20) / 10;

        // idle star animation
        const sr = new Animation();
        sr.initTextureWithId(ResourceId.IMG_OBJ_STAR_IDLE);
        sr.doRestoreCutTransparency();
        sr.addAnimationDelay(
            0.05,
            Timeline.LoopType.REPLAY,
            IMG_OBJ_STAR_IDLE_idle_start,
            IMG_OBJ_STAR_IDLE_idle_end
        );
        sr.playTimeline(0);
        sr.getTimeline(0)?.update(MathHelper.randomRange(0, 20) / 10);
        sr.anchor = sr.parentAnchor = Alignment.CENTER;
        //sr.drawPosIncrement = 0.0001;

        this.idleSprite = sr;

        if (this.nightMode) {
            // Glow renders first (behind everything)
            this.glowSprite = new GameObject();
            this.glowSprite.initTextureWithId(ResourceId.IMG_OBJ_STAR_NIGHT);
            this.glowSprite.setTextureQuad(IMG_OBJ_STAR_NIGHT_glow);
            this.glowSprite.anchor = this.glowSprite.parentAnchor = Alignment.CENTER;
            this.glowSprite.color.a = 0.4;
            this.addChild(this.glowSprite);

            // Dimmed idle sprite (night mode off state)
            this.dimmedIdleSprite = new Animation();
            this.dimmedIdleSprite.initTextureWithId(ResourceId.IMG_OBJ_STAR_NIGHT);
            this.dimmedIdleSprite.anchor = this.dimmedIdleSprite.parentAnchor = Alignment.CENTER;
            //this.dimmedIdleSprite.doRestoreCutTransparency();
            this.dimmedIdleSprite.addAnimationDelay(
                0.05,
                Timeline.LoopType.REPLAY,
                IMG_OBJ_STAR_NIGHT_idle_off_start,
                IMG_OBJ_STAR_NIGHT_idle_off_end
            );
            this.dimmedIdleSprite.playTimeline(0);
            this.dimmedIdleSprite.color.a = 0;
            this.addChild(this.dimmedIdleSprite);
        }

        // Idle sprite renders on top of glow
        this.addChild(sr);

        if (this.nightMode) {
            this.lightUpAnim = new StarLightUpAnim();
            this.lightUpAnim.initTextureWithId(ResourceId.IMG_OBJ_STAR_NIGHT);
            this.lightUpAnim.anchor = this.lightUpAnim.parentAnchor = Alignment.CENTER;
            //this.lightUpAnim.doRestoreCutTransparency();
            this.lightUpAnim.addAnimationDelay(
                0.05,
                Timeline.LoopType.NO_LOOP,
                IMG_OBJ_STAR_NIGHT_light_up_start,
                IMG_OBJ_STAR_NIGHT_light_up_end
            );
            this.lightUpAnim.visible = false;
            this.addChild(this.lightUpAnim);

            this.lightDownAnim = new Animation();
            this.lightDownAnim.initTextureWithId(ResourceId.IMG_OBJ_STAR_NIGHT);
            this.lightDownAnim.anchor = this.lightDownAnim.parentAnchor = Alignment.CENTER;
            //this.lightDownAnim.doRestoreCutTransparency();
            this.lightDownAnim.addAnimationDelay(
                0.05,
                Timeline.LoopType.NO_LOOP,
                IMG_OBJ_STAR_NIGHT_light_down_start,
                IMG_OBJ_STAR_NIGHT_light_down_end
            );
            this.lightDownAnim.visible = false;
            this.addChild(this.lightDownAnim);

            this.updateNightVisibility();

            // Clear quadToDraw to prevent rendering quad 0 (glow)
            if (!this.isLit) {
                this.quadToDraw = undefined;
            }
        }
    }

    setLitState(isLit: boolean): void {
        if (!this.nightMode) {
            this.isLit = true;
            return;
        }

        if (this.isLit === isLit) {
            return;
        }

        const isInitial = this.isLit === null;
        this.isLit = isLit;

        if (isLit) {
            if (this.lightUpAnim && !isInitial) {
                this.lightUpAnim.visible = true;
                const timeline = this.lightUpAnim.getTimeline(0);
                if (timeline) {
                    timeline.onFinished = () => {
                        if (this.lightUpAnim) {
                            this.lightUpAnim.visible = false;
                        }
                    };
                }
                this.lightUpAnim.playTimeline(0);
            }
            if (!isInitial && STAR_LIGHT_SOUNDS.length > 0) {
                const index = MathHelper.randomRange(0, STAR_LIGHT_SOUNDS.length - 1);
                SoundMgr.playSound(STAR_LIGHT_SOUNDS[index]!);
            }
        } else if (this.lightDownAnim && !isInitial) {
            this.lightDownAnim.visible = true;
            const timeline = this.lightDownAnim.getTimeline(0);
            if (timeline) {
                timeline.onFinished = () => {
                    if (this.lightDownAnim) {
                        this.lightDownAnim.visible = false;
                    }
                };
            }
            this.lightDownAnim.playTimeline(0);
        } else if (isInitial) {
            if (this.glowSprite) {
                this.glowSprite.color.a = 0;
            }
            if (this.idleSprite) {
                this.idleSprite.color.a = 0;
            }
        }

        this.updateNightVisibility();
    }

    private updateNightVisibility(): void {
        if (!this.nightMode) {
            return;
        }
        if (this.glowSprite) {
            this.glowSprite.visible = true;
        }
        if (this.idleSprite) {
            this.idleSprite.visible = true;
        }
        if (this.dimmedIdleSprite) {
            this.dimmedIdleSprite.visible = true;
        }
    }

    private adjustNightAlpha(element: { color: RGBAColor } | null, delta: number): void {
        if (!element) {
            return;
        }
        const next = Math.min(1, Math.max(0, element.color.a + delta));
        element.color.a = next;
    }

    override update(delta: number) {
        if (this.timeout > 0) {
            if (this.time > 0) {
                this.time = Mover.moveToTarget(this.time, 0, 1, delta);
            }
        }
        if (this.nightMode) {
            const fadeStep = 0.1;
            if (this.isLit) {
                this.adjustNightAlpha(this.glowSprite, fadeStep);
                this.adjustNightAlpha(this.dimmedIdleSprite, -fadeStep);
                this.adjustNightAlpha(this.idleSprite, fadeStep);
            } else {
                this.adjustNightAlpha(this.glowSprite, -fadeStep);
                this.adjustNightAlpha(this.dimmedIdleSprite, fadeStep);
                this.adjustNightAlpha(this.idleSprite, -fadeStep);
            }
        }
        super.update(delta);
        this.updateBobOffset(delta);
    }

    private updateBobOffset(delta: number): void {
        this.bobTime += delta;
        const onConveyor = this.conveyorId !== -1;
        const offset = onConveyor ? 0 : 3 * Math.sin(3 * this.bobTime);
        for (const child of this.getChildren()) {
            child.y = offset;
        }
    }

    override draw() {
        if (this.timedAnim) {
            this.timedAnim.draw();
        }

        super.draw();
    }

    getConveyorSize(): Vector {
        const bb = this.bb ?? resolution.STAR_BB;
        return new Vector(bb.w * STAR_CONVEYOR_SIZE_SCALE, bb.h * STAR_CONVEYOR_SIZE_SCALE);
    }

    getConveyorPadding(): number {
        return (STAR_CONVEYOR_PADDING_JS * resolution.PM) / JS_PM;
    }
}

export default Star;
