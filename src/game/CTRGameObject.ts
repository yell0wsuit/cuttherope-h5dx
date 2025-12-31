import GameObject from "@/visual/GameObject";
import CTRMover from "@/game/CTRMover";
import resolution from "@/resolution";
import Mover from "@/utils/Mover";

class CTRGameObject extends GameObject {
    override parseMover(item: {
        angle?: number;
        path?: string | unknown[];
        moveSpeed?: number;
        rotateSpeed?: number;
    }) {
        this.rotation = item.angle || 0;

        const path = item.path;
        const MOVER_SCALE = resolution.MOVER_SCALE;
        if (typeof path === "string") {
            let moverCapacity = Mover.MAX_CAPACITY;
            if (path[0] === "R") {
                // Don't scale the radius when used for capacity
                // calculation. We want same number of path points
                // even if the actual radius is smaller
                const rad = parseInt(path.slice(2), 10);
                moverCapacity = Math.round((rad * 3) / 2 + 1);
            }
            const v = item.moveSpeed ?? 0;
            const rotateSpeed = item.rotateSpeed;
            const mover = new CTRMover(moverCapacity, v * MOVER_SCALE, rotateSpeed);

            mover.angle = this.rotation;
            mover.setPathAndStart(path, this.x, this.y);
            this.setMover(mover);
            mover.start();
        }
    }
}

export default CTRGameObject;
