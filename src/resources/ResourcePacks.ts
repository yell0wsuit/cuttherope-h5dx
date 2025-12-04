import ResourceId from "@/resources/ResourceId";

class ResourcePacks {
    // --- Menu sounds ---
    static StandardMenuSounds = [
        ResourceId.SND_MENU_MUSIC,
        ResourceId.SND_MENU_MUSIC_XMAS,
        ResourceId.SND_BUTTON,
        ResourceId.SND_TAP,
    ];

    // --- Time Travel edition menu sounds ---
    static TimeMenuSounds = [
        ResourceId.SND_TIME_MENU_MUSIC,
        ResourceId.SND_BUTTON,
        ResourceId.SND_TAP,
    ];

    // --- Standard game images ---
    static StandardGameImages = [
        ResourceId.IMG_CHAR_ANIMATIONS,
        ResourceId.IMG_CHAR_ANIMATIONS2,
        ResourceId.IMG_CHAR_ANIMATIONS3,
        ResourceId.IMG_CHAR_GREETINGS_XMAS,
        ResourceId.IMG_CHAR_IDLE_XMAS,
        ResourceId.IMG_XMAS_LIGHTS,
        ResourceId.IMG_OBJ_HOOK_01,
        ResourceId.IMG_OBJ_HOOK_02,
        ResourceId.IMG_OBJ_HOOK_AUTO,
        ResourceId.IMG_OBJ_CANDY_01,
        ResourceId.IMG_OBJ_BOUNCER_01,
        ResourceId.IMG_OBJ_BOUNCER_02,
        ResourceId.IMG_OBJ_BUBBLE_ATTACHED,
        ResourceId.IMG_OBJ_BUBBLE_FLIGHT,
        ResourceId.IMG_OBJ_BUBBLE_POP,
        ResourceId.IMG_OBJ_PUMP,
        ResourceId.IMG_OBJ_SPIDER,
        ResourceId.IMG_OBJ_SPIKES_01,
        ResourceId.IMG_OBJ_SPIKES_02,
        ResourceId.IMG_OBJ_SPIKES_03,
        ResourceId.IMG_OBJ_SPIKES_04,
        ResourceId.IMG_OBJ_STAR_IDLE,
        ResourceId.IMG_OBJ_STAR_DISAPPEAR,
        ResourceId.IMG_HUD_STAR,
        ResourceId.IMG_TUTORIAL_SIGNS,
        ResourceId.IMG_DRAWING_HIDDEN,
        ResourceId.IMG_CHAR_SUPPORTS,
        ResourceId.IMG_CHAR_SUPPORTS_XMAS,
        ResourceId.IMG_OBJ_CANDY_PADDINGTON,
        ResourceId.IMG_SNOWFLAKES,
        ResourceId.IMG_CONFETTI_PARTICLES,
        ResourceId.IMG_OBJ_GHOST,
    ];

    // -- Game resources for Round 5 promo --
    static Round5AdditionalGameImages = [ResourceId.IMG_OBJ_BEE_HD, ResourceId.IMG_OBJ_POLLEN_HD];

    // -- Sound resources for Round 5 promo --
    static Round5AdditionalSounds = [
        ResourceId.SND_BUZZ,
        ResourceId.SND_GRAVITY_OFF,
        ResourceId.SND_GRAVITY_ON,
    ];

    // -- Time Travel edition images --
    static TimeEditionAdditionalGameImages = [
        ResourceId.IMG_OBJ_SOCKS,
        ResourceId.IMG_OBJ_HOOK_MOVABLE,
        ResourceId.IMG_OBJ_ROTATABLE_SPIKES_01,
        ResourceId.IMG_OBJ_ROTATABLE_SPIKES_02,
        ResourceId.IMG_OBJ_ROTATABLE_SPIKES_03,
        ResourceId.IMG_OBJ_ROTATABLE_SPIKES_04,
        ResourceId.IMG_OBJ_ROTATABLE_SPIKES_BUTTON,
    ];

    // -- Time Travel edition sounds --
    static TimeEditionAdditionalSounds = [
        ResourceId.SND_SPIKE_ROTATE_IN,
        ResourceId.SND_SPIKE_ROTATE_OUT,
        ResourceId.SND_TELEPORT,
        ResourceId.SND_CANDY_HIT,
        ResourceId.SND_PREHISTORIC_MONSTER_CHEWING,
        ResourceId.SND_PREHISTORIC_MONSTER_OPEN,
        ResourceId.SND_PREHISTORIC_MONSTER_CLOSE,
        ResourceId.SND_PREHISTORIC_MONSTER_SAD,
    ];

    // -- Full game images --
    static FullGameAdditionalGameImages = [
        ResourceId.IMG_OBJ_HOOK_MOVABLE,
        ResourceId.IMG_OBJ_HOOK_REGULATED,
        ResourceId.IMG_OBJ_ELECTRODES,
        ResourceId.IMG_OBJ_SOCKS,
        ResourceId.IMG_OBJ_ROTATABLE_SPIKES_01,
        ResourceId.IMG_OBJ_ROTATABLE_SPIKES_02,
        ResourceId.IMG_OBJ_ROTATABLE_SPIKES_03,
        ResourceId.IMG_OBJ_ROTATABLE_SPIKES_04,
        ResourceId.IMG_OBJ_ROTATABLE_SPIKES_BUTTON,
        ResourceId.IMG_OBJ_BEE_HD,
        ResourceId.IMG_OBJ_POLLEN_HD,
        ResourceId.IMG_OBJ_VINIL,
        ResourceId.IMG_OBJ_SOCKS_XMAS,
        ResourceId.IMG_CHAR_ANIMATION_PADDINGTON,
    ];

    // --- Game images for Chrome extension ---
    static ChromeLiteAdditionalGameImages = [
        ResourceId.IMG_OBJ_SOCKS,
        ResourceId.IMG_OBJ_HOOK_MOVABLE,
        ResourceId.IMG_OBJ_ELECTRODES,
    ];

    // --- Game sounds for Chrome extension ---
    static ChromeLiteAdditionalGameSounds = [ResourceId.SND_TELEPORT, ResourceId.SND_ELECTRIC];

    // --- Fonts ---
    static StandardFonts = [
        ResourceId.FNT_SMALL_FONT,
        ResourceId.FNT_BIG_FONT,
        ResourceId.FNT_FONT_NUMBERS_BIG,
    ];

    // --- Game sounds ---
    static StandardGameSounds = [
        ResourceId.SND_GAME_MUSIC,
        ResourceId.SND_GAME_MUSIC2,
        ResourceId.SND_GAME_MUSIC3,
        ResourceId.SND_GAME_MUSIC4,
        ResourceId.SND_GAME_MUSIC_XMAS,
        ResourceId.SND_BOUNCER,
        ResourceId.SND_BUBBLE,
        ResourceId.SND_BUBBLE_BREAK,
        ResourceId.SND_CANDY_BREAK,
        ResourceId.SND_CANDY_LINK,
        ResourceId.SND_MONSTER_CHEWING,
        ResourceId.SND_MONSTER_CLOSE,
        ResourceId.SND_MONSTER_OPEN,
        ResourceId.SND_MONSTER_SAD,
        ResourceId.SND_PUMP_1,
        ResourceId.SND_PUMP_2,
        ResourceId.SND_PUMP_3,
        ResourceId.SND_PUMP_4,
        ResourceId.SND_ROPE_BLEAK_1,
        ResourceId.SND_ROPE_BLEAK_2,
        ResourceId.SND_ROPE_BLEAK_3,
        ResourceId.SND_ROPE_BLEAK_4,
        ResourceId.SND_ROPE_GET,
        ResourceId.SND_SPIDER_ACTIVATE,
        ResourceId.SND_SPIDER_FALL,
        ResourceId.SND_SPIDER_WIN,
        ResourceId.SND_STAR_1,
        ResourceId.SND_STAR_2,
        ResourceId.SND_STAR_3,
        ResourceId.SND_WIN,
    ];

    // -- Sound resources for full version --
    static FullGameAdditionalSounds = [
        ResourceId.SND_ELECTRIC,
        ResourceId.SND_GRAVITY_OFF,
        ResourceId.SND_GRAVITY_ON,
        ResourceId.SND_RING,
        ResourceId.SND_WHEEL,
        ResourceId.SND_SPIKE_ROTATE_IN,
        ResourceId.SND_SPIKE_ROTATE_OUT,
        ResourceId.SND_SCRATCH_IN,
        ResourceId.SND_SCRATCH_OUT,
        ResourceId.SND_BUZZ,
        ResourceId.SND_TELEPORT,
        ResourceId.SND_XMAS_BELL,
        ResourceId.SND_TELEPORT_XMAS,
        ResourceId.SND_GHOST_PUFF,
    ];

    // --- Game UI ---
    static StandardMenuImageFilenames = [
        "bBtn_bgd.png",
        "box_lock.png",
        "box_nav_menu.png",
        "box_omnom.png",
        "boxcutter.png",
        "boxmore_bgd.png",
        "buttonsprite.png",
        "fb.png",
        "fBtn_bgd.png",
        "flags.png",
        "fun-omnom.png",
        "gamecomplete.jpg",
        "lBtn_bgd.png",
        "level_bgd.png",
        "level_bgd_small.png",
        "leveltape.png",
        "leveltape_left.png",
        "leveltape_right.png",
        "mBtn_bgd.png",
        "menu_result_en.png",
        "menu_result_fr.png",
        "menu_result_gr.png",
        "menu_result_ru.png",
        "menubg.webp",
        "options_stars_bgd.png",
        "options_stars_bgd_small.png",
        "perfect_mark.png",
        "ph_logo.png",
        "result_line.png",
        "sBtn_bgd.png",
        "shadow.png",
        "star_result.png",
        "star_result_small.png",
        "startbg.webp",
        "taperoll.png",
    ];

    // -- Hidden drawings --
    static DrawingMenuImageFilenames = ["drawing-bg.png"];

    // -- Web edition images --
    static NetDesignResolutionImageNames = [
        "android.png",
        "box.png",
        "comic.png",
        "facebook.png",
        "footer_dot.png",
        "footer_finger.png",
        "full_version_bg.png",
        "full_version_text.png",
        "game_bg.png",
        "ipad.png",
        "iphone.png",
        "more_close.png",
        "more_text.png",
        "more_wallpaper.png",
        "more_window_bg.png",
        "more.png",
        "papercraft.png",
        "privacy.png",
        "shop_over.png",
        "shop.png",
        "terms.png",
        "twitter.png",
        "video_bg.png",
        "youtube.png",
        "zepto.png",
        "zeptologo.png",
    ];
}

export default ResourcePacks;
