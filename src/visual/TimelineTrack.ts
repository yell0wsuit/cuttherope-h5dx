import KeyFrame from "@/visual/KeyFrame";
import TrackType from "@/visual/TrackType";
import type { TimelineLike } from "@/visual/TimelineTypes";
import type Action from "@/visual/Action";
import type { ActionData } from "@/visual/Action";
import Constants from "@/utils/Constants";

interface TrackStrategy {
    applyEaseStep(track: TimelineTrack, keyFrame: KeyFrame, delta: number): void;
    applyLinearStep(track: TimelineTrack, delta: number): void;
    setElementFromKeyFrame(track: TimelineTrack, keyFrame: KeyFrame): void;
    setKeyFrameFromElement(track: TimelineTrack, keyFrame: KeyFrame): void;
    initKeyFrameStepFrom(track: TimelineTrack, src: KeyFrame, dst: KeyFrame): void;
    configureEase(
        track: TimelineTrack,
        src: KeyFrame,
        dst: KeyFrame,
        isEaseIn: boolean,
        isEaseOut: boolean
    ): void;
}

const TRACK_STRATEGIES: Record<number, TrackStrategy> = {
    [TrackType.POSITION]: {
        applyEaseStep(track, _keyFrame, delta) {
            const element = track.t.element;
            if (!element) {
                return;
            }

            const saPos = track.currentStepAcceleration.value.pos;
            const xPosDelta = saPos.x * delta;
            const yPosDelta = saPos.y * delta;
            const spsPos = track.currentStepPerSecond.value.pos;
            const oldPosX = spsPos.x;
            const oldPosY = spsPos.y;

            spsPos.x += xPosDelta;
            spsPos.y += yPosDelta;

            element.x += (oldPosX + xPosDelta / 2) * delta;
            element.y += (oldPosY + yPosDelta / 2) * delta;
        },
        applyLinearStep(track, delta) {
            const spsValue = track.currentStepPerSecond.value.pos;
            const element = track.t.element;
            if (!element) {
                return;
            }
            element.x += spsValue.x * delta;
            element.y += spsValue.y * delta;
        },
        setElementFromKeyFrame(track, keyFrame) {
            const element = track.t.element;
            if (!element) {
                return;
            }
            const kfPos = keyFrame.value.pos;

            if (!track.relative) {
                element.x = kfPos.x;
                element.y = kfPos.y;
                return;
            }

            const prevPos = track.elementPrevState.value.pos;
            element.x = prevPos.x + kfPos.x;
            element.y = prevPos.y + kfPos.y;
        },
        setKeyFrameFromElement(track, keyFrame) {
            const kfValue = keyFrame.value.pos;
            const element = track.t.element;
            if (!element) {
                return;
            }
            kfValue.x = element.x;
            kfValue.y = element.y;
        },
        initKeyFrameStepFrom(track, src, dst) {
            const spsPos = track.currentStepPerSecond.value.pos;
            const dstPos = dst.value.pos;
            const srcPos = src.value.pos;
            spsPos.x = (dstPos.x - srcPos.x) / track.keyFrameTimeLeft;
            spsPos.y = (dstPos.y - srcPos.y) / track.keyFrameTimeLeft;
        },
        configureEase(track, _src, _dst, isEaseIn, isEaseOut) {
            if (!isEaseIn && !isEaseOut) {
                return;
            }

            const spsPos = track.currentStepPerSecond.value.pos;
            const saPos = track.currentStepAcceleration.value.pos;
            spsPos.multiply(2);
            saPos.x = spsPos.x / track.keyFrameTimeLeft;
            saPos.y = spsPos.y / track.keyFrameTimeLeft;
            if (isEaseIn) {
                spsPos.x = 0;
                spsPos.y = 0;
            } else {
                saPos.multiply(-1);
            }
        },
    },
    [TrackType.SCALE]: {
        applyEaseStep(track, _keyFrame, delta) {
            const element = track.t.element;
            if (!element) {
                return;
            }

            const saScale = track.currentStepAcceleration.value.scale;
            const xScaleDelta = saScale.x * delta;
            const yScaleDelta = saScale.y * delta;
            const spsScale = track.currentStepPerSecond.value.scale;
            const oldScaleX = spsScale.x;
            const oldScaleY = spsScale.y;

            spsScale.x += xScaleDelta;
            spsScale.y += yScaleDelta;

            element.scaleX += (oldScaleX + xScaleDelta / 2) * delta;
            element.scaleY += (oldScaleY + yScaleDelta / 2) * delta;
        },
        applyLinearStep(track, delta) {
            const spsScale = track.currentStepPerSecond.value.scale;
            const element = track.t.element;
            if (!element) {
                return;
            }
            element.scaleX += spsScale.x * delta;
            element.scaleY += spsScale.y * delta;
        },
        setElementFromKeyFrame(track, keyFrame) {
            const element = track.t.element;
            if (!element) {
                return;
            }
            const kfScale = keyFrame.value.scale;
            if (!track.relative) {
                element.scaleX = kfScale.x;
                element.scaleY = kfScale.y;
                return;
            }

            const prevScale = track.elementPrevState.value.scale;
            element.scaleX = prevScale.x + kfScale.x;
            element.scaleY = prevScale.y + kfScale.y;
        },
        setKeyFrameFromElement(track, keyFrame) {
            const kfScale = keyFrame.value.scale;
            const element = track.t.element;
            if (!element) {
                return;
            }
            kfScale.x = element.scaleX;
            kfScale.y = element.scaleY;
        },
        initKeyFrameStepFrom(track, src, dst) {
            const spsScale = track.currentStepPerSecond.value.scale;
            const dstScale = dst.value.scale;
            const srcScale = src.value.scale;
            spsScale.x = (dstScale.x - srcScale.x) / track.keyFrameTimeLeft;
            spsScale.y = (dstScale.y - srcScale.y) / track.keyFrameTimeLeft;
        },
        configureEase(track, _src, _dst, isEaseIn, isEaseOut) {
            if (!isEaseIn && !isEaseOut) {
                return;
            }

            const spsScale = track.currentStepPerSecond.value.scale;
            const saScale = track.currentStepAcceleration.value.scale;
            spsScale.multiply(2);
            saScale.x = spsScale.x / track.keyFrameTimeLeft;
            saScale.y = spsScale.y / track.keyFrameTimeLeft;
            if (isEaseIn) {
                spsScale.x = 0;
                spsScale.y = 0;
            } else {
                saScale.multiply(-1);
            }
        },
    },
    [TrackType.ROTATION]: {
        applyEaseStep(track, _keyFrame, delta) {
            const element = track.t.element;
            if (!element) {
                return;
            }

            const acceleration = track.currentStepAcceleration.value.rotationAngle * delta;
            const current = track.currentStepPerSecond.value.rotationAngle;
            track.currentStepPerSecond.value.rotationAngle += acceleration;
            element.rotation += (current + acceleration / 2) * delta;
        },
        applyLinearStep(track, delta) {
            const element = track.t.element;
            if (!element) {
                return;
            }

            const spsRotation = track.currentStepPerSecond.value.rotationAngle;
            element.rotation += spsRotation * delta;
        },
        setElementFromKeyFrame(track, keyFrame) {
            const element = track.t.element;
            if (!element) {
                return;
            }

            if (!track.relative) {
                element.rotation = keyFrame.value.rotationAngle;
                return;
            }

            element.rotation =
                track.elementPrevState.value.rotationAngle + keyFrame.value.rotationAngle;
        },
        setKeyFrameFromElement(track, keyFrame) {
            const element = track.t.element;
            if (!element) {
                return;
            }

            keyFrame.value.rotationAngle = element.rotation;
        },
        initKeyFrameStepFrom(track, src, dst) {
            track.currentStepPerSecond.value.rotationAngle =
                (dst.value.rotationAngle - src.value.rotationAngle) / track.keyFrameTimeLeft;
        },
        configureEase(track, _src, _dst, isEaseIn, isEaseOut) {
            if (!isEaseIn && !isEaseOut) {
                return;
            }

            const sps = track.currentStepPerSecond.value;
            const sa = track.currentStepAcceleration.value;
            sps.rotationAngle *= 2;
            sa.rotationAngle = sps.rotationAngle / track.keyFrameTimeLeft;
            if (isEaseIn) {
                sps.rotationAngle = 0;
            } else {
                sa.rotationAngle *= -1;
            }
        },
    },
    [TrackType.COLOR]: {
        applyEaseStep(track, _keyFrame, delta) {
            const element = track.t.element;
            if (!element) {
                return;
            }

            const spsColor = track.currentStepPerSecond.value.color;
            const oldColorR = spsColor.r;
            const oldColorG = spsColor.g;
            const oldColorB = spsColor.b;
            const oldColorA = spsColor.a;
            const saColor = track.currentStepAcceleration.value.color;
            const deltaR = saColor.r * delta;
            const deltaG = saColor.g * delta;
            const deltaB = saColor.b * delta;
            const deltaA = saColor.a * delta;

            // NOTE: it looks like there may be a bug in iOS? For now, we'll follow
            // it by adding the delta twice
            spsColor.r += deltaR * 2;
            spsColor.g += deltaG * 2;
            spsColor.b += deltaB * 2;
            spsColor.a += deltaA * 2;

            const elementColor = element.color;
            elementColor.r += (oldColorR + deltaR / 2) * delta;
            elementColor.g += (oldColorG + deltaG / 2) * delta;
            elementColor.b += (oldColorB + deltaB / 2) * delta;
            elementColor.a += (oldColorA + deltaA / 2) * delta;
        },
        applyLinearStep(track, delta) {
            const element = track.t.element;
            if (!element) {
                return;
            }

            const spsColor = track.currentStepPerSecond.value.color;
            const elementColor = element.color;
            elementColor.r += spsColor.r * delta;
            elementColor.g += spsColor.g * delta;
            elementColor.b += spsColor.b * delta;
            elementColor.a += spsColor.a * delta;
        },
        setElementFromKeyFrame(track, keyFrame) {
            const element = track.t.element;
            if (!element) {
                return;
            }

            const elementColor = element.color;
            const kfColor = keyFrame.value.color;
            if (!track.relative) {
                elementColor.copyFrom(kfColor);
                return;
            }

            const prevColor = track.elementPrevState.value.color;
            elementColor.r = prevColor.r + kfColor.r;
            elementColor.g = prevColor.g + kfColor.g;
            elementColor.b = prevColor.b + kfColor.b;
            elementColor.a = prevColor.a + kfColor.a;
        },
        setKeyFrameFromElement(track, keyFrame) {
            const element = track.t.element;
            if (!element) {
                return;
            }

            keyFrame.value.color.copyFrom(element.color);
        },
        initKeyFrameStepFrom(track, src, dst) {
            const spsColor = track.currentStepPerSecond.value.color;
            const dstColor = dst.value.color;
            const srcColor = src.value.color;
            spsColor.r = (dstColor.r - srcColor.r) / track.keyFrameTimeLeft;
            spsColor.g = (dstColor.g - srcColor.g) / track.keyFrameTimeLeft;
            spsColor.b = (dstColor.b - srcColor.b) / track.keyFrameTimeLeft;
            spsColor.a = (dstColor.a - srcColor.a) / track.keyFrameTimeLeft;
        },
        configureEase(track, _src, _dst, isEaseIn, isEaseOut) {
            if (!isEaseIn && !isEaseOut) {
                return;
            }

            const spsColor = track.currentStepPerSecond.value.color;
            const saColor = track.currentStepAcceleration.value.color;
            spsColor.multiply(2);
            saColor.r = spsColor.r / track.keyFrameTimeLeft;
            saColor.g = spsColor.g / track.keyFrameTimeLeft;
            saColor.b = spsColor.b / track.keyFrameTimeLeft;
            saColor.a = spsColor.a / track.keyFrameTimeLeft;
            if (isEaseIn) {
                spsColor.multiply(0);
            } else {
                saColor.multiply(-1);
            }
        },
    },
};

const TrackState = {
    NOT_ACTIVE: 0,
    ACTIVE: 1,
} as const;

type TrackStateType = (typeof TrackState)[keyof typeof TrackState];

class TimelineTrack {
    readonly type: number;
    state: TrackStateType;
    relative: boolean;
    startTime: number;
    endTime: number;
    keyFrames: KeyFrame[];
    readonly t: TimelineLike;
    strategy: TrackStrategy | null;
    nextKeyFrame: number;
    currentStepPerSecond: KeyFrame;
    currentStepAcceleration: KeyFrame;
    elementPrevState: KeyFrame;
    keyFrameTimeLeft: number;
    overrun: number;
    actionSets?: Action[][];

    constructor(timeline: TimelineLike, trackType: number) {
        this.type = trackType;
        this.state = TrackState.NOT_ACTIVE;
        this.relative = false;

        this.startTime = 0;
        this.endTime = 0;

        this.keyFrames = [];

        this.t = timeline;

        this.strategy = TRACK_STRATEGIES[trackType] ?? null;

        this.nextKeyFrame = Constants.UNDEFINED;
        this.currentStepPerSecond = KeyFrame.newEmpty();
        this.currentStepAcceleration = KeyFrame.newEmpty();
        this.elementPrevState = KeyFrame.newEmpty();
        this.keyFrameTimeLeft = 0;
        this.overrun = 0;

        if (trackType === TrackType.ACTION) {
            this.actionSets = [];
        }
    }

    deactivate(): void {
        this.state = TrackState.NOT_ACTIVE;
    }

    addKeyFrame(keyFrame: KeyFrame): void {
        this.setKeyFrame(keyFrame, this.keyFrames.length);
    }

    setKeyFrame(keyFrame: KeyFrame, index: number): void {
        this.keyFrames[index] = keyFrame;

        if (this.type === TrackType.ACTION && this.actionSets) {
            this.actionSets.push(keyFrame.value.actionSet);
        }
    }

    getFrameTime(frameIndex: number): number {
        let total = 0;
        for (let i = 0; i <= frameIndex; i++) {
            const kf = this.keyFrames[i];
            if (!kf) {
                continue;
            }
            total += kf.timeOffset;
        }
        return total;
    }

    updateRange(): void {
        this.startTime = this.getFrameTime(0);
        this.endTime = this.getFrameTime(this.keyFrames.length - 1);
    }

    updateActionTrack(delta: number): void {
        if (this.state === TrackState.NOT_ACTIVE) {
            if (!this.t.timelineDirReverse) {
                if (!(this.t.time - delta > this.endTime || this.t.time < this.startTime)) {
                    if (this.keyFrames.length > 1) {
                        this.state = TrackState.ACTIVE;
                        this.nextKeyFrame = 0;
                        this.overrun = this.t.time - this.startTime;

                        this.nextKeyFrame++;
                        const prevKf = this.keyFrames[this.nextKeyFrame - 1];
                        const nextKf = this.keyFrames[this.nextKeyFrame];
                        if (prevKf && nextKf) {
                            this.initActionKeyFrame(prevKf, nextKf.timeOffset);
                        }
                    } else {
                        const firstKf = this.keyFrames[0];
                        if (firstKf) {
                            this.initActionKeyFrame(firstKf, 0);
                        }
                    }
                }
            } else {
                if (!(this.t.time + delta < this.startTime || this.t.time > this.endTime)) {
                    if (this.keyFrames.length > 1) {
                        this.state = TrackState.ACTIVE;
                        this.nextKeyFrame = this.keyFrames.length - 1;
                        this.overrun = this.endTime - this.t.time;
                        this.nextKeyFrame--;
                        const nextKf = this.keyFrames[this.nextKeyFrame + 1];
                        const prevKf = this.keyFrames[this.nextKeyFrame];
                        if (nextKf && prevKf) {
                            this.initActionKeyFrame(nextKf, prevKf.timeOffset);
                        }
                    } else {
                        const firstKf = this.keyFrames[0];
                        if (firstKf) {
                            this.initActionKeyFrame(firstKf, 0);
                        }
                    }
                }
            }
            return;
        }

        this.keyFrameTimeLeft -= delta;

        // FLOAT_PRECISION is used to fix the situation when timeline
        // time >= timeline length but keyFrameTimeLeft is not <= 0
        if (this.keyFrameTimeLeft <= Constants.FLOAT_PRECISION) {
            if (this.t.onKeyFrame) {
                this.t.onKeyFrame(this.t, this.type, this.nextKeyFrame);
            }

            this.overrun = -this.keyFrameTimeLeft;

            if (this.nextKeyFrame === this.keyFrames.length - 1) {
                const kf = this.keyFrames[this.nextKeyFrame];
                if (kf) {
                    this.setElementFromKeyFrame(kf);
                }
                this.state = TrackState.NOT_ACTIVE;
            } else if (this.nextKeyFrame === 0) {
                const kf = this.keyFrames[this.nextKeyFrame];
                if (kf) {
                    this.setElementFromKeyFrame(kf);
                }
                this.state = TrackState.NOT_ACTIVE;
            } else {
                if (!this.t.timelineDirReverse) {
                    this.nextKeyFrame++;
                    const prevKf = this.keyFrames[this.nextKeyFrame - 1];
                    const nextKf = this.keyFrames[this.nextKeyFrame];
                    if (prevKf && nextKf) {
                        this.initActionKeyFrame(prevKf, nextKf.timeOffset);
                    }
                } else {
                    this.nextKeyFrame--;
                    const kf = this.keyFrames[this.nextKeyFrame + 1];
                    if (kf) {
                        this.initActionKeyFrame(kf, kf.timeOffset);
                    }
                }
            }
        }
    }

    updateNonActionTrack(delta: number): void {
        const t = this.t;
        let kf;
        if (this.state === TrackState.NOT_ACTIVE) {
            if (t.time >= this.startTime && t.time <= this.endTime) {
                this.state = TrackState.ACTIVE;
                if (!t.timelineDirReverse) {
                    this.nextKeyFrame = 0;
                    this.overrun = t.time - this.startTime;
                    this.nextKeyFrame++;
                    kf = this.keyFrames[this.nextKeyFrame];
                    const prevKf = this.keyFrames[this.nextKeyFrame - 1];
                    if (kf && prevKf) {
                        this.initKeyFrameStepFrom(prevKf, kf, kf.timeOffset);
                    }
                } else {
                    this.nextKeyFrame = this.keyFrames.length - 1;
                    this.overrun = this.endTime - t.time;
                    this.nextKeyFrame--;
                    kf = this.keyFrames[this.nextKeyFrame + 1];
                    const prevKf = this.keyFrames[this.nextKeyFrame];
                    if (kf && prevKf) {
                        this.initKeyFrameStepFrom(kf, prevKf, kf.timeOffset);
                    }
                }
            }
            return;
        }

        this.keyFrameTimeLeft -= delta;
        kf = this.keyFrames[this.nextKeyFrame];
        const strategy = this.strategy;
        if (!strategy || !kf) {
            return;
        }

        if (
            kf.transitionType === KeyFrame.TransitionType.EASE_IN ||
            kf.transitionType === KeyFrame.TransitionType.EASE_OUT
        ) {
            strategy.applyEaseStep(this, kf, delta);
        } else if (kf.transitionType === KeyFrame.TransitionType.LINEAR) {
            strategy.applyLinearStep(this, delta);
        }

        if (this.keyFrameTimeLeft <= Constants.FLOAT_PRECISION) {
            if (t.onKeyFrame) {
                t.onKeyFrame(t, this.type, this.nextKeyFrame);
            }

            this.overrun = -this.keyFrameTimeLeft;

            if (this.nextKeyFrame === this.keyFrames.length - 1) {
                const endKf = this.keyFrames[this.nextKeyFrame];
                if (endKf) {
                    this.setElementFromKeyFrame(endKf);
                }
                this.state = TrackState.NOT_ACTIVE;
            } else if (this.nextKeyFrame === 0) {
                const startKf = this.keyFrames[this.nextKeyFrame];
                if (startKf) {
                    this.setElementFromKeyFrame(startKf);
                }
                this.state = TrackState.NOT_ACTIVE;
            } else {
                if (!t.timelineDirReverse) {
                    this.nextKeyFrame++;
                    kf = this.keyFrames[this.nextKeyFrame];
                    const prevKf = this.keyFrames[this.nextKeyFrame - 1];
                    if (kf && prevKf) {
                        this.initKeyFrameStepFrom(prevKf, kf, kf.timeOffset);
                    }
                } else {
                    this.nextKeyFrame--;
                    kf = this.keyFrames[this.nextKeyFrame + 1];
                    const nextKf = this.keyFrames[this.nextKeyFrame];
                    if (kf && nextKf) {
                        this.initKeyFrameStepFrom(kf, nextKf, kf.timeOffset);
                    }
                }
            }
        }
    }

    initActionKeyFrame(kf: KeyFrame, time: number): void {
        this.keyFrameTimeLeft = time;
        this.setElementFromKeyFrame(kf);

        if (this.overrun > 0) {
            this.updateActionTrack(this.overrun);
            this.overrun = 0;
        }
    }

    setElementFromKeyFrame(kf: KeyFrame): void {
        if (this.type === TrackType.ACTION) {
            const actionSet = kf.value.actionSet;
            for (let i = 0, len = actionSet.length; i < len; i++) {
                const action = actionSet[i];
                if (!action) {
                    continue;
                }
                const target = action.actionTarget as {
                    handleAction: (data: ActionData) => boolean;
                };
                target.handleAction(action.data);
            }
            return;
        }

        this.strategy?.setElementFromKeyFrame(this, kf);
    }

    setKeyFrameFromElement(kf: KeyFrame): void {
        if (this.type === TrackType.ACTION) {
            return;
        }

        this.strategy?.setKeyFrameFromElement(this, kf);
    }

    initKeyFrameStepFrom(src: KeyFrame, dst: KeyFrame, time: number): void {
        this.keyFrameTimeLeft = time;

        this.setKeyFrameFromElement(this.elementPrevState);
        this.setElementFromKeyFrame(src);

        const strategy = this.strategy;
        if (strategy) {
            strategy.initKeyFrameStepFrom(this, src, dst);
            const isEaseIn = dst.transitionType === KeyFrame.TransitionType.EASE_IN;
            const isEaseOut = dst.transitionType === KeyFrame.TransitionType.EASE_OUT;
            strategy.configureEase(this, src, dst, isEaseIn, isEaseOut);
        }

        if (this.overrun > 0) {
            this.updateNonActionTrack(this.overrun);
            this.overrun = 0;
        }
    }
}

export type { TrackStrategy, TrackStateType };
export { TrackState };
export default TimelineTrack;
