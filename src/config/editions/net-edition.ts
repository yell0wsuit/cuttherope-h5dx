import boxesData from "@/boxes";
import JsonLoader from "@/resources/JsonLoader";
import ResourcePacks from "@/resources/ResourcePacks";
import ResourceId from "@/resources/ResourceId";
import BoxType from "@/ui/BoxType";
import LangId from "@/resources/LangId";
import { IS_JANUARY } from "@/utils/SpecialEvents";

import type { RawBoxMetadataJson, BoxTextJson } from "@/types/json";

const HOLIDAY_GIFT_BOX_ID = "holidaygiftbox" as const;

type BoxTypeValue = (typeof BoxType)[keyof typeof BoxType];

interface BoxMetadata {
    id: string;
    boxText: BoxTextJson;
    boxImage: string | null;
    boxDoor: string | null;
    boxType: BoxTypeValue;
    unlockStars: number | null;
    support: number | null;
    showEarth: boolean;
    levelBackgroundId: number | null;
    levelOverlayId: number | null;
}

const normalizeBoxType = (boxType: RawBoxMetadataJson["boxType"]): BoxTypeValue => {
    const resolved = BoxType[boxType as keyof typeof BoxType];
    return (typeof resolved === "string" ? resolved : boxType) as BoxTypeValue;
};

const toResourceId = (
    value: RawBoxMetadataJson["levelBackgroundId"] | RawBoxMetadataJson["levelOverlayId"]
): number | null => {
    if (value == null) {
        return null;
    }

    if (typeof value === "number") {
        return value;
    }

    const resolved = ResourceId[value as keyof typeof ResourceId];
    return typeof resolved === "number" ? resolved : null;
};

class NetEdition {
    private _cachedNormalizedMetadata: BoxMetadata[] | null = null;

    shadowSpeedup?: number = 1;
    menuMusicId?: string;
    siteUrl = "http://www.cuttherope.net";
    disableHiddenDrawings = true;
    disableLanguageOption = false;
    languages: number[] = [
        LangId.EN,
        LangId.FR,
        LangId.IT,
        LangId.DE,
        LangId.NL,
        LangId.RU,
        LangId.ES,
        LangId.BR,
        LangId.CA,
        LangId.KO,
        LangId.ZH,
        LangId.JA,
    ];
    boxBorders: string[] = [];
    menuSoundIds = ResourcePacks.StandardMenuSounds;
    gameSoundIds: number[] = [
        ...ResourcePacks.StandardGameSounds,
        ...ResourcePacks.FullGameAdditionalSounds,
    ];
    menuImageFilenames = ResourcePacks.StandardMenuImageFilenames;
    loaderPageImages: string[] = ["loader-bg.jpg", "loader-logo.png"];
    gameImageIds: number[] = [
        ...ResourcePacks.StandardGameImages,
        ...ResourcePacks.FullGameAdditionalGameImages,
    ];
    boxes = boxesData;
    drawingImageNames: string[] = [];
    editionImages = "";
    editionImageDirectory = "";
    disableBoxMenu = false;
    enableBoxBackgroundEasterEgg = false;
    boxDirectory = "ui/";
    settingPrefix = "";

    getNormalizedBoxMetadata(): BoxMetadata[] {
        if (this._cachedNormalizedMetadata) {
            return this._cachedNormalizedMetadata;
        }

        const rawBoxMetadata: RawBoxMetadataJson[] = JsonLoader.getBoxMetadata() ?? [];

        const normalizedMetadata = rawBoxMetadata.map((box) => {
            const isHolidayBox = box.id === HOLIDAY_GIFT_BOX_ID;

            const normalized: BoxMetadata = {
                id: box.id,
                boxText: box.boxText,
                boxImage: box.boxImage ?? null,
                boxDoor: box.boxDoor ?? null,
                boxType: normalizeBoxType(box.boxType),
                unlockStars: box.unlockStars ?? null,
                support: box.support ?? null,
                showEarth: box.showEarth ?? false,
                levelBackgroundId: toResourceId(box.levelBackgroundId),
                levelOverlayId: toResourceId(box.levelOverlayId),
            };

            if (IS_JANUARY && isHolidayBox) {
                normalized.boxDoor = "levelbgpad.webp";
                normalized.levelBackgroundId = ResourceId.IMG_BGR_PADDINGTON ?? null;
                normalized.levelOverlayId = ResourceId.IMG_BGR_PADDINGTON ?? null;
            }

            return normalized;
        });

        this._cachedNormalizedMetadata = normalizedMetadata;
        return normalizedMetadata;
    }

    get boxText(): BoxTextJson[] {
        return this.getNormalizedBoxMetadata().map(({ boxText }) => boxText);
    }

    get boxImages(): (string | null)[] {
        return this.getNormalizedBoxMetadata().map(({ boxImage }) => boxImage);
    }

    get boxDoors(): string[] {
        return this.getNormalizedBoxMetadata()
            .map(({ boxDoor }) => boxDoor)
            .filter((boxDoor): boxDoor is string => boxDoor != null);
    }

    get boxTypes(): BoxTypeValue[] {
        return this.getNormalizedBoxMetadata().map(({ boxType }) => boxType);
    }

    get unlockStars(): (number | null)[] {
        return this.getNormalizedBoxMetadata().map(({ unlockStars }) => unlockStars);
    }

    get supports(): (number | null)[] {
        return this.getNormalizedBoxMetadata().map(({ support }) => support);
    }

    get showEarth(): boolean[] {
        return this.getNormalizedBoxMetadata().map(({ showEarth }) => showEarth);
    }

    get levelBackgroundIds(): number[] {
        return this.getNormalizedBoxMetadata()
            .map(({ levelBackgroundId }) => levelBackgroundId)
            .filter((id): id is number => id != null);
    }

    get levelOverlayIds(): number[] {
        return this.getNormalizedBoxMetadata()
            .map(({ levelOverlayId }) => levelOverlayId)
            .filter((id): id is number => id != null);
    }
}

export default new NetEdition();
