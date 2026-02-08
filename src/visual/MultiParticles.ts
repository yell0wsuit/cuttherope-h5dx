import Particles, { Particle } from "@/visual/Particles";
import Rectangle from "@/core/Rectangle";
import MathHelper from "@/utils/MathHelper";
import ImageMultiDrawer from "@/visual/ImageMultiDrawer";
import resolution from "@/resolution";
import { lerp } from "@/utils/interpolation";
import type Texture2D from "@/core/Texture2D";

class MultiParticles extends Particles {
    imageGrid: Texture2D;
    drawer: ImageMultiDrawer;

    constructor(numParticles: number, texture: Texture2D) {
        super(numParticles);

        this.imageGrid = texture;
        this.drawer = new ImageMultiDrawer(texture);
        this.width = resolution.CANVAS_WIDTH;
        this.height = resolution.CANVAS_HEIGHT;
    }

    override initParticle(particle: Particle) {
        const texture = this.imageGrid;
        const n = MathHelper.randomRange(0, texture.rects.length - 1);
        const tquad = texture.rects[n];
        if (!tquad) {
            return;
        }

        const vquad = new Rectangle(0, 0, 0, 0); // don't draw initially

        this.drawer.setTextureQuad(this.particles.length, tquad, vquad, 1);

        super.initParticle(particle);

        particle.width = tquad.w * particle.size;
        particle.height = tquad.h * particle.size;
    }

    override updateParticle(particle: Particle, index: number, delta: number) {
        // update the current position
        this.drawer.vertices[index] = new Rectangle(
            particle.pos.x - particle.width / 2,
            particle.pos.y - particle.height / 2,
            particle.width,
            particle.height
        );

        // update the alpha in the drawer
        this.drawer.alphas[index] = particle.color.a;

        // update the color in the particle system
        this.colors[index] = particle.color;
    }

    override removeParticle(index: number) {
        this.drawer.removeQuads(index);
        super.removeParticle(index);
    }

    override draw() {
        this.preDraw();

        if (this.interpolationAlpha < 1) {
            const alpha = this.interpolationAlpha;
            for (let i = 0; i < this.particleIdx; i++) {
                const p = this.particles[i];
                const vert = this.drawer.vertices[i];
                if (!p || !vert) continue;

                vert.x = lerp(p.prevPos.x, p.pos.x, alpha) - p.width / 2;
                vert.y = lerp(p.prevPos.y, p.pos.y, alpha) - p.height / 2;
            }
        }

        this.drawer.draw();
        this.postDraw();
    }
}

export default MultiParticles;
