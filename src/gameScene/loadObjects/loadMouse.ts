import Vector from "@/core/Vector";
import Mouse from "@/game/Mouse";
import MiceObject from "@/game/MiceObject";
import type GameSceneLoaders from "../loaders";
import type { MouseItem } from "../MapLayerItem";
import type { GameScene } from "@/types/game-scene";

export function loadMouse(this: GameSceneLoaders, item: MouseItem): void {
    const px = item.x * this.PM + this.PMX;
    const py = item.y * this.PM + this.PMY;
    const angle = item.angle ?? 0;
    const radius = (item.radius ?? 0) * this.PM || 80 * this.PM;
    const activeTime = item.activeTime ?? 3;
    const index = item.index ?? this.mice.length + 1;

    if (!this.miceManager) {
        this.miceManager = new MiceObject(this as unknown as GameScene);
    }

    const mouse = new Mouse(this.miceManager);
    mouse.initialize(new Vector(px, py), angle, radius, activeTime);
    this.mice.push(mouse);
    this.miceManager.registerMouse(mouse, index);
}
