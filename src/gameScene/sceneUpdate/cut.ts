import Constants from "@/utils/Constants";
import MathHelper from "@/utils/MathHelper";
import Rectangle from "@/core/Rectangle";
import ResourceId from "@/resources/ResourceId";
import SoundMgr from "@/game/CTRSoundMgr";
import resolution from "@/resolution";
import Grab from "@/game/Grab";
import type BaseElement from "@/visual/BaseElement";
import type Vector from "@/core/Vector";
import type { GameScene } from "@/types/game-scene";

type SceneGrab = GameScene["bungees"][number];
type SceneBungee = NonNullable<SceneGrab["rope"]>;

function cut(
    scene: GameScene,
    razor: BaseElement | null,
    v1: Vector,
    v2: Vector,
    immediate: boolean
): number {
    let cutCount = 0;
    const GRAB_WHEEL_RADIUS = resolution.GRAB_WHEEL_RADIUS;
    const GRAB_WHEEL_DIAMETER = GRAB_WHEEL_RADIUS * 2;
    const GUN_CUT_RADIUS = Grab.GUN_CUT_RADIUS;
    const GUN_CUT_DIAMETER = GUN_CUT_RADIUS * 2;

    for (const grab of scene.bungees) {
        const rope: SceneBungee | null = grab.rope;

        if (!rope || rope.cut !== Constants.UNDEFINED) {
            continue;
        }

        const parts = rope.parts;
        for (let i = 0, iLimit = parts.length - 1; i < iLimit; i++) {
            const p1 = parts[i]!;
            const p2 = parts[i + 1]!;
            let shouldCut = false;

            if (razor) {
                if (p1.prevPos.x !== Constants.INT_MAX) {
                    const minX = MathHelper.minOf4(p1.pos.x, p1.prevPos.x, p2.pos.x, p2.prevPos.x);
                    const minY = MathHelper.minOf4(p1.pos.y, p1.prevPos.y, p2.pos.y, p2.prevPos.y);
                    const maxX = MathHelper.maxOf4(p1.pos.x, p1.prevPos.x, p2.pos.x, p2.prevPos.x);
                    const maxY = MathHelper.maxOf4(p1.pos.y, p1.prevPos.y, p2.pos.y, p2.prevPos.y);

                    shouldCut = Rectangle.rectInRect(
                        minX,
                        minY,
                        maxX,
                        maxY,
                        razor.drawX,
                        razor.drawY,
                        razor.drawX + razor.width,
                        razor.drawY + razor.height
                    );
                }
            } else if (
                (grab.wheel &&
                    Rectangle.lineInRect(
                        v1.x,
                        v1.y,
                        v2.x,
                        v2.y,
                        grab.x - GRAB_WHEEL_RADIUS,
                        grab.y - GRAB_WHEEL_RADIUS,
                        GRAB_WHEEL_DIAMETER,
                        GRAB_WHEEL_DIAMETER
                    )) ||
                (grab.gun &&
                    Rectangle.lineInRect(
                        v1.x,
                        v1.y,
                        v2.x,
                        v2.y,
                        grab.x - GUN_CUT_RADIUS,
                        grab.y - GUN_CUT_RADIUS,
                        GUN_CUT_DIAMETER,
                        GUN_CUT_DIAMETER
                    ))
            ) {
                shouldCut = false;
            } else {
                shouldCut = MathHelper.lineInLine(
                    v1.x,
                    v1.y,
                    v2.x,
                    v2.y,
                    p1.pos.x,
                    p1.pos.y,
                    p2.pos.x,
                    p2.pos.y
                );
            }

            if (!shouldCut) {
                continue;
            }

            cutCount++;

            if (grab.hasSpider && grab.spiderActive) {
                scene.spiderBusted(grab);
            }

            SoundMgr.playSound(ResourceId.SND_ROPE_BLEAK_1 + rope.relaxed);

            rope.setCut(i);
            scene.detachCandy();

            if (immediate) {
                rope.cutTime = 0;
                rope.removePart(i);
            }

            if (grab.gun && grab.gunCup) {
                grab.gunCup.playTimeline(Grab.GunCup.HIDE);
            }

            return cutCount;
        }
    }

    return cutCount;
}

class GameSceneCutDelegate {
    private readonly scene: GameScene;

    constructor(scene: GameScene) {
        this.scene = scene;
    }

    cut(razor: BaseElement | null, v1: Vector, v2: Vector, immediate: boolean): number {
        return cut(this.scene, razor, v1, v2, immediate);
    }
}

export default GameSceneCutDelegate;
