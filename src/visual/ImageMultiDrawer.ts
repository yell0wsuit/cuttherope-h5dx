import BaseElement from "@/visual/BaseElement";
import Canvas from "@/utils/Canvas";
import Constants from "@/utils/Constants";
import Rectangle from "@/core/Rectangle";
import Vector from "@/core/Vector";
import type Texture2D from "@/core/Texture2D";

/**
 * Holds the information necessary to draw multiple quads from a
 * shared source image texture
 */
class ImageMultiDrawer extends BaseElement {
    texture: Texture2D;
    numberOfQuadsToDraw: number;
    texCoordinates: Rectangle[];
    vertices: Rectangle[];
    alphas: (number | null | undefined)[];
    rotationAngles: number[];
    rotationPositions: Vector[];

    constructor(texture: Texture2D) {
        super();

        this.texture = texture;
        this.numberOfQuadsToDraw = Constants.UNDEFINED;

        // holds the position in the texture that should be drawn
        this.texCoordinates = [];

        // holds the position on the canvas to render the texture quad
        this.vertices = [];

        // hold the alpha for each quad (if null then we assume alpha=1)
        this.alphas = [];

        // hold rotation angles and positions for rotatable particles
        this.rotationAngles = [];
        this.rotationPositions = [];

        // NOTE: in OpenGL its possible to draw multiple quads at once. In
        // canvas we'll just draw them sequentially (no need for indices buffer)
    }

    setTextureQuad(
        index: number,
        textureQuad: Rectangle,
        vertexQuad: Rectangle,
        alpha: number | null | undefined
    ) {
        this.texCoordinates[index] = textureQuad;
        this.vertices[index] = vertexQuad;
        this.alphas[index] = alpha != null ? alpha : 1;
    }

    removeQuads(index: number) {
        this.texCoordinates.splice(index, 1);
        this.vertices.splice(index, 1);
        this.alphas.splice(index, 1);
    }

    mapTextureQuad(quadIndex: number, dx: number, dy: number, index: number) {
        const textureRect = this.texture.rects[quadIndex];
        if (!textureRect) {
            return;
        }

        this.texCoordinates[index] = Rectangle.copy(textureRect);

        const offset = this.texture.offsets[quadIndex];
        const rect = this.texture.rects[quadIndex];
        if (!offset || !rect) {
            return;
        }

        this.vertices[index] = new Rectangle(dx + offset.x, dy + offset.y, rect.w, rect.h);
        this.alphas[index] = 1;
    }

    drawNumberOfQuads(n: number) {
        if (n > this.texCoordinates.length) {
            n = this.texCoordinates.length;
        }

        //console.log("DRAW NO OF QUADS", n)
        const ctx = Canvas.context;

        if (!ctx) {
            return;
        }

        for (let i = 0; i < n; i++) {
            const source = this.texCoordinates[i];
            const dest = this.vertices[i];
            if (!source || !dest) {
                continue;
            }

            const sourceW = Math.ceil(source.w);
            const sourceH = Math.ceil(source.h);
            let alpha = this.alphas[i];

            // verify we need to draw the source
            if (sourceW === 0 || sourceH === 0) {
                continue;
            }

            // change the alpha if necessary
            const angle = this.rotationAngles[i];
            const pivot = this.rotationPositions[i];
            const hasRotation = Boolean(pivot && angle != null && angle !== 0);
            let saved = false;
            if (hasRotation) {
                ctx.save();
                saved = true;
            }

            const previousAlpha = ctx.globalAlpha;
            if (alpha == null) {
                // if alpha was not specified, we assume full opacity
                alpha = 1;
            } else if (alpha <= 0) {
                // no need to draw invisible images
                if (saved) {
                    ctx.restore();
                }
                continue;
            } else if (alpha < 1) {
                ctx.globalAlpha = alpha;
            }

            // Canvas already handles sub-pixel anti-aliasing internally.
            // The commented out code was a legacy relic from the iOS (OpenGL ES) version.

            // see if we need sub-pixel alignment
            //let qx, qy, qw, qh;
            // if (this.drawPosIncrement) {
            //     qx = Math.round(dest.x / this.drawPosIncrement) * this.drawPosIncrement;
            //     qy = Math.round(dest.y / this.drawPosIncrement) * this.drawPosIncrement;
            //     qw = Math.round(dest.w / this.drawPosIncrement) * this.drawPosIncrement;
            //     qh = Math.round(dest.h / this.drawPosIncrement) * this.drawPosIncrement;
            // }
            // else {
            // otherwise by default we snap to pixel boundaries for perf
            const qx = Math.trunc(dest.x);
            const qy = Math.trunc(dest.y);
            // use ceil so that we match the source when scale is equal
            const qw = 1 + Math.trunc(dest.w);
            const qh = 1 + Math.trunc(dest.h);
            //}

            const image = this.texture.image;
            if (!image) {
                if (saved) {
                    ctx.restore();
                } else if (alpha !== 1) {
                    ctx.globalAlpha = previousAlpha;
                }
                continue;
            }

            if (saved && pivot && angle != null) {
                ctx.translate(pivot.x, pivot.y);
                ctx.rotate(angle);
                ctx.translate(-pivot.x, -pivot.y);
            }

            ctx.drawImage(
                image,
                source.x,
                source.y,
                sourceW,
                sourceH, // source coordinates
                qx,
                qy,
                qw,
                qh
            ); // destination coordinates

            // undo alpha changes
            if (saved) {
                ctx.restore();
            } else if (alpha !== 1) {
                ctx.globalAlpha = previousAlpha;
            }
        }
    }

    override draw() {
        this.preDraw();

        // only draw if the image is non-transparent
        if (this.color.a !== 0) {
            const ctx = Canvas.context;
            const shouldTranslate = this.drawX !== 0 || this.drawY !== 0;

            if (!ctx) {
                return;
            }

            if (shouldTranslate) {
                ctx.translate(this.drawX, this.drawY);
            }

            const count =
                this.numberOfQuadsToDraw === Constants.UNDEFINED
                    ? this.texCoordinates.length
                    : this.numberOfQuadsToDraw;
            this.drawNumberOfQuads(count);

            if (shouldTranslate) {
                ctx.translate(-this.drawX, -this.drawY);
            }
        }

        this.postDraw();
    }
}

export default ImageMultiDrawer;
