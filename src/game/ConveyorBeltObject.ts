import Vector from "@/core/Vector";
import SoundMgr from "@/game/CTRSoundMgr";
import ResourceId from "@/resources/ResourceId";
import ConveyorBelt, { type ConveyorItem } from "@/game/ConveyorBelt";

class ConveyorBeltObject {
    private readonly pointerPositions = new Map<number, Vector>();
    private readonly list: ConveyorBelt[] = [];
    private needsSort = false;

    count(): number {
        return this.list.length;
    }

    clear(): void {
        this.list.length = 0;
        this.pointerPositions.clear();
        this.needsSort = false;
    }

    push(belt: ConveyorBelt): void {
        this.list.push(belt);
    }

    iterator(): IterableIterator<ConveyorBelt> {
        return this.list.values();
    }

    draw(): void {
        for (const belt of this.list) {
            belt.draw();
        }
    }

    attachItems(items: (ConveyorItem | null | undefined)[]): void {
        for (const item of items) {
            if (!item) {
                continue;
            }
            this.attachItemToBelts(item);
        }
    }

    processItems(items: (ConveyorItem | null | undefined)[]): void {
        for (const item of items) {
            if (!item) {
                continue;
            }
            this.processItem(item);
        }
    }

    update(deltaTime: number): void {
        for (const belt of this.list) {
            belt.update(deltaTime);
        }

        if (this.needsSort) {
            this.sortBelts();
            this.needsSort = false;
        }
    }

    remove(item: ConveyorItem): void {
        for (const belt of this.list) {
            belt.remove(item);
        }
    }

    onPointerDown(pointerX: number, pointerY: number, pointerId: number): boolean {
        for (let i = this.list.length - 1; i >= 0; i--) {
            const belt = this.list[i];
            if (belt?.onPointerDown(pointerX, pointerY, pointerId)) {
                this.pointerPositions.set(pointerId, new Vector(pointerX, pointerY));
                return true;
            }
        }
        return false;
    }

    onPointerUp(pointerX: number, pointerY: number, pointerId: number): boolean {
        for (let i = this.list.length - 1; i >= 0; i--) {
            const belt = this.list[i];
            if (belt?.onPointerUp(pointerX, pointerY, pointerId)) {
                this.pointerPositions.delete(pointerId);
                return true;
            }
        }
        return false;
    }

    onPointerMove(pointerX: number, pointerY: number, pointerId: number): boolean {
        const start = this.pointerPositions.get(pointerId);
        if (start) {
            const delta = Vector.subtract(new Vector(pointerX, pointerY), start);
            const distanceSq = delta.x * delta.x + delta.y * delta.y;
            if (distanceSq < 4) {
                return false;
            }

            const direction = delta.copy();
            direction.normalize();

            let bestDot = -1;
            let bestBelt: ConveyorBelt | null = null;
            for (const belt of this.list) {
                if (!belt.contains(start)) {
                    continue;
                }
                const dot = Math.abs(direction.getDot(belt.direction));
                if (dot >= bestDot) {
                    bestDot = dot;
                    bestBelt = belt;
                }
            }

            if (bestBelt) {
                bestBelt.onPointerDown(start.x, start.y, pointerId);
            }

            this.pointerPositions.delete(pointerId);
        }

        for (let i = this.list.length - 1; i >= 0; i--) {
            if (this.list[i]!.onPointerMove(pointerX, pointerY, pointerId)) {
                this.requestSort();
                return true;
            }
        }

        return false;
    }

    private attachItemToBelts(item: ConveyorItem): void {
        const position = ConveyorBelt.getItemPosition(item);
        for (const belt of this.list) {
            if (belt.contains(position)) {
                belt.attachItem(item);
            }
        }
    }

    private processItem(item: ConveyorItem): void {
        let manualBelt: ConveyorBelt | null = null;
        const overlappingBelts: ConveyorBelt[] = [];

        const position = ConveyorBelt.getItemPosition(item);
        const padding = ConveyorBelt.getItemPadding(item);

        for (const belt of this.list) {
            if (belt.containsWithPadding(position, padding)) {
                overlappingBelts.push(belt);
            }
            if (belt.hasItem(item)) {
                manualBelt = belt;
            }
        }

        if (manualBelt?.isManual) {
            for (const belt of overlappingBelts) {
                if (belt.isManual && belt.isActive()) {
                    this.moveItemToBelt(belt, item);
                    return;
                }
            }

            for (const belt of overlappingBelts) {
                if (!belt.isManual) {
                    this.moveItemToBelt(belt, item);
                }
            }
        }
    }

    private moveItemToBelt(belt: ConveyorBelt, item: ConveyorItem): void {
        if (!belt.hasItem(item) || belt.isItemMarkedForRemoval(item)) {
            for (const candidate of this.list) {
                if (candidate.hasItem(item)) {
                    candidate.markItemForRemoval(item);
                }
            }

            belt.attachItem(item);
            SoundMgr.playSound(ResourceId.SND_TRANSPORTER_MOVE);
        }
    }

    sortBelts(): void {
        let end = this.count() - 1;
        for (let i = end; i >= 0; i--) {
            if (this.list[i]!.isManual && this.list[i]!.isActive()) {
                for (let j = i; j < end; j++) {
                    this.swapBelts(j, j + 1);
                }
                end--;
            }
        }
        this.sortByManualFlag();
    }

    private sortByManualFlag(): void {
        let end = this.count() - 1;
        for (let i = end; i >= 0; i--) {
            if (!this.list[i]!.isManual) {
                for (let j = i; j < end; j++) {
                    this.swapBelts(j, j + 1);
                }
                end--;
            }
        }
    }

    private swapBelts(fromIndex: number, toIndex: number): void {
        const temp = this.list[fromIndex];
        this.list[fromIndex] = this.list[toIndex]!;
        this.list[toIndex] = temp!;
    }

    private requestSort(): void {
        this.needsSort = true;
    }
}

export default ConveyorBeltObject;
