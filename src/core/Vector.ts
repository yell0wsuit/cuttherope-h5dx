export interface VectorLike {
    x: number;
    y: number;
}

class Vector {
    static readonly zero = new Vector(0, 0);

    static readonly undefined = Vector.newUndefined();

    private static readonly _tmpBezierX: number[] = new Array<number>(64).fill(0);

    private static readonly _tmpBezierY: number[] = new Array<number>(64).fill(0);

    constructor(
        public x: number,
        public y: number
    ) {}

    /**
     *  Convenience method to create a new zero-based vector
     */
    static newZero(): Vector {
        return new Vector(0, 0);
    }

    static newUndefined(): Vector {
        const undefinedValue = 0x7fffffff;
        return new Vector(undefinedValue, undefinedValue);
    }

    static add(v1: VectorLike, v2: VectorLike): Vector {
        return new Vector(v1.x + v2.x, v1.y + v2.y);
    }

    static subtract(v1: VectorLike, v2: VectorLike): Vector {
        return new Vector(v1.x - v2.x, v1.y - v2.y);
    }

    static multiply(v: VectorLike, s: number): Vector {
        return new Vector(v.x * s, v.y * s);
    }

    static divide(v: VectorLike, s: number): Vector {
        return new Vector(v.x / s, v.y / s);
    }

    static distance(x1: number, y1: number, x2: number, y2: number): number {
        const tx = x1 - x2;
        const ty = y1 - y2;
        const dot = tx * tx + ty * ty;
        return Math.sqrt(dot);
    }

    static perpendicular(v: VectorLike): Vector {
        return new Vector(-v.y, v.x);
    }

    static rPerpendicular(v: VectorLike): Vector {
        return new Vector(v.y, -v.x);
    }

    static normalize(v: Vector): Vector {
        return this.multiply(v, 1 / v.getLength());
    }

    static negate(v: VectorLike): Vector {
        return new Vector(-v.x, -v.y);
    }

    static calcPathBezier(points: readonly VectorLike[], delta: number): Vector {
        const result = new Vector(0, 0);
        Vector.setCalcPathBezier(points, delta, result);
        return result;
    }

    static setCalcPathBezier(points: readonly VectorLike[], delta: number, result: Vector): void {
        let count = points.length;
        if (count <= 1) {
            result.x = 0;
            result.y = 0;
            return;
        }

        const xs = Vector._tmpBezierX;
        const ys = Vector._tmpBezierY;
        const d1 = 1 - delta;

        for (let j = 0; j < count; j++) {
            const point = points[j];
            if (!point) {
                continue;
            }
            xs[j] = point.x;
            ys[j] = point.y;
        }

        let countMinusOne = count - 1;
        for (; countMinusOne > 0; count--, countMinusOne--) {
            let i = 0;
            let iPlusOne = 1;
            for (; i < countMinusOne; i++, iPlusOne++) {
                const currentX = xs[i];
                const nextX = xs[iPlusOne];
                if (currentX === undefined || nextX === undefined) {
                    continue;
                }
                xs[i] = currentX * d1 + nextX * delta;

                const currentY = ys[i];
                const nextY = ys[iPlusOne];
                if (currentY === undefined || nextY === undefined) {
                    continue;
                }
                ys[i] = currentY * d1 + nextY * delta;
            }
        }
        result.x = xs[0] ?? 0;
        result.y = ys[0] ?? 0;
    }

    static forAngle(angle: number): Vector {
        return new Vector(Math.cos(angle), Math.sin(angle));
    }

    getLength(): number {
        const dot = this.x * this.x + this.y * this.y;
        return Math.sqrt(dot);
    }

    getDot(v2: VectorLike): number {
        return this.x * v2.x + this.y * v2.y;
    }

    isZero(): boolean {
        return this.x === 0 && this.y === 0;
    }

    equals(v2: VectorLike): boolean {
        return this.x === v2.x && this.y === v2.y;
    }

    setToZero(): void {
        this.x = 0;
        this.y = 0;
    }

    angle(): number {
        return Math.atan(this.y / this.x);
    }

    normalizedAngle(): number {
        return Math.atan2(this.y, this.x);
    }

    copy(): Vector {
        return new Vector(this.x, this.y);
    }

    copyFrom(v: VectorLike): void {
        this.x = v.x;
        this.y = v.y;
    }

    round(): void {
        this.x = Math.round(this.x);
        this.y = Math.round(this.y);
    }

    rotate(rad: number): void {
        const cosA = Math.cos(rad);
        const sinA = Math.sin(rad);
        const nx = this.x * cosA - this.y * sinA;
        const ny = this.x * sinA + this.y * cosA;

        this.x = nx;
        this.y = ny;
    }

    rotateAround(rad: number, cx: number, cy: number): void {
        this.x -= cx;
        this.y -= cy;

        this.rotate(rad);

        this.x += cx;
        this.y += cy;
    }

    toString(): string {
        return `[${this.x}, ${this.y}]`;
    }

    add(v2: VectorLike): void {
        this.x += v2.x;
        this.y += v2.y;
    }

    subtract(v2: VectorLike): void {
        this.x -= v2.x;
        this.y -= v2.y;
    }

    multiply(s: number): void {
        this.x *= s;
        this.y *= s;
    }

    divide(s: number): void {
        this.x /= s;
        this.y /= s;
    }

    distance(v2: VectorLike): number {
        const tx = this.x - v2.x;
        const ty = this.y - v2.y;
        const dot = tx * tx + ty * ty;
        return Math.sqrt(dot);
    }

    normalize(): void {
        this.multiply(1 / this.getLength());
    }
}

export default Vector;
