import MultiParticles from "@/visual/MultiParticles";
import RGBAColor from "@/core/RGBAColor";
import Rectangle from "@/core/Rectangle";
import type Texture2D from "@/core/Texture2D";
import type { Particle } from "@/visual/Particles";
import MathHelper from "@/utils/MathHelper";

const DEFAULT_PARTICLE_COUNT = 5;

class GhostMorphingCloud extends MultiParticles {
    constructor(texture: Texture2D, totalParticles = DEFAULT_PARTICLE_COUNT) {
        super(totalParticles, texture);

        this.angle = 0;
        this.size = 1.2;
        this.angleVar = 360;
        this.life = 0.5;
        this.duration = 1.5;
        this.speed = 120;
        this.speedVar = 40;
        this.startColor = RGBAColor.solidOpaque.copy();
        this.endColor = RGBAColor.transparent.copy();
    }

    override initParticle(particle: Particle) {
        //this.angle += 360 / this.totalParticles;
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
        particle.width = quad.w * this.size;
        particle.height = quad.h * this.size;
        particle.deltaColor = RGBAColor.transparent.copy();
    }

    override updateParticle(particle: Particle, index: number, delta: number) {
        super.updateParticle(particle, index, delta);

        if (particle.life <= 0) {
            return;
        }

        const fadeWindow = 0.2 * this.life;
        if (particle.life > this.life - fadeWindow) {
            const growth = 1.025;
            particle.width *= growth;
            particle.height *= growth;
        } else {
            particle.deltaColor.r = (this.endColor.r - this.startColor.r) / fadeWindow;
            particle.deltaColor.g = (this.endColor.g - this.startColor.g) / fadeWindow;
            particle.deltaColor.b = (this.endColor.b - this.startColor.b) / fadeWindow;
            particle.deltaColor.a = (this.endColor.a - this.startColor.a) / fadeWindow;
            const shrink = 0.98;
            particle.width *= shrink;
            particle.height *= shrink;
        }
    }

    override startSystem(initialParticles = this.totalParticles) {
        super.startSystem(initialParticles);
    }
}

export default GhostMorphingCloud;
