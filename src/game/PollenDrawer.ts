import BaseElement from "@/visual/BaseElement";
import Vector from "@/core/Vector";
import ResourceId from "@/resources/ResourceId";
import ImageElement from "@/visual/ImageElement";
import ImageMultiDrawer from "@/visual/ImageMultiDrawer";
import ResourceMgr from "@/resources/ResourceMgr";
import Mover from "@/utils/Mover";
import MathHelper from "@/utils/MathHelper";
import resolution from "@/resolution";
import Rectangle from "@/core/Rectangle";

const IMG_OBJ_POLLEN_HD_obj_pollen = 0;

class Pollen {
    parentIndex: number;
    x: number;
    y: number;
    scaleX: number;
    startScaleX: number;
    endScaleX: number;
    scaleY: number;
    startScaleY: number;
    endScaleY: number;
    alpha: number;
    startAlpha: number;
    endAlpha: number;

    constructor() {
        this.parentIndex = 0;
        this.x = 0;
        this.y = 0;

        this.scaleX = 1;
        this.startScaleX = 1;
        this.endScaleX = 1;

        this.scaleY = 1;
        this.startScaleY = 1;
        this.endScaleY = 1;

        this.alpha = 1;
        this.startAlpha = 1;
        this.endAlpha = 1;
    }
}

class PollenDrawer extends BaseElement {
    qw: number;
    qh: number;
    drawer: ImageMultiDrawer;
    pollens: Pollen[];
    constructor() {
        super();

        const pollen = ResourceMgr.getTexture(ResourceId.IMG_OBJ_POLLEN_HD);
        if (!pollen) {
            throw new Error("Failed to load pollen texture");
        }

        this.qw = pollen.imageWidth;
        this.qh = pollen.imageHeight;

        this.drawer = new ImageMultiDrawer(pollen);

        this.pollens = [];
    }

    addPollen(v: Vector, pi: number) {
        const size = [0.3, 0.3, 0.5, 0.5, 0.6];
        const sizeCounts = size.length;
        let sX = 1;
        let sY = 1;
        let rx = size[MathHelper.randomRange(0, sizeCounts - 1)];
        let ry = rx;

        if (!rx || !ry) {
            return;
        }

        if (MathHelper.randomBool()) {
            rx *= 1 + MathHelper.randomRange(0, 1) / 10;
        } else {
            ry *= 1 + MathHelper.randomRange(0, 1) / 10;
        }

        sX *= rx;
        sY *= ry;

        const w = this.qw * sX;
        const h = this.qh * sY;
        const maxScale = 1;
        const d = Math.min(maxScale - sX, maxScale - sY);
        const delta = Math.random();
        const pollen = new Pollen();

        pollen.parentIndex = pi;
        pollen.x = v.x;
        pollen.y = v.y;
        pollen.startScaleX = d + sX;
        pollen.startScaleY = d + sY;
        pollen.scaleX = pollen.startScaleX * delta;
        pollen.scaleY = pollen.startScaleY * delta;
        pollen.endScaleX = sX;
        pollen.endScaleY = sY;
        pollen.endAlpha = 0.3;
        pollen.startAlpha = 1;
        pollen.alpha = 0.7 * delta + 0.3;

        const tquad = this.drawer.texture.rects[IMG_OBJ_POLLEN_HD_obj_pollen];
        if (!tquad) {
            throw new Error("Failed to find pollen texture quad");
        }
        const vquad = new Rectangle(v.x - w / 2, v.y - h / 2, w, h);

        this.drawer.setTextureQuad(this.pollens.length, tquad, vquad, pollen.alpha);
        this.pollens.push(pollen);
    }

    fillWithPollenFromPath(
        fromIndex: number,
        toIndex: number,
        grab: { mover: { path: Vector[] } }
    ) {
        const v1 = grab.mover.path[fromIndex];
        const v2 = grab.mover.path[toIndex];
        if (!v1 || !v2) {
            return;
        }

        const MIN_DISTANCE = resolution.POLLEN_MIN_DISTANCE;
        const v = Vector.subtract(v2, v1);
        const vLen = v.getLength();
        const times = Math.trunc(vLen / MIN_DISTANCE);
        const POLLEN_MAX_OFFSET = resolution.POLLEN_MAX_OFFSET;
        let i, vn;

        v.normalize();

        for (i = 0; i <= times; i++) {
            vn = Vector.add(v1, Vector.multiply(v, i * MIN_DISTANCE));
            vn.x += MathHelper.randomRange(-POLLEN_MAX_OFFSET, POLLEN_MAX_OFFSET);
            vn.y += MathHelper.randomRange(-POLLEN_MAX_OFFSET, POLLEN_MAX_OFFSET);
            this.addPollen(vn, fromIndex);
        }
    }

    override update(delta: number) {
        super.update(delta);
        this.drawer.update(delta);

        const len = this.pollens.length;
        let i, pollen: Pollen | undefined, temp, w, h, moveResult;

        for (i = 0; i < len; i++) {
            pollen = this.pollens[i];
            if (!pollen) {
                continue;
            }

            // increment the scale
            moveResult = Mover.moveToTargetWithStatus(pollen.scaleX, pollen.endScaleX, 1, delta);
            pollen.scaleX = moveResult.value;
            if (moveResult.reachedZero) {
                // swap the start and end values
                temp = pollen.startScaleX;
                pollen.startScaleX = pollen.endScaleX;
                pollen.endScaleX = temp;
            }

            moveResult = Mover.moveToTargetWithStatus(pollen.scaleY, pollen.endScaleY, 1, delta);
            pollen.scaleY = moveResult.value;
            if (moveResult.reachedZero) {
                // swap the start and end values
                temp = pollen.startScaleY;
                pollen.startScaleY = pollen.endScaleY;
                pollen.endScaleY = temp;
            }

            w = this.qw * pollen.scaleX;
            h = this.qh * pollen.scaleY;

            // update the current position
            this.drawer.vertices[i] = new Rectangle(pollen.x - w / 2, pollen.y - h / 2, w, h);

            // increment the alpha
            moveResult = Mover.moveToTargetWithStatus(pollen.alpha, pollen.endAlpha, 1, delta);
            pollen.alpha = moveResult.value;
            if (moveResult.reachedZero) {
                // swap the start and end values
                temp = pollen.startAlpha;
                pollen.startAlpha = pollen.endAlpha;
                pollen.endAlpha = temp;
            }

            // update the alpha in the drawer
            this.drawer.alphas[i] = pollen.alpha;
        }
    }

    override draw() {
        this.preDraw();
        this.drawer.draw();
        this.postDraw();
    }
}

export default PollenDrawer;
