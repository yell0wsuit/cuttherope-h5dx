export type BoxLocale =
    | "en"
    | "ko"
    | "zh"
    | "ja"
    | "nl"
    | "it"
    | "ca"
    | "br"
    | "es"
    | "fr"
    | "de"
    | "ru";

export type BoxTextJson = { en: string } & Partial<Record<Exclude<BoxLocale, "en">, string>>;

export interface MenuStringEntry {
    id: number;
    en: string;
    zh?: string;
    ja?: string;
    ko?: string;
    nl?: string;
    it?: string;
    ca?: string;
    br?: string;
    es?: string;
    fr?: string;
    de?: string;
    ru?: string;
}

export interface RawBoxMetadataJson {
    id: string;
    boxText: BoxTextJson;
    boxImage?: string | null;
    boxDoor?: string | null;
    boxType: "HOLIDAY" | "NORMAL" | "MORECOMING";
    unlockStars?: number | null;
    support?: number | null;
    showEarth?: boolean;
    levelBackgroundId?: string | null;
    levelOverlayId?: string | null;
    levelCount?: number;
    levelLabel?: number | null;
}

export type LevelScalar = number | string | boolean | null | undefined;

export type LevelEntity = {
    name: number | string;
} & Record<string, LevelScalar>;

export interface LevelJsonCore {
    settings: LevelEntity[];
    objects: LevelEntity[];
}

export type LevelJson = LevelJsonCore & Record<string, LevelEntity[] | LevelScalar | undefined>;

export interface LoadedLevelEntry {
    levelNumber: string;
    level: LevelJson;
}

export type JsonCacheEntry = RawBoxMetadataJson[] | LevelJson;
