/**
 * PubSub system for managing event-based communication between modules.
 * Provides subscribe, unsubscribe, and publish methods.
 */
export enum ChannelId {
    LevelWon,
    LevelLost,
    OmNomClicked,
    DrawingClicked,
    StarCountChanged,
    ControllerActivated,
    ControllerDeactivateRequested,
    ControllerDeactivated,
    ControllerPaused,
    ControllerUnpaused,
    ControllerViewHidden,
    ControllerViewShow,
    LanguageChanged,
    LanguageFontLoaded,
    ShowOptionsPage,
    LoadIntroVideo,
    Share,
    ShowOptions,
    EnableGame,
    DisableGame,
    SetPaidBoxes,
    AppInit,
    AppDomReady,
    AppRun,
    PurchaseBoxesPrompt,
    PauseGame,
    AchievementManager,
    UpdateBoxScore,
    SignIn,
    SignOut,
    UpdateCandyScroller,
    UpdateVisibleBoxes,
    SelectedBoxChanged,
    UserIdChanged,
    RoamingSettingProvider,
    RoamingDataChanged,
    BoxesUnlocked,
    PreloaderProgress,
}

type SubscriptionCallback = (this: PubSub, ...args: unknown[]) => void;

type SubscriptionHandle = Readonly<{
    name: ChannelId;
    callback: SubscriptionCallback;
}>;

type Subscription = SubscriptionHandle | readonly [ChannelId, SubscriptionCallback];

class PubSub {
    /**
     * Store subscriptions grouped by channel so we do not need to iterate the
     * entire subscription list for every publish or unsubscribe call.
     * The value is an array rather than a Set to preserve call ordering for
     * listeners that were registered multiple times.
     */
    private readonly subscriptions = new Map<ChannelId, SubscriptionCallback[]>();

    /**
     * Enumeration of well-known channel identifiers.
     * Exposed on the instance to maintain the legacy API surface.
     */
    readonly ChannelId = ChannelId;

    /**
     * Subscribe to a channel and receive a handle that should be passed to
     * {@link PubSub#unsubscribe} when the listener is no longer needed.
     *
     * @param name Channel identifier.
     * @param callback Listener that will receive all published values.
     * @returns Subscription handle.
     */
    subscribe(name: ChannelId, callback: SubscriptionCallback): SubscriptionHandle {
        if (typeof callback !== "function") {
            throw new TypeError("PubSub.subscribe requires a callback function");
        }

        const handle: SubscriptionHandle = Object.freeze({ name, callback });
        const callbacks = this.subscriptions.get(name);
        if (callbacks) {
            callbacks.push(callback);
        } else {
            this.subscriptions.set(name, [callback]);
        }
        return handle;
    }

    /**
     * Remove a previously registered subscription.
     * Both the handle returned from {@link PubSub#subscribe} and the legacy tuple
     * form `[name, callback]` are supported.
     */
    unsubscribe(subscription: Subscription | null | undefined): void {
        if (!subscription) {
            return;
        }

        const record = Array.isArray(subscription)
            ? { name: subscription[0], callback: subscription[1] }
            : subscription;

        const name = (record as SubscriptionHandle).name ?? undefined;
        const callback = (record as SubscriptionHandle).callback ?? undefined;

        if (typeof name !== "number" || typeof callback !== "function") {
            return;
        }

        const channelId = name as ChannelId;
        const callbacks = this.subscriptions.get(channelId);
        if (!callbacks) {
            return;
        }

        for (let i = callbacks.length - 1; i >= 0; i--) {
            if (callbacks[i] === callback) {
                callbacks.splice(i, 1);
                if (callbacks.length === 0) {
                    this.subscriptions.delete(channelId);
                }
                break;
            }
        }
    }

    /**
     * Publish an event to a channel with any number of arguments.
     *
     * @param name Channel identifier.
     * @param args Arguments to pass to listeners.
     */
    publish(name: ChannelId, ...args: unknown[]): void {
        const callbacks = this.subscriptions.get(name);
        if (!callbacks || callbacks.length === 0) {
            return;
        }

        // Create a shallow copy so callbacks can safely modify subscriptions.
        const listeners = callbacks.slice();
        for (const listener of listeners) {
            listener.apply(this, args);
        }
    }

    /**
     * Clear all subscriptions for all channels.
     */
    clearAll(): void {
        this.subscriptions.clear();
    }

    /**
     * Retrieve all current subscriptions (for debugging/testing).
     */
    getAll(): Map<ChannelId, SubscriptionCallback[]> {
        return this.subscriptions;
    }
}

// Create a singleton instance
const pubSub = new PubSub();

export type { SubscriptionCallback, SubscriptionHandle, Subscription };
export default pubSub;
