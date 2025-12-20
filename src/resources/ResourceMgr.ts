import ResInfo from "@/ResInfo";
import RES_DATA from "@/resources/ResData";
import ResScaler, { type ResourceInfo } from "@/resources/ResScale";
import ResourceType from "@/resources/ResourceType";
import resolution from "@/resolution";
import Font from "@/visual/Font";
import Texture2D from "@/core/Texture2D";
import Vector from "@/core/Vector";
import Rectangle from "@/core/Rectangle";
import Log from "@/utils/Log";
import {
    parseTexturePackerAtlas,
    type TexturePackerAtlas,
    type ParsedAtlasInfo,
} from "@/resources/TextureAtlasParser";
import type ResEntry from "./ResEntry";

/**
 * Resource manager for handling game assets including textures, fonts, and atlases
 */
class ResourceMgr {
    /**
     * Handles loaded image resources
     */
    static onResourceLoaded(
        resId: number,
        img:
            | HTMLImageElement
            | ImageBitmap
            | {
                  drawable: ImageBitmap | HTMLImageElement | HTMLCanvasElement;
                  width?: number;
                  height?: number;
                  sourceUrl?: string;
              }
    ) {
        const resource = RES_DATA[resId];
        if (!resource) {
            return;
        }

        resource.pendingImage = img;
        this._finalizeTextureResource(resId);
    }

    /**
     * Handles loaded atlas data
     */
    static onAtlasLoaded(resId: number, atlasData: TexturePackerAtlas) {
        const resource = RES_DATA[resId];
        if (!resource) {
            return;
        }

        resource.info = this._parseAtlasForResource(resource, atlasData);
        resource._atlasFailed = false;
        this._finalizeTextureResource(resId);
    }

    /**
     * Handles atlas loading errors
     */
    static onAtlasError(resId: number, error: Error) {
        const resource = RES_DATA[resId];
        if (!resource) {
            return;
        }

        globalThis.console?.error?.("Failed to load atlas for resource", resId, error);
        resource._atlasFailed = true;
        this._finalizeTextureResource(resId);
    }

    /**
     * Parses atlas data for a resource
     * @private
     */
    static _parseAtlasForResource(
        resource: ResEntry,
        atlasData: TexturePackerAtlas
    ): ParsedAtlasInfo {
        const format = resource.atlasFormat || "texture-packer";
        const existingInfo = resource.info;

        switch (format) {
            case "texture-packer":
                return parseTexturePackerAtlas(atlasData, {
                    existingInfo: existingInfo as Partial<ParsedAtlasInfo> | undefined,
                    frameOrder: resource.frameOrder,
                    offsetNormalization: resource.offsetNormalization,
                });
            default:
                globalThis.console?.warn?.("Unsupported atlas format", format);
                return (existingInfo || {}) as ParsedAtlasInfo;
        }
    }

    /**
     * Finalizes texture resource after image and optional atlas are loaded
     * @private
     */
    static _finalizeTextureResource(resId: number) {
        const resource = RES_DATA[resId];
        if (!resource || !resource.pendingImage) {
            return;
        }

        if (resource.atlasPath && !resource.info && !resource._atlasFailed) {
            return;
        }

        const img = resource.pendingImage;
        delete resource.pendingImage;

        switch (resource.type) {
            case ResourceType.IMAGE:
                resource.texture = new Texture2D(img);
                this.setQuads(resource);
                break;
            case ResourceType.FONT:
                resource.texture = new Texture2D(img);
                this.setQuads(resource);
                if (resource.info && "chars" in resource.info) {
                    const info = resource.info;
                    if (
                        typeof info.chars === "string" &&
                        typeof info.charOffset === "number" &&
                        typeof info.lineOffset === "number" &&
                        typeof info.spaceWidth === "number"
                    ) {
                        const font = new Font();
                        font.initWithVariableSizeChars(
                            info.chars,
                            resource.texture,
                            info.kerning ?? null
                        );
                        font.setOffsets(info.charOffset, info.lineOffset, info.spaceWidth);
                        resource.font = font;
                    }
                }
                break;
        }
    }

    /**
     * Sets texture quads from xml info
     */
    static setQuads(resource: ResEntry) {
        if (!resource || !resource.texture) {
            return;
        }

        const t = resource.texture,
            imageWidth = t.imageWidth,
            imageHeight = t.imageHeight,
            info = resource.info || {},
            rects = info.rects,
            offsets = info.offsets;

        t.preCutSize = Vector.newUndefined();

        if (!rects) {
            return;
        }

        // we need to make sure our scaled quad doesn't slightly
        // exceed the dimensions of the image. we pad images with
        // offsets with 1 extra pixel because offsets are pixel aligned
        // so they might need to go slightly beyond the dimensions
        // specified in the rect
        t.adjustmentMaxX = info.adjustmentMaxX ? info.adjustmentMaxX : 0;
        t.adjustmentMaxY = info.adjustmentMaxY ? info.adjustmentMaxY : 0;

        for (let i = 0, len = rects.length; i < len; i++) {
            // convert it to a Rectangle object
            const rawRect = rects[i];
            if (!rawRect || typeof rawRect === "number") continue;

            const rect = new Rectangle(rawRect.x, rawRect.y, rawRect.w, rawRect.h);

            if (rect.w + t.adjustmentMaxX > imageWidth) {
                rect.w = imageWidth - t.adjustmentMaxX;
            }
            if (rect.h + t.adjustmentMaxY > imageHeight) {
                rect.h = imageHeight - t.adjustmentMaxY;
            }

            t.addRect(rect);
        }

        if (offsets) {
            // set the offsets inside the texture
            const oCount = offsets.length;
            let i;
            for (i = 0; i < oCount; i++) {
                const offset = offsets[i];
                if (!offset || typeof offset === "number") continue;
                if ("x" in offset && "y" in offset) {
                    t.setOffset(i, offset.x, offset.y);
                }
            }
        }

        // see if there is a pre-cut size specified
        if (info.preCutWidth && info.preCutHeight) {
            t.preCutSize.x = info.preCutWidth;
            t.preCutSize.y = info.preCutHeight;
        }
    }

    /**
     * Gets texture for a resource
     */
    static getTexture(resId: number): Texture2D | null {
        const resEntry = RES_DATA[resId];
        if (resEntry?.texture) {
            return resEntry.texture;
        }

        Log.debug(`Image not yet loaded: ${resEntry?.path}`);
        return null;
    }

    /**
     * Gets font for a resource
     */
    static getFont(resId: number): Font | null {
        const resEntry = RES_DATA[resId];
        if (resEntry?.font) {
            return resEntry.font;
        }

        Log.debug(`Font not yet loaded: ${resEntry?.path}`);
        return null;
    }
}

// Initialize resource infos - merge and scale resource entries
export const initializeResources = () => {
    const infos = [...ResInfo] as ResourceInfo[];
    ResScaler.scaleResourceInfos(infos, resolution.CANVAS_SCALE);
    for (let i = 0, len = infos.length; i < len; i++) {
        const info = infos[i];
        if (info) {
            delete info.originalRects;
            delete info.offsetAdjustments;

            if (info.id !== undefined) {
                const resource = RES_DATA[info.id];
                if (resource) {
                    resource.info = info;
                }
            }
        }
    }
};

export default ResourceMgr;
