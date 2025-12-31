import TextImage from "@/visual/TextImage";
import Alignment from "@/core/Alignment";
import Timeline from "@/visual/Timeline";
import KeyFrame from "@/visual/KeyFrame";
import RGBAColor from "@/core/RGBAColor";
import ResourceId from "@/resources/ResourceId";
import LevelState from "@/game/LevelState";
import Lang from "@/resources/Lang";
import MenuStringId from "@/resources/MenuStringId";
import resolution from "@/resolution";
import type GameSceneInit from "../init";

export function initLevelLabel(this: GameSceneInit): void {
    const levelLabel = new TextImage();
    const levelText = `${LevelState.pack + 1} - ${LevelState.level + 1}`;
    levelLabel.setText(ResourceId.FNT_BIG_FONT, levelText, undefined, undefined, true);
    levelLabel.anchor = Alignment.BOTTOM | Alignment.LEFT;
    levelLabel.x = 37 * resolution.CANVAS_SCALE;
    levelLabel.y = resolution.CANVAS_HEIGHT - 5 * resolution.CANVAS_SCALE;

    const levelLabelTitle = new TextImage();
    levelLabelTitle.setText(
        ResourceId.FNT_BIG_FONT,
        Lang.menuText(MenuStringId.LEVEL),
        undefined,
        undefined,
        true
    );
    levelLabelTitle.anchor = Alignment.BOTTOM | Alignment.LEFT;
    levelLabelTitle.parentAnchor = Alignment.TOP | Alignment.LEFT;
    levelLabelTitle.y = 60 * resolution.CANVAS_SCALE;
    levelLabelTitle.rotationCenterX -= levelLabelTitle.width / 2;
    levelLabelTitle.scaleX = levelLabelTitle.scaleY = 0.7;
    levelLabel.addChild(levelLabelTitle);

    const tl = new Timeline();
    tl.addKeyFrame(
        KeyFrame.makeColor(RGBAColor.transparent.copy(), KeyFrame.TransitionType.LINEAR, 0)
    );
    tl.addKeyFrame(
        KeyFrame.makeColor(RGBAColor.transparent.copy(), KeyFrame.TransitionType.LINEAR, 0.5)
    );
    tl.addKeyFrame(
        KeyFrame.makeColor(RGBAColor.solidOpaque.copy(), KeyFrame.TransitionType.LINEAR, 0.5)
    );
    tl.addKeyFrame(
        KeyFrame.makeColor(RGBAColor.solidOpaque.copy(), KeyFrame.TransitionType.LINEAR, 1)
    );
    tl.addKeyFrame(
        KeyFrame.makeColor(RGBAColor.transparent.copy(), KeyFrame.TransitionType.LINEAR, 0.5)
    );
    levelLabel.addTimelineWithID(tl, 0);
    levelLabel.playTimeline(0);
    tl.onFinished = this.staticAniPool.timelineFinishedDelegate();
    this.staticAniPool.addChild(levelLabel);

    if (this.clickToCut) {
        this.resetBungeeHighlight();
    }
}
