import GameObject from "@/visual/GameObject";
import ImageElement from "@/visual/ImageElement";
import Animation from "@/visual/Animation";
import ResourceId from "@/resources/ResourceId";
import Rectangle from "@/core/Rectangle";
import Quad2D from "@/core/Quad2D";
import resolution from "@/resolution";
import Alignment from "@/core/Alignment";
import Timeline from "@/visual/Timeline";
import LevelState from "@/game/LevelState";
import edition from "@/config/editions/net-edition";
import { IS_XMAS, IS_JANUARY } from "@/utils/SpecialEvents";
import MathHelper from "@/utils/MathHelper";
import settings from "@/game/CTRSettings";
import ActionType from "@/visual/ActionType";
import BoxType from "@/ui/BoxType";
import * as GameSceneConstants from "@/gameScene/constants";
import type GameSceneLoaders from "../loaders";
import type { TargetItem } from "../MapLayerItem";

export function loadTarget(this: GameSceneLoaders, item: TargetItem): void {
    const target = new GameObject();
    const targetWithOverride = target as GameObject & {
        bbOverride?: Rectangle;
        rbb?: {
            constructor: new (x: number, y: number, w: number, h: number) => typeof target.rbb;
        };
    };
    this.target = target;

    const boxType = edition.boxTypes?.[LevelState.pack];
    const isHolidayBox = boxType === BoxType.HOLIDAY;

    const isJanuary = IS_JANUARY;
    this.pendingPaddingtonIdleTransition = false;
    let frame;

    target.initTextureWithId(ResourceId.IMG_CHAR_ANIMATIONS);
    target.initTextureWithId(ResourceId.IMG_CHAR_ANIMATIONS2);
    target.initTextureWithId(ResourceId.IMG_CHAR_ANIMATIONS3);

    if (isJanuary) {
        target.initTextureWithId(ResourceId.IMG_CHAR_ANIMATION_PADDINGTON);
    }

    if (this.nightLevel) {
        target.initTextureWithId(ResourceId.IMG_CHAR_ANIMATIONS_SLEEPING);
    }

    if (IS_XMAS) {
        target.initTextureWithId(ResourceId.IMG_CHAR_GREETINGS_XMAS);
        target.initTextureWithId(ResourceId.IMG_CHAR_IDLE_XMAS);
    }

    targetWithOverride.doRestoreCutTransparency();

    targetWithOverride.bb = Rectangle.copy(resolution.TARGET_BB);
    targetWithOverride.bbOverride = Rectangle.copy(resolution.TARGET_BB);
    const originalPlayTimeline = targetWithOverride.playTimeline;
    targetWithOverride.playTimeline = function (index: number) {
        originalPlayTimeline.call(this, index);
        const element = this as GameObject & {
            bbOverride?: Rectangle;
            rbb?: Quad2D | undefined;
        };
        if (element.bbOverride) {
            element.bb = Rectangle.copy(element.bbOverride);
            if (element.rbb) {
                element.rbb = new Quad2D(element.bb.x, element.bb.y, element.bb.w, element.bb.h);
            }
        }
    };
    targetWithOverride.drawPosIncrement = 0.0001;

    targetWithOverride.addAnimationEndpoints(
        GameSceneConstants.CharAnimation.GREETING,
        0.05,
        Timeline.LoopType.NO_LOOP,
        GameSceneConstants.IMG_CHAR_ANIMATIONS2_greeting_start,
        GameSceneConstants.IMG_CHAR_ANIMATIONS2_greeting_end,
        undefined,
        ResourceId.IMG_CHAR_ANIMATIONS2
    );

    targetWithOverride.addAnimationEndpoints(
        GameSceneConstants.CharAnimation.GREETINGXMAS,
        0.05,
        Timeline.LoopType.NO_LOOP,
        GameSceneConstants.IMG_CHAR_GREETINGS_XMAS_start,
        GameSceneConstants.IMG_CHAR_GREETINGS_XMAS_end,
        undefined,
        ResourceId.IMG_CHAR_GREETINGS_XMAS
    );

    targetWithOverride.addAnimationEndpoints(
        GameSceneConstants.CharAnimation.IDLE,
        0.05,
        Timeline.LoopType.REPLAY,
        GameSceneConstants.IMG_CHAR_ANIMATIONS_idle_start,
        GameSceneConstants.IMG_CHAR_ANIMATIONS_idle_end,
        undefined,
        ResourceId.IMG_CHAR_ANIMATIONS
    );

    if (this.nightLevel) {
        targetWithOverride.addAnimationEndpoints(
            GameSceneConstants.CharAnimation.SLEEPING,
            0.05,
            Timeline.LoopType.NO_LOOP,
            GameSceneConstants.IMG_CHAR_ANIMATIONS_SLEEPING_sleep_start,
            GameSceneConstants.IMG_CHAR_ANIMATIONS_SLEEPING_sleep_end,
            undefined,
            ResourceId.IMG_CHAR_ANIMATIONS_SLEEPING
        );

        const zzzFrames: number[] = [];
        for (
            frame = GameSceneConstants.IMG_CHAR_ANIMATIONS_SLEEPING_zzz_start;
            frame <= GameSceneConstants.IMG_CHAR_ANIMATIONS_SLEEPING_zzz_end;
            frame++
        ) {
            zzzFrames.push(frame);
        }
        const zzzHold = new Array(15).fill(
            GameSceneConstants.IMG_CHAR_ANIMATIONS_SLEEPING_zzz_start
        );
        const zzzPrimarySequence = [...zzzFrames, ...zzzHold];
        const zzzSecondarySequence = [...zzzHold, ...zzzFrames];

        this.sleepAnimPrimary = new Animation();
        this.sleepAnimPrimary.initTextureWithId(ResourceId.IMG_CHAR_ANIMATIONS_SLEEPING);
        this.sleepAnimPrimary.anchor = this.sleepAnimPrimary.parentAnchor = Alignment.CENTER;
        this.sleepAnimPrimary.doRestoreCutTransparency();
        this.sleepAnimPrimary.addAnimationSequence(
            0,
            1 / 30,
            Timeline.LoopType.REPLAY,
            zzzPrimarySequence.length,
            zzzPrimarySequence,
            ResourceId.IMG_CHAR_ANIMATIONS_SLEEPING
        );
        this.sleepAnimPrimary.playTimeline(0);
        this.sleepAnimPrimary.visible = false;

        this.sleepAnimSecondary = new Animation();
        this.sleepAnimSecondary.initTextureWithId(ResourceId.IMG_CHAR_ANIMATIONS_SLEEPING);
        this.sleepAnimSecondary.anchor = this.sleepAnimSecondary.parentAnchor = Alignment.CENTER;
        this.sleepAnimSecondary.doRestoreCutTransparency();
        this.sleepAnimSecondary.addAnimationSequence(
            0,
            1 / 30,
            Timeline.LoopType.REPLAY,
            zzzSecondarySequence.length,
            zzzSecondarySequence,
            ResourceId.IMG_CHAR_ANIMATIONS_SLEEPING
        );
        this.sleepAnimSecondary.playTimeline(0);
        this.sleepAnimSecondary.visible = false;
    } else {
        this.sleepAnimPrimary = null;
        this.sleepAnimSecondary = null;
    }

    targetWithOverride.addAnimationEndpoints(
        GameSceneConstants.CharAnimation.IDLE2,
        0.05,
        Timeline.LoopType.NO_LOOP,
        GameSceneConstants.IMG_CHAR_ANIMATIONS_idle2_start,
        GameSceneConstants.IMG_CHAR_ANIMATIONS_idle2_end,
        undefined,
        ResourceId.IMG_CHAR_ANIMATIONS
    );

    targetWithOverride.addAnimationEndpoints(
        GameSceneConstants.CharAnimation.IDLEXMAS,
        0.05,
        Timeline.LoopType.NO_LOOP,
        GameSceneConstants.IMG_CHAR_IDLE_XMAS_idle_start,
        GameSceneConstants.IMG_CHAR_IDLE_XMAS_idle_end,
        undefined,
        ResourceId.IMG_CHAR_IDLE_XMAS
    );

    targetWithOverride.addAnimationEndpoints(
        GameSceneConstants.CharAnimation.IDLE2XMAS,
        0.05,
        Timeline.LoopType.NO_LOOP,
        GameSceneConstants.IMG_CHAR_IDLE_XMAS_idle2_start,
        GameSceneConstants.IMG_CHAR_IDLE_XMAS_idle2_end,
        undefined,
        ResourceId.IMG_CHAR_IDLE_XMAS
    );

    const idle3Sequence = [];
    for (
        frame = GameSceneConstants.IMG_CHAR_ANIMATIONS_idle3_start;
        frame <= GameSceneConstants.IMG_CHAR_ANIMATIONS_idle3_end;
        frame++
    ) {
        idle3Sequence.push(frame);
    }

    for (
        frame = GameSceneConstants.IMG_CHAR_ANIMATIONS_idle3_start;
        frame <= GameSceneConstants.IMG_CHAR_ANIMATIONS_idle3_end;
        frame++
    ) {
        idle3Sequence.push(frame);
    }

    target.addAnimationSequence(
        GameSceneConstants.CharAnimation.IDLE3,
        0.05,
        Timeline.LoopType.NO_LOOP,
        idle3Sequence.length,
        idle3Sequence,
        ResourceId.IMG_CHAR_ANIMATIONS
    );

    if (isJanuary && isHolidayBox) {
        target.addAnimationEndpoints(
            GameSceneConstants.CharAnimation.IDLEPADDINGTON,
            0.05,
            Timeline.LoopType.NO_LOOP,
            GameSceneConstants.IMG_CHAR_ANIMATION_PADDINGTON_start,
            GameSceneConstants.IMG_CHAR_ANIMATION_PADDINGTON_end,
            undefined,
            ResourceId.IMG_CHAR_ANIMATION_PADDINGTON
        );
        const paddingtonTimeline = target.getTimeline(
            GameSceneConstants.CharAnimation.IDLEPADDINGTON
        );
        if (paddingtonTimeline) {
            paddingtonTimeline.onKeyFrame = this.onPaddingtonIdleKeyFrame.bind(this);
        }
        target.setDelay(0.75, 1, GameSceneConstants.CharAnimation.IDLEPADDINGTON);
        target.setDelay(0.75, 2, GameSceneConstants.CharAnimation.IDLEPADDINGTON);

        this.paddingtonFinalFrame = ImageElement.create(
            ResourceId.IMG_CHAR_ANIMATION_PADDINGTON,
            GameSceneConstants.IMG_CHAR_ANIMATION_PADDINGTON_hat
        );
        this.paddingtonFinalFrame.doRestoreCutTransparency();
        this.paddingtonFinalFrame.anchor = Alignment.CENTER;
        this.paddingtonFinalFrame.parentAnchor = Alignment.CENTER;
        this.paddingtonFinalFrame.visible = false;
        target.addChild(this.paddingtonFinalFrame);
    } else {
        this.paddingtonFinalFrame = null;
    }

    target.addAnimationEndpoints(
        GameSceneConstants.CharAnimation.EXCITED,
        0.05,
        Timeline.LoopType.NO_LOOP,
        GameSceneConstants.IMG_CHAR_ANIMATIONS2_excited_start,
        GameSceneConstants.IMG_CHAR_ANIMATIONS2_excited_end,
        undefined,
        ResourceId.IMG_CHAR_ANIMATIONS2
    );
    target.addAnimationEndpoints(
        GameSceneConstants.CharAnimation.PUZZLED,
        0.05,
        Timeline.LoopType.NO_LOOP,
        GameSceneConstants.IMG_CHAR_ANIMATIONS2_puzzled_start,
        GameSceneConstants.IMG_CHAR_ANIMATIONS2_puzzled_end,
        undefined,
        ResourceId.IMG_CHAR_ANIMATIONS2
    );
    target.addAnimationEndpoints(
        GameSceneConstants.CharAnimation.FAIL,
        0.05,
        Timeline.LoopType.NO_LOOP,
        GameSceneConstants.IMG_CHAR_ANIMATIONS3_fail_start,
        GameSceneConstants.IMG_CHAR_ANIMATIONS3_fail_end,
        undefined,
        ResourceId.IMG_CHAR_ANIMATIONS3
    );
    target.addAnimationEndpoints(
        GameSceneConstants.CharAnimation.WIN,
        0.05,
        Timeline.LoopType.NO_LOOP,
        GameSceneConstants.IMG_CHAR_ANIMATIONS_mouth_close_start,
        GameSceneConstants.IMG_CHAR_ANIMATIONS_mouth_close_end,
        undefined,
        ResourceId.IMG_CHAR_ANIMATIONS
    );
    target.addAnimationEndpoints(
        GameSceneConstants.CharAnimation.MOUTH_OPEN,
        0.05,
        Timeline.LoopType.NO_LOOP,
        GameSceneConstants.IMG_CHAR_ANIMATIONS_mouth_open_start,
        GameSceneConstants.IMG_CHAR_ANIMATIONS_mouth_open_end,
        undefined,
        ResourceId.IMG_CHAR_ANIMATIONS
    );
    target.addAnimationEndpoints(
        GameSceneConstants.CharAnimation.MOUTH_CLOSE,
        0.05,
        Timeline.LoopType.NO_LOOP,
        GameSceneConstants.IMG_CHAR_ANIMATIONS_mouth_close_start,
        GameSceneConstants.IMG_CHAR_ANIMATIONS_mouth_close_end,
        undefined,
        ResourceId.IMG_CHAR_ANIMATIONS
    );
    target.addAnimationEndpoints(
        GameSceneConstants.CharAnimation.CHEW,
        0.05,
        Timeline.LoopType.REPLAY,
        GameSceneConstants.IMG_CHAR_ANIMATIONS_chew_start,
        GameSceneConstants.IMG_CHAR_ANIMATIONS_chew_end,
        undefined,
        ResourceId.IMG_CHAR_ANIMATIONS
    );
    target.switchToAnimation(
        GameSceneConstants.CharAnimation.CHEW,
        GameSceneConstants.CharAnimation.WIN,
        0.05
    );
    target.switchToAnimation(
        GameSceneConstants.CharAnimation.PUZZLED,
        GameSceneConstants.CharAnimation.MOUTH_CLOSE,
        0.05
    );
    target.switchToAnimation(
        GameSceneConstants.CharAnimation.IDLE,
        GameSceneConstants.CharAnimation.GREETING,
        0.05
    );
    target.switchToAnimation(
        GameSceneConstants.CharAnimation.IDLE,
        GameSceneConstants.CharAnimation.GREETINGXMAS,
        0.05
    );
    target.switchToAnimation(
        GameSceneConstants.CharAnimation.IDLE,
        GameSceneConstants.CharAnimation.IDLE2,
        0.05
    );
    target.switchToAnimation(
        GameSceneConstants.CharAnimation.IDLE,
        GameSceneConstants.CharAnimation.IDLE3,
        0.05
    );
    target.switchToAnimation(
        GameSceneConstants.CharAnimation.IDLE,
        GameSceneConstants.CharAnimation.IDLEXMAS,
        0.05
    );
    target.switchToAnimation(
        GameSceneConstants.CharAnimation.IDLE,
        GameSceneConstants.CharAnimation.IDLE2XMAS,
        0.05
    );
    target.switchToAnimation(
        GameSceneConstants.CharAnimation.IDLE,
        GameSceneConstants.CharAnimation.EXCITED,
        0.05
    );
    target.switchToAnimation(
        GameSceneConstants.CharAnimation.IDLE,
        GameSceneConstants.CharAnimation.PUZZLED,
        0.05
    );

    // delay greeting by Om-nom when not using January Paddington intro
    if (settings.showGreeting) {
        if (!(isJanuary && isHolidayBox) && !this.nightLevel) {
            this.dd.callObject(this, this.showGreeting, null, 2);
        }
        settings.showGreeting = false;
    }

    if (isJanuary && isHolidayBox) {
        this.playPaddingtonIntro();
    } else if (this.nightLevel) {
        target.playTimeline(GameSceneConstants.CharAnimation.SLEEPING);
    } else {
        target.playTimeline(GameSceneConstants.CharAnimation.IDLE);
    }

    const idle = target.getTimeline(GameSceneConstants.CharAnimation.IDLE);
    if (idle) {
        idle.onKeyFrame = this.onIdleOmNomKeyFrame.bind(this);
    }

    target.setPause(
        GameSceneConstants.IMG_CHAR_ANIMATIONS_mouth_open_end -
            GameSceneConstants.IMG_CHAR_ANIMATIONS_mouth_open_start,
        GameSceneConstants.CharAnimation.MOUTH_OPEN
    );
    this.blink = new Animation();
    this.blink.initTextureWithId(ResourceId.IMG_CHAR_ANIMATIONS);
    this.blink.parentAnchor = Alignment.TOP | Alignment.LEFT;

    this.blink.visible = false;
    this.blink.addAnimationSequence(0, 0.05, Timeline.LoopType.NO_LOOP, 4, [
        GameSceneConstants.IMG_CHAR_ANIMATIONS_blink_start,
        GameSceneConstants.IMG_CHAR_ANIMATIONS_blink_end,
        GameSceneConstants.IMG_CHAR_ANIMATIONS_blink_end,
        GameSceneConstants.IMG_CHAR_ANIMATIONS_blink_end,
    ]);
    this.blink.setAction(ActionType.SET_VISIBLE, this.blink, 0, 0, 2, 0);
    this.blinkTimer = GameSceneConstants.BLINK_SKIP;

    this.blink.doRestoreCutTransparency();
    target.addChild(this.blink);

    const supportQuadIndex = edition.supports?.[LevelState.pack] ?? null;
    const supportResourceId = isHolidayBox
        ? ResourceId.IMG_CHAR_SUPPORTS_XMAS
        : ResourceId.IMG_CHAR_SUPPORTS;
    const supportQuadID = isHolidayBox ? (isJanuary ? 1 : 0) : supportQuadIndex;
    this.support = ImageElement.create(supportResourceId, supportQuadID);
    this.support.doRestoreCutTransparency();
    this.support.anchor = Alignment.CENTER;

    const sx = item.x;
    const sy = item.y;

    const posX = (sx * this.PM + this.PMX) | 0;
    const posY = (sy * this.PM + this.PMY) | 0;
    // Slight downward shift for the taller Paddington chair (January).
    const paddingtonSupportYOffset = isHolidayBox && isJanuary ? 75 : 0;

    this.target.x = posX;
    this.target.y = posY;
    this.support.x = posX;
    this.support.y = posY + paddingtonSupportYOffset;

    this.idlesTimer = MathHelper.randomRange(5, 20);
}
