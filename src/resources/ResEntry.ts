/**
 * ResEntry constructor
 */

import type Texture2D from "@/core/Texture2D";
import type Font from "@/visual/Font";
import type { ParsedAtlasInfo } from "@/resources/TextureAtlasParser";
import type { ResourceInfo } from "@/resources/ResScale";

interface ResEntryOptions {
    atlasPath: string;
    atlasFormat: string;
    frameOrder?: string[];
    offsetNormalization?: "center";
}

// Extended atlas info for font resources
export interface ExtendedAtlasInfo extends Partial<ParsedAtlasInfo> {
    chars?: string;
    kerning?: Record<string, number> | null;
    charOffset?: number;
    lineOffset?: number;
    spaceWidth?: number;
}

class ResEntry {
    path: string;
    type: number;
    atlasPath?: string;
    atlasFormat?: string;
    frameOrder?: string[];
    offsetNormalization?: "center";
    texture?: Texture2D; // Added at runtime by ResourceMgr
    font?: Font; // Added at runtime by ResourceMgr
    info?: ParsedAtlasInfo | ExtendedAtlasInfo | ResourceInfo; // Added at runtime by ResourceMgr
    pendingImage?:
        | HTMLImageElement
        | ImageBitmap
        | {
              drawable: ImageBitmap | HTMLImageElement | HTMLCanvasElement;
              width?: number;
              height?: number;
              sourceUrl?: string;
          }; // Added at runtime by ResourceMgr
    _atlasFailed?: boolean; // Added at runtime by ResourceMgr

    constructor(path: string, type: number, options: Partial<ResEntryOptions> = {}) {
        this.path = path;
        this.type = type;

        if (options.atlasPath) {
            this.atlasPath = options.atlasPath;
        }

        if (options.atlasFormat) {
            this.atlasFormat = options.atlasFormat;
        }

        if (options.frameOrder) {
            this.frameOrder = options.frameOrder.slice();
        }

        if (options.offsetNormalization) {
            this.offsetNormalization = options.offsetNormalization;
        }
    }
}

export default ResEntry;
