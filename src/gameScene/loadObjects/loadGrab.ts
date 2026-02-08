import Grab from "@/game/Grab";
import Bungee from "@/game/Bungee";
import Constants from "@/utils/Constants";
import PollenDrawer from "@/game/PollenDrawer";
import Vector from "@/core/Vector";
import * as GameSceneConstants from "@/gameScene/constants";
import Radians from "@/utils/Radians";
import type GameSceneLoaders from "../loaders";
import type { GrabItem } from "../MapLayerItem";

export function loadGrab(this: GameSceneLoaders, item: GrabItem): void {
    const gx = item.x * this.PM + this.PMX;
    const gy = item.y * this.PM + this.PMY;
    const l = item.length * this.PM;
    const wheel = item.wheel;
    const kickable = item.kickable ?? false;
    const kicked = item.kicked ?? false;
    const invisible = item.invisible ?? false;
    const ml = item.moveLength * this.PM || -1;
    const v = item.moveVertical;
    const o = item.moveOffset * this.PM || 0;
    const spider = item.spider;
    const left = item.part === "L";
    const hidePath = item.hidePath ?? false;
    const gun = item.gun ?? false;
    const bindBulb = item.bindBulb ?? false;
    const g = new Grab();
    let r = item.radius;

    g.x = gx;
    g.y = gy;
    g.wheel = wheel;
    g.gun = gun;
    g.kickable = kickable;
    g.kicked = kicked;
    g.invisible = invisible;
    g.setSpider(spider);
    g.parseMover(item as Parameters<typeof g.parseMover>[0]);

    if (g.mover) {
        g.setBee();

        if (!hidePath) {
            const d = 3,
                isCircle = item.path?.[0] === "R";

            // create pollen drawer if needed
            if (!this.pollenDrawer) {
                this.pollenDrawer = new PollenDrawer();
            }

            for (let i = 0, len = g.mover.path.length - 1; i < len; i++) {
                if (!isCircle || i % d === 0) {
                    this.pollenDrawer.fillWithPollenFromPath(
                        i,
                        i + 1,
                        g as Grab & { mover: { path: Vector[] } }
                    );
                }
            }

            if (g.mover.path.length > 2) {
                this.pollenDrawer.fillWithPollenFromPath(
                    0,
                    g.mover.path.length - 1,
                    g as Grab & { mover: { path: Vector[] } }
                );
            }
        }
    }

    if (r !== Constants.UNDEFINED) {
        r = r * this.PM;
    }

    if (r === Constants.UNDEFINED && !gun) {
        let tail = this.star;
        let attachesToCandy = true;
        if (bindBulb && this.lightbulbs.length > 0) {
            tail = this.lightbulbs[this.lightbulbs.length - 1]!.constraint;
            attachesToCandy = false;
        } else if (this.twoParts !== GameSceneConstants.PartsType.NONE) {
            tail = left ? this.starL : this.starR;
        }

        const b = new Bungee(null, gx, gy, tail, tail.pos.x, tail.pos.y, l);
        b.bungeeAnchor.pin.copyFrom(b.bungeeAnchor.pos);
        g.setRope(b);
        if (attachesToCandy) {
            this.attachCandy();
        }
        if (g.kicked) {
            b.bungeeAnchor.pin.x = Constants.UNDEFINED;
            b.bungeeAnchor.pin.y = Constants.UNDEFINED;
            b.bungeeAnchor.setWeight(0.1);
        }
    }

    g.setRadius(r);
    g.setMoveLength(ml, v, o);

    if (g.gun && g.gunArrow) {
        let target = this.star;
        if (this.twoParts !== GameSceneConstants.PartsType.NONE) {
            target = left ? this.starL : this.starR;
        }
        const v1 = Vector.subtract(new Vector(g.x, g.y), target.pos);
        g.gunArrow.rotation = Radians.toDegrees(v1.normalizedAngle());
    }

    this.bungees.push(g);
}
