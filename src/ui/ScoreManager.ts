import QueryStrings from "@/ui/QueryStrings";
import PubSub from "@/utils/PubSub";
import MathHelper from "@/utils/MathHelper";
import SettingStorage from "@/core/SettingStorage";
import edition from "@/config/editions/net-edition";
import Text from "@/visual/Text";
import Lang from "@/resources/Lang";
import LangId from "@/resources/LangId";
import MenuStringId from "@/resources/MenuStringId";
import RoamSettings from "@/game/RoamSettings";
import BoxType from "@/ui/BoxType";
import { IS_XMAS } from "@/utils/SpecialEvents";

// Helper to add prefix for Holiday Gift box
const getBoxPrefix = (box: number) => {
    const boxType = edition.boxTypes?.[box];
    if (boxType === BoxType.HOLIDAY) {
        return "holidaygiftbox_";
    }
    return "";
};

// we use XOR to obfuscate the level scores to discourage cheats. Doesn't
// prevent hacks - server side code would be necessary for that.

// make the prefixes hard to find in source code
const SCORE_PREFIX = String.fromCharCode(98, 112); // 'bp' (short for box-points)
const STARS_PREFIX = String.fromCharCode(98, 115); // 'bs' (short for box-stars)
// our XOR value is a random number that is stored in an entry that is
// intended to look similar to the score record for a box
const XOR_KEY = SCORE_PREFIX + String.fromCharCode(50, 51, 57, 48);
let XOR_VALUE_TEMP = SettingStorage.getIntOrDefault(XOR_KEY, null);

// create the random value if it doesn't exist
if (XOR_VALUE_TEMP == null) {
    XOR_VALUE_TEMP = MathHelper.randomRange(1000, 10000);
    SettingStorage.set(XOR_KEY, XOR_VALUE_TEMP);
}

const XOR_VALUE: number = XOR_VALUE_TEMP;

// helper functions to get/set score
const getScoreKey = (box: number, level: number) => {
    const val = (box * 1000 + level) ^ XOR_VALUE;
    const key = getBoxPrefix(box) + SCORE_PREFIX + val;

    // make sure we don't overwrite our XOR key
    if (key === XOR_KEY) {
        return `${key}_`;
    }

    return key;
};

const setScore = (box: number, level: number, points: number) => {
    SettingStorage.set(
        getScoreKey(box, level),
        // NOTE: we intentionally swap multiplier to level (key uses box)
        (points + level * 1000 + box) ^ XOR_VALUE
    );

    RoamSettings.setScore(box, level, points);
};

const getScore = (box: number, level: number) => {
    // fetch both roaming and local scores
    const roamScore = RoamSettings.getScore(box, level) || 0;
    const localKey = getScoreKey(box, level);
    const localVal = SettingStorage.getIntOrDefault(localKey, null);
    const localScore = localVal == null ? 0 : (localVal ^ XOR_VALUE) - box - level * 1000;

    return Math.max(roamScore, localScore);
};

// helper functions to get/set stars
const STARS_UNKNOWN = -1; // needs to be a number but can't be null
const getStarsKey = (box: number, level: number) => {
    // NOTE: we intentionally swap multiplier from whats used for points
    const key = (level * 1000 + box) ^ XOR_VALUE;
    return getBoxPrefix(box) + STARS_PREFIX + key;
};
const setStars = (box: number, level: number, stars: number | null) => {
    const localStars = stars == null ? STARS_UNKNOWN : stars;
    SettingStorage.set(
        getStarsKey(box, level),
        // NOTE: we intentionally swap multiplier to box (key uses level)
        (localStars + box * 1000 + level) ^ XOR_VALUE
    );

    if (stars) {
        RoamSettings.setStars(box, level, stars);
    }
};

const getStars = (box: number, level: number): number | null => {
    const roamStars = RoamSettings.getStars(box, level);
    const localKey = getStarsKey(box, level);
    const localVal = SettingStorage.getIntOrDefault(localKey, null);
    const localStars = localVal == null ? null : (localVal ^ XOR_VALUE) - level - box * 1000;

    if (localStars === STARS_UNKNOWN || localStars === null) {
        return roamStars ?? null;
    } else if (roamStars == null) {
        return localStars;
    }

    return Math.max(roamStars, localStars);
};

const resetLevel = (boxIndex: number, levelIndex: number) => {
    // first level gets 0 stars, otherwise null
    const stars = levelIndex === 0 ? 0 : null;

    setStars(boxIndex, levelIndex, stars);
    setScore(boxIndex, levelIndex, 0);
};

class ScoreBox {
    levelCount: number;
    requiredStars: number;
    scores: number[];
    stars: (number | null)[];

    constructor(
        levelCount: number,
        requiredStars: number,
        scores: number[],
        stars: (number | null)[]
    ) {
        this.levelCount = levelCount;
        this.requiredStars = requiredStars;
        this.scores = scores || [];
        this.stars = stars || [];
    }
}

class ScoreManager {
    boxes: ScoreBox[];
    appReady: boolean;
    constructor() {
        this.boxes = [];
        this.appReady = false;

        // Subscribe to events
        PubSub.subscribe(PubSub.ChannelId.SignIn, () => this.load());
        PubSub.subscribe(PubSub.ChannelId.SignOut, () => this.load());
        PubSub.subscribe(PubSub.ChannelId.RoamingDataChanged, () => this.load());
        PubSub.subscribe(PubSub.ChannelId.AppRun, () => {
            this.appReady = true;
        });
        PubSub.subscribe(PubSub.ChannelId.LanguageChanged, () => this.updateTotalScoreText());
    }

    /**
     * Load previous scores from local storage for a specific box
     * @param {number} boxIndex
     * @returns {ScoreBox}
     */
    loadBox(boxIndex: number): ScoreBox {
        // see if the box exists by checking for a level 1 star record
        const boxExists = getStars(boxIndex, 0) !== null;
        const levelCount = edition.boxes[boxIndex]?.levels.length ?? 0;
        const requiredStars = edition.unlockStars[boxIndex] ?? 0;
        const scores = [];
        const stars = [];

        // get (or create) scores and stars from each level
        for (let levelIndex = 0; levelIndex < levelCount; levelIndex++) {
            // if the box doesn't exist
            if (!boxExists) {
                resetLevel(boxIndex, levelIndex);
            }

            scores.push(getScore(boxIndex, levelIndex));
            stars.push(getStars(boxIndex, levelIndex));
        }

        // generate fake (and good) star counts
        if (QueryStrings.createScoresForBox == boxIndex + 1) {
            for (let i = 0; i < levelCount; i++) {
                this.setStars(boxIndex, i, 3, true);
            }
        }

        return new ScoreBox(levelCount, requiredStars, scores, stars);
    }

    load() {
        // clear existing boxes
        this.boxes.length = 0;

        // load box scores
        for (let i = 0, len = edition.boxes.length; i < len; i++) {
            this.boxes[i] = this.loadBox(i);
        }

        // update score text
        if (this.appReady) {
            this.updateTotalScoreText();
        }
    }

    updateTotalScoreText() {
        const text = Lang.menuText(MenuStringId.TOTAL_STARS).replace(
            "%d",
            String(this.totalStars())
        );
        Text.drawBig({ text: text, imgSel: "#boxScore img", scaleToUI: true });
    }

    /**
     * Retrieve the obfuscation value used for score persistence.
     */
    getXorValue(): number {
        return XOR_VALUE;
    }

    boxCount(): number | null {
        if (this.boxes != null) {
            return this.boxes.length;
        }
        return null;
    }

    levelCount(boxIndex: number): number | null {
        const box = this.boxes[boxIndex];
        if (box != null) {
            return box.levelCount;
        }
        return null;
    }

    requiredStars(boxIndex: number): number {
        const box = this.boxes[boxIndex];
        if (box != null) {
            return box.requiredStars;
        }
        return 0;
    }

    achievedStars(boxIndex: number): number {
        const box = this.boxes[boxIndex];
        if (box != null) {
            let count = 0;
            for (let j = 0; j < box.levelCount; j++) {
                const stars = box.stars[j];
                count += stars == null ? 0 : stars;
            }
            return count;
        }
        return 0;
    }

    totalStars(): number {
        let total = 0;
        for (let i = 0; i < this.boxes.length; i++) {
            total += this.achievedStars(i);
        }
        return total;
    }

    possibleStarsForBox(boxIndex: number): number {
        const box = this.boxes[boxIndex];
        if (box != null) {
            return box.levelCount * 3;
        }
        return 0;
    }

    isBoxLocked(boxIndex: number): boolean {
        if (QueryStrings.unlockAllBoxes) {
            return false;
        }

        const isHolidayBox = edition.boxTypes?.[boxIndex] === BoxType.HOLIDAY;
        if (isHolidayBox && !IS_XMAS) {
            return true;
        }
        if (boxIndex === 0 && !isHolidayBox) {
            return false;
        }

        const box = this.boxes[boxIndex];
        if (box != null && this.totalStars() >= this.requiredStars(boxIndex)) {
            return false;
        }
        return true;
    }

    isLevelUnlocked(boxIndex: number, levelindex: number): boolean {
        const box = this.boxes[boxIndex];
        if (QueryStrings.unlockAllBoxes) {
            return true;
        }
        if (box != null) {
            return box.stars[levelindex] != null;
        }
        return false;
    }

    setScore(boxIndex: number, levelIndex: number, levelScore: number, overridePrevious: boolean) {
        const box = this.boxes[boxIndex];
        if (box != null) {
            if (overridePrevious) {
                box.scores[levelIndex] = levelScore;
            } else {
                const prevScore = getScore(boxIndex, levelIndex);
                box.scores[levelIndex] = Math.max(levelScore, prevScore);
            }

            setScore(boxIndex, levelIndex, box.scores[levelIndex]);

            // sum all scores for the box
            const numLevels = box.scores.length;
            let boxScore = 0;
            for (let i = 0; i < numLevels; i++) {
                boxScore += box.scores[i] ?? 0;
            }

            // always report scores since we may have been offline when the
            // previous high score was achieved.
            PubSub.publish(PubSub.ChannelId.UpdateBoxScore, boxIndex, boxScore);
        }
    }

    getScore(boxIndex: number, levelIndex: number): number | null {
        const box = this.boxes[boxIndex];
        if (box != null) {
            return box.scores[levelIndex] ?? null;
        }
        return null;
    }

    setStars(boxIndex: number, levelIndex: number, score: number, overridePrevious: boolean) {
        const previousStars = this.totalStars();
        const box = this.boxes[boxIndex];
        if (box != null) {
            //don't override past high score
            const prevStars = getStars(boxIndex, levelIndex);
            if (prevStars != null && !overridePrevious) {
                box.stars[levelIndex] = Math.max(score, prevStars);
            } else {
                box.stars[levelIndex] = score;
            }
            setStars(boxIndex, levelIndex, box.stars[levelIndex]);
        }

        const newStarCount = this.totalStars();
        if (newStarCount !== previousStars) {
            PubSub.publish(PubSub.ChannelId.StarCountChanged, newStarCount);
        }
    }

    getStars(boxIndex: number, levelIndex: number): number | null {
        const box = this.boxes[boxIndex];
        if (box != null) {
            return box.stars[levelIndex] ?? null;
        }
        return null;
    }

    resetGame() {
        const boxCount = this.boxes.length;

        for (let boxIndex = 0; boxIndex < boxCount; boxIndex++) {
            const box = this.boxes[boxIndex];
            if (!box) {
                continue;
            }
            const levelCount = box.levelCount;
            for (let levelIndex = 0; levelIndex < levelCount; levelIndex++) {
                resetLevel(boxIndex, levelIndex);
                box.stars[levelIndex] = getStars(boxIndex, levelIndex);
                box.scores[levelIndex] = getScore(boxIndex, levelIndex) ?? 0;
            }
        }

        // update score
        this.updateTotalScoreText();
    }
}

// Export singleton instance
export default new ScoreManager();
