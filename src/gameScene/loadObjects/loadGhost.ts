import Vector from "@/core/Vector";
import Ghost from "@/game/Ghost";
import type GameSceneLoaders from "../loaders";
import type { GhostItem } from "../MapLayerItem";

export function loadGhost(this: GameSceneLoaders, item: GhostItem): void {
    const px = item.x * this.PM + this.PMX;
    const py = item.y * this.PM + this.PMY;
    const grabRadius = item.radius * this.PM;
    const bouncerAngle = item.angle ?? 0;

    const useGrab = item.grab ?? false;
    const useBubble = item.bubble ?? false;
    const useBouncer = item.bouncer ?? false;

    const possibleStatesMask = (useBouncer ? 8 : 0) | (useBubble ? 2 : 0) | (useGrab ? 4 : 0);

    const ghost = new Ghost(new Vector(px, py), possibleStatesMask, grabRadius, bouncerAngle, this);

    this.ghosts.push(ghost);
}
