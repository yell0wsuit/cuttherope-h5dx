import Rectangle from "@/core/Rectangle";
import type { ResolutionProfile } from "@/types/resolution";

const res2560x1440: ResolutionProfile = {
    /**
     * @const
     * @type {number}
     */
    VIDEO_WIDTH: 1280,

    /**
     * @const
     * @type {number}
     */
    CANVAS_WIDTH: 2560,
    /**
     * @const
     * @type {number}
     */
    CANVAS_HEIGHT: 1440,

    /**
     * @const
     * @type {number}
     */
    CANVAS_SCALE: 1,

    /**
     * @const
     * @type {number}
     */
    UI_IMAGES_SCALE: 2.5,
    /**
     * @const
     * @type {number}
     */
    UI_TEXT_SCALE: 1,
    /**
     * @const
     * @type {number}
     */
    UI_WIDTH: 2560,
    /**
     * @const
     * @type {number}
     */
    UI_HEIGHT: 1440,

    /**
     * @const
     * @type {number}
     */
    BUNGEE_BEZIER_POINTS: 3,

    /**
     * Platform multiplier (maps the height of the level to the height of the canvas).
     * Map height is 480 and canvas height is 576.
     * @const
     * @type {number}
     */
    PM: 3,

    /**
     * Adjusts the y offset for the level
     * @const
     * @type {number}
     */
    PMY: 0,

    /**
     * @const
     * @type {number}
     */
    BUNGEE_REST_LEN: 105,

    /**
     * @const
     * @type {number}
     */
    DEFAULT_BUNGEE_LINE_WIDTH: 10,

    /**
     * @const
     * @type {number}
     */
    DEFAULT_BUNGEE_WIDTH: 6,

    /**
     * @const
     * @type {number}
     */
    CLICK_TO_CUT_SEARCH_RADIUS: 60,

    /**
     * @const
     * @type {number}
     */
    MOVER_SCALE: 3,

    /**
     * @const
     * @type {number}
     */
    STAR_RADIUS: 42,

    /**
     * @const
     * @type {number}
     */
    MOUTH_OPEN_RADIUS: 200,

    /**
     * @const
     * @type {number}
     */
    OUT_OF_SCREEN_ADJUSTMENT_BOTTOM: 400,

    /**
     * @const
     * @type {number}
     */
    OUT_OF_SCREEN_ADJUSTMENT_TOP: -400,

    /**
     * @const
     * @type {Rectangle}
     */
    STAR_DEFAULT_BB: new Rectangle(22, 20, 30, 30),

    /**
     * @const
     * @type {Rectangle}
     */
    STAR_BB: new Rectangle(70, 64, 82, 82),

    /**
     * @const
     * @type {Rectangle}
     */
    TARGET_BB: new Rectangle(264.0, 350.0, 108.0, 2.0),

    // Prehistoric OmNom uses sprites which require a different bounding box
    TARGET2_BB: new Rectangle(192, 278, 108, 2),

    /**
     * @const
     * @type {number}
     */
    TUTORIAL_HAND_TARGET_X_1: 385,
    /**
     * @const
     * @type {number}
     */
    TUTORIAL_HAND_TARGET_X_2: 700,

    /**
     * @const
     * @type {number}
     */
    BUBBLE_SIZE: 85,
    /**
     * @const
     * @type {number}
     */
    BUBBLE_RADIUS: 160,
    /**
     * @const
     * @type {number}
     */
    BUBBLE_TOUCH_OFFSET: 60,
    /**
     * @const
     * @type {number}
     */
    BUBBLE_TOUCH_SIZE: 200,
    /**
     * @const
     * @type {Rectangle}
     */
    BUBBLE_BB: new Rectangle(48, 48, 152, 152),

    /**
     * @const
     * @type {number}
     */
    BUBBLE_IMPULSE_Y: -35,
    /**
     * @const
     * @type {number}
     */
    BUBBLE_IMPULSE_RD: 14,
    /**
     * @const
     * @type {number}
     */
    STAR_SPIKE_RADIUS: 15,

    /**
     * @const
     * @type {number}
     */
    BOUNCER_RADIUS: 40,

    /**
     * @const
     * @type {number}
     */
    BOUNCER_MAX_MOVEMENT: 680,
    /**
     * @const
     * @type {number}
     */
    LANTERN_CAPTURE_RADIUS: 82,
    /**
     * @const
     * @type {number}
     */
    LANTERN_TOUCH_RADIUS: 85,

    /**
     * @const
     * @type {number}
     */
    PUMP_POWER_RADIUS: 624,
    /**
     * @const
     * @type {Rectangle}
     */
    PUMP_BB: new Rectangle(250, 250, 300, 300),
    /**
     * @const
     * @type {number}
     */
    PUMP_DIRT_SPEED: 2500,
    /**
     * @const
     * @type {number}
     */
    PUMP_DIRT_PARTICLE_SIZE: 15,
    /**
     * @const
     * @type {number}
     */
    PUMP_DIRT_OFFSET: 100,

    /**
     * @const
     * @type {number}
     */
    CANDY_BUBBLE_TUTORIAL_LIMIT_Y: 300,
    /**
     * @const
     * @type {number}
     */
    CANDY_BUBBLE_TUTORIAL_LIMIT_X: 1400,
    /**
     * @const
     * @type {Rectangle}
     */
    CANDY_BB: new Rectangle(142, 157, 112, 104),
    /**
     * @const
     * @type {Rectangle}
     */
    CANDY_LR_BB: new Rectangle(155, 176, 88, 76),

    /**
     * @const
     * @type {number}
     */
    GRAB_RADIUS_ALPHA: 1,
    /**
     * @const
     * @type {number}
     */
    GRAB_WHEEL_RADIUS: 110,
    /**
     * @const
     * @type {number}
     */
    GRAB_WHEEL_MAX_ROTATION: 5.625,
    /**
     * @const
     * @type {number}
     */
    GRAB_WHEEL_SCALE_DIVISOR: 1400,
    /**
     * @const
     * @type {number}
     */
    GRAB_ROPE_ROLL_MAX_LENGTH: 1650,
    /**
     * @const
     * @type {number}
     */
    GRAB_MOVE_BG_WIDTH: 142,
    /**
     * @const
     * @type {number}
     */
    GRAB_MOVE_BG_X_OFFSET: 74,
    /**
     * @const
     * @type {number}
     */
    GRAB_MOVE_RADIUS: 65,
    /**
     * @const
     * @type {number}
     */
    SPIDER_SPEED: 117,
    /**
     * @const
     * @type {number}
     */
    SOCK_LIGHT_Y: 270,
    /**
     * @const
     * @type {number}
     */
    SOCK_WIDTH: 140,
    /**
     * @const
     * @type {number}
     */
    SOCK_ROTATION_Y_OFFSET: 15,
    /**
     * @const
     * @type {number}
     */
    STAR_SOCK_RADIUS: 40,
    /**
     * @const
     * @type {number}
     */
    SOCK_TELEPORT_Y: -16,

    /**
     * @const
     * @type {number}
     */
    POLLEN_MIN_DISTANCE: 44,
    /**
     * @const
     * @type {number}
     */
    POLLEN_MAX_OFFSET: 4,

    /**
     * @const
     * @type {number}
     */
    RC_CONTROLLER_RADIUS: 90,

    /**
     * @const
     * @type {number}
     */
    IGNORE_TOUCHES_DISTANCE: 100,
    /**
     * @const
     * @type {number}
     */
    PREVIEW_CAMERA_SPEED: 800,
    /**
     * @const
     * @type {number}
     */
    PREVIEW_CAMERA_SPEED2: 400,
    /**
     * @const
     * @type {number}
     */
    MAX_PREVIEW_CAMERA_SPEED: 1000,
    /**
     * @const
     * @type {number}
     */
    MIN_PREVIEW_CAMERA_SPEED: 300,
    /**
     * @const
     * @type {number}
     */
    CAMERA_SPEED_THRESHOLD: 5500,
    /**
     * @const
     * @type {number}
     */
    CAMERA_SPEED: 14,
    /**
     * @const
     * @type {number}
     */
    CUT_MAX_SIZE: 12,
    /**
     * @const
     * @type {number}
     */
    PHYSICS_SPEED_MULTIPLIER: 1.4,
};

export default res2560x1440;
