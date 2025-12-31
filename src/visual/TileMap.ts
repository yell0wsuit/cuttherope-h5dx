import BaseElement from "@/visual/BaseElement";
import ImageMultiDrawer from "@/visual/ImageMultiDrawer";
import Rectangle from "@/core/Rectangle";
import resolution from "@/resolution";
import Constants from "@/utils/Constants";
import MathHelper from "@/utils/MathHelper";
import Vector from "@/core/Vector";
import type Texture2D from "@/core/Texture2D";

const RepeatType = {
    NONE: 0,
    ALL: 1,
    EDGES: 2,
} as const;

type RepeatNumType = (typeof RepeatType)[keyof typeof RepeatType];

/**
 * An entry in the tile map
 */
class TileEntry {
    drawerIndex: number;
    quad: number;

    constructor(drawerIndex: number, quadIndex: number) {
        this.drawerIndex = drawerIndex;
        this.quad = quadIndex;
    }
}

class TileMap extends BaseElement {
    rows: number;
    columns: number;
    cameraViewWidth: number;
    cameraViewHeight: number;
    parallaxRatio: number;
    drawers: ImageMultiDrawer[];
    tiles: TileEntry[];
    matrix: number[][];
    repeatedVertically: RepeatNumType;
    repeatedHorizontally: RepeatNumType;
    horizontalRandom: boolean;
    verticalRandom: boolean;
    restoreTileTransparency: boolean;
    randomSeed: number;
    tileWidth: number;
    tileHeight: number;
    tileMapWidth: number;
    tileMapHeight: number;
    maxColsOnScreen: number;
    maxRowsOnScreen: number;

    static RepeatType = RepeatType;

    constructor(rows: number, columns: number) {
        super();

        this.rows = rows;
        this.columns = columns;

        this.cameraViewWidth = resolution.CANVAS_WIDTH;
        this.cameraViewHeight = resolution.CANVAS_HEIGHT;

        this.parallaxRatio = 1;
        this.drawers = [];
        this.tiles = [];
        this.matrix = [];

        for (let i = 0; i < columns; i++) {
            const column: number[] = (this.matrix[i] = []);
            for (let k = 0; k < rows; k++) {
                column[k] = Constants.UNDEFINED;
            }
        }

        this.repeatedVertically = TileMap.RepeatType.NONE;
        this.repeatedHorizontally = TileMap.RepeatType.NONE;
        this.horizontalRandom = false;
        this.verticalRandom = false;
        this.restoreTileTransparency = true;
        this.randomSeed = MathHelper.randomRange(1000, 2000);

        this.tileWidth = 0;
        this.tileHeight = 0;
        this.tileMapWidth = 0;
        this.tileMapHeight = 0;
        this.maxColsOnScreen = 0;
        this.maxRowsOnScreen = 0;
    }

    addTile(texture: Texture2D, quadIndex: number) {
        if (quadIndex === Constants.UNDEFINED) {
            this.tileWidth = texture.imageWidth;
            this.tileHeight = texture.imageHeight;
        } else {
            const rect = texture.rects[quadIndex];
            if (!rect) {
                return;
            }
            this.tileWidth = rect.w;
            this.tileHeight = rect.h;
        }

        this.updateVars();

        let drawerId: number = Constants.UNDEFINED;
        for (let i = 0, len = this.drawers.length; i < len; i++) {
            const drawer = this.drawers[i];
            if (drawer && drawer.texture === texture) {
                drawerId = i;
                break;
            }
        }

        if (drawerId === Constants.UNDEFINED) {
            const d = new ImageMultiDrawer(texture);
            drawerId = this.drawers.length;
            this.drawers.push(d);
        }

        const entry = new TileEntry(drawerId, quadIndex);
        this.tiles.push(entry);
    }

    updateVars() {
        this.maxColsOnScreen = 2 + Math.trunc(this.cameraViewWidth / (this.tileWidth + 1));
        this.maxRowsOnScreen = 2 + Math.trunc(this.cameraViewHeight / (this.tileHeight + 1));

        if (this.repeatedVertically === TileMap.RepeatType.NONE) {
            this.maxRowsOnScreen = Math.min(this.maxRowsOnScreen, this.rows);
        }

        if (this.repeatedHorizontally === TileMap.RepeatType.NONE) {
            this.maxColsOnScreen = Math.min(this.maxColsOnScreen, this.columns);
        }

        this.width = this.tileMapWidth = this.columns * this.tileWidth;
        this.height = this.tileMapHeight = this.rows * this.tileHeight;
    }

    /**
     * Fills the tilemap matrix with the specified tile entry index
     */
    fill(startRow: number, startCol: number, numRows: number, numCols: number, tileIndex: number) {
        for (let i = startCol, colEnd = startCol + numCols; i < colEnd; i++) {
            const column = this.matrix[i];
            if (!column) {
                continue;
            }
            for (let k = startRow, rowEnd = startRow + numRows; k < rowEnd; k++) {
                column[k] = tileIndex;
            }
        }
    }

    setParallaxRation(ratio: number) {
        this.parallaxRatio = ratio;
    }

    setRepeatHorizontally(repeatType: RepeatNumType) {
        this.repeatedHorizontally = repeatType;
        this.updateVars();
    }

    setRepeatVertically(repeatType: RepeatNumType) {
        this.repeatedVertically = repeatType;
        this.updateVars();
    }

    /**
     * Updates the tile map based on the current camera position
     */
    updateWithCameraPos(pos: Vector) {
        const mx = Math.round(pos.x / this.parallaxRatio);
        const my = Math.round(pos.y / this.parallaxRatio);
        let tileMapStartX = this.x;
        let tileMapStartY = this.y;
        let a, i, len, v;

        if (this.repeatedVertically !== TileMap.RepeatType.NONE) {
            const ys = tileMapStartY - my;
            a = Math.trunc(ys) % this.tileMapHeight;
            if (ys < 0) {
                tileMapStartY = a + my;
            } else {
                tileMapStartY = a - this.tileMapHeight + my;
            }
        }

        if (this.repeatedHorizontally !== TileMap.RepeatType.NONE) {
            const xs = tileMapStartX - mx;
            a = Math.trunc(xs) % this.tileMapWidth;
            if (xs < 0) {
                tileMapStartX = a + mx;
            } else {
                tileMapStartX = a - this.tileMapWidth + mx;
            }
        }

        // see if tile map is in the camera view
        if (
            !Rectangle.rectInRect(
                mx,
                my,
                mx + this.cameraViewWidth,
                my + this.cameraViewHeight,
                tileMapStartX,
                tileMapStartY,
                tileMapStartX + this.tileMapWidth,
                tileMapStartY + this.tileMapHeight
            )
        ) {
            return;
        }

        const cameraInTilemap = Rectangle.rectInRectIntersection(
            tileMapStartX,
            tileMapStartY,
            this.tileMapWidth,
            this.tileMapHeight, // tile map rect
            mx,
            my,
            this.cameraViewWidth,
            this.cameraViewHeight
        ); // camera rect

        const checkPoint = new Vector(
            Math.max(0, cameraInTilemap.x),
            Math.max(0, cameraInTilemap.y)
        );

        const startPos = new Vector(
            Math.trunc(Math.trunc(checkPoint.x) / this.tileWidth),
            Math.trunc(Math.trunc(checkPoint.y) / this.tileHeight)
        );

        const highestQuadY = tileMapStartY + startPos.y * this.tileHeight;
        const currentQuadPos = new Vector(
            tileMapStartX + startPos.x * this.tileWidth,
            highestQuadY
        );

        // reset the number of quads to draw
        for (i = 0, len = this.drawers.length; i < len; i++) {
            const drawer = this.drawers[i];
            if (drawer) {
                drawer.numberOfQuadsToDraw = 0;
            }
        }

        let maxColumn = startPos.x + this.maxColsOnScreen - 1,
            maxRow = startPos.y + this.maxRowsOnScreen - 1;

        if (this.repeatedVertically === TileMap.RepeatType.NONE) {
            maxRow = Math.min(this.rows - 1, maxRow);
        }
        if (this.repeatedHorizontally === TileMap.RepeatType.NONE) {
            maxColumn = Math.min(this.columns - 1, maxColumn);
        }

        for (i = startPos.x; i <= maxColumn; i++) {
            currentQuadPos.y = highestQuadY;
            for (let j = startPos.y; j <= maxRow; j++) {
                if (currentQuadPos.y >= my + this.cameraViewHeight) {
                    break;
                }

                // find intersection rectangle between camera rectangle and every tiled
                // texture rectangle
                const resScreen = Rectangle.rectInRectIntersection(
                    mx,
                    my,
                    this.cameraViewWidth,
                    this.cameraViewHeight,
                    currentQuadPos.x,
                    currentQuadPos.y,
                    this.tileWidth,
                    this.tileHeight
                );

                const resTexture = new Rectangle(
                    mx - currentQuadPos.x + resScreen.x,
                    my - currentQuadPos.y + resScreen.y,
                    resScreen.w,
                    resScreen.h
                );

                let ri = Math.round(i);
                let rj = Math.round(j);

                if (this.repeatedVertically === TileMap.RepeatType.EDGES) {
                    if (currentQuadPos.y < this.y) {
                        rj = 0;
                    } else if (currentQuadPos.y >= this.y + this.tileMapHeight) {
                        rj = this.rows - 1;
                    }
                }

                if (this.repeatedHorizontally === TileMap.RepeatType.EDGES) {
                    if (currentQuadPos.x < this.x) {
                        ri = 0;
                    } else if (currentQuadPos.x >= this.x + this.tileMapWidth) {
                        ri = this.columns - 1;
                    }
                }

                if (this.horizontalRandom) {
                    v = Math.sin(currentQuadPos.x) * this.randomSeed;
                    ri = Math.abs(Math.trunc(v) % this.columns);
                }

                if (this.verticalRandom) {
                    v = Math.sin(currentQuadPos.y) * this.randomSeed;
                    rj = Math.abs(Math.trunc(v) % this.rows);
                }

                if (ri >= this.columns) {
                    ri = ri % this.columns;
                }

                if (rj >= this.rows) {
                    rj = rj % this.rows;
                }

                const column = this.matrix[ri];
                if (!column) {
                    continue;
                }
                const tile = column[rj];
                if (tile !== undefined && tile >= 0) {
                    const entry = this.tiles[tile];
                    if (!entry) {
                        continue;
                    }
                    const drawer = this.drawers[entry.drawerIndex];
                    if (!drawer) {
                        continue;
                    }
                    const texture = drawer.texture;

                    if (entry.quad !== Constants.UNDEFINED) {
                        const rect = texture.rects[entry.quad];
                        if (rect) {
                            resTexture.x += rect.x;
                            resTexture.y += rect.y;
                        }
                    }

                    const vertRect = new Rectangle(
                        pos.x + resScreen.x,
                        pos.y + resScreen.y,
                        resScreen.w,
                        resScreen.h
                    );

                    drawer.setTextureQuad(drawer.numberOfQuadsToDraw++, resTexture, vertRect, null);
                }
                currentQuadPos.y += this.tileHeight;
            }
            currentQuadPos.x += this.tileWidth;

            if (currentQuadPos.x >= mx + this.cameraViewWidth) {
                break;
            }
        }
    }

    override draw() {
        this.preDraw();
        for (let i = 0, len = this.drawers.length; i < len; i++) {
            const drawer = this.drawers[i];
            if (drawer) {
                drawer.draw();
            }
        }
        this.postDraw();
    }
}

export default TileMap;
