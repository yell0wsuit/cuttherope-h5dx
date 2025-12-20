import BaseElement from "@/visual/BaseElement";
import Constants from "@/utils/Constants";
import Alignment, { parseAlignment } from "@/core/Alignment";
import ImageMultiDrawer from "@/visual/ImageMultiDrawer";
import Canvas from "@/utils/Canvas";
import ResourceId from "@/resources/ResourceId";
import ResourceMgr from "@/resources/ResourceMgr";
import resolution from "@/resolution";
import MathHelper from "@/utils/MathHelper";
import type Font from "@/visual/Font";
import settings from "@/game/CTRSettings";
import LangId from "@/resources/LangId";

// Set to true to use the old sprite-based font rendering system
// Set to false (default) to use webfont-based rendering with stroke and shadow
const useOldFontRenderingSystem = false;

interface XmlElement {
    hasAttribute: (name: string) => boolean;
    attr: (name: string) => string;
    attrInt: (name: string, defaultValue?: number) => number;
    attrFloat: (name: string, defaultValue?: number) => number;
}

interface DrawTextOptionsBase {
    text: string;
    width?: number | undefined;
    alignment?: Alignment | undefined;
    scaleToUI?: boolean | undefined;
    alpha?: number | null | undefined;
    scale?: number | undefined;
    maxScaleWidth?: number | undefined;
    canvas?: boolean | undefined;
    img?: HTMLImageElement | HTMLCanvasElement | undefined;
    imgId?: string | undefined;
    imgSel?: string | undefined;
    imgParentId?: string | undefined;
}

interface DrawImgOptions extends DrawTextOptionsBase {
    /** Font resource ID */
    fontId: number;
}

interface DrawSmallOptions extends DrawTextOptionsBase {
    fontId?: number | undefined; // auto-filled by Text.drawSmall
}

interface DrawBigOptions extends DrawTextOptionsBase {
    fontId?: number | undefined; // auto-filled by Text.drawBig
}

interface DrawBigNumbersOptions extends DrawTextOptionsBase {
    fontId?: number | undefined; // auto-filled by Text.drawBigNumbers
}

interface DrawSystemOptions extends DrawTextOptionsBase {
    fontId: number;
    img: HTMLCanvasElement | HTMLImageElement;
}

interface FontOptions {
    fontId: number;
    alignment?: Alignment | undefined;
    alpha?: number | null | undefined;
}

class FormattedString {
    string: string;
    width: number;

    constructor(str: string, width: number) {
        this.string = str;
        this.width = width;
    }
}

class Text extends BaseElement {
    font: Font;
    formattedStrings: FormattedString[];
    align: Alignment;
    wrapWidth: number;
    wrapLongWords: boolean;
    maxHeight: number;
    d: ImageMultiDrawer;
    string: string;

    constructor(font: Font) {
        super();
        this.font = font;
        this.formattedStrings = [];
        this.string = "";
        this.width = Constants.UNDEFINED;
        this.height = Constants.UNDEFINED;
        this.align = Alignment.LEFT;
        this.d = new ImageMultiDrawer(font.texture);
        this.wrapLongWords = false;
        this.maxHeight = Constants.UNDEFINED;
        this.wrapWidth = 0;
    }

    setString(newString: string, width: number | null) {
        this.string = newString;
        if (width == null || width === Constants.UNDEFINED) {
            this.wrapWidth = Math.ceil(this.font.stringWidth(newString));
        } else {
            this.wrapWidth = Math.ceil(width);
        }

        if (this.string) {
            this.formatText();
            this.updateDrawerValues();
        }
    }

    updateDrawerValues() {
        let dx = 0;
        let dy = 0;
        let n = 0;
        const itemHeight = this.font.fontHeight();
        const dotsString = "..";
        const dotsOffset = this.font.getCharOffset(dotsString, 0);
        const linesToDraw =
            this.maxHeight === Constants.UNDEFINED
                ? this.formattedStrings.length
                : Math.min(
                      this.formattedStrings.length,
                      this.maxHeight / itemHeight + this.font.lineOffset
                  );
        const drawEllipsis = linesToDraw !== this.formattedStrings.length;

        for (let i = 0; i < linesToDraw; i++) {
            const fs = this.formattedStrings[i];
            if (!fs) continue;

            const s = fs.string;
            const len = s.length;

            if (this.align !== Alignment.LEFT) {
                if (this.align === Alignment.HCENTER || this.align === Alignment.CENTER) {
                    dx = (this.wrapWidth - fs.width) / 2;
                } else {
                    dx = this.wrapWidth - fs.width;
                }
            } else {
                dx = 0;
            }

            for (let c = 0; c < len; c++) {
                const char = s[c];
                if (!char) continue;

                if (char === " ") {
                    dx += this.font.spaceWidth + this.font.getCharOffset(s, c);
                } else {
                    const quadIndex = this.font.getCharQuad(char);
                    const rect = this.font.texture.rects[quadIndex];
                    if (!rect) continue;

                    const itemWidth = rect.w;
                    this.d.mapTextureQuad(quadIndex, Math.round(dx), Math.round(dy), n++);
                    dx += itemWidth + this.font.getCharOffset(s, c);
                }

                if (drawEllipsis && i === linesToDraw - 1) {
                    const dotIndex = this.font.getCharQuad(".");
                    const dotRect = this.font.texture.rects[dotIndex];
                    if (!dotRect) continue;
                    const dotWidth = dotRect.w;
                    if (
                        c === len - 1 ||
                        (c === len - 2 &&
                            dx + 3 * (dotWidth + dotsOffset) + this.font.spaceWidth >
                                this.wrapWidth)
                    ) {
                        this.d.mapTextureQuad(dotIndex, Math.round(dx), Math.round(dy), n++);
                        dx += dotWidth + dotsOffset;
                        this.d.mapTextureQuad(dotIndex, Math.round(dx), Math.round(dy), n++);
                        dx += dotWidth + dotsOffset;
                        this.d.mapTextureQuad(dotIndex, Math.round(dx), Math.round(dy), n++);
                        dx += dotWidth + dotsOffset;
                        break;
                    }
                }
            }
            dy += itemHeight + this.font.lineOffset;
        }

        if (this.formattedStrings.length <= 1) {
            this.height = this.font.fontHeight();
            this.width = dx;
        } else {
            this.height =
                (this.font.fontHeight() + this.font.lineOffset) * this.formattedStrings.length -
                this.font.lineOffset;
            this.width = this.wrapWidth;
        }

        if (this.maxHeight !== Constants.UNDEFINED) {
            this.height = Math.min(this.height, this.maxHeight);
        }
    }

    override draw() {
        this.preDraw();

        // only draw if the image is non-transparent
        if (this.color.a !== 0) {
            const len = this.string.length;
            const ctx = Canvas.context;
            if (len > 0 && ctx) {
                ctx.translate(this.drawX, this.drawY);
                this.d.drawNumberOfQuads(len);
                ctx.translate(-this.drawX, -this.drawY);
            }
        }

        this.postDraw();
    }

    formatText() {
        const strIdx = [];
        const s = this.string;
        const len = s.length;
        let idx = 0;
        let xc = 0;
        let wc = 0;
        let xp = 0;
        let xpe = 0;
        let wp = 0;
        let dx = 0;

        while (dx < len) {
            const c = s[dx++];
            if (!c) continue;

            if (c == " " || c == "\n") {
                wp += wc;
                xpe = dx - 1;
                wc = 0;
                xc = dx;

                if (c == " ") {
                    xc--;
                    wc = this.font.spaceWidth + this.font.getCharOffset(s, dx - 1);
                }
            } else {
                const quadIndex = this.font.getCharQuad(c);
                const rect = this.font.texture.rects[quadIndex];
                if (!rect) continue;
                const charWidth = rect.w;
                wc += charWidth + this.font.getCharOffset(s, dx - 1);
            }

            const tooLong = MathHelper.roundP2(wp + wc) > this.wrapWidth;

            if (this.wrapLongWords && tooLong && xpe == xp) {
                wp += wc;
                xpe = dx;
                wc = 0;
                xc = dx;
            }

            if ((MathHelper.roundP2(wp + wc) > this.wrapWidth && xpe != xp) || c == "\n") {
                strIdx[idx++] = xp;
                strIdx[idx++] = xpe;
                while (xc < len && s[xc] == " ") {
                    xc++;
                    wc -= this.font.spaceWidth;
                }

                xp = xc;
                xpe = xp;
                wp = 0;
            }
        }

        if (wc != 0) {
            strIdx[idx++] = xp;
            strIdx[idx++] = dx;
        }

        const strCount = idx >> 1;

        this.formattedStrings = [];
        for (let i = 0; i < strCount; i++) {
            const start = strIdx[i << 1];
            const end = strIdx[(i << 1) + 1];
            if (start === undefined || end === undefined) continue;

            const str = this.string.substring(start, end);
            const wd = this.font.stringWidth(str);
            const fs = new FormattedString(str, wd);
            this.formattedStrings.push(fs);
        }
    }

    /*
    createFromXml(xml: XmlElement): Text {
        const resId = xml.attrInt("font");
        const font = ResourceMgr.getFont(resId);
        if (!font) {
            throw new Error(`Font resource ${resId} not found`);
        }
        const element = new Text(font);

        if (xml.hasAttribute("align")) {
            element.align = parseAlignment(xml.attr("align"));
        }

        if (xml.hasAttribute("string")) {
            const strId = xml.attrInt("string");
            // TODO: Implement ResourceMgr.getString() when string resources are added
            const str = String(strId);
            const strWidth = xml.hasAttribute("width")
                ? xml.attrFloat("width")
                : Constants.UNDEFINED;

            element.setString(str, strWidth);
        }

        if (xml.hasAttribute("height")) {
            element.maxHeight = xml.attrFloat("height");
        }

        return element;
    }
    */

    static drawSystem(options: DrawSystemOptions) {
        const scaleFactor = resolution.CANVAS_WIDTH / 1024;

        // Use different line heights based on font ID, scaled for resolution
        const baseLineHeight = 28;
        const lineHeight = Math.round(baseLineHeight * scaleFactor);

        // Add top padding to prevent text cutoff, more for big font with CJK
        const baseTopPadding = 12;
        const topPadding = Math.round(baseTopPadding * scaleFactor);

        // Add bottom padding for small font to prevent cutoff for descenders like "g", "y", "p"
        const baseBottomPadding = 12;
        const bottomPadding = Math.round(baseBottomPadding * scaleFactor);

        const cnv = options.canvas
            ? (options.img as HTMLCanvasElement)
            : document.createElement("canvas");
        cnv.width =
            options.width || options.maxScaleWidth || options.text.length * 16 * scaleFactor;
        cnv.height = lineHeight + topPadding + bottomPadding;

        const ctx = (options.canvas ? (options.img as HTMLCanvasElement) : cnv).getContext("2d");
        if (!ctx) return options.img;

        // Explicitly clear the canvas to prevent corruption when reusing canvas elements
        ctx.clearRect(0, 0, cnv.width, cnv.height);
        let x = cnv.width / 2;

        if (options.alignment === 1) {
            x = 0;
        }

        setupFont(ctx, options);

        // detect overflow by measuring or newline character
        const metric = ctx.measureText(options.text);
        if (options.text.indexOf("\n") >= 0 || (options.width && metric.width > options.width)) {
            const textArray = stringToArray(ctx, options.text, options.width || 0);
            cnv.height = lineHeight * textArray.length + topPadding + bottomPadding;

            // Clear again after resizing for multiline text
            ctx.clearRect(0, 0, cnv.width, cnv.height);
            setupFont(ctx, options);

            // Recalculate x for center alignment based on canvas width
            if (options.alignment !== 1) {
                x = cnv.width / 2;
            }

            for (let i = 0; i < textArray.length; ++i) {
                const line = textArray[i];
                if (!line) continue;
                const yPos =
                    topPadding + (i + 1) * lineHeight - (lineHeight - Math.round(18 * scaleFactor));
                // Only stroke for non-Font ID 5
                if (options.fontId !== 5) {
                    ctx.strokeText(line, x, yPos);
                }
                ctx.fillText(line, x, yPos);
            }
        } else {
            // use the measured width
            if (!options.width || !options.maxScaleWidth) {
                cnv.width = metric.width + Math.round(5 * scaleFactor);
                // Clear again after resizing for single line text
                ctx.clearRect(0, 0, cnv.width, cnv.height);
                setupFont(ctx, options);
                if (options.alignment !== 1) x = cnv.width / 2;
            }
            const yPos = topPadding + lineHeight - (lineHeight - Math.round(18 * scaleFactor));
            // Only stroke for non-Font ID 5
            if (options.fontId !== 5) {
                ctx.strokeText(options.text, x, yPos);
            }
            ctx.fillText(options.text, x, yPos);
        }

        if (!options.canvas) {
            const imgElement = options.img as HTMLImageElement;
            imgElement.src = cnv.toDataURL("image/png");
            imgElement.style.paddingTop = "18px";
            options.img.style.height = "auto";
            options.img.style.width = "auto";
        } else {
            // For canvas mode, don't set auto width/height
            // The canvas element will display at its natural size
            options.img.style.paddingTop = "0px";

            // Apply CSS scaling if scale parameter is provided
            if (options.scale && options.scale !== 1) {
                const canvasElement = options.img as HTMLCanvasElement;
                canvasElement.style.width = `${cnv.width * options.scale}px`;
                canvasElement.style.height = `${cnv.height * options.scale}px`;
            }
        }

        return options.img;
    }

    static drawImg(options: DrawImgOptions): HTMLImageElement | HTMLCanvasElement {
        // get or create the image element
        let img: HTMLImageElement | HTMLCanvasElement | undefined = options.img;
        if (!img && options.imgId) {
            const element = document.getElementById(options.imgId);
            if (element instanceof HTMLImageElement || element instanceof HTMLCanvasElement) {
                img = element;
            }
        }
        if (!img && options.imgSel) {
            const element = document.querySelector(options.imgSel);
            if (element instanceof HTMLImageElement || element instanceof HTMLCanvasElement) {
                img = element;
            }
        }
        if (!img && options.imgParentId) {
            // obtains img child or prepends new Image if necessary
            const parent = document.getElementById(options.imgParentId);
            if (parent) {
                let imgElement = parent.querySelector(options.canvas ? "canvas" : "img") as
                    | HTMLImageElement
                    | HTMLCanvasElement
                    | null;
                if (!imgElement) {
                    imgElement = document.createElement(options.canvas ? "canvas" : "img") as
                        | HTMLImageElement
                        | HTMLCanvasElement;
                    parent.insertBefore(imgElement, parent.firstChild);
                }
                img = imgElement;
            }
        }
        if (!img) {
            img = new Image() as HTMLImageElement;
        }

        if (useOldFontRenderingSystem) {
            // Use the old sprite-based font rendering system
            const fontId = options.fontId;
            const width = options.width;
            const alignment = options.alignment;
            const scaleToUI = options.scaleToUI;
            const alpha = options.alpha != null ? options.alpha : 1;
            const scale = options.scaleToUI ? resolution.UI_TEXT_SCALE : options.scale || 1;
            // ensure the text is a string (ex: convert number to string)
            const text = options.text.toString();

            // save the existing canvas id and switch to the hidden canvas
            const existingCanvas = Canvas.element;

            // create a temporary canvas to use
            const targetCanvas =
                options.canvas && img instanceof HTMLCanvasElement
                    ? img
                    : document.createElement("canvas");
            Canvas.setTarget(targetCanvas);

            const font = ResourceMgr.getFont(fontId);
            if (!font) {
                throw new Error(`Font resource ${fontId} not found`);
            }
            const t = new Text(font);
            const padding = 24 * resolution.CANVAS_SCALE; // add padding to each side

            // set the text parameters
            t.x = Math.ceil(padding / 2);
            t.y = 0;
            t.align = alignment || Alignment.LEFT;
            t.setString(text, width ?? null);

            // set the canvas width and height
            const canvas = Canvas.element;
            const ctx = Canvas.context;
            if (!canvas || !ctx) return img;
            const imgWidth = (width || Math.ceil(t.width)) + Math.ceil(t.x * 2);
            const imgHeight = Math.ceil(t.height);
            canvas.width = imgWidth;
            canvas.height = imgHeight;

            const previousAlpha = ctx.globalAlpha;
            if (alpha !== previousAlpha) {
                ctx.globalAlpha = alpha;
            }

            // draw the text and get the image data
            t.draw();
            if (!options.canvas && img instanceof HTMLImageElement) {
                img.src = canvas.toDataURL("image/png");
            }

            if (alpha !== previousAlpha) {
                ctx.globalAlpha = previousAlpha;
            }

            // restore the original canvas for the App
            if (existingCanvas) {
                Canvas.setTarget(existingCanvas);
            }

            let finalWidth = imgWidth * scale,
                finalHeight = imgHeight * scale,
                topPadding,
                widthScale;
            const maxScaleWidth = options.maxScaleWidth;

            // do additional scaling if a max scale width was specified and exceeded
            if (maxScaleWidth && finalWidth > maxScaleWidth) {
                widthScale = maxScaleWidth / finalWidth;
                topPadding = Math.round(((1 - widthScale) * finalHeight) / 2);
                finalWidth *= widthScale;
                finalHeight *= widthScale;
            }

            // When the src is set using image data, the height and width are
            // not immediately available so we'll explicitly set them
            img.style.width = `${finalWidth}px`;
            img.style.height = `${finalHeight}px`;
            img.style.paddingTop = "0px";

            // adjust the top padding if we scaled the image for width
            if (topPadding) {
                img.style.paddingTop = `${topPadding}px`;
            }

            return img;
        }

        // Use webfont-based rendering for all languages
        const langElement = document.getElementById("lang");
        if (langElement) langElement.classList.add("lang-system");

        const systemOptions: DrawSystemOptions = {
            fontId: options.fontId,
            canvas: options.canvas,
            img: img,
            width: options.width,
            maxScaleWidth: options.maxScaleWidth,
            text: options.text.toString(),
            alignment: options.alignment,
            alpha: options.alpha ?? undefined,
        };
        return Text.drawSystem(systemOptions);
    }

    static drawSmall(options: DrawSmallOptions): HTMLImageElement | HTMLCanvasElement {
        return Text.drawImg({
            ...options,
            fontId: ResourceId.FNT_SMALL_FONT,
        } as DrawImgOptions);
    }

    static drawBig(options: DrawBigOptions): HTMLImageElement | HTMLCanvasElement {
        return Text.drawImg({
            ...options,
            fontId: ResourceId.FNT_BIG_FONT,
        } as DrawImgOptions);
    }

    static drawBigNumbers(options: DrawBigNumbersOptions): HTMLImageElement | HTMLCanvasElement {
        return Text.drawImg({
            ...options,
            fontId: ResourceId.FNT_FONT_NUMBERS_BIG,
        } as DrawImgOptions);
    }
}

const stringToArray = (ctx: CanvasRenderingContext2D, string: string, width: number): string[] => {
    // Handle text wrapping for both space-separated languages and CJK/continuous text
    const lines = string.split("\n");
    const output: string[] = [];

    for (const lineStr of lines) {
        if (!lineStr) {
            output.push("");
            continue;
        }

        // Check if the line contains spaces (word-based language)
        const hasSpaces = lineStr.includes(" ");

        if (hasSpaces) {
            // Word-based wrapping for languages like English, Russian with spaces
            const words = lineStr.split(" ");
            let currentLine = "";

            for (const word of words) {
                if (!word) continue;

                const testText = currentLine ? `${currentLine} ${word}` : word;
                const testWidth = ctx.measureText(testText).width;

                if (testWidth > width && currentLine) {
                    // Word doesn't fit, start new line
                    output.push(currentLine);
                    currentLine = word;
                } else {
                    currentLine = testText;
                }
            }

            if (currentLine) {
                output.push(currentLine);
            }
        } else {
            // Character-based wrapping for CJK and other continuous text
            let currentLine = "";

            for (const char of lineStr) {
                const testText = currentLine + char;
                const testWidth = ctx.measureText(testText).width;

                if (testWidth > width && currentLine) {
                    // Character doesn't fit, start new line
                    output.push(currentLine);
                    currentLine = char;
                } else {
                    currentLine = testText;
                }
            }

            if (currentLine) {
                output.push(currentLine);
            }
        }
    }

    return output;
};

const getFontFamily = (
    langId: number
): { family: string; weight: string; bigFontSize: number; smallFontSize: number } => {
    switch (langId) {
        case LangId.RU:
            return {
                family: "'Playpen Sans', sans-serif",
                weight: "normal",
                bigFontSize: 26,
                smallFontSize: 18,
            };
        case LangId.KO:
            return {
                family: "'Cafe24 Dongdong', sans-serif",
                weight: "normal",
                bigFontSize: 32,
                smallFontSize: 18,
            };
        case LangId.JA:
            return {
                family: "'MPLUSRounded1c-Medium', sans-serif",
                weight: "normal",
                bigFontSize: 30,
                smallFontSize: 18,
            };
        default:
            return {
                family: "'gooddognew', sans-serif",
                weight: "normal",
                bigFontSize: 32,
                smallFontSize: 22,
            };
    }
};

const setupFont = (ctx: CanvasRenderingContext2D, options: FontOptions) => {
    const color = options.fontId === 5 ? "#000" : "#fff";
    if (options.alignment !== 1) {
        ctx.textAlign = "center";
    }

    ctx.fillStyle = color;

    const scaleFactor = resolution.CANVAS_WIDTH / 1024;
    const {
        family: fontFamily,
        weight: fontWeight,
        bigFontSize,
        smallFontSize,
    } = getFontFamily(settings.getLangId());

    // Font ID 4 uses larger font size, Font ID 5 uses 22px
    if (options.fontId === 4) {
        const fontSize = Math.round(bigFontSize * scaleFactor);
        ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
    } else {
        const fontSize = Math.round(smallFontSize * scaleFactor);
        ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
    }

    // Apply stroke and shadow to all fonts except Font ID 5 (small black font)
    if (options.fontId !== 5) {
        // Apply stroke (outline) with width 2
        ctx.strokeStyle = "rgba(0,0,0,1)";
        ctx.lineWidth = Math.round(3 * scaleFactor);

        // Apply drop shadow
        ctx.shadowColor = "rgba(0,0,0,1)";
        ctx.shadowOffsetX = Math.round(1 * scaleFactor);
        ctx.shadowOffsetY = Math.round(1 * scaleFactor);
        ctx.shadowBlur = 0;
    }

    if (options.alpha) {
        ctx.globalAlpha = options.alpha;
    }
};

export default Text;
