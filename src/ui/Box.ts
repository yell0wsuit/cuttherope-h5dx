import Easing from "@/ui/Easing";
import Text from "@/visual/Text";
import resolution from "@/resolution";
import platform from "@/config/platforms/platform-web";
import BoxType from "@/ui/BoxType";
import PubSub from "@/utils/PubSub";
import Lang from "@/resources/Lang";
import Alignment from "@/core/Alignment";
import ScoreManager from "@/ui/ScoreManager";
import MenuStringId from "@/resources/MenuStringId";
import edition from "@/config/editions/net-edition";
import settings from "@/game/CTRSettings";
import { IS_XMAS } from "@/utils/SpecialEvents";

// cache upgrade UI elements
/*
let upgradeButton;

function initializeUpgradeButton() {
    upgradeButton = document.getElementById("boxUpgradePlate");
    if (upgradeButton) {
        upgradeButton.style.display = "none";
    }
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeUpgradeButton);
} else {
    initializeUpgradeButton();
}*/

/*function hidePurchaseButton() {
    if (upgradeButton) {
        // Vanilla fade out
        upgradeButton.style.transition = "opacity 200ms";
        upgradeButton.style.opacity = "0";
        setTimeout(() => {
            upgradeButton && (upgradeButton.style.display = "none");
            upgradeButton && (upgradeButton.style.opacity = "1"); // Reset for next time
        }, 200);
    }
}*/

/*function showPurchaseButton() {
    if (upgradeButton) {
        upgradeButton.style.display = "";
        upgradeButton.style.transition = "opacity 200ms";
        upgradeButton.style.opacity = "0";
        // Trigger reflow
        upgradeButton.offsetHeight;
        upgradeButton.style.opacity = "1";
    }
}*/

//PubSub.subscribe(PubSub.ChannelId.SetPaidBoxes, function (/** @type {boolean} */ paid) {
//  if (paid) {
//     hidePurchaseButton();
// }
//});

// localize UI element text
PubSub.subscribe(PubSub.ChannelId.LanguageChanged, () => {
    Text.drawBig({
        text: Lang.menuText(MenuStringId.BUY_FULL_GAME),
        imgParentId: "boxUpgradePlate",
        scale: 0.6 * resolution.UI_TEXT_SCALE,
    });
});

const boxImageBase = platform.boxImageBaseUrl || platform.uiImageBaseUrl;

type SubscriptionHandle = Readonly<{
    name: number;
    callback: (...args: unknown[]) => void;
}>;

class Box {
    index: number;
    islocked: boolean;
    visible: boolean;
    pubSubSubscriptions: SubscriptionHandle[];
    purchased: boolean;
    bounceStartTime: number;
    opacity: number;
    type: string;
    yOffset: number;
    boxImg: HTMLImageElement;
    textImg: HTMLImageElement;
    boxWidth: number;
    boxTextMargin: number;
    textRendered: boolean;
    renderText: () => void;
    reqImg: HTMLImageElement;
    reqStars: number;
    renderReqStars: () => void;
    omNomImg: HTMLImageElement;
    lockImg: HTMLImageElement;
    starImg: HTMLImageElement;
    perfectMark: HTMLImageElement;
    includeBoxNumberInTitle: boolean;

    constructor(
        boxIndex: number,
        bgimg: string | null,
        reqstars: number,
        islocked: boolean,
        type: string
    ) {
        this.index = boxIndex;
        this.islocked = islocked;
        this.visible = true;
        this.pubSubSubscriptions = [];

        // initially we assume all boxes are included in the game
        this.purchased = true;

        this.bounceStartTime = 0;
        this.opacity = 1.0;
        this.type = type;
        this.yOffset = 0; // for special box types

        this.boxImg = new Image();

        if (bgimg) {
            this.boxImg.src = boxImageBase + bgimg;
        }

        const textImg = (this.textImg = new Image());
        const boxWidth = (this.boxWidth = resolution.uiScaledNumber(350));
        const boxTextMargin = (this.boxTextMargin = resolution.uiScaledNumber(20));

        this.textRendered = false;
        this.renderText = () => {
            Text.drawBig({
                text: Lang.boxText(boxIndex, this.includeBoxNumberInTitle),
                img: textImg,
                width: (boxWidth - boxTextMargin * 2) / resolution.UI_TEXT_SCALE,
                alignment: Alignment.HCENTER,
                scaleToUI: true,
            });

            this.textRendered = true;
        };

        this.pubSubSubscriptions.push(
            PubSub.subscribe(PubSub.ChannelId.LanguageChanged, this.renderText)
        );

        this.reqStars = reqstars;
        this.reqImg = new Image();
        this.renderReqStars = () => {
            this.reqImg = Text.drawBig({
                text: String(this.reqStars),
                scaleToUI: true,
            }) as HTMLImageElement;
        };
        this.renderReqStars();

        this.pubSubSubscriptions.push(
            PubSub.subscribe(PubSub.ChannelId.LanguageChanged, this.renderReqStars)
        );

        this.omNomImg = new Image();
        this.omNomImg.src = `${platform.uiImageBaseUrl}box_omnom.webp`;

        this.lockImg = new Image();
        this.lockImg.src = `${platform.uiImageBaseUrl}box_lock.webp`;

        this.starImg = new Image();
        this.starImg.src = `${platform.uiImageBaseUrl}star_result_small.webp`;

        this.perfectMark = new Image();
        this.perfectMark.src = `${platform.uiImageBaseUrl}perfect_mark.webp`;

        this.includeBoxNumberInTitle = true;
    }

    isRequired = (): boolean => {
        return true;
    };

    isGameBox = (): boolean => {
        return true;
    };

    isClickable = (): boolean => {
        return true;
    };

    draw = (ctx: CanvasRenderingContext2D, omnomoffset: number | null): void => {
        const prevAlpha = ctx.globalAlpha;
        if (this.opacity !== prevAlpha) {
            ctx.globalAlpha = this.opacity;
        }

        // render the box
        this.render(ctx, omnomoffset);

        // restore alpha
        if (this.opacity !== prevAlpha) {
            ctx.globalAlpha = prevAlpha;
        }
    };

    render = (ctx: CanvasRenderingContext2D, omnomoffset: number | null): void => {
        const isGameBox = this.isGameBox();
        const yOffset = resolution.uiScaledNumber(this.yOffset || 0);
        const shouldHideLockDetails = this.type === BoxType.HOLIDAY && !IS_XMAS;

        if (isGameBox) {
            // draw the black area
            ctx.fillStyle = "rgb(45,45,53)";
            ctx.fillRect(
                resolution.uiScaledNumber(130),
                resolution.uiScaledNumber(200),
                resolution.uiScaledNumber(140),
                resolution.uiScaledNumber(100)
            );

            // draw omnom
            if (omnomoffset != null) {
                ctx.drawImage(
                    this.omNomImg,
                    omnomoffset + resolution.uiScaledNumber(4),
                    resolution.uiScaledNumber(215)
                );
            }
        }

        // draw the box image
        ctx.drawImage(
            this.boxImg,
            resolution.uiScaledNumber(25),
            resolution.uiScaledNumber(0) + yOffset
        );

        if (isGameBox) {
            // draw the lock
            if (this.islocked) {
                // Get dimensions - prefer naturalWidth/Height, fallback to width/height
                const textWidth = this.reqImg.naturalWidth || this.reqImg.width || 0;
                const textHeight = this.reqImg.naturalHeight || this.reqImg.height || 0;
                const starWidth = this.starImg.naturalWidth || this.starImg.width || 0;

                const starLeftMargin = resolution.uiScaledNumber(-6);
                // center the text and star label
                const labelWidth = textWidth + starLeftMargin + starWidth;
                const labelMaxWidth = resolution.uiScaledNumber(125);
                const labelOffsetX = (labelMaxWidth - labelWidth) / 2;
                const labelMinX = resolution.uiScaledNumber(140);
                const labelX = labelMinX + labelOffsetX;

                // slightly scale the lock image (not quite big enough for our boxes)
                // TODO: should resize lock images for every resolution and remove scaling
                // TODO: also need to normalize the size of boxes (which vary)
                ctx.scale(1.015, 1);
                let lockYOffset = yOffset;
                if (this.type === BoxType.HOLIDAY) {
                    lockYOffset += resolution.uiScaledNumber(26);
                }
                ctx.drawImage(
                    this.lockImg,
                    resolution.uiScaledNumber(23),
                    resolution.uiScaledNumber(155) + lockYOffset
                );
                ctx.scale(1 / 1.015, 1);

                if (this.purchased && !shouldHideLockDetails) {
                    const starHeight = this.starImg.naturalHeight || this.starImg.height || 0;
                    const baseY = resolution.uiScaledNumber(225) + yOffset;

                    // Vertically center the number with the star
                    const textY = 25 + baseY + (starHeight - textHeight) / 2;

                    ctx.drawImage(this.reqImg, labelX, textY, textWidth, textHeight);
                    ctx.drawImage(this.starImg, labelX + textWidth + starLeftMargin, baseY);
                }

                /*
                // DEBUG: draw red dots to show the label boundaries
                ctx.fillStyle= 'red';
                ctx.beginPath();
                ctx.arc(labelMinX, resolution.uiScaledNumber(220), 5, 0, 2*Math.PI, false);
                ctx.fill();

                ctx.beginPath();
                ctx.arc(labelMinX + labelMaxWidth, resolution.uiScaledNumber(220), 5, 0, 2*Math.PI, false);
                ctx.fill();
                */
            }

            // draw the perfect mark if user got every star in the box
            if (
                ScoreManager.achievedStars(this.index) ===
                ScoreManager.possibleStarsForBox(this.index)
            ) {
                ctx.drawImage(
                    this.perfectMark,
                    resolution.uiScaledNumber(260),
                    resolution.uiScaledNumber(250)
                );
            }
        }

        // draw the text
        if (!this.textRendered) {
            this.renderText();
        }

        const textWidth = this.textImg.naturalWidth || this.textImg.width || 0;
        const textHeight = this.textImg.naturalHeight || this.textImg.height || 0;
        const x = Math.trunc(
            resolution.uiScaledNumber(25) +
                this.boxTextMargin +
                (this.boxWidth - this.boxTextMargin * 2 - textWidth) / 2
        );
        const y = resolution.uiScaledNumber(70);

        ctx.drawImage(this.textImg, x, y);
    };

    bounce = (ctx: CanvasRenderingContext2D): void => {
        if (!ctx) {
            return;
        }

        this.bounceStartTime = Date.now();

        // stage boundaries in msec
        const s1 = 100;
        const s2 = 300;
        const s3 = 600;
        const w = resolution.uiScaledNumber(1024);
        const h = resolution.uiScaledNumber(576);

        const renderBounce = () => {
            // get the elapsed time
            const t = Date.now() - this.bounceStartTime;

            let d: number;
            let x = 1.0;
            let y = 1.0;

            if (t < s1) {
                d = Easing.easeOutSine(t, 0, 0.05, s1); // to 0.95
                x = 1.0 - d;
                y = 1.0 + d;
            } else if (t < s2) {
                d = Easing.easeInOutCubic(t - s1, 0, 0.11, s2 - s1); // to 0.95
                x = 0.95 + d;
                y = 1.05 - d;
            } else if (t < s3) {
                // Ease back to 1.0 scale
                d = Easing.easeOutCubic(t - s2, 0, 0.06, s3 - s2);
                x = 1.06 - d;
                y = 0.94 + d;
            }

            const tx = (w - w * x) / 2.0;
            const ty = (h - h * y) / 2.0;
            const sx = (w - 2.0 * tx) / w;
            const sy = (h - 2.0 * ty) / h;

            if (!isNaN(sx) && !isNaN(sy)) {
                ctx.save();
                ctx.setTransform(1, 0, 0, 1, 0, 0);
                ctx.clearRect(
                    resolution.uiScaledNumber(312),
                    resolution.uiScaledNumber(80),
                    resolution.uiScaledNumber(400),
                    resolution.uiScaledNumber(500)
                );
                ctx.restore();

                ctx.save();
                ctx.scale(sx, sy);
                ctx.translate(tx, ty);
                ctx.translate(resolution.uiScaledNumber(312), resolution.uiScaledNumber(130));
                this.draw(ctx, resolution.uiScaledNumber(140));
                ctx.restore();
            }

            if (t > s3) {
                this.bounceStartTime = 0;
            } else {
                window.requestAnimationFrame(renderBounce);
            }
        };

        // start the animation
        renderBounce();
    };

    cancelBounce = (): void => {
        this.bounceStartTime = 0;
    };

    /*onSelected() {
        if (!this.purchased) {
            if (upgradeButton) {
                upgradeButton.classList.toggle("purchaseBox", this.isPurchaseBox || false);
                //showPurchaseButton();
            }
        }
    }*/

    //onUnselected() {
    //hidePurchaseButton();
    //}

    destroy = (): void => {
        if (!this.pubSubSubscriptions) {
            return;
        }

        while (this.pubSubSubscriptions.length) {
            const sub = this.pubSubSubscriptions.pop();
            if (sub) {
                PubSub.unsubscribe(sub);
            }
        }
    };
}

export default Box;
