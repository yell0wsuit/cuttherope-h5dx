import RGBAColor from "@/core/RGBAColor";

interface Point {
    x: number;
    y: number;
}

/**
 * Canvas wrapper class for 2D rendering operations
 */
class Canvas {
    element: HTMLCanvasElement | null = null;

    context: CanvasRenderingContext2D | null = null;

    /**
     * @deprecated Use element instead
     */
    id: HTMLElement | null = null;

    /**
     * Initialize canvas from element ID
     * @param elementId - The DOM element ID
     */
    domReady(elementId: string): void {
        const element = document.getElementById(elementId);
        if (element instanceof HTMLCanvasElement) {
            this.setTarget(element);
        }
    }

    /**
     * Set the target canvas element
     * @param element - The canvas element
     */
    setTarget(element: HTMLCanvasElement): void {
        this.id = element;
        this.element = element;
        const context = this.element.getContext("2d");
        if (!context) {
            throw new Error("Failed to get 2D context from canvas element");
        }
        this.context = context;
        this.setStyleColor(RGBAColor.white);
    }

    /**
     * Sets the fill and stroke styles using an RGBAColor
     * @param color - The color to set
     */
    setStyleColor(color: RGBAColor): void {
        const rgba = color.rgbaStyle();

        if (!this.context) {
            return;
        }

        this.context.fillStyle = rgba;
        this.context.strokeStyle = rgba;
    }

    /**
     * Sets the fill and stroke styles using a raw style string
     * @param style - The style string (e.g., "rgba(255, 0, 0, 1)")
     */
    setStyles(style: string): void {
        if (!this.context) {
            return;
        }

        this.context.fillStyle = style;
        this.context.strokeStyle = style;
    }

    /**
     * Fills a shape specified using a triangle strip array, ex:
     *   0 -- 2 -- 4 -- 6
     *   |    |    |    |
     *   1 -- 3 -- 5 -- 7
     * @param points - Array of points
     * @param style - Fill style
     */
    fillTriangleStrip(points: readonly Point[], style: string): void {
        const ctx = this.context;
        if (!ctx || points.length === 0) {
            return;
        }

        ctx.fillStyle = style;
        ctx.beginPath();
        ctx.moveTo(points[0]!.x, points[0]!.y);

        // draw the bottom portion of the shape
        for (let i = 1, len = points.length; i < len; i += 2) {
            const point = points[i]!;
            ctx.lineTo(point.x, point.y);
        }

        // draw the top portion
        for (let i = points.length - 2; i >= 0; i -= 2) {
            const point = points[i]!;
            ctx.lineTo(point.x, point.y);
        }

        ctx.fill(); // auto-closes path
    }
}

export const CanvasClass = Canvas;

export default new Canvas();
