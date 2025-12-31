import ImageElement from "@/visual/ImageElement";
import Canvas from "@/utils/Canvas";
import Alignment from "@/core/Alignment";
import type Texture2D from "@/core/Texture2D";

class HorizontallyTiledImage extends ImageElement {
    tiles!: number[];
    offsets!: number[];
    align!: Alignment;

    override initTexture(texture: Texture2D) {
        super.initTexture(texture);
        this.tiles = [0, 0, 0];
        this.offsets = [0, 0, 0];
        this.align = Alignment.CENTER;
    }

    setTileHorizontally(left: number, center: number, right: number) {
        if (!this.tiles || this.tiles.length === 0) {
            return;
        }

        this.tiles[0] = left;
        this.tiles[1] = center;
        this.tiles[2] = right;

        const rect1 = this.texture.rects[left];
        const rect2 = this.texture.rects[center];
        const rect3 = this.texture.rects[right];
        if (!rect1 || !rect2 || !rect3) {
            return;
        }

        const h1 = rect1.h;
        const h2 = rect2.h;
        const h3 = rect3.h;

        if (h1 >= h2 && h1 >= h3) {
            this.height = h1;
        } else if (h2 >= h1 && h2 >= h3) {
            this.height = h2;
        } else {
            this.height = h3;
        }

        if (!this.offsets || this.offsets.length === 0) {
            return;
        }

        this.offsets[0] = Math.trunc((this.height - h1) / 2.0);
        this.offsets[1] = Math.trunc((this.height - h2) / 2.0);
        this.offsets[2] = Math.trunc((this.height - h3) / 2.0);
    }

    override draw() {
        this.preDraw();

        if (!this.tiles || this.tiles.length === 0) {
            return;
        }

        const leftIndex = this.tiles[0];
        const centerIndex = this.tiles[1];
        const rightIndex = this.tiles[2];
        if (leftIndex === undefined || centerIndex === undefined || rightIndex === undefined) {
            return;
        }

        const left = this.texture.rects[leftIndex];
        const center = this.texture.rects[centerIndex];
        const right = this.texture.rects[rightIndex];
        if (!left || !center || !right) {
            return;
        }
        const tileWidth = this.width - (Math.trunc(left.w) + Math.trunc(right.w));
        const ctx = Canvas.context;
        const dx = Math.round(this.drawX);
        const dy = Math.round(this.drawY);
        const leftCeilW = Math.ceil(left.w);
        const leftCeilH = Math.ceil(left.h);
        const rightCeilW = Math.ceil(right.w);
        const rightCeilH = Math.ceil(right.h);

        if (!ctx) {
            return;
        }

        if (!this.offsets || this.offsets.length === 0) {
            return;
        }

        const image = this.texture.image;
        if (!image) {
            return;
        }

        const offset0 = this.offsets[0];
        const offset1 = this.offsets[1];
        const offset2 = this.offsets[2];
        if (offset0 === undefined || offset1 === undefined || offset2 === undefined) {
            return;
        }

        if (tileWidth >= 0) {
            ctx.drawImage(
                image,
                left.x,
                left.y,
                leftCeilW,
                leftCeilH,
                dx,
                dy + offset0,
                leftCeilW,
                leftCeilH
            );
            this.drawTiled(centerIndex, dx + leftCeilW, dy + offset1, tileWidth, center.h);
            ctx.drawImage(
                image,
                right.x,
                right.y,
                rightCeilW,
                rightCeilH,
                dx + leftCeilW + tileWidth,
                dy + offset2,
                rightCeilW,
                rightCeilH
            );
        } else {
            const p1 = { ...left };
            const p2 = { ...right };
            p1.w = Math.min(p1.w, this.width / 2);
            p2.w = Math.min(p2.w, this.width - p1.w);
            p2.x += right.w - p2.w;

            ctx.drawImage(image, p1.x, p1.y, p1.w, p1.h, dx, dy + offset0, p1.w, p1.h);
            ctx.drawImage(image, p2.x, p2.y, p2.w, p2.h, dx + p1.w, dy + offset2, p2.w, p2.h);
        }

        this.postDraw();
    }

    /**
     * Draw the tile image to an offscreen canvas and return an Image
     */
    getImage(): HTMLImageElement | undefined {
        // save the existing canvas id and switch to the hidden canvas
        const existingCanvas = Canvas.element;

        // create a temporary canvas to use
        Canvas.setTarget(document.createElement("canvas"));

        // set the canvas width and height
        const canvas = Canvas.element;
        const imgWidth = Math.ceil(this.width);
        const imgHeight = Math.ceil(this.height);

        if (!canvas) {
            return;
        }

        canvas.width = imgWidth;
        canvas.height = imgHeight;

        this.draw();
        const imageData = canvas.toDataURL("image/png");
        const img = new Image();

        img.src = imageData;

        img.width = imgWidth;
        img.height = imgHeight;

        // restore the original canvas for the App
        if (existingCanvas) {
            Canvas.setTarget(existingCanvas);
        }

        return img;
    }
}

export default HorizontallyTiledImage;
