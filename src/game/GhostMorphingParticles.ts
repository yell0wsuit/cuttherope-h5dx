import RotateableMultiParticles from "@/visual/RotateableMultiParticles";
import MathHelper from "@/utils/MathHelper";
import RGBAColor from "@/core/RGBAColor";
import Rectangle from "@/core/Rectangle";
import type Texture2D from "@/core/Texture2D";
import type { Particle } from "@/visual/Particles";

const DEFAULT_PARTICLE_COUNT = 7;

class GhostMorphingParticles extends RotateableMultiParticles {
    constructor(texture: Texture2D, totalParticles = DEFAULT_PARTICLE_COUNT) {
        super(totalParticles, texture);

        this.size = 0.6;
        this.sizeVar = 0.2;
        this.angle = 0;
        this.angleVar = 360;
        this.rotateSpeedVar = 30;
        this.life = 0.6;
        this.lifeVar = 0.15;
        this.duration = 1.5;
        this.speed = 200;
        this.speedVar = 60;
        this.startColor = RGBAColor.solidOpaque.copy();
        this.endColor = RGBAColor.transparent.copy();
    }

    override initParticle(particle: Particle) {
        super.initParticle(particle);

        const randomIndex = MathHelper.randomRange(4, 6);
        const quad = this.imageGrid.rects[randomIndex];
        if (!quad) return;

        this.drawer.setTextureQuad(
            this.particles.length,
            quad,
            new Rectangle(0, 0, 0, 0),
            undefined
        );

        const scale = particle.size;
        particle.width = quad.w * scale;
        particle.height = quad.h * scale;
    }

    override updateParticle(particle: Particle, index: number, delta: number) {
        super.updateParticle(particle, index, delta);

        if (particle.life <= 0) {
            return;
        }

        const fadeThreshold = 0.7 * this.life;
        if (particle.life < fadeThreshold) {
            particle.deltaColor.r = (this.endColor.r - this.startColor.r) / fadeThreshold;
            particle.deltaColor.g = (this.endColor.g - this.startColor.g) / fadeThreshold;
            particle.deltaColor.b = (this.endColor.b - this.startColor.b) / fadeThreshold;
            particle.deltaColor.a = (this.endColor.a - this.startColor.a) / fadeThreshold;
        }

        particle.dir.multiply(0.92);
        particle.width *= 1.015;
        particle.height *= 1.015;
    }
}

export default GhostMorphingParticles;
