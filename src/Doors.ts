import resolution from "@/resolution";
import edition from "@/config/editions/net-edition";
import platform from "@/config/platforms/platform-web";
import BoxManager from "@/ui/BoxManager";
import Easing from "@/ui/Easing";

type AnimationCallback = (() => void) | null | undefined;

interface CanvasPair {
    left: HTMLCanvasElement;
    right: HTMLCanvasElement;
}

const isImageReady = (img: HTMLImageElement): boolean => {
    return img.complete && img.naturalWidth > 0 && img.naturalHeight > 0;
};

/**
 * Manages the box door animations and rendering
 */
class BoxDoors {
    static #doorImages: (HTMLImageElement | undefined)[] = [];
    static #tapeImgL: HTMLImageElement = new Image();
    static #tapeImgR: HTMLImageElement = new Image();

    static canvasLeft: HTMLCanvasElement | null = null;
    static canvasRight: HTMLCanvasElement | null = null;
    static currentIndex: number | null = null;
    static showTape = true;

    static initializeDoors(): void {
        const canvases = BoxDoors.#getDoorCanvases();
        if (!canvases) {
            BoxDoors.canvasLeft = null;
            BoxDoors.canvasRight = null;
            return;
        }

        const { left, right } = canvases;
        BoxDoors.canvasLeft = left;
        BoxDoors.canvasRight = right;

        const scaledWidth = (resolution.uiScaledNumber(1024) / 2) | 0;
        const scaledHeight = resolution.uiScaledNumber(576);

        left.width = scaledWidth;
        right.width = scaledWidth;

        left.height = scaledHeight;
        right.height = scaledHeight;

        BoxDoors.currentIndex = BoxManager.currentBoxIndex;
        BoxDoors.showTape = true;
    }

    static appReady(): void {
        for (let i = 0, len = edition.boxDoors.length; i < len; i++) {
            const doorPath = edition.boxDoors[i];
            if (!doorPath) continue;

            const doorImg = new Image();
            doorImg.src = platform.uiImageBaseUrl + doorPath;
            BoxDoors.#doorImages[i] = doorImg;
        }

        BoxDoors.#tapeImgL.src = `${platform.uiImageBaseUrl}leveltape_left.png`;
        BoxDoors.#tapeImgR.src = `${platform.uiImageBaseUrl}leveltape_right.png`;

        BoxDoors.preRenderDoors();
    }

    static preRenderDoors(): void {
        const canvases = BoxDoors.#requireDoorCanvases();
        if (!canvases) {
            return;
        }

        const { left, right } = canvases;
        const leftCtx = left.getContext("2d");
        const rightCtx = right.getContext("2d");

        if (!leftCtx || !rightCtx) {
            return;
        }

        const doorImg = BoxDoors.#doorImages[BoxManager.currentBoxIndex];

        if (!doorImg) {
            leftCtx.clearRect(0, 0, left.width, left.height);
            rightCtx.clearRect(0, 0, right.width, right.height);
            return;
        }

        const imagesToWaitFor: HTMLImageElement[] = [doorImg];

        if (BoxDoors.showTape) {
            imagesToWaitFor.push(BoxDoors.#tapeImgL, BoxDoors.#tapeImgR);
        }

        const pendingImages = imagesToWaitFor.filter((img) => !isImageReady(img));

        if (pendingImages.length > 0) {
            pendingImages.forEach((img) => {
                img.addEventListener("load", BoxDoors.preRenderDoors, { once: true });
            });
            return;
        }

        leftCtx.clearRect(0, 0, left.width, left.height);
        rightCtx.clearRect(0, 0, right.width, right.height);

        leftCtx.drawImage(doorImg, 0, 0);

        rightCtx.save();
        rightCtx.translate(doorImg.width, doorImg.height);
        rightCtx.rotate(Math.PI);
        rightCtx.drawImage(doorImg, 0, 0);
        rightCtx.restore();

        if (BoxDoors.showTape) {
            leftCtx.drawImage(
                BoxDoors.#tapeImgL,
                left.width - resolution.uiScaledNumber(26),
                resolution.uiScaledNumber(10)
            );

            rightCtx.drawImage(BoxDoors.#tapeImgR, 0, resolution.uiScaledNumber(10));
        }
    }

    static renderDoors(showTape = true, percentOpen = 0): void {
        if (
            BoxDoors.currentIndex !== BoxManager.currentBoxIndex ||
            BoxDoors.showTape !== showTape
        ) {
            BoxDoors.currentIndex = BoxManager.currentBoxIndex;
            BoxDoors.showTape = showTape;
            BoxDoors.preRenderDoors();
        }

        const p = percentOpen;
        const doorWidth = BoxDoors.canvasLeft?.width ?? 0;
        const offset = doorWidth - doorWidth * (1 - p);

        if (!BoxDoors.canvasLeft || !BoxDoors.canvasRight) {
            return;
        }

        BoxDoors.canvasLeft.style.transform = `translateX(${-1 * offset}px)`;
        BoxDoors.canvasRight.style.transform = `translateX(${doorWidth + offset}px)`;
    }

    static openDoors(showTape = true, callback?: AnimationCallback, runInReverse = false): void {
        const shouldShowTape = showTape;
        const reverse = runInReverse;

        const begin = Date.now();
        const duration = 750;
        const easing = reverse ? Easing.easeOutCubic : Easing.easeInOutCubic;
        const levelPanel = document.getElementById("levelPanel");

        const openBoxDoors = () => {
            const now = Date.now();
            const elapsed = now - begin;
            const value = easing(elapsed, 0, 1, duration);

            if (value < 1) {
                BoxDoors.renderDoors(shouldShowTape, reverse ? 1 - value : value);
                window.requestAnimationFrame(openBoxDoors);
            } else {
                BoxDoors.renderDoors(shouldShowTape, reverse ? 0 : 1);

                if (levelPanel instanceof HTMLElement) {
                    levelPanel.style.display = reverse ? "block" : "none";
                }

                if (callback) callback();
            }
        };

        window.requestAnimationFrame(openBoxDoors);
    }

    static closeDoors(showTape = true, callback?: AnimationCallback): void {
        BoxDoors.openDoors(showTape, callback, true);
    }

    static closeBoxAnimation(callback?: AnimationCallback): void {
        const tapeRoll = document.getElementById("tapeRoll");
        const tapeSlice = document.getElementById("levelTape");
        const levelResults = document.getElementById("levelResults");

        if (!(tapeRoll instanceof HTMLElement) || !(tapeSlice instanceof HTMLElement)) {
            return;
        }

        const levelResultsElement = levelResults instanceof HTMLElement ? levelResults : null;

        fadeOut(levelResultsElement, 400, () => {
            tapeRoll.style.top = `${resolution.uiScaledNumber(0)}px`;

            setTimeout(() => {
                fadeIn(tapeRoll, 200, () => {
                    const offset = resolution.uiScaledNumber(650);
                    const offsetH = resolution.uiScaledNumber(553);
                    const begin = Date.now();
                    const from = parseInt(tapeRoll.style.top, 10) || 0;
                    const fromH = resolution.uiScaledNumber(63);
                    const duration = 1000;

                    tapeSlice.style.height = `${fromH}px`;
                    tapeSlice.style.display = "block";

                    const rollTape = () => {
                        const now = Date.now();
                        const diff = now - begin;
                        const value = Easing.easeInOutCubic(diff, from, offset - from, duration);
                        const valueH = Easing.easeInOutCubic(diff, fromH, offset - fromH, duration);

                        tapeRoll.style.top = `${value}px`;
                        tapeSlice.style.height = `${valueH}px`;

                        if (diff < duration) {
                            window.requestAnimationFrame(rollTape);
                        } else {
                            tapeSlice.style.display = "none";
                            BoxDoors.renderDoors(true);

                            fadeOut(tapeRoll, 400, () => {
                                if (levelResultsElement) {
                                    levelResultsElement.style.opacity = "1";
                                }
                                if (callback) {
                                    window.setTimeout(() => callback(), 200);
                                }
                            });
                        }
                    };

                    window.requestAnimationFrame(rollTape);
                });
            }, 400);
        });
    }

    static openBoxAnimation(callback?: AnimationCallback): void {
        BoxDoors.renderDoors(true, 0);
        BoxDoors.hideGradient();

        const boxCutter = document.getElementById("boxCutter");
        if (!(boxCutter instanceof HTMLElement)) {
            return;
        }

        boxCutter.style.top = `${resolution.uiScaledNumber(371)}px`;

        window.setTimeout(() => {
            fadeIn(boxCutter, 200, () => {
                const offset = resolution.uiScaledNumber(-255);
                const begin = Date.now();
                const from = parseInt(boxCutter.style.top, 10) || 0;
                const duration = 1000;

                const cutBox = () => {
                    const now = Date.now();
                    const diff = now - begin;
                    const value = Easing.easeInOutCubic(diff, from, offset - from, duration);

                    boxCutter.style.top = `${value}px`;

                    if (diff < duration) {
                        window.requestAnimationFrame(cutBox);
                    } else {
                        fadeOut(boxCutter, 300, callback);
                    }
                };

                window.requestAnimationFrame(cutBox);
            });
        }, 200);
    }

    static showGradient(): void {}

    static hideGradient(): void {}

    static #getDoorCanvases(): CanvasPair | null {
        const left = document.getElementById("levelCanvasLeft");
        const right = document.getElementById("levelCanvasRight");

        if (left instanceof HTMLCanvasElement && right instanceof HTMLCanvasElement) {
            return { left, right };
        }

        return null;
    }

    static #requireDoorCanvases(): CanvasPair | null {
        if (BoxDoors.canvasLeft && BoxDoors.canvasRight) {
            return { left: BoxDoors.canvasLeft, right: BoxDoors.canvasRight };
        }

        return BoxDoors.#getDoorCanvases();
    }
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => BoxDoors.initializeDoors(), { once: true });
} else {
    BoxDoors.initializeDoors();
}

const fadeOut = (
    element: HTMLElement | null,
    duration: number,
    callback?: AnimationCallback
): void => {
    if (!element) {
        if (callback) callback();
        return;
    }

    element.style.transition = `opacity ${duration}ms`;
    element.style.opacity = "0";

    window.setTimeout(() => {
        element.style.display = "none";
        element.style.transition = "";
        if (callback) callback();
    }, duration);
};

const fadeIn = (
    element: HTMLElement | null,
    duration: number,
    callback?: AnimationCallback
): void => {
    if (!element) {
        if (callback) callback();
        return;
    }

    element.style.opacity = "0";
    element.style.display = "block";
    element.style.transition = `opacity ${duration}ms`;

    void element.offsetHeight;

    element.style.opacity = "1";

    window.setTimeout(() => {
        element.style.transition = "";
        if (callback) callback();
    }, duration);
};

export default BoxDoors;
