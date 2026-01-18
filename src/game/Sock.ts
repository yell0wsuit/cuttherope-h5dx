import CTRGameObject from "@/game/CTRGameObject";
import Animation from "@/visual/Animation";
import ResourceId from "@/resources/ResourceId";
import Alignment from "@/core/Alignment";
import Timeline from "@/visual/Timeline";
import resolution from "@/resolution";
import Vector from "@/core/Vector";
import Radians from "@/utils/Radians";
import { IS_XMAS } from "@/utils/SpecialEvents";

const hatOrSock = IS_XMAS ? ResourceId.IMG_OBJ_SOCKS_XMAS : ResourceId.IMG_OBJ_SOCKS;

const SOCK_CONVEYOR_SIZE_SCALE = 0.28;
const SOCK_CONVEYOR_OFFSET = new Vector(-2.1, 16);
const CONVEYOR_PM = 1.2;

class Sock extends CTRGameObject {
    static readonly Quads = {
        IMG_OBJ_SOCKS_hat_01: 0,
        IMG_OBJ_SOCKS_hat_02: 1,
        IMG_OBJ_SOCKS_glow_start: 2,
        IMG_OBJ_SOCKS_level: 3,
        IMG_OBJ_SOCKS_glow_end: 4,
    } as const;

    static readonly StateType = {
        RECEIVING: 0,
        THROWING: 1,
        IDLE: 2,
    } as const;

    static readonly IDLE_TIMEOUT = 0.8;

    group: number;
    angle: number;
    t1: Vector;
    t2: Vector;
    b1: Vector;
    b2: Vector;
    idleTimeout: number;
    light: Animation | null;

    constructor() {
        super();

        this.group = 0;
        this.angle = 0;
        this.t1 = new Vector(0, 0);
        this.t2 = new Vector(0, 0);
        this.b1 = new Vector(0, 0);
        this.b2 = new Vector(0, 0);

        this.idleTimeout = 0;
        this.light = null;
    }

    createAnimations() {
        this.light = new Animation();
        this.light.initTextureWithId(hatOrSock);
        this.light.anchor = Alignment.BOTTOM | Alignment.HCENTER;
        this.light.parentAnchor = Alignment.TOP | Alignment.HCENTER;

        // Move glow up a bit more for Christmas sock
        this.light.y = IS_XMAS ? resolution.SOCK_LIGHT_Y - 20 : resolution.SOCK_LIGHT_Y;
        this.light.x = 0;
        this.light.addAnimationSequence(0, 0.05, Timeline.LoopType.NO_LOOP, 4, [
            Sock.Quads.IMG_OBJ_SOCKS_glow_start,
            Sock.Quads.IMG_OBJ_SOCKS_glow_start + 1,
            Sock.Quads.IMG_OBJ_SOCKS_glow_start + 2,
            Sock.Quads.IMG_OBJ_SOCKS_glow_end,
        ]);
        this.light.doRestoreCutTransparency();
        this.light.visible = false;
        this.addChild(this.light);
    }

    /**
     * Play the glow animation when candy goes in
     */
    playGlowAnimation() {
        if (this.light) {
            this.light.visible = true;
            //this.light.play(0);
        }
    }

    updateRotation() {
        this.t1.x = this.x - resolution.SOCK_WIDTH / 2;
        this.t2.x = this.x + resolution.SOCK_WIDTH / 2;
        this.t1.y = this.t2.y = this.y;

        this.b1.x = this.t1.x;
        this.b2.x = this.t2.x;
        this.b1.y = this.b2.y = this.y + resolution.SOCK_ROTATION_Y_OFFSET;

        this.angle = Radians.fromDegrees(this.rotation);

        this.t1.rotateAround(this.angle, this.x, this.y);
        this.t2.rotateAround(this.angle, this.x, this.y);
        this.b1.rotateAround(this.angle, this.x, this.y);
        this.b2.rotateAround(this.angle, this.x, this.y);
    }

    override draw() {
        super.draw();

        // Hide light after animation completes
        if (!this.light) {
            return;
        }
        const tl = this.light.currentTimeline;
        if (tl && tl.state === Timeline.StateType.STOPPED && this.light.visible) {
            this.light.visible = false;
        }
    }

    override drawBB() {
        // DEBUG: draw bounding lines for transport area
        /*if (false) {
            const ctx = Canvas.context;
            if (ctx) {
                ctx.lineWidth = 3;

                ctx.beginPath();
                ctx.strokeStyle = "red";
                ctx.moveTo(this.t1.x, this.t1.y);
                ctx.lineTo(this.t2.x, this.t2.y);
                ctx.stroke();

                ctx.beginPath();
                ctx.strokeStyle = "blue";
                ctx.moveTo(this.b1.x, this.b1.y);
                ctx.lineTo(this.b2.x, this.b2.y);
                ctx.stroke();
            }
        }*/
    }

    override update(delta: number) {
        super.update(delta);
        if (this.mover) {
            this.updateRotation();
        }
    }

    getConveyorSize(): Vector {
        return new Vector(
            this.width * SOCK_CONVEYOR_SIZE_SCALE,
            this.height * SOCK_CONVEYOR_SIZE_SCALE
        );
    }

    getConveyorPadding(): number {
        const size = this.getConveyorSize();
        return (size.x + size.y) / 4;
    }

    getConveyorPosition(): Vector {
        const pmScale = resolution.PM / CONVEYOR_PM;
        const offset = new Vector(
            SOCK_CONVEYOR_OFFSET.x * pmScale,
            SOCK_CONVEYOR_OFFSET.y * pmScale
        );
        offset.rotate(this.angle);
        return Vector.add(new Vector(this.x, this.y), offset);
    }

    setConveyorPosition(pos: Vector): void {
        const pmScale = resolution.PM / CONVEYOR_PM;
        const offset = new Vector(
            SOCK_CONVEYOR_OFFSET.x * pmScale,
            SOCK_CONVEYOR_OFFSET.y * pmScale
        );
        offset.rotate(this.angle);
        const adjusted = Vector.subtract(pos, offset);
        this.x = adjusted.x;
        this.y = adjusted.y;
    }
}

export default Sock;
