import ConveyorBelt from "@/game/ConveyorBelt";
import type GameSceneLoaders from "../loaders";
import type { ConveyorBeltItem } from "../MapLayerItem";

export function loadConveyorBelt(this: GameSceneLoaders, item: ConveyorBeltItem): void {
    const x = item.x * this.PM + this.PMX;
    const y = item.y * this.PM + this.PMY;
    const length = item.length * this.PM;
    const height = item.width * this.PM;
    const rotation = item.angle;
    // 1.2 * 1.2 = 1.44, 1.2 is the pixel multipler value of another port
    const velocity =
        ((item.velocity * 1.44) / (this.PM * this.PM)) * (item.direction === "forward" ? 1 : -1);
    const isManual = item.type === "manual";

    const belt = ConveyorBelt.create(
        this.conveyors.count(),
        x,
        y,
        length,
        height,
        rotation,
        isManual,
        velocity
    );

    this.conveyors.push(belt);
}
