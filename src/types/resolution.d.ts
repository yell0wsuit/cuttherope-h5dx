import type Rectangle from "@/core/Rectangle";

/**
 * Base resolution profile containing scaled game constants.
 * Properties marked with ? are optional and only present in some resolution profiles.
 */
export interface ResolutionProfile {
    // Canvas dimensions
    VIDEO_WIDTH: number;
    CANVAS_WIDTH: number;
    CANVAS_HEIGHT: number;
    CANVAS_SCALE: number;

    // UI scaling
    UI_IMAGES_SCALE: number;
    UI_TEXT_SCALE: number;
    UI_WIDTH: number;
    UI_HEIGHT: number;

    // Bungee/rope properties
    BUNGEE_BEZIER_POINTS: number;
    DEFAULT_BUNGEE_LINE_WIDTH: number;
    DEFAULT_BUNGEE_WIDTH: number;
    BUNGEE_REST_LEN: number;

    // Platform multipliers
    PM: number;
    PMY: number;

    // Grab/spider mechanics
    GRAB_RADIUS_ALPHA: number;
    GRAB_WHEEL_RADIUS: number;
    GRAB_WHEEL_MAX_ROTATION: number;
    GRAB_WHEEL_SCALE_DIVISOR: number;
    GRAB_ROPE_ROLL_MAX_LENGTH: number;
    GRAB_MOVE_BG_WIDTH: number;
    GRAB_MOVE_BG_X_OFFSET: number;
    GRAB_MOVE_RADIUS: number;
    SPIDER_SPEED: number;

    // Bubble physics
    BUBBLE_IMPULSE_Y: number;
    BUBBLE_IMPULSE_RD: number;
    BUBBLE_SIZE: number;
    BUBBLE_RADIUS: number;
    BUBBLE_TOUCH_OFFSET: number;
    BUBBLE_TOUCH_SIZE: number;
    BUBBLE_BB: Rectangle;

    // Bouncer/pump
    BOUNCER_MAX_MOVEMENT: number;
    BOUNCER_RADIUS: number;

    PUMP_POWER_RADIUS?: number;
    PUMP_BB: Rectangle;
    PUMP_DIRT_SPEED: number;
    PUMP_DIRT_PARTICLE_SIZE: number;
    PUMP_DIRT_OFFSET: number;

    // Physics
    PHYSICS_SPEED_MULTIPLIER: number;

    // Mover/camera
    MOVER_SCALE: number;
    PREVIEW_CAMERA_SPEED: number;
    PREVIEW_CAMERA_SPEED2: number;
    MAX_PREVIEW_CAMERA_SPEED: number;
    MIN_PREVIEW_CAMERA_SPEED: number;
    CAMERA_SPEED_THRESHOLD: number;
    CAMERA_SPEED: number;

    // Star/candy mechanics
    STAR_RADIUS: number;
    STAR_SPIKE_RADIUS: number;
    STAR_BB: Rectangle;
    STAR_DEFAULT_BB: Rectangle;
    STAR_SOCK_RADIUS: number;
    MOUTH_OPEN_RADIUS: number;
    CANDY_BB: Rectangle;
    CANDY_LR_BB: Rectangle;
    CANDY_BUBBLE_TUTORIAL_LIMIT_Y: number;
    CANDY_BUBBLE_TUTORIAL_LIMIT_X: number;

    // Target/bounding boxes
    TARGET_BB: Rectangle;
    TARGET2_BB: Rectangle;

    // Sock mechanics
    SOCK_LIGHT_Y: number;
    SOCK_WIDTH: number;
    SOCK_ROTATION_Y_OFFSET: number;
    SOCK_TELEPORT_Y: number;

    // Pollen
    POLLEN_MIN_DISTANCE: number;
    POLLEN_MAX_OFFSET: number;

    // Rotated circle controller
    RC_CONTROLLER_RADIUS: number;

    // Screen adjustments
    OUT_OF_SCREEN_ADJUSTMENT_BOTTOM: number;
    OUT_OF_SCREEN_ADJUSTMENT_TOP: number;

    // Input/interaction
    IGNORE_TOUCHES_DISTANCE: number;
    CLICK_TO_CUT_SEARCH_RADIUS: number;
    CUT_MAX_SIZE: number;

    // Tutorial
    TUTORIAL_HAND_TARGET_X_1: number;
    TUTORIAL_HAND_TARGET_X_2: number;

    // Lantern
    LANTERN_CAPTURE_RADIUS: number;
    LANTERN_TOUCH_RADIUS: number;

    // Added by scaleResolution function
    uiScaledNumber?: (n: number) => number;
}

declare global {
    interface Window {
        resolution: ResolutionProfile;
    }
}
