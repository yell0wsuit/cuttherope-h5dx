import Lantern from "@/game/Lantern";
import RGBAColor from "@/core/RGBAColor";
import { getSavedCandyIndex } from "@/ui/InterfaceManager/skinSelection";
import type GameSceneLoaders from "../loaders";
import type { LanternItem } from "../MapLayerItem";

export function loadLantern(this: GameSceneLoaders, item: LanternItem): void {
    const lanternX = item.x * this.PM + this.PMX;
    const lanternY = item.y * this.PM + this.PMY;
    const selectedCandySkin = getSavedCandyIndex();

    const lantern = new Lantern(lanternX, lanternY, selectedCandySkin, this.candyResourceId);
    lantern.parseMover(item);
    this.lanterns.push(lantern);

    const capturedString =
        typeof item.candyCaptured === "string"
            ? item.candyCaptured.toLowerCase()
            : item.candyCaptured;
    const captured =
        capturedString === true ||
        capturedString === 1 ||
        capturedString === "1" ||
        capturedString === "true";
    if (captured) {
        this.isCandyInLantern = true;
        lantern.captureCandy(this.star);
        this.candy.x = this.star.pos.x;
        this.candy.y = this.star.pos.y;
        this.candy.color = RGBAColor.transparent.copy();
    }
}
