import PanelId from "@/ui/PanelId";
import Panel from "@/ui/Panel";
import BoxPanel from "@/ui/BoxPanel";
import LevelPanel from "@/ui/LevelPanel";
import resolution from "@/resolution";
import platform from "@/config/platforms/platform-web";
import Easing from "@/ui/Easing";
import PubSub from "@/utils/PubSub";
import edition from "@/config/editions/net-edition";
import type { PanelIdType } from "@/ui/types/panelTypes";

class PanelManager {
    // Panel list
    panels: Panel[];

    // Fade properties
    fadeInDur: number;
    fadePause: number;
    fadeOutDur: number;
    fadeTo: number;
    fadeToBlack: HTMLElement | null;
    isFading: boolean;

    // Shadow properties
    shadowIsRotating: boolean;
    shadowAngle: number;
    shadowCanvas: HTMLCanvasElement | null;
    shadowImage: HTMLImageElement | null;
    shadowOpacity: number;
    shadowIsVisible: boolean;
    shadowSpeedup: number;
    shadowPanelElement: HTMLElement | null;

    // Panel state
    currentPanelId: PanelIdType;
    onShowPanel: ((panelId: PanelIdType) => void) | null;

    constructor() {
        // panel list
        this.panels = [
            new Panel(PanelId.MENU, "menuPanel", "startBackground", true),
            BoxPanel,
            LevelPanel,
            new Panel(PanelId.GAME, null, "levelBackground", false),
            new Panel(PanelId.GAMEMENU, null, null, false),
            new Panel(PanelId.LEVELCOMPLETE, null, null, false),
            new Panel(PanelId.GAMECOMPLETE, "gameCompletePanel", "menuBackground", true),
            new Panel(PanelId.OPTIONS, "optionsPanel", "menuBackground", true),
            new Panel(PanelId.CREDITS, null, null, false),
            new Panel(PanelId.LEADERBOARDS, "leaderboardPanel", "menuBackground", true),
            new Panel(PanelId.ACHIEVEMENTS, "achievementsPanel", "menuBackground", true),
            new Panel(PanelId.SKIN_SELECT, "skinPanel", "menuBackground", true),
        ];

        // Fade
        this.fadeInDur = 100;
        this.fadePause = 50;
        this.fadeOutDur = 100;
        this.fadeTo = 1.0;
        this.fadeToBlack = null;
        this.isFading = false;

        // Shadow
        this.shadowIsRotating = false;
        this.shadowAngle = 15.0;
        this.shadowCanvas = null;
        this.shadowImage = null;
        this.shadowOpacity = 1.0;
        this.shadowIsVisible = false;
        this.shadowSpeedup = edition.shadowSpeedup || 1;
        this.shadowPanelElement = null;

        // Panel state
        this.currentPanelId = PanelId.MENU;
        this.onShowPanel = null;

        // bind methods (for event handlers / PubSub)
        this.showPanel = this.showPanel.bind(this);
        this.runBlackFadeIn = this.runBlackFadeIn.bind(this);
        this.runBlackFadeOut = this.runBlackFadeOut.bind(this);

        PubSub.subscribe(PubSub.ChannelId.BoxesUnlocked, (isFirstUnlock) => {
            const nextPanelId = isFirstUnlock ? PanelId.MENU : PanelId.BOXES;
            setTimeout(() => this.showPanel(nextPanelId), 1000);
        });
    }

    /** Find a panel by its ID */
    getPanelById(panelId: PanelIdType): Panel | null {
        return this.panels.find((p) => p.id === panelId) ?? null;
    }

    /** Prepare DOM references */
    domReady(): void {
        this.fadeToBlack = document.getElementById("fadeToBlack");
        this.shadowCanvas = document.getElementById("shadowCanvas") as HTMLCanvasElement | null;
        this.shadowPanelElement = document.getElementById("shadowPanel");

        if (this.shadowCanvas) {
            this.shadowCanvas.width = resolution.uiScaledNumber(1024);
            this.shadowCanvas.height = resolution.uiScaledNumber(576);
        }
    }

    /** Initialize when app is ready */
    appReady(onInitializePanel?: (panelId: PanelIdType) => void): void {
        this.shadowImage = new Image();
        this.shadowImage.src = `${platform.uiImageBaseUrl}shadow.webp`;

        if (onInitializePanel) {
            for (const panel of this.panels) {
                onInitializePanel(panel.id as PanelIdType);
            }
        }
    }

    // =====================
    // Shadow handling
    // =====================

    showShadow(): void {
        if (this.shadowIsVisible) {
            return;
        }

        if (this.shadowCanvas) {
            const ctx = this.shadowCanvas.getContext("2d");
            if (ctx) {
                ctx.save();
                ctx.setTransform(1, 0, 0, 1, 0, 0);
                ctx.clearRect(0, 0, this.shadowCanvas.width, this.shadowCanvas.height);
                ctx.restore();
            }
        }

        this.shadowOpacity = 0.0;
        this.shadowIsVisible = true;

        if (this.shadowPanelElement) {
            this.shadowPanelElement.style.display = "block";
        }

        if (!this.shadowIsRotating) {
            this.beginRotateShadow();
        }
    }

    hideShadow(): void {
        this.shadowIsVisible = false;
        this.shadowIsRotating = false;
        if (this.shadowPanelElement) {
            this.shadowPanelElement.style.display = "none";
        }
    }

    beginRotateShadow(): void {
        if (!this.shadowCanvas || !this.shadowImage) {
            return;
        }

        const ctx = this.shadowCanvas.getContext("2d");
        if (!ctx) {
            return;
        }

        const raf = window.requestAnimationFrame;
        let lastRotateTime = Date.now();

        const renderShadow = () => {
            if (!this.shadowIsRotating || !this.shadowCanvas || !this.shadowImage || !ctx) {
                return;
            }

            const now = Date.now();
            const delta = now - lastRotateTime;
            this.shadowAngle += ((delta * 0.1) / 25) * this.shadowSpeedup;
            lastRotateTime = now;

            // clear
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.clearRect(0, 0, this.shadowCanvas.width, this.shadowCanvas.height);

            // update opacity
            if (this.shadowOpacity < 1.0) {
                this.shadowOpacity = Math.min(this.shadowOpacity + 0.025, 1.0);
                ctx.globalAlpha = this.shadowOpacity;
            }

            // rotate and draw
            ctx.save();
            ctx.translate(this.shadowImage.width * 0.5, this.shadowImage.height * 0.5);
            ctx.translate(resolution.uiScaledNumber(-300), resolution.uiScaledNumber(-510));
            ctx.rotate((this.shadowAngle * Math.PI) / 180);
            ctx.translate(-this.shadowImage.width * 0.5, -this.shadowImage.height * 0.5);
            ctx.drawImage(this.shadowImage, 0, 0);
            ctx.restore();

            raf(renderShadow);
        };

        this.shadowIsRotating = true;
        renderShadow();
    }

    // =====================
    // Fade transitions
    // =====================

    runBlackFadeIn(callback?: () => void): void {
        const startTime = Date.now();
        if (!this.fadeToBlack) {
            callback?.();
            return;
        }

        this.isFading = true;
        this.fadeToBlack.style.opacity = "0";
        this.fadeToBlack.style.display = "block";

        const loop = () => {
            if (!this.fadeToBlack) {
                return;
            }

            const diff = Date.now() - startTime;
            const v = Easing.noEase(diff, 0, this.fadeTo, this.fadeInDur);
            this.fadeToBlack.style.opacity = String(v);

            if (diff < this.fadeInDur) {
                window.requestAnimationFrame(loop);
            } else {
                if (this.fadeToBlack) {
                    this.fadeToBlack.style.opacity = String(this.fadeTo);
                }
                callback?.();
            }
        };

        window.requestAnimationFrame(loop);
    }

    runBlackFadeOut(): void {
        if (!this.isFading || !this.fadeToBlack) {
            return;
        }

        const startTime = Date.now();
        const loop = () => {
            if (!this.fadeToBlack) {
                return;
            }

            const diff = Date.now() - startTime;
            const v = this.fadeTo - Easing.noEase(diff, 0, this.fadeTo, this.fadeInDur);
            this.fadeToBlack.style.opacity = String(v);

            if (diff < this.fadeInDur) {
                window.requestAnimationFrame(loop);
            } else {
                if (this.fadeToBlack) {
                    this.fadeToBlack.style.opacity = "0";
                    this.fadeToBlack.style.display = "none";
                }
                this.isFading = false;
            }
        };

        window.requestAnimationFrame(loop);
    }

    // =====================
    // Panel switching
    // =====================

    showPanel(panelId: PanelIdType, skipFade = false): void {
        this.currentPanelId = panelId;
        const panel = this.getPanelById(panelId);
        if (!panel) {
            return;
        }

        // shadow toggle
        if (panel.showShadow) {
            this.showShadow();
        } else {
            this.hideShadow();
        }

        const timeout = skipFade ? 0 : this.fadeInDur + this.fadePause;
        setTimeout(() => {
            // show panel elements
            if (panel.bgDivId) {
                const bg = document.getElementById(panel.bgDivId);
                if (bg) {
                    bg.style.display = "block";
                }
            }
            if (panel.panelDivId) {
                const el = document.getElementById(panel.panelDivId);
                if (el) {
                    el.style.display = "block";
                }
            }

            // hide others
            for (const other of this.panels) {
                if (other.panelDivId && other.panelDivId !== panel.panelDivId) {
                    const el = document.getElementById(other.panelDivId);
                    if (el) {
                        el.style.display = "none";
                    }
                }
                if (other.bgDivId && other.bgDivId !== panel.bgDivId) {
                    const bg = document.getElementById(other.bgDivId);
                    if (bg) {
                        bg.style.display = "none";
                    }
                }
            }

            // event hook
            this.onShowPanel?.(panelId);

            if (!skipFade) {
                this.runBlackFadeOut();
            }
        }, timeout);

        if (!skipFade) {
            this.runBlackFadeIn();
        }
    }
}

// create singleton instance
export default new PanelManager();
