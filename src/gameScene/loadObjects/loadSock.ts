import Sock from "@/game/Sock";
import ResourceId from "@/resources/ResourceId";
import Alignment from "@/core/Alignment";
import { IS_XMAS } from "@/utils/SpecialEvents";
import * as GameSceneConstants from "@/gameScene/constants";
import type GameSceneLoaders from "../loaders";
import type { SockItem } from "../MapLayerItem";

export function loadSock(this: GameSceneLoaders, item: SockItem): void {
    const hatOrSock = IS_XMAS ? ResourceId.IMG_OBJ_SOCKS_XMAS : ResourceId.IMG_OBJ_SOCKS;
    const s = new Sock() as Sock & { state: number };
    s.initTextureWithId(hatOrSock);
    s.scaleX = s.scaleY = 0.7;
    s.createAnimations();
    s.doRestoreCutTransparency();

    s.x = item.x * this.PM + this.PMX;
    s.y = item.y * this.PM + this.PMY;
    s.group = item.group;

    s.anchor = Alignment.TOP | Alignment.HCENTER;
    s.rotationCenterY -= s.height / 2 - GameSceneConstants.SOCK_COLLISION_Y_OFFSET;

    s.setTextureQuad(
        s.group === 0 ? Sock.Quads.IMG_OBJ_SOCKS_hat_01 : Sock.Quads.IMG_OBJ_SOCKS_hat_02
    );

    s.state = Sock.StateType.IDLE;
    s.parseMover(item as Parameters<typeof s.parseMover>[0]);
    s.rotation += 90;
    if (s.mover) {
        s.mover.angle += 90;
    }

    s.updateRotation();
    this.socks.push(s);
}
