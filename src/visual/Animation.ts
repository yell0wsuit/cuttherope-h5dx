import ImageElement from "@/visual/ImageElement";
import Timeline, { type TimelineLoopType } from "@/visual/Timeline";
import Action from "@/visual/Action";
import ActionType from "@/visual/ActionType";
import TrackType from "@/visual/TrackType";
import KeyFrame from "@/visual/KeyFrame";
import Constants from "@/utils/Constants";

type ActionTypeValue = (typeof ActionType)[keyof typeof ActionType];

/**
 * Animation element based on timeline
 */
class Animation extends ImageElement {
    addAnimationDelay(delay: number, loop: TimelineLoopType, start: number, end: number): number {
        const index = this.timelines.length;
        this.addAnimationEndpoints(index, delay, loop, start, end);
        return index;
    }

    addAnimationWithDelay(
        delay: number,
        loopType: TimelineLoopType,
        count: number,
        sequence: number[]
    ): void {
        const index = this.timelines.length;
        this.addAnimationSequence(index, delay, loopType, count, sequence);
    }

    addAnimationSequence(
        animationId: number,
        delay: number,
        loopType: TimelineLoopType,
        count: number,
        sequence: number[],
        resourceId?: number
    ): void {
        this.addAnimation(
            animationId,
            delay,
            loopType,
            count,
            sequence[0] ?? 0,
            Constants.UNDEFINED,
            sequence,
            resourceId
        );
    }

    addAnimationEndpoints(
        animationId: number,
        delay: number,
        loopType: TimelineLoopType,
        start: number,
        end: number,
        argumentList?: number[],
        resourceId?: number
    ): void {
        const count = end - start + 1;

        this.addAnimation(
            animationId,
            delay,
            loopType,
            count,
            start,
            end,
            argumentList,
            resourceId
        );
    }

    addAnimation(
        animationId: number,
        delay: number,
        loopType: TimelineLoopType,
        count: number,
        start: number,
        end: number,
        argumentList: number[] | undefined,
        resourceId: number | undefined
    ): void {
        const t = new Timeline();
        let as = [Action.create(this, ActionType.SET_DRAWQUAD, start, 0)];

        t.addKeyFrame(KeyFrame.makeAction(as, 0));

        resourceId = resourceId !== undefined ? resourceId : this.resId;

        let si = start;
        for (let i = 1; i < count; i++) {
            if (argumentList) {
                si = argumentList[i] ?? si;
            } else {
                si++;
            }

            as = [Action.create(this, ActionType.SET_DRAWQUAD, si, 0)];
            t.addKeyFrame(KeyFrame.makeAction(as, delay));

            if (i == count - 1 && loopType === Timeline.LoopType.REPLAY) {
                t.addKeyFrame(KeyFrame.makeAction(as, delay));
            }
        }

        if (loopType) {
            t.loopType = loopType;
        }

        this.addTimelineWithID(t, animationId);

        if (resourceId !== undefined) {
            t.resourceId = resourceId;
        }
    }

    setDelay(delay: number, index: number, animationId: number): void {
        const timeline = this.getTimeline(animationId);
        if (!timeline) {
            return;
        }
        const track = timeline.getTrack(TrackType.ACTION);
        if (!track) {
            return;
        }
        const kf = track.keyFrames[index];
        if (!kf) {
            return;
        }
        kf.timeOffset = delay;
    }

    setPause(index: number, animationId: number): void {
        this.setAction(ActionType.PAUSE_TIMELINE, this, 0, 0, index, animationId);
    }

    setAction(
        actionName: ActionTypeValue,
        target: object,
        param: number,
        subParam: number,
        index: number,
        animationId: number
    ): void {
        const timeline = this.getTimeline(animationId);
        if (!timeline) {
            return;
        }
        const track = timeline.getTrack(TrackType.ACTION);
        if (!track) {
            return;
        }
        const kf = track.keyFrames[index];
        if (!kf) {
            return;
        }
        const action = Action.create(target, actionName, param, subParam);

        kf.value.actionSet.push(action);
    }

    switchToAnimation(a2: number, a1: number, delay: number): void {
        const timeline = this.getTimeline(a1);
        if (!timeline) {
            return;
        }
        const as = [Action.create(this, ActionType.PLAY_TIMELINE, 0, a2)];
        const kf = KeyFrame.makeAction(as, delay);
        timeline.addKeyFrame(kf);
    }

    /**
     * Go to the specified sequence frame of the current animation
     */
    jumpTo(index: number): void {
        const timeline = this.currentTimeline;
        if (timeline) {
            timeline.jumpToTrack(TrackType.ACTION, index);
        }
    }
}

export default Animation;
