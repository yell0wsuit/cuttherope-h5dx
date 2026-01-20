import Vector from "@/core/Vector";
import Canvas from "@/utils/Canvas";
import MathHelper from "@/utils/MathHelper";

const SpeedType = {
    PIXELS: 0, // camera will move with speed pixels per second
    DELAY: 1, // camera will reach the target position in 1/speed seconds
} as const;

type CameraSpeedType = (typeof SpeedType)[keyof typeof SpeedType];

class Camera2D {
    static readonly SpeedType = SpeedType;

    speed: number;
    type: CameraSpeedType;
    pos: Vector;
    prevPos: Vector;
    target: Vector;
    offset: Vector;

    constructor(speed: number, cameraSpeed: CameraSpeedType) {
        this.speed = speed;
        this.type = cameraSpeed;
        this.pos = Vector.newZero();
        this.prevPos = Vector.newZero();
        this.target = Vector.newZero();
        this.offset = Vector.newZero();
    }

    // Changes the camera position (but doesn't actually transform the canvas)
    moveTo(x: number, y: number, immediate: boolean): void {
        this.target.x = x;
        this.target.y = y;

        if (immediate) {
            this.pos.copyFrom(this.target);
            this.prevPos.copyFrom(this.target);
        } else if (this.type === Camera2D.SpeedType.DELAY) {
            this.offset = Vector.subtract(this.target, this.pos);
            this.offset.multiply(this.speed);
        } else if (this.type === Camera2D.SpeedType.PIXELS) {
            this.offset = Vector.subtract(this.target, this.pos);
            this.offset.normalize();
            this.offset.multiply(this.speed);
        }
    }

    update(delta: number): void {
        // Store previous position for interpolation
        this.prevPos.copyFrom(this.pos);

        if (!this.pos.equals(this.target)) {
            // add to the current position and round
            this.pos.add(Vector.multiply(this.offset, delta));
            this.pos.round();

            // see if we passed the target
            if (
                !MathHelper.sameSign(this.offset.x, this.target.x - this.pos.x) ||
                !MathHelper.sameSign(this.offset.y, this.target.y - this.pos.y)
            ) {
                this.pos.copyFrom(this.target);
            }

            //console.log('camera pos update x:' + this.pos.x + ' y:' + this.pos.y);
        }
    }

    applyCameraTransformation(): void {
        if ((this.pos.x !== 0 || this.pos.y !== 0) && Canvas.context) {
            Canvas.context.translate(-this.pos.x, -this.pos.y);
        }
    }

    cancelCameraTransformation(): void {
        if ((this.pos.x !== 0 || this.pos.y !== 0) && Canvas.context) {
            Canvas.context.translate(this.pos.x, this.pos.y);
        }
    }

    /**
     * Applies interpolated camera transformation for smooth rendering on high refresh displays.
     * @param alpha Interpolation factor between 0 (prevPos) and 1 (pos)
     * @returns The interpolated position used for the transformation
     */
    applyInterpolatedTransformation(alpha: number): Vector {
        const clampedAlpha = Math.min(Math.max(alpha, 0), 1);
        const interpX = this.prevPos.x + (this.pos.x - this.prevPos.x) * clampedAlpha;
        const interpY = this.prevPos.y + (this.pos.y - this.prevPos.y) * clampedAlpha;

        if ((interpX !== 0 || interpY !== 0) && Canvas.context) {
            Canvas.context.translate(-interpX, -interpY);
        }

        return new Vector(interpX, interpY);
    }

    /**
     * Cancels an interpolated camera transformation.
     * @param interpPos The interpolated position returned by applyInterpolatedTransformation
     */
    cancelInterpolatedTransformation(interpPos: Vector): void {
        if ((interpPos.x !== 0 || interpPos.y !== 0) && Canvas.context) {
            Canvas.context.translate(interpPos.x, interpPos.y);
        }
    }
}

export default Camera2D;
