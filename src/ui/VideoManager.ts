import edition from "@/config/editions/net-edition";
import resolution from "@/resolution";
import platform from "@/config/platforms/platform-web";
import PanelId from "@/ui/PanelId";
import panelManager from "@/ui/PanelManager";
import settings from "@/game/CTRSettings";
import SoundMgr from "@/game/CTRSoundMgr";
import PubSub from "@/utils/PubSub";
import ScoreManager from "@/ui/ScoreManager";
import { IS_XMAS } from "@/utils/SpecialEvents";
import { fadeIn, fadeOut } from "@/utils/domHelpers";

// Helper function to get the default box index based on holiday period
// During Christmas season (Dec/Jan), default to Holiday Gift Box (index 0)
// Otherwise, default to Cardboard Box (index 1)
const getDefaultBoxIndex = () => (IS_XMAS ? 0 : 1);

const ensureVideoElement = (): HTMLVideoElement | null => {
    let vid = document.getElementById("vid") as HTMLVideoElement | null;
    if (!vid) {
        try {
            vid = document.createElement("video");
        } catch (ex) {
            // creation of the video element occasionally fails in win8
            return null;
        }
        vid.id = "vid";
        vid.className = "ctrPointer";
        document.getElementById("video")?.appendChild(vid);
    }
    return vid;
};

class VideoManager {
    private closeIntroCallback: (() => void) | null = null;

    loadIntroVideo = () => {
        // only load the video if the first level hasn't been played
        const defaultBoxIndex = getDefaultBoxIndex();
        const firstLevelStars = ScoreManager.getStars(defaultBoxIndex, 0) || 0;
        if (firstLevelStars === 0) {
            const vid = ensureVideoElement();
            const size = resolution.VIDEO_WIDTH;
            const extension = platform.getVideoExtension();
            const baseUrl = platform.videoBaseUrl;
            if (vid != null && extension != null) {
                try {
                    vid.src = `${baseUrl}intro_${size}${extension}`;
                    vid.load();
                } catch (ex) {
                    // loading the video sometimes causes an exception on win8
                }
            }
        }
    };

    removeIntroVideo = () => {
        // we want to remove the video element to free up resources
        // as suggested by the IE team
        const defaultBoxIndex = getDefaultBoxIndex();
        const firstLevelStars = ScoreManager.getStars(defaultBoxIndex, 0) || 0;
        if (firstLevelStars > 0) {
            const vid = document.getElementById("vid") as HTMLVideoElement | null;
            if (vid) {
                vid.remove();
            }
        }
    };

    playIntroVideo = (callback: () => void) => {
        // always show the intro video if the 1st level hasn't been played
        const defaultBoxIndex = getDefaultBoxIndex();
        const firstLevelStars = ScoreManager.getStars(defaultBoxIndex, 0) || 0;
        // the video might not exist if the user just reset the game
        // (we don't want to replay it during the same app session)
        const vid = document.getElementById("vid") as HTMLVideoElement | null;

        this.closeIntroCallback = callback;

        if (firstLevelStars === 0 && vid) {
            // make sure we can play the video
            const readyState = vid.readyState;
            if (
                readyState === 2 || // HAVE_CURRENT_DATA (loadeddata)
                readyState === 3 || // HAVE_FUTURE_DATA  (canplay)
                readyState === 4
            ) {
                // HAVE_ENOUGH_DATA  (canplaythrough)

                SoundMgr.pauseMusic();
                fadeIn(vid, 300, "block").then(() => {
                    vid.play();
                });
                vid.addEventListener("ended", this.closeIntroVideo);
                vid.addEventListener("mousedown", this.closeIntroVideo);
                return;
            }
        }

        this.closeIntroVideo();
    };

    closeIntroVideo = () => {
        const vid = document.getElementById("vid") as HTMLVideoElement | null;
        if (vid) {
            fadeOut(vid, 500).then(() => {
                vid.pause();
                vid.currentTime = 0;
            });
        }

        if (this.closeIntroCallback) {
            this.closeIntroCallback();
        }
    };

    loadOutroVideo = () => {
        // we can re-use the same video element used for the intro
        // because we only show the intro video once per session.

        // get the size and supported format extension
        const vid = ensureVideoElement();
        const size = resolution.VIDEO_WIDTH;
        const extension = platform.getVideoExtension();
        const baseUrl = platform.videoBaseUrl;

        // start loading the video
        if (vid != null && extension != null) {
            try {
                vid.src = `${baseUrl}outro_${size}${extension}`;
                vid.load();
            } catch (ex) {
                // loading the video sometimes causes an exception on win8
            }
        }
    };

    playOutroVideo = () => {
        const vid = document.getElementById("vid") as HTMLVideoElement | null;
        if (vid) {
            // make sure we can play the video
            const readyState = vid.readyState;
            if (
                readyState === 2 || // HAVE_CURRENT_DATA (loadeddata)
                readyState === 3 || // HAVE_FUTURE_DATA  (canplay)
                readyState === 4
            ) {
                // HAVE_ENOUGH_DATA  (canplaythrough)

                SoundMgr.pauseMusic();
                if (!SoundMgr.musicEnabled) {
                    vid.volume = 0;
                }
                fadeIn(vid, 300, "block").then(() => {
                    vid.play();
                });
                vid.addEventListener("ended", this.closeOutroVideo);
                vid.addEventListener("mousedown", this.closeOutroVideo);
            } else {
                vid.remove();
                panelManager.showPanel(PanelId.GAMECOMPLETE, false);
            }
        }
    };

    closeOutroVideo = () => {
        panelManager.showPanel(PanelId.GAMECOMPLETE, true);
        const vid = document.getElementById("vid") as HTMLVideoElement | null;
        if (vid) {
            fadeOut(vid, 500).then(() => {
                vid.pause();
                vid.currentTime = 0;
                vid.remove();
            });
        }
    };

    domReady = () => {
        this.loadIntroVideo();
    };
}

const videoManager = new VideoManager();

// reload the intro video when the game progress is cleared
PubSub.subscribe(PubSub.ChannelId.LoadIntroVideo, () => {
    videoManager.loadIntroVideo();
});

export default videoManager;
