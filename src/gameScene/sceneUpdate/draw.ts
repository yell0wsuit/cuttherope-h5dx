import Canvas from "@/utils/Canvas";
import Constants from "@/utils/Constants";
import * as GameSceneConstants from "@/gameScene/constants";
import RGBAColor from "@/core/RGBAColor";
import Vector from "@/core/Vector";
import resolution from "@/resolution";
import type { FingerCutTrail, GameScene } from "@/types/game-scene";

/**
 * Draws every animated element that belongs to the game scene.
 */
const drawImpl = function drawImpl(scene: GameScene): void {
    // reset any canvas transformations and clear everything
    const ctx = Canvas.context;
    if (!ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, resolution.CANVAS_WIDTH, resolution.CANVAS_HEIGHT);

    scene.preDraw();
    scene.camera.applyCameraTransformation();
    scene.back.updateWithCameraPos(scene.camera.pos);
    scene.back.draw();

    // Scale overlayCut based on resolution to prevent visible seams at HD resolutions
    const overlayCut = Math.ceil((2 * resolution.CANVAS_SCALE) / 0.1875);
    if (scene.mapHeight > resolution.CANVAS_HEIGHT) {
        const overlayTexture = scene.overlayTexture;
        if (overlayTexture) {
            const q = GameSceneConstants.IMG_BGR_01_P2_vert_transition;
            const off = overlayTexture.offsets[q]?.y ?? 0;
            const overlayRect = overlayTexture.rects[q];

            if (overlayRect && overlayTexture.image) {
                ctx.drawImage(
                    overlayTexture.image,
                    overlayRect.x,
                    overlayRect.y + overlayCut,
                    overlayRect.w,
                    overlayRect.h - overlayCut * 2,
                    0,
                    off + overlayCut,
                    overlayRect.w,
                    overlayRect.h - overlayCut * 2
                );
            }
        }
    }

    for (let i = 0, len = scene.drawings.length; i < len; i++) {
        scene.drawings[i]?.draw();
    }

    for (let i = 0, len = scene.earthAnims.length; i < len; i++) {
        scene.earthAnims[i]?.draw();
    }

    if (scene.pollenDrawer) {
        scene.pollenDrawer.draw();
    }
    if (scene.gravityButton) {
        scene.gravityButton.draw();
    }

    scene.support.draw();
    scene.target.draw();

    // tutorial text
    for (let i = 0, len = scene.tutorials.length; i < len; i++) {
        scene.tutorials[i]?.draw();
    }

    // tutorial images
    for (let i = 0, len = scene.tutorialImages.length; i < len; i++) {
        const ti = scene.tutorialImages[i];
        if (!ti) {
            continue;
        }

        // don't draw the level1 arrow now - it needs to be on top
        if (ti.special !== GameSceneConstants.LEVEL1_ARROW_SPECIAL_ID) {
            ti.draw();
        }
    }

    for (let i = 0, len = scene.razors.length; i < len; i++) {
        scene.razors[i]?.draw();
    }

    for (let i = 0, len = scene.rotatedCircles.length; i < len; i++) {
        scene.rotatedCircles[i]?.draw();
    }

    for (let i = 0, len = scene.ghosts.length; i < len; i++) {
        scene.ghosts[i]?.draw();
    }

    for (let i = 0, len = scene.bubbles.length; i < len; i++) {
        scene.bubbles[i]?.draw();
    }

    for (let i = 0, len = scene.pumps.length; i < len; i++) {
        scene.pumps[i]?.draw();
    }

    for (let i = 0, len = scene.spikes.length; i < len; i++) {
        scene.spikes[i]?.draw();
    }

    for (let i = 0, len = scene.bouncers.length; i < len; i++) {
        scene.bouncers[i]?.draw();
    }

    for (let i = 0, len = scene.socks.length; i < len; i++) {
        const sock = scene.socks[i];
        if (!sock) {
            continue;
        }
        sock.y -= GameSceneConstants.SOCK_COLLISION_Y_OFFSET;
        sock.draw();
        sock.y += GameSceneConstants.SOCK_COLLISION_Y_OFFSET;
    }

    const bungees = scene.bungees;
    for (let i = 0, len = bungees.length; i < len; i++) {
        const bungee = bungees[i];
        bungee?.drawBack();
    }
    for (let i = 0, len = bungees.length; i < len; i++) {
        const bungee = bungees[i];
        bungee?.draw();
    }

    for (let i = 0, len = scene.stars.length; i < len; i++) {
        const star = scene.stars[i];
        star?.draw();
    }

    if (!scene.noCandy && !scene.targetSock) {
        scene.candy.x = scene.star.pos.x;
        scene.candy.y = scene.star.pos.y;
        scene.candy.draw();

        if (scene.candyBlink.currentTimeline != null) {
            scene.candyBlink.draw();
        }
    }

    if (scene.twoParts !== GameSceneConstants.PartsType.NONE) {
        if (!scene.noCandyL) {
            scene.candyL.x = scene.starL.pos.x;
            scene.candyL.y = scene.starL.pos.y;
            scene.candyL.draw();
        }

        if (!scene.noCandyR) {
            scene.candyR.x = scene.starR.pos.x;
            scene.candyR.y = scene.starR.pos.y;
            scene.candyR.draw();
        }
    }

    for (let i = 0, len = bungees.length; i < len; i++) {
        const g = bungees[i];
        if (g?.hasSpider) {
            g.drawSpider();
        }
    }

    scene.aniPool.draw();
    drawCuts(scene);
    scene.camera.cancelCameraTransformation();
    scene.staticAniPool.draw();

    // draw the level1 arrow last so it's on top
    for (let i = 0, len = scene.tutorialImages.length; i < len; i++) {
        const ti = scene.tutorialImages[i];
        if (ti && ti.special === GameSceneConstants.LEVEL1_ARROW_SPECIAL_ID) {
            ti.draw();
        }
    }

    scene.postDraw();
};

/**
 * Renders the finger cut trails currently tracked by the scene.
 */
const drawCuts = function drawCuts(scene: GameScene): void {
    const maxSize = resolution.CUT_MAX_SIZE;
    for (let i = 0; i < Constants.MAX_TOUCHES; i++) {
        const cuts: FingerCutTrail = scene.fingerCuts[i] ?? [];
        if (cuts.length > 0) {
            let perpSize = 1;
            const v = 0;
            const pts: Vector[] = [];

            for (const cut of cuts) {
                if (!cut) {
                    continue;
                }
                if (pts.length === 0) {
                    pts.push(cut.start);
                }
                pts.push(cut.end);
            }

            const numSegments = Math.max(pts.length - 1, 0);
            if (numSegments === 0) {
                continue;
            }

            const vertices: Vector[] = [];
            const pointsPerCutSegment = 2;
            const numVertices = numSegments * pointsPerCutSegment;
            const bstep = 1 / numVertices;
            let a = 0;

            while (true) {
                if (a > 1) {
                    a = 1;
                }

                const pointOnCurve = Vector.calcPathBezier(pts, a);
                vertices.push(pointOnCurve);

                if (a === 1) {
                    break;
                }

                a += bstep;
            }

            const step = maxSize / numVertices;
            const verts: Vector[] = [];
            for (let k = 0, lenMinusOne = numVertices - 1; k < lenMinusOne; k++) {
                const startSize = perpSize;
                const endSize = k === numVertices - 1 ? 1 : perpSize + step;
                const start = vertices[k]!;
                const end = vertices[k + 1]!;

                // n is the normalized arrow
                const n = Vector.subtract(end, start);
                n.normalize();

                const rp = Vector.rPerpendicular(n);
                const lp = Vector.perpendicular(n);

                if (v === 0) {
                    const srp = Vector.add(start, Vector.multiply(rp, startSize));
                    const slp = Vector.add(start, Vector.multiply(lp, startSize));

                    verts.push(slp);
                    verts.push(srp);
                }

                const erp = Vector.add(end, Vector.multiply(rp, endSize));
                const elp = Vector.add(end, Vector.multiply(lp, endSize));

                verts.push(elp);
                verts.push(erp);

                perpSize += step;
            }

            // draw triangle strip
            Canvas.fillTriangleStrip(verts, RGBAColor.styles.SOLID_OPAQUE);
        }
    }
};

class GameSceneDrawDelegate {
    private readonly scene: GameScene;

    constructor(scene: GameScene) {
        this.scene = scene;
    }

    draw(): void {
        drawImpl(this.scene);
    }
}

export { drawImpl };
export default GameSceneDrawDelegate;
