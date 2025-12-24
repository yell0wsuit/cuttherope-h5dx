import App from "@/app";
import platform from "@/config/platforms/platform-web";
import settings from "@/game/CTRSettings";
import LangId from "@/resources/LangId";
import PubSub from "@/utils/PubSub";
import "@/game/CTRRootController";
import "@/game/CTRSoundMgr";

window.addEventListener("contextmenu", (event) => {
    event.preventDefault();
    event.stopPropagation();
});

interface FontConfig {
    family: string;
    url: string;
    weight?: string;
}

// Track which fonts have been loaded to avoid duplicate loading
const loadedFonts = new Set<string>();

const loadFontOnce = async (config: FontConfig): Promise<void> => {
    if (!document.fonts) return;

    const key = `${config.family}:${config.weight ?? "normal"}`;
    if (loadedFonts.has(key)) return;

    const font = new FontFace(config.family, `url(${config.url})`, {
        weight: config.weight ?? "normal",
    });

    try {
        await font.load();
        document.fonts.add(font);
        loadedFonts.add(key);
    } catch (error) {
        console.error(`Failed to load font "${config.family}":`, error);
    }
};

const languageFonts: Partial<Record<number, FontConfig>> = {
    [LangId.RU]: {
        family: "Playpen Sans",
        url: `${import.meta.env.BASE_URL}/fonts/PlaypenSans-SemiBold.woff2`,
        weight: "normal",
    },
    [LangId.KO]: {
        family: "Cafe24 Dongdong",
        url: `${import.meta.env.BASE_URL}/fonts/Cafe24Dongdong-v2.0.woff2`,
        weight: "normal",
    },
    [LangId.JA]: {
        family: "MPLUSRounded1c-Medium",
        url: `${import.meta.env.BASE_URL}/fonts/MPLUSRounded1c-Medium.woff2`,
        weight: "normal",
    },
    [LangId.ZH]: {
        family: "Huninn-Regular",
        url: `${import.meta.env.BASE_URL}/fonts/Huninn-Regular.woff2`,
        weight: "normal",
    },
};

const loadLanguageFont = async (langId: number): Promise<void> => {
    const font = languageFonts[langId];
    if (font) {
        await loadFontOnce(font);
    }
};

const showProcessingOverlay = (): void => {
    const overlay = document.getElementById("processingOverlay");
    if (overlay) {
        overlay.style.display = "block";
    }
};

const hideProcessingOverlay = (): void => {
    const overlay = document.getElementById("processingOverlay");
    if (overlay) {
        overlay.style.display = "none";
    }
};

const boot = async (): Promise<void> => {
    if (!platform.meetsRequirements()) {
        return;
    }

    // Load language-specific fonts before app initialization
    const currentLang = settings.getLangId();
    await loadLanguageFont(currentLang);

    // Subscribe to language changes to load fonts dynamically
    // We use LanguageFontLoaded as an internal event that fires after font loading
    PubSub.subscribe(PubSub.ChannelId.LanguageFontLoaded, async () => {
        // Show processing overlay with dimmed background
        showProcessingOverlay();

        const newLang = settings.getLangId();
        await loadLanguageFont(newLang);

        // Hide processing overlay
        hideProcessingOverlay();

        // Now that font is loaded, notify all UI components to re-render
        PubSub.publish(PubSub.ChannelId.LanguageChanged);
    });

    App.domReady();
    App.run();
};

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => void boot(), { once: true });
} else {
    void boot();
}
