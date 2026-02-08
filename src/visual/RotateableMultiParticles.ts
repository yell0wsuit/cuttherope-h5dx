import MultiParticles from "@/visual/MultiParticles";
import Radians from "@/utils/Radians";
import MathHelper from "@/utils/MathHelper";
import Vector from "@/core/Vector";
import { lerp } from "@/utils/interpolation";
import type Texture2D from "@/core/Texture2D";
import { Particle } from "@/visual/Particles";

class RotateableMultiParticles extends MultiParticles {
    rotateSpeed: number;
    rotateSpeedVar: number;

    constructor(numParticles: number, texture: Texture2D) {
        super(numParticles, texture);
        this.rotateSpeed = 0;
        this.rotateSpeedVar = 0;
        this.drawer.rotationAngles = [];
        this.drawer.rotationPositions = [];
    }

    override initParticle(particle: Particle) {
        super.initParticle(particle);
        particle.angle = 0;
        particle.deltaAngle = Radians.fromDegrees(
            this.rotateSpeed + this.rotateSpeedVar * MathHelper.randomMinus1to1()
        );

        const index = this.particles.length;
        this.drawer.rotationAngles[index] = 0;
        this.drawer.rotationPositions[index] = new Vector(0, 0);
    }

    rotatePreCalc(v: Vector, cosA: number, sinA: number, cx: number, cy: number) {
        v.x -= cx;
        v.y -= cy;

        const nx = v.x * cosA - v.y * sinA;
        const ny = v.x * sinA + v.y * cosA;

        v.x = nx + cx;
        v.y = ny + cy;
    }

    override updateParticle(particle: Particle, index: number, delta: number) {
        super.updateParticle(particle, index, delta);
        particle.angle += particle.deltaAngle * delta;

        // we need to save the angle and position for drawing rotation
        this.drawer.rotationAngles[index] = particle.angle;
        const rotPos = this.drawer.rotationPositions[index];
        if (rotPos) {
            rotPos.copyFrom(particle.pos);
        }
    }

    override draw() {
        if (this.interpolationAlpha < 1) {
            const alpha = this.interpolationAlpha;
            for (let i = 0; i < this.particleIdx; i++) {
                const p = this.particles[i];
                if (!p) continue;

                this.drawer.rotationAngles[i] = lerp(p.prevAngle, p.angle, alpha);

                const rotPos = this.drawer.rotationPositions[i];
                if (rotPos) {
                    rotPos.x = lerp(p.prevPos.x, p.pos.x, alpha);
                    rotPos.y = lerp(p.prevPos.y, p.pos.y, alpha);
                }
            }
        }
        super.draw();
    }

    override removeParticle(index: number) {
        this.drawer.rotationAngles.splice(index, 1);
        this.drawer.rotationPositions.splice(index, 1);
        super.removeParticle(index);
    }
}

export default RotateableMultiParticles;
