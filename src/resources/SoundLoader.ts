import platform from "@/config/platforms/platform-web";
import edition from "@/config/editions/net-edition";
import resData from "@/resources/ResData";
import Sounds from "@/resources/Sounds";
import { getAudioContext } from "@/utils/audioContext";
import { soundRegistry } from "@/utils/soundRegistry";

const decodeAudioBuffer = (context: BaseAudioContext, arrayBuffer: ArrayBuffer) => {
    return new Promise<AudioBuffer>((resolve, reject) => {
        let decodePromise: Promise<AudioBuffer> | undefined;
        try {
            decodePromise = context.decodeAudioData(
                arrayBuffer,
                (buffer) => resolve(buffer),
                (error) => reject(error)
            );
        } catch (error) {
            reject(error);
            return;
        }
        if (decodePromise && typeof decodePromise.then === "function") {
            decodePromise.then(resolve).catch(reject);
        }
    });
};

type CompletionListener = () => void;
type ProgressListener = (completed: number, total: number) => void;

class SoundLoader {
    private readonly completeListeners: CompletionListener[] = [];

    private readonly progressListeners: ProgressListener[] = [];

    private startRequested = false;

    private soundManagerReady = false;

    private hasStartedLoading = false;

    private currentCompleted = 0;

    private currentFailed = 0;

    private currentTotal = 0;

    constructor() {
        Sounds.onReady(() => {
            this.soundManagerReady = true;
            void this.startIfReady();
        });
    }

    start(): void {
        this.startRequested = true;
        void this.startIfReady();
    }

    onMenuComplete(callback: CompletionListener): void {
        this.completeListeners.push(callback);
    }

    onProgress(callback: ProgressListener): void {
        this.progressListeners.push(callback);
        if (this.currentTotal > 0) {
            try {
                callback(this.currentCompleted, this.currentTotal);
            } catch (error) {
                window.console?.error?.("Sound progress listener failed", error);
            }
        }
    }

    getSoundCount(): number {
        return edition.menuSoundIds.length + edition.gameSoundIds.length;
    }

    private startIfReady = async (): Promise<void> => {
        if (!this.startRequested || !this.soundManagerReady || this.hasStartedLoading) {
            return;
        }

        this.hasStartedLoading = true;

        const baseUrl = platform.audioBaseUrl;
        const extension = platform.getAudioExtension();
        const context = getAudioContext();

        const soundIds = [
            ...edition.menuSoundIds.map((id) => ({ id, tag: "MENU" as const })),
            ...edition.gameSoundIds.map((id) => ({ id, tag: "GAME" as const })),
        ];

        this.currentTotal = soundIds.length;
        this.currentCompleted = 0;
        this.currentFailed = 0;

        const notifyProgress = () => {
            for (const listener of this.progressListeners) {
                try {
                    listener(this.currentCompleted, this.currentTotal);
                } catch (error) {
                    window.console?.error?.("Sound progress listener failed", error);
                }
            }
        };

        const notifyComplete = () => {
            for (const listener of this.completeListeners) {
                try {
                    listener();
                } catch (error) {
                    window.console?.error?.("Sound completion listener failed", error);
                }
            }
        };

        if (!context || this.currentTotal === 0) {
            this.currentCompleted = this.currentTotal;
            notifyProgress();
            notifyComplete();
            return;
        }

        const loadSound = async ({ id }: { id: number }): Promise<void> => {
            const resource = resData[id];
            if (!resource) {
                throw new Error(`Resource not found for sound ID: ${id}`);
            }

            const soundKey = `s${id}`;
            const soundUrl = baseUrl + resource.path + extension;

            const response = await fetch(soundUrl);
            if (!response.ok) {
                throw new Error(`Failed to load audio: ${response.status} ${response.statusText}`);
            }

            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await decodeAudioBuffer(context, arrayBuffer);

            const gainNode = context.createGain();
            gainNode.connect(context.destination);

            soundRegistry.set(soundKey, {
                buffer: audioBuffer,
                gainNode,
                playingSources: new Set<AudioBufferSourceNode>(),
                isPaused: false,
                volume: 1,
            });
        };

        await Promise.all(
            soundIds.map((desc) =>
                loadSound(desc)
                    .then(() => {
                        this.currentCompleted++;
                        notifyProgress();
                    })
                    .catch((error) => {
                        this.currentFailed++;
                        window.console?.error?.("Failed to load audio", desc.id, error);
                        notifyProgress();
                    })
            )
        );

        if (this.currentFailed > 0) {
            window.console?.warn?.(
                `Sound loading completed with ${this.currentFailed} failure(s) out of ${this.currentTotal} total`
            );
        }

        notifyComplete();
    };
}

export default new SoundLoader();
