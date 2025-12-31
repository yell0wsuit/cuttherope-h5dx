import Vector from "@/core/Vector";
import Log from "@/utils/Log";
import satisfyConstraintArray from "@/physics/satisfyConstraintArray";
import type ConstrainedPoint from "@/physics/ConstrainedPoint";

class ConstraintSystem {
    relaxationTimes: number;
    parts: ConstrainedPoint[];

    constructor() {
        this.relaxationTimes = 1;
        this.parts = [];
    }

    addPartAtIndex(cp: ConstrainedPoint, index: number): void {
        // splice with removeLength=0 means we just insert
        // the additional element (cp) at the index
        this.parts.splice(index, 0, cp);
    }

    addPart(cp: ConstrainedPoint): void {
        this.parts[this.parts.length] = cp;
    }

    log(): void {
        Log.debug("Constraint System Log:");
        for (let i = 0, partsLen = this.parts.length; i < partsLen; i++) {
            const cp = this.parts[i];
            if (!cp) {
                continue;
            }

            Log.debug(`-- Point: ${cp.posString()}`);
            for (let j = 0, constraintsLen = cp.constraints.length; j < constraintsLen; j++) {
                const c = cp.constraints[j];
                if (!c) {
                    continue;
                }

                const cInfo = `---- Constraint: ${c.cp.posString()} len: ${c.restLength}`;
                Log.debug(cInfo);
            }
        }
    }

    removePartAtIndex(index: number): void {
        this.parts.splice(index, 1);
    }

    update(delta: number): void {
        const parts = this.parts;
        const numParts = parts.length;
        const relaxationTimes = this.relaxationTimes;

        // update each part
        for (let i = 0; i < numParts; i++) {
            const part = parts[i];
            if (part) {
                part.update(delta);
            }
        }

        // satisfy constraints during each relaxation period
        satisfyConstraintArray(parts, relaxationTimes);
    }

    // NOTE: base draw() implementation isn't used so we won't port it yet
}

export default ConstraintSystem;
