import edition from "@/config/editions/net-edition";
import resolution from "@/resolution";
import QueryStrings from "@/ui/QueryStrings";
import PanelId from "@/ui/PanelId";
import panelManager from "@/ui/PanelManager";
import BoxManager from "@/ui/BoxManager";
import ScoreManager from "@/ui/ScoreManager";
import GameBorder from "@/ui/GameBorder";
import SoundMgr from "@/game/CTRSoundMgr";
import VideoManager from "@/ui/VideoManager";
import RootController from "@/game/CTRRootController";
import Doors from "@/Doors";
import PubSub from "@/utils/PubSub";
import EasterEggManager from "@/ui/EasterEggManager";
import settings from "@/game/CTRSettings";
import SnowfallOverlay from "@/ui/SnowfallOverlay";
import { IS_XMAS } from "@/utils/SpecialEvents";
import { MENU_MUSIC_ID, startSnow, stopSnow } from "@/ui/InterfaceManager/constants";
import { fadeIn, fadeOut, delay, show, hide, text, width } from "@/utils/domHelpers";
import LevelPanel from "@/ui/LevelPanel";
import type InterfaceManager from "@/ui/InterfaceManagerClass";

const levelResults = document.getElementById("levelResults");
const levelMenu = document.getElementById("levelMenu");

export interface LevelWonInfo {
    stars: number;
    time: number;
    score: number;
    fps?: number;
}

/**
 * Base class for game flow management
 */
export default class GameFlow {
    private readonly manager: InterfaceManager;

    constructor(manager: InterfaceManager) {
        this.manager = manager;
    }

    /**
     * Sets the isTransitionActive flag to true and then back to false after the timeout.
     * @param timeout - Timeout in milliseconds
     * @param _reason - Optional descriptor for logging/debugging
     */
    _notifyBeginTransition(timeout: number, _reason?: string): void {
        const manager = this.manager;
        manager.isTransitionActive = true;
        if (manager._transitionTimeout != null) {
            clearTimeout(manager._transitionTimeout);
        }
        manager._transitionTimeout = window.setTimeout(() => {
            manager.isTransitionActive = false;
            manager._transitionTimeout = null;
        }, timeout);
    }

    /** Runs the score ticker animation */
    private _runScoreTicker(): void {
        const manager = this.manager;
        text("#resultScore", manager._resultBottomLines[manager._currentResultLine] ?? "");
        manager._currentResultLine++;
        if (manager._currentResultLine < manager._resultTopLines.length) {
            const delayMs = manager._currentResultLine < manager._resultTimeShiftIndex ? 10 : 167;
            window.setTimeout(() => this._runScoreTicker(), delayMs);
        }
    }

    /**
     * Checks if the current level is the last level
     * @returns True if this is the last level
     */
    private _isLastLevel(): boolean {
        // see if we are on the last box
        const lastPlayableBoxIndex = BoxManager.requiredCount() - 1;
        if (BoxManager.currentBoxIndex !== lastPlayableBoxIndex) {
            return false;
        }

        // on the last level?
        const numLevels = ScoreManager.levelCount(BoxManager.currentBoxIndex);

        // unfortunately the currentLevelIndex is not zero-based
        if (BoxManager.currentLevelIndex !== numLevels) {
            return false;
        }

        return BoxManager.currentLevelIndex === numLevels;
    }

    /**
     * Opens a level
     * @param level - Level index
     * @param isRestart - Whether this is a restart
     * @param isSkip - Whether this is skipping a level
     */
    _openLevel(level: number, isRestart?: boolean, isSkip?: boolean): void {
        GameBorder.fadeIn(650, 100);
        BoxManager.currentLevelIndex = level;

        // when we start the last level we should begin loading the outro video
        if (this._isLastLevel()) {
            VideoManager.loadOutroVideo();
        }

        if (isRestart) {
            RootController.restartLevel();
        } else {
            panelManager.showPanel(PanelId.GAME, true);
            window.setTimeout(() => {
                this.openBox(Boolean(isSkip));
            }, 200);
        }
    }

    /**
     * Alias for _openLevel to maintain public API
     * @param level
     * @param isRestart
     * @param isSkip
     */
    openLevel(level: number, isRestart?: boolean, isSkip?: boolean): void {
        this._openLevel(level, isRestart, isSkip);
    }

    /** Closes the current level */
    _closeLevel(): void {
        RootController.stopLevel();
    }

    /** Completes the current box and advances */
    _completeBox(): void {
        //attempt to move to the next box
        const boxIndex = BoxManager.currentBoxIndex;

        // check for game complete
        const requiredIndex = BoxManager.requiredCount() - 1;
        const isGameComplete = boxIndex >= requiredIndex;

        if (isGameComplete) {
            GameBorder.hide();
            VideoManager.playOutroVideo();
        } else {
            this.manager.isInAdvanceBoxMode = true;
            const targetPanelId = edition.disableBoxMenu ? PanelId.MENU : PanelId.BOXES;
            panelManager.showPanel(targetPanelId, false);
        }
    }

    /** Opens the level menu (pause menu) */
    _openLevelMenu(): void {
        RootController.pauseLevel();
        SoundMgr.pauseMusic();
        show("#levelMenu");
    }

    /** Closes the level menu */
    _closeLevelMenu(): void {
        hide("#levelMenu");
        if (
            panelManager.currentPanelId === PanelId.GAME &&
            this.manager.gameEnabled &&
            RootController.isLevelActive()
        ) {
            SoundMgr.resumeMusic();
        }
    }

    /** Shows the level background */
    private _showLevelBackground(): void {
        show("#levelBackground");
    }

    /** Hides the level background */
    private _hideLevelBackground(): void {
        hide("#levelBackground");
    }

    /** Tapes the box closed */
    tapeBox(): void {
        const manager = this.manager;
        if (manager.isInMenuSelectMode) {
            GameBorder.fadeOut(800, 400);
            SoundMgr.playMusic(MENU_MUSIC_ID);
        }

        Doors.closeBoxAnimation(() => {
            manager.isBoxOpen = false;
            if (manager.isInMenuSelectMode) {
                panelManager.showPanel(PanelId.MENU, false);
            } else {
                Doors.renderDoors(true, 0);
                panelManager.showPanel(PanelId.LEVELS, true);
            }
            startSnow();
        });
    }

    /** Shows the game UI */
    showGameUI(): void {
        this._hideLevelBackground();
        if (QueryStrings.showBoxBackgrounds && edition.enableBoxBackgroundEasterEgg) {
            show("#bg");
        }
        fadeIn("#gameBtnTray");
        startSnow();
    }

    /** Closes the game UI */
    closeGameUI(): void {
        stopSnow();
        Doors.renderDoors(false, 1);
        this._notifyBeginTransition(1000);
        this._showLevelBackground();
        if (QueryStrings.showBoxBackgrounds && edition.enableBoxBackgroundEasterEgg) {
            hide("#bg");
        }
        fadeOut("#gameBtnTray");
    }

    /**
     * Opens the box
     * @param skip - Whether to skip intro
     */
    openBox(skip = false): void {
        stopSnow();
        const timeout = panelManager.currentPanelId === PanelId.LEVELS ? 400 : 0;

        //fade out options elements
        fadeOut("#levelScore");
        fadeOut("#levelBack");
        LevelPanel.setNavigationActive(false);
        fadeOut("#levelNavBack");
        fadeOut("#levelNavForward");

        fadeOut("#levelOptions", timeout).then(() => {
            if (this.manager.isBoxOpen) {
                fadeOut("#levelResults", 800);
                // When skipping, hide the game button tray during transition
                if (skip) {
                    fadeOut("#gameBtnTray");
                }
                window.setTimeout(() => {
                    RootController.startLevel(
                        BoxManager.currentBoxIndex + 1,
                        BoxManager.currentLevelIndex
                    );
                    Doors.openDoors(false, () => {
                        this.showGameUI();
                    });
                }, 400);
            } else {
                Doors.openBoxAnimation(() => {
                    this.manager.isBoxOpen = true;
                    RootController.startLevel(
                        BoxManager.currentBoxIndex + 1,
                        BoxManager.currentLevelIndex
                    );
                    Doors.openDoors(true, () => {
                        this.showGameUI();
                    });
                });
            }
        });
    }

    /** Closes the box */
    closeBox(): void {
        stopSnow();
        this.closeGameUI();

        window.setTimeout(() => {
            // animating from game to results
            if (!this.manager.isInLevelSelectMode) {
                if (levelResults) {
                    delay(levelResults, 750).then(() => fadeIn(levelResults, 250));
                }
            }

            Doors.closeDoors(false, () => {
                if (this.manager.isInLevelSelectMode) {
                    this.tapeBox();
                } else {
                    //Doors.showGradient();
                    window.setTimeout(() => {
                        this._runScoreTicker();
                        startSnow();
                    }, 250);
                }
            });
        }, 250);
    }

    /** Updates the dev link visibility based on window size */
    updateDevLink(): void {
        const manager = this.manager;
        if (width(window) < resolution.uiScaledNumber(1024) + 120 && manager._isDevLinkVisible) {
            fadeOut("#moreLink").then(() => {
                manager._isDevLinkVisible = false;
            });
            fadeOut("#zenbox_tab");
        } else if (
            width(window) > resolution.uiScaledNumber(1024) + 120 &&
            !manager._isDevLinkVisible
        ) {
            fadeIn("#moreLink").then(() => {
                manager._isDevLinkVisible = true;
            });
            fadeIn("#zenbox_tab");
        }
    }

    /** Pauses the game */
    pauseGame(): void {
        // make sure the game is active and no transitions are pending
        if (
            panelManager.currentPanelId === PanelId.GAME &&
            RootController.isLevelActive() &&
            !this.manager.isTransitionActive
        ) {
            this._openLevelMenu();
        } else {
            SoundMgr.pauseMusic();
        }
    }

    /** Resumes the game */
    resumeGame(): void {
        const isLevelMenuVisible = levelMenu && levelMenu.style.display !== "none";
        if (
            !isLevelMenuVisible &&
            panelManager.currentPanelId !== PanelId.GAMEMENU &&
            this.manager.gameEnabled
        ) {
            SoundMgr.resumeMusic();
        }
    }

    /** Called when DOM is ready */
    domReady(): void {
        VideoManager.domReady();
        EasterEggManager.domReady();
        panelManager.domReady();
        GameBorder.domReady();
        SnowfallOverlay.domReady();

        const onVisibilityChange = () => {
            if (document.hidden || document.visibilityState === "hidden") {
                this.pauseGame();
            } else {
                this.resumeGame();
            }
        };
        document.addEventListener("visibilitychange", onVisibilityChange);

        // hide behind the scenes when we update the page
        window.addEventListener("resize", () => {
            this.updateDevLink();
        });
    }

    /** Called when app is ready */
    appReady(): void {
        PubSub.subscribe(PubSub.ChannelId.LevelWon, (...args) => {
            const [info] = args as [LevelWonInfo];
            if (info) {
                this.manager.results.onLevelWon(info);
            }
        });

        // Load scores now that JSON data is available
        ScoreManager.load();

        Doors.appReady();
        EasterEggManager.appReady();
        panelManager.appReady((panelId) => {
            this.manager.panels.onInitializePanel(panelId);
        });
        BoxManager.appReady();
        if (IS_XMAS) {
            startSnow();
        } else {
            SnowfallOverlay.stop();
        }

        // initialize all the localized resources
        PubSub.publish(PubSub.ChannelId.LanguageChanged);

        // start a specific level?
        if (QueryStrings.box != null && QueryStrings.level != null) {
            this.noMenuStartLevel(QueryStrings.box - 1, QueryStrings.level - 1);
        } else if (settings.showMenu) {
            panelManager.showPanel(PanelId.MENU, true);
        }

        PubSub.subscribe(PubSub.ChannelId.PauseGame, () => {
            this.pauseGame();
        });
        PubSub.subscribe(PubSub.ChannelId.EnableGame, () => {
            this.manager.gameEnabled = true;
            this.resumeGame();
        });
        PubSub.subscribe(PubSub.ChannelId.DisableGame, () => {
            this.manager.gameEnabled = false;
            this.pauseGame();
        });
    }

    /**
     * Used for debug and in level editor to start a level w/o menus
     * @param boxIndex - Box index (zero-based)
     * @param levelIndex - Level index (zero-based)
     */
    noMenuStartLevel(boxIndex: number, levelIndex: number): void {
        panelManager.showPanel(PanelId.GAME, true);

        // unfortunate that box manager is zero index for box and 1 based for level
        BoxManager.currentBoxIndex = boxIndex;
        BoxManager.currentLevelIndex = levelIndex + 1;

        SoundMgr.selectRandomGameMusic();
        this.openBox();
    }

    /**
     * Opens the level menu for a specific box
     * @param boxIndex - Box index
     */
    openLevelMenu(boxIndex: number): void {
        this.manager.isBoxOpen = false;
        Doors.renderDoors(true, 0);
        panelManager.showPanel(PanelId.LEVELS);
        GameBorder.setBoxBorder(boxIndex);
    }
}

export type { LevelWonInfo as GameFlowLevelWonInfo };
