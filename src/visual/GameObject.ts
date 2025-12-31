import Animation from "@/visual/Animation";
import Mover from "@/utils/Mover";
import Rectangle from "@/core/Rectangle";
import Quad2D from "@/core/Quad2D";
import Alignment from "@/core/Alignment";
import Vector from "@/core/Vector";
import Radians from "@/utils/Radians";
import Canvas from "@/utils/Canvas";
import RGBAcolor from "@/core/RGBAColor";
import type Texture2D from "@/core/Texture2D";

class GameObject extends Animation {
    bb?: Rectangle;
    rbb?: Quad2D;
    mover?: Mover;
    rotatedBB: boolean;
    topLeftCalculated: boolean;

    constructor() {
        super();
        this.isDrawBB = false;
        this.rotatedBB = false;
        this.topLeftCalculated = false;
    }

    override initTexture(texture: Texture2D) {
        super.initTexture(texture);
        this.bb = new Rectangle(0, 0, this.width, this.height);
        this.rbb = new Quad2D(this.bb.x, this.bb.y, this.bb.w, this.bb.h);
        this.anchor = Alignment.CENTER;

        this.rotatedBB = false;
        this.topLeftCalculated = false;
    }

    setBBFromFirstQuad() {
        const firstOffset = this.texture.offsets[0];
        const firstRect = this.texture.rects[0];

        if (!firstOffset || !firstRect) {
            return;
        }

        this.bb = new Rectangle(
            Math.round(firstOffset.x),
            Math.round(firstOffset.y),
            firstRect.w,
            firstRect.h
        );
        this.rbb = new Quad2D(this.bb.x, this.bb.y, this.bb.w, this.bb.h);
    }

    parseMover(item: {
        angle?: number;
        path?: string | unknown[];
        moveSpeed?: number;
        rotateSpeed?: number;
    }) {
        this.rotation = item.angle || 0;

        const path = item.path;
        if (typeof path === "string") {
            let moverCapacity = Mover.MAX_CAPACITY;
            if (path[0] === "R") {
                const rad = parseInt(path.slice(2), 10);
                moverCapacity = Math.round(rad / 2 + 1);
            }

            const mover = new Mover(moverCapacity, item.moveSpeed ?? 0, item.rotateSpeed ?? 0);
            mover.angle = this.rotation;
            mover.setPathFromString(path, new Vector(this.x, this.y));
            this.setMover(mover);
            mover.start();
        }
    }

    setMover(mover: Mover) {
        this.mover = mover;

        // turn high precision coordinates on for moving objects
        this.drawPosIncrement = 0.0001;
    }

    override update(delta: number) {
        super.update(delta);

        if (!this.topLeftCalculated) {
            this.calculateTopLeft();
            this.topLeftCalculated = true;
        }

        if (this.mover) {
            this.mover.update(delta);

            this.x = this.mover.pos.x;
            this.y = this.mover.pos.y;

            if (this.rotatedBB) this.rotateWithBB(this.mover.angle);
            else this.rotation = this.mover.angle;
        }
    }

    rotateWithBB(angle: number) {
        if (!this.rotatedBB) {
            this.rotatedBB = true;
        }
        this.rotation = angle;

        const bb = this.bb;

        if (!bb) {
            return;
        }

        const tl = new Vector(bb.x, bb.y);
        const tr = new Vector(bb.x + bb.w, bb.y);
        const br = new Vector(tr.x, bb.y + bb.h);
        const bl = new Vector(bb.x, br.y);

        // calculate the angle and offset for rotation
        const rad = Radians.fromDegrees(angle);
        const offsetX = this.width / 2 + this.rotationCenterX;
        const offsetY = this.height / 2 + this.rotationCenterY;

        tl.rotateAround(rad, offsetX, offsetY);
        tr.rotateAround(rad, offsetX, offsetY);
        br.rotateAround(rad, offsetX, offsetY);
        bl.rotateAround(rad, offsetX, offsetY);

        const rbb = this.rbb;
        if (rbb) {
            rbb.tlX = tl.x;
            rbb.tlY = tl.y;
            rbb.trX = tr.x;
            rbb.trY = tr.y;
            rbb.brX = br.x;
            rbb.brY = br.y;
            rbb.blX = bl.x;
            rbb.blY = bl.y;
        }
    }

    override drawBB() {
        const ctx = Canvas.context;
        const drawX = this.drawX;
        const drawY = this.drawY;
        const bb = this.bb;
        const rbb = this.rbb;

        if (!ctx || !bb) {
            return; // Exit early before any ctx operations
        }

        ctx.strokeStyle = "red";
        ctx.lineWidth = 2;
        if (this.rotatedBB) {
            ctx.beginPath();
            if (rbb) {
                ctx.moveTo(drawX + rbb.tlX, drawY + rbb.tlY);
                ctx.lineTo(drawX + rbb.trX, drawY + rbb.trY);
                ctx.lineTo(drawX + rbb.brX, drawY + rbb.brY);
                ctx.lineTo(drawX + rbb.blX, drawY + rbb.blY);
                ctx.stroke();
                ctx.closePath();
            }
        } else {
            ctx.strokeRect(drawX + bb.x, drawY + bb.y, bb.w, bb.h);
        }
    }

    pointInObject(x: number, y: number): boolean {
        const bb = this.bb;

        if (!bb) {
            return false;
        }

        const ox = this.drawX + bb.x;
        const oy = this.drawY + bb.y;

        return Rectangle.pointInRect(x, y, ox, oy, bb.w, bb.h);
    }

    rectInObject(r1x: number, r1y: number, r2x: number, r2y: number): boolean | undefined {
        if (!this.bb) {
            return;
        }

        const ox = this.drawX + this.bb.x;
        const oy = this.drawY + this.bb.y;

        return Rectangle.rectInRect(r1x, r1y, r2x, r2y, ox, oy, ox + this.bb.w, oy + this.bb.h);
    }

    static intersect(o1: GameObject, o2: GameObject): boolean | undefined {
        if (!o1.bb || !o2.bb) {
            return;
        }

        const o1x = o1.drawX + o1.bb.x;
        const o1y = o1.drawY + o1.bb.y;
        const o2x = o2.drawX + o2.bb.x;
        const o2y = o2.drawY + o2.bb.y;

        return Rectangle.rectInRect(
            o1x,
            o1y,
            o1x + o1.bb.w,
            o1y + o1.bb.h,
            o2x,
            o2y,
            o2x + o2.bb.w,
            o2y + o2.bb.h
        );
    }
}

export default GameObject;
