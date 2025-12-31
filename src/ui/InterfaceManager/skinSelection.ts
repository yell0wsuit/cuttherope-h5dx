import SettingStorage from "@/core/SettingStorage";
import SoundMgr from "@/game/CTRSoundMgr";
import ResourceId from "@/resources/ResourceId";
import panelManager from "@/ui/PanelManager";
import PanelId from "@/ui/PanelId";
import Text from "@/visual/Text";
import Lang from "@/resources/Lang";
import MenuStringId from "@/resources/MenuStringId";
import PubSub from "@/utils/PubSub";

type SkinMode = "candy" | "rope";

const TOTAL_CANDIES = 51;
const TOTAL_ROPES = 9;
const ITEMS_PER_PAGE = 12;

const SETTING_KEYS = {
    CANDY: "selectedCandySkin",
    ROPE: "selectedRopeSkin",
    CANDY_WAS_CHANGED: "candyWasChanged",
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
    private currentPage = 0;
    private tabsBuilt = false;
    private languageSubscribed = false;
    private tabContainer: HTMLElement | null = null;
    private grid: HTMLElement | null = null;
    private backButton: HTMLElement | null = null;
    private navBack: HTMLElement | null = null;
    private navForward: HTMLElement | null = null;

    init(): void {
        this.tabContainer = document.getElementById("skinTabs");
        this.grid = document.getElementById("skinGrid");
        this.backButton = document.getElementById("skinBack");
        this.navBack = document.getElementById("skinNavBack");
        this.navForward = document.getElementById("skinNavForward");

        if (
            !this.tabContainer ||
            !this.grid ||
            !this.backButton ||
            !this.navBack ||
            !this.navForward
        ) {
            return;
        }

        if (!this.tabsBuilt) {
            this.buildTabs();
            this.backButton.addEventListener("click", () => {
                SoundMgr.playSound(ResourceId.SND_TAP);
                panelManager.showPanel(PanelId.MENU);
            });

            this.navBack.addEventListener("click", () => {
                if (this.currentPage > 0) {
                    SoundMgr.playSound(ResourceId.SND_TAP);
                    this.currentPage--;
                    this.renderGrid();
                }
            });

            this.navForward.addEventListener("click", () => {
                const totalPages = this.getTotalPages();
                if (this.currentPage < totalPages - 1) {
                    SoundMgr.playSound(ResourceId.SND_TAP);
                    this.currentPage++;
                    this.renderGrid();
                }
            });

            this.tabsBuilt = true;
        }

        if (!this.languageSubscribed) {
            PubSub.subscribe(PubSub.ChannelId.LanguageChanged, () => {
                this.updateTabText();
            });
            this.languageSubscribed = true;
        }

        this.renderGrid();
        this.updateMenuCandySkin();
    }

    updateMenuCandySkin(): void {
        const selectedCandy = getSavedCandyIndex();
        const candyElement = document.getElementById("menuCandySkin");
        if (!candyElement) {
            return;
        }

        const candyClass = `candy_${padIndex(selectedCandy)}`;
        candyElement.className = `menu-sprite ${candyClass}`;

        // Show hand pointing animation if candy was never changed
        this.updateHandVisibility();
    }

    updateHandVisibility(): void {
        const handElement = document.getElementById("menuCandyHand");
        if (!handElement) {
            return;
        }

        const candyWasChanged = SettingStorage.getIntOrDefault(SETTING_KEYS.CANDY_WAS_CHANGED, 0);
        if (candyWasChanged === 0) {
            handElement.classList.add("show");
        } else {
            handElement.classList.remove("show");
        }
    }

    markCandyAsChanged(): void {
        SettingStorage.set(SETTING_KEYS.CANDY_WAS_CHANGED, 1);
        this.updateHandVisibility();
    }

    private buildTabs(): void {
        if (!this.tabContainer) {
            return;
        }
        this.tabContainer.innerHTML = "";

        const candyTab = this.createTab(MenuStringId.CANDIES_BTN, "candy");
        const ropeTab = this.createTab(MenuStringId.ROPE_SKINS_BTN, "rope");

        this.tabContainer.append(candyTab, ropeTab);
        this.updateTabState();
    }

    private updateTabText(): void {
        if (!this.tabContainer) {
            return;
        }
        const tabs = Array.from(this.tabContainer.querySelectorAll<HTMLDivElement>(".sBtn"));

        tabs.forEach((tab) => {
            const tabMode = tab.dataset.mode as SkinMode;
            const menuStringId =
                tabMode === "candy" ? MenuStringId.CANDIES_BTN : MenuStringId.ROPE_SKINS_BTN;

            // Replace the text image while preserving event listeners
            const oldTextImg = tab.firstChild;
            const newTextImg = Text.drawBig({
                text: Lang.menuText(menuStringId),
                scaleToUI: true,
            });

            if (oldTextImg) {
                tab.replaceChild(newTextImg, oldTextImg);
            } else {
                tab.appendChild(newTextImg);
            }
        });
    }

    private createTab(menuStringId: number, mode: SkinMode): HTMLDivElement {
        const tab = document.createElement("div");
        tab.className = "sBtn ctrPointer";
        tab.dataset.mode = mode;

        const textImg = Text.drawBig({
            text: Lang.menuText(menuStringId),
            scaleToUI: true,
        });

        tab.appendChild(textImg);

        tab.addEventListener("click", () => {
            if (this.mode === mode) {
                return;
            }
            SoundMgr.playSound(ResourceId.SND_TAP);
            this.mode = mode;
            this.currentPage = 0;
            this.updateTabState();
            this.renderGrid();
        });

        return tab;
    }

    private updateTabState(): void {
        if (!this.tabContainer) {
            return;
        }
        const tabs = Array.from(this.tabContainer.querySelectorAll<HTMLDivElement>(".sBtn"));
        tabs.forEach((tab) => {
            const tabMode = tab.dataset.mode as SkinMode;
            const isActive = this.mode === tabMode;
            tab.classList.toggle("active", isActive);
        });
    }

    private getTotalPages(): number {
        const isCandyMode = this.mode === "candy";
        const totalItems = isCandyMode ? TOTAL_CANDIES : TOTAL_ROPES;
        return Math.ceil(totalItems / ITEMS_PER_PAGE);
    }

    private updateNavButtons(): void {
        if (!this.navBack || !this.navForward) {
            return;
        }

        const totalPages = this.getTotalPages();

        if (this.currentPage === 0) {
            this.navBack.classList.add("disabled");
        } else {
            this.navBack.classList.remove("disabled");
        }

        if (this.currentPage >= totalPages - 1) {
            this.navForward.classList.add("disabled");
        } else {
            this.navForward.classList.remove("disabled");
        }
    }

    private renderGrid(): void {
        if (!this.grid) {
            return;
        }
        this.grid.innerHTML = "";

        const isCandyMode = this.mode === "candy";
        const totalItems = isCandyMode ? TOTAL_CANDIES : TOTAL_ROPES;
        const selectedIndex = isCandyMode ? getSavedCandyIndex() : getSavedRopeIndex();

        const startIndex = this.currentPage * ITEMS_PER_PAGE;
        const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, totalItems);

        for (let i = startIndex; i < endIndex; i++) {
            const slot = this.createSlot(i, selectedIndex, isCandyMode);
            this.grid.appendChild(slot);
        }

        this.updateNavButtons();
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
