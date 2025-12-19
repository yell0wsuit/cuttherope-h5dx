import BaseElement from "@/visual/BaseElement";
import Animation from "@/visual/Animation";
import AnimationPool from "@/visual/AnimationPool";
import BackgroundTileMap from "@/visual/BackgroundTileMap";
import Camera2D from "@/visual/Camera2D";
import ConstrainedPoint from "@/physics/ConstrainedPoint";
import Constants from "@/utils/Constants";
import GameObject from "@/visual/GameObject";
import * as GameSceneConstants from "@/gameScene/constants";
import LevelState from "@/game/LevelState";
import ResourceId from "@/resources/ResourceId";
import DelayedDispatcher from "@/utils/DelayedDispatcher";
import settings from "@/game/CTRSettings";
import edition from "@/config/editions/net-edition";
import BoxType from "@/ui/BoxType";
import { IS_XMAS, IS_JANUARY } from "@/utils/SpecialEvents";
import resolution from "@/resolution";
import LangId from "@/resources/LangId";
import type Texture2D from "@/core/Texture2D";
import type FingerCut from "@/game/FingerCut";
import type EarthImage from "@/game/EarthImage";
import type Grab from "@/game/Grab";
import type Bubble from "@/game/Bubble";
import type Pump from "@/game/Pump";
import type Sock from "@/game/Sock";
import type CTRGameObject from "@/game/CTRGameObject";
import type TutorialText from "@/game/TutorialText";
import type Drawing from "@/game/Drawing";
import type Bouncer from "@/game/Bouncer";
import type RotatedCircle from "@/game/RotatedCircle";
import type PollenDrawer from "@/game/PollenDrawer";
import type GravityButton from "@/game/GravityButton";
import type ImageElement from "@/visual/ImageElement";
import type Star from "@/game/Star";
import type Spikes from "@/game/Spikes";
import type Ghost from "@/game/Ghost";
import type SteamTube from "@/game/SteamTube";
import { initAnimations } from "./initGameScene/initAnimations";
import { initBackground } from "./initGameScene/initBackground";
import { resetGameState } from "./initGameScene/resetGameState";
import { initCandy } from "./initGameScene/initCandy";
import { initCandyBubbles } from "./initGameScene/initCandyBubbles";
import { initPostLoad } from "./initGameScene/initPostLoad";
import { initLevelLabel } from "./initGameScene/initLevelLabel";
import { resetHudStars } from "./initGameScene/resetHudStars";
import Alignment from "@/core/Alignment";
import Rectangle from "@/core/Rectangle";
import RGBAColor from "@/core/RGBAColor";
import Vector from "@/core/Vector";
import SoundMgr from "@/game/CTRSoundMgr";
import MathHelper from "@/utils/MathHelper";
import KeyFrame from "@/visual/KeyFrame";
import Timeline from "@/visual/Timeline";

type PartsTypeValue =
    (typeof GameSceneConstants.PartsType)[keyof typeof GameSceneConstants.PartsType];
type RestartStateValue =
    (typeof GameSceneConstants.RestartState)[keyof typeof GameSceneConstants.RestartState];
type CameraMoveValue =
    (typeof GameSceneConstants.CameraMove)[keyof typeof GameSceneConstants.CameraMove];

abstract class GameSceneInit extends BaseElement {
    // Init methods imported from initGameScene folder
    initAnimations = initAnimations;
    initBackground = initBackground;
    resetGameState = resetGameState;
    initCandy = initCandy;
    initCandyBubbles = initCandyBubbles;
    initPostLoad = initPostLoad;
    initLevelLabel = initLevelLabel;
    resetHudStars = resetHudStars;

    dd: typeof DelayedDispatcher;
    initialCameraToStarDistance: number;
    restartState: RestartStateValue | number;
    aniPool: AnimationPool;
    staticAniPool: AnimationPool;
    camera: Camera2D;
    starsCollected: number;
    hudStars: Animation[];
    starDisappearPool: Animation[];
    slastTouch: Vector;
    fingerCuts: FingerCut[][];
    clickToCut: boolean;
    PM: number;
    PMY: number;
    PMX: number;
    earthAnims: EarthImage[];
    paddingtonFinalFrame: ImageElement | null;
    pendingPaddingtonIdleTransition: boolean;
    lastCandyRotateDelta: number;
    lastCandyRotateDeltaL: number;
    lastCandyRotateDeltaR: number;
    attachCount: number;
    juggleTimer: number;
    dragging: boolean[];
    startPos: Vector[];
    prevStartPos: Vector[];
    bubbleDisappear!: Animation;
    bgTexture: Texture2D | null;
    overlayTexture: Texture2D | null;
    back!: BackgroundTileMap;
    gravityButton: GravityButton | null;
    gravityTouchDown: number;
    twoParts: PartsTypeValue;
    partsDist: number;
    targetSock: Sock | null;
    bungees: Grab[];
    razors: BaseElement[];
    spikes: Spikes[];
    stars: (Star | null)[];
    bubbles: Bubble[];
    pumps: Pump[];
    tubes: SteamTube[];
    rockets: { update(delta: number): void }[];
    socks: Sock[];
    ghosts: Ghost[];
    tutorialImages: CTRGameObject[];
    tutorials: TutorialText[];
    drawings: Drawing[];
    bouncers: Bouncer[];
    rotatedCircles: RotatedCircle[];
    pollenDrawer: PollenDrawer | null;
    star: ConstrainedPoint;
    starL: ConstrainedPoint;
    starR: ConstrainedPoint;
    candyResourceId: number;
    candy: GameObject;
    candyMain: GameObject;
    candyTop: GameObject;
    candyBlink: Animation;
    candyBubbleAnimation: Animation;
    candyBubbleAnimationL?: Animation;
    candyBubbleAnimationR?: Animation;
    candyGhostBubbleAnimation?: Animation;
    candyGhostBubbleAnimationL?: Animation;
    candyGhostBubbleAnimationR?: Animation;
    candyBubble: Bubble | null;
    candyBubbleL: Bubble | null;
    candyBubbleR: Bubble | null;
    candyL!: GameObject;
    candyR!: GameObject;
    tummyTeasers: number;
    mouthOpen: boolean;
    noCandy: boolean;
    noCandyL: boolean;
    noCandyR: boolean;
    spiderTookCandy: boolean;
    time: number;
    score: number;
    gravityNormal: boolean;
    dimTime: number;
    ropesCutAtOnce: number;
    ropesAtOnceTimer: number;
    blink!: Animation;
    blinkTimer!: number;
    idlesTimer!: number;
    target!: GameObject;
    support!: ImageElement;
    mapWidth: number;
    mapHeight: number;
    special: number;
    ropePhysicsSpeed: number;
    nightLevel: number;
    ignoreTouches: boolean;
    fastenCamera: boolean;
    freezeCamera: boolean;
    cameraMoveMode: CameraMoveValue;
    animateRestartDim: boolean;
    savedSockSpeed: number;
    timeBonus: number;
    starBonus: number;
    gameController!: {
        avgDelta: number;
        onLevelWon(): void;
        onLevelLost(): void;
    };
    attachCandy!: () => void;
    resetBungeeHighlight!: () => void;
    rotateAllSpikesWithId!: (id: number) => void;
    onButtonPressed!: (id: number) => void;
    constructor() {
        super();
        this.dd = DelayedDispatcher;

        this.initialCameraToStarDistance = Constants.UNDEFINED;
        this.restartState = Constants.UNDEFINED;

        this.aniPool = new AnimationPool();
        this.aniPool.visible = false;
        this.addChild(this.aniPool);

        this.staticAniPool = new AnimationPool();
        this.staticAniPool.visible = false;
        this.addChild(this.staticAniPool);

        this.camera = new Camera2D(resolution.CAMERA_SPEED, Camera2D.SpeedType.DELAY);

        this.starsCollected = 0;
        this.hudStars = [];
        this.starDisappearPool = [];

        for (let i = 0; i < GameSceneConstants.HUD_STARS_COUNT; i++) {
            const hs = new Animation();
            this.hudStars[i] = hs;
            hs.initTextureWithId(ResourceId.IMG_HUD_STAR);
            hs.doRestoreCutTransparency();
            hs.addAnimationDelay(
                0.05,
                Timeline.LoopType.NO_LOOP,
                GameSceneConstants.IMG_HUD_STAR_Frame_1,
                GameSceneConstants.IMG_HUD_STAR_Frame_10
            );
            hs.setPause(
                GameSceneConstants.IMG_HUD_STAR_Frame_10 - GameSceneConstants.IMG_HUD_STAR_Frame_1,
                0
            );
            hs.x = 10 + (hs.width + 5) * i;
            hs.y = 8;
            this.addChild(hs);
        }

        this.slastTouch = Vector.newZero();
        this.fingerCuts = Array.from({ length: Constants.MAX_TOUCHES }, () => []);

        this.clickToCut = settings.getClickToCut();

        this.PM = resolution.PM;
        this.PMY = resolution.PMY;
        this.PMX = 0;

        this.earthAnims = [];
        this.paddingtonFinalFrame = null;
        this.pendingPaddingtonIdleTransition = false;

        this.lastCandyRotateDelta = 0;
        this.lastCandyRotateDeltaL = 0;
        this.lastCandyRotateDeltaR = 0;

        this.attachCount = 0;
        this.juggleTimer = 0;

        this.dragging = Array.from({ length: Constants.MAX_TOUCHES }, () => false);
        this.startPos = Array.from({ length: Constants.MAX_TOUCHES }, () => Vector.newZero());
        this.prevStartPos = Array.from({ length: Constants.MAX_TOUCHES }, () => Vector.newZero());

        this.bgTexture = null;
        this.overlayTexture = null;
        this.gravityButton = null;
        this.gravityTouchDown = Constants.UNDEFINED;
        this.twoParts = GameSceneConstants.PartsType.NONE;
        this.partsDist = 0;
        this.targetSock = null;
        this.bungees = [];
        this.razors = [];
        this.spikes = [];
        this.stars = [];
        this.bubbles = [];
        this.pumps = [];
        this.rockets = [];
        this.socks = [];
        this.ghosts = [];
        this.tutorialImages = [];
        this.tutorials = [];
        this.drawings = [];
        this.bouncers = [];
        this.rotatedCircles = [];
        this.pollenDrawer = null;

        this.star = new ConstrainedPoint();
        this.star.setWeight(1);
        this.starL = new ConstrainedPoint();
        this.starL.setWeight(1);
        this.starR = new ConstrainedPoint();
        this.starR.setWeight(1);

        const candyResourceId = this.getCandyResourceId();
        this.candyResourceId = candyResourceId;

        this.candy = new GameObject();
        this.candy.initTextureWithId(candyResourceId);
        this.candy.setTextureQuad(GameSceneConstants.IMG_OBJ_CANDY_01_candy_bottom);
        this.candy.doRestoreCutTransparency();
        this.candy.anchor = Alignment.CENTER;
        this.candy.bb = Rectangle.copy(resolution.CANDY_BB);
        this.candy.passTransformationsToChilds = false;
        this.candy.scaleX = this.candy.scaleY = 0.71;
        this.candy.drawPosIncrement = 0.0001;

        this.candyMain = new GameObject();
        this.candyMain.initTextureWithId(candyResourceId);
        this.candyMain.setTextureQuad(GameSceneConstants.IMG_OBJ_CANDY_01_candy_main);
        this.candyMain.doRestoreCutTransparency();
        this.candyMain.anchor = this.candyMain.parentAnchor = Alignment.CENTER;
        this.candy.addChild(this.candyMain);
        this.candyMain.scaleX = this.candyMain.scaleY = 0.71;
        this.candyMain.drawPosIncrement = 0.0001;

        this.candyTop = new GameObject();
        this.candyTop.initTextureWithId(candyResourceId);
        this.candyTop.setTextureQuad(GameSceneConstants.IMG_OBJ_CANDY_01_candy_top);
        this.candyTop.doRestoreCutTransparency();
        this.candyTop.anchor = this.candyTop.parentAnchor = Alignment.CENTER;
        this.candy.addChild(this.candyTop);
        this.candyTop.scaleX = this.candyTop.scaleY = 0.71;
        this.candyTop.drawPosIncrement = 0.0001;

        this.candyBlink = new Animation();
        this.candyBlink.initTextureWithId(ResourceId.IMG_OBJ_CANDY_01);
        this.candyBlink.doRestoreCutTransparency();
        this.candyBlink.addAnimationEndpoints(
            GameSceneConstants.CandyBlink.INITIAL,
            0.07,
            Timeline.LoopType.NO_LOOP,
            GameSceneConstants.IMG_OBJ_CANDY_01_highlight_start,
            GameSceneConstants.IMG_OBJ_CANDY_01_highlight_end
        );
        this.candyBlink.addAnimationSequence(
            GameSceneConstants.CandyBlink.STAR,
            0.3,
            Timeline.LoopType.NO_LOOP,
            2,
            [GameSceneConstants.IMG_OBJ_CANDY_01_glow, GameSceneConstants.IMG_OBJ_CANDY_01_glow]
        );
        const glowTimeline = this.candyBlink.getTimeline(GameSceneConstants.CandyBlink.STAR);
        if (glowTimeline) {
            glowTimeline.addKeyFrame(
                KeyFrame.makeColor(RGBAColor.solidOpaque.copy(), KeyFrame.TransitionType.LINEAR, 0)
            );
            glowTimeline.addKeyFrame(
                KeyFrame.makeColor(
                    RGBAColor.transparent.copy(),
                    KeyFrame.TransitionType.LINEAR,
                    0.2
                )
            );
        }
        this.candyBlink.visible = false;
        this.candyBlink.anchor = this.candyBlink.parentAnchor = Alignment.CENTER;
        this.candyBlink.scaleX = this.candyBlink.scaleY = 0.71;
        this.candy.addChild(this.candyBlink);
        (this.candyBlink as Animation & { drawPosIncrement?: number }).drawPosIncrement = 0.0001;

        this.candyBubbleAnimation = new Animation();
        this.candyBubbleAnimation.initTextureWithId(ResourceId.IMG_OBJ_BUBBLE_FLIGHT);
        this.candyBubbleAnimation.x = this.candy.x;
        this.candyBubbleAnimation.y = this.candy.y;
        this.candyBubbleAnimation.parentAnchor = this.candyBubbleAnimation.anchor =
            Alignment.CENTER;
        this.candyBubbleAnimation.addAnimationDelay(
            0.05,
            Timeline.LoopType.REPLAY,
            GameSceneConstants.IMG_OBJ_BUBBLE_FLIGHT_Frame_1,
            GameSceneConstants.IMG_OBJ_BUBBLE_FLIGHT_Frame_13
        );
        this.candyBubbleAnimation.playTimeline(0);
        this.candy.addChild(this.candyBubbleAnimation);
        this.candyBubbleAnimation.visible = false;
        (this.candyBubbleAnimation as Animation & { drawPosIncrement?: number }).drawPosIncrement =
            0.0001;

        this.candyBubble = null;
        this.candyBubbleL = null;
        this.candyBubbleR = null;

        this.tummyTeasers = 0;
        this.mouthOpen = false;
        this.noCandy = false;
        this.noCandyL = false;
        this.noCandyR = false;
        this.spiderTookCandy = false;
        this.time = 0;
        this.score = 0;
        this.gravityNormal = true;
        this.dimTime = 0;
        this.ropesCutAtOnce = 0;
        this.ropesAtOnceTimer = 0;

        this.mapWidth = 0;
        this.mapHeight = 0;
        this.special = 0;
        this.ropePhysicsSpeed = 1;
        this.nightLevel = 0;

        this.ignoreTouches = false;
        this.fastenCamera = false;
        this.freezeCamera = false;
        this.cameraMoveMode = GameSceneConstants.CameraMove.TO_CANDY;

        this.animateRestartDim = false;
        this.savedSockSpeed = 0;
        this.timeBonus = 0;
        this.starBonus = 0;
    }
    protected abstract loadMap(map: unknown): void;

    protected abstract playRegularIdleAfterPaddington(): void;

    getCandyResourceId(): number {
        const boxType = edition.boxTypes?.[LevelState.pack];
        const isHolidayBox = boxType === BoxType.HOLIDAY;
        return IS_JANUARY && isHolidayBox
            ? ResourceId.IMG_OBJ_CANDY_PADDINGTON
            : ResourceId.IMG_OBJ_CANDY_01_NEW;
    }

    getCandyFxResourceId(): number {
        const boxType = edition.boxTypes?.[LevelState.pack];
        const isHolidayBox = boxType === BoxType.HOLIDAY;
        // Paddington uses combined asset, regular candy uses separate FX asset
        return IS_JANUARY && isHolidayBox
            ? ResourceId.IMG_OBJ_CANDY_PADDINGTON
            : ResourceId.IMG_OBJ_CANDY_FX;
    }

    getCandyConstants() {
        const boxType = edition.boxTypes?.[LevelState.pack];
        const isHolidayBox = boxType === BoxType.HOLIDAY;
        const isPaddington = IS_JANUARY && isHolidayBox;

        if (isPaddington) {
            // Paddington uses combined constants
            return {
                candy_bottom: GameSceneConstants.IMG_OBJ_CANDY_01_candy_bottom,
                candy_main: GameSceneConstants.IMG_OBJ_CANDY_01_candy_main,
                candy_top: GameSceneConstants.IMG_OBJ_CANDY_01_candy_top,
                part_1: GameSceneConstants.IMG_OBJ_CANDY_01_part_1,
                part_2: GameSceneConstants.IMG_OBJ_CANDY_01_part_2,
                highlight_start: GameSceneConstants.IMG_OBJ_CANDY_01_highlight_start,
                highlight_end: GameSceneConstants.IMG_OBJ_CANDY_01_highlight_end,
                glow: GameSceneConstants.IMG_OBJ_CANDY_01_glow,
                part_fx_start: GameSceneConstants.IMG_OBJ_CANDY_01_part_fx_start,
                part_fx_end: GameSceneConstants.IMG_OBJ_CANDY_01_part_fx_end,
            };
        } else {
            // Regular candy uses separate constants
            return {
                candy_bottom: GameSceneConstants.IMG_OBJ_CANDY_01_NEW_candy_bottom,
                candy_main: GameSceneConstants.IMG_OBJ_CANDY_01_NEW_candy_main,
                candy_top: GameSceneConstants.IMG_OBJ_CANDY_01_NEW_candy_top,
                part_1: GameSceneConstants.IMG_OBJ_CANDY_01_NEW_part_1,
                part_2: GameSceneConstants.IMG_OBJ_CANDY_01_NEW_part_2,
                highlight_start: GameSceneConstants.IMG_OBJ_CANDY_FX_highlight_start,
                highlight_end: GameSceneConstants.IMG_OBJ_CANDY_FX_highlight_end,
                glow: GameSceneConstants.IMG_OBJ_CANDY_FX_glow,
                part_fx_start: GameSceneConstants.IMG_OBJ_CANDY_FX_part_fx_start,
                part_fx_end: GameSceneConstants.IMG_OBJ_CANDY_FX_part_fx_end,
            };
        }
    }
    pointOutOfScreen(p: ConstrainedPoint): boolean {
        const bottomY = this.mapHeight + resolution.OUT_OF_SCREEN_ADJUSTMENT_BOTTOM;
        const topY = resolution.OUT_OF_SCREEN_ADJUSTMENT_TOP;
        const outOfScreen = p.pos.y > bottomY || p.pos.y < topY;
        return outOfScreen;
    }
    restart(): void {
        this.hide();
        this.show();
    }
    showGreeting(): void {
        const boxType = edition.boxTypes?.[LevelState.pack];
        const isHolidayBox = boxType === BoxType.HOLIDAY;

        if (IS_JANUARY && isHolidayBox) {
            this.playPaddingtonIntro();
            return;
        }

        if (IS_XMAS) {
            this.target.playTimeline(GameSceneConstants.CharAnimation.GREETINGXMAS);
            SoundMgr.playSound(ResourceId.SND_XMAS_BELL);
        } else {
            this.target.playTimeline(GameSceneConstants.CharAnimation.GREETING);
        }
    }
    hidePaddingtonFinalFrame(): void {
        if (this.paddingtonFinalFrame) {
            this.paddingtonFinalFrame.visible = false;
        }
    }
    showPaddingtonFinalFrame(): void {
        if (this.paddingtonFinalFrame) {
            this.paddingtonFinalFrame.visible = true;
        }
    }
    preparePaddingtonIntro(): void {
        this.pendingPaddingtonIdleTransition = false;
        if (this.dd && this.dd.cancelDispatch) {
            this.dd.cancelDispatch(this, this.playRegularIdleAfterPaddington, null);
        }
        this.hidePaddingtonFinalFrame();
    }
    playPaddingtonIntro(): void {
        if (!this.target) {
            return;
        }
        this.preparePaddingtonIntro();
        this.target.playTimeline(GameSceneConstants.CharAnimation.IDLEPADDINGTON);
    }
    shouldSkipTutorialElement(element: { locale: string }): boolean {
        const langId = settings.getLangId();
        const tl = element.locale;

        if (LangId.fromString(tl) !== langId) {
            return true;
        }

        return false;
    }
    override show(): void {
        this.initAnimations();

        if (!this.initBackground()) {
            return;
        }

        this.resetGameState();
        this.initCandy();
        this.resetHudStars();

        const map = LevelState.loadedMap;
        if (!map) {
            return;
        }
        this.loadMap(map);

        this.initCandyBubbles();
        this.initPostLoad();
        this.initLevelLabel();
    }
    startCamera(): void {
        const SCREEN_WIDTH = resolution.CANVAS_WIDTH;
        const SCREEN_HEIGHT = resolution.CANVAS_HEIGHT;

        if (this.mapWidth > SCREEN_WIDTH || this.mapHeight > SCREEN_HEIGHT) {
            this.ignoreTouches = true;
            this.fastenCamera = false;
            this.camera.type = Camera2D.SpeedType.PIXELS;
            this.camera.speed = 10;
            this.cameraMoveMode = GameSceneConstants.CameraMove.TO_CANDY_PART;

            let startX, startY;
            const cameraTarget =
                this.twoParts !== GameSceneConstants.PartsType.NONE ? this.starL : this.star;

            if (this.mapWidth > SCREEN_WIDTH) {
                if (cameraTarget.pos.x > this.mapWidth / 2) {
                    startX = 0;
                    startY = 0;
                } else {
                    startX = this.mapWidth - SCREEN_WIDTH;
                    startY = 0;
                }
            } else {
                if (cameraTarget.pos.y > this.mapHeight / 2) {
                    startX = 0;
                    startY = 0;
                } else {
                    startX = 0;
                    startY = this.mapHeight - SCREEN_HEIGHT;
                }
            }

            const xScroll = cameraTarget.pos.x - SCREEN_WIDTH / 2;
            const yScroll = cameraTarget.pos.y - SCREEN_HEIGHT / 2;
            const targetX = MathHelper.fitToBoundaries(xScroll, 0, this.mapWidth - SCREEN_WIDTH);
            const targetY = MathHelper.fitToBoundaries(yScroll, 0, this.mapHeight - SCREEN_HEIGHT);

            this.camera.moveTo(startX, startY, true);

            this.initialCameraToStarDistance = this.camera.pos.distance(
                new Vector(targetX, targetY)
            );
        } else {
            this.ignoreTouches = false;
            this.camera.moveTo(0, 0, true);
        }
    }
    doCandyBlink(): void {
        this.candyBlink.playTimeline(GameSceneConstants.CandyBlink.INITIAL);
    }
}

export default GameSceneInit;
