import MultiParticles from "@/visual/MultiParticles";
import resolution from "@/resolution";
import Vector from "@/core/Vector";
import Rectangle from "@/core/Rectangle";
import MathHelper from "@/utils/MathHelper";
import type Texture2D from "@/core/Texture2D";
import type { Particle } from "@/visual/Particles";

const IMG_OBJ_PUMP_pump_start = 0;
const IMG_OBJ_PUMP_pump_end = 5;
const IMG_OBJ_PUMP_particle_1 = 6;
const IMG_OBJ_PUMP_particle_2 = 7;
const IMG_OBJ_PUMP_particle_3 = 8;

class PumpDirt extends MultiParticles {
    additive: boolean;

    constructor(numParticles: number, texture: Texture2D, angle: number) {
        super(numParticles, texture);

        this.angle = angle;
        this.angleVar = 10;

        this.speed = resolution.PUMP_DIRT_SPEED;

        // life of particles
        this.life = 0.6;

        // size in pixels
        this.size = 0.002;

        // emissions per second
        this.emissionRate = 50;

        // color of particles
        this.startColor.r = 1.0;
        this.startColor.g = 1.0;
        this.startColor.b = 1.0;
        this.startColor.a = 0.6;

        this.endColor.r = 1.0;
        this.endColor.g = 1.0;
        this.endColor.b = 1.0;
        this.endColor.a = 0.0;

        this.additive = true;
    }

    override initParticle(particle: Particle) {
        super.initParticle(particle);

        const texture = this.imageGrid;
        const n = MathHelper.randomRange(IMG_OBJ_PUMP_particle_1, IMG_OBJ_PUMP_particle_3);
        const tquad = texture.rects[n];
        if (!tquad) {
            return;
        }

        const vquad = new Rectangle(0, 0, 0, 0); // don't draw initially

        this.drawer.setTextureQuad(this.particles.length, tquad, vquad, 1);

        const particleSize = resolution.PUMP_DIRT_PARTICLE_SIZE;
        particle.width = particleSize;
        particle.height = particleSize;
    }

    override updateParticleLocation(
        p: { dir: Vector; pos: { add: (arg0: Vector) => void } },
        delta: number
    ) {
        p.dir.multiply(0.9);
        const tmp = Vector.multiply(p.dir, delta);
        tmp.add(this.gravity);
        p.pos.add(tmp);
    }
}

export default PumpDirt;
