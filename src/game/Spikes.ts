import CTRGameObject from "@/game/CTRGameObject";
import SoundMgr from "@/game/CTRSoundMgr";
import ResourceId from "@/resources/ResourceId";
import Vector from "@/core/Vector";
import Timeline from "@/visual/Timeline";
import Constants from "@/utils/Constants";
import Radians from "@/utils/Radians";
import Mover from "@/utils/Mover";
import ImageElement from "@/visual/ImageElement";
import GenericButton from "@/visual/GenericButton";
import Alignment from "@/core/Alignment";
import KeyFrame from "@/visual/KeyFrame";
import Canvas from "@/utils/Canvas";
import resolution from "@/resolution";

const SPIKES_HEIGHT = 10;

const IMG_OBJ_ELECTRODES_base = 0;
const IMG_OBJ_ELECTRODES_electric_start = 1;
const IMG_OBJ_ELECTRODES_electric_end = 4;

const SPIKES_ROTATION_BUTTON = 0;

const IMG_OBJ_ROTATABLE_SPIKES_01_Shape_3 = 0;
const IMG_OBJ_ROTATABLE_SPIKES_02_size_2 = 0;
const IMG_OBJ_ROTATABLE_SPIKES_03_size_3 = 0;
const IMG_OBJ_ROTATABLE_SPIKES_04_size_4 = 0;
const IMG_OBJ_ROTATABLE_SPIKES_BUTTON_button_1 = 0;
const IMG_OBJ_ROTATABLE_SPIKES_BUTTON_button_1_pressed = 1;
const IMG_OBJ_ROTATABLE_SPIKES_BUTTON_button_2 = 2;
const IMG_OBJ_ROTATABLE_SPIKES_BUTTON_button_2_pressed = 3;

const SpikeAnimation = {
    ELECTRODES_BASE: 0,
    ELECTRODES_ELECTRIC: 1,
    ROTATION_ADJUSTED: 2,
} as const;

class Spikes extends CTRGameObject {
    rotateButton: GenericButton | null;
    spikesNormal: boolean;
    originalRotation: number;
    t1: Vector;
    t2: Vector;
    b1: Vector;
    b2: Vector;
    electro: boolean;
    initialDelay: number;
    onTime: number;
    offTime: number;
    electroOn: boolean;
    electroTimer: number;
    electroInstanceKey: string;
    toggled: number;
    shouldUpdateRotation: boolean;
    touchIndex: number;
    angle: number;
    onButtonPressed: ((toggleId: number) => void) | null;

    constructor(px: number, py: number, width: number, angle: number, t: number) {
        super();

        // select and load the spikes image
        let imageId: number | undefined;
        if (t !== Constants.UNDEFINED) {
            imageId = ResourceId.IMG_OBJ_ROTATABLE_SPIKES_01 + width - 1;
        } else {
            switch (width) {
                case 1:
                    imageId = ResourceId.IMG_OBJ_SPIKES_01;
                    break;
                case 2:
                    imageId = ResourceId.IMG_OBJ_SPIKES_02;
                    break;
                case 3:
                    imageId = ResourceId.IMG_OBJ_SPIKES_03;
                    break;
                case 4:
                    imageId = ResourceId.IMG_OBJ_SPIKES_04;
                    break;
                case 5:
                    imageId = ResourceId.IMG_OBJ_ELECTRODES;
                    break;
                default:
                    imageId = ResourceId.IMG_OBJ_SPIKES_01;
                    break;
            }
        }
        this.initTextureWithId(imageId);
        this.rotateButton = null;

        if (t > 0) {
            this.doRestoreCutTransparency();
            const normalQuad = IMG_OBJ_ROTATABLE_SPIKES_BUTTON_button_1 + (t - 1) * 2;
            const pressedQuad = IMG_OBJ_ROTATABLE_SPIKES_BUTTON_button_1_pressed + (t - 1) * 2;
            const bup = ImageElement.create(ResourceId.IMG_OBJ_ROTATABLE_SPIKES_BUTTON, normalQuad);
            const bdown = ImageElement.create(
                ResourceId.IMG_OBJ_ROTATABLE_SPIKES_BUTTON,
                pressedQuad
            );

            bup.doRestoreCutTransparency();
            bdown.doRestoreCutTransparency();

            this.rotateButton = new GenericButton(SPIKES_ROTATION_BUTTON);
            this.rotateButton.initWithElements(bup, bdown);
            this.rotateButton.onButtonPressed = this.handleButtonPressed.bind(this);
            this.rotateButton.anchor = this.rotateButton.parentAnchor = Alignment.CENTER;
            this.addChild(this.rotateButton);

            // restore bounding box without alpha
            const buttonTexture = bup.texture;
            const vo = buttonTexture.offsets[normalQuad]!;
            const vr = buttonTexture.rects[normalQuad]!;
            const vs = new Vector(vr.w, vr.h);
            const vo2 = new Vector(buttonTexture.preCutSize.x, buttonTexture.preCutSize.y);

            vo2.subtract(vs);
            vo2.subtract(vo);

            this.rotateButton.setTouchIncrease(
                -vo.x + vs.x / 2,
                -vo2.x + vs.x / 2,
                -vo.y + vs.y / 2,
                -vo2.y + vs.y / 2
            );
        }

        this.passColorToChilds = false;
        this.spikesNormal = false;
        this.originalRotation = this.rotation = angle;

        this.t1 = Vector.newZero();
        this.t2 = Vector.newZero();
        this.b1 = Vector.newZero();
        this.b2 = Vector.newZero();

        this.electro = false;
        this.initialDelay = 0;
        this.onTime = 0;
        this.offTime = 0;
        this.electroOn = false;
        this.electroTimer = 0;

        this.x = px;
        this.y = py;

        // Generate unique instance key for this spike's electric sound
        // Using position ensures each spike has its own independent sound loop
        this.electroInstanceKey = `${Math.round(px)}_${Math.round(py)}`;

        this.toggled = Constants.UNDEFINED;
        this.onButtonPressed = null;
        this.shouldUpdateRotation = false;
        this.touchIndex = Constants.UNDEFINED;
        this.angle = 0;

        this.setToggled(t);
        this.updateRotation();

        if (width === 5) {
            this.addAnimationEndpoints(
                SpikeAnimation.ELECTRODES_BASE,
                0.05,
                Timeline.LoopType.REPLAY,
                IMG_OBJ_ELECTRODES_base,
                IMG_OBJ_ELECTRODES_base
            );
            this.addAnimationEndpoints(
                SpikeAnimation.ELECTRODES_ELECTRIC,
                0.05,
                Timeline.LoopType.REPLAY,
                IMG_OBJ_ELECTRODES_electric_start,
                IMG_OBJ_ELECTRODES_electric_end
            );
            this.doRestoreCutTransparency();
        }
        this.touchIndex = Constants.UNDEFINED;
    }

    updateRotation() {
        const texture = this.texture;
        if (!texture) {
            return;
        }

        const quadIndex = this.quadToDraw;
        const rect = quadIndex !== undefined ? texture.rects[quadIndex] : null;

        let pWidth = this.electro
            ? this.width - 400 * resolution.CANVAS_SCALE
            : (rect?.w ?? this.width);

        pWidth /= 2;

        this.t1.x = this.x - pWidth;
        this.t2.x = this.x + pWidth;
        this.t1.y = this.t2.y = this.y - SPIKES_HEIGHT / 2.0;

        this.b1.x = this.t1.x;
        this.b2.x = this.t2.x;
        this.b1.y = this.b2.y = this.y + SPIKES_HEIGHT / 2.0;

        this.angle = Radians.fromDegrees(this.rotation);

        this.t1.rotateAround(this.angle, this.x, this.y);
        this.t2.rotateAround(this.angle, this.x, this.y);
        this.b1.rotateAround(this.angle, this.x, this.y);
        this.b2.rotateAround(this.angle, this.x, this.y);
    }

    turnElectroOn() {
        this.electroOn = true;
        this.playTimeline(SpikeAnimation.ELECTRODES_ELECTRIC);
        this.electroTimer = this.onTime;

        // Use instance key and optional delay based on initialDelay
        // Convert initialDelay (in seconds) to milliseconds
        // Add small random offset (0-30ms) to prevent exact simultaneous playback
        const delayMs = Math.max(0, this.initialDelay * 1000) + Math.random() * 30;

        SoundMgr.playLoopedSound(ResourceId.SND_ELECTRIC, this.electroInstanceKey, delayMs);
    }

    turnElectroOff() {
        this.electroOn = false;
        this.playTimeline(SpikeAnimation.ELECTRODES_BASE);
        this.electroTimer = this.offTime;

        // Stop only this spike's sound instance
        SoundMgr.stopLoopedSoundInstance(ResourceId.SND_ELECTRIC, this.electroInstanceKey);
    }

    override update(delta: number) {
        super.update(delta);

        if (this.mover || this.shouldUpdateRotation) {
            this.updateRotation();
        }

        if (this.electro) {
            if (this.electroOn) {
                this.electroTimer = Mover.moveToTarget(this.electroTimer, 0, 1, delta);
                if (this.electroTimer === 0) {
                    this.turnElectroOff();
                }
            } else {
                this.electroTimer = Mover.moveToTarget(this.electroTimer, 0, 1, delta);
                if (this.electroTimer === 0) {
                    this.turnElectroOn();
                }
            }
        }
    }

    setToggled(t: number) {
        this.toggled = t;
    }

    getToggled(): number {
        return this.toggled;
    }

    rotateSpikes() {
        this.spikesNormal = !this.spikesNormal;
        this.removeTimeline(SpikeAnimation.ROTATION_ADJUSTED);

        const rDelta = this.spikesNormal ? 90 : 0;
        const adjustedRotation = this.originalRotation + rDelta;
        const tl = new Timeline();
        tl.addKeyFrame(KeyFrame.makeRotation(this.rotation, KeyFrame.TransitionType.LINEAR, 0));
        tl.addKeyFrame(
            KeyFrame.makeRotation(
                adjustedRotation,
                KeyFrame.TransitionType.EASE_OUT,
                (Math.abs(adjustedRotation - this.rotation) / 90) * 0.3
            )
        );
        tl.onFinished = this.timelineFinished.bind(this);

        this.addTimelineWithID(tl, SpikeAnimation.ROTATION_ADJUSTED);
        this.playTimeline(SpikeAnimation.ROTATION_ADJUSTED);
        this.shouldUpdateRotation = true;
        if (this.rotateButton) {
            this.rotateButton.scaleX = -this.rotateButton.scaleX;
        }
    }

    private timelineFinished(t: Timeline) {
        // update rotation one last time now that timeline is complete
        this.updateRotation();
        this.shouldUpdateRotation = false;
    }

    private handleButtonPressed(buttonId: number) {
        if (buttonId === SPIKES_ROTATION_BUTTON) {
            if (this.onButtonPressed && this.toggled) {
                this.onButtonPressed(this.toggled);
            }

            if (this.spikesNormal) {
                SoundMgr.playSound(ResourceId.SND_SPIKE_ROTATE_IN);
            } else {
                SoundMgr.playSound(ResourceId.SND_SPIKE_ROTATE_OUT);
            }
        }
    }

    override drawBB() {
        const ctx = Canvas.context;
        if (ctx) {
            ctx.beginPath();
            ctx.strokeStyle = "red";
            ctx.moveTo(this.t1.x, this.t1.y);
            ctx.lineTo(this.t2.x, this.t2.y);
            ctx.lineTo(this.b2.x, this.b2.y);
            ctx.lineTo(this.b1.x, this.b1.y);
            ctx.lineTo(this.t1.x, this.t1.y);
            ctx.closePath();
            ctx.stroke();
        }
    }
}

export default Spikes;
