import Rectangle from "@/core/Rectangle";
import res2560x1440 from "@/config/resolutions/2560x1440";
import type { ResolutionProfile } from "@/types/resolution";

const initProfile = (
    base: ResolutionProfile,
    partial: Partial<ResolutionProfile>
): ResolutionProfile & { uiScaledNumber(n: number): number } => {
    /**
     * This function mutates a partial profile by filling in all missing properties
     * from the base profile, scaled appropriately. The cast is necessary because
     * TypeScript can't track that we're filling in all required properties.
     * After this function runs, the partial becomes a complete ResolutionProfile.
     */
    const target = partial as ResolutionProfile & { uiScaledNumber?: (n: number) => number };

    const scale = target.CANVAS_SCALE;

    target.BUNGEE_REST_LEN = base.BUNGEE_REST_LEN * scale;
    target.MOVER_SCALE = base.MOVER_SCALE * scale;
    target.STAR_RADIUS = base.STAR_RADIUS * scale;
    target.MOUTH_OPEN_RADIUS = base.MOUTH_OPEN_RADIUS * scale;
    target.OUT_OF_SCREEN_ADJUSTMENT_TOP = base.OUT_OF_SCREEN_ADJUSTMENT_TOP * scale;
    target.OUT_OF_SCREEN_ADJUSTMENT_BOTTOM = base.OUT_OF_SCREEN_ADJUSTMENT_BOTTOM * scale;
    target.CLICK_TO_CUT_SEARCH_RADIUS = base.CLICK_TO_CUT_SEARCH_RADIUS * scale;

    target.TARGET_BB = Rectangle.scaleCopy(base.TARGET_BB, scale);
    target.TARGET2_BB = Rectangle.scaleCopy(base.TARGET2_BB, scale);

    target.TUTORIAL_HAND_TARGET_X_1 = base.TUTORIAL_HAND_TARGET_X_1 * scale;
    target.TUTORIAL_HAND_TARGET_X_2 = base.TUTORIAL_HAND_TARGET_X_2 * scale;

    target.BUBBLE_SIZE = base.BUBBLE_SIZE * scale;
    target.BUBBLE_TOUCH_OFFSET = base.BUBBLE_TOUCH_OFFSET * scale;
    target.BUBBLE_TOUCH_SIZE = base.BUBBLE_TOUCH_SIZE * scale;
    target.BUBBLE_BB = Rectangle.scaleCopy(base.BUBBLE_BB, scale);
    target.BUBBLE_RADIUS = base.BUBBLE_RADIUS * scale;

    target.STAR_SPIKE_RADIUS = base.STAR_SPIKE_RADIUS * scale;
    target.STAR_BB = Rectangle.scaleCopy(base.STAR_BB, scale);
    target.STAR_DEFAULT_BB = Rectangle.scaleCopy(base.STAR_DEFAULT_BB, scale);

    target.BOUNCER_RADIUS = base.BOUNCER_RADIUS * scale;
    target.LANTERN_CAPTURE_RADIUS = base.LANTERN_CAPTURE_RADIUS * scale;
    target.LANTERN_TOUCH_RADIUS = base.LANTERN_TOUCH_RADIUS * scale;

    if (base.PUMP_POWER_RADIUS !== undefined) {
        const scaledPumpPower = base.PUMP_POWER_RADIUS * scale;
        target.PUMP_POWER_RADIUS = target.PUMP_POWER_RADIUS ?? scaledPumpPower;
    }
    target.PUMP_BB = Rectangle.scaleCopy(base.PUMP_BB, scale);
    target.PUMP_DIRT_OFFSET = base.PUMP_DIRT_OFFSET * scale;

    target.CANDY_BB = Rectangle.scaleCopy(base.CANDY_BB, scale);
    target.CANDY_LR_BB = Rectangle.scaleCopy(base.CANDY_LR_BB, scale);
    target.CANDY_BUBBLE_TUTORIAL_LIMIT_Y = base.CANDY_BUBBLE_TUTORIAL_LIMIT_Y * scale;
    target.CANDY_BUBBLE_TUTORIAL_LIMIT_X = base.CANDY_BUBBLE_TUTORIAL_LIMIT_X * scale;

    target.IGNORE_TOUCHES_DISTANCE = base.IGNORE_TOUCHES_DISTANCE * scale;
    target.PREVIEW_CAMERA_SPEED = base.PREVIEW_CAMERA_SPEED * scale;
    target.PREVIEW_CAMERA_SPEED2 = base.PREVIEW_CAMERA_SPEED2 * scale;
    target.MAX_PREVIEW_CAMERA_SPEED = base.MAX_PREVIEW_CAMERA_SPEED * scale;
    target.MIN_PREVIEW_CAMERA_SPEED = base.MIN_PREVIEW_CAMERA_SPEED * scale;
    target.CAMERA_SPEED_THRESHOLD = base.CAMERA_SPEED_THRESHOLD * scale;
    target.CAMERA_SPEED = base.CAMERA_SPEED * scale;

    target.GRAB_WHEEL_MAX_ROTATION = base.GRAB_WHEEL_MAX_ROTATION * scale;
    target.GRAB_WHEEL_SCALE_DIVISOR = base.GRAB_WHEEL_SCALE_DIVISOR * scale;
    target.GRAB_WHEEL_RADIUS = base.GRAB_WHEEL_RADIUS * scale;
    target.GRAB_ROPE_ROLL_MAX_LENGTH = base.GRAB_ROPE_ROLL_MAX_LENGTH * scale;
    target.GRAB_MOVE_BG_WIDTH = base.GRAB_MOVE_BG_WIDTH * scale;
    target.GRAB_MOVE_BG_X_OFFSET = base.GRAB_MOVE_BG_X_OFFSET * scale;
    target.GRAB_MOVE_RADIUS = base.GRAB_MOVE_RADIUS * scale;
    target.SPIDER_SPEED = base.SPIDER_SPEED * scale;

    target.POLLEN_MIN_DISTANCE = base.POLLEN_MIN_DISTANCE * scale;
    target.POLLEN_MAX_OFFSET = base.POLLEN_MAX_OFFSET * scale;

    target.RC_CONTROLLER_RADIUS = base.RC_CONTROLLER_RADIUS * scale;

    target.SOCK_LIGHT_Y = base.SOCK_LIGHT_Y * scale;
    target.SOCK_WIDTH = base.SOCK_WIDTH * scale;
    target.SOCK_ROTATION_Y_OFFSET = base.SOCK_ROTATION_Y_OFFSET * scale;
    target.STAR_SOCK_RADIUS = base.STAR_SOCK_RADIUS * scale;
    target.SOCK_TELEPORT_Y = base.SOCK_TELEPORT_Y * scale;

    target.CUT_MAX_SIZE = base.CUT_MAX_SIZE * scale;

    target.uiScaledNumber = (n: number): number => Math.round(n * target.UI_IMAGES_SCALE);

    return target as ResolutionProfile & { uiScaledNumber(n: number): number };
};

const initProfileFromMac = (
    partial: Partial<ResolutionProfile>
): ResolutionProfile & { uiScaledNumber(n: number): number } => {
    return initProfile(res2560x1440, partial);
};

export default initProfileFromMac;
