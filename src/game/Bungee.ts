import ConstraintSystem from "@/physics/ConstraintSystem";
import ConstrainedPoint from "@/physics/ConstrainedPoint";
import resolution from "@/resolution";
import Constants from "@/utils/Constants";
import ConstraintType from "@/physics/ConstraintType";
import Vector from "@/core/Vector";
import Canvas from "@/utils/Canvas";
import RGBAColor from "@/core/RGBAColor";
import Mover from "@/utils/Mover";
import satisfyConstraintArray from "@/physics/satisfyConstraintArray";
import { IS_XMAS } from "@/utils/SpecialEvents";
import ResourceId from "@/resources/ResourceId";
import ResourceMgr from "@/resources/ResourceMgr";
import { getRopePalette } from "@/utils/ropePalette";

const ROLLBACK_K = 0.5;
const BUNGEE_RELAXION_TIMES = 25;
const MAX_BUNGEE_SEGMENTS = 10;
const DEFAULT_PART_WEIGHT = 0.02;
const STRENGTHENED_PART_WEIGHT = 0.5;
const CUT_DISSAPPEAR_TIMEOUT = 2.0;
const WHITE_TIMEOUT = 0.05;

enum BungeeMode {
    NORMAL = 0,
    LOCKED = 1,
}

// create temp color objects used during draw (to reduce allocations)
const drawBlack = new RGBAColor(0, 0, 0, 1);
const drawC1 = new RGBAColor(0, 0, 0, 1);
const drawD1 = new RGBAColor(0, 0, 0, 1);
const drawC2 = new RGBAColor(0, 0, 0, 1);
const drawD2 = new RGBAColor(0, 0, 0, 1);

class Bungee extends ConstraintSystem {
    static readonly BUNGEE_RELAXION_TIMES = BUNGEE_RELAXION_TIMES;

    relaxed: number;
    lineWidth: number;
    width: number;
    cut: number;
    cutTime: number;
    bungeeMode: BungeeMode;
    highlighted: boolean;
    BUNGEE_REST_LEN: number;
    bungeeAnchor: ConstrainedPoint;
    tail: ConstrainedPoint;
    forceWhite: boolean;
    initialCandleAngle: number;
    chosenOne: boolean;
    hideTailParts: boolean;
    dontDrawRedStretch: boolean;
    drawPts: Vector[];
    BUNGEE_BEZIER_POINTS: number;
    lightRandomSeed: number | null;
    interpolationAlpha: number;

    constructor(
        headCp: ConstrainedPoint | null,
        hx: number,
        hy: number,
        tailCp: ConstrainedPoint | null,
        tx: number,
        ty: number,
        len: number
    ) {
        super();

        this.relaxed = 0;
        this.relaxationTimes = BUNGEE_RELAXION_TIMES;
        this.lineWidth = resolution.DEFAULT_BUNGEE_LINE_WIDTH;
        this.width = resolution.DEFAULT_BUNGEE_WIDTH;
        this.cut = Constants.UNDEFINED;
        this.cutTime = 0;
        this.bungeeMode = BungeeMode.NORMAL;
        this.highlighted = false;
        this.BUNGEE_REST_LEN = resolution.BUNGEE_REST_LEN;
        this.bungeeAnchor = headCp != null ? headCp : new ConstrainedPoint();

        if (tailCp != null) {
            this.tail = tailCp;
        } else {
            this.tail = new ConstrainedPoint();
            this.tail.setWeight(1);
        }

        this.bungeeAnchor.setWeight(DEFAULT_PART_WEIGHT);
        this.bungeeAnchor.pos.x = hx;
        this.bungeeAnchor.pos.y = hy;

        this.tail.pos.x = tx;
        this.tail.pos.y = ty;

        this.addPart(this.bungeeAnchor);
        this.addPart(this.tail);

        this.tail.addConstraint(this.bungeeAnchor, this.BUNGEE_REST_LEN, ConstraintType.DISTANCE);

        const offset = Vector.subtract(this.tail.pos, this.bungeeAnchor.pos);
        const pointsNum = Math.round(len / this.BUNGEE_REST_LEN + 2);
        offset.divide(pointsNum);

        this.roll(len, offset);
        this.forceWhite = false;
        this.initialCandleAngle = Constants.UNDEFINED;
        this.chosenOne = false;
        this.hideTailParts = false;
        this.dontDrawRedStretch = false;
        this.drawPts = [];
        this.BUNGEE_BEZIER_POINTS = resolution.BUNGEE_BEZIER_POINTS;
        this.lightRandomSeed = null;
        this.interpolationAlpha = 1;
    }

    getLength(): number {
        let len = 0;
        const parts = this.parts;
        const numParts = parts.length;
        if (numParts > 0) {
            let v = parts[0]?.pos;
            for (let i = 1; i < numParts; i++) {
                const part = parts[i];
                if (!part || !v) {
                    continue;
                }
                len += v.distance(part.pos);
                v = part.pos;
            }
        }
        return len;
    }

    roll(rollLen: number, offset: Vector | null) {
        if (offset == null) {
            offset = Vector.newZero();
        }

        const parts = this.parts;
        const tail = this.tail;
        let prev = parts[parts.length - 2];
        if (!prev) {
            return;
        }
        let heroRestLen = tail.restLength(prev);
        let cp: ConstrainedPoint | null = null;

        while (rollLen > 0) {
            if (rollLen >= this.BUNGEE_REST_LEN) {
                prev = parts[parts.length - 2];
                if (!prev) {
                    break;
                }
                cp = new ConstrainedPoint();
                cp.setWeight(DEFAULT_PART_WEIGHT);
                cp.pos = Vector.add(prev.pos, offset);
                this.addPartAtIndex(cp, this.parts.length - 1);

                tail.changeConstraintAndLength(prev, cp, heroRestLen);
                cp.addConstraint(prev, this.BUNGEE_REST_LEN, ConstraintType.DISTANCE);
                rollLen -= this.BUNGEE_REST_LEN;
            } else {
                const newRestLen = rollLen + heroRestLen;
                if (newRestLen > this.BUNGEE_REST_LEN) {
                    rollLen = this.BUNGEE_REST_LEN;
                    heroRestLen = newRestLen - this.BUNGEE_REST_LEN;
                } else {
                    prev = parts[parts.length - 2];
                    if (!prev) {
                        break;
                    }
                    tail.changeRestLength(prev, newRestLen);
                    rollLen = 0;
                }
            }
        }
    }

    rollBack(amount: number) {
        const parts = this.parts;
        let partsCount = parts.length;
        const prev = parts[partsCount - 2];
        const tail = this.tail;
        let rollBackLen = amount;

        let oldAnchor: ConstrainedPoint | undefined;
        if (!prev) {
            return rollBackLen;
        }
        let heroRestLen = tail.restLength(prev);

        while (rollBackLen > 0) {
            if (rollBackLen >= this.BUNGEE_REST_LEN) {
                const oldAnchorIndex = partsCount - 2;
                const newAnchor = parts[partsCount - 3];

                oldAnchor = parts[oldAnchorIndex];
                if (!oldAnchor || !newAnchor) {
                    break;
                }
                tail.changeConstraintAndLength(oldAnchor, newAnchor, heroRestLen);
                this.removePartAtIndex(oldAnchorIndex);
                partsCount--;
                rollBackLen -= this.BUNGEE_REST_LEN;
            } else {
                const newRestLen = heroRestLen - rollBackLen;
                if (newRestLen < 1) {
                    rollBackLen = this.BUNGEE_REST_LEN;
                    heroRestLen = this.BUNGEE_REST_LEN + newRestLen + 1;
                } else {
                    oldAnchor = parts[partsCount - 2];
                    if (!oldAnchor) {
                        break;
                    }
                    tail.changeRestLength(oldAnchor, newRestLen);
                    rollBackLen = 0;
                }
            }
        }

        const newTailRestLen = (partsCount - 1) * (this.BUNGEE_REST_LEN + 3);
        const constraints = tail.constraints;
        const numConstraints = constraints.length;
        for (let i = 0; i < numConstraints; i++) {
            const c = constraints[i];
            if (c && c.type === ConstraintType.NOT_MORE_THAN) {
                c.restLength = newTailRestLen;
            }
        }
        return rollBackLen;
    }

    strengthen() {
        const parts = this.parts;
        const numParts = parts.length;
        for (let i = 0; i < numParts; i++) {
            const cp = parts[i];
            if (!cp) {
                continue;
            }
            if (this.bungeeAnchor.pin.x != Constants.UNDEFINED) {
                if (cp !== this.tail) {
                    cp.setWeight(STRENGTHENED_PART_WEIGHT);
                }

                if (i > 0) {
                    const restLen = i * (this.BUNGEE_REST_LEN + 3);
                    cp.addConstraint(this.bungeeAnchor, restLen, ConstraintType.NOT_MORE_THAN);
                }
            }
        }
    }

    override update(delta: number) {
        if (this.cutTime > 0) {
            this.cutTime = Mover.moveToTarget(this.cutTime, 0, 1, delta);
            if (this.cutTime < CUT_DISSAPPEAR_TIMEOUT - WHITE_TIMEOUT && this.forceWhite) {
                this.removePart(this.cut);
            }
        }

        const parts = this.parts;
        const numParts = parts.length;
        const relaxationTimes = this.relaxationTimes;
        const tail = this.tail;
        let i, cp, k;

        for (i = 0; i < numParts; i++) {
            const cp = parts[i];
            if (cp && cp !== tail) {
                //Log.debug('Before qcpUpdate, [' + i + '] : ' + cp.pos );
                // NOTE: iOS calls qcpUpdate which is identical to update except
                // it incorporates material forces. However, those don't appear to
                // be used so we'll simply call update() instead.
                cp.update(delta);
            }
        }

        // satisfy constraints during each relaxation period
        satisfyConstraintArray(parts, relaxationTimes);

        // for (i = 0; i < relaxationTimes; i++) {
        //     for (k = 0; k < numParts; k++) {
        //         parts[k].satisfyConstraints();
        //     }
        // }
    }

    removePart(partIndex: number) {
        this.forceWhite = false;

        const parts = this.parts;
        const p1 = parts[partIndex];
        const p2 = parts[partIndex + 1];

        if (!p1) {
            return;
        }

        if (!p2) {
            p1.removeConstraints();
        } else {
            const p2Constraints = p2.constraints;
            const p2NumConstraints = p2Constraints.length;
            for (let k = 0; k < p2NumConstraints; k++) {
                const c = p2Constraints[k];
                if (c && c.cp === p1) {
                    p2.removeConstraintAtIndex(k);

                    const np2 = new ConstrainedPoint();
                    np2.setWeight(0.00001);
                    np2.pos.copyFrom(p2.pos);
                    np2.prevPos.copyFrom(p2.prevPos);
                    this.addPartAtIndex(np2, partIndex + 1);
                    np2.addConstraint(p1, this.BUNGEE_REST_LEN, ConstraintType.DISTANCE);
                    break;
                }
            }
        }

        for (let i = 0, numParts = parts.length; i < numParts; i++) {
            const cp = parts[i];
            if (cp && cp !== this.tail) {
                cp.setWeight(0.00001);
            }
        }
    }

    setCut(partIndex: number) {
        this.cut = partIndex;
        this.cutTime = CUT_DISSAPPEAR_TIMEOUT;
        this.forceWhite = true;
        this.highlighted = false;
    }

    draw() {
        const parts = this.parts;
        const count = parts.length;
        const ctx = Canvas.context;
        const alpha = Math.min(Math.max(this.interpolationAlpha, 0), 1);
        // Max reasonable distance for interpolation (scale to rope segment size)
        const maxInterpDistance = this.BUNGEE_REST_LEN * 4;
        const MAX_INTERP_DISTANCE_SQ = maxInterpDistance * maxInterpDistance;
        const getInterpolatedPos = (part: ConstrainedPoint): Vector => {
            const prev = part.prevPos;
            const curr = part.pos;
            // Skip interpolation if prevPos is uninitialized
            if (prev.x === Constants.INT_MAX || prev.y === Constants.INT_MAX || alpha >= 1) {
                return curr;
            }
            // Skip interpolation if distance is too large (teleport/state change)
            const dx = curr.x - prev.x;
            const dy = curr.y - prev.y;
            if (dx * dx + dy * dy > MAX_INTERP_DISTANCE_SQ) {
                return curr;
            }
            if (alpha <= 0) {
                return prev;
            }
            return new Vector(prev.x + dx * alpha, prev.y + dy * alpha);
        };

        if (ctx) {
            ctx.lineJoin = "round";
            ctx.lineWidth = this.lineWidth;
        }

        if (this.cut === Constants.UNDEFINED) {
            const pts: Vector[] = new Array(count);
            for (let i = 0; i < count; i++) {
                const part = parts[i];
                pts[i] = part ? getInterpolatedPos(part) : Vector.newZero();
            }
            this.drawBungee(pts, 1);
        } else {
            const pts1: Vector[] = [];
            const pts2: Vector[] = [];
            let part2 = false;
            let cutIndex = 0;
            for (let i = 0; i < count; i++) {
                const part = parts[i];
                if (!part) {
                    continue;
                }
                let linked = true;

                if (i > 0) {
                    const prevPart = parts[i - 1];
                    if (prevPart && !part.hasConstraint(prevPart)) {
                        linked = false;
                    }
                }

                if (part.pin.x === Constants.UNDEFINED && !linked) {
                    part2 = true;
                    cutIndex = i;
                }

                const interpolatedPos = getInterpolatedPos(part);
                if (!part2) {
                    pts1[i] = interpolatedPos;
                } else {
                    pts2.push(interpolatedPos);
                }
            }

            if (pts1.length > 0) {
                this.drawBungee(pts1, 0);
            }
            if (pts2.length > 0 && !this.hideTailParts) {
                this.drawBungee(pts2, cutIndex);
            }
        }

        if (ctx) {
            ctx.lineWidth = 1;
        }
    }

    drawBungee(pts: Vector[], segmentStartIndex: number) {
        const count = pts.length;
        const points = this.BUNGEE_BEZIER_POINTS;
        const drawPts = this.drawPts;

        // we can't calc the distance for a single point
        if (count < 2) {
            return;
        }

        // Default to 0 if not provided (for uncut ropes)
        //if (segmentStartIndex === undefined) {
        //    segmentStartIndex = 0;
        //}

        // set the global alpha
        const alpha =
            this.cut === Constants.UNDEFINED || this.forceWhite
                ? 1
                : this.cutTime / (CUT_DISSAPPEAR_TIMEOUT - WHITE_TIMEOUT);

        if (alpha <= 0) {
            return;
        }

        const firstPoint = pts[0];
        const secondPoint = pts[1];
        if (!firstPoint || !secondPoint) {
            return;
        }
        const tx = firstPoint.x - secondPoint.x;
        const ty = firstPoint.y - secondPoint.y;
        const ptsDistance = Math.sqrt(tx * tx + ty * ty);

        //Log.debug('DrawBungee - point1: ' + firstPoint + ' point2: ' + secondPoint);

        if (ptsDistance <= this.BUNGEE_REST_LEN + 0.3) {
            this.relaxed = 0;
        } else if (ptsDistance <= this.BUNGEE_REST_LEN + 1) {
            this.relaxed = 1;
        } else if (ptsDistance < this.BUNGEE_REST_LEN + 4) {
            this.relaxed = 2;
        } else {
            this.relaxed = 3;
        }

        if (count < 3) {
            return;
        }

        const black = drawBlack;
        const c1 = drawC1;
        const d1 = drawD1;
        const c2 = drawC2;
        const d2 = drawD2;

        // reset the colors (we're reusing temp color objects)
        black.r = 0;
        black.g = 0;
        black.b = 0;
        black.a = alpha;

        const palette = getRopePalette();

        c1.copyFrom(palette.primary);
        c1.a = alpha;
        d1.copyFrom(palette.primary);
        d1.multiply(0.4);
        d1.a = alpha;

        c2.copyFrom(palette.secondary);
        c2.a = alpha;
        d2.copyFrom(palette.secondary);
        d2.multiply(0.45);
        d2.a = alpha;

        if (this.highlighted) {
            c1.r *= 3;
            c1.g *= 3;
            c1.b *= 3;
            c2.r *= 3;
            c2.g *= 3;
            c2.b *= 3;
            d1.r *= 3;
            d1.g *= 3;
            d1.b *= 3;
            d2.r *= 3;
            d2.g *= 3;
            d2.b *= 3;
        }

        if (ptsDistance > this.BUNGEE_REST_LEN + 7 && !this.dontDrawRedStretch) {
            const f = (ptsDistance / this.BUNGEE_REST_LEN) * 2;
            d1.r *= f;
            d2.r *= f;
        }

        let useC1 = true; // ropes have alternating color segments
        const numVertices = (count - 1) * points;

        // colors
        const b1 = new RGBAColor(d1.r, d1.g, d1.b, d1.a);
        const b2 = new RGBAColor(d2.r, d2.g, d2.b, d2.a);
        const colorDivisor = numVertices - 1;
        const b1rf = (c1.r - d1.r) / colorDivisor;
        const b1gf = (c1.g - d1.g) / colorDivisor;
        const b1bf = (c1.b - d1.b) / colorDivisor;
        const b2rf = (c2.r - d2.r) / colorDivisor;
        const b2gf = (c2.g - d2.g) / colorDivisor;
        const b2bf = (c2.b - d2.b) / colorDivisor;

        const numSegments = this.BUNGEE_BEZIER_POINTS - 1;
        const lastSegmentIndex = numSegments - 1;
        const ctx = Canvas.context;
        if (!ctx) {
            return;
        }
        const previousAlpha = ctx.globalAlpha;

        // set the line style
        if (previousAlpha !== alpha) {
            ctx.globalAlpha = alpha;
        }

        // store the first point in the path
        let firstDrawPoint = drawPts[0];
        if (!firstDrawPoint) {
            firstDrawPoint = drawPts[0] = firstPoint.copy();
        } else {
            firstDrawPoint.x = firstPoint.x;
            firstDrawPoint.y = firstPoint.y;
        }

        ctx.beginPath();

        for (let vertex = 1; vertex <= numVertices; vertex++) {
            const a = vertex / numVertices;

            let pathVector = drawPts[vertex];
            if (!pathVector) {
                pathVector = drawPts[vertex] = new Vector(0, 0);
            }
            Vector.setCalcPathBezier(pts, a, pathVector);

            // see if we have all the points for this color section
            const segmentIndex = (vertex - 1) % numSegments;
            if (segmentIndex === lastSegmentIndex || vertex === numVertices) {
                ctx.beginPath();

                let currentColor: string;

                // decide which color to use for this section
                if (this.forceWhite) {
                    currentColor = RGBAColor.styles.SOLID_OPAQUE;
                } else if (useC1) {
                    currentColor = b1.rgbaStyle();
                } else {
                    currentColor = b2.rgbaStyle();
                }

                ctx.strokeStyle = currentColor;

                // move to the beginning of the color section
                let currentIndex = vertex - segmentIndex - 1;
                let point = drawPts[currentIndex++];
                if (!point) {
                    continue;
                }
                ctx.moveTo(point.x, point.y);

                // draw each line segment (2 segments per color section)
                for (; currentIndex <= vertex; currentIndex++) {
                    point = drawPts[currentIndex];
                    if (!point) {
                        continue;
                    }
                    ctx.lineTo(point.x, point.y);
                }

                ctx.stroke();
                useC1 = !useC1;

                const colorMultiplier = segmentIndex + 1;

                // adjust colors for both b1 and b2
                b1.r += b1rf * colorMultiplier;
                b1.g += b1gf * colorMultiplier;
                b1.b += b1bf * colorMultiplier;
                b2.r += b2rf * colorMultiplier;
                b2.g += b2gf * colorMultiplier;
                b2.b += b2bf * colorMultiplier;
            }
        }

        ctx.stroke();

        // reset the alpha
        if (previousAlpha !== alpha) {
            ctx.globalAlpha = previousAlpha;
        }

        // Draw Christmas lights along the rope
        this.drawChristmasLights(drawPts, numVertices + 1, alpha, segmentStartIndex);
    }

    drawChristmasLights(
        drawPts: Vector[],
        count: number,
        alpha: number,
        segmentStartIndex: number
    ) {
        if (!IS_XMAS) {
            return;
        }
        if (!drawPts || count < 2) {
            return;
        }
        if (alpha <= 0) {
            return;
        }

        const ctx = Canvas.context;
        const texture = ResourceMgr.getTexture(ResourceId.IMG_XMAS_LIGHTS);

        if (!texture || !texture.image) {
            return;
        }

        const rects = texture.rects || [];
        const image = texture.image;

        if (rects.length === 0) {
            return;
        }

        const lightSpacing = resolution.BUNGEE_REST_LEN * 1.5; // Space between lights

        // Calculate total rope length using the smooth bezier points
        let totalDistance = 0;
        const distances: number[] = [0];

        for (let i = 1; i < count; i++) {
            const current = drawPts[i];
            const previous = drawPts[i - 1];
            if (!current || !previous) {
                distances.push(totalDistance);
                continue;
            }
            const dx = current.x - previous.x;
            const dy = current.y - previous.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            totalDistance += dist;
            distances.push(totalDistance);
        }

        // Set alpha for fading effect
        if (!ctx) {
            return;
        }
        const previousAlpha = ctx.globalAlpha;
        if (alpha < 1) {
            ctx.globalAlpha = alpha;
        }

        // Initialize random seed based on rope position for consistent randomization
        if (!this.lightRandomSeed) {
            this.lightRandomSeed = Math.floor(Math.random() * 1000);
        }

        // Calculate distance offset for cut rope segments
        // This ensures lights keep the same color even after cutting
        const segmentOffset = segmentStartIndex * this.BUNGEE_REST_LEN;

        // Draw lights at regular intervals along the rope
        let currentDistance = lightSpacing / 2; // Start offset

        while (currentDistance < totalDistance) {
            // Find which segment this light is on
            for (let i = 1; i < count; i++) {
                const current = drawPts[i];
                const previous = drawPts[i - 1];
                const segmentEnd = distances[i];
                const segmentStart = distances[i - 1];
                if (
                    !current ||
                    !previous ||
                    segmentEnd === undefined ||
                    segmentStart === undefined
                ) {
                    continue;
                }
                if (currentDistance <= segmentEnd) {
                    const segmentDelta = segmentEnd - segmentStart || 1;
                    const t = (currentDistance - segmentStart) / segmentDelta;

                    const x = previous.x + (current.x - previous.x) * t;
                    const y = previous.y + (current.y - previous.y) * t;

                    // Use distance-based index for consistent light colors that persist across cuts
                    // Add segmentOffset to maintain color consistency after cutting
                    const absoluteDistance = currentDistance + segmentOffset;
                    const distanceIndex = Math.round(absoluteDistance / lightSpacing);
                    const rectIndex = (this.lightRandomSeed + distanceIndex) % rects.length;

                    // Get the frame rect
                    const rect = rects[rectIndex];

                    if (rect) {
                        // Draw the light sprite centered on the rope
                        ctx.drawImage(
                            image,
                            rect.x,
                            rect.y,
                            rect.w,
                            rect.h,
                            x - rect.w / 2,
                            y - rect.h / 2,
                            rect.w,
                            rect.h
                        );
                    }

                    break;
                }
            }

            currentDistance += lightSpacing;
        }

        // Reset alpha
        if (alpha < 1) {
            ctx.globalAlpha = previousAlpha;
        }
    }
}

export default Bungee;
