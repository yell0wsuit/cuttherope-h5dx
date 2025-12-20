import Box from "@/ui/Box";
import Text from "@/visual/Text";
import resolution from "@/resolution";
import platform from "@/config/platforms/platform-web";
import BoxType from "@/ui/BoxType";
import PubSub from "@/utils/PubSub";
import Lang from "@/resources/Lang";
import Alignment from "@/core/Alignment";
import ScoreManager from "@/ui/ScoreManager";
import MenuStringId from "@/resources/MenuStringId";
import QueryStrings from "@/ui/QueryStrings";
import edition from "@/config/editions/net-edition";
import MathHelper from "@/utils/MathHelper";
import SettingStorage from "@/core/SettingStorage";

// promotion runs from March 4 - April 14 (2013)
// using ticks makes finding hacking more difficult because
// you can't search the code for well known dates
const BoxOpenDates = [
    1362384000000, // Mar 4
    1362985200000, // Mar 11
    1363590000000, // Mar 18
    1364194800000, // Mar 25
    1364799600000, // Apr 1
    1365404400000, // Apr 8
];

// for testing the date locks
/*if (true) {
    BoxOpenDates = [
        new Date(), // open now
        new Date(), // open now
        new Date(), // open now
        1364194800000, // Mar 25
        1364799600000, // Apr 1
        1365404400000, // Apr 8
    ];
}*/

// The random seeds that will be XOR'd with the user's unique value
// to create the keys used to store the status of each box unlock
const BoxKeySeeds = [9240, 7453, 3646, 7305, 5093, 3829];

const LOCK_KEY_PREFIX = String.fromCharCode(98, 107); // prefix is 'bk'
const XOR_VALUE = ScoreManager.getXorValue();

const getLockKey = (boxIndex: number): string => {
    return LOCK_KEY_PREFIX + ((BoxKeySeeds[boxIndex] ?? 0) ^ XOR_VALUE);
};

const isLocked = (boxIndex: number): boolean => {
    const key = getLockKey(boxIndex);
    const value = SettingStorage.getIntOrDefault(key, 0);
    const correctValue = ((BoxKeySeeds[boxIndex] ?? 0) - 1000) ^ XOR_VALUE;

    return value !== correctValue && !QueryStrings.unlockAllBoxes;
};

const unlockBox = (boxIndex: number): void => {
    const key = getLockKey(boxIndex);
    const value = ((BoxKeySeeds[boxIndex] ?? 0) - 1000) ^ XOR_VALUE;

    SettingStorage.set(key, value);
};

let enterCodeButton: HTMLElement | null = null;
document.addEventListener("DOMContentLoaded", () => {
    enterCodeButton = document.getElementById("boxEnterCodeButton");
    if (enterCodeButton) {
        enterCodeButton.style.display = "none";
    }
});

// cache text images shared between boxes
let availableTextImg: HTMLImageElement | null = null;
let collectTextImg: HTMLImageElement | null = null;
let toUnlockTextImg: HTMLImageElement | null = null;
let bkCodeTextImg: HTMLImageElement | null = null;

const MonthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
];

class TimeBox extends Box {
    lockedBoxImg: HTMLImageElement;
    isBkCodeLocked: boolean;
    isTimeLocked: boolean;
    dateImg: HTMLImageElement | null;

    static unlockBox = unlockBox;
    static isLocked = isLocked;

    constructor(
        boxIndex: number,
        bgimg: string | null,
        reqstars: number,
        islocked: boolean,
        type: string
    ) {
        super(boxIndex, bgimg, reqstars, islocked, type);
        this.lockedBoxImg = new Image();
        this.lockedBoxImg.src = this.boxImg.src.replace(".webp", "_locked.webp");
        this.isBkCodeLocked = isLocked(boxIndex);
        this.isTimeLocked =
            QueryStrings.unlockAllBoxes !== true && Date.now() < (BoxOpenDates[boxIndex] ?? 0);
        this.dateImg = null;
    }

    override isClickable = (): boolean => {
        return !this.isTimeLocked && !this.isBkCodeLocked;
    };

    onSelected = (): void => {
        if (!this.isTimeLocked && this.isBkCodeLocked && enterCodeButton) {
            enterCodeButton.style.removeProperty("display");
            const computedDisplay = window.getComputedStyle(enterCodeButton).display;
            if (computedDisplay === "none") {
                enterCodeButton.style.display = "block";
            }
            enterCodeButton.style.transition = "opacity 400ms ease";
            enterCodeButton.style.opacity = "0";
            enterCodeButton.getBoundingClientRect(); // force reflow
            enterCodeButton.style.opacity = "1";
        }
    };

    onUnselected = (): void => {
        if (enterCodeButton) {
            enterCodeButton.style.display = "none";
            enterCodeButton.style.transition = "";
        }
    };

    override render = (ctx: CanvasRenderingContext2D, omnomoffset: number | null): void => {
        const locked = this.islocked || this.isTimeLocked || this.isBkCodeLocked;

        // draw the base box image
        ctx.drawImage(
            locked ? this.lockedBoxImg : this.boxImg,
            resolution.uiScaledNumber(25),
            resolution.uiScaledNumber(0)
        );

        if (this.isTimeLocked) {
            // draw label above date
            if (!availableTextImg) {
                availableTextImg = new Image();
                Text.drawBig({
                    text: "Available starting from",
                    img: availableTextImg,
                    alignment: Alignment.HCENTER,
                    width: resolution.uiScaledNumber(250),
                });
            }
            if (availableTextImg.complete) {
                ctx.drawImage(
                    availableTextImg,
                    resolution.uiScaledNumber(100),
                    resolution.uiScaledNumber(120),
                    availableTextImg.width * 0.8 * resolution.UI_TEXT_SCALE,
                    availableTextImg.height * 0.8 * resolution.UI_TEXT_SCALE
                );
            }

            // draw date the box will open
            if (!this.dateImg) {
                this.dateImg = new Image();
                const openDate = new Date(BoxOpenDates[this.index] ?? 0);
                Text.drawBig({
                    text: `${MonthNames[openDate.getMonth()]} ${openDate.getDate()}`,
                    img: this.dateImg,
                    width: resolution.uiScaledNumber(200),
                    alignment: Alignment.HCENTER,
                });
            }
            if (this.dateImg.complete) {
                ctx.drawImage(
                    this.dateImg,
                    resolution.uiScaledNumber(77),
                    resolution.uiScaledNumber(195),
                    this.dateImg.width * 1.2 * resolution.UI_TEXT_SCALE,
                    this.dateImg.height * 1.2 * resolution.UI_TEXT_SCALE
                );
            }
        } else if (this.isBkCodeLocked) {
            // text label for "Collect"
            if (!bkCodeTextImg) {
                bkCodeTextImg = new Image();
                Text.drawBig({
                    text: "Visit Burger King to get an\n unlock code!",
                    img: bkCodeTextImg,
                    alignment: Alignment.HCENTER,
                    width: resolution.uiScaledNumber(280),
                });

                Text.drawBig({
                    text: "Enter Code",
                    imgParentId: "boxEnterCodeButton",
                    scaleToUI: true,
                });
            }

            if (bkCodeTextImg.complete) {
                ctx.drawImage(
                    bkCodeTextImg,
                    resolution.uiScaledNumber(50),
                    resolution.uiScaledNumber(90)
                );
            }
        } else if (this.islocked) {
            // text label for "Collect"
            if (!collectTextImg) {
                collectTextImg = new Image();
                Text.drawBig({
                    text: "Collect",
                    img: collectTextImg,
                    scaleToUI: true,
                });
            }
            if (collectTextImg.complete) {
                ctx.drawImage(
                    collectTextImg,
                    resolution.uiScaledNumber(143),
                    resolution.uiScaledNumber(108)
                );
            }

            // prefer css dimensions (scaled) for text
            const reqImgWidth = this.reqImg ? this.reqImg.offsetWidth || this.reqImg.width || 0 : 0;
            const reqImgHeight = this.reqImg
                ? this.reqImg.offsetHeight || this.reqImg.height || 0
                : 0;
            const textWidth = reqImgWidth * 1.2;
            const textHeight = reqImgHeight * 1.2;
            // ok to use raw image width for star (image already scaled)
            const starWidth = this.starImg
                ? this.starImg.offsetWidth || this.starImg.width || 0
                : 0;
            const starMargin = resolution.uiScaledNumber(-4);
            // center the text and star label
            const labelWidth = textWidth + starMargin + starWidth;
            const labelMaxWidth = resolution.uiScaledNumber(125);
            const labelOffsetX = (labelMaxWidth - labelWidth) / 2;
            const labelMinX = resolution.uiScaledNumber(140);
            const labelX = labelMinX + labelOffsetX;

            ctx.drawImage(this.starImg, labelX, resolution.uiScaledNumber(160));
            ctx.drawImage(
                this.reqImg,
                labelX + starWidth,
                resolution.uiScaledNumber(150),
                textWidth,
                textHeight
            );

            // text label for "to unlock"
            if (!toUnlockTextImg) {
                toUnlockTextImg = new Image();
                Text.drawBig({
                    text: "to unlock",
                    img: toUnlockTextImg,
                    scaleToUI: true,
                });
            }
            if (toUnlockTextImg.complete) {
                ctx.drawImage(
                    toUnlockTextImg,
                    resolution.uiScaledNumber(130),
                    resolution.uiScaledNumber(204)
                );
            }
        }
    };
}

export default TimeBox;
