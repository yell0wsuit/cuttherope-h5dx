import Log from "@/utils/Log";
import { getMapItemDefinitionById, getMapItemDefinitionByKey } from "@/utils/MapItem";
import type { MapItemDefinition } from "@/utils/MapItem";
import GameSceneInit from "./init";
import type { TimelineKeyFrameListener } from "@/visual/TimelineTypes";
import type MapLayerItem from "./MapLayerItem";
import { loadMapSettings } from "./loadObjects/loadMapSettings";
import { loadGameDesign } from "./loadObjects/loadGameDesign";
import { loadGrab } from "./loadObjects/loadGrab";
import { loadCandy, loadCandyL, loadCandyR } from "./loadObjects/loadCandy";
import { loadGravitySwitch } from "./loadObjects/loadGravitySwitch";
import { loadStar } from "./loadObjects/loadStar";
import { loadTutorialText, loadTutorialImage } from "./loadObjects/loadTutorial";
import { loadHidden } from "./loadObjects/loadHidden";
import { loadBubble } from "./loadObjects/loadBubble";
import { loadPump } from "./loadObjects/loadPump";
import { loadSock } from "./loadObjects/loadSock";
import { loadSpike } from "./loadObjects/loadSpike";
import { loadRotatedCircle } from "./loadObjects/loadRotatedCircle";
import { loadBouncer } from "./loadObjects/loadBouncer";
import { loadSteamTube } from "./loadObjects/loadSteamTube";
import { loadTarget } from "./loadObjects/loadTarget";
import { loadGhost } from "./loadObjects/loadGhost";
import { loadLantern } from "./loadObjects/loadLantern";

type MapData = Record<string, MapLayerItem[]>;

abstract class GameSceneLoaders extends GameSceneInit {
    protected abstract onIdleOmNomKeyFrame(...args: Parameters<TimelineKeyFrameListener>): void;

    protected abstract onPaddingtonIdleKeyFrame(
        ...args: Parameters<TimelineKeyFrameListener>
    ): void;

    // Loader methods imported from loadObjects folder
    loadMapSettings = loadMapSettings;
    loadGameDesign = loadGameDesign;
    loadGrab = loadGrab;
    loadCandy = loadCandy;
    loadCandyL = loadCandyL;
    loadCandyR = loadCandyR;
    loadGravitySwitch = loadGravitySwitch;
    loadStar = loadStar;
    loadTutorialText = loadTutorialText;
    loadTutorialImage = loadTutorialImage;
    loadHidden = loadHidden;
    loadBubble = loadBubble;
    loadPump = loadPump;
    loadSteamTube = loadSteamTube;
    loadSock = loadSock;
    loadSpike = loadSpike;
    loadRotatedCircle = loadRotatedCircle;
    loadBouncer = loadBouncer;
    loadTarget = loadTarget;
    loadGhost = loadGhost;
    loadLantern = loadLantern;

    protected override loadMap(map: MapData | null | undefined): void {
        if (!map) {
            return;
        }

        const layers: MapLayerItem[][] = [];

        for (const layerName of Object.keys(map)) {
            const layer = map[layerName];
            if (Array.isArray(layer)) {
                layers.push(layer as MapLayerItem[]);
            }
        }

        const queue: { item: MapLayerItem; definition: MapItemDefinition; order: number }[] = [];
        let order = 0;

        for (const children of layers) {
            for (const child of children) {
                const resolvedId = typeof child.name === "number" ? child.name : Number(child.name);
                const definition = getMapItemDefinitionById(resolvedId);

                if (!definition) {
                    Log.alert(`Unknown map item id: ${child.name}`);
                    continue;
                }

                queue.push({
                    item: child,
                    definition,
                    order: order++,
                });
            }
        }

        queue
            .sort((a, b) => {
                const priorityA = a.definition.priority ?? 1;
                const priorityB = b.definition.priority ?? 1;

                if (priorityA === priorityB) {
                    return a.order - b.order;
                }

                return priorityA - priorityB;
            })
            .forEach(({ item, definition }) => {
                const loaderRef = definition.loader;

                if (typeof loaderRef !== "string") {
                    Log.alert(`Loader not implemented for map item: ${definition.key}`);
                    return;
                }

                const loadFn = (this as Record<string, unknown>)[loaderRef];

                if (typeof loadFn !== "function") {
                    Log.alert(`Loader not implemented for map item: ${definition.key}`);
                    return;
                }

                (loadFn as (item: MapLayerItem, definition: MapItemDefinition) => void).call(
                    this,
                    item,
                    definition
                );
            });
    }
}

export default GameSceneLoaders;
