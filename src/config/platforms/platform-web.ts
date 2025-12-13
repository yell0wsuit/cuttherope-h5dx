import Text from "@/visual/Text";
import resolution from "@/resolution";
import Lang from "@/resources/Lang";
import MenuStringId from "@/resources/MenuStringId";
import Alignment from "@/core/Alignment";
import edition from "@/config/editions/net-edition";

// loc entries that are specific to the web platform
const locEntries = {
    GAME_COMPLETE: {
        en: "I just finished playing Cut the Rope on the web with %d (out of %d possible) stars!",
        fr: "",
        de: "",
        ru: "",
    },
};

class WebPlatform {
    static customOptions = false;
    static ENABLE_ANALYTICS = false;

    static ENABLE_ZOOM = false;

    static ZOOM_BOX_CANVAS = false;

    static imageBaseUrl = "images/";
    static resolutionBaseUrl = `images/${resolution.UI_WIDTH}/`;
    static uiImageBaseUrl = `images/${resolution.UI_WIDTH}/ui/`;
    static boxImageBaseUrl = `images/${resolution.UI_WIDTH}/${edition.boxDirectory || "ui/"}`;

    static audioBaseUrl = "audio/";

    static videoBaseUrl = "video/";

    static getAudioExtension() {
        return ".ogg";
    }

    static getVideoExtension() {
        return ".mp4";
    }

    static disableSlowWarning = false;

    static getDrawingBaseUrl() {
        const baseUrl = `${window.location.protocol}//${window.location.host}`;
        return `${baseUrl}/images/${resolution.UI_WIDTH}/ui/`;
    }

    static getScoreImageBaseUrl() {
        const baseUrl = `${window.location.protocol}//${window.location.host}`;
        return `${baseUrl}/images/scores/`;
    }

    static setSoundButtonChange(button: HTMLElement | null, callback: () => void) {
        button?.addEventListener("click", callback);
    }

    static setMusicButtonChange(button: HTMLElement | null, callback: () => void) {
        button?.addEventListener("click", callback);
    }

    static updateSoundOption(el: Element | null, isSoundOn: boolean) {
        el?.classList.toggle("disabled", !isSoundOn);
    }

    static updateMusicOption(el: Element | null, isMusicOn: boolean) {
        el?.classList.toggle("disabled", !isMusicOn);
    }

    static toggleLangUI(show: boolean) {
        const langBtn = document.getElementById("langBtn");
        if (langBtn) {
            langBtn.style.display = show ? "" : "none";
        }
    }

    static setLangOptionClick(callback: (langId: number | null) => void) {
        const langBtn = document.getElementById("langBtn");
        if (langBtn) {
            langBtn.addEventListener("click", () => {
                const langId = null; // just advance to next supported language
                callback(langId);
            });
        }
    }

    static updateLangSetting() {
        const langBtn = document.getElementById("langBtn");
        const flag = document.getElementById("flag");

        if (langBtn) {
            WebPlatform.setOptionText(langBtn, `${Lang.menuText(MenuStringId.LANGUAGE)}:`);
        }

        // Chrome has a layout bug where the css offset on the flag
        // icon is not changed immediately. Retrieving the offset
        // forces the browser to query location which fixes layout.

        if (flag) {
            void flag.offsetTop; // Force layout recalculation
        }
    }

    static setCutOptionClick(callback: () => void) {
        const cutBtn = document.getElementById("cutBtn");
        if (cutBtn) {
            cutBtn.addEventListener("click", callback);
        }
    }

    static updateCutSetting(isClickToCut: boolean) {
        const cutBtn = document.getElementById("cutBtn");

        // fonts use game sized assets based on canvas size
        // Restrict width to enable line breaks for longer translations
        const textWidth = 320 * resolution.CANVAS_SCALE;
        const scale = 0.5 * resolution.UI_TEXT_SCALE; // scale need to take UI size into account
        const alignment = Alignment.HCENTER;

        // we update the drag text because language changes just
        // reset the current click state
        const dragImg = document.getElementById("dragText");
        if (dragImg instanceof HTMLImageElement || dragImg instanceof HTMLCanvasElement) {
            Text.drawSmall({
                text: Lang.menuText(MenuStringId.DRAG_TO_CUT),
                width: textWidth,
                img: dragImg,
                canvas: true,
                scale: scale,
                alignment: alignment,
            });
        }

        // now update the click-to-cut text and check mark
        const cutImg = document.getElementById("cutText");
        if (cutImg instanceof HTMLImageElement || cutImg instanceof HTMLCanvasElement) {
            Text.drawSmall({
                text: Lang.menuText(MenuStringId.CLICK_TO_CUT),
                width: textWidth,
                img: cutImg,
                canvas: true,
                scale: scale,
                alignment: alignment,
            });
        }
        if (cutBtn) {
            cutBtn.classList.toggle("disabled", !isClickToCut);
        }
    }

    static setResetText(el: HTMLElement | null, text: string) {
        WebPlatform.setOptionText(el, text);
    }

    static setOptionText(button: HTMLElement | null, text: string) {
        const img = button?.querySelector("img");
        if (img) {
            Text.drawBig({
                text: text,
                img: img,
                scaleToUI: true,
            });
        }
    }

    /*static getGameCompleteShareText(totalStars: number, possibleStars: number) {
        const text = Lang.getText(locEntries.GAME_COMPLETE)
            .replace("%d", totalStars)
            .replace("%d", possibleStars);
        return text;
    }*/

    static meetsRequirements() {
        // does the browser have the HTML5 features we need?
        /*const meetsReqs =
            Modernizr.canvas &&
            Modernizr.audio &&
            Modernizr.video &&
            Modernizr.localstorage &&
            Modernizr.rgba &&
            Modernizr.opacity &&
            Modernizr.fontface &&
            Modernizr.csstransforms &&
            Modernizr.hq;

        if (!meetsReqs) {
            // load the css for the downlevel experience
            Modernizr.load({
                load: "css!css/nosupport.css",
            });

            // remove youtube video if it exists
            if (document.readyState === "loading") {
                document.addEventListener("DOMContentLoaded", function () {
                    const ytVideo = document.getElementById("yt-video");
                    if (ytVideo) {
                        ytVideo.remove();
                    }
                });
            } else {
                const ytVideo = document.getElementById("yt-video");
                if (ytVideo) {
                    ytVideo.remove();
                }
            }

            // track views of the ugprade page
            _gaq.push(["_trackEvent", "Upgrade", "View"]);
        }*/

        return true;
    }
}

export default WebPlatform;
