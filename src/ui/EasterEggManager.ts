import Text from "@/visual/Text";
import platform from "@/config/platforms/platform-web";
import resolution from "@/resolution";
import Easing from "@/ui/Easing";
import PubSub from "@/utils/PubSub";
import RootController from "@/game/CTRRootController";
import Lang from "@/resources/Lang";
import MenuStringId from "@/resources/MenuStringId";
import { drawOmNom } from "@/ui/EasterEggOmNom";

const canvas = document.querySelector("#e") as HTMLCanvasElement | null;
const devCanvas = document.querySelector("#moreCanvas") as HTMLCanvasElement | null;
const dShareBtn = document.querySelector("#dshareBtn") as HTMLElement | null;
const drawingElement = document.querySelector("#d") as HTMLElement | null;
const moreLink = document.querySelector("#moreLink") as HTMLElement | null;
const d = document.querySelector("#d") as HTMLElement | null;
const dframe = document.querySelector("#dframe") as HTMLElement | null;
const dmsg = document.querySelector("#dmsg") as HTMLElement | null;
const dshareBtn = document.querySelector("#dshareBtn") as HTMLElement | null;
const dpic = document.querySelector("#dpic") as HTMLElement | null;
const gameBtnTray = document.querySelector("#gameBtnTray") as HTMLElement | null;

interface EasterEggFadeOptions {
    from?: number | null;
    to?: number;
    duration?: number;
    delay?: number;
    display?: string;
}

class EasterEggManager {
    domReady!: () => void;
    appReady!: () => void;
    showOmNom!: () => void;
    showDrawing!: (drawingIndex: number) => void;

    constructor() {
        const scaleTo = resolution.uiScaledNumber(2.2);

        const animateElement = (
            element: HTMLElement | null,
            keyframes: Keyframe[] | PropertyIndexedKeyframes,
            options: KeyframeAnimationOptions = {}
        ) => {
            if (!element) {
                return Promise.resolve();
            }
            const animation = element.animate(keyframes, { fill: "forwards", ...options });
            return animation.finished.catch((error) => {
                console.warn("Easter egg animation interrupted", error);
            });
        };
        const fadeElementCustom = (
            element: HTMLElement | null,
            { from = null, to = 1, duration = 200, delay = 0, display }: EasterEggFadeOptions = {}
        ) => {
            if (!element) {
                return Promise.resolve();
            }
            if (display) {
                element.style.removeProperty("display");
                const computedDisplay = window.getComputedStyle(element).display;
                if (computedDisplay === "none") {
                    element.style.display = display;
                }
            }
            const startOpacity =
                from !== null ? from : Number.parseFloat(getComputedStyle(element).opacity) || 0;
            if (from !== null) {
                element.style.opacity = String(from);
            }
            const animation = element.animate([{ opacity: startOpacity }, { opacity: to }], {
                duration,
                delay,
                easing: "linear",
                fill: "forwards",
            });
            return animation.finished
                .catch((error) => {
                    console.warn("Easter egg fade animation interrupted", error);
                })
                .then(() => {
                    if (to === 0 && display === "none") {
                        element.style.display = "none";
                    }
                });
        };
        const toPx = (value: number) => `${value}px`;
        const easings = {
            easeOutBack: "cubic-bezier(0.175, 0.885, 0.32, 1.275)",
            easeInExpo: "cubic-bezier(0.95, 0.05, 0.795, 0.035)",
        };
        let dpicBaseClassName: string | null = null;
        let gameBtnTrayDisplay: string | null = null;

        this.domReady = () => {
            if (canvas) {
                canvas.width = resolution.uiScaledNumber(1024);
                canvas.height = resolution.uiScaledNumber(576);
            }

            if (devCanvas) {
                devCanvas.width = 51;
                devCanvas.height = 51;
            }

            // event handlers

            /*if (dShareBtn) {
                dShareBtn.addEventListener("click", () => {
                    SocialHelper.postToFeed(
                        Lang.menuText(MenuStringId.SHARE_DRAWING),
                        SocialHelper.siteDescription,
                        `${platform.getDrawingBaseUrl()}drawing${drawingNum}.webp`,
                        () => {
                            closeDrawing();
                            return true;
                        }
                    );

                    return false; // cancel bubbling
                });
            }*/

            if (drawingElement) {
                drawingElement.addEventListener("click", () => {
                    closeDrawing();
                });
            }

            if (moreLink) {
                moreLink.addEventListener("mouseenter", () => {
                    if (!omNomShowing) {
                        omNomShowing = true;
                        showDevLinkOmNom(() => {
                            omNomShowing = false;
                        });
                    }
                });
                /*moreLink.addEventListener("click", () => {
                    analytics.atlasAction("SMG_MRTINX_CTR_SITE_BehindtheScenes");
                });*/
            }
        };

        this.appReady = () => {
            // setup (choosing not to use PanelManager for now because of the fade in animation)
            PubSub.subscribe(PubSub.ChannelId.LanguageChanged, () => {
                Text.drawBig({
                    text: Lang.menuText(MenuStringId.FOUND_DRAWING),
                    imgId: "dmsg",
                    scaleToUI: true,
                });
                Text.drawBig({
                    text: Lang.menuText(MenuStringId.SHARE),
                    imgSel: "#dshareBtn img",
                    scaleToUI: true,
                });
            });

            PubSub.subscribe(PubSub.ChannelId.OmNomClicked, this.showOmNom);
            PubSub.subscribe(PubSub.ChannelId.DrawingClicked, (...args: unknown[]) => {
                this.showDrawing(args[0] as number);
            });
        };

        // ------------------------------------------------------------------------
        // Drawings
        // ------------------------------------------------------------------------
        // show a drawing
        let drawingNum: number | null = null;
        this.showDrawing = (drawingIndex: number) => {
            drawingNum = drawingIndex + 1;
            RootController.pauseLevel();

            if (gameBtnTray) {
                if (gameBtnTrayDisplay === null) {
                    const resolvedDisplay = getComputedStyle(gameBtnTray).display;
                    gameBtnTrayDisplay = resolvedDisplay === "none" ? "" : resolvedDisplay;
                }
                gameBtnTray.style.display = "none";
            }

            if (dpic) {
                if (dpicBaseClassName === null) {
                    dpicBaseClassName = dpic.className;
                } else {
                    dpic.className = dpicBaseClassName;
                }
                dpic.classList.add(`drawing${drawingNum}`);
            }

            const frameTopStart = toPx(resolution.uiScaledNumber(100));
            const msgTopStart = toPx(resolution.uiScaledNumber(60));

            if (dframe) {
                dframe.style.top = frameTopStart;
                dframe.style.transform = "scale(0.35)";
                dframe.style.opacity = "0";
            }
            if (dmsg) {
                dmsg.style.top = msgTopStart;
                dmsg.style.transform = "scale(0.5)";
                dmsg.style.opacity = "0";
            }
            if (dshareBtn) {
                dshareBtn.style.opacity = "0";
                dshareBtn.style.pointerEvents = "none";
            }

            fadeElementCustom(d, { from: 0, to: 1, duration: 100, display: "block" }).then(() => {
                if (dframe) {
                    dframe.style.opacity = "1";
                    animateElement(
                        dframe,
                        [
                            { top: frameTopStart, transform: "scale(0.35)" },
                            { top: "0px", transform: "scale(1)" },
                        ],
                        { duration: 350, easing: easings.easeOutBack }
                    ).then(() => {
                        dframe.style.top = "0px";
                        dframe.style.transform = "scale(1)";
                    });
                }
                if (dmsg) {
                    dmsg.style.opacity = "1";
                    animateElement(
                        dmsg,
                        [
                            { top: msgTopStart, transform: "scale(0.5)" },
                            { top: "0px", transform: "scale(1)" },
                        ],
                        { duration: 350, easing: easings.easeOutBack }
                    ).then(() => {
                        dmsg.style.top = "0px";
                        dmsg.style.transform = "scale(1)";
                    });
                }
                if (dshareBtn) {
                    setTimeout(() => {
                        fadeElementCustom(dshareBtn, { from: 0, to: 1, duration: 200 }).then(() => {
                            dshareBtn.style.opacity = "1";
                            dshareBtn.style.pointerEvents = "";
                        });
                    }, 600);
                }
            });
        };

        const closeDrawing = () => {
            if (dpic) {
                dpic.className = dpicBaseClassName || "";
            }

            const targetTop = toPx(resolution.uiScaledNumber(50));

            if (dshareBtn) {
                dshareBtn.style.pointerEvents = "none";
                fadeElementCustom(dshareBtn, { from: 1, to: 0, duration: 200 }).then(() => {
                    dshareBtn.style.opacity = "0";
                });
            }

            animateElement(
                dframe,
                [
                    { top: "0px", transform: "scale(1)" },
                    { top: targetTop, transform: "scale(0.2)" },
                ],
                { duration: 350, easing: easings.easeInExpo }
            ).then(() => {
                if (dframe) {
                    dframe.style.top = targetTop;
                    dframe.style.transform = "scale(0.2)";
                }
            });

            animateElement(
                dmsg,
                [
                    { top: "0px", transform: "scale(1)" },
                    { top: targetTop, transform: "scale(0.2)" },
                ],
                { duration: 350, easing: easings.easeInExpo }
            ).then(() => {
                if (dmsg) {
                    dmsg.style.top = targetTop;
                    dmsg.style.transform = "scale(0.2)";
                }
            });

            setTimeout(() => {
                fadeElementCustom(d, { from: 1, to: 0, duration: 200 }).then(() => {
                    if (d) {
                        d.style.display = "none";
                        d.style.opacity = "";
                    }
                    RootController.resumeLevel();
                    drawingNum = null;
                    if (gameBtnTray) {
                        gameBtnTray.style.removeProperty("display");
                        const computedDisplay = window.getComputedStyle(gameBtnTray).display;
                        if (computedDisplay === "none") {
                            gameBtnTray.style.display = gameBtnTrayDisplay || "";
                        }
                    }
                });
            }, 200);
        };

        // ------------------------------------------------------------------------
        // Om Nom
        // ------------------------------------------------------------------------
        // mouse over for dev link
        let omNomShowing = false;

        const showDevLinkOmNom = (onComplete: () => void) => {
            if (!devCanvas) return;
            const ctx = devCanvas.getContext("2d");
            if (!ctx) return;
            const begin = Date.now();
            const sx = 0.1;
            let sy = 0.1;
            const tx = 0;
            let ty = 0;
            let l = 0;
            let r = 0;
            const dur = 800;

            const sxbegin = sx;
            const sybegin = sy;

            const txbegin = tx;
            const tybegin = ty;

            const s1 = 600;
            const s2 = 400 + s1;
            const s3 = 600 + s2;
            const s4 = 700 + s3;
            const s5 = 500 + s4;
            const s6 = 800 + s5;

            let mod = 0;
            const modflag = false;
            const modt = null;

            const step = () => {
                const now = Date.now(),
                    t = now - begin;

                // zoom up OmNom
                if (t < s1) {
                    sy = 0 - Easing.easeOutBounce(t, 0, 100, s1, 1.5);
                }

                // move his eyes left
                else if (t < s2) {
                    if (t > s1 + 100) {
                        // delay;
                        l = -1 * Easing.easeOutExpo(t - (s1 + 100), 0, 10, s2 - (s1 + 100));
                        r = l;
                    }
                }

                // move his eyes right
                else if (t < s3) {
                    l = -10 + Easing.easeInOutExpo(t - s2, 0, 20, s3 - s2);
                    r = l;
                }

                // move his eyes back
                else if (t < s4) {
                    if (t > s3 + 100) {
                        // delay;
                        l = 10 - Easing.easeInOutExpo(t - (s3 + 100), 0, 10, s4 - (s3 + 100));
                        r = l;
                    }
                }
                //else if (t < s5) {
                //}

                // hide omnom
                else if (t < s6) {
                    ty = Easing.easeOutExpo(t - s5, txbegin, 50, s6 - s5);
                }

                if (t > s1 && t < s3) {
                    mod = Easing.easeInOutBounce(t - s1, 0, 0.02, s3 - s1, 6.0);
                }

                if (t > s3 && t < s5) {
                    mod = 0.02 - Easing.easeInOutBounce(t - s3, 0, 0.02, s5 - s3, 2.0);
                }

                // position in the canvas
                const mx = 0 + tx;
                const my = 75 + ty + sy;

                ctx.save();
                ctx.rotate((30 * Math.PI) / 180);
                drawOmNom(ctx, 0.32, 0.32 + mod, mx, my, l, r);
                ctx.restore();

                // get the next frame
                if (t < s6) {
                    window.requestAnimationFrame(step);
                } else {
                    onComplete();
                }
            };

            window.requestAnimationFrame(step);
        };

        this.showOmNom = () => {
            if (!canvas) {
                return;
            }
            const ctx = canvas.getContext("2d");
            if (!ctx) return;

            RootController.pauseLevel();

            const startAnimation = () => {
                const begin = Date.now();
                let sx = 0.1;
                let sy = 0.1;
                const tx = 0;
                let ty = 0;
                let l = 0;
                let r = 0;
                const dur = 800;

                const sxbegin = sx;
                const sybegin = sy;

                const txbegin = tx;
                const tybegin = ty;

                const s1 = 600;
                const s2 = 400 + s1;
                const s3 = 600 + s2;
                const s4 = 700 + s3;
                const s5 = 500 + s4;
                const s6 = 800 + s5;

                let mod = 0;
                const modflag = false;
                const modt = null;

                const step = () => {
                    const now = Date.now(),
                        t = now - begin;

                    if (t < s1) {
                        sx = Easing.easeOutBounce(t, sxbegin, scaleTo, s1, 1.5);
                        sy = Easing.easeOutBounce(t, sybegin, scaleTo, s1, 1.5);
                    } else if (t < s2) {
                        if (t > s1 + 100) {
                            l =
                                -1 *
                                Easing.easeOutExpo(
                                    t - (s1 + 100),
                                    0,
                                    resolution.uiScaledNumber(10),
                                    s2 - (s1 + 100)
                                );
                            r = l;
                        }
                    } else if (t < s3) {
                        l =
                            resolution.uiScaledNumber(-10) +
                            Easing.easeInOutExpo(t - s2, 0, resolution.uiScaledNumber(20), s3 - s2);
                        r = l;
                    } else if (t < s4) {
                        if (t > s3 + 100) {
                            l =
                                resolution.uiScaledNumber(10) -
                                Easing.easeInOutExpo(
                                    t - (s3 + 100),
                                    0,
                                    resolution.uiScaledNumber(10),
                                    s4 - (s3 + 100)
                                );
                            r = l;
                        }
                    } else if (t < s5) {
                        // intentional
                    } else if (t < s6) {
                        ty = Easing.easeOutExpo(
                            t - s5,
                            tybegin,
                            resolution.uiScaledNumber(300),
                            s6 - s5
                        );
                        const shrink = Easing.easeOutExpo(t - s5, 0, scaleTo - 0.1, s6 - s5);
                        sx = scaleTo - shrink;
                        sy = scaleTo - shrink;
                    }

                    if (t > s1 && t < s3) {
                        mod = Easing.easeInOutBounce(t - s1, 0, 0.1, s3 - s1, 6.0);
                    }

                    if (t > s3 && t < s5) {
                        mod = 0.1 - Easing.easeInOutBounce(t - s3, 0, 0.1, s5 - s3, 2.0);
                    }

                    if (t < s6) {
                        window.requestAnimationFrame(step);
                    } else {
                        fadeElementCustom(canvas, { from: 1, to: 0, duration: 200 }).then(() => {
                            ctx.setTransform(1, 0, 0, 1, 0, 0);
                            ctx.clearRect(0, 0, canvas.width, canvas.height);
                            canvas.style.display = "none";
                        });
                        RootController.resumeLevel();
                    }

                    const mx =
                        tx +
                        (resolution.uiScaledNumber(500) -
                            (sx / scaleTo) * resolution.uiScaledNumber(200));
                    const my =
                        ty +
                        (resolution.uiScaledNumber(600) -
                            (sy / scaleTo) * resolution.uiScaledNumber(400));

                    drawOmNom(ctx, sx, sy + mod, mx, my, l, r);
                };

                window.requestAnimationFrame(step);
            };

            fadeElementCustom(canvas, { from: 0, to: 1, duration: 200, display: "block" }).then(
                startAnimation
            );
        };
    }
}

export default new EasterEggManager();
