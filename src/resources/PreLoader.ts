import platform from "@/config/platforms/platform-web";
import edition from "@/config/editions/net-edition";
import resolution from "@/resolution";
import resData from "@/resources/ResData";
import SoundLoader from "@/resources/SoundLoader";
import JsonLoader from "@/resources/JsonLoader";
import ResourceMgr, { initializeResources } from "@/resources/ResourceMgr";
import ResourcePacks from "@/resources/ResourcePacks";
import PubSub from "@/utils/PubSub";
import { loadImageAsset, loadJson } from "@/resources/ImageAssetLoader";
import type { TexturePackerAtlas } from "@/resources/TextureAtlasParser";

interface ResourceDescriptor {
    url: string;
    tag: string;
    resId: number | null;
}

class PreLoader {
    private menuImagesLoadComplete = false;

    private menuSoundLoadComplete = false;

    private menuJsonLoadComplete = false;

    private menuCompleteLocked = false;

    private completeCallback: (() => void) | null = null;

    private loadedImages = 0;

    private loadedSounds = 0;

    private loadedJsonFiles = 0;

    private failedImages = 0;

    private failedSounds = 0;

    private totalImages = 0;

    private totalSounds = 0;

    private totalJsonFiles = 0;

    private readonly MENU_TAG = "MENU" as const;

    private readonly FONT_TAG = "FONT" as const;

    private readonly GAME_TAG = "GAME" as const;

    private updateProgress(): void {
        // Weighted progress calculation:
        // JSON files: 10%, Images: 60%, Audio: 30%
        const jsonProgress =
            this.totalJsonFiles > 0 ? (this.loadedJsonFiles / this.totalJsonFiles) * 10 : 0;
        const imageProgress =
            this.totalImages > 0 ? (this.loadedImages / this.totalImages) * 60 : 0;
        const soundProgress =
            this.totalSounds > 0 ? (this.loadedSounds / this.totalSounds) * 30 : 0;

        const progress = jsonProgress + imageProgress + soundProgress;
        PubSub.publish(PubSub.ChannelId.PreloaderProgress, { progress });
        /*LoadAnimation?.notifyLoadProgress?.(progress);*/
    }

    private checkMenuLoadComplete(): void {
        if (
            this.menuCompleteLocked ||
            !this.menuImagesLoadComplete ||
            !this.menuSoundLoadComplete ||
            !this.menuJsonLoadComplete
        ) {
            return;
        }

        if (this.failedImages > 0 || this.failedSounds > 0) {
            window.console?.warn?.(
                `Loading completed with failures - Images: ${this.failedImages}, Sounds: ${this.failedSounds}`
            );
        }

        /*LoadAnimation?.notifyLoaded?.();
        LoadAnimation?.hide?.();*/

        if (this.completeCallback) {
            setTimeout(this.completeCallback, 0);
        }

        this.menuCompleteLocked = true;
    }

    private collectImageResources(gameBaseUrl: string): {
        resources: ResourceDescriptor[];
        menuResourceCount: number;
    } {
        const resources: ResourceDescriptor[] = [];
        let menuResourceCount = 0;
        const add = (url: string | null | undefined, tag: string, resId: number | null = null) => {
            if (!url) {
                return;
            }
            resources.push({ url, tag, resId });
            if (tag === this.MENU_TAG || tag === this.FONT_TAG) {
                menuResourceCount++;
            }
        };

        const queueMenu = (
            arr: readonly (string | null)[] | string | undefined,
            base = platform.uiImageBaseUrl
        ) => {
            if (!arr) {
                return;
            }
            const names = Array.isArray(arr) ? arr : [arr];
            for (const name of names) {
                if (name) {
                    add(base + name, this.MENU_TAG);
                }
            }
        };

        queueMenu(edition.menuImageFilenames);
        queueMenu(edition.boxImages, platform.boxImageBaseUrl);
        queueMenu(edition.boxBorders);
        queueMenu(edition.boxDoors);
        queueMenu(edition.drawingImageNames);
        queueMenu(
            edition.editionImages,
            platform.resolutionBaseUrl + (edition.editionImageDirectory || "")
        );

        const queueForResMgr = (ids: readonly number[] | undefined, tag: string) => {
            if (!ids) {
                return;
            }
            for (const id of ids) {
                const res = resData[id];
                if (!res) {
                    continue;
                }
                add(gameBaseUrl + res.path, tag, id);
                if (res.atlasPath) {
                    loadJson<TexturePackerAtlas>(gameBaseUrl + res.atlasPath)
                        .then((atlas) => ResourceMgr.onAtlasLoaded(id, atlas))
                        .catch((error) => ResourceMgr.onAtlasError(id, error as Error));
                }
            }
        };

        queueForResMgr(ResourcePacks.StandardFonts, this.FONT_TAG);
        queueForResMgr(edition.gameImageIds, this.GAME_TAG);
        queueForResMgr(edition.levelBackgroundIds, this.GAME_TAG);
        queueForResMgr(edition.levelOverlayIds, this.GAME_TAG);

        return { resources, menuResourceCount };
    }

    private loadImages(): { trackedResourceCount: number } {
        const gameBaseUrl = `${platform.imageBaseUrl}${resolution.CANVAS_WIDTH}/game/`;
        const { resources, menuResourceCount } = this.collectImageResources(gameBaseUrl);

        let menuLoaded = 0;
        let menuFailed = 0;

        const tracked = (tag: string) => tag === this.MENU_TAG || tag === this.FONT_TAG;
        const finalize = () => {
            this.loadedImages = menuLoaded + menuFailed;
            this.failedImages = menuFailed;
            this.updateProgress();

            if (menuLoaded + menuFailed === menuResourceCount) {
                this.menuImagesLoadComplete = true;
                this.checkMenuLoadComplete();
            }
        };

        if (menuResourceCount === 0) {
            this.menuImagesLoadComplete = true;
            this.checkMenuLoadComplete();
        }

        for (const { url, tag, resId } of resources) {
            loadImageAsset(url)
                .then((asset) => {
                    if ((tag === this.FONT_TAG || tag === this.GAME_TAG) && resId !== null) {
                        ResourceMgr.onResourceLoaded(resId, asset);
                    }
                    if (tracked(tag)) {
                        menuLoaded++;
                    }
                })
                .catch((error) => {
                    window.console?.error?.("Failed to load image:", url, error);
                    if (tracked(tag)) {
                        menuFailed++;
                    }
                })
                .finally(() => {
                    if (tracked(tag)) {
                        finalize();
                    }
                });
        }

        return { trackedResourceCount: menuResourceCount };
    }

    start(): void {
        initializeResources();
        // LoadAnimation?.init?.();
    }

    domReady(): void {
        const betterLoader = document.getElementById("betterLoader");
        const start = () => this.startResourceLoading();

        if (!betterLoader) {
            start();
            return;
        }

        const bg = window.getComputedStyle(betterLoader).backgroundImage;
        const match = bg.match(/url\(["']?([^"']*)["']?\)/);
        if (match && match[1]) {
            const img = new Image();
            img.onload = start;
            img.onerror = start;
            img.src = match[1];
        } else {
            start();
        }
    }

    run(onComplete: (() => void) | null): void {
        this.completeCallback = onComplete;
        this.checkMenuLoadComplete();
    }

    private startResourceLoading(): void {
        this.totalJsonFiles = JsonLoader.getJsonFileCount();

        JsonLoader.onProgress((completed, _total) => {
            this.loadedJsonFiles = completed;
            this.updateProgress();
        });

        JsonLoader.onMenuComplete(() => {
            this.menuJsonLoadComplete = true;
            const { trackedResourceCount } = this.loadImages();

            this.totalImages = trackedResourceCount;
            this.totalSounds = SoundLoader.getSoundCount();

            SoundLoader.onProgress((completed, _total) => {
                this.loadedSounds = completed;
                this.updateProgress();
            });

            SoundLoader.onMenuComplete(() => {
                this.menuSoundLoadComplete = true;
                this.checkMenuLoadComplete();
            });

            SoundLoader.start();
        });

        void JsonLoader.start();
    }
}

export default new PreLoader();
