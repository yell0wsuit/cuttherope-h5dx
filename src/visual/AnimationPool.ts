import BaseElement from "@/visual/BaseElement";
import ParticlesClass from "./Particles";
import type Timeline from "./Timeline";

/**
 * Container to hold animated objects which can be automatically deleted
 * once their animation timelines have completed
 */
class AnimationPool extends BaseElement {
    removeList: BaseElement[];
    interpolationAlpha = 1;

    constructor() {
        super();

        // keeps track of child elements whose timeline has completed
        // and can be removed
        this.removeList = [];
    }

    override update(delta: number) {
        // remove the children
        for (let i = 0, len = this.removeList.length; i < len; i++) {
            const element = this.removeList[i];
            if (element) {
                this.removeChild(element);
            }
        }

        // clear the remove list
        this.removeList.length = 0;
        super.update(delta);
    }

    override draw() {
        for (const child of this.children) {
            if (child instanceof ParticlesClass) {
                child.interpolationAlpha = this.interpolationAlpha;
            }
        }
        super.draw();
    }

    timelineFinished(timeline: Timeline) {
        if (timeline.element && timeline.element instanceof BaseElement) {
            this.removeList.push(timeline.element);
        }
    }

    /**
     * Returns a delegate that can be invoked when a timeline finishes
     */
    timelineFinishedDelegate() {
        // save a reference to ourselves since we may be called in a
        // different context (typically by another class)
        return (timeline: Timeline) => {
            this.timelineFinished(timeline);
        };
    }

    particlesFinished(particles: ParticlesClass) {
        this.removeList.push(particles);
    }

    /**
     * Returns a delegate that can be invoked when a particle system finishes
     */
    particlesFinishedDelegate() {
        // save a reference to ourselves since we may be called in a
        // different context (typically by another class)
        return (particles: ParticlesClass) => {
            this.particlesFinished(particles);
        };
    }
}

export default AnimationPool;
