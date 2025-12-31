import MathHelper from "@/utils/MathHelper";
import Vector from "@/core/Vector";

class Mover {
    static readonly MAX_CAPACITY = 100;

    readonly path: Vector[] = [];

    readonly moveSpeed: number[];

    readonly pos: Vector = new Vector(0, 0);

    angle = 0;

    targetPoint = 0;

    offset: Vector = new Vector(0, 0);

    paused = false;

    reverse = false;

    overrun = 0;

    constructor(
        readonly pathCapacity: number,
        moveSpeed: number,
        public rotateSpeed = 0
    ) {
        const capacity = pathCapacity > 0 ? pathCapacity : 0;
        this.moveSpeed = new Array<number>(capacity);
        if (capacity > 0) {
            for (let i = 0; i < capacity; i++) {
                this.moveSpeed[i] = moveSpeed || 0;
            }
        }
    }

    setMoveSpeed(speed: number): void {
        for (let i = 0, len = this.pathCapacity; i < len; i++) {
            this.moveSpeed[i] = speed;
        }
    }

    setPathFromString(path: string, start: Vector): void {
        if (path.length === 0) {
            return;
        }

        if (path[0] === "R") {
            const clockwise = path[1] === "C";
            const rad = parseInt(path.slice(2), 10);
            const pointsCount = rad / 2;
            let kIncrement = (2 * Math.PI) / pointsCount;
            let theta = 0;

            if (!clockwise) {
                kIncrement = -kIncrement;
            }

            for (let i = 0; i < pointsCount; ++i) {
                const nx = start.x + rad * Math.cos(theta);
                const ny = start.y + rad * Math.sin(theta);

                this.addPathPoint(new Vector(nx, ny));
                theta += kIncrement;
            }
        } else {
            this.addPathPoint(start.copy());

            let pathString = path;

            // remove the trailing comma
            if (pathString[pathString.length - 1] === ",") {
                pathString = pathString.slice(0, pathString.length - 1);
            }

            const parts = pathString.split(",");
            const len = parts.length;

            for (let i = 0; i < len; i += 2) {
                const xs = parseFloat(parts[i]!);
                const ys = parseFloat(parts[i + 1]!);
                const pathPoint = new Vector(start.x + xs, start.y + ys);
                this.addPathPoint(pathPoint);
            }
        }
    }

    addPathPoint(pathPoint: Vector): void {
        this.path.push(pathPoint);
    }

    start(): void {
        if (this.path.length > 0) {
            this.pos.copyFrom(this.path[0]!);
            this.targetPoint = 1 % this.path.length;
            this.calculateOffset();
        }
    }

    pause(): void {
        this.paused = true;
    }

    unpause(): void {
        this.paused = false;
    }

    setRotateSpeed(rotateSpeed: number): void {
        this.rotateSpeed = rotateSpeed;
    }

    jumpToPoint(point: number): void {
        if (!this.path[point]) {
            return;
        }

        this.targetPoint = point;
        this.pos.copyFrom(this.path[point]!);
        this.calculateOffset();
    }

    private calculateOffset(): void {
        const target = this.path[this.targetPoint];
        if (!target) {
            this.offset.setToZero();
            return;
        }

        this.offset = Vector.subtract(target, this.pos);
        if (this.offset.isZero()) {
            this.offset.setToZero();
            return;
        }

        this.offset.normalize();
        const targetSpeed = this.moveSpeed[this.targetPoint] ?? 0;
        this.offset.multiply(targetSpeed);
    }

    setMoveSpeedAt(moveSpeed: number, index: number): void {
        this.moveSpeed[index] = moveSpeed;
    }

    setMoveReverse(reverse: boolean): void {
        this.reverse = reverse;
    }

    update(delta: number): void {
        if (this.paused) {
            return;
        }

        if (this.path.length > 0) {
            const target = this.path[this.targetPoint];
            if (!target) {
                return;
            }

            let switchPoint = false;

            if (!this.pos.equals(target)) {
                let rdelta = delta;
                if (this.overrun !== 0) {
                    rdelta += this.overrun;
                    this.overrun = 0;
                }

                this.pos.add(Vector.multiply(this.offset, rdelta));

                // see if we passed the target
                if (
                    !MathHelper.sameSign(this.offset.x, target.x - this.pos.x) ||
                    !MathHelper.sameSign(this.offset.y, target.y - this.pos.y)
                ) {
                    this.overrun = Vector.subtract(this.pos, target).getLength();

                    // overrun in seconds
                    const offsetLength = this.offset.getLength();
                    if (offsetLength !== 0) {
                        this.overrun /= offsetLength;
                    }
                    this.pos.copyFrom(target);
                    switchPoint = true;
                }
            } else {
                switchPoint = true;
            }

            if (switchPoint) {
                if (this.reverse) {
                    this.targetPoint--;
                    if (this.targetPoint < 0) {
                        this.targetPoint = this.path.length - 1;
                    }
                } else {
                    this.targetPoint++;
                    if (this.targetPoint >= this.path.length) {
                        this.targetPoint = 0;
                    }
                }

                this.calculateOffset();
            }
        }

        if (this.rotateSpeed !== 0) {
            this.angle += this.rotateSpeed * delta;
        }
    }

    static moveToTarget(v: number, t: number, speed: number, delta: number): number {
        if (t !== v) {
            if (t > v) {
                v += speed * delta;
                if (v > t) {
                    v = t;
                }
            } else {
                v -= speed * delta;
                if (v < t) {
                    v = t;
                }
            }
        }
        return v;
    }

    static moveToTargetWithStatus(
        v: number,
        t: number,
        speed: number,
        delta: number
    ): { value: number; reachedZero: boolean } {
        let reachedZero = false;
        if (t !== v) {
            if (t > v) {
                v += speed * delta;
                if (v > t) {
                    v = t;
                }
            } else {
                v -= speed * delta;
                if (v < t) {
                    v = t;
                }
            }
            if (t === v) {
                reachedZero = true;
            }
        }

        return {
            value: v,
            reachedZero,
        };
    }
}

export default Mover;
