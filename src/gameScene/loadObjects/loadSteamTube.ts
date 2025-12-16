import Vector from "@/core/Vector";
import SteamTube from "@/game/SteamTube";
import type GameSceneLoaders from "../loaders";
import type { SteamTubeItem } from "../MapLayerItem";

export function loadSteamTube(this: GameSceneLoaders, item: SteamTubeItem): void {
    const position = new Vector(item.x * this.PM + this.PMX, item.y * this.PM + this.PMY);
    const heightScale = (item.scale ?? 1) * this.PM;
    const tube = new SteamTube(position, item.angle ?? 0, heightScale);
    this.tubes.push(tube);
}
