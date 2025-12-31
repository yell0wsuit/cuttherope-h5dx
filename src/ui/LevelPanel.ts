import PanelId from "@/ui/PanelId";
import Panel from "@/ui/Panel";
import resolution from "@/resolution";
import ScoreManager from "@/ui/ScoreManager";
import BoxManager from "@/ui/BoxManager";
import PubSub from "@/utils/PubSub";
import SoundMgr from "@/game/CTRSoundMgr";
import ResourceId from "@/resources/ResourceId";
import Text from "@/visual/Text";
import edition from "@/config/editions/net-edition";
import {
    getElement,
    addClass,
    removeClass,
    show,
    hide,
    empty,
    append,
    fadeIn,
    fadeOut,
    delay,
} from "@/utils/domHelpers";
import type InterfaceManager from "@/ui/InterfaceManagerClass";

const backgroundId =
    (edition as { levelBackgroundId?: string | null }).levelBackgroundId ?? "levelBackground";
const MAX_LEVELS_PER_PAGE = 25;

const calculateTotalPages = (totalLevels: number): number => {
    if (totalLevels <= MAX_LEVELS_PER_PAGE) {
        return 1;
    }

    const standardPages = Math.ceil(totalLevels / MAX_LEVELS_PER_PAGE);
    const remainder = totalLevels % MAX_LEVELS_PER_PAGE;

    if (remainder > 0 && remainder < 10) {
        return 2;
    }

    return standardPages;
};

const getLevelsPerPage = (totalLevels: number, pageIndex = 0): number => {
    if (totalLevels <= MAX_LEVELS_PER_PAGE) {
        return totalLevels;
    }

    const remainder = totalLevels % MAX_LEVELS_PER_PAGE;

    if (remainder > 0 && remainder < 10) {
        if (pageIndex === 0) {
            const halfSplit = Math.ceil(totalLevels / 2);

            if (halfSplit > 12 && totalLevels - halfSplit > 12) {
                return halfSplit;
            }

            const page1Count = Math.floor((totalLevels - remainder) / 5) * 5;
            if (page1Count >= 15 && page1Count <= MAX_LEVELS_PER_PAGE) {
                return page1Count;
            }

            return MAX_LEVELS_PER_PAGE - remainder;
        }

        const page0Count = getLevelsPerPage(totalLevels, 0);
        return totalLevels - page0Count;
    }

    return MAX_LEVELS_PER_PAGE;
};

interface LayoutConfig {
    columns: number;
    leftOffset: number;
    topOffset: number;
    inc: number;
}

const getLayoutConfig = (count: number): LayoutConfig => {
    if (count > 12) {
        return {
            columns: 5,
            leftOffset: -30,
            topOffset: -40,
            inc: resolution.uiScaledNumber(101),
        };
    }

    if (count > 9) {
        return {
            columns: 4,
            leftOffset: -80,
            topOffset: 10,
            inc: resolution.uiScaledNumber(153),
        };
    }

    return {
        columns: 3,
        leftOffset: 0,
        topOffset: 0,
        inc: resolution.uiScaledNumber(153),
    };
};

const positionLevelButton = (
    levelElement: HTMLDivElement,
    index: number,
    visibleCount: number,
    layout: LayoutConfig
): void => {
    const { columns, leftOffset, topOffset, inc } = layout;
    const row = Math.floor(index / columns);
    const column = index % columns;
    const lastRowCount = visibleCount % columns || columns;
    const isLastRow = row === Math.floor((visibleCount - 1) / columns);
    const rowOffset = isLastRow ? ((columns - lastRowCount) * inc) / 2 : 0;

    const totalRows = Math.ceil(visibleCount / columns);
    const totalHeight = totalRows * inc;
    const fullHeight = 5 * inc;
    const verticalOffset = (fullHeight - totalHeight) / 2;

    levelElement.style.left = `${leftOffset + column * inc + rowOffset}px`;
    levelElement.style.top = `${topOffset + row * inc + verticalOffset}px`;

    levelElement.classList.toggle("option-small", columns === 5);
};

class LevelPanel extends Panel {
    private im: InterfaceManager | null = null;
    private currentPage = 0;
    private lastBoxIndex: number | null = null;
    private levelNavBack: HTMLElement | null = null;
    private levelNavForward: HTMLElement | null = null;
    private readonly levelButtons: HTMLDivElement[] = [];
    private isLevelNavigationActive = true;
    private lastTotalPages = 0;

    private readonly onLevelClick = (event: MouseEvent): void => {
        const target = event.currentTarget as HTMLElement | null;
        if (!target) {
            return;
        }

        const levelIndex = parseInt(target.dataset.level ?? "0", 10);
        if (ScoreManager.isLevelUnlocked(BoxManager.currentBoxIndex, levelIndex)) {
            SoundMgr.selectRandomGameMusic();
            this.im?.gameFlow.openLevel(levelIndex + 1, false, false);
        } else {
            return;
        }

        SoundMgr.playSound(ResourceId.SND_TAP);
    };

    constructor() {
        super(PanelId.LEVELS, "levelPanel", backgroundId, true);

        PubSub.subscribe(PubSub.ChannelId.UpdateVisibleBoxes, () => {
            this.updateLevelOptions();
        });
    }

    init(interfaceManager: InterfaceManager): void {
        this.im = interfaceManager;

        const levelOptions = getElement("#levelOptions");
        this.levelNavBack = getElement("#levelNavBack") as HTMLElement | null;
        this.levelNavForward = getElement("#levelNavForward") as HTMLElement | null;

        if (!this.isLevelNavigationActive) {
            if (this.levelNavBack) {
                hide(this.levelNavBack);
            }
            if (this.levelNavForward) {
                hide(this.levelNavForward);
            }
        }

        this.levelNavBack?.addEventListener("click", () => {
            if (this.currentPage === 0) {
                return;
            }
            this.currentPage -= 1;
            SoundMgr.playSound(ResourceId.SND_TAP);
            this.updateLevelOptions();
        });

        this.levelNavForward?.addEventListener("click", () => {
            const boxIndex = BoxManager.currentBoxIndex;
            const levelCount = ScoreManager.levelCount(boxIndex) ?? 0;
            const totalPages = calculateTotalPages(levelCount);
            if (this.currentPage >= totalPages - 1) {
                return;
            }
            this.currentPage += 1;
            SoundMgr.playSound(ResourceId.SND_TAP);
            this.updateLevelOptions();
        });

        if (levelOptions instanceof HTMLElement) {
            for (let i = 0; i < MAX_LEVELS_PER_PAGE; i++) {
                const levelButton = document.createElement("div");
                levelButton.dataset.level = i.toString();
                levelButton.className = "option locked ctrPointer";
                levelButton.addEventListener("click", this.onLevelClick);
                levelOptions.appendChild(levelButton);
                this.levelButtons.push(levelButton);
            }
        }
    }

    setNavigationActive(isActive: boolean): void {
        this.isLevelNavigationActive = isActive;

        if (!this.levelNavBack || !this.levelNavForward) {
            return;
        }

        if (!isActive) {
            hide(this.levelNavBack);
            hide(this.levelNavForward);
            return;
        }

        this.updateLevelNavigation(this.lastTotalPages);
    }

    onShow(): void {
        this.setNavigationActive(false);
        this.updateLevelOptions();
        const levelScore = getElement("#levelScore");
        const levelBack = getElement("#levelBack");
        const levelOptions = getElement("#levelOptions");
        const levelResults = getElement("#levelResults");

        if (levelScore instanceof HTMLElement) {
            delay(levelScore, 200).then(() => {
                return fadeIn(levelScore, 700);
            });
        }
        if (levelBack instanceof HTMLElement) {
            delay(levelBack, 200).then(() => {
                return fadeIn(levelBack, 700);
            });
        }
        if (levelOptions instanceof HTMLElement) {
            delay(levelOptions, 200)
                .then(() => {
                    return fadeIn(levelOptions, 700);
                })
                .then(() => {
                    this.setNavigationActive(true);
                });

            this.setNavigationActive(true);
            if (this.lastTotalPages > 1 && this.levelNavBack && this.levelNavForward) {
                show(this.levelNavBack);
                show(this.levelNavForward);
                this.levelNavBack.style.opacity = "1";
                this.levelNavForward.style.opacity = "1";
            }
        } else {
            this.setNavigationActive(true);
        }
        if (levelResults instanceof HTMLElement) {
            delay(levelResults, 200).then(() => {
                return fadeOut(levelResults, 700);
            });
        }
    }

    private updateLevelOptions(): void {
        const boxIndex = BoxManager.currentBoxIndex;
        const levelCount = ScoreManager.levelCount(boxIndex) ?? 0;

        if (this.lastBoxIndex !== boxIndex) {
            this.currentPage = 0;
            this.lastBoxIndex = boxIndex;
        }

        const totalPages = calculateTotalPages(levelCount);
        if (this.currentPage >= totalPages) {
            this.currentPage = totalPages - 1;
        }

        let startIndex = 0;
        for (let page = 0; page < this.currentPage; page++) {
            startIndex += getLevelsPerPage(levelCount, page);
        }

        const levelsThisPage = getLevelsPerPage(levelCount, this.currentPage);
        const visibleCount = Math.min(levelsThisPage, Math.max(0, levelCount - startIndex));

        this.updateLevelNavigation(totalPages);

        const layout = getLayoutConfig(visibleCount);

        for (let i = 0; i < this.levelButtons.length; i++) {
            const levelElement = this.levelButtons[i];
            if (!levelElement) {
                continue;
            }
            const levelIndex = startIndex + i;
            if (i < visibleCount && levelIndex < levelCount) {
                positionLevelButton(levelElement, i, visibleCount, layout);
                levelElement.dataset.level = levelIndex.toString();
                show(levelElement);

                const stars = ScoreManager.getStars(boxIndex, levelIndex);
                if (stars != null) {
                    const levelInfo = document.createElement("div");
                    levelInfo.className = "txt";
                    append(
                        levelInfo,
                        Text.drawBig({ text: String(levelIndex + 1), scaleToUI: true })
                    );
                    const starsElement = document.createElement("div");
                    addClass(starsElement, `stars${stars}`);
                    levelInfo.appendChild(starsElement);

                    removeClass(levelElement, "locked");
                    removeClass(levelElement, "purchase");
                    addClass(levelElement, "open");
                    addClass(levelElement, "ctrPointer");
                    empty(levelElement);
                    levelElement.appendChild(levelInfo);
                } else {
                    removeClass(levelElement, "open");
                    addClass(levelElement, "locked");
                    empty(levelElement);
                }
            } else {
                hide(levelElement);
            }
        }

        const achievedStars = ScoreManager.achievedStars(BoxManager.currentBoxIndex) ?? 0;
        const totalStars = (ScoreManager.levelCount(BoxManager.currentBoxIndex) ?? 0) * 3;
        const text = `${achievedStars}/${totalStars}`;
        Text.drawBig({ text, imgSel: "#levelScore img", scaleToUI: true });
        BoxManager.updateBoxLocks();
        ScoreManager.updateTotalScoreText();
    }

    private updateLevelNavigation(totalPages: number): void {
        if (!this.levelNavBack || !this.levelNavForward) {
            return;
        }

        this.lastTotalPages = totalPages;

        if (!this.isLevelNavigationActive || totalPages <= 1) {
            hide(this.levelNavBack);
            hide(this.levelNavForward);
            return;
        }

        show(this.levelNavBack);
        show(this.levelNavForward);

        const backDiv = this.levelNavBack.firstElementChild;
        const forwardDiv = this.levelNavForward.firstElementChild;

        if (backDiv instanceof HTMLElement) {
            if (this.currentPage === 0) {
                addClass(backDiv, "boxNavDisabled");
            } else {
                removeClass(backDiv, "boxNavDisabled");
            }
        }

        if (forwardDiv instanceof HTMLElement) {
            if (this.currentPage >= totalPages - 1) {
                addClass(forwardDiv, "boxNavDisabled");
            } else {
                removeClass(forwardDiv, "boxNavDisabled");
            }
        }
    }
}

export default new LevelPanel();
