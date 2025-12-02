import Box from "@/ui/Box";
import BoxType from "@/ui/BoxType";
import ScoreManager from "@/ui/ScoreManager";
import PubSub from "@/utils/PubSub";
import edition from "@/config/editions/net-edition";
import MoreComingBox from "@/ui/MoreComingBox";
import TimeBox from "@/ui/TimeBox";
import { UIRegistry } from "@/ui/types";
import { IS_XMAS } from "@/utils/SpecialEvents";

/**
 * Manages all game boxes — creation, visibility, locks, and events.
 */
class BoxManager {
    static boxes: Box[] = [];

    static isPaid = false;

    static appIsReady = false;

    static currentBoxIndex = BoxManager.getDefaultBoxIndex();

    // TODO: should be zero-based
    static currentLevelIndex = 1;

    /**
     * Returns the default box index.
     * Defaults to the Holiday Gift box (index 0) during Christmas season.
     */
    static getDefaultBoxIndex(): number {
        return IS_XMAS ? 0 : 1;
    }

    /**
     * Marks the app as ready and loads all boxes.
     */
    static appReady(): void {
        this.appIsReady = true;
        this.loadBoxes();
    }

    /**
     * Loads boxes only if the app is ready.
     */
    static loadBoxes(): void {
        if (!this.appIsReady) return;

        this.currentBoxIndex = this.getDefaultBoxIndex();
        this.currentLevelIndex = 1;
        this.createBoxes();
        this.updateVisibleBoxes();
    }

    /**
     * Creates all boxes according to edition configuration.
     */
    static createBoxes(): void {
        const { boxImages: images, boxTypes } = edition;

        while (this.boxes.length) {
            const existingBox = this.boxes.pop();
            existingBox?.destroy();
        }

        for (let i = 0; i < boxTypes.length; i++) {
            const type = boxTypes[i] ?? BoxType.NORMAL;
            const image = images[i] ?? null;
            const requiredStars = ScoreManager.requiredStars(i);
            const isLocked = ScoreManager.isBoxLocked(i);

            let box: Box;

            switch (type) {
                case BoxType.MORECOMING:
                    box = new MoreComingBox(i, image, requiredStars, isLocked, type);
                    break;
                case BoxType.TIME:
                    box = new TimeBox(i, image, requiredStars, isLocked, type);
                    break;
                case BoxType.HOLIDAY:
                    box = new Box(i, image, requiredStars, isLocked, type);
                    box.yOffset = -26;
                    break;
                default:
                    box = new Box(i, image, requiredStars, isLocked, type);
                    break;
            }

            this.boxes.push(box);
        }
    }

    /**
     * Updates the list of visible boxes and publishes via PubSub.
     */
    static updateVisibleBoxes(): void {
        const visibleBoxes: Box[] = [];

        for (let i = 0; i < this.boxes.length; i++) {
            const box = this.boxes[i];
            if (!box) continue;

            box.index = i;
            if (box.visible) visibleBoxes.push(box);
        }

        PubSub.publish(PubSub.ChannelId.UpdateVisibleBoxes, visibleBoxes);
    }

    /**
     * Checks if the next level is playable (i.e., not locked or paid-only).
     */
    static isNextLevelPlayable(): boolean {
        const levelCount = ScoreManager.levelCount(this.currentBoxIndex);

        if (levelCount == null || levelCount <= this.currentLevelIndex) {
            return false;
        }

        // Web edition: all levels are free
        return true;
    }

    /**
     * Returns the number of boxes required to win the game.
     */
    static requiredCount(): number {
        return this.boxes.filter((box) => box.isRequired()).length;
    }

    /**
     * Returns total possible stars across all required boxes.
     */
    static possibleStars(): number {
        return this.boxes.reduce((sum, box, i) => {
            return box.isRequired() ? sum + ScoreManager.possibleStarsForBox(i) : sum;
        }, 0);
    }

    /**
     * Returns the count of visible and required game boxes.
     */
    static visibleGameBoxes(): number {
        return this.boxes.filter((box) => box.isRequired() && box.purchased !== false).length;
    }

    /**
     * Locks all boxes except the first one.
     */
    static resetLocks(): void {
        for (let i = 1; i < this.boxes.length; i++) {
            const box = this.boxes[i];
            if (!box) continue;

            if (box.isGameBox()) {
                box.islocked = true;
            }
        }

        UIRegistry.getBoxPanel()?.redraw();
    }

    /**
     * Unlocks boxes based on score and purchase state.
     */
    static updateBoxLocks(): void {
        let shouldRedraw = false;

        for (let i = 1; i < this.boxes.length; i++) {
            const box = this.boxes[i];
            if (!box) continue;

            if (!ScoreManager.isBoxLocked(i) && box.purchased && box.islocked) {
                box.islocked = false;
                shouldRedraw = true;
                ScoreManager.setStars(i, 0, 0, false);
            }
        }

        if (shouldRedraw) {
            UIRegistry.getBoxPanel()?.redraw();
        }
    }

    /**
     * Initializes event subscriptions for box-related updates.
     */
    static initializeEventSubscriptions(): void {
        PubSub.subscribe(PubSub.ChannelId.SelectedBoxChanged, (...args: unknown[]) => {
            const [boxIndex] = args;
            if (typeof boxIndex === "number") {
                this.currentBoxIndex = boxIndex;
                this.currentLevelIndex = 1;
            }
        });

        PubSub.subscribe(PubSub.ChannelId.SetPaidBoxes, (...args: unknown[]) => {
            const [paid] = args;
            if (typeof paid === "boolean") {
                this.isPaid = paid;
            }
        });

        const reloadChannels = [
            PubSub.ChannelId.SignIn,
            PubSub.ChannelId.SignOut,
            PubSub.ChannelId.RoamingDataChanged,
            PubSub.ChannelId.BoxesUnlocked,
        ];

        for (const channel of reloadChannels) {
            PubSub.subscribe(channel, () => this.loadBoxes());
        }
    }
}

// Auto-register event subscriptions
BoxManager.initializeEventSubscriptions();

export default BoxManager;
