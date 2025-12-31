import Constants from "@/utils/Constants";

/**
 * Math utility class providing various mathematical helper functions
 */
class MathHelper {
    /**
     * Fits value v to [minV, maxV]
     * @param v value
     * @param minV
     * @param maxV
     * @return number
     */
    static fitToBoundaries(v: number, minV: number, maxV: number): number {
        return Math.max(Math.min(v, maxV), minV);
    }

    /**
     * Returns true if values have the same sign
     * @param x
     * @param y
     * @return boolean
     */
    static sameSign(x: number, y: number): boolean {
        return x < 0 === y < 0;
    }

    /**
     * Returns a random integer from the interval
     * @param from
     * @param to
     */
    static randomRange(from: number, to: number): number {
        return Math.floor(Math.random() * (to - from + 1) + from);
    }

    static randomBool(): boolean {
        return Math.random() > 0.5;
    }

    static randomMinus1to1(): number {
        return Math.random() * 2 - 1;
    }

    /**
     * Returns the max of 4 numbers
     * @param v1
     * @param v2
     * @param v3
     * @param v4
     * @return number
     */
    static maxOf4(v1: number, v2: number, v3: number, v4: number): number {
        if (v1 >= v2 && v1 >= v3 && v1 >= v4) {
            return v1;
        }
        if (v2 >= v1 && v2 >= v3 && v2 >= v4) {
            return v2;
        }
        if (v3 >= v2 && v3 >= v1 && v3 >= v4) {
            return v3;
        }
        if (v4 >= v2 && v4 >= v3 && v4 >= v1) {
            return v4;
        }

        return Constants.UNDEFINED;
    }

    /**
     * Returns the minimum of 4 numbers
     * @param v1
     * @param v2
     * @param v3
     * @param v4
     * @return number
     */
    static minOf4(v1: number, v2: number, v3: number, v4: number): number {
        if (v1 <= v2 && v1 <= v3 && v1 <= v4) {
            return v1;
        }
        if (v2 <= v1 && v2 <= v3 && v2 <= v4) {
            return v2;
        }
        if (v3 <= v2 && v3 <= v1 && v3 <= v4) {
            return v3;
        }
        if (v4 <= v2 && v4 <= v3 && v4 <= v1) {
            return v4;
        }

        return Constants.UNDEFINED;
    }

    /**
     * @return boolean
     */
    static lineInLine(
        x1: number,
        y1: number,
        x2: number,
        y2: number,
        x3: number,
        y3: number,
        x4: number,
        y4: number
    ): boolean {
        const DPx = x3 - x1 + x4 - x2;
        const DPy = y3 - y1 + y4 - y2;
        const QAx = x2 - x1;
        const QAy = y2 - y1;
        const QBx = x4 - x3;
        const QBy = y4 - y3;
        const d = QAy * QBx - QBy * QAx;
        const la = QBx * DPy - QBy * DPx;
        const lb = QAx * DPy - QAy * DPx;

        const absD = Math.abs(d);
        return Math.abs(la) <= absD && Math.abs(lb) <= absD;
    }

    // round to arbitrary precision
    static roundPrecision(value: number, precision: number): number {
        const scalar = Math.pow(10, precision);
        return Math.round(value * scalar) / scalar;
    }

    // round to 2 decimals of precision
    static roundP2(value: number): number {
        return Math.round(value * 100) / 100;
    }
}

export default MathHelper;
