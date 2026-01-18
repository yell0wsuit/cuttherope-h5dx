import Star from "@/game/Star";
import ResourceId from "@/resources/ResourceId";
import Rectangle from "@/core/Rectangle";
import resolution from "@/resolution";
import Animation from "@/visual/Animation";
import Alignment from "@/core/Alignment";
import Timeline from "@/visual/Timeline";
import * as GameSceneConstants from "@/gameScene/constants";
import type GameSceneLoaders from "../loaders";
import type { StarItem } from "../MapLayerItem";

export function loadStar(this: GameSceneLoaders, item: StarItem): void {
    const s = new Star();
    s.initTextureWithId(ResourceId.IMG_OBJ_STAR_IDLE);
    if (this.nightLevel) {
        s.enableNightMode();
    }
    s.x = item.x * this.PM + this.PMX;
    s.y = item.y * this.PM + this.PMY;
    s.timeout = item.timeout;
    s.createAnimations();

    s.bb = Rectangle.copy(resolution.STAR_BB);
    s.parseMover(item as Parameters<typeof s.parseMover>[0]);

    // let stars move the starting position of mover
    s.update(0);

    const l = this.stars.push(s);

    //init the star disappear animations
    const sd = (this.starDisappearPool[l - 1] = new Animation());
    sd.initTextureWithId(ResourceId.IMG_OBJ_STAR_DISAPPEAR);
    sd.doRestoreCutTransparency();
    sd.anchor = Alignment.CENTER;

    sd.addAnimationDelay(
        0.05,
        Timeline.LoopType.NO_LOOP,
        GameSceneConstants.IMG_OBJ_STAR_DISAPPEAR_Frame_1,
        GameSceneConstants.IMG_OBJ_STAR_DISAPPEAR_Frame_13
    );
}
