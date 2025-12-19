import SettingStorage from "@/core/SettingStorage";
import SoundMgr from "@/game/CTRSoundMgr";
import ResourceId from "@/resources/ResourceId";
import panelManager from "@/ui/PanelManager";
import PanelId from "@/ui/PanelId";

type SkinMode = "candy" | "rope";

const TOTAL_CANDIES = 51;
const TOTAL_ROPES = 9;

const SETTING_KEYS = {
    CANDY: "selectedCandySkin",
    ROPE: "selectedRopeSkin",
} as const;

const padIndex = (index: number): string => String(index + 1).padStart(2, "0");

const getSavedCandyIndex = (): number => {
    return SettingStorage.getIntOrDefault(SETTING_KEYS.CANDY, 0) ?? 0;
};

const getSavedRopeIndex = (): number => {
    return SettingStorage.getIntOrDefault(SETTING_KEYS.ROPE, 0) ?? 0;
};

class SkinSelectionView {
    private mode: SkinMode = "candy";
    private tabsBuilt = false;
    private tabContainer: HTMLElement | null = null;
    private grid: HTMLElement | null = null;
    private backButton: HTMLElement | null = null;

    init(): void {
        this.tabContainer = document.getElementById("skinTabs");
        this.grid = document.getElementById("skinGrid");
        this.backButton = document.getElementById("skinBack");

        if (!this.tabContainer || !this.grid || !this.backButton) {
            return;
        }

        if (!this.tabsBuilt) {
            this.buildTabs();
            this.backButton.addEventListener("click", () => {
                SoundMgr.playSound(ResourceId.SND_TAP);
                panelManager.showPanel(PanelId.MENU);
            });
            this.tabsBuilt = true;
        }

        this.renderGrid();
        this.updateMenuCandySkin();
    }

    updateMenuCandySkin(): void {
        const selectedCandy = getSavedCandyIndex();
        const candyElement = document.getElementById("menuCandySkin");
        if (!candyElement) return;

        const candyClass = `candy_${padIndex(selectedCandy)}`;
        candyElement.className = `sprite ${candyClass}`;
    }

    private buildTabs(): void {
        if (!this.tabContainer) return;
        this.tabContainer.innerHTML = "";

        const candyTab = this.createTab("Candy", "candy");
        const ropeTab = this.createTab("Rope", "rope");

        this.tabContainer.append(candyTab, ropeTab);
        this.updateTabState();
    }

    private createTab(label: string, mode: SkinMode): HTMLDivElement {
        const tab = document.createElement("div");
        tab.className = "skin-tab ctrPointer";
        const text = document.createElement("span");
        text.textContent = label;

        tab.appendChild(text);

        tab.addEventListener("click", () => {
            if (this.mode === mode) return;
            SoundMgr.playSound(ResourceId.SND_TAP);
            this.mode = mode;
            this.updateTabState();
            this.renderGrid();
        });

        return tab;
    }

    private updateTabState(): void {
        if (!this.tabContainer) return;
        const tabs = Array.from(this.tabContainer.querySelectorAll<HTMLDivElement>(".skin-tab"));
        tabs.forEach((tab, index) => {
            const isCandy = index === 0;
            tab.classList.toggle("is-active", (this.mode === "candy") === isCandy);
        });
    }

    private renderGrid(): void {
        if (!this.grid) return;
        this.grid.innerHTML = "";

        const isCandyMode = this.mode === "candy";
        const totalItems = isCandyMode ? TOTAL_CANDIES : TOTAL_ROPES;
        const selectedIndex = isCandyMode ? getSavedCandyIndex() : getSavedRopeIndex();

        for (let i = 0; i < totalItems; i++) {
            const slot = this.createSlot(i, selectedIndex, isCandyMode);
            this.grid.appendChild(slot);
        }
    }

    private createSlot(index: number, selectedIndex: number, isCandyMode: boolean): HTMLDivElement {
        const equipped = index === selectedIndex;
        const slot = document.createElement("div");
        slot.className = `skin-slot ctrPointer ${equipped ? "equipped" : ""}`;
        slot.dataset.index = String(index);

        const bg = document.createElement("div");
        bg.className = `skin-slot-bg sprite ${equipped ? "button_equipped_idle" : "button_available_idle"}`;

        const icon = document.createElement("div");
        const candyClass = isCandyMode ? `candy_${padIndex(index)}` : `rope0${index + 1}`;
        icon.className = `skin-icon sprite ${candyClass}`;

        slot.appendChild(bg);
        slot.appendChild(icon);

        slot.addEventListener("click", () => {
            SoundMgr.playSound(ResourceId.SND_TAP);
            if (isCandyMode) {
                SettingStorage.set(SETTING_KEYS.CANDY, index);
                this.updateMenuCandySkin();
            } else {
                SettingStorage.set(SETTING_KEYS.ROPE, index);
            }
            this.renderGrid();
        });

        return slot;
    }
}

const skinSelectionView = new SkinSelectionView();

export { getSavedRopeIndex, getSavedCandyIndex };
export default skinSelectionView;
