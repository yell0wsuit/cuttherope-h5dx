import RGBAColor from "@/core/RGBAColor";
import Alignment from "@/core/Alignment";
import Constants from "@/utils/Constants";
import Canvas from "@/utils/Canvas";
import ActionType from "@/visual/ActionType";
import Timeline from "@/visual/Timeline";
import Radians from "@/utils/Radians";
import type { ActionData } from "@/visual/Action";

class BaseElement {
    parent: BaseElement | null;
    visible: boolean;
    touchable: boolean;
    updateable: boolean;
    name: string | null;
    x: number;
    y: number;
    drawX: number;
    drawY: number;
    width: number;
    height: number;
    rotation: number;
    rotationCenterX: number;
    rotationCenterY: number;
    scaleX: number;
    scaleY: number;
    color: RGBAColor;
    translateX: number;
    translateY: number;
    anchor: Alignment;
    parentAnchor: Alignment;
    passTransformationsToChilds: boolean;
    passColorToChilds: boolean;
    passTouchEventsToAllChilds: boolean;
    protected children: BaseElement[];
    protected timelines: Timeline[];
    currentTimelineIndex: number;
    currentTimeline: Timeline | null;
    previousAlpha: number;
    drawZeroDegreesLine?: boolean;
    isDrawBB?: boolean;
    restoreCutTransparency?: boolean;
    resId?: number;
    initTextureWithId?(resourceId: number): void;
    doRestoreCutTransparency?(): void;

    constructor() {
        this.parent = null;
        this.visible = true;
        this.touchable = true;
        this.updateable = true;
        this.name = null;
        this.x = 0;
        this.y = 0;

        // absolute coords of top left corner
        this.drawX = 0;
        this.drawY = 0;

        this.width = 0;
        this.height = 0;
        this.rotation = 0;

        // rotation center offset from the element center
        this.rotationCenterX = 0;
        this.rotationCenterY = 0;

        // use scaleX = -1 for horizontal flip, scaleY = -1 for vertical
        this.scaleX = 1;
        this.scaleY = 1;

        this.color = RGBAColor.solidOpaque.copy();
        this.translateX = 0;
        this.translateY = 0;

        // Sets the anchor on the element
        this.anchor = Alignment.TOP | Alignment.LEFT;
        this.parentAnchor = Alignment.UNDEFINED;

        // children will inherit transformations of the parent
        this.passTransformationsToChilds = true;
        // children will inherit color of the parent
        this.passColorToChilds = true;
        // touch events can be handled by multiple children
        this.passTouchEventsToAllChilds = false;

        this.children = [];
        this.timelines = [];
        this.currentTimelineIndex = Constants.UNDEFINED;
        this.currentTimeline = null;
        this.previousAlpha = 1;
    }

    calculateTopLeft(): void {
        const parentAnchor = this.parentAnchor;
        const parent = this.parent;
        const anchor = this.anchor;

        // align to parent
        if (parentAnchor !== 0 /*Alignment.UNDEFINED*/ && parent) {
            // calculate the x offset first
            if (parentAnchor & 1 /*Alignment.LEFT*/) {
                this.drawX = parent.drawX + this.x;
            } else if (parentAnchor & 2 /*Alignment.HCENTER*/) {
                this.drawX = parent.drawX + this.x + parent.width / 2;
            } else if (parentAnchor & 4 /*Alignment.RIGHT*/) {
                this.drawX = parent.drawX + this.x + parent.width;
            }

            // now calculate y offset
            if (parentAnchor & 8 /*Alignment.TOP*/) {
                this.drawY = parent.drawY + this.y;
            } else if (parentAnchor & 16 /*Alignment.VCENTER*/) {
                this.drawY = parent.drawY + this.y + parent.height / 2;
            } else if (parentAnchor & 32 /*Alignment.BOTTOM*/) {
                this.drawY = parent.drawY + this.y + parent.height;
            }
        } else {
            this.drawX = this.x;
            this.drawY = this.y;
        }

        // align self anchor
        if (!((anchor & 8) /*Alignment.TOP*/)) {
            if (anchor & 16 /*Alignment.VCENTER*/) {
                this.drawY -= this.height / 2;
            } else if (anchor & 32 /*Alignment.BOTTOM*/) {
                this.drawY -= this.height;
            }
        }

        if (!((anchor & 1) /*Alignment.LEFT*/)) {
            if (anchor & 2 /*Alignment.HCENTER*/) {
                this.drawX -= this.width / 2;
            } else if (anchor & 4 /*Alignment.RIGHT*/) {
                this.drawX -= this.width;
            }
        }
    }

    preDraw(): void {
        this.calculateTopLeft();

        const changeScale =
            this.scaleX !== 0 && this.scaleY !== 0 && (this.scaleX !== 1 || this.scaleY !== 1);
        const changeRotation = this.rotation !== 0;
        const changeTranslate = this.translateX !== 0 || this.translateY !== 0;
        const ctx = Canvas.context;

        if (!ctx) {
            return; // Exit before any ctx operations
        }

        // save existing canvas state first and then reset
        ctx.save();

        // apply transformations
        if (changeScale || changeRotation) {
            const rotationOffsetX = Math.trunc(this.drawX + this.width / 2 + this.rotationCenterX);
            const rotationOffsetY = Math.trunc(this.drawY + this.height / 2 + this.rotationCenterY);
            const translatedRotation = rotationOffsetX !== 0 || rotationOffsetY !== 0;

            // move to the right position in the canvas before changes
            if (translatedRotation) {
                ctx.translate(rotationOffsetX, rotationOffsetY);
            }

            if (changeRotation) {
                ctx.rotate(Radians.fromDegrees(this.rotation));
            }
            if (changeScale) {
                ctx.scale(this.scaleX, this.scaleY);
            }

            // move back to previous position
            if (translatedRotation) {
                ctx.translate(-rotationOffsetX, -rotationOffsetY);
            }
        }

        if (changeTranslate) {
            ctx.translate(this.translateX, this.translateY);
        }

        // change the alpha
        this.previousAlpha = ctx.globalAlpha;
        if (this.color.a !== 1 && this.color.a !== this.previousAlpha) {
            ctx.globalAlpha = this.color.a;
        }
    }

    draw(): void {
        this.preDraw();
        this.postDraw();
    }

    drawBB(): void {
        const ctx = Canvas.context;
        if (ctx) {
            ctx.strokeStyle = "red";
            ctx.strokeRect(this.drawX, this.drawY, this.width, this.height);
        }
    }

    postDraw(): void {
        const ctx = Canvas.context;
        const alphaChanged = this.color.a !== 1 && this.color.a !== this.previousAlpha;

        // for debugging, draw vector from the origin towards 0 degrees
        if (this.drawZeroDegreesLine) {
            const originX = this.drawX + (this.width >> 1) + this.rotationCenterX;
            const originY = this.drawY + (this.height >> 1) + this.rotationCenterY;

            if (ctx) {
                ctx.save();
                ctx.lineWidth = 5;
                ctx.strokeStyle = "#ff0000"; // red line
                ctx.beginPath();
                ctx.moveTo(originX, originY);
                ctx.lineTo(originX, originY - 100);
                ctx.closePath();
                ctx.stroke();
                ctx.restore();
            }
        }

        if (!this.passTransformationsToChilds) {
            if (this.isDrawBB) {
                this.drawBB();
            }

            if (ctx) {
                ctx.restore();
            }

            if (this.passColorToChilds) {
                // canvas state includes alpha so we have to set it again
                if (alphaChanged && Canvas.context) {
                    Canvas.context.globalAlpha = this.color.a;
                }
            }
        } else if (!this.passColorToChilds) {
            if (alphaChanged && Canvas.context) {
                Canvas.context.globalAlpha = this.previousAlpha;
            }
        }

        // draw children
        const children = this.children;
        const numChildren = children.length;
        for (let i = 0; i < numChildren; i++) {
            const child = children[i];
            if (child && child.visible) {
                child.draw();
            }
        }

        if (this.passTransformationsToChilds) {
            if (this.isDrawBB) {
                this.drawBB();
            }

            if (ctx) {
                ctx.restore();
            }
        } else if (this.passColorToChilds) {
            if (alphaChanged && Canvas.context) {
                Canvas.context.globalAlpha = this.previousAlpha;
            }
        }
    }

    /** Updates timelines with the elapsed time */
    update(delta: number): void {
        const children = this.children,
            numChildren = children.length;
        for (let i = 0; i < numChildren; i++) {
            const child = children[i];
            if (child && child.updateable) {
                child.update(delta);
            }
        }

        if (this.currentTimeline) {
            this.currentTimeline.update(delta);
        }
    }

    getChildWithName(name: string): BaseElement | null {
        const children = this.children;
        const numChildren = children.length;
        for (let i = 0; i < numChildren; i++) {
            const child = children[i];
            if (!child) {
                continue;
            }
            if (child.name === name) {
                return child;
            }

            const descendant = child.getChildWithName(name);
            if (descendant !== null) {
                return descendant;
            }
        }

        return null;
    }

    setSizeToChildsBounds(): void {
        this.calculateTopLeft();

        let minX = this.drawX;
        let minY = this.drawY;
        let maxX = this.drawX + this.width;
        let maxY = this.drawY + this.height;
        const children = this.children;
        const numChildren = children.length;

        for (let i = 0; i < numChildren; i++) {
            const child = children[i];
            if (!child) {
                continue;
            }
            child.calculateTopLeft();

            if (child.drawX < minX) {
                minX = child.drawX;
            }
            if (child.drawY < minY) {
                minY = child.drawY;
            }

            const childMaxX = child.drawX + child.width,
                childMaxY = child.drawY + child.height;
            if (childMaxX > maxX) {
                maxX = childMaxX;
            }
            if (childMaxY > maxY) {
                maxY = childMaxY;
            }
        }

        this.width = maxX - minX;
        this.height = maxY - minY;
    }

    /** @returns true if an action was handled */
    handleAction(a: ActionData): boolean {
        switch (a.actionName) {
            case ActionType.SET_VISIBLE:
                this.visible = a.actionSubParam !== 0;
                break;
            case ActionType.SET_UPDATEABLE:
                this.updateable = a.actionSubParam !== 0;
                break;
            case ActionType.SET_TOUCHABLE:
                this.touchable = a.actionSubParam !== 0;
                break;
            case ActionType.PLAY_TIMELINE:
                this.playTimeline(a.actionSubParam);
                break;
            case ActionType.PAUSE_TIMELINE:
                this.pauseCurrentTimeline();
                break;
            case ActionType.STOP_TIMELINE:
                this.stopCurrentTimeline();
                break;
            case ActionType.JUMP_TO_TIMELINE_FRAME: {
                const timeline = this.currentTimeline;
                if (timeline) {
                    timeline.jumpToTrack(a.actionParam, a.actionSubParam);
                }
                break;
            }
            default:
                return false;
        }

        return true;
    }

    /** @returns index of added child */
    addChild(child: BaseElement): number {
        this.children.push(child);
        child.parent = this;
        return this.children.length - 1;
    }

    addChildWithID(child: BaseElement, index: number): void {
        this.children[index] = child;
        child.parent = this;
    }

    removeChildWithID(i: number): void {
        const removed = this.children.splice(i, 1);
        const child = removed[0];
        if (child) {
            child.parent = null;
        }
    }

    removeAllChildren(): void {
        this.children.length = 0;
    }

    removeChild(c: BaseElement): void {
        const children = this.children,
            numChildren = children.length;
        for (let i = 0; i < numChildren; i++) {
            const child = children[i];
            if (c === child) {
                this.removeChildWithID(i);
                return;
            }
        }
    }

    getChild(i: number): BaseElement | undefined {
        return this.children[i];
    }

    childCount(): number {
        return this.children.length;
    }

    getChildren(): BaseElement[] {
        return this.children;
    }

    addTimeline(timeline: Timeline): number {
        const index = this.timelines.length;
        this.addTimelineWithID(timeline, index);
        return index;
    }

    addTimelineWithID(timeline: Timeline, index: number): void {
        timeline.element = this;
        this.timelines[index] = timeline;
    }

    removeTimeline(index: number): void {
        if (this.currentTimelineIndex === index) {
            this.stopCurrentTimeline();
        }

        if (index < this.timelines.length) {
            this.timelines.splice(index, 1);
        }
    }

    playTimeline(index: number): void {
        if (this.currentTimeline) {
            if (this.currentTimeline.state !== Timeline.StateType.STOPPED) {
                this.currentTimeline.stop();
            }
        }
        this.currentTimelineIndex = index;
        const timeline = this.timelines[index];
        this.currentTimeline = timeline ?? null;
        if (this.currentTimeline) {
            const timelineResource = this.currentTimeline.resourceId;
            if (timelineResource !== undefined && timelineResource !== this.resId) {
                const shouldRestoreCut = this.restoreCutTransparency;
                this.initTextureWithId?.(timelineResource);
                if (shouldRestoreCut) {
                    this.doRestoreCutTransparency?.();
                }
            }

            this.currentTimeline.play();
        }
    }

    pauseCurrentTimeline(): void {
        if (this.currentTimeline) {
            this.currentTimeline.pause();
        }
    }

    stopCurrentTimeline(): void {
        if (this.currentTimeline) {
            this.currentTimeline.stop();
            this.currentTimeline = null;
        }
        this.currentTimelineIndex = Constants.UNDEFINED;
    }

    getTimeline(index: number): Timeline | undefined {
        return this.timelines[index];
    }

    /** @returns true if event was handled */
    onTouchDown(x: number, y: number): boolean {
        let ret = false;
        const count = this.children.length;
        for (let i = count - 1; i >= 0; i--) {
            const child = this.children[i];
            if (child && child.touchable) {
                if (child.onTouchDown(x, y) && ret === false) {
                    ret = true;
                    if (!this.passTouchEventsToAllChilds) {
                        return ret;
                    }
                }
            }
        }
        return ret;
    }

    /** @returns true if event was handled */
    onTouchUp(x: number, y: number): boolean {
        let ret = false;
        const count = this.children.length;
        for (let i = count - 1; i >= 0; i--) {
            const child = this.children[i];
            if (child && child.touchable) {
                if (child.onTouchUp(x, y) && ret === false) {
                    ret = true;
                    if (!this.passTouchEventsToAllChilds) {
                        return ret;
                    }
                }
            }
        }
        return ret;
    }

    /** @returns true if event was handled */
    onTouchMove(x: number, y: number): boolean {
        let ret = false;
        const count = this.children.length;
        for (let i = count - 1; i >= 0; i--) {
            const child = this.children[i];
            if (child && child.touchable) {
                if (child.onTouchMove(x, y) && ret === false) {
                    ret = true;
                    if (!this.passTouchEventsToAllChilds) {
                        return ret;
                    }
                }
            }
        }
        return ret;
    }

    /** @returns true if event was handled */
    onDoubleClick(x: number, y: number): boolean {
        let ret = false;
        const count = this.children.length;
        for (let i = count - 1; i >= 0; i--) {
            const child = this.children[i];
            if (child && child.touchable) {
                if (child.onDoubleClick(x, y) && ret === false) {
                    ret = true;
                    if (!this.passTouchEventsToAllChilds) {
                        return ret;
                    }
                }
            }
        }
        return ret;
    }

    setEnabled(enabled: boolean): void {
        this.visible = enabled;
        this.touchable = enabled;
        this.updateable = enabled;
    }

    isEnabled(): boolean {
        return this.visible && this.touchable && this.updateable;
    }

    show(): void {
        const children = this.children,
            numChildren = children.length;
        for (let i = 0; i < numChildren; i++) {
            const child = children[i];
            if (child && child.visible) {
                child.show();
            }
        }
    }

    hide(): void {
        const children = this.children,
            numChildren = children.length;
        for (let i = 0; i < numChildren; i++) {
            const child = children[i];
            if (child && child.visible) {
                child.hide();
            }
        }
    }
}

export default BaseElement;
