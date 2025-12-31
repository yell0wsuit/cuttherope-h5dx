import Particles, { Particle } from "@/visual/Particles";
import Rectangle from "@/core/Rectangle";
import MathHelper from "@/utils/MathHelper";
import ImageMultiDrawer from "@/visual/ImageMultiDrawer";
import resolution from "@/resolution";
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

        /* for debugging rotation: draw a line from origin at 0 degrees
             let ctx = Canvas.context;
             if (!ctx) return;
             ctx.save();
             ctx.lineWidth = 5;
             ctx.strokeStyle = "blue";
             ctx.beginPath();
             ctx.moveTo(this.drawX, this.drawY);
             ctx.lineTo(this.drawX, this.drawY - 100);
             ctx.closePath();
             ctx.stroke();
             ctx.restore();
         */

        this.drawer.draw();
        this.postDraw();
    }
}

export default MultiParticles;
