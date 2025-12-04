import type {
    GameSystem,
    GameSystemContext,
    GameSystemSharedState,
    SystemResult,
    TargetSystemDependencies,
} from "./types";

const defaultDependencies: TargetSystemDependencies = {
    updateTargetState(service, delta) {
        return service.updateTargetState(delta);
    },
};

class TargetSystem implements GameSystem {
    readonly id = "target";

    private readonly context: GameSystemContext;
    private readonly dependencies: TargetSystemDependencies;

    constructor(
        context: GameSystemContext,
        dependencies: TargetSystemDependencies = defaultDependencies
    ) {
        this.context = context;
        this.dependencies = dependencies;
    }

    update(delta: number, _sharedState: GameSystemSharedState): SystemResult {
        const result = this.dependencies.updateTargetState(this.context.candy, delta);

        if (result.continue === false) {
            return { continue: false, reason: result.reason };
        }

        return { continue: true };
    }
}

export default TargetSystem;
