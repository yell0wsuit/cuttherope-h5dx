import BaseElement from "@/visual/BaseElement";
import Rectangle from "@/core/Rectangle";
import RES_DATA from "@/resources/ResData";
import Canvas from "@/utils/Canvas";
import Constants from "@/utils/Constants";
import Vector from "@/core/Vector";
import ActionType from "@/visual/ActionType";
import Log from "@/utils/Log";
import type Texture2D from "@/core/Texture2D";
import type { ActionData } from "@/visual/Action";

// Note: This class is named Image in the iOS sources but we'll use
// ImageElement to avoid conflicts with the native JS Image class.

/**
 * Texture container with the ability to calculate and draw quads
 */
class ImageElement extends BaseElement {
    texture!: Texture2D;
    quadToDraw: number | undefined;
    override restoreCutTransparency = false;
    drawSizeIncrement?: number;
    drawPosIncrement?: number;

    initTexture(texture: Texture2D) {
        this.texture = texture;
        this.restoreCutTransparency = false;

        if (this.texture.rects.length > 0) this.setTextureQuad(0);
        else this.setDrawFullImage();
    }

    getTexture(resId: number): Texture2D {
        // using the resMgr would create a circular dependency,
        // so we'll assume its been loaded and fetch directly
        const resEntry = RES_DATA[resId];
        if (!resEntry) {
            throw new Error(`ResEntry not found for resId: ${resId}`);
        }

        const texture = resEntry.texture;
        if (!texture) {
            Log.debug(`Image not loaded: ${resEntry.path}`);
            throw new Error(`Texture not loaded for: ${resEntry.path}`);
        }
        return texture;
    }

    override initTextureWithId(resId: number) {
        this.resId = resId;
        this.initTexture(this.getTexture(resId));
    }

    setTextureQuad(n: number) {
        this.quadToDraw = n;

        // don't set width / height to quad size if we cut transparency from each quad
        if (!this.restoreCutTransparency) {
            const rect = this.texture.rects[n];
            if (!rect) return;
            this.width = rect.w;
            this.height = rect.h;
        }
    }

    setDrawFullImage() {
        this.quadToDraw = Constants.UNDEFINED;
        this.width = this.texture.imageWidth;
        this.height = this.texture.imageHeight;
    }

    override doRestoreCutTransparency() {
        if (this.texture.preCutSize.x !== Vector.undefined.x) {
            this.restoreCutTransparency = true;
            this.width = this.texture.preCutSize.x;
            this.height = this.texture.preCutSize.y;
        }
    }

    override draw() {
        this.preDraw();

        // only draw if the image is non-transparent
        if (this.color.a !== 0 && this.texture && Canvas.context && this.texture.image) {
            if (this.quadToDraw === Constants.UNDEFINED) {
                // Round coordinates
                const qx = Math.round(this.drawX);
                const qy = Math.round(this.drawY);

                Canvas.context.drawImage(this.texture.image, qx, qy);
            } else if (this.quadToDraw !== undefined) {
                this.drawQuad(this.quadToDraw);
            }
        }

        this.postDraw();
    }

    drawQuad(n: number) {
        if (!Canvas.context || !this.texture.image) {
            return;
        }

        const rect = this.texture.rects[n];
        if (!rect) return;
        let quadWidth = rect.w;
        let quadHeight = rect.h;
        let qx = this.drawX;
        let qy = this.drawY;

        if (this.restoreCutTransparency) {
            const offset = this.texture.offsets[n];
            if (offset) {
                qx += offset.x;
                qy += offset.y;
                quadWidth += this.texture.adjustmentMaxX;
                quadHeight += this.texture.adjustmentMaxY;
            }
        }

        // Determine source rectangle with padding BEFORE rounding
        let srcX = rect.x;
        let srcY = rect.y;
        let srcWidth = quadWidth;
        let srcHeight = quadHeight;

        // If rect is NOT at origin, add 1px padding on all sides to prevent bleeding
        if (rect.x !== 0 && rect.y !== 0) {
            srcX -= 1;
            srcY -= 1;
            srcWidth += 2;
            srcHeight += 2;
        }

        // Now round the destination size and position
        if (this.drawSizeIncrement) {
            // Quantized size rounding for sub-pixel precision
            quadWidth = Math.round(quadWidth / this.drawSizeIncrement) * this.drawSizeIncrement;
            quadHeight = Math.round(quadHeight / this.drawSizeIncrement) * this.drawSizeIncrement;
        } else {
            // Default: snap to pixel boundaries
            quadWidth = Math.ceil(quadWidth);
            quadHeight = Math.ceil(quadHeight);
        }

        if (this.drawPosIncrement) {
            // Quantized position rounding for sub-pixel alignment
            qx = Math.round(qx / this.drawPosIncrement) * this.drawPosIncrement;
            qy = Math.round(qy / this.drawPosIncrement) * this.drawPosIncrement;
        } else {
            // Default: snap to pixel boundaries
            qx = Math.round(qx);
            qy = Math.round(qy);
        }

        // Adjust destination position if padding was added
        let destX = qx;
        let destY = qy;
        let destWidth = quadWidth;
        let destHeight = quadHeight;

        if (rect.x !== 0 && rect.y !== 0) {
            destX -= 1;
            destY -= 1;
            destWidth += 2;
            destHeight += 2;
        }

        Canvas.context.drawImage(
            this.texture.image,
            srcX,
            srcY,
            srcWidth,
            srcHeight,
            destX,
            destY,
            destWidth,
            destHeight
        );
    }

    drawTiled(q: number, x: number, y: number, width: number, height: number) {
        const ctx = Canvas.context;
        if (!ctx || !this.texture.image) return;

        let qx = 0;
        let qy = 0;
        let qw: number;
        let qh: number;
        let xoff;
        let yoff;
        let wd;
        let hg;

        if (q === Constants.UNDEFINED) {
            qw = this.texture.imageWidth;
            qh = this.texture.imageHeight;
        } else {
            const rect = this.texture.rects[q];
            if (!rect) return;
            qx = rect.x;
            qy = rect.y;
            qw = rect.w;
            qh = rect.h;
        }

        const xInc = qw | 0;
        const yInc = qh | 0;
        let ceilW, ceilH;

        yoff = 0;
        while (yoff < height) {
            xoff = 0;
            while (xoff < width) {
                wd = width - xoff;
                if (wd > qw) {
                    wd = qw;
                }
                ceilW = Math.ceil(wd);

                hg = height - yoff;
                if (hg > qh) {
                    hg = qh;
                }
                ceilH = Math.ceil(hg);

                ctx.drawImage(
                    this.texture.image,
                    qx | 0,
                    qy | 0,
                    ceilW,
                    ceilH, // source coordinates
                    (x + xoff) | 0,
                    (y + yoff) | 0,
                    ceilW,
                    ceilH
                ); // dest coordinates

                xoff += xInc;
            }

            yoff += yInc;
        }
    }

    pointInDrawQuad(x: number, y: number): boolean {
        if (this.quadToDraw === Constants.UNDEFINED) {
            return Rectangle.pointInRect(
                x,
                y,
                this.drawX,
                this.drawY,
                this.texture.width,
                this.texture.height
            );
        } else if (this.quadToDraw !== undefined) {
            const rect = this.texture.rects[this.quadToDraw];
            if (!rect) return false;
            let qx = this.drawX;
            let qy = this.drawY;

            if (this.restoreCutTransparency) {
                const offset = this.texture.offsets[this.quadToDraw];
                if (offset) {
                    qx += offset.x;
                    qy += offset.y;
                }
            }

            return Rectangle.pointInRect(x, y, qx, qy, rect.w, rect.h);
        }
        return false;
    }

    override handleAction(actionData: ActionData): boolean {
        if (super.handleAction(actionData)) {
            return true;
        }

        if (actionData.actionName === ActionType.SET_DRAWQUAD) {
            this.setTextureQuad(actionData.actionParam);
        } else {
            return false;
        }

        return true;
    }

    setElementPositionWithOffset(resId: number, index: number) {
        const texture = this.getTexture(resId);
        const offset = texture.offsets[index];
        if (!offset) return;
        this.x = offset.x;
        this.y = offset.y;
    }

    setElementPositionWithCenter(resId: number, index: number) {
        const texture = this.getTexture(resId);
        const rect = texture.rects[index];
        const offset = texture.offsets[index];
        if (!rect || !offset) return;
        this.x = offset.x + rect.w / 2;
        this.y = offset.y + rect.h / 2;
    }

    static create(resId: number, drawQuad: number | null): ImageElement {
        const image = new ImageElement();
        image.initTextureWithId(resId);

        if (drawQuad != null) image.setTextureQuad(drawQuad);

        return image;
    }
}

export default ImageElement;
