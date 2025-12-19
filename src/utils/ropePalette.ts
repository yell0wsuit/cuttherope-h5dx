import RGBAColor from "@/core/RGBAColor";
import SettingStorage from "@/core/SettingStorage";

const ROPE_PALETTES: ReadonlyArray<{
    primary: RGBAColor;
    secondary: RGBAColor;
}> = [
    {
        primary: new RGBAColor(0.475, 0.305, 0.185, 1.0),
        secondary: new RGBAColor(0.6755555555555556, 0.44, 0.27555555555555555, 1.0),
    },
    {
        primary: new RGBAColor(0.624, 0.294, 0.114, 1.0),
        secondary: new RGBAColor(1.0, 0.627, 0.463, 1.0),
    },
    {
        primary: new RGBAColor(0.404, 0.612, 0.635, 1.0),
        secondary: new RGBAColor(0.773, 0.898, 0.902, 1.0),
    },
    {
        primary: new RGBAColor(0.757, 0.533, 0.0, 1.0),
        secondary: new RGBAColor(0.98, 0.843, 0.2, 1.0),
    },
    {
        primary: new RGBAColor(0.98, 0.243, 0.243, 1.0),
        secondary: new RGBAColor(0.282, 0.525, 0.153, 1.0),
    },
    {
        primary: new RGBAColor(0.176, 0.318, 0.659, 1.0),
        secondary: new RGBAColor(1.0, 1.0, 1.0, 1.0),
    },
    {
        primary: new RGBAColor(0.631, 0.957, 1.0, 1.0),
        secondary: new RGBAColor(0.996, 0.631, 0.953, 1.0),
    },
    {
        primary: new RGBAColor(1.0, 0.329, 0.318, 1.0),
        secondary: new RGBAColor(1.0, 0.992, 0.941, 1.0),
    },
    {
        primary: new RGBAColor(1.0, 0.831, 0.404, 1.0),
        secondary: new RGBAColor(0.251, 0.239, 0.278, 1.0),
    },
];

const SETTING_KEY = "selectedRopeSkin";

export const getSelectedRopePaletteIndex = (): number =>
    SettingStorage.getIntOrDefault(SETTING_KEY, 0) ?? 0;

export const getRopePalette = (index = getSelectedRopePaletteIndex()): {
    primary: RGBAColor;
    secondary: RGBAColor;
} => {
    const palette = ROPE_PALETTES[index] ?? ROPE_PALETTES[0];
    return {
        primary: palette.primary,
        secondary: palette.secondary,
    };
};

export const clampRopeIndex = (index: number): number => {
    if (index < 0) return 0;
    if (index >= ROPE_PALETTES.length) return ROPE_PALETTES.length - 1;
    return index;
};

export default getRopePalette;
