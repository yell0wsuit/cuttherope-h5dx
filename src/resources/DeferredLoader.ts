import platform from "@/config/platforms/platform-web";
import edition from "@/config/editions/net-edition";
import resolution from "@/resolution";
import resData from "@/resources/ResData";
import ResourceMgr from "@/resources/ResourceMgr";
import ResourcePacks from "@/resources/ResourcePacks";
import { loadImageAsset, loadJson } from "@/resources/ImageAssetLoader";
import PubSub from "@/utils/PubSub";
import { getCandyResourceIdForBox } from "@/ui/InterfaceManager/skinSelection";
import type { TexturePackerAtlas } from "@/resources/TextureAtlasParser";

/**
 * A promise tagged with an `alreadyResolved` flag. When `true`, the caller
 * can synchronously skip any "show spinner" step because nothing was fetched.
 */
export type DeferredLoadPromise = Promise<void> & { alreadyResolved: boolean };

const taggedResolved = (): DeferredLoadPromise => {
    const promise = Promise.resolve() as DeferredLoadPromise;
    promise.alreadyResolved = true;
    return promise;
};

const taggedPending = (inner: Promise<void>): DeferredLoadPromise => {
    const promise = inner as DeferredLoadPromise;
    promise.alreadyResolved = false;
    return promise;
};

/**
 * Lazy loader for game object sprites and per-box level backgrounds.
 *
 * Load model:
 * - First `loadForBox` call: fetches every ID in `edition.gameImageIds` that
 *   isn't already covered by `ResourcePacks.MenuUsedGameImages` (loaded by
 *   the initial PreLoader pass), plus the selected box's background + overlay.
 * - Subsequent calls: only the new box's background/overlay, if not already
 *   cached. If everything is cached, returns an already-resolved promise.
 *
 * Failures are logged and swallowed (matching `PreLoader`'s best-effort
 * posture), so `loadForBox` never rejects. Missing textures surface at draw
 * time via `ResourceMgr.getTexture` returning `null`.
 */
class DeferredLoader {
    private loadedIds = new Set<number>();

    private inFlight = new Map<number, Promise<void>>();

    private gameObjectsStarted = false;

    loadForBox(boxIndex: number): DeferredLoadPromise {
        const idsToLoad = this.collectIdsForBox(boxIndex);
        if (idsToLoad.length === 0) {
            return taggedResolved();
        }

        const gameBaseUrl = `${platform.imageBaseUrl}${resolution.CANVAS_WIDTH}/game/`;
        const total = idsToLoad.length;
        let completed = 0;

        const perIdPromises = idsToLoad.map((id) => {
            const existing = this.inFlight.get(id);
            if (existing) {
                return existing.then(() => {
                    completed++;
                    PubSub.publish(PubSub.ChannelId.DeferredLoaderProgress, { completed, total });
                });
            }

            const p = this.loadResource(id, gameBaseUrl).then(() => {
                completed++;
                PubSub.publish(PubSub.ChannelId.DeferredLoaderProgress, { completed, total });
            });
            this.inFlight.set(id, p);
            return p;
        });

        return taggedPending(Promise.all(perIdPromises).then(() => undefined));
    }

    private collectIdsForBox(boxIndex: number): number[] {
        const ids: number[] = [];

        if (!this.gameObjectsStarted) {
            this.gameObjectsStarted = true;
            const excluded: ReadonlySet<number> = new Set<number>([
                ...ResourcePacks.MenuUsedGameImages,
                ...ResourcePacks.AllCandySkinImages,
            ]);
            for (const id of edition.gameImageIds) {
                if (excluded.has(id)) {
                    continue;
                }
                if (this.loadedIds.has(id) || this.inFlight.has(id)) {
                    continue;
                }
                ids.push(id);
            }
        }

        const perBoxIds: (number | null)[] = [getCandyResourceIdForBox(boxIndex)];

        const metadata = edition.getNormalizedBoxMetadata()[boxIndex];
        if (metadata) {
            perBoxIds.push(metadata.levelBackgroundId, metadata.levelOverlayId);
        }

        for (const id of perBoxIds) {
            if (id == null) {
                continue;
            }
            if (this.loadedIds.has(id) || this.inFlight.has(id)) {
                continue;
            }
            if (ids.includes(id)) {
                continue;
            }
            ids.push(id);
        }

        return ids;
    }

    private async loadResource(id: number, gameBaseUrl: string): Promise<void> {
        const res = resData[id];
        if (!res) {
            return;
        }

        const imagePromise = loadImageAsset(gameBaseUrl + res.path)
            .then((asset) => ResourceMgr.onResourceLoaded(id, asset))
            .catch((error) => {
                window.console?.error?.("DeferredLoader image failure:", id, error);
            });

        const atlasPromise = res.atlasPath
            ? loadJson<TexturePackerAtlas>(gameBaseUrl + res.atlasPath)
                  .then((atlas) => ResourceMgr.onAtlasLoaded(id, atlas))
                  .catch((error) => {
                      window.console?.error?.("DeferredLoader atlas failure:", id, error);
                      ResourceMgr.onAtlasError(id, error as Error);
                  })
            : Promise.resolve();

        try {
            await Promise.all([imagePromise, atlasPromise]);
        } finally {
            this.loadedIds.add(id);
            this.inFlight.delete(id);
        }
    }
}

export default new DeferredLoader();
