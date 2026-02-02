import MathHelper from "@/utils/MathHelper";
import Vector from "@/core/Vector";
import * as GameSceneConstants from "@/gameScene/constants";
import SoundMgr from "@/game/CTRSoundMgr";
import resolution from "@/resolution";
import ConstrainedPoint from "@/physics/ConstrainedPoint";
import ResourceId from "@/resources/ResourceId";
import type { GameScene } from "@/types/game-scene";
import type Star from "@/game/Star";

const CONSTRAINT_RELAXATION_STEPS = 30;
const SLEEP_ANIM_FRAME_DELAY = 0.05;
const SLEEP_ANIM_FRAME_COUNT =
    GameSceneConstants.IMG_CHAR_ANIMATIONS_SLEEPING_sleep_end -
    GameSceneConstants.IMG_CHAR_ANIMATIONS_SLEEPING_sleep_start +
    1;
const SLEEP_PULSE_START_DELAY = SLEEP_ANIM_FRAME_COUNT * SLEEP_ANIM_FRAME_DELAY;
const SLEEP_PULSE_PIVOT_Y_RATIO = 433 / 480;
const NIGHT_SLEEP_SOUND_INTERVAL = 4;
const NIGHT_SLEEP_SOUND_IDS: number[] = [
    ResourceId.SND_MONSTER_SLEEP_1,
    ResourceId.SND_MONSTER_SLEEP_2,
    ResourceId.SND_MONSTER_SLEEP_3,
];
const LIGHTBULB_COLLISION_DISTANCE = resolution.PM * resolution.STAR_RADIUS;

const getSleepPulsePivotOffsetY = (height: number): number => {
    return height * SLEEP_PULSE_PIVOT_Y_RATIO - height / 2;
};

export const updateLightBulbPhysics = (scene: GameScene, delta: number): void => {
    if (scene.lightbulbs.length === 0) {
        return;
    }

    const timeStep = delta * scene.ropePhysicsSpeed;
    for (const bulb of scene.lightbulbs) {
        bulb.constraint.update(timeStep);
        for (let i = 0; i < CONSTRAINT_RELAXATION_STEPS; i++) {
            bulb.constraint.satisfyConstraints();
        }
        bulb.syncToConstraint();
        bulb.update(delta);
    }
};

export const updateLightBulbCollisions = (scene: GameScene): void => {
    if (scene.lightbulbs.length === 0) {
        return;
    }

    for (let i = 0; i < scene.lightbulbs.length; i++) {
        const bulb = scene.lightbulbs[i];
        if (!bulb || bulb.attachedSock != null) {
            continue;
        }
        // Candy collision (reuse same logic as hazards)
        if (!scene.noCandy && !scene.targetSock) {
            resolveConstraintCollision(bulb.constraint, scene.star, LIGHTBULB_COLLISION_DISTANCE);
        }
        // Bulb-to-bulb collision
        for (let j = i + 1; j < scene.lightbulbs.length; j++) {
            const other = scene.lightbulbs[j];
            if (!other || other.attachedSock != null) {
                continue;
            }
            resolveConstraintCollision(
                bulb.constraint,
                other.constraint,
                LIGHTBULB_COLLISION_DISTANCE
            );
        }
    }

    for (const bulb of scene.lightbulbs) {
        bulb.syncToConstraint();
    }

    // Remove out-of-screen lightbulbs
    for (let i = scene.lightbulbs.length - 1; i >= 0; i--) {
        const bulb = scene.lightbulbs[i];
        if (bulb && scene.pointOutOfScreen(bulb.constraint)) {
            scene.lightbulbs.splice(i, 1);
        }
    }
};

const stopNightSleepSound = (scene: GameScene): void => {
    if (scene.sleepSoundId == null) {
        return;
    }
    SoundMgr.stopSound(scene.sleepSoundId);
    scene.sleepSoundId = null;
};

const playNightSleepSound = (scene: GameScene): void => {
    if (NIGHT_SLEEP_SOUND_IDS.length === 0) {
        return;
    }
    const soundId =
        NIGHT_SLEEP_SOUND_IDS[MathHelper.randomRange(0, NIGHT_SLEEP_SOUND_IDS.length - 1)];
    if (soundId == null) {
        return;
    }
    scene.sleepSoundId = soundId;
    SoundMgr.playSound(soundId);
};

const setNightSleepVisibility = (scene: GameScene, visible: boolean): void => {
    if (scene.sleepAnimPrimary) {
        scene.sleepAnimPrimary.visible = visible;
        if (visible) {
            scene.sleepAnimPrimary.playTimeline(0);
        } else {
            scene.sleepAnimPrimary.getTimeline(0)?.stop();
        }
    }
    if (scene.sleepAnimSecondary) {
        scene.sleepAnimSecondary.visible = visible;
        if (visible) {
            scene.sleepAnimSecondary.playTimeline(0);
        } else {
            scene.sleepAnimSecondary.getTimeline(0)?.stop();
        }
    }
};

const resolveConstraintCollision = (
    a: ConstrainedPoint,
    b: ConstrainedPoint,
    minDistance: number
): void => {
    // Calculate separation vector from b to a
    const delta = Vector.subtract(a.pos, b.pos);
    let dist = delta.getLength();

    // Early exit: objects are not overlapping
    if (dist >= minDistance) {
        return;
    }

    // Handle degenerate case where points are exactly on top of each other
    // Use arbitrary separation direction (1, 0) to prevent division by zero
    if (dist === 0) {
        delta.x = 1;
        delta.y = 0;
        dist = 1;
    }

    // Calculate how much the objects are overlapping
    const overlap = minDistance - dist;

    // Choose collision response strategy based on relative speed vs overlap
    const speedSum = a.v.getLength() + b.v.getLength();

    // Path 1: Simple position correction (for slow collisions or large overlaps)
    // When speedSum is 0, or overlap is too large relative to speed, just separate the objects
    if (speedSum <= 0 || overlap < (1000 / speedSum) * 2) {
        // Normalized collision normal (direction from b to a)
        const nx = delta.x / dist;
        const ny = delta.y / dist;

        // Move each object half the overlap distance apart
        const offset = overlap / 2;
        a.pos.x += nx * offset;
        a.pos.y += ny * offset;
        b.pos.x -= nx * offset;
        b.pos.y -= ny * offset;
        return;
    }

    // Path 2: Velocity exchange with position correction (for fast collisions)
    // This performs a coordinate system transformation to exchange velocity components

    // g: collision normal vector (from a to b)
    const g = Vector.subtract(b.pos, a.pos);

    // (h, m): tangent vector perpendicular to collision normal
    // Rotating g by 90 degrees: (x,y) -> (-y, x)
    let h = -g.y;
    let m = g.x;

    // Project a's velocity onto the collision normal (dot product / distance)
    // This gives the velocity component along the collision direction
    let f = (a.v.x * g.x + a.v.y * g.y) / minDistance;

    // Project a's velocity onto the tangent direction
    // This gives the velocity component perpendicular to collision
    const e = (a.v.x * h + a.v.y * m) / minDistance;

    // Project b's velocity onto tangent (stored in h temporarily)
    h = (b.v.x * h + a.v.x * m) / minDistance;

    // Store a's normal component in m (swapping step 1)
    m = f;

    // Project b's velocity onto collision normal (stored in f)
    f = (b.v.x * g.x + b.v.y * g.y) / minDistance;

    // Normalize the collision normal
    const nx = g.x / minDistance;
    const ny = g.y / minDistance;

    // Reconstruct a's new velocity: b's normal component + a's tangent component
    // This effectively swaps the normal components while keeping tangent components
    const aVx = f * nx - e * ny;
    const aVy = f * ny + e * nx;

    // Reconstruct b's new velocity: a's normal component + b's tangent component
    const bVx = m * nx - h * ny;
    const bVy = m * ny + h * nx;

    // Apply the new velocities (this simulates elastic collision)
    a.v.x = aVx;
    a.v.y = aVy;
    b.v.x = bVx;
    b.v.y = bVy;

    // Separate the objects by the overlap distance (half each direction)
    const sepX = (overlap / 2) * (delta.x / dist);
    const sepY = (overlap / 2) * (delta.y / dist);
    a.pos.x += sepX;
    a.pos.y += sepY;
    b.pos.x -= sepX;
    b.pos.y -= sepY;

    // Update previous positions for Verlet integration
    // prevPos is set such that (pos - prevPos) * 60 = velocity
    // This ensures the velocity change propagates through the physics system
    a.prevPos.x = a.pos.x - a.v.x / 60;
    a.prevPos.y = a.pos.y - a.v.y / 60;
    b.prevPos.x = b.pos.x - b.v.x / 60;
    b.prevPos.y = b.pos.y - b.v.y / 60;
};

const updateNightTargetAwake = (scene: GameScene, isAwake: boolean): void => {
    if (scene.isNightTargetAwake === isAwake) {
        return;
    }

    scene.isNightTargetAwake = isAwake;

    if (isAwake) {
        scene.sleepPulseActive = false;
        scene.sleepPulseTime = 0;
        scene.sleepPulseDelay = 0;
        scene.sleepSoundTimer = 0;
        scene.sleepPulseBaseY = 0;
        stopNightSleepSound(scene);
        scene.target.scaleX = 1;
        scene.target.scaleY = 1;
        scene.target.rotationCenterX = 0;
        scene.target.rotationCenterY = 0;
        setNightSleepVisibility(scene, false);
        scene.target.playTimeline(GameSceneConstants.CharAnimation.EXCITED);
        return;
    }

    // Don't switch to sleeping if candy has been eaten
    if (scene.noCandy) {
        return;
    }

    scene.sleepPulseActive = false;
    scene.sleepPulseTime = 0;
    scene.sleepPulseDelay = SLEEP_PULSE_START_DELAY;
    scene.sleepSoundTimer = 0;
    setNightSleepVisibility(scene, true);
    scene.target.playTimeline(GameSceneConstants.CharAnimation.SLEEPING);
    scene.sleepPulseBaseY = getSleepPulsePivotOffsetY(scene.target.height);
    scene.target.rotationCenterY = scene.sleepPulseBaseY;
};

export function updateNightLevel(this: GameScene, delta: number): void {
    if (!this.nightLevel) {
        return;
    }

    if (this.sleepAnimPrimary) {
        this.sleepAnimPrimary.update(delta);
    }
    if (this.sleepAnimSecondary) {
        this.sleepAnimSecondary.update(delta);
    }

    // Skip awake state updates after candy is eaten (win animation playing)
    if (!this.noCandy) {
        const targetPosition = new Vector(this.target.x, this.target.y);
        let isAwake = false;
        for (const bulb of this.lightbulbs) {
            if (
                Vector.distance(
                    bulb.constraint.pos.x,
                    bulb.constraint.pos.y,
                    targetPosition.x,
                    targetPosition.y
                ) < bulb.lightRadius
            ) {
                isAwake = true;
                break;
            }
        }

        updateNightTargetAwake(this, isAwake);
    }

    if (this.isNightTargetAwake === false) {
        if (!this.sleepPulseActive) {
            this.sleepPulseDelay = Math.max(0, this.sleepPulseDelay - delta);
            if (this.sleepPulseDelay === 0) {
                this.sleepPulseActive = true;
            }
        }

        if (this.sleepPulseActive) {
            const sinValue = Math.sin(this.sleepPulseTime * 2);
            const scaleY = 0.95 + ((sinValue + 1) / 2) * 0.1; // Maps [-1,1] to [0.95, 1.05]

            // Only apply pulsing when Om Nom is actually in sleeping animation
            if (this.target.currentTimelineIndex === GameSceneConstants.CharAnimation.SLEEPING) {
                // json sourceSize: 480x480 (full canvas)
                // Frame 0006 (last sleep frame): spriteSourceSize.y = 187, h = 139
                // Bottom of visible sprite = 187 + 139 = 326
                // For pivot at the sitting baseline:
                // Center of canvas = 240
                // Offset from center to baseline = 326 - 240 = 86
                this.target.rotationCenterY = 86;
                // Squish effect: only scaleY changes for breathing effect
                this.target.scaleY = scaleY;
            }
            this.sleepPulseTime += delta;
        }

        this.sleepSoundTimer += delta;
        if (this.sleepSoundTimer > NIGHT_SLEEP_SOUND_INTERVAL) {
            this.sleepSoundTimer = 0;
            playNightSleepSound(this);
        }
    }

    for (const star of this.stars) {
        if (!star) {
            continue;
        }
        let lit = false;
        for (const bulb of this.lightbulbs) {
            if (
                Vector.distance(bulb.constraint.pos.x, bulb.constraint.pos.y, star.x, star.y) <
                bulb.lightRadius
            ) {
                lit = true;
                break;
            }
        }
        (star as Star).setLitState(lit);
    }

    // Night level loses if all lightbulbs are gone
    if (
        this.lightbulbs.length === 0 &&
        this.restartState !== GameSceneConstants.RestartState.FADE_IN &&
        !this.noCandy
    ) {
        this.gameLost();
    }

    if (this.sleepAnimPrimary) {
        this.sleepAnimPrimary.x = this.target.x;
        this.sleepAnimPrimary.y = this.target.y;
    }
    if (this.sleepAnimSecondary) {
        this.sleepAnimSecondary.x = this.target.x;
        this.sleepAnimSecondary.y = this.target.y;
    }
}
