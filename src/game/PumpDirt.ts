import MultiParticles from "@/visual/MultiParticles";
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

/** Per-frame drag applied to particle velocity (at 60 FPS). */
const FLOW_DRAG_PER_FRAME = 0.9;

/** Target frame rate used to normalize drag and travel distance. */
const TARGET_FPS = 60;

class PumpDirt extends MultiParticles {
    additive: boolean;

    constructor(numParticles: number, texture: Texture2D, angle: number, particleSize: number) {
        super(numParticles, texture);

        this.duration = 0.6;

        this.angle = angle;
        this.angleVar = 10;

        this.speed = 1000;
        this.speedVar = 100;

        // life of particles
        this.life = 0.6;

        // size in pixels
        this.size = 2;
        this.sizeVar = 1;

        // emissions per second
        this.emissionRate = 100;

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

        this._particleSize = particleSize;
    }

    private _particleSize: number;

    /**
     * Adjusts speed so particles travel approximately the requested flow length,
     * accounting for drag deceleration over the particle lifetime.
     */
    configureForFlowLength(flowLength: number): void {
        if (this.life <= 0) {
            return;
        }
        const travel = Math.max(0, flowLength);
        const frames = this.life * TARGET_FPS;
        if (frames <= 0) {
            return;
        }
        const denom = 1 - FLOW_DRAG_PER_FRAME;
        const sum =
            Math.abs(denom) < 0.0001
                ? frames
                : (FLOW_DRAG_PER_FRAME * (1 - Math.pow(FLOW_DRAG_PER_FRAME, frames))) / denom;
        if (sum <= 0) {
            return;
        }
        this.speed = (travel * TARGET_FPS) / sum;
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

        particle.width = this._particleSize;
        particle.height = this._particleSize;
    }

    override updateParticleLocation(
        p: { dir: Vector; pos: { add: (arg0: Vector) => void } },
        delta: number
    ) {
        const frameDrag = Math.pow(FLOW_DRAG_PER_FRAME, delta * TARGET_FPS);
        p.dir.multiply(frameDrag);
        const tmp = Vector.multiply(p.dir, delta);
        tmp.add(this.gravity);
        p.pos.add(tmp);
    }
}

export default PumpDirt;
