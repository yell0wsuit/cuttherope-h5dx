import PanelId from "@/ui/PanelId";
import Panel from "@/ui/Panel";
import Easing from "@/ui/Easing";
import PointerCapture from "@/utils/PointerCapture";
import resolution from "@/resolution";
import ZoomManager from "@/ZoomManager";
import ScoreManager from "@/ui/ScoreManager";
import PubSub from "@/utils/PubSub";
import SoundMgr from "@/game/CTRSoundMgr";
import ResourceId from "@/resources/ResourceId";
import Lang from "@/resources/Lang";
import Text from "@/visual/Text";
import MenuStringId from "@/resources/MenuStringId";
import { UIRegistry } from "@/ui/types";
import Alignment from "@/core/Alignment";
import BoxType from "@/ui/BoxType";
import { IS_XMAS } from "@/utils/SpecialEvents";
import Box from "@/ui/Box";

interface InterfaceManagerLike {
    gameFlow: {
        openLevelMenu: (boxIndex: number) => void;
    };
}

type SelectableBox = Box & {
    onSelected?: () => void;
    onUnselected?: () => void;
};

class BoxPanel extends Panel {
    boxes: Box[];
    currentBoxIndex: number;
    currentOffset: number;
    isBoxCentered: boolean;
    bounceBox: SelectableBox | null;
    ctx: CanvasRenderingContext2D | null;
    canvas: HTMLCanvasElement | null;
    $navBack: HTMLElement | null;
    $navForward: HTMLElement | null;
    pointerCapture: PointerCapture | null;
    im: InterfaceManagerLike | null;

    slideInProgress: boolean;
    from: number;
    to: number;
    startTime: number;

    spacing: number;
    centerOffset: number;

    isMouseDown: boolean;
    downX: number | null;
    downY: number | null;
    delta: number;
    downOffset: number;

    rafId: number | null = null;

    constructor() {
        super(PanelId.BOXES, "boxPanel", "menuBackground", true);

        UIRegistry.registerBoxPanel(this);

        this.boxes = [];
        this.currentBoxIndex = this.getDefaultBoxIndex();
        this.currentOffset = 0;
        this.isBoxCentered = true;
        this.bounceBox = null;
        this.ctx = null;
        this.canvas = null;
        this.$navBack = null;
        this.$navForward = null;
        this.pointerCapture = null;
        this.im = null;

        this.slideInProgress = false;
        this.from = 0;
        this.to = 0;
        this.startTime = 0;

        this.spacing = resolution.uiScaledNumber(600);
        this.centerOffset = resolution.uiScaledNumber(312);

        this.isMouseDown = false;
        this.downX = null;
        this.downY = null;
        this.delta = 0;
        this.downOffset = 0;

        this.initializeDOM();
        PubSub.subscribe(PubSub.ChannelId.UpdateVisibleBoxes, (...args: unknown[]) => {
            const [visibleBoxes] = args;
            if (Array.isArray(visibleBoxes)) {
                this.boxes = visibleBoxes as Box[];
                this.redraw();
            }
        });
    }

    getDefaultBoxIndex(): number {
        return IS_XMAS ? 0 : 1;
    }

    initializeDOM(): void {
        const start = () => {
            const canvas = document.getElementById("boxCanvas") as HTMLCanvasElement | null;
            this.canvas = canvas;
            this.ctx = canvas ? canvas.getContext("2d") : null;

            if (!this.canvas || !this.ctx) return;

            this.canvas.width = resolution.uiScaledNumber(1024);
            this.canvas.height = resolution.uiScaledNumber(576);

            this.$navBack = document.getElementById("boxNavBack");
            this.$navForward = document.getElementById("boxNavForward");

            this.$navBack?.addEventListener("click", () => {
                if (this.currentBoxIndex > 0) {
                    this.slideToBox(this.currentBoxIndex - 1);
                    SoundMgr.playSound(ResourceId.SND_TAP);
                }
            });

            this.$navForward?.addEventListener("click", () => {
                if (this.currentBoxIndex < this.boxes.length - 1) {
                    this.slideToBox(this.currentBoxIndex + 1);
                    SoundMgr.playSound(ResourceId.SND_TAP);
                }
            });

            const plate = document.getElementById("boxUpgradePlate");
            plate?.addEventListener("click", () => {
                this.boxClicked(this.currentBoxIndex);
            });
        };

        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", start);
        } else {
            start();
        }
    }

    init(interfaceManager: InterfaceManagerLike): void {
        this.im = interfaceManager;
    }

    onShow(): void {
        this.activate();
    }

    onHide(): void {
        this.deactivate();
    }

    slideToNextBox(): void {
        this.slideToBox(this.currentBoxIndex + 1);
    }

    bounceCurrentBox(): void {
        const bounceBox = this.bounceBox;
        const ctx = this.ctx;
        if (bounceBox && ctx) {
            bounceBox.cancelBounce();
            bounceBox.bounce(ctx);
        }
    }

    boxClicked(visibleBoxIndex: number): void {
        if (visibleBoxIndex !== this.currentBoxIndex) return;

        const box = this.boxes[visibleBoxIndex];
        if (!box) return;

        const editionBoxIndex = box.index;

        if (!box.isClickable()) return;

        SoundMgr.playSound(ResourceId.SND_TAP);

        if (ScoreManager.isBoxLocked(editionBoxIndex)) {
            const isHolidayBox = box.type === BoxType.HOLIDAY;
            if (isHolidayBox && !IS_XMAS) {
                this.showHolidayUnavailableDialog();
            } else {
                this.showLockDialog(editionBoxIndex);
            }
        } else {
            this.im?.gameFlow.openLevelMenu(editionBoxIndex);
        }
    }

    showLockDialog(boxIndex: number): void {
        Text.drawBig({
            text: Lang.menuText(MenuStringId.CANT_UNLOCK_TEXT1),
            imgParentId: "missingLine1",
            scaleToUI: true,
        });
        Text.drawBig({
            text: String(ScoreManager.requiredStars(boxIndex) - ScoreManager.totalStars()),
            imgParentId: "missingCount",
            scaleToUI: true,
        });
        Text.drawBig({
            text: Lang.menuText(MenuStringId.CANT_UNLOCK_TEXT2),
            imgParentId: "missingLine2",
            scaleToUI: true,
        });
        Text.drawSmall({
            text: Lang.menuText(MenuStringId.CANT_UNLOCK_TEXT3),
            imgParentId: "missingLine3",
            scaleToUI: true,
        });
        Text.drawBig({
            text: Lang.menuText(MenuStringId.OK),
            imgParentId: "missingOkBtn",
            scaleToUI: true,
        });
        SoundMgr.playSound(ResourceId.SND_TAP);
        UIRegistry.getDialogs()?.showPopup("missingStars");
    }

    showHolidayUnavailableDialog(): void {
        const titleImg = Text.drawBig({
            text: Lang.menuText(MenuStringId.HOLIDAY_LEVELS_UNAVAILABLE_TITLE),
            imgParentId: "holidayLine1",
            alignment: Alignment.CENTER,
            scaleToUI: true,
        });
        if (titleImg) {
            Object.assign(titleImg.style, {
                display: "block",
                margin: "0 auto",
            });
        }

        const bodyImg = Text.drawSmall({
            text: Lang.menuText(MenuStringId.HOLIDAY_LEVELS_UNAVAILABLE_TEXT),
            imgParentId: "holidayLine2",
            alignment: Alignment.CENTER,
            width: resolution.uiScaledNumber(420),
            scaleToUI: true,
        });
        if (bodyImg) {
            Object.assign(bodyImg.style, {
                display: "block",
                margin: `${resolution.uiScaledNumber(16)}px auto 0`,
            });
        }

        Text.drawBig({
            text: Lang.menuText(MenuStringId.OK),
            imgParentId: "holidayOkBtn",
            scaleToUI: true,
        });

        const okBtn = document.getElementById("holidayOkBtn");
        if (okBtn) {
            Object.assign(okBtn.style, {
                display: "block",
                margin: `${resolution.uiScaledNumber(24)}px auto 0`,
                textAlign: "center",
            });
            const img = okBtn.querySelector("img");
            if (img) {
                Object.assign((img as HTMLImageElement).style, {
                    display: "block",
                    margin: "0 auto",
                });
            }
        }

        SoundMgr.playSound(ResourceId.SND_TAP);
        UIRegistry.getDialogs()?.showPopup("holidayUnavailable");
    }

    doBounceCurrentBox(): void {
        const bounceBox = this.bounceBox;
        const ctx = this.ctx;
        if (bounceBox && ctx) {
            bounceBox.cancelBounce();
            bounceBox.bounce(ctx);
        }
    }

    render(offset: number): void {
        const ctx = this.ctx;
        const canvas = this.canvas;
        if (!ctx || !canvas) return;

        this.currentOffset = offset;

        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const offsetX = this.centerOffset + offset;
        const offsetY = resolution.uiScaledNumber(130);
        ctx.translate(offsetX, offsetY);

        let boxOffset = 0;

        for (const box of this.boxes) {
            if (!box.visible) {
                continue;
            }

            let omnomOffset: number | null = null;
            const relBoxOffset = offset + boxOffset;

            if (
                relBoxOffset > resolution.uiScaledNumber(-100) &&
                relBoxOffset < resolution.uiScaledNumber(100)
            ) {
                omnomOffset =
                    (this.centerOffset + offset) * -1 - boxOffset + resolution.uiScaledNumber(452);
            }

            ctx.translate(boxOffset, 0);
            box.draw(ctx, omnomOffset);
            ctx.translate(-boxOffset, 0);

            boxOffset += this.spacing;
        }

        ctx.translate(-offsetX, -offsetY);
    }

    slideToBox(index: number): void {
        const ctx = this.ctx;
        if (!ctx || this.boxes.length === 0) return;

        const clampedIndex = Math.max(0, Math.min(index, this.boxes.length - 1));
        const targetBox = this.boxes[clampedIndex];
        if (!targetBox) return;

        // Cancel any running animation or bounce
        if (this.rafId) cancelAnimationFrame(this.rafId);
        this.rafId = null;
        this.slideInProgress = false;
        this.bounceBox?.cancelBounce();

        const duration = clampedIndex === this.currentBoxIndex ? 0 : 550;
        const prevBox = this.bounceBox;
        if (prevBox && prevBox !== targetBox) {
            prevBox.cancelBounce();
            prevBox.onUnselected?.();
        }

        const nextBox = targetBox as SelectableBox;
        this.bounceBox = nextBox;
        this.currentBoxIndex = clampedIndex;
        PubSub.publish(PubSub.ChannelId.SelectedBoxChanged, targetBox.index);

        this.from = this.currentOffset;
        this.to = -1.0 * this.spacing * clampedIndex;
        this.startTime = Date.now();
        this.slideInProgress = true;
        this.isBoxCentered = duration <= 0;

        const startBounce = () => {
            if (!ctx) return;
            if (this.bounceBox !== nextBox) return;
            nextBox.cancelBounce();
            nextBox.bounce(ctx);
            nextBox.onSelected?.();
        };

        const queueBounce = () => {
            // delay bounce by 50ms after fully snapped
            window.setTimeout(() => {
                if (!this.slideInProgress) startBounce();
            }, 50);
        };

        if (duration <= 0) {
            this.currentOffset = this.to;
            this.render(this.currentOffset);
            this.isBoxCentered = true;
            this.slideInProgress = false;
            this.updateNavButtons();
            queueBounce();
            return;
        }

        const renderSlide = () => {
            if (!this.slideInProgress) return;
            const elapsed = Date.now() - this.startTime;
            const t = Math.min(elapsed, duration);

            this.currentOffset = Easing.easeOutExpo(t, this.from, this.to - this.from, duration);
            this.render(this.currentOffset);

            if (elapsed >= duration) {
                // snap to final
                this.currentOffset = this.to;
                this.render(this.currentOffset);
                this.isBoxCentered = true;
                this.slideInProgress = false;
                this.updateNavButtons();
                queueBounce();
                this.rafId = null;
            } else {
                this.rafId = requestAnimationFrame(renderSlide);
            }
        };

        renderSlide();
        this.updateNavButtons();
    }

    updateNavButtons(): void {
        if (!this.$navBack || !this.$navForward) return;

        const backDiv = this.$navBack.querySelector<HTMLDivElement>("div");
        const forwardDiv = this.$navForward.querySelector<HTMLDivElement>("div");

        if (!backDiv || !forwardDiv) return;

        if (this.currentBoxIndex <= 0) {
            backDiv.classList.add("boxNavDisabled");
        } else {
            backDiv.classList.remove("boxNavDisabled");
        }

        if (this.currentBoxIndex >= this.boxes.length - 1) {
            forwardDiv.classList.add("boxNavDisabled");
        } else {
            forwardDiv.classList.remove("boxNavDisabled");
        }
    }

    cancelSlideToBox(): void {
        this.slideInProgress = false;
        this.bounceBox?.cancelBounce();
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
        }
        this.rafId = null;
    }

    isMouseOverBox(x: number, y: number): boolean {
        const bounceBox = this.bounceBox;
        if (
            this.isBoxCentered &&
            bounceBox &&
            bounceBox.isClickable() &&
            x > resolution.uiScaledNumber(340) &&
            x < resolution.uiScaledNumber(680) &&
            y > resolution.uiScaledNumber(140) &&
            y < resolution.uiScaledNumber(460)
        ) {
            return true;
        }
        return false;
    }

    pointerDown(x: number, y: number): void {
        if (this.isMouseDown) return;
        this.cancelSlideToBox();
        this.downX = x;
        this.downY = y;
        this.downOffset = this.currentOffset;
        this.isMouseDown = true;
    }

    pointerMove(x: number, y: number): void {
        if (!this.canvas) return;
        if (this.isMouseDown) {
            if (this.downX == null) return;
            this.cancelSlideToBox();
            this.delta = x - this.downX;
            if (Math.abs(this.delta) > 5) {
                this.isBoxCentered = false;
                this.render(this.downOffset + this.delta);
            }
        } else {
            if (this.isMouseOverBox(x, y)) {
                this.canvas.classList.add("ctrPointer");
            } else {
                this.canvas.classList.remove("ctrPointer");
            }
        }
    }

    pointerUp(x: number, y: number): void {
        if (!this.isMouseDown || this.downX == null || this.downY == null) {
            this.isMouseDown = false;
            return;
        }

        this.cancelSlideToBox();
        this.delta = x - this.downX;

        if (Math.abs(this.delta) > this.spacing / 2) {
            const upOffset = this.currentOffset;
            const index = Math.round((-1 * upOffset) / this.spacing);
            this.slideToBox(index);
        } else if (Math.abs(this.delta) > 5) {
            const max = resolution.uiScaledNumber(30);
            const targetIndex =
                this.delta > max
                    ? this.currentBoxIndex - 1
                    : this.delta < -max
                      ? this.currentBoxIndex + 1
                      : this.currentBoxIndex;
            this.slideToBox(targetIndex);
        } else if (this.isMouseOverBox(x, y)) {
            this.boxClicked(this.currentBoxIndex);
        }

        this.isMouseDown = false;
        this.downX = null;
        this.downY = null;
    }

    pointerOut(x: number, y: number): void {
        this.pointerUp(x, y);
    }

    activate(): void {
        if (!this.canvas) return;

        if (!this.pointerCapture) {
            this.pointerCapture = new PointerCapture({
                element: this.canvas,
                onStart: this.pointerDown.bind(this),
                onMove: this.pointerMove.bind(this),
                onEnd: this.pointerUp.bind(this),
                onOut: this.pointerOut.bind(this),
                getZoom: () => ZoomManager.getUIZoom(),
            });
        }
        this.pointerCapture?.activate();
    }

    deactivate(): void {
        this.pointerCapture?.deactivate();
    }

    redraw(): void {
        this.slideToBox(this.currentBoxIndex);
    }
}

export default new BoxPanel();
