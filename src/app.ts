import PreLoader from "@/resources/PreLoader";
import { IS_XMAS } from "@/utils/SpecialEvents";
import resolution from "@/resolution";
import im from "@/ui/InterfaceManager";
import Canvas from "@/utils/Canvas";
import settings from "@/game/CTRSettings";
import ZoomManager from "@/ZoomManager";
import PubSub from "@/utils/PubSub";

interface ProgressPayload {
    progress: number;
}

const clamp = (value: number, min: number, max: number): number => {
    return Math.min(max, Math.max(min, value));
};

class App {
    private progressBar: HTMLElement | null = null;
    private betterLoader: HTMLElement | null = null;
    private gameFooterSocial: HTMLElement | null = null;

    constructor() {
        PreLoader.start();
        PubSub.publish(PubSub.ChannelId.AppInit);
    }

    domReady(): void {
        this.progressBar = document.getElementById("progress");
        this.betterLoader = document.getElementById("betterLoader");
        this.gameFooterSocial = document.getElementById("gameFooterSocial");

        if (settings.disableTextSelection) {
            const preventSelection = (event: Event) => {
                event.preventDefault();
            };
            document.body.addEventListener("selectstart", preventSelection);
        }

        const ctrCursors = document.querySelectorAll(".ctrCursor");
        ctrCursors.forEach((cursor) => {
            if (cursor instanceof HTMLElement) {
                cursor.addEventListener("mousedown", () => {
                    cursor.classList.toggle("ctrCursorActive");
                });
                cursor.addEventListener("mouseup", () => {
                    cursor.classList.toggle("ctrCursorActive");
                });
            }
        });

        document.body.classList.add(`ui-${resolution.UI_WIDTH}`);
        if (IS_XMAS) {
            document.body.classList.add("is-xmas");
        }

        Canvas.domReady("c");

        if (!Canvas.element) {
            throw new Error("Canvas element not found");
        }

        Canvas.element.width = resolution.CANVAS_WIDTH;
        Canvas.element.height = resolution.CANVAS_HEIGHT;

        Canvas.element.style.width = `${resolution.CANVAS_WIDTH}px`;
        Canvas.element.style.height = `${resolution.CANVAS_HEIGHT}px`;

        if (typeof ZoomManager.domReady === "function") {
            ZoomManager.domReady();
        }

        PreLoader.domReady();
        im.gameFlow.domReady();
        PubSub.publish(PubSub.ChannelId.AppDomReady);
    }

    run(): void {
        const progressSubscription = PubSub.subscribe(
            PubSub.ChannelId.PreloaderProgress,
            (...args: unknown[]) => {
                const [payload] = args;
                if (!payload || typeof payload !== "object") {
                    return;
                }

                const progressValue = (payload as Partial<ProgressPayload>).progress;
                if (this.progressBar && typeof progressValue === "number") {
                    const progress = clamp(progressValue, 0, 100);
                    this.progressBar.style.transition = "width 0.3s ease-out";
                    this.progressBar.style.width = `${progress}%`;
                }
            }
        );

        PreLoader.run(() => {
            PubSub.unsubscribe(progressSubscription);

            if (this.progressBar) {
                this.progressBar.style.width = "100%";
            }

            window.setTimeout(() => {
                if (this.betterLoader) {
                    this.betterLoader.style.transition = "opacity 0.5s";
                    this.betterLoader.style.opacity = "0";
                    window.setTimeout(() => {
                        if (this.betterLoader) {
                            this.betterLoader.style.display = "none";
                        }
                    }, 500);
                }
            }, 200);

            im.gameFlow.appReady();
            PubSub.publish(PubSub.ChannelId.AppRun);

            const hideAfterLoad = document.querySelectorAll(".hideAfterLoad");
            hideAfterLoad.forEach((element) => {
                if (element instanceof HTMLElement) {
                    element.style.transition = "opacity 0.5s";
                    element.style.opacity = "0";
                    window.setTimeout(() => {
                        element.style.display = "none";
                    }, 500);
                }
            });

            const hideBeforeLoad = document.querySelectorAll(".hideBeforeLoad");
            hideBeforeLoad.forEach((element) => {
                if (element instanceof HTMLElement) {
                    element.style.display = element.style.display || "block";
                    element.style.opacity = "0";
                    element.style.transition = "opacity 0.5s";
                    void element.offsetHeight;
                    element.style.opacity = "1";
                }
            });

            im.gameFlow.updateDevLink();

            if (this.gameFooterSocial) {
                this.gameFooterSocial.style.top = "0";
            }
        });
    }
}

export default new App();
