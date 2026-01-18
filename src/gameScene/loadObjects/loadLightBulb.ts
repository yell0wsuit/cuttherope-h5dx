import ConstrainedPoint from "@/physics/ConstrainedPoint";
import LightBulb from "@/game/LightBulb";
import type GameSceneLoaders from "../loaders";
import type { LightBulbItem } from "../MapLayerItem";

export function loadLightBulb(this: GameSceneLoaders, item: LightBulbItem): void {
    const constraint = new ConstrainedPoint();
    constraint.setWeight(1);
    constraint.disableGravity = false;
    constraint.pos.x = item.x * this.PM + this.PMX;
    constraint.pos.y = item.y * this.PM + this.PMY;

    const bulb = new LightBulb(item.litRadius * this.PM, constraint);
    this.lightbulbs.push(bulb);
}
