import resolution from "@/resolution";

type StyleOverrides = Partial<Record<string, string>>;

class ZoomManager {
    #bgZoom = 1;
    #element: HTMLElement | null = null;
    #nativeHeight = 0;
    #nativeWidth = 0;
    #transformOrigin = "top left";
    #zoom = 1;
    readonly originalHeight = 270;

    domReady(): void {
        this.setElementId("gameContainer");
        this.#nativeWidth = resolution.UI_WIDTH;
        this.#nativeHeight = resolution.UI_HEIGHT;
        this.autoResize();
    }

    setElementId(elementId: string): void {
        this.#element = document.getElementById(elementId);
    }

    setElement(element: HTMLElement | null): void {
        this.#element = element;
    }

    updateCss(css: StyleOverrides = {}): void {
        if (!this.#element) {
            return;
        }

        const scaleValue = this.#zoom === 1 ? "" : `scale(${this.#zoom})`;
        const originValue = this.#zoom === 1 ? "" : this.#transformOrigin;

        this.#element.style.transform = scaleValue;
        this.#element.style.transformOrigin = originValue;

        Object.assign(this.#element.style, css);
    }

    getCanvasZoom(): number {
        return this.#zoom || 1;
    }

    getUIZoom(): number {
        return this.#zoom || 1;
    }

    autoResize(): void {
        window.addEventListener("resize", () => this.resize());
        this.resize();
    }

    resize(skipZoom = false): void {
        const element = this.#element;
        if (!element) {
            return;
        }

        const vpWidth = window.innerWidth;
        const vpHeight = window.innerHeight;

        const nativeWidth = this.#nativeWidth;
        const nativeHeight = this.#nativeHeight;
        const originalHeight = this.originalHeight;

        if (!skipZoom) {
            this.#zoom = Math.min(vpWidth / nativeWidth, vpHeight / nativeHeight);
        }

        this.#bgZoom = vpHeight / (originalHeight * this.#zoom);

        this.#applyBackgroundScale(".coverBg", `scale(${this.#bgZoom})`);
        this.#applyBackgroundScale(".scaleBg", `scaleY(${this.#bgZoom})`);

        const scaledWidth = nativeWidth * this.#zoom;
        const scaledHeight = nativeHeight * this.#zoom;
        const left = Math.round((vpWidth - scaledWidth) / 2);
        const top = Math.round((vpHeight - scaledHeight) / 2);

        this.updateCss({
            position: "absolute",
            left: `${left}px`,
            top: `${top}px`,
            width: `${nativeWidth}px`,
            height: `${nativeHeight}px`,
        });
    }

    #applyBackgroundScale(selector: string, transformValue: string): void {
        document.querySelectorAll(selector).forEach((el) => {
            if (el instanceof HTMLElement) {
                el.style.transform = transformValue;
            }
        });
    }
}

export default new ZoomManager();
