import resolution from "@/resolution";
import * as GameSceneConstants from "@/gameScene/constants";
import type GameSceneLoaders from "../loaders";
import type { GameDesignItem } from "../MapLayerItem";

export function loadGameDesign(this: GameSceneLoaders, item: GameDesignItem): void {
    this.special = item.special || 0;
    this.ropePhysicsSpeed = item.ropePhysicsSpeed;
    this.nightLevel = item.nightLevel;
    this.twoParts = item.twoParts
        ? GameSceneConstants.PartsType.SEPARATE
        : GameSceneConstants.PartsType.NONE;
    this.mapOffsetX = Number(item.mapOffsetX ?? 0);
    this.mapOffsetY = Number(item.mapOffsetY ?? 0);
    this.ropePhysicsSpeed *= resolution.PHYSICS_SPEED_MULTIPLIER;
}
