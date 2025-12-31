import Vector from "@/core/Vector";
import Quad2D from "@/core/Quad2D";
import type Rectangle from "@/core/Rectangle";

const isHtmlImageElement = (value: unknown): value is HTMLImageElement =>
    typeof HTMLImageElement !== "undefined" && value instanceof HTMLImageElement;

const getComputedDimension = (image: HTMLImageElement) => {
    if (!image || typeof window === "undefined" || !window.getComputedStyle) {
        return { width: 0, height: 0 };
    }

    try {
        const computed = window.getComputedStyle(image);
        return {
            width: parseInt(computed.width, 10) || 0,
            height: parseInt(computed.height, 10) || 0,
        };
    } catch (error) {
        window.console?.warn?.("Failed to get computed style for image", error);
        return { width: 0, height: 0 };
    }
};

const normalizeImageInput = (
    input:
        | {
              drawable: ImageBitmap | HTMLImageElement | HTMLCanvasElement;
              width?: number;
              height?: number;
              sourceUrl?: string;
          }
        | ImageBitmap
        | HTMLImageElement
        | HTMLCanvasElement
        | null
) => {
    if (!input) {
        return {
            drawable: null,
            width: 0,
            height: 0,
            sourceUrl: "",
        };
    }

    if (typeof input === "object" && "drawable" in input) {
        const drawable = input.drawable;
        const naturalWidth = isHtmlImageElement(drawable) ? drawable.naturalWidth : drawable?.width;
        const naturalHeight = isHtmlImageElement(drawable)
            ? drawable.naturalHeight
            : drawable?.height;
        const width = input.width || naturalWidth || 0;
        const height = input.height || naturalHeight || 0;
        const sourceUrl =
            input.sourceUrl || (isHtmlImageElement(drawable) ? drawable.src : "") || "";

        return {
            drawable,
            width,
            height,
            sourceUrl,
        };
    }

    const drawable = input;
    const naturalWidth = isHtmlImageElement(drawable) ? drawable.naturalWidth : drawable?.width;
    const naturalHeight = isHtmlImageElement(drawable) ? drawable.naturalHeight : drawable?.height;
    const width = naturalWidth || 0;
    const height = naturalHeight || 0;
    const sourceUrl = isHtmlImageElement(drawable) ? drawable.src : "";

    return {
        drawable,
        width,
        height,
        sourceUrl,
    };
};

class Texture2D {
    image: HTMLImageElement | HTMLCanvasElement | ImageBitmap | null;
    width = 0;
    height = 0;
    imageWidth: number;
    imageHeight: number;
    rects: { x: number; y: number; w: number; h: number }[];
    offsets: Vector[];
    adjustmentMaxX: number;
    adjustmentMaxY: number;
    preCutSize: Vector;
    quads: Quad2D[] = [];
    imageSrc: string;
    _invWidth: number;
    _invHeight: number;

    constructor(
        imageInput:
            | {
                  drawable: ImageBitmap | HTMLImageElement | HTMLCanvasElement;
                  width?: number;
                  height?: number;
                  sourceUrl?: string;
              }
            | ImageBitmap
            | HTMLImageElement
            | HTMLCanvasElement
            | null
    ) {
        const { drawable, width, height, sourceUrl } = normalizeImageInput(imageInput);

        this.image = drawable;

        this.rects = [];
        this.offsets = [];
        this.preCutSize = Vector.newUndefined();
        this.imageSrc = sourceUrl;

        let resolvedWidth = width;
        let resolvedHeight = height;

        if ((!resolvedWidth || !resolvedHeight) && isHtmlImageElement(drawable)) {
            const computed = getComputedDimension(drawable);
            resolvedWidth = resolvedWidth || computed.width;
            resolvedHeight = resolvedHeight || computed.height;
        }

        this.imageWidth = resolvedWidth || 0;
        this.imageHeight = resolvedHeight || 0;

        this._invWidth = this.imageWidth > 0 ? 1 / this.imageWidth : 0;
        this._invHeight = this.imageHeight > 0 ? 1 / this.imageHeight : 0;

        // sometimes we need to adjust offsets to pixel align
        this.adjustmentMaxX = 0;
        this.adjustmentMaxY = 0;
    }

    addRect(rect: Rectangle) {
        this.rects.push(rect);
        this.offsets.push(new Vector(0, 0));
    }

    setOffset(index: number, x: number, y: number) {
        const offset = this.offsets[index];
        if (!offset) {
            return;
        }
        offset.x = x;
        offset.y = y;
    }

    getCoordinates(rect: Rectangle) {
        return new Quad2D(
            this._invWidth * rect.x,
            this._invHeight * rect.y,
            this._invWidth * rect.w,
            this._invHeight * rect.h
        );
    }
}

export default Texture2D;
