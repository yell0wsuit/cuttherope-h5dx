import settings from "@/game/CTRSettings";
import Sounds from "@/resources/Sounds";
import ResourceId from "@/resources/ResourceId";
import { IS_XMAS } from "@/utils/SpecialEvents";

class SoundManager {
    audioPaused: boolean;
    soundEnabled: boolean | null;
    musicEnabled: boolean | null;
    musicId: number | null;
    musicResumeOffset: number;
    gameMusicLibrary: number[];
    currentGameMusicId: number | null;
    loopingSounds: Map<
        string,
        {
            active: boolean;
            soundId: number;
            timeoutId: ReturnType<typeof setTimeout> | null;
            loopFn: () => void;
        }
    >;

    constructor() {
        this.audioPaused = false;
        this.soundEnabled = settings.getSoundEnabled();
        this.musicEnabled = settings.getMusicEnabled();
        this.musicId = null;
        this.musicResumeOffset = 0;
        this.gameMusicLibrary = IS_XMAS
            ? [ResourceId.SND_GAME_MUSIC_XMAS]
            : [
                  ResourceId.SND_GAME_MUSIC,
                  ResourceId.SND_GAME_MUSIC2,
                  ResourceId.SND_GAME_MUSIC3,
                  ResourceId.SND_GAME_MUSIC4,
              ];

        this.currentGameMusicId = ResourceId.SND_GAME_MUSIC;
        this.loopingSounds = new Map(); // Track looping sound state by instance
    }

    _getActiveLoopSoundIds(): Set<number> {
        const soundIds = new Set<number>();

        for (const entry of this.loopingSounds.values()) {
            if (entry?.active) {
                soundIds.add(entry.soundId);
            }
        }

        return soundIds;
    }

    _deactivateLoopEntry(
        instanceId: string,
        entry: {
            active: boolean;
            soundId: number;
            timeoutId: ReturnType<typeof setTimeout> | null;
            loopFn: () => void;
        }
    ) {
        if (!entry) {
            return;
        }

        entry.active = false;

        if (entry.timeoutId) {
            clearTimeout(entry.timeoutId);
            entry.timeoutId = null;
        }

        this.loopingSounds.delete(instanceId);
    }

    playSound(soundId: number) {
        if (this.soundEnabled) {
            Sounds.play(soundId, undefined);
        }
    }

    pauseSound(soundId: number) {
        if (this.soundEnabled && Sounds.isPlaying(soundId)) {
            Sounds.pause(soundId);
        }
    }

    resumeSound(soundId: number) {
        if (this.soundEnabled && Sounds.isPaused(soundId)) {
            Sounds.play(soundId, undefined);
        }
    }

    playLoopedSound(soundId: number, instanceKey: string, delayMs = 0) {
        if (!this.soundEnabled || this.audioPaused) {
            return;
        }

        // Use instanceKey if provided, otherwise generate unique ID
        const instanceId = instanceKey
            ? `${soundId}_${instanceKey}`
            : `${soundId}_${Date.now()}_${Math.random()}`;

        // Don't start if already playing
        if (this.loopingSounds.has(instanceId)) {
            return;
        }

        const loop = () => {
            const entry = this.loopingSounds.get(instanceId);

            if (!entry || !entry.active) {
                return;
            }

            if (!this.audioPaused && this.soundEnabled) {
                Sounds.play(soundId, loop, { instanceId });
            }
        };

        const entry: {
            active: boolean;
            soundId: number;
            timeoutId: ReturnType<typeof setTimeout> | null;
            loopFn: () => void;
        } = { active: true, loopFn: loop, soundId, timeoutId: null };
        this.loopingSounds.set(instanceId, entry);

        if (delayMs > 0) {
            entry.timeoutId = setTimeout(loop, delayMs);
        } else {
            loop();
        }
    }

    stopLoopedSoundInstance(soundId: number, instanceKey: string) {
        const instanceId = `${soundId}_${instanceKey}`;
        const entry = this.loopingSounds.get(instanceId);

        if (entry) {
            this._deactivateLoopEntry(instanceId, entry);
        }

        Sounds.stopInstance(soundId, instanceId);

        // Only stop the sound completely if no other instances are playing
        let hasOtherInstances = false;
        for (const loopEntry of this.loopingSounds.values()) {
            if (loopEntry.soundId === soundId && loopEntry.active) {
                hasOtherInstances = true;
                break;
            }
        }

        if (!hasOtherInstances) {
            Sounds.stop(soundId);
        }
    }

    stopLoopedSound(soundId: number) {
        const matchingInstanceIds = [];

        for (const [instanceId, entry] of this.loopingSounds) {
            if (entry.soundId === soundId) {
                matchingInstanceIds.push(instanceId);
            }
        }

        for (const id of matchingInstanceIds) {
            const entry = this.loopingSounds.get(id);
            if (entry) {
                this._deactivateLoopEntry(id, entry);
            }
        }

        Sounds.stop(soundId);
    }

    stopSound(soundId: number) {
        this.stopLoopedSound(soundId);
    }

    _getAvailableGameMusic() {
        if (!this.gameMusicLibrary || this.gameMusicLibrary.length === 0) {
            return [];
        }

        return this.gameMusicLibrary;
    }

    selectRandomGameMusic(): number | null {
        const availableTracks = this._getAvailableGameMusic();
        if (availableTracks.length === 0) {
            this.currentGameMusicId = null;
            return null;
        }

        let pool = availableTracks;
        if (pool.length > 1 && this.currentGameMusicId != null) {
            pool = pool.filter((soundId) => soundId !== this.currentGameMusicId);
            if (pool.length === 0) {
                pool = availableTracks;
            }
        }

        const nextId = pool[Math.floor(Math.random() * pool.length)] ?? null;
        this.currentGameMusicId = nextId;
        return nextId;
    }

    playGameMusic() {
        const availableTracks = this._getAvailableGameMusic();
        if (availableTracks.length === 0) {
            return;
        }

        const trackId =
            this.currentGameMusicId != null && availableTracks.includes(this.currentGameMusicId)
                ? this.currentGameMusicId
                : (availableTracks[0] ?? null);

        if (trackId === null) {
            return;
        }

        this.currentGameMusicId = trackId;
        this.playMusic(trackId);
    }

    playMusic(soundId: number) {
        const previousMusicId = this.musicId;

        if (previousMusicId && previousMusicId !== soundId) {
            this.stopMusic();
        }

        this.musicId = soundId;

        if (this.musicEnabled && !Sounds.isPlaying(soundId)) {
            const offset = this.musicResumeOffset || 0;
            this.musicResumeOffset = 0;
            Sounds.setVolume(soundId, 70);
            Sounds.play(
                soundId,
                () => {
                    if (!this.audioPaused && this.musicEnabled) {
                        this.musicResumeOffset = 0;
                        this.playMusic(soundId);
                    }
                },
                { offset }
            );
        }
    }

    pauseAudio() {
        if (this.audioPaused) {
            return;
        } // Don't pause if already paused

        this.audioPaused = true;
        this.pauseMusic();

        for (const soundId of this._getActiveLoopSoundIds()) {
            Sounds.pause(soundId);
        }
    }

    pauseMusic() {
        if (this.musicId && Sounds.isPlaying(this.musicId)) {
            Sounds.pause(this.musicId);
            this.musicResumeOffset = Sounds.getResumeOffset(this.musicId);
        }
    }

    resumeAudio() {
        if (!this.audioPaused) {
            return;
        }

        this.audioPaused = false;
        this.resumeMusic();

        // Restart each active loop instance exactly once
        if (this.soundEnabled) {
            for (const entry of this.loopingSounds.values()) {
                if (entry && entry.active) {
                    entry.loopFn();
                }
            }
        }
    }

    resumeMusic() {
        if (this.musicId && !Sounds.isPlaying(this.musicId)) {
            this.playMusic(this.musicId);
        }
    }

    stopMusic() {
        if (this.musicId) {
            Sounds.stop(this.musicId);
            this.musicResumeOffset = 0;
        }
    }

    setMusicEnabled(musicEnabled: boolean) {
        this.musicEnabled = musicEnabled;
        settings.setMusicEnabled(musicEnabled);
        if (this.musicEnabled) {
            this.resumeMusic();
        } else {
            this.pauseMusic();
        }
    }

    setSoundEnabled(soundEnabled: boolean) {
        this.soundEnabled = soundEnabled;
        settings.setSoundEnabled(soundEnabled);

        if (!soundEnabled) {
            const soundIds = Array.from(this._getActiveLoopSoundIds());

            for (const soundId of soundIds) {
                this.stopLoopedSound(soundId);
            }
        }
    }
}

// Export a singleton instance to maintain the same usage pattern
const SoundMgr = new SoundManager();

export default SoundMgr;
