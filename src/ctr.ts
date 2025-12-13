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

// Track which fonts have been loaded to avoid duplicate loading
const loadedFonts = new Set<string>();

const loadLanguageFont = async (langId: number): Promise<void> => {
    if (langId === LangId.RU && document.fonts) {
        const fontKey = "Playpen Sans";
        if (loadedFonts.has(fontKey)) {
            return; // Font already loaded
        }

        // Load Playpen Sans for Russian
        const font = new FontFace("Playpen Sans", "url(/fonts/PlaypenSans-SemiBold.ttf)", {
            weight: "600",
        });
        try {
            await font.load();
            document.fonts.add(font);
            loadedFonts.add(fontKey);
        } catch (error) {
            console.error("Failed to load Playpen Sans font:", error);
        }
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
    PubSub.subscribe(PubSub.ChannelId.LanguageChanged, async () => {
        const newLang = settings.getLangId();
        await loadLanguageFont(newLang);
    });

    App.domReady();
    App.run();
};

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => void boot(), { once: true });
} else {
    void boot();
}
