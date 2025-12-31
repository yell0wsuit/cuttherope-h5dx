import ImageElement from "@/visual/ImageElement";
import Text from "@/visual/Text";
import Texture2D from "@/core/Texture2D";

interface DrawImgOptions {
    fontId: number;
    text: string;
    width?: number;
    alignment?: number;
    canvas?: boolean;
    img?: HTMLImageElement | HTMLCanvasElement;
}

class TextImage extends ImageElement {
    setText(
        fontId: number,
        text: string,
        width?: number,
        alignment?: number,
        renderOnCanvas = false
    ): void {
        const options: DrawImgOptions = {
            fontId,
            text,
        };

        if (width !== undefined) {
            options.width = width;
        }

        if (alignment !== undefined) {
            options.alignment = alignment;
        }

        if (renderOnCanvas) {
            options.canvas = true;
            options.img = document.createElement("canvas");
        }

        const img = Text.drawImg(options);
        this.initTexture(new Texture2D(img));
    }
}

export default TextImage;
