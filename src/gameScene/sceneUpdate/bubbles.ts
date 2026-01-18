import Rectangle from "@/core/Rectangle";
import * as GameSceneConstants from "@/gameScene/constants";
import ResourceId from "@/resources/ResourceId";
import SoundMgr from "@/game/CTRSoundMgr";
import resolution from "@/resolution";
import type Bubble from "@/game/Bubble";
import type LightBulb from "@/game/LightBulb";
import type AnimationPool from "@/visual/AnimationPool";
import type GameObject from "@/game/CTRGameObject";
import type ConstrainedPoint from "@/physics/ConstrainedPoint";
import type { GameScene } from "@/types/game-scene";

function isGhostBubble(scene: GameScene, bubble: Bubble | null): boolean {
    if (!bubble) {
        return false;
    }

    return scene.ghosts.some((ghost) => ghost?.bubble === bubble);
}

function enableGhostCycleForBubble(scene: GameScene, bubble: Bubble | null): void {
    if (!bubble) {
        return;
    }

    for (const ghost of scene.ghosts) {
        if (ghost?.bubble === bubble) {
            ghost.cyclingEnabled = true;
            ghost.resetToState(1);
        }
    }
}

function disableGhostCycleForBubble(scene: GameScene, bubble: Bubble | null): boolean {
    if (!bubble) {
        return false;
    }

    let affected = false;
    for (const ghost of scene.ghosts) {
        if (ghost?.bubble === bubble) {
            ghost.cyclingEnabled = false;
            affected = true;
        }
    }

    return affected;
}

function isBubbleCapture(
    scene: GameScene,
    b: Bubble,
    candy: GameObject,
    candyBubble: Bubble | null,
    candyBubbleAnimation: AnimationPool
): boolean {
    const bubbleSize = resolution.BUBBLE_SIZE;
    const bubbleSizeDouble = bubbleSize * 2;

    if (
        Rectangle.pointInRect(
            candy.x,
            candy.y,
            b.x - bubbleSize,
            b.y - bubbleSize,
            bubbleSizeDouble,
            bubbleSizeDouble
        )
    ) {
        if (candyBubble) {
            scene.popBubble(b.x, b.y);
        }
        candyBubbleAnimation.visible = true;

        SoundMgr.playSound(ResourceId.SND_BUBBLE);

        b.popped = true;
        b.removeChildWithID(0);
        scene.conveyors.remove(b);

        // For ghost bubbles, disable the ghost's cycling when captured
        if (isGhostBubble(scene, b)) {
            disableGhostCycleForBubble(scene, b);
        }

        scene.attachCandy();

        return true;
    }
    return false;
}

function popCandyBubble(scene: GameScene, isLeft: boolean): void {
    if (scene.twoParts !== GameSceneConstants.PartsType.NONE) {
        if (isLeft) {
            enableGhostCycleForBubble(scene, scene.candyBubbleL);
            scene.candyBubbleL = null;
            scene.candyBubbleAnimationL.visible = false;
            if (scene.candyGhostBubbleAnimationL) {
                scene.candyGhostBubbleAnimationL.visible = false;
            }
            scene.popBubble(scene.candyL.x, scene.candyL.y);
        } else {
            enableGhostCycleForBubble(scene, scene.candyBubbleR);
            scene.candyBubbleR = null;
            scene.candyBubbleAnimationR.visible = false;
            if (scene.candyGhostBubbleAnimationR) {
                scene.candyGhostBubbleAnimationR.visible = false;
            }
            scene.popBubble(scene.candyR.x, scene.candyR.y);
        }
    } else {
        enableGhostCycleForBubble(scene, scene.candyBubble);
        scene.candyBubble = null;
        scene.candyBubbleAnimation.visible = false;
        if (scene.candyGhostBubbleAnimation) {
            scene.candyGhostBubbleAnimation.visible = false;
        }
        scene.popBubble(scene.candy.x, scene.candy.y);
    }
}

function popBubble(scene: GameScene, x: number, y: number): void {
    scene.detachCandy();

    SoundMgr.playSound(ResourceId.SND_BUBBLE_BREAK);

    scene.bubbleDisappear.x = x;
    scene.bubbleDisappear.y = y;

    scene.bubbleDisappear.playTimeline(0);
    scene.aniPool.addChild(scene.bubbleDisappear);
}

function popLightBulbBubble(scene: GameScene, bulb: LightBulb): void {
    const bubble = bulb.capturingBubble;
    if (!bubble) {
        return;
    }

    enableGhostCycleForBubble(scene, bubble);
    bulb.capturingBubble = null;
    bulb.capturingGhostBubble = false;
    bubble.capturedByBulb = false;
    bubble.popped = true;
    bubble.removeChildWithID(0);

    SoundMgr.playSound(ResourceId.SND_BUBBLE_BREAK);

    scene.bubbleDisappear.x = bulb.x;
    scene.bubbleDisappear.y = bulb.y;
    scene.bubbleDisappear.playTimeline(0);
    scene.aniPool.addChild(scene.bubbleDisappear);
}

function handleBubbleTouch(scene: GameScene, s: ConstrainedPoint, tx: number, ty: number): boolean {
    if (
        Rectangle.pointInRect(
            tx + scene.camera.pos.x,
            ty + scene.camera.pos.y,
            s.pos.x - resolution.BUBBLE_TOUCH_OFFSET,
            s.pos.y - resolution.BUBBLE_TOUCH_OFFSET,
            resolution.BUBBLE_TOUCH_SIZE,
            resolution.BUBBLE_TOUCH_SIZE
        )
    ) {
        scene.popCandyBubble(s === scene.starL);

        // Achievements.increment(AchievementId.BUBBLE_POPPER);
        // Achievements.increment(AchievementId.BUBBLE_MASTER);

        return true;
    }
    return false;
}

function handleLightBulbBubbleTouch(
    scene: GameScene,
    bulb: LightBulb,
    tx: number,
    ty: number
): boolean {
    if (!bulb.capturingBubble) {
        return false;
    }

    if (
        Rectangle.pointInRect(
            tx + scene.camera.pos.x,
            ty + scene.camera.pos.y,
            bulb.constraint.pos.x - resolution.BUBBLE_TOUCH_OFFSET,
            bulb.constraint.pos.y - resolution.BUBBLE_TOUCH_OFFSET,
            resolution.BUBBLE_TOUCH_SIZE,
            resolution.BUBBLE_TOUCH_SIZE
        )
    ) {
        popLightBulbBubble(scene, bulb);
        return true;
    }
    return false;
}

class GameSceneBubblesDelegate {
    private readonly scene: GameScene;

    constructor(scene: GameScene) {
        this.scene = scene;
    }

    isBubbleCapture(
        b: Bubble,
        candy: GameObject,
        candyBubble: Bubble | null,
        candyBubbleAnimation: AnimationPool
    ): boolean {
        return isBubbleCapture(this.scene, b, candy, candyBubble, candyBubbleAnimation);
    }

    popCandyBubble(isLeft: boolean): void {
        popCandyBubble(this.scene, isLeft);
    }

    popBubble(x: number, y: number): void {
        popBubble(this.scene, x, y);
    }

    popLightBulbBubble(bulb: LightBulb): void {
        popLightBulbBubble(this.scene, bulb);
    }

    handleBubbleTouch(s: ConstrainedPoint, tx: number, ty: number): boolean {
        return handleBubbleTouch(this.scene, s, tx, ty);
    }

    handleLightBulbBubbleTouch(bulb: LightBulb, tx: number, ty: number): boolean {
        return handleLightBulbBubbleTouch(this.scene, bulb, tx, ty);
    }
}

export { enableGhostCycleForBubble, disableGhostCycleForBubble, isGhostBubble };
export default GameSceneBubblesDelegate;
