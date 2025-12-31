import RootController from "@/game/CTRRootController";
import resolution from "@/resolution";
import { UIRegistry } from "@/ui/types";
import PubSub from "@/utils/PubSub";
import SoundMgr from "@/game/CTRSoundMgr";
import ResourceId from "@/resources/ResourceId";
import Lang from "@/resources/Lang";
import Text from "@/visual/Text";
import MenuStringId from "@/resources/MenuStringId";
import Alignment from "@/core/Alignment";

interface FadeElementOptions {
    from?: number;
    to: number;
    duration: number;
    display?: string;
}

/**
 * Handles all popup dialog logic, including fade animations,
 * localization updates, and user interaction bindings.
 */
class Dialogs {
    static FADE_DURATION_MS = 200;

    static SELECTORS = {
        popupOuter: ".popupOuterFrame",
        popupInner: ".popupInnerFrame",
        popupWindow: "#popupWindow",
    } as const;

    static activeControllers = new WeakMap<HTMLElement, AbortController>();

    /**
     * Cancels any ongoing fade animation on an element.
     */
    static cancelAnimation(el: HTMLElement, finalOpacity?: number): void {
        const controller = Dialogs.activeControllers.get(el);
        if (controller) {
            controller.abort();
            Dialogs.activeControllers.delete(el);
        }
        if (typeof finalOpacity === "number") {
            el.style.opacity = finalOpacity.toString();
        }
    }

    /**
     * Smoothly fades an element between two opacity values.
     */
    static async fadeElement(
        el: HTMLElement,
        { from, to, duration, display }: FadeElementOptions
    ): Promise<void> {
        Dialogs.cancelAnimation(el);
        if (display !== undefined) {
            el.style.display = display;
        }

        const start =
            typeof from === "number" ? from : parseFloat(getComputedStyle(el).opacity || "0") || 0;
        const target = to;
        el.style.opacity = String(start);

        const controller = new AbortController();
        Dialogs.activeControllers.set(el, controller);

        const { signal } = controller;
        let startTime: number | undefined;

        await new Promise<void>((resolve) => {
            const step = (timestamp: number) => {
                if (signal.aborted) {
                    return resolve();
                }

                if (startTime === undefined) {
                    startTime = timestamp;
                }
                const progress = Math.min((timestamp - startTime) / duration, 1);
                const current = start + (target - start) * progress;
                el.style.opacity = String(current);

                if (progress < 1 && !signal.aborted) {
                    requestAnimationFrame(step);
                } else {
                    Dialogs.activeControllers.delete(el);
                    resolve();
                }
            };

            requestAnimationFrame(step);
        });
    }

    /**
     * Displays a popup dialog by ID with fade animation.
     */
    async showPopup(contentId: string): Promise<void> {
        RootController.pauseLevel();

        const popupWindow = document.querySelector<HTMLElement>(Dialogs.SELECTORS.popupWindow);
        if (!popupWindow) {
            return;
        }

        document
            .querySelectorAll<HTMLElement>(Dialogs.SELECTORS.popupOuter)
            .forEach((el) => Dialogs.cancelAnimation(el, 0));

        document
            .querySelectorAll<HTMLElement>(Dialogs.SELECTORS.popupInner)
            .forEach((el) => (el.style.display = "none"));

        popupWindow.style.display = "block";
        await Dialogs.fadeElement(popupWindow, {
            from: 0,
            to: 1,
            duration: Dialogs.FADE_DURATION_MS,
        });

        const content = document.getElementById(contentId);
        if (content) {
            content.style.display = "block";
            document.querySelectorAll<HTMLElement>(Dialogs.SELECTORS.popupOuter).forEach((el) => {
                Dialogs.cancelAnimation(el);
                el.style.display = "block";
                void Dialogs.fadeElement(el, {
                    from: 0,
                    to: 1,
                    duration: Dialogs.FADE_DURATION_MS,
                });
            });
        }
    }

    /**
     * Closes the currently open popup with fade-out animation.
     */
    async closePopup(): Promise<void> {
        SoundMgr.playSound(ResourceId.SND_TAP);

        const popupWindow = document.querySelector<HTMLElement>(Dialogs.SELECTORS.popupWindow);
        if (!popupWindow) {
            return;
        }

        Dialogs.cancelAnimation(popupWindow);
        const currentOpacity = parseFloat(getComputedStyle(popupWindow).opacity || "1") || 1;

        await Dialogs.fadeElement(popupWindow, {
            from: currentOpacity,
            to: 0,
            duration: Dialogs.FADE_DURATION_MS,
        });

        popupWindow.style.display = "none";
        RootController.resumeLevel();
    }

    /**
     * Opens the payment dialog popup.
     */
    showPayDialog(): void {
        SoundMgr.playSound(ResourceId.SND_TAP);
        void this.showPopup("payDialog");
    }

    /**
     * Shows a "Slow Computer" popup with localized content.
     */
    showSlowComputerPopup(): void {
        const slowComputer = document.getElementById("slowComputer");
        if (!slowComputer) {
            return;
        }

        slowComputer.querySelectorAll("img").forEach((img) => img.remove());

        const titleImg = Text.drawBig({
            text: Lang.menuText(MenuStringId.SLOW_TITLE),
            alignment: Alignment.CENTER,
            width: 1200 * resolution.CANVAS_SCALE,
            scale: 1.25 * resolution.UI_TEXT_SCALE,
        });

        const textImg = Text.drawBig({
            text: Lang.menuText(MenuStringId.SLOW_TEXT),
            width: 1200 * resolution.CANVAS_SCALE,
            scale: 0.8 * resolution.UI_TEXT_SCALE,
        });

        textImg.style.marginLeft = `${resolution.uiScaledNumber(30)}px`;
        slowComputer.append(titleImg, textImg);

        Text.drawBig({
            text: Lang.menuText(MenuStringId.LETS_PLAY),
            imgSel: "#slowComputerBtn img",
            scale: 0.8 * resolution.UI_TEXT_SCALE,
        });

        void this.showPopup("slowComputer");
    }

    /**
     * Initializes DOM event listeners for dialog buttons.
     */
    initEventListeners(): void {
        const ids: [string, () => void][] = [
            ["slowComputerBtn", this.closePopup.bind(this)],
            ["missingOkBtn", this.closePopup.bind(this)],
            ["resetNoBtn", this.closePopup.bind(this)],
            ["holidayOkBtn", this.closePopup.bind(this)],
        ];

        ids.forEach(([id, handler]) => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener("click", handler);
            }
        });
    }

    /**
     * Handles payment confirmation click.
     */
    onPayClick(): void {
        PubSub.publish(PubSub.ChannelId.PurchaseBoxesPrompt);
        void this.closePopup();
    }

    /**
     * Localizes dialog text content on language changes.
     */
    initLocalization(): void {
        PubSub.subscribe(PubSub.ChannelId.LanguageChanged, () => {
            Text.drawBig({
                text: Lang.menuText(MenuStringId.UPGRADE_TO_FULL),
                imgParentId: "payMessage",
                width: resolution.uiScaledNumber(650),
                alignment: Alignment.CENTER,
                scale: 0.8 * resolution.UI_TEXT_SCALE,
            });

            Text.drawBig({
                text: Lang.menuText(MenuStringId.BUY_FULL_GAME),
                imgParentId: "payBtn",
                scale: 0.6 * resolution.UI_TEXT_SCALE,
            });
        });
    }

    /**
     * Initializes the Dialogs system (event listeners + localization).
     */
    init(): void {
        UIRegistry.registerDialogs(this);

        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", () => this.initEventListeners());
        } else {
            this.initEventListeners();
        }

        this.initLocalization();
    }
}

const dialogs = new Dialogs();
dialogs.init();

export default dialogs;
