import Rectangle from "@/core/Rectangle";
import ResourceId from "@/resources/ResourceId";
import ResourceMgr from "@/resources/ResourceMgr";
import MathHelper from "@/utils/MathHelper";
import PumpDirt from "@/game/PumpDirt";
import Radians from "@/utils/Radians";
import SoundMgr from "@/game/CTRSoundMgr";
import Vector from "@/core/Vector";
import resolution from "@/resolution";
import * as GameSceneConstants from "@/gameScene/constants";
import type { GameScene } from "@/types/game-scene";
import type LightBulb from "@/game/LightBulb";
import type Pump from "@/game/Pump";
import type ConstrainedPoint from "@/physics/ConstrainedPoint";
import type GameObject from "@/visual/GameObject";

function handlePumpFlow(
    pump: Pump,
    star: ConstrainedPoint,
    candy: GameObject,
    delta: number
): void {
    const powerRadius = resolution.PUMP_POWER_RADIUS;
    if (powerRadius === undefined) {
        return;
    }
    const pumpBB = pump.bb;

    if (!pumpBB) {
        return;
    }

    const intersects =
        candy.rectInObject(
            pump.x - powerRadius,
            pump.y - powerRadius,
            pump.x + powerRadius,
            pump.y + powerRadius
        ) ?? false;

    if (!intersects) {
        return;
    }

    const tn1 = new Vector(0, 0);
    const tn2 = new Vector(0, 0);
    const h = new Vector(candy.x, candy.y);

    tn1.x = pump.x - pumpBB.w / 2;
    tn2.x = pump.x + pumpBB.w / 2;
    tn1.y = tn2.y = pump.y;

    if (pump.angle !== 0) {
        h.rotateAround(-pump.angle, pump.x, pump.y);
    }

    // Use pump's bbox dimensions for all objects
    const candyWithinPump =
        h.y < tn1.y &&
        Rectangle.rectInRect(
            h.x - pumpBB.w / 2,
            h.y - pumpBB.h / 2,
            h.x + pumpBB.w / 2,
            h.y + pumpBB.h / 2,
            tn1.x,
            tn1.y - powerRadius,
            tn2.x,
            tn2.y
        );

    if (!candyWithinPump) {
        return;
    }

    const maxPower = powerRadius * 2;
    const power = (maxPower * (powerRadius - (tn1.y - h.y))) / powerRadius;
    const pumpForce = new Vector(0, -power);

    pumpForce.rotate(pump.angle);
    star.applyImpulse(pumpForce, delta);
}

function handlePumpFlowForBulb(pump: Pump, bulb: LightBulb, delta: number): void {
    if (bulb.attachedSock != null) {
        return;
    }

    const powerRadius = resolution.PUMP_POWER_RADIUS;
    if (powerRadius === undefined) {
        return;
    }
    const pumpBB = pump.bb;

    if (!pumpBB) {
        return;
    }

    // Use worldBounds for intersection (LightBulb has no texture so bb is null)
    const wb = bulb.worldBounds;
    const intersects = Rectangle.rectInRect(
        pump.x - powerRadius,
        pump.y - powerRadius,
        pump.x + powerRadius,
        pump.y + powerRadius,
        wb.x,
        wb.y,
        wb.x + wb.w,
        wb.y + wb.h
    );

    if (!intersects) {
        return;
    }

    const tn1 = new Vector(0, 0);
    const tn2 = new Vector(0, 0);
    const h = new Vector(bulb.x, bulb.y);

    tn1.x = pump.x - pumpBB.w / 2;
    tn2.x = pump.x + pumpBB.w / 2;
    tn1.y = tn2.y = pump.y;

    if (pump.angle !== 0) {
        h.rotateAround(-pump.angle, pump.x, pump.y);
    }

    // Use bulb's worldBounds dimensions for collision
    const bulbWithinPump =
        h.y < tn1.y &&
        Rectangle.rectInRect(
            h.x - wb.w / 2,
            h.y - wb.h / 2,
            h.x + wb.w / 2,
            h.y + wb.h / 2,
            tn1.x,
            tn1.y - powerRadius,
            tn2.x,
            tn2.y
        );

    if (!bulbWithinPump) {
        return;
    }

    const maxPower = powerRadius * 2;
    const power = (maxPower * (powerRadius - (tn1.y - h.y))) / powerRadius;
    const pumpForce = new Vector(0, -power);

    pumpForce.rotate(pump.angle);
    bulb.constraint.applyImpulse(pumpForce, delta);
}

function operatePump(scene: GameScene, pump: Pump, delta: number): void {
    pump.playTimeline(0);
    const soundId = MathHelper.randomRange(ResourceId.SND_PUMP_1, ResourceId.SND_PUMP_4);
    SoundMgr.playSound(soundId);

    const dirtTexture = ResourceMgr.getTexture(ResourceId.IMG_OBJ_PUMP);
    if (dirtTexture) {
        const flowLength = Math.max(0, (resolution.PUMP_POWER_RADIUS ?? 0) - resolution.PUMP_DIRT_OFFSET);
        const dirt = new PumpDirt(5, dirtTexture, Radians.toDegrees(pump.angle) - 90);
        dirt.configureForFlowLength(flowLength);
        dirt.onFinished = scene.aniPool.particlesFinishedDelegate();

        const v = new Vector(pump.x + resolution.PUMP_DIRT_OFFSET, pump.y);
        v.rotateAround(pump.angle - Math.PI / 2, pump.x, pump.y);
        dirt.x = v.x;
        dirt.y = v.y;

        dirt.startSystem(5);
        scene.aniPool.addChild(dirt);
    }

    if (!scene.noCandy) {
        scene.handlePumpFlow(pump, scene.star, scene.candy, delta);
    }

    if (scene.twoParts !== GameSceneConstants.PartsType.NONE) {
        if (!scene.noCandyL) {
            scene.handlePumpFlow(pump, scene.starL, scene.candyL, delta);
        }

        if (!scene.noCandyR) {
            scene.handlePumpFlow(pump, scene.starR, scene.candyR, delta);
        }
    }

    if (scene.lightbulbs.length > 0) {
        for (const bulb of scene.lightbulbs) {
            if (bulb) {
                handlePumpFlowForBulb(pump, bulb, delta);
            }
        }
    }

    for (const grab of scene.bungees) {
        if (grab?.rope && grab.kickable && grab.kicked) {
            handlePumpFlow(pump, grab.rope.bungeeAnchor, grab, delta);
        }
    }
}

class GameScenePumpUtilsDelegate {
    private readonly scene: GameScene;

    constructor(scene: GameScene) {
        this.scene = scene;
    }

    handlePumpFlow(pump: Pump, star: ConstrainedPoint, candy: GameObject, delta: number): void {
        handlePumpFlow(pump, star, candy, delta);
    }

    operatePump(pump: Pump, delta: number): void {
        operatePump(this.scene, pump, delta);
    }
}

export default GameScenePumpUtilsDelegate;
