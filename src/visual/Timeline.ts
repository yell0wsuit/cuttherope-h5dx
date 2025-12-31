import TimelineTrack from "@/visual/TimelineTrack";
import Constants from "@/utils/Constants";
import TrackType from "@/visual/TrackType";
import type KeyFrame from "@/visual/KeyFrame";
import type BaseElement from "@/visual/BaseElement";
import type {
    TimelineElement,
    TimelineLike,
    TimelineKeyFrameListener,
} from "@/visual/TimelineTypes";

const LoopType = {
    NO_LOOP: 0,
    REPLAY: 1,
    PING_PONG: 2,
} as const;

const StateType = {
    STOPPED: 0,
    PLAYING: 1,
    PAUSED: 2,
} as const;

type TimelineLoopType = (typeof LoopType)[keyof typeof LoopType];
type TimelineStateType = (typeof StateType)[keyof typeof StateType];

class Timeline implements TimelineLike {
    static readonly LoopType = LoopType;
    static readonly StateType = StateType;

    time: number;
    length: number;
    loopsLimit: number;
    state: TimelineStateType;
    loopType: TimelineLoopType;
    tracks: (TimelineTrack | undefined)[];
    onFinished: ((timeline: Timeline) => void) | null;
    onKeyFrame: TimelineKeyFrameListener | null;
    timelineDirReverse: boolean;
    element: TimelineElement | null;
    resourceId?: number;

    constructor() {
        this.time = 0;
        this.length = 0;
        this.loopsLimit = Constants.UNDEFINED;
        this.state = Timeline.StateType.STOPPED;
        this.loopType = Timeline.LoopType.NO_LOOP;
        this.tracks = [];

        // callback fired when the timeline finishes playing
        this.onFinished = null;

        // callback fired when the timeline reaches a key frame
        this.onKeyFrame = null;

        this.timelineDirReverse = false;
        this.element = null;
    }

    addKeyFrame(keyFrame: KeyFrame): void {
        const track = this.tracks[keyFrame.trackType];
        const index = track == null ? 0 : track.keyFrames.length;
        this.setKeyFrame(keyFrame, index);
    }

    setKeyFrame(keyFrame: KeyFrame, index: number): void {
        let track = this.tracks[keyFrame.trackType];
        if (!track) {
            this.tracks[keyFrame.trackType] = track = new TimelineTrack(this, keyFrame.trackType);
        }
        track.setKeyFrame(keyFrame, index);
    }

    getTrack(index: number): TimelineTrack | undefined {
        return this.tracks[index];
    }

    play(): void {
        if (this.state !== Timeline.StateType.PAUSED) {
            this.time = 0;
            this.timelineDirReverse = false;
            this.length = 0;

            for (let i = 0, len = this.tracks.length; i < len; i++) {
                const track = this.tracks[i];
                if (track) {
                    track.updateRange();
                    if (track.endTime > this.length) {
                        this.length = track.endTime;
                    }
                }
            }
            this.update(0);
        }
        this.state = Timeline.StateType.PLAYING;
    }

    pause(): void {
        this.state = Timeline.StateType.PAUSED;
    }

    jumpToTrack(trackIndex: number, keyFrame: number): void {
        if (this.state === Timeline.StateType.STOPPED) {
            this.state = Timeline.StateType.PAUSED;
        }
        const track = this.tracks[trackIndex];
        if (!track) {
            return;
        }
        const delta = track.getFrameTime(keyFrame) - this.time;
        this.update(delta);
    }

    stop(): void {
        this.state = Timeline.StateType.STOPPED;
        this.deactivateTracks();
    }

    deactivateTracks(): void {
        for (let i = 0, len = this.tracks.length; i < len; i++) {
            const track = this.tracks[i];
            if (track) {
                track.deactivate();
            }
        }
    }

    update(delta: number): void {
        if (this.state !== Timeline.StateType.PLAYING) {
            return;
        }

        if (!this.timelineDirReverse) {
            this.time += delta;
        } else {
            this.time -= delta;
        }

        for (let i = 0, len = this.tracks.length; i < len; i++) {
            const track = this.tracks[i];
            if (track != null) {
                if (track.type === TrackType.ACTION) {
                    track.updateActionTrack(delta);
                } else {
                    track.updateNonActionTrack(delta);
                }
            }
        }

        if (this.loopType === Timeline.LoopType.PING_PONG) {
            const reachedEnd =
                this.timelineDirReverse === false &&
                this.time >= this.length - Constants.FLOAT_PRECISION;
            if (reachedEnd) {
                this.time = Math.max(0, this.length - (this.time - this.length));
                this.timelineDirReverse = true;
            } else {
                const reachedStart =
                    this.timelineDirReverse && this.time <= Constants.FLOAT_PRECISION;
                if (reachedStart) {
                    if (this.loopsLimit > 0) {
                        this.loopsLimit--;
                        if (this.loopsLimit === 0) {
                            this.stop();
                            if (this.onFinished) {
                                this.onFinished(this);
                            }
                        }
                    }

                    this.time = Math.min(-this.time, this.length);
                    this.timelineDirReverse = false;
                }
            }
        } else if (this.loopType === Timeline.LoopType.REPLAY) {
            if (this.time >= this.length - Constants.FLOAT_PRECISION) {
                if (this.loopsLimit > 0) {
                    this.loopsLimit--;
                    if (this.loopsLimit === 0) {
                        this.stop();
                        if (this.onFinished) {
                            this.onFinished(this);
                        }
                    }
                }

                this.time = Math.min(this.time - this.length, this.length);
            }
        } else if (this.loopType === Timeline.LoopType.NO_LOOP) {
            if (this.time >= this.length - Constants.FLOAT_PRECISION) {
                this.stop();
                if (this.onFinished) {
                    this.onFinished(this);
                }
            }
        }
    }
}

export type { TimelineLoopType, TimelineStateType };
export { LoopType, StateType };
export default Timeline;
