/**
 * Represents a single delayed dispatch operation.
 */
class Dispatch {
    constructor(
        readonly object: object,
        readonly callback: (...args: unknown[]) => void,
        readonly param: unknown[] | null,
        public delay: number
    ) {}

    /**
     * Executes the stored callback with its parameters and context.
     */
    dispatch(): void {
        this.callback.apply(this.object, this.param ?? []);
    }
}

/**
 * Manages delayed function calls with a per-update countdown system.
 * Use `update(delta)` each frame/tick to process active dispatches.
 */
export class DelayedDispatcher {
    private readonly dispatchers: Dispatch[] = [];

    /**
     * Schedules a new delayed callback.
     * @param object - The `this` context for the callback.
     * @param callback - The function to call.
     * @param param - The arguments to pass to the callback.
     * @param delay - The delay time before execution.
     */
    callObject(
        object: object,
        callback: (...args: unknown[]) => void,
        param: unknown[] | null,
        delay: number
    ): void {
        const dp = new Dispatch(object, callback, param, delay);
        this.dispatchers.push(dp);
    }

    /**
     * Cancels all scheduled dispatches.
     */
    cancelAllDispatches(): void {
        this.dispatchers.length = 0;
    }

    /**
     * Cancels a specific scheduled dispatch based on its parameters.
     * @param object - The same context used when calling `callObject`.
     * @param callback - The callback to cancel.
     * @param param - The parameter used during registration.
     */
    cancelDispatch(
        object: object,
        callback: (...args: unknown[]) => void,
        param: unknown[] | null
    ): void {
        for (const [index, dp] of this.dispatchers.entries()) {
            if (dp.object === object && dp.callback === callback && dp.param === param) {
                this.dispatchers.splice(index, 1);
                return;
            }
        }
    }

    /**
     * Updates all active dispatches by subtracting delta time.
     * Executes and removes any whose delay reaches zero or below.
     * @param delta - The time increment (usually per frame).
     */
    update(delta: number): void {
        // Make a shallow copy since dispatchers may be modified during iteration
        const currentDps = this.dispatchers.slice();

        for (const dp of currentDps) {
            const dpIndex = this.dispatchers.indexOf(dp);

            // Skip if already removed
            if (dpIndex < 0) continue;

            dp.delay -= delta;
            if (dp.delay <= 0) {
                // Remove from main list before executing
                this.dispatchers.splice(dpIndex, 1);
                dp.dispatch();
            }
        }
    }
}

export default new DelayedDispatcher();
