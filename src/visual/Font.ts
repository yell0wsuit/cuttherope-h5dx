import ImageElement from "@/visual/ImageElement";
import Canvas from "@/utils/Canvas";
import Constants from "@/utils/Constants";
import Log from "@/utils/Log";
import type Texture2D from "@/core/Texture2D";

class Font extends ImageElement {
    chars: string;
    charOffset: number;
    lineOffset: number;
    spaceWidth: number;
    kerning: Record<string, number> | null;

    constructor() {
        super();

        this.chars = "";
        this.charOffset = 0;
        this.lineOffset = 0;
        this.spaceWidth = 0;
        this.kerning = null;
    }

    initWithVariableSizeChars(
        chars: string,
        charTexture: Texture2D,
        kerningDictionary: Record<string, number> | null
    ): void {
        this.chars = chars;
        this.initTexture(charTexture);
        this.kerning = kerningDictionary;
    }

    setOffsets(charOffset: number, lineOffset: number, spaceWidth: number): void {
        this.charOffset = charOffset;
        this.lineOffset = lineOffset;
        this.spaceWidth = spaceWidth;
    }

    getCharQuad(c: string): number {
        const charIndex = this.chars.indexOf(c);
        if (charIndex >= 0) {
            return charIndex;
        }

        Log.alert(`Char not found in font: ${c}`);

        // replace missing character with a period
        return this.chars.indexOf(".");
    }

    drawQuadWOBind(index: number, x: number, y: number): void {
        const rect = this.texture.rects[index];

        if (!rect || !this.texture.image || !Canvas.context) {
            return;
        }

        const quadWidth = Math.ceil(rect.w);
        const quadHeight = Math.ceil(rect.h);

        Canvas.context.drawImage(
            this.texture.image,
            rect.x | 0,
            rect.y | 0,
            quadWidth,
            quadHeight, // source coordinates
            x | 0,
            y | 0,
            quadWidth,
            quadHeight
        ); // destination coordinates
    }

    stringWidth(str: string): number {
        let strWidth = 0;
        const len = str.length;
        let lastOffset = 0;
        for (let c = 0; c < len; c++) {
            lastOffset = this.getCharOffset(str, c);

            const char = str[c];
            if (!char) {
                continue;
            }

            if (char === " ") {
                strWidth += this.spaceWidth + lastOffset;
            } else {
                const quadIndex = this.getCharQuad(char);
                const rect = this.texture.rects[quadIndex];
                if (!rect) {
                    continue;
                }

                const itemWidth = rect.w;
                strWidth += itemWidth + lastOffset;
            }
        }
        strWidth -= lastOffset;
        return Math.ceil(strWidth);
    }

    fontHeight(): number {
        const rect = this.texture.rects[0];
        return rect ? rect.h : 0;
    }

    getCharOffset(str: string, charIndex: number): number {
        // no offset if its the last character
        if (charIndex === str.length - 1) {
            return 0;
        }

        // use the default offset if no kerning is defined
        if (!this.kerning) {
            return this.charOffset;
        }

        const char1 = str[charIndex];
        const char2 = str[charIndex + 1];

        if (!char1 || !char2) {
            return this.charOffset;
        }

        // see if kerning is specified for char pair or use the default offset
        const chars = char1 + char2;
        const v = this.kerning[chars];
        if (v != null) {
            return v;
        } else {
            return this.charOffset;
        }
    }
}

export default Font;
