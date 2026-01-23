import Alignment from "@/core/Alignment";
import Vector from "@/core/Vector";
import BaseElement from "@/visual/BaseElement";
import ImageElement from "@/visual/ImageElement";
import ResourceId from "@/resources/ResourceId";
import SoundMgr from "@/game/CTRSoundMgr";
import MathHelper from "@/utils/MathHelper";
import Radians from "@/utils/Radians";
import * as GameSceneConstants from "@/gameScene/constants";
import Constants from "@/utils/Constants";

const BELT_PLATE_SCALE_X = 0.7;

type ConveyorItem = BaseElement & {
    bb?: { w: number; h: number };
    conveyorId?: number;
    conveyorBaseScaleX?: number;
    conveyorBaseScaleY?: number;
    getConveyorSize?: () => Vector;
    getConveyorPadding?: () => number;
    getConveyorPosition?: () => Vector;
    setConveyorPosition?: (pos: Vector) => void;
    onConveyorDrop?: () => void;
};

class ConveyorItemState {
    static nextIndex = 0;

    markedForRemoval = false;
    isSettling = true;
    nextOffset: number;
    offset: number;
    index: number;

    constructor(initialOffset: number) {
        this.nextOffset = initialOffset;
        this.offset = initialOffset;
        this.index = ConveyorItemState.nextIndex++;
    }
}

class ConveyorBeltVisual extends BaseElement {
    private readonly plateQuad: number;
    private readonly segments: ImageElement[] = [];
    private readonly tileWidth: number;
    private readonly tileHeight: number;
    private readonly tileScaleX: number;
    private readonly tileScaleY: number;
    private readonly textureId = ResourceId.IMG_OBJ_TRANSPORTER;
    offset = 0;
    prevOffset = 0;
    interpolationAlpha = 1;

    constructor(width: number, height: number, direction: number) {
        super();
        this.width = width;
        this.height = height;
        this.anchor = Alignment.TOP | Alignment.LEFT;
        this.parentAnchor = Alignment.TOP | Alignment.LEFT;

        if (direction < 0) {
            this.plateQuad = GameSceneConstants.IMG_OBJ_TRANSPORTER_PLATE_ARROW_LEFT;
        } else if (direction > 0) {
            this.plateQuad = GameSceneConstants.IMG_OBJ_TRANSPORTER_PLATE_ARROW_RIGHT;
        } else {
            this.plateQuad = GameSceneConstants.IMG_OBJ_TRANSPORTER_PLATE;
        }

        const template = ImageElement.create(this.textureId, this.plateQuad);
        template.anchor = Alignment.CENTER;
        template.parentAnchor = Alignment.TOP | Alignment.LEFT;
        this.tileWidth = template.width;
        this.tileHeight = template.height;
        this.tileScaleY = this.tileHeight > 0 ? this.height / this.tileHeight : 1;
        this.tileScaleX = BELT_PLATE_SCALE_X;

        this.segments.push(template);
        this.addChild(template);
    }

    getTileScale(): number {
        return this.tileScaleX;
    }

    move(delta: number): void {
        if (this.tileWidth <= 0) {
            return;
        }

        const tileStep = this.tileWidth * this.tileScaleX;
        if (tileStep <= 0) {
            return;
        }

        this.prevOffset = this.offset;
        this.offset += delta;
        while (this.offset > this.width) {
            this.offset -= tileStep;
        }
        while (this.offset < 0) {
            this.offset += tileStep;
        }
    }

    updateLayout(): void {
        if (this.tileWidth <= 0 || this.tileHeight <= 0 || this.width <= 0) {
            return;
        }

        const tileStep = this.tileWidth * this.tileScaleX;
        if (tileStep <= 0) {
            return;
        }

        // Interpolate between previous and current offset for smooth animation
        let offset: number;
        if (this.interpolationAlpha < 1) {
            // Handle wrap-around: if the difference is large, they wrapped
            let prev = this.prevOffset;
            let curr = this.offset;
            const delta = curr - prev;
            // If delta is larger than half the belt width, adjust for wrap
            if (Math.abs(delta) > this.width / 2) {
                if (delta > 0) {
                    prev += this.width;
                } else {
                    curr += this.width;
                }
            }
            offset = prev + (curr - prev) * this.interpolationAlpha;
        } else {
            offset = this.offset;
        }
        offset = offset - Math.floor(offset / tileStep) * tileStep;
        if (offset < 0) {
            offset += tileStep;
        }

        let segmentIndex = 0;
        segmentIndex = this.layoutSegment(segmentIndex, 0, offset);

        let x = offset;
        while (x + tileStep <= this.width) {
            segmentIndex = this.layoutSegment(segmentIndex, x, tileStep);
            x += tileStep;
        }

        const remainingWidth = Math.max(this.width - x, 0);
        segmentIndex = this.layoutSegment(segmentIndex, x, remainingWidth);

        for (let i = segmentIndex; i < this.segments.length; i++) {
            this.segments[i]!.visible = false;
        }
    }

    private layoutSegment(index: number, left: number, width: number): number {
        const segment = this.ensureSegment(index);
        if (width <= 0) {
            segment.visible = false;
            return index + 1;
        }

        const scaleX = width / this.tileWidth;
        segment.scaleX = scaleX;
        segment.scaleY = this.tileScaleY;
        const scaledWidth = this.tileWidth * Math.abs(scaleX);
        const scaledHeight = this.tileHeight * Math.abs(this.tileScaleY);
        segment.x = left + scaledWidth / 2;
        segment.y = scaledHeight / 2;
        segment.visible = true;
        return index + 1;
    }

    private ensureSegment(index: number): ImageElement {
        if (this.segments[index]) {
            return this.segments[index]!;
        }

        const segment = ImageElement.create(this.textureId, this.plateQuad);
        segment.anchor = Alignment.CENTER;
        segment.parentAnchor = Alignment.TOP | Alignment.LEFT;
        this.segments[index] = segment;
        this.addChild(segment);
        return segment;
    }
}

class ConveyorBelt extends BaseElement {
    velocity = 10;
    offset = 0;
    id = -1;
    isManual = false;
    manualTravelDistance = 0;
    rotationRad = 0;
    offsetDelta = 0;
    direction = Vector.newZero();
    active = false;
    activePointerId = -1;
    lastDragPosition = Vector.newZero();
    beltVisual: ConveyorBeltVisual | null = null;
    itemStates = new Map<ConveyorItem, ConveyorItemState>();
    items: ConveyorItem[] = [];
    interpolationAlpha = 1;

    constructor() {
        super();
        this.anchor = Alignment.LEFT | Alignment.VCENTER;
    }

    override draw(): void {
        // Apply interpolation to belt visual before drawing for smooth animation on high refresh displays
        if (this.beltVisual) {
            this.beltVisual.interpolationAlpha = this.interpolationAlpha;
            this.beltVisual.updateLayout();
        }
        super.draw();
    }

    static create(
        id: number,
        x: number,
        y: number,
        length: number,
        height: number,
        rotation: number,
        isManual: boolean,
        velocity: number
    ): ConveyorBelt {
        const belt = new ConveyorBelt();
        belt.initializeBelt(id, x, y, length, height, rotation, isManual, velocity);
        return belt;
    }

    initializeBelt(
        id: number,
        x: number,
        y: number,
        length: number,
        height: number,
        rotation: number,
        isManual: boolean,
        velocity: number
    ): void {
        this.activePointerId = -1;
        this.id = id;
        this.x = x;
        this.y = y;
        this.width = length;
        this.height = height;
        // Map data uses the opposite rotation sign in the TS renderer.
        const adjustedRotation = -rotation;
        this.rotation = adjustedRotation;
        this.isManual = isManual;
        this.rotationRad = Radians.fromDegrees(adjustedRotation);
        this.direction = Vector.forAngle(this.rotationRad);
        this.velocity = velocity;
        this.rotationCenterX = -length / 2;
        this.rotationCenterY = 0;

        this.removeAllChildren();
        this.buildVisuals();
    }

    override update(deltaTime: number): void {
        super.update(deltaTime);

        if (!this.isManual) {
            this.offsetDelta = deltaTime * this.velocity * 10;
            this.offset += this.offsetDelta;
            this.offset = this.wrapOffset(this.offset, this.width);
        }

        this.active = Math.abs(this.offsetDelta) > 0.001;

        if (this.isManual && this.active) {
            this.manualTravelDistance += Math.abs(this.offsetDelta);
            if (this.manualTravelDistance >= 15) {
                this.playManualMoveSound();
                this.manualTravelDistance = 0;
            }
        }

        this.cleanupMarkedItems();

        let firstItem: ConveyorItem | null = null;
        let lastItem: ConveyorItem | null = null;

        for (const [item, itemState] of this.itemStates.entries()) {
            if (itemState.markedForRemoval) {
                continue;
            }

            let targetOffset = itemState.offset + this.offsetDelta;
            let wrappedAround = true;

            if (targetOffset >= this.width) {
                targetOffset -= this.width;
            } else if (targetOffset <= 0) {
                targetOffset += this.width;
            } else {
                wrappedAround = false;
            }

            const size = ConveyorBelt.getItemSize(item);
            const position = ConveyorBelt.getItemPosition(item);
            const halfLength =
                new Vector(size.x * this.direction.x, size.y * this.direction.y).getLength() / 2;

            let scale = 1;
            let projectedOffset = targetOffset;

            if (targetOffset < halfLength) {
                scale = 0.5 + (0.5 * targetOffset) / halfLength;
                firstItem = item;
                projectedOffset = halfLength * scale;
            } else if (this.width - targetOffset < halfLength) {
                scale = 0.5 + (0.5 * (this.width - targetOffset)) / halfLength;
                lastItem = item;
                projectedOffset = this.width - halfLength * scale;
            }

            for (const [neighbor, neighborState] of this.itemStates.entries()) {
                if (neighbor === item || neighborState.markedForRemoval || scale !== 1) {
                    continue;
                }

                let separation = neighborState.offset - itemState.offset;
                const neighborSize = ConveyorBelt.getItemSize(neighbor);
                const combined = Vector.add(size, neighborSize);
                const combinedSq = combined.x * combined.x + combined.y * combined.y;
                if (0.25 * combinedSq > separation * separation) {
                    if (Math.abs(separation) < 0.001) {
                        const deltaIndex = this.items.indexOf(neighbor) - this.items.indexOf(item);
                        separation = 600 * (deltaIndex > 0 ? 1 : deltaIndex < 0 ? -1 : 0);
                    } else if (Math.abs(separation) < 600) {
                        separation = Math.sign(separation) * 600;
                    }
                    targetOffset -= separation * deltaTime;
                }
            }

            ConveyorBelt.applyItemScale(item, scale);

            const offsetVector = new Vector(
                this.x + this.direction.x * projectedOffset - position.x,
                this.y + this.direction.y * projectedOffset - position.y
            );

            if (itemState.isSettling) {
                const perpendicular = new Vector(this.direction.y, -this.direction.x);
                const slideDistance =
                    offsetVector.getDot(perpendicular) / this.direction.getLength();
                const projectedSlide = new Vector(
                    perpendicular.x * slideDistance,
                    perpendicular.y * slideDistance
                );

                const maxSlide = 800 * deltaTime;
                const slideLengthSq =
                    projectedSlide.x * projectedSlide.x + projectedSlide.y * projectedSlide.y;
                if (slideLengthSq >= maxSlide * maxSlide) {
                    const slideLength = Math.sqrt(slideLengthSq);
                    projectedSlide.multiply((slideLength - maxSlide) / slideLength);
                } else {
                    itemState.isSettling = false;
                }

                offsetVector.subtract(projectedSlide);
                ConveyorBelt.setItemPosition(item, Vector.add(position, offsetVector));
            } else {
                ConveyorBelt.setItemPosition(
                    item,
                    Vector.add(
                        new Vector(this.x, this.y),
                        Vector.multiply(this.direction, projectedOffset)
                    )
                );
            }

            itemState.nextOffset = targetOffset;
            if (wrappedAround) {
                item.onConveyorDrop?.();
                SoundMgr.playSound(ResourceId.SND_TRANSPORTER_DROP);
            }
        }

        for (const state of this.itemStates.values()) {
            state.offset = this.wrapOffset(state.nextOffset, this.width);
        }

        if (this.beltVisual) {
            this.beltVisual.move(this.offsetDelta);
        }

        if (this.isManual) {
            this.offsetDelta = 0;
        }

        if (this.activePointerId === -1) {
            if (firstItem && lastItem) {
                for (const [item, itemState] of this.itemStates.entries()) {
                    if (itemState.markedForRemoval) {
                        continue;
                    }

                    if (item === firstItem) {
                        itemState.offset += 1500 * deltaTime;
                    }

                    if (item === lastItem) {
                        itemState.offset -= 1500 * deltaTime;
                    }
                }
            } else if (firstItem) {
                this.offsetDelta = 1500 * deltaTime;
            } else if (lastItem) {
                this.offsetDelta = -1500 * deltaTime;
            }
        }
    }

    onPointerDown(pointerX: number, pointerY: number, pointerId: number): boolean {
        if (!this.isManual) {
            return false;
        }

        let handled = false;
        const local = this.toLocalSpace(new Vector(pointerX, pointerY));
        const insideBounds =
            local.x >= 0 &&
            local.x <= this.width &&
            local.y >= -0.5 * this.height &&
            local.y <= 0.5 * this.height;

        if (insideBounds) {
            this.activePointerId = pointerId;
            this.lastDragPosition.copyFrom(local);
            handled = true;
        }

        return handled;
    }

    onPointerUp(_pointerX: number, _pointerY: number, pointerId: number): boolean {
        if (!this.isManual) {
            return false;
        }

        let handled = false;
        if (this.activePointerId === pointerId) {
            this.activePointerId = -1;
            this.offsetDelta = 0;

            for (const [item, state] of this.itemStates.entries()) {
                if (state.markedForRemoval) {
                    this.remove(item);
                }
            }

            handled = true;
        }

        return handled;
    }

    onPointerMove(pointerX: number, pointerY: number, pointerId: number): boolean {
        if (!this.isManual) {
            return false;
        }

        let handled = false;

        if (this.activePointerId === pointerId) {
            const local = this.toLocalSpace(new Vector(pointerX, pointerY));
            this.offsetDelta = local.x - this.lastDragPosition.x;
            this.offset += this.offsetDelta;
            this.offset = this.wrapOffset(this.offset, this.width);
            this.lastDragPosition.copyFrom(local);
            handled = true;
        }

        return handled;
    }

    contains(worldPoint: Vector): boolean {
        const local = this.toLocalSpace(worldPoint);
        if (local.x < 0 || local.x > this.width) {
            return false;
        }
        if (local.y < -0.5 * this.height || local.y > 0.5 * this.height) {
            return false;
        }
        return true;
    }

    containsWithPadding(worldPoint: Vector, padding: number): boolean {
        const local = this.toLocalSpace(worldPoint);
        if (local.x < -padding || local.x > this.width + padding) {
            return false;
        }
        if (local.y < -0.5 * this.height - padding || local.y > 0.5 * this.height + padding) {
            return false;
        }
        return true;
    }

    toLocalSpace(worldPoint: Vector): Vector {
        const perpAngle = this.rotationRad - 0.5 * Math.PI;
        const perp = new Vector(Math.cos(perpAngle), Math.sin(perpAngle));
        const dx = worldPoint.x - this.x;
        const dy = worldPoint.y - this.y;
        return new Vector(this.direction.x * dx + this.direction.y * dy, perp.x * dx + perp.y * dy);
    }

    attachItem(item: ConveyorItem): void {
        this.registerItem(item);
    }

    markItemForRemoval(item: ConveyorItem): void {
        const state = this.itemStates.get(item);
        if (state) {
            state.markedForRemoval = true;
        }
        item.conveyorId = -1;
    }

    hasItem(item: ConveyorItem): boolean {
        return this.itemStates.has(item);
    }

    remove(item: ConveyorItem): void {
        this.itemStates.delete(item);
    }

    isItemMarkedForRemoval(item: ConveyorItem): boolean {
        return this.itemStates.get(item)?.markedForRemoval ?? false;
    }

    isActive(): boolean {
        return this.active;
    }

    wrapOffset(offset: number, maxWidth: number): number {
        const width = maxWidth - 0;
        let wrapped = offset;
        if (wrapped > maxWidth) {
            wrapped -= width;
        }
        if (wrapped < 0) {
            wrapped += width;
        }
        return wrapped;
    }

    private registerItem(item: ConveyorItem): void {
        const position = ConveyorBelt.getItemPosition(item);
        const offsetVector = new Vector(position.x - this.x, position.y - this.y);
        const initialOffset = Math.max(
            Math.min(
                offsetVector.x * this.direction.x + offsetVector.y * this.direction.y,
                this.width
            ),
            0
        );
        this.itemStates.set(item, new ConveyorItemState(initialOffset));
        this.items.push(item);
        item.conveyorId = this.id;
        ConveyorBelt.cacheBaseScale(item);
    }

    private buildVisuals(): void {
        const width = this.width;
        const height = this.height;
        const scale = 0.75;
        const plateHeight = height - 10;

        // Helper to get scaled dimensions
        const getScaledHeight = (el: ImageElement): number => el.height * Math.abs(el.scaleY);
        const getScaledWidth = (el: ImageElement): number => el.width * Math.abs(el.scaleX);

        // With parentAnchor = TOP | LEFT, child y=0 is at parent's top edge
        // So we can use original coordinates directly

        // Create pillar reference first to get consistent dimensions
        const pillarRef = this.createPiece(GameSceneConstants.IMG_OBJ_TRANSPORTER_END_SIDE);
        pillarRef.scaleX = scale;
        pillarRef.scaleY = scale;
        const pillarScaledHeight = getScaledHeight(pillarRef);
        const pillarScaledWidth = getScaledWidth(pillarRef);
        const pillarXOffset = pillarScaledWidth * 0.2; // pillars extend outside belt

        // Center plate - extends to reach pillars
        const middle = this.createPiece(GameSceneConstants.IMG_OBJ_TRANSPORTER_MIDDLE);
        middle.scaleX = (width - pillarScaledWidth + pillarXOffset) / middle.width;
        middle.scaleY = plateHeight / middle.height;
        middle.x = 0;
        middle.y = 0;
        this.addChild(middle);

        // Upper-left pillar
        const endSideLeftTop = this.createPiece(GameSceneConstants.IMG_OBJ_TRANSPORTER_END_SIDE);
        endSideLeftTop.scaleX = scale;
        endSideLeftTop.scaleY = -scale;
        endSideLeftTop.x = -pillarXOffset;
        endSideLeftTop.y = pillarScaledHeight - 3;
        this.addChild(endSideLeftTop);

        // Upper-right pillar
        const endSideRightTop = this.createPiece(GameSceneConstants.IMG_OBJ_TRANSPORTER_END_SIDE);
        endSideRightTop.scaleX = -scale;
        endSideRightTop.scaleY = -scale;
        endSideRightTop.x = width + pillarXOffset;
        endSideRightTop.y = pillarScaledHeight - 3;
        this.addChild(endSideRightTop);

        // Lower-right pillar
        const endSideRightBottom = this.createPiece(
            GameSceneConstants.IMG_OBJ_TRANSPORTER_END_SIDE
        );
        endSideRightBottom.scaleX = -scale;
        endSideRightBottom.scaleY = scale;
        endSideRightBottom.x = width + pillarXOffset;
        endSideRightBottom.y = height - pillarScaledHeight + 3;
        this.addChild(endSideRightBottom);

        // Lower-left pillar (reuse pillarRef)
        const endSideLeftBottom = pillarRef;
        endSideLeftBottom.scaleX = scale;
        endSideLeftBottom.x = -pillarXOffset;
        endSideLeftBottom.y = height - pillarScaledHeight + 3;
        this.addChild(endSideLeftBottom);

        // Left cap - extends to pillar
        const endLeft = this.createPiece(GameSceneConstants.IMG_OBJ_TRANSPORTER_END);
        endLeft.scaleX = scale;
        endLeft.scaleY = plateHeight / endLeft.height;
        endLeft.x = -pillarXOffset;
        endLeft.y = 5;
        this.addChild(endLeft);

        // Right cap - extends to pillar
        const endRight = this.createPiece(GameSceneConstants.IMG_OBJ_TRANSPORTER_END);
        endRight.scaleX = scale;
        endRight.scaleY = plateHeight / endRight.height;
        endRight.x = width - getScaledWidth(endRight) + pillarXOffset;
        endRight.y = 5;
        this.addChild(endRight);

        // Top rail - stretched to width, flipped vertically
        // Use pillarScaledWidth for consistent width with pillars
        const midSideTop = this.createPiece(GameSceneConstants.IMG_OBJ_TRANSPORTER_MIDDLE_SIDE);
        midSideTop.scaleX = (width - pillarScaledWidth) / midSideTop.width;
        midSideTop.scaleY = -scale;
        midSideTop.x = 15;
        midSideTop.y = pillarScaledHeight - 4;
        this.addChild(midSideTop);

        // Bottom rail - stretched to width
        const midSideBottom = this.createPiece(GameSceneConstants.IMG_OBJ_TRANSPORTER_MIDDLE_SIDE);
        midSideBottom.scaleX = (width - pillarScaledWidth) / midSideBottom.width;
        midSideBottom.scaleY = scale;
        midSideBottom.x = 15;
        midSideBottom.y = height - pillarScaledHeight + 4;
        this.addChild(midSideBottom);

        // Belt visual (animated plates)
        const beltDirection = this.isManual ? 0 : this.velocity > 0 ? 1 : -1;
        this.beltVisual = new ConveyorBeltVisual(width - 2, plateHeight, beltDirection);
        this.beltVisual.x = 0;
        this.beltVisual.y = 5;
        this.addChild(this.beltVisual);

        // Left highlight
        const highlightLeft = this.createPiece(GameSceneConstants.IMG_OBJ_TRANSPORTER_HIGHLIGHT);
        highlightLeft.scaleX = scale;
        highlightLeft.scaleY = plateHeight / highlightLeft.height;
        highlightLeft.x = 0;
        highlightLeft.y = 5;
        this.addChild(highlightLeft);

        // Right highlight (mirrored)
        const highlightRight = this.createPiece(GameSceneConstants.IMG_OBJ_TRANSPORTER_HIGHLIGHT);
        highlightRight.scaleX = -scale;
        highlightRight.scaleY = plateHeight / highlightRight.height;
        highlightRight.x = width;
        highlightRight.y = 5;
        this.addChild(highlightRight);
    }

    // Create piece with TOP-LEFT anchor and transform origin at top-left
    private createPiece(quad: number): ImageElement {
        const piece = ImageElement.create(ResourceId.IMG_OBJ_TRANSPORTER, quad);
        piece.anchor = Alignment.TOP | Alignment.LEFT;
        piece.parentAnchor = Alignment.TOP | Alignment.LEFT;
        // Make scale/rotation happen from TOP-LEFT corner
        piece.rotationCenterX = -piece.width / 2;
        piece.rotationCenterY = -piece.height / 2;
        return piece;
    }

    private cleanupMarkedItems(): void {
        const toRemove: ConveyorItem[] = [];
        for (const [item, state] of this.itemStates.entries()) {
            if (state.markedForRemoval && !this.contains(ConveyorBelt.getItemPosition(item))) {
                toRemove.push(item);
            }
        }

        for (const item of toRemove) {
            this.itemStates.delete(item);
            const index = this.items.indexOf(item);
            if (index >= 0) {
                this.items.splice(index, 1);
            }
            ConveyorBelt.restoreItemScale(item);
        }
    }

    private playManualMoveSound(): void {
        const soundId = MathHelper.randomRange(ResourceId.SND_CONV01, ResourceId.SND_CONV04);
        SoundMgr.playSound(soundId);
    }

    private static cacheBaseScale(item: ConveyorItem): void {
        if (item.conveyorBaseScaleX === undefined) {
            item.conveyorBaseScaleX = item.scaleX ?? 1;
        }
        if (item.conveyorBaseScaleY === undefined) {
            item.conveyorBaseScaleY = item.scaleY ?? 1;
        }
    }

    private static restoreItemScale(item: ConveyorItem): void {
        if (item.conveyorBaseScaleX !== undefined) {
            item.scaleX = item.conveyorBaseScaleX;
        }
        if (item.conveyorBaseScaleY !== undefined) {
            item.scaleY = item.conveyorBaseScaleY;
        }
    }

    private static applyItemScale(item: ConveyorItem, scale: number): void {
        ConveyorBelt.cacheBaseScale(item);
        const baseX = item.conveyorBaseScaleX ?? 1;
        const baseY = item.conveyorBaseScaleY ?? 1;
        item.scaleX = baseX * scale;
        item.scaleY = baseY * scale;
    }

    static getItemPosition(item: ConveyorItem): Vector {
        if (typeof item.getConveyorPosition === "function") {
            return item.getConveyorPosition();
        }
        return new Vector(item.x, item.y);
    }

    private static setItemPosition(item: ConveyorItem, position: Vector): void {
        if (typeof item.setConveyorPosition === "function") {
            item.setConveyorPosition(position);
            return;
        }
        item.x = position.x;
        item.y = position.y;
    }

    private static getItemSize(item: ConveyorItem): Vector {
        if (typeof item.getConveyorSize === "function") {
            return item.getConveyorSize();
        }
        const rawWidth = item.width ?? 0;
        const rawHeight = item.height ?? 0;
        const bbWidth = item.bb?.w ?? 0;
        const bbHeight = item.bb?.h ?? 0;
        let fallbackWidth = bbWidth > 0 ? bbWidth : rawWidth;
        let fallbackHeight = bbHeight > 0 ? bbHeight : rawHeight;

        if (
            bbWidth <= 0 &&
            bbHeight <= 0 &&
            item instanceof ImageElement &&
            item.restoreCutTransparency &&
            item.quadToDraw !== undefined &&
            item.quadToDraw !== Constants.UNDEFINED
        ) {
            const rect = item.texture?.rects[item.quadToDraw];
            if (rect) {
                fallbackWidth = rect.w + (item.texture.adjustmentMaxX ?? 0);
                fallbackHeight = rect.h + (item.texture.adjustmentMaxY ?? 0);
            }
        }
        // Keep conveyor spacing based on the item's original scale, not the edge-scaling effect.
        const scaleX = Math.abs(item.conveyorBaseScaleX ?? 1);
        const scaleY = Math.abs(item.conveyorBaseScaleY ?? 1);
        return new Vector(fallbackWidth * scaleX, fallbackHeight * scaleY);
    }

    static getItemPadding(item: ConveyorItem): number {
        if (typeof item.getConveyorPadding === "function") {
            return item.getConveyorPadding();
        }
        const size = ConveyorBelt.getItemSize(item);
        return (size.x + size.y) / 4;
    }
}

export type { ConveyorItem };
export default ConveyorBelt;
