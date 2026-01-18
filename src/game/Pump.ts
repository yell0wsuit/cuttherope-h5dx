import GameObject from "@/visual/GameObject";
import Vector from "@/core/Vector";
import Radians from "@/utils/Radians";
import resolution from "@/resolution";

class Pump extends GameObject {
    angle: number;
    t1: Vector;
    t2: Vector;
    touchTimer: number;
    touch: number;
    private static readonly CONVEYOR_OFFSET = new Vector(0.8, -1.2);

    constructor() {
        super();
        this.angle = 0;
        this.t1 = Vector.newZero();
        this.t2 = Vector.newZero();
        this.touchTimer = 0;
        this.touch = 0;
    }

    updateRotation() {
        if (!this.bb) {
            return;
        }

        const bbHalfWidth = this.bb.w / 2;

        this.t1.x = this.x - bbHalfWidth;
        this.t2.x = this.x + bbHalfWidth;
        this.t1.y = this.t2.y = this.y;

        this.angle = Radians.fromDegrees(this.rotation);

        this.t1.rotateAround(this.angle, this.x, this.y);
        this.t2.rotateAround(this.angle, this.x, this.y);
    }

    getConveyorSize(): Vector {
        const bb = resolution.PUMP_BB;
        const scale = 0.48;
        return new Vector(bb.w * scale, bb.h * scale);
    }

    getConveyorPadding(): number {
        const size = this.getConveyorSize();
        return (size.x + size.y) / 4;
    }

    getConveyorPosition(): Vector {
        const offset = Pump.CONVEYOR_OFFSET.copy();
        offset.rotate(this.angle);
        return Vector.add(new Vector(this.x, this.y), offset);
    }

    setConveyorPosition(pos: Vector): void {
        const offset = Pump.CONVEYOR_OFFSET.copy();
        offset.rotate(this.angle);
        const adjusted = Vector.subtract(pos, offset);
        this.x = adjusted.x;
        this.y = adjusted.y;
    }
}

export default Pump;
