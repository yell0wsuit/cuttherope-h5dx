import Canvas from "@/utils/Canvas";
import Constants from "@/utils/Constants";
import * as GameSceneConstants from "@/gameScene/constants";
import RGBAColor from "@/core/RGBAColor";
import Vector from "@/core/Vector";
import resolution from "@/resolution";
import type ConstrainedPoint from "@/physics/ConstrainedPoint";
import type { FingerCutTrail, GameScene } from "@/types/game-scene";
import { getInterpolatedPosition } from "@/utils/interpolation";

// Maximum reasonable distance for interpolation (prevents jumps on teleport/state changes)
const MAX_CANDY_INTERP_DISTANCE = 100;
const MAX_CANDY_INTERP_DISTANCE_SQ = MAX_CANDY_INTERP_DISTANCE * MAX_CANDY_INTERP_DISTANCE;

/**
 * Calculates interpolated position for smooth rendering on high refresh displays.
 * Returns the interpolated x,y or the current position if interpolation should be skipped.
 */
const getInterpolatedCandyPos = (
    star: ConstrainedPoint,
    alpha: number
): { x: number; y: number } => {
    const pos = getInterpolatedPosition(
        star.prevPos,
        star.pos,
        alpha,
        MAX_CANDY_INTERP_DISTANCE_SQ
    );
    return { x: pos.x, y: pos.y };
};

/**
 * Draws every animated element that belongs to the game scene.
 */
const drawImpl = function drawImpl(scene: GameScene): void {
    // reset any canvas transformations and clear everything
    const ctx = Canvas.context;
    if (!ctx) {
        return;
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, resolution.CANVAS_WIDTH, resolution.CANVAS_HEIGHT);

    // Interpolation alpha for smooth rendering on high refresh displays
    // When paused (updateable=false), use alpha=1 to show current position and avoid jittering
    const interpAlpha = !scene.updateable
        ? 1
        : Math.min(Math.max(scene.gameController.frameBalance, 0), 1);

    scene.preDraw();
    const interpCameraPos = scene.camera.applyInterpolatedTransformation(interpAlpha);

    // Draw background image directly on canvas (TileMap not rendering, needed for composite blending)
    if (scene.bgTexture?.image) {
        ctx.drawImage(
            scene.bgTexture.image,
            0,
            0,
            resolution.CANVAS_WIDTH,
            resolution.CANVAS_HEIGHT
        );
    }

    scene.back.updateWithCameraPos(interpCameraPos);
    scene.back.draw();

    if (scene.miceManager) {
        scene.miceManager.drawHoles();
    }

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
    if (scene.sleepAnimPrimary?.visible) {
        scene.sleepAnimPrimary.draw();
    }
    if (scene.sleepAnimSecondary?.visible) {
        scene.sleepAnimSecondary.draw();
    }

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

    scene.conveyors.draw();

    for (let i = 0, len = scene.bubbles.length; i < len; i++) {
        const bubble = scene.bubbles[i];
        if (bubble) {
            bubble.interpolationAlpha = interpAlpha;
            bubble.draw();
        }
    }

    for (let i = 0, len = scene.pumps.length; i < len; i++) {
        const pump = scene.pumps[i];
        if (pump) {
            pump.interpolationAlpha = interpAlpha;
            pump.draw();
        }
    }

    for (let i = 0, len = scene.spikes.length; i < len; i++) {
        const spike = scene.spikes[i];
        if (spike) {
            spike.interpolationAlpha = interpAlpha;
            spike.draw();
        }
    }

    for (let i = 0, len = scene.bouncers.length; i < len; i++) {
        const bouncer = scene.bouncers[i];
        if (bouncer) {
            bouncer.interpolationAlpha = interpAlpha;
            bouncer.draw();
        }
    }

    if (scene.miceManager) {
        scene.miceManager.drawMice();
    }

    for (let i = 0, len = scene.socks.length; i < len; i++) {
        const sock = scene.socks[i];
        if (!sock) {
            continue;
        }
        sock.interpolationAlpha = interpAlpha;
        sock.y -= GameSceneConstants.SOCK_COLLISION_Y_OFFSET;
        sock.draw();
        sock.y += GameSceneConstants.SOCK_COLLISION_Y_OFFSET;
    }

    for (let i = 0, len = scene.tubes.length; i < len; i++) {
        scene.tubes[i]?.drawBack();
    }

    for (let i = 0, len = scene.lanterns.length; i < len; i++) {
        const lantern = scene.lanterns[i];
        if (lantern) {
            lantern.interpolationAlpha = interpAlpha;
            lantern.draw();
        }
    }

    const bungees = scene.bungees;
    for (let i = 0, len = bungees.length; i < len; i++) {
        const grab = bungees[i];
        if (grab) {
            grab.interpolationAlpha = interpAlpha;
            if (grab.rope) {
                grab.rope.interpolationAlpha = interpAlpha;
            }
        }
    }
    for (let i = 0, len = bungees.length; i < len; i++) {
        const bungee = bungees[i];
        bungee?.drawBack();
    }
    for (let i = 0, len = bungees.length; i < len; i++) {
        const bungee = bungees[i];
        bungee?.draw();
    }

    for (let i = 0, len = scene.lightbulbs.length; i < len; i++) {
        scene.lightbulbs[i]?.drawLight();
    }

    for (let i = 0, len = scene.stars.length; i < len; i++) {
        const star = scene.stars[i];
        if (star) {
            star.interpolationAlpha = interpAlpha;
            star.draw();
        }
    }

    // Draw candy with interpolation for smooth rendering on high refresh displays
    if (!scene.noCandy && !scene.targetSock) {
        // Save original position
        const originalX = scene.candy.x;
        const originalY = scene.candy.y;

        // Calculate and apply interpolated position
        if (!scene.isCandyInLantern) {
            const interpPos = getInterpolatedCandyPos(scene.star, interpAlpha);
            scene.candy.x = interpPos.x;
            scene.candy.y = interpPos.y;
        }

        scene.candy.draw();

        if (!scene.isCandyInLantern && scene.candyBlink.currentTimeline != null) {
            scene.candyBlink.draw();
        }

        // Restore original position for physics consistency
        scene.candy.x = originalX;
        scene.candy.y = originalY;
    }

    if (scene.twoParts !== GameSceneConstants.PartsType.NONE) {
        if (!scene.noCandyL) {
            // Save and interpolate left candy
            const originalLX = scene.candyL.x;
            const originalLY = scene.candyL.y;
            const interpPosL = getInterpolatedCandyPos(scene.starL, interpAlpha);
            scene.candyL.x = interpPosL.x;
            scene.candyL.y = interpPosL.y;

            scene.candyL.draw();

            scene.candyL.x = originalLX;
            scene.candyL.y = originalLY;
        }

        if (!scene.noCandyR) {
            // Save and interpolate right candy
            const originalRX = scene.candyR.x;
            const originalRY = scene.candyR.y;
            const interpPosR = getInterpolatedCandyPos(scene.starR, interpAlpha);
            scene.candyR.x = interpPosR.x;
            scene.candyR.y = interpPosR.y;

            scene.candyR.draw();

            scene.candyR.x = originalRX;
            scene.candyR.y = originalRY;
        }
    }

    for (let i = 0, len = scene.lightbulbs.length; i < len; i++) {
        scene.lightbulbs[i]?.drawBottleAndFirefly();
    }

    for (let i = 0, len = scene.tubes.length; i < len; i++) {
        scene.tubes[i]?.drawFront();
    }

    for (let i = 0, len = bungees.length; i < len; i++) {
        const g = bungees[i];
        if (g?.hasSpider) {
            g.drawSpider();
        }
    }

    scene.aniPool.draw();
    drawCuts(scene);
    scene.camera.cancelInterpolatedTransformation(interpCameraPos);
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
