import resolution from "@/resolution";
import type { GameScene } from "@/types/game-scene";

export function triggerSpecialTutorial(scene: GameScene, tutorialId: number): void {
    if (scene.special !== tutorialId) {
        return;
    }

    scene.special = 0;

    for (const tutorial of scene.tutorials) {
        if (tutorial.special === tutorialId) {
            tutorial.playTimeline(0);
        } else {
            tutorial.currentTimeline?.jumpToTrack(3, 2);
        }
    }

    for (const tutorialImage of scene.tutorialImages) {
        if (tutorialImage.special === tutorialId) {
            tutorialImage.playTimeline(0);
        } else {
            tutorialImage.currentTimeline?.jumpToTrack(3, 2);
        }
    }
}

export function updateSpecial(this: GameScene, _delta: number): boolean {
    if (this.special !== 0 && this.special === 1) {
        if (
            !this.noCandy &&
            this.candyBubble != null &&
            this.candy.y < resolution.CANDY_BUBBLE_TUTORIAL_LIMIT_Y &&
            this.candy.x > resolution.CANDY_BUBBLE_TUTORIAL_LIMIT_X
        ) {
            triggerSpecialTutorial(this, 1);
        }
    }

    return true;
}
