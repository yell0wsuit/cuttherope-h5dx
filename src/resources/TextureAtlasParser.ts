import Rectangle from "@/core/Rectangle";
import Vector from "@/core/Vector";

/**
 * A single frame entry (after parsing).
 */
interface FrameEntry {
    name: string;
    data: FrameData;
}

/**
 * Frame data structure from TexturePacker JSON.
 */
interface FrameData {
    frame: Rectangle;
    rotated?: boolean;
    spriteSourceSize?: Rectangle;
    sourceSize?: { w: number; h: number };
    trimmed?: boolean;
    filename?: string;
    name?: string;
}

/**
 * Metadata block from TexturePacker JSON.
 */
interface TexturePackerMeta {
    app: string;
    version: string;
    image: string;
    format: string;
    size: { w: number; h: number };
    scale: string;
    smartupdate?: string;
}

/**
 * Complete TexturePacker JSON structure.
 */
export interface TexturePackerAtlas {
    frames: Record<string, FrameData> | FrameData[];
    meta?: TexturePackerMeta;
}

/**
 * Parsed result info.
 */
export interface ParsedAtlasInfo {
    rects: Rectangle[];
    offsets?: { x: number; y: number }[];
    preCutWidth?: number;
    preCutHeight?: number;
    frameKeys: string[];
    frameIndexByName: Record<string, number>;
    adjustmentMaxX?: number;
    adjustmentMaxY?: number;
    atlasMeta?: TexturePackerMeta | null;
}

/**
 * Extra options for parseTexturePackerAtlas.
 */
interface ParseAtlasOptions {
    existingInfo?: ParsedAtlasInfo | Partial<ParsedAtlasInfo> | undefined;
    offsetNormalization?: "center" | undefined;
    frameOrder?: string[] | undefined;
}

/**
 * Builds frame entries from the TexturePacker frames block.
 * @param {Record<string, FrameData> | FrameData[]} frames
 * @returns {FrameEntry[]}
 */
const createFrameEntries = (frames: Record<string, FrameData> | FrameData[]): FrameEntry[] => {
    if (!frames) {
        return [];
    }

    // If frames is an array, preserve its natural order
    if (Array.isArray(frames)) {
        return frames.map((frame, index) => ({
            name: frame.filename ?? frame.name ?? String(index),
            data: frame,
        }));
    }

    // If frames is an object (unordered), sort alphabetically for stability
    return Object.keys(frames)
        .sort()
        .map((name) => ({
            name,
            data: frames[name]!,
        }));
};

/**
 * Orders frame entries according to a defined sequence.
 */
const orderFrameEntries = (entries: FrameEntry[], frameOrder: string[]): FrameEntry[] => {
    if (!frameOrder || frameOrder.length === 0) {
        return entries;
    }

    const orderMap = new Map(frameOrder.map((name, i) => [name, i]));

    return entries.slice().sort((a, b) => {
        const indexA = orderMap.get(a.name) ?? Number.MAX_SAFE_INTEGER;
        const indexB = orderMap.get(b.name) ?? Number.MAX_SAFE_INTEGER;
        return indexA === indexB ? a.name.localeCompare(b.name) : indexA - indexB;
    });
};

/**
 * Parses a TexturePacker JSON atlas into a normalized info object.
 * @param {TexturePackerAtlas} atlasData
 * @param {ParseAtlasOptions} [options]
 * @returns {ParsedAtlasInfo}
 */
export const parseTexturePackerAtlas = (
    atlasData: TexturePackerAtlas,
    options: ParseAtlasOptions = {}
): ParsedAtlasInfo => {
    const { existingInfo = {}, offsetNormalization, frameOrder } = options;

    if (!atlasData || !atlasData.frames) {
        return existingInfo as ParsedAtlasInfo;
    }

    // Auto-detect order directly from JSON array if available
    let autoFrameOrder = null;
    if (Array.isArray(atlasData.frames)) {
        autoFrameOrder = atlasData.frames
            .map((f) => f.filename ?? f.name)
            .filter((name) => typeof name === "string");
    }

    let entries = createFrameEntries(atlasData.frames);
    // Use provided frameOrder, or fall back to auto-detected order
    const orderToUse = frameOrder || autoFrameOrder;
    if (orderToUse) {
        entries = orderFrameEntries(entries, orderToUse);
    }
    if (entries.length === 0) {
        return existingInfo as ParsedAtlasInfo;
    }

    const info: ParsedAtlasInfo = {
        ...existingInfo,
        rects: [],
        frameKeys: [],
        frameIndexByName: {},
    };

    const rects: Rectangle[] = [];
    const offsets: Vector[] = [];
    const rectSizes: { w: number; h: number }[] = [];
    const frameKeys: string[] = [];

    let hasNonZeroOffset = false;
    let preCutWidth = info.preCutWidth ?? 0;
    let preCutHeight = info.preCutHeight ?? 0;

    entries.forEach((entry, index) => {
        const frameInfo = entry.data;
        const frameRect = frameInfo.frame;
        if (!frameRect) {
            return;
        }

        if (frameInfo.rotated) {
            console.warn(`TexturePacker frame "${entry.name}" is rotated — not supported.`);
        }

        rects.push(new Rectangle(frameRect.x, frameRect.y, frameRect.w, frameRect.h));
        rectSizes.push({ w: frameRect.w, h: frameRect.h });

        const spriteSourceSize = frameInfo.spriteSourceSize;
        if (spriteSourceSize) {
            const offset = new Vector(spriteSourceSize.x || 0, spriteSourceSize.y || 0);
            offsets.push(offset);
            if (offset.x !== 0 || offset.y !== 0) {
                hasNonZeroOffset = true;
            }
        } else {
            offsets.push(new Vector(0, 0));
        }

        const sourceSize = frameInfo.sourceSize;
        if (sourceSize) {
            preCutWidth = Math.max(preCutWidth, sourceSize.w || 0);
            preCutHeight = Math.max(preCutHeight, sourceSize.h || 0);
        }

        frameKeys.push(entry.name ?? String(index));
    });

    info.rects = rects.map((r) => ({ x: r.x, y: r.y, w: r.w, h: r.h }));

    // Optional center normalization
    if (offsetNormalization === "center") {
        const centered = rectSizes.map((s) => {
            const cx = Math.round(((preCutWidth || s.w) - s.w) / 2);
            const cy = Math.round(((preCutHeight || s.h) - s.h) / 2);
            return new Vector(cx, cy);
        });
        offsets.splice(0, offsets.length, ...centered);
        hasNonZeroOffset = centered.some((o) => o.x || o.y);
    }

    if (offsets.length && hasNonZeroOffset) {
        info.offsets = offsets.map((o) => ({ x: o.x, y: o.y }));
    }

    if (preCutWidth && preCutHeight) {
        info.preCutWidth = preCutWidth;
        info.preCutHeight = preCutHeight;
    }

    info.frameKeys = frameKeys;
    info.frameIndexByName = frameKeys.reduce(
        (acc, name, i) => {
            acc[name] = i;
            return acc;
        },
        {} as Record<string, number>
    );

    // When frames are trimmed and carry offsets, pad the drawn quad by 1px
    // so restored transparency aligns perfectly with the untrimmed size.
    // ResourceMgr will clamp source rects to avoid sampling outside atlas.
    if (hasNonZeroOffset) {
        info.adjustmentMaxX = info.adjustmentMaxX ?? 1;
        info.adjustmentMaxY = info.adjustmentMaxY ?? 1;
    }

    info.atlasMeta = atlasData.meta || null;
    return info;
};

export default parseTexturePackerAtlas;
