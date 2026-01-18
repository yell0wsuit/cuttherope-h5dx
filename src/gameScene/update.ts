import GameSceneDrawDelegate from "./sceneUpdate/draw";
import GameSceneBubblesDelegate from "./sceneUpdate/bubbles";
import GameSceneTeleportDelegate from "./sceneUpdate/teleport";
import GameSceneLifecycleDelegate from "./sceneUpdate/lifecycle";
import GameSceneRopeManagementDelegate from "./sceneUpdate/ropeManagement";
import GameScenePumpUtilsDelegate from "./sceneUpdate/pumpUtils";
import GameSceneBounceUtilsDelegate from "./sceneUpdate/bounceUtils";
import GameSceneCutDelegate from "./sceneUpdate/cut";
import GameSceneSpiderHandlersDelegate from "./sceneUpdate/spiderHandlers";
import GameSceneSelectionDelegate from "./sceneUpdate/selection";
import GameObjectPluginManager from "./plugins/GameObjectPluginManager";
import { createCoreSystems } from "./systems/index.ts";
import GameSceneCharacter from "./character";
import GameScenePhysicsService from "./services/GameScenePhysicsService";
import GameSceneCandyService from "./services/GameSceneCandyService";
import GameSceneAnimationService from "./services/GameSceneAnimationService";
import type { GameSystem, GameSystemContext, GameSystemSharedState } from "./systems/types";
import type { GameObjectPlugin } from "./plugins/types";
import type { GameScene } from "@/types/game-scene";

interface GameSceneUpdateOptions {
    plugins?: GameObjectPlugin[];
    systems?: GameSystem[];
}

type DelegateMethod = (...args: unknown[]) => unknown;

function bindDelegate(scene: GameSceneUpdate, delegate: object, methods: readonly string[]): void {
    // Double assertion needed: dynamically adding delegate methods to scene (mixin pattern)
    const sceneAsRecord = scene as unknown as Record<string, unknown>;
    const delegateAsRecord = delegate as Record<string, DelegateMethod>;
    for (const method of methods) {
        const delegateMethod = delegateAsRecord[method];
        if (typeof delegateMethod === "function") {
            sceneAsRecord[method] = delegateMethod.bind(delegate);
        }
    }
}

class GameSceneUpdate extends GameSceneCharacter {
    private readonly drawDelegate: GameSceneDrawDelegate;
    private readonly bubblesDelegate: GameSceneBubblesDelegate;
    private readonly teleportDelegate: GameSceneTeleportDelegate;
    private readonly lifecycleDelegate: GameSceneLifecycleDelegate;
    private readonly ropeManagementDelegate: GameSceneRopeManagementDelegate;
    private readonly pumpUtilsDelegate: GameScenePumpUtilsDelegate;
    private readonly bounceUtilsDelegate: GameSceneBounceUtilsDelegate;
    private readonly cutDelegate: GameSceneCutDelegate;
    private readonly spiderHandlersDelegate: GameSceneSpiderHandlersDelegate;
    private readonly selectionDelegate: GameSceneSelectionDelegate;

    readonly physicsService: GameScenePhysicsService;
    readonly candyService: GameSceneCandyService;
    readonly animationService: GameSceneAnimationService;
    readonly pluginManager: GameObjectPluginManager;
    readonly systemContext: GameSystemContext;
    readonly systems: GameSystem[];

    constructor(options: GameSceneUpdateOptions = {}) {
        super();

        // Double assertion: GameSceneUpdate extends chain that becomes GameScene
        const sceneContext = this as unknown as GameScene;

        this.drawDelegate = new GameSceneDrawDelegate(sceneContext);
        bindDelegate(this, this.drawDelegate, ["draw"]);

        this.bubblesDelegate = new GameSceneBubblesDelegate(sceneContext);
        bindDelegate(this, this.bubblesDelegate, [
            "isBubbleCapture",
            "popCandyBubble",
            "popBubble",
            "handleBubbleTouch",
            "popLightBulbBubble",
            "handleLightBulbBubbleTouch",
        ]);

        this.teleportDelegate = new GameSceneTeleportDelegate(sceneContext);
        bindDelegate(this, this.teleportDelegate, ["teleport"]);

        this.lifecycleDelegate = new GameSceneLifecycleDelegate(sceneContext);
        bindDelegate(this, this.lifecycleDelegate, [
            "animateLevelRestart",
            "isFadingIn",
            "calculateScore",
            "gameWon",
            "gameLost",
        ]);

        this.ropeManagementDelegate = new GameSceneRopeManagementDelegate(sceneContext);
        bindDelegate(this, this.ropeManagementDelegate, [
            "releaseAllRopes",
            "attachCandy",
            "detachCandy",
        ]);

        this.pumpUtilsDelegate = new GameScenePumpUtilsDelegate(sceneContext);
        bindDelegate(this, this.pumpUtilsDelegate, ["handlePumpFlow", "operatePump"]);

        this.bounceUtilsDelegate = new GameSceneBounceUtilsDelegate(sceneContext);
        bindDelegate(this, this.bounceUtilsDelegate, ["handleBounce"]);

        this.cutDelegate = new GameSceneCutDelegate(sceneContext);
        bindDelegate(this, this.cutDelegate, ["cut"]);

        this.spiderHandlersDelegate = new GameSceneSpiderHandlersDelegate(sceneContext);
        bindDelegate(this, this.spiderHandlersDelegate, ["spiderBusted", "spiderWon"]);

        this.selectionDelegate = new GameSceneSelectionDelegate(sceneContext);
        bindDelegate(this, this.selectionDelegate, [
            "resetBungeeHighlight",
            "getNearestBungeeGrabByBezierPoints",
            "getNearestBungeeSegmentByConstraints",
        ]);

        const { plugins = [], systems } = options;

        this.physicsService = new GameScenePhysicsService(sceneContext);
        this.candyService = new GameSceneCandyService(sceneContext);
        this.animationService = new GameSceneAnimationService(sceneContext);

        // Circular dependency: systemContext needs pluginManager, but pluginManager needs systemContext
        // Initialize with null!, then assign after pluginManager is created
        const systemContext: GameSystemContext = {
            physics: this.physicsService,
            candy: this.candyService,
            animation: this.animationService,
            pluginManager: null!,
        };

        this.pluginManager = new GameObjectPluginManager(systemContext);
        systemContext.pluginManager = this.pluginManager;

        this.systemContext = systemContext;
        this.systems = systems ? [...systems] : createCoreSystems(this.systemContext);

        for (const plugin of plugins) {
            this.registerPlugin(plugin);
        }
    }

    registerPlugin(plugin: GameObjectPlugin): void {
        const newSystems = this.pluginManager.register(plugin);
        if (newSystems.length > 0) {
            this.systems.push(...newSystems);
        }
    }

    override update(delta: number): void {
        const sharedState: GameSystemSharedState = {};

        this.pluginManager.beforeUpdate(delta, sharedState);

        for (const system of this.systems) {
            const result = system.update(delta, sharedState);
            this.pluginManager.afterSystem(system, result.continue, delta, sharedState);

            if (!result.continue) {
                if (import.meta.env.DEV) {
                    console.log(`[GameScene] System "${system.id}" halted: ${result.reason}`);
                }
                break;
            }
        }

        this.pluginManager.afterUpdate(delta, sharedState);
    }
}

export default GameSceneUpdate;
