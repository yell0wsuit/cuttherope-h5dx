import platform from "@/config/platforms/platform-web";
import edition from "@/config/editions/net-edition";

const GAME_COMPLETE_CLASS = "gameComplete";

interface GameBorderFadeOptions {
    fadeIn: boolean;
    duration?: number | undefined;
    delay?: number | undefined;
}

class GameBorder {
    private borderElement: HTMLElement | null = null;

    private ensureBorderElement = (): HTMLElement | null => {
        if (!this.borderElement) {
            this.borderElement = document.getElementById("gameBorder");
        }
        return this.borderElement;
    };

    private applyFade = ({ fadeIn, duration = 0, delay = 0 }: GameBorderFadeOptions): void => {
        const element = this.ensureBorderElement();
        if (!element) {
            return;
        }

        const totalDelay = Math.max(delay, 0);
        const effectiveDuration = Math.max(duration, 0);

        if (effectiveDuration === 0) {
            if (fadeIn) {
                element.style.opacity = "1";
                element.style.display = "";
            } else {
                element.style.opacity = "0";
                element.style.display = "none";
            }
            return;
        }

        const targetOpacity = fadeIn ? "1" : "0";
        const initialOpacity = fadeIn ? "0" : "1";

        if (fadeIn) {
            element.style.display = "";
            element.style.opacity = initialOpacity;
        }

        element.style.transition = "none";

        requestAnimationFrame(() => {
            if (!element) {
                return;
            }

            element.style.transition = `opacity ${effectiveDuration}ms ease`;

            if (!fadeIn) {
                element.style.opacity = initialOpacity;
            }

            setTimeout(() => {
                if (element) {
                    element.style.opacity = targetOpacity;
                }
            }, totalDelay);

            const handleTransitionEnd = () => {
                element.removeEventListener("transitionend", handleTransitionEnd);
                if (!fadeIn) {
                    element.style.display = "none";
                }
                element.style.transition = "";
            };

            element.addEventListener("transitionend", handleTransitionEnd, { once: true });
        });
    };

    domReady = (): void => {
        this.ensureBorderElement();
    };

    setBoxBorder = (boxIndex: number): void => {
        const element = this.ensureBorderElement();
        if (!element) {
            return;
        }

        const borderFile = edition.boxBorders[boxIndex];
        const backgroundUrl = borderFile ? `${platform.uiImageBaseUrl}${borderFile}` : "";

        element.classList.remove(GAME_COMPLETE_CLASS);
        element.style.backgroundImage = backgroundUrl ? `url("${backgroundUrl}")` : "";
    };

    setGameCompleteBorder = (): void => {
        const element = this.ensureBorderElement();
        if (!element) {
            return;
        }

        element.style.backgroundImage = "";
        element.classList.add(GAME_COMPLETE_CLASS);
    };

    hide = (): void => {
        const element = this.ensureBorderElement();
        if (!element) {
            return;
        }
        element.style.display = "none";
    };

    show = (): void => {
        const element = this.ensureBorderElement();
        if (!element) {
            return;
        }
        element.style.display = "";
    };

    fadeIn = (duration?: number, delay?: number): void => {
        this.applyFade({ fadeIn: true, duration, delay });
    };

    fadeOut = (duration?: number, delay?: number): void => {
        this.applyFade({ fadeIn: false, duration, delay });
    };
}

export default new GameBorder();
