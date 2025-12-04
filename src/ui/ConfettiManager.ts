import RES_DATA from "@/resources/ResData";
import ResourceId from "@/resources/ResourceId";
import MathHelper from "@/utils/MathHelper";
import type Texture2D from "@/core/Texture2D";

interface ParticleFrameRange {
    start: number;
    end: number;
}

// Frame ranges for different confetti particle types
const PARTICLE_TYPES: ParticleFrameRange[] = [
    { start: 0, end: 8 }, // particle_3
    { start: 9, end: 17 }, // particle_2
    { start: 18, end: 26 }, // particle_1
];

class ConfettiParticle {
    frameIndex: number;
    frameRange: ParticleFrameRange;
    texture: Texture2D;

    startX: number;
    startY: number;
    duration: number;
    endX: number;
    endY: number;

    x: number;
    y: number;

    startRotation: number;
    endRotation: number;
    rotation: number;

    scale: number;
    scaleGrowDuration: number;

    opacity: number;

    frameAnimationTimer: number;
    frameAnimationDelay: number;
    currentFrameOffset: number;

    age: number;

    constructor(
        canvasWidth: number,
        canvasHeight: number,
        frameIndex: number,
        frameRange: ParticleFrameRange,
        texture: Texture2D
    ) {
        this.frameIndex = frameIndex;
        this.frameRange = frameRange;
        this.texture = texture;

        this.startX = MathHelper.randomRange(-100, canvasWidth);
        this.startY = MathHelper.randomRange(-40, 100);

        this.duration = MathHelper.randomRange(2, 5);

        this.endX = this.startX;
        this.endY = this.startY + MathHelper.randomRange(150, 400);

        this.x = this.startX;
        this.y = this.startY;

        this.startRotation = MathHelper.randomRange(-360, 360);
        this.endRotation = MathHelper.randomRange(-360, 360);
        this.rotation = this.startRotation;

        this.scale = 0;
        this.scaleGrowDuration = 0.3;

        this.opacity = 1;

        this.frameAnimationTimer = 0;
        this.frameAnimationDelay = 0.05;
        this.currentFrameOffset = MathHelper.randomRange(0, frameRange.end - frameRange.start);

        this.age = 0;
    }

    update(delta: number): boolean {
        this.age += delta;

        const progress = Math.min(this.age / this.duration, 1);

        this.x = this.startX + (this.endX - this.startX) * progress;
        this.y = this.startY + (this.endY - this.startY) * progress;

        this.rotation = this.startRotation + (this.endRotation - this.startRotation) * progress;

        if (this.age < this.scaleGrowDuration) {
            this.scale = this.age / this.scaleGrowDuration;
        } else {
            this.scale = 1;
        }

        this.opacity = 1 - progress;

        this.frameAnimationTimer += delta;
        if (this.frameAnimationTimer >= this.frameAnimationDelay) {
            this.frameAnimationTimer -= this.frameAnimationDelay;
            this.currentFrameOffset =
                (this.currentFrameOffset + 1) % (this.frameRange.end - this.frameRange.start + 1);
        }

        this.frameIndex = this.frameRange.start + this.currentFrameOffset;

        return this.age < this.duration;
    }

    draw(ctx: CanvasRenderingContext2D): void {
        const frame = this.texture.rects[this.frameIndex];
        if (!frame || !this.texture.image) return;

        ctx.save();
        ctx.globalAlpha = this.opacity;
        ctx.translate(this.x, this.y);
        ctx.rotate((this.rotation * Math.PI) / 180);

        const w = frame.w;
        const h = frame.h;
        ctx.drawImage(this.texture.image, frame.x, frame.y, w, h, -w / 2, -h / 2, w, h);

        ctx.restore();
    }
}

class ConfettiManager {
    canvas: HTMLCanvasElement | null = null;
    ctx: CanvasRenderingContext2D | null = null;
    particles: ConfettiParticle[] = [];
    active = false;
    animationFrame: number | null = null;
    lastTime = 0;
    emissionTimer = 0;
    emissionRate = 200; // particles per second
    duration = 1; // seconds
    elapsed = 0;
    totalParticles = 50;
    initialBurst = 15;
    texture: Texture2D | null = null;

    start(containerElement: HTMLElement): void {
        this.canvas = document.createElement("canvas");
        this.canvas.id = "confettiCanvas";
        this.canvas.style.position = "absolute";
        this.canvas.style.top = "0";
        this.canvas.style.left = "0";
        this.canvas.style.width = "100%";
        this.canvas.style.height = "100%";
        this.canvas.style.pointerEvents = "none";
        this.canvas.style.zIndex = "9999";

        const rect = containerElement.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;

        containerElement.appendChild(this.canvas);
        this.ctx = this.canvas.getContext("2d");
        if (!this.ctx) {
            console.error("Confetti canvas failed to initialize rendering context");
            this.stop();
            return;
        }

        const resource = RES_DATA[ResourceId.IMG_CONFETTI_PARTICLES];
        this.texture = (resource?.texture as Texture2D | undefined) ?? null;

        if (!this.texture || !this.texture.image) {
            console.error("Confetti texture not loaded");
            this.stop();
            return;
        }

        this.particles = [];
        this.active = true;
        this.lastTime = performance.now();
        this.elapsed = 0;
        this.emissionTimer = 0;

        for (let i = 0; i < this.initialBurst; i++) {
            this.createParticle();
        }

        this.animate();
    }

    private createParticle(): void {
        if (!this.canvas || !this.texture) {
            return;
        }

        if (this.particles.length >= this.totalParticles) return;

        const typeIndex = MathHelper.randomRange(0, PARTICLE_TYPES.length - 1);
        const type = PARTICLE_TYPES[typeIndex];
        if (!type) {
            return;
        }

        const initialFrameIndex = MathHelper.randomRange(type.start, type.end);

        this.particles.push(
            new ConfettiParticle(
                this.canvas.width,
                this.canvas.height,
                initialFrameIndex,
                type,
                this.texture
            )
        );
    }

    private animate = (): void => {
        if (!this.active) return;

        const now = performance.now();
        const delta = (now - this.lastTime) / 1000;
        this.lastTime = now;

        this.elapsed += delta;
        this.emissionTimer += delta;

        if (this.elapsed < this.duration) {
            const emissionInterval = 1 / this.emissionRate;
            while (
                this.emissionTimer >= emissionInterval &&
                this.particles.length < this.totalParticles
            ) {
                this.createParticle();
                this.emissionTimer -= emissionInterval;
            }
        }

        const ctx = this.ctx;
        const canvas = this.canvas;
        if (!ctx || !canvas) {
            this.stop();
            return;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        this.particles = this.particles.filter((particle) => {
            const alive = particle.update(delta);
            if (alive) {
                particle.draw(ctx);
            }
            return alive;
        });

        if (this.particles.length > 0 || this.elapsed < this.duration) {
            this.animationFrame = requestAnimationFrame(this.animate);
        } else {
            this.stop();
        }
    };

    stop(): void {
        this.active = false;
        if (this.animationFrame != null) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
        if (this.canvas && this.canvas.parentElement) {
            this.canvas.parentElement.removeChild(this.canvas);
        }
        this.canvas = null;
        this.ctx = null;
        this.particles = [];
    }
}

export default ConfettiManager;
