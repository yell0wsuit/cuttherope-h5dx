import ConstraintType from "@/physics/ConstraintType";
import MaterialPoint from "@/physics/MaterialPoint";
import Vector from "@/core/Vector";
import Constants from "@/utils/Constants";
import Gravity from "@/physics/Gravity";

class Constraint {
    cp: ConstrainedPoint;
    restLength: number;
    type: number;

    constructor(cp: ConstrainedPoint, restLength: number, type: number) {
        this.cp = cp;
        this.restLength = restLength;
        this.type = type;
    }
}

class ConstrainedPoint extends MaterialPoint {
    prevPos: Vector;
    pin: Vector;
    constraints: Constraint[];

    constructor() {
        super();
        this.prevPos = new Vector(Constants.INT_MAX, Constants.INT_MAX);
        this.pin = new Vector(Constants.UNDEFINED, Constants.UNDEFINED);
        this.constraints = [];
        this.totalForce = Vector.newZero();
    }

    /**
     * Resets the point by clearing previous position and removing constraints
     */
    override resetAll(): void {
        super.resetAll();
        this.prevPos.x = Constants.INT_MAX;
        this.prevPos.y = Constants.INT_MAX;
        this.removeConstraints();
    }

    /**
     * removes all constraints
     */
    removeConstraints(): void {
        this.constraints = [];
    }

    /**
     * Add a new constraint
     */
    addConstraint(cp: ConstrainedPoint, restLength: number, type: number): void {
        const ct = new Constraint(cp, restLength, type);
        this.constraints.push(ct);
    }

    /**
     * Removes the specified constraint
     */
    removeConstraint(cp: ConstrainedPoint): void {
        const constraints = this.constraints;
        const len = constraints.length;
        for (let i = 0; i < len; i++) {
            const constraint = constraints[i];
            if (constraint && constraint.cp === cp) {
                constraints.splice(i, 1);
                return;
            }
        }
    }

    /**
     * Removes the constraint at the specified index
     */
    removeConstraintAtIndex(index: number): void {
        this.constraints.splice(index, 1);
    }

    changeConstraint(fromCp: ConstrainedPoint, toCp: ConstrainedPoint): void {
        const constraints = this.constraints;
        const len = constraints.length;
        for (let i = 0; i < len; i++) {
            const constraint = constraints[i];
            if (constraint && constraint.cp === fromCp) {
                constraint.cp = toCp;
                return;
            }
        }
    }

    /**
     * Returns true if the constrained point is used by a constraint in the system
     */
    hasConstraint(cp: ConstrainedPoint): boolean {
        const constraints = this.constraints;
        const len = constraints.length;
        for (let i = 0; i < len; i++) {
            const constraint = constraints[i];
            if (constraint && constraint.cp === cp) {
                return true;
            }
        }

        return false;
    }

    changeRestLength(cp: ConstrainedPoint, restLength: number): void {
        const constraints = this.constraints;
        const len = constraints.length;
        for (let i = 0; i < len; i++) {
            const constraint = constraints[i];
            if (constraint && constraint.cp === cp) {
                constraint.restLength = restLength;
                return;
            }
        }
    }

    changeConstraintAndLength(
        fromCp: ConstrainedPoint,
        toCp: ConstrainedPoint,
        restLength: number
    ): void {
        const constraints = this.constraints;
        const len = constraints.length;
        for (let i = 0; i < len; i++) {
            const constraint = constraints[i];
            if (constraint && constraint.cp === fromCp) {
                constraint.cp = toCp;
                constraint.restLength = restLength;
                return;
            }
        }
    }

    restLength(cp: ConstrainedPoint): number {
        const constraints = this.constraints;
        const len = constraints.length;
        for (let i = 0; i < len; i++) {
            const constraint = constraints[i];
            if (constraint && constraint.cp === cp) {
                return constraint.restLength;
            }
        }

        return Constants.UNDEFINED;
    }

    override update(delta: number): void {
        const totalForce = this.totalForce;
        const currentGravity = Gravity.current;

        if (!this.disableGravity) {
            if (!this.gravity || !this.invWeight) {
                return;
            }

            if (currentGravity.y !== 0 || currentGravity.x !== 0) {
                totalForce.x = currentGravity.x;
                totalForce.y = currentGravity.y;
            } else {
                totalForce.x = this.gravity.x * this.invWeight;
                totalForce.y = this.gravity.y * this.invWeight;
            }
        } else {
            totalForce.x = 0;
            totalForce.y = 0;
        }

        const aMultiplier = ((delta / Constants.TIME_SCALE) * delta) / Constants.TIME_SCALE;
        this.a.x = this.totalForce.x * aMultiplier;
        this.a.y = this.totalForce.y * aMultiplier;

        if (this.prevPos.x === Constants.INT_MAX) {
            this.prevPos.x = this.pos.x;
            this.prevPos.y = this.pos.y;
        }

        this.posDelta.x = this.pos.x - this.prevPos.x + this.a.x;
        this.posDelta.y = this.pos.y - this.prevPos.y + this.a.y;

        if (delta > 0) {
            const vMultiplier = 1 / delta;
            this.v.x = this.posDelta.x * vMultiplier;
            this.v.y = this.posDelta.y * vMultiplier;
        }

        this.prevPos.x = this.pos.x;
        this.prevPos.y = this.pos.y;

        this.pos.x += this.posDelta.x;
        this.pos.y += this.posDelta.y;
    }

    satisfyConstraints(): void {
        // NOTE: this method is a perf hotspot so be careful with changes
        const pin = this.pin;
        const pos = this.pos;
        const invWeight = this.invWeight;
        let tmp1X: number, tmp1Y: number, tmp2X: number, tmp2Y: number;

        if (pin.x !== -1 /* Constants.UNDEFINED */) {
            pos.x = pin.x;
            pos.y = pin.y;
            return;
        }

        const constraints = this.constraints;
        const num = constraints.length;

        for (let i = 0; i < num; i++) {
            const c = constraints[i];
            if (!c) {
                continue;
            }

            const cp = c.cp;
            const cpPos = cp.pos;

            tmp1X = cpPos.x - pos.x;
            tmp1Y = cpPos.y - pos.y;

            if (tmp1X === 0 && tmp1Y === 0) {
                tmp1X = 1;
                tmp1Y = 1;
            }

            const sqrDeltaLength = tmp1X * tmp1X + tmp1Y * tmp1Y; // get dot product inline
            const restLength = c.restLength;
            const sqrRestLength = restLength * restLength;
            const cType = c.type;

            if (cType === 1 /* ConstraintType.NOT_MORE_THAN */) {
                if (sqrDeltaLength <= sqrRestLength) {
                    continue;
                }
            } else if (cType === 2 /*ConstraintType.NOT_LESS_THAN */) {
                if (sqrDeltaLength >= sqrRestLength) {
                    continue;
                }
            }

            const pinUndefined = cp.pin.x === -1; /* Constants.UNDEFINED */
            const invWeight2 = cp.invWeight;
            const deltaLength = Math.sqrt(sqrDeltaLength);
            const minDeltaLength = deltaLength > 1 ? deltaLength : 1;

            if (!invWeight || !invWeight2) {
                return;
            }

            const diff = (deltaLength - restLength) / (minDeltaLength * (invWeight + invWeight2));

            // copy the first position before modification
            if (pinUndefined) {
                tmp2X = tmp1X;
                tmp2Y = tmp1Y;
            }

            if (!invWeight) {
                return;
            }
            const tmp1Multiplier = invWeight * diff;
            tmp1X *= tmp1Multiplier;
            tmp1Y *= tmp1Multiplier;

            pos.x += tmp1X;
            pos.y += tmp1Y;

            if (pinUndefined) {
                if (!invWeight2) {
                    return;
                }
                const tmp2Multiplier = invWeight2 * diff;
                if (tmp2X! && tmp2Y!) {
                    cpPos.x -= tmp2X! * tmp2Multiplier;
                    cpPos.y -= tmp2Y! * tmp2Multiplier;
                }
            }
        }
    }

    qcpUpdate(delta: number): void {
        // qcpUpdate only differs from update in that it includes material
        // force calculations, however those don't appear to be used. So
        // for now, qcpUpdate simply calls update

        this.update(delta);
    }

    posString(): string {
        return `${this.pos.x.toFixed(2)}, ${this.pos.y.toFixed(2)}`;
    }
}

export default ConstrainedPoint;
