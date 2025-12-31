import resolution from "@/resolution";
import Mover from "@/utils/Mover";
import Vector from "@/core/Vector";

class CTRMover extends Mover {
    setPathAndStart(path: string, startX: number, startY: number): void {
        const MOVER_SCALE = resolution.MOVER_SCALE;

        if (path[0] === "R") {
            let rad = parseInt(path.slice(2), 10);
            const pointsCount = Math.round((rad * 3) / 2);
            let k_increment = (2 * Math.PI) / pointsCount;
            let theta = 0;
            const clockwise = path[1] === "C";

            // now that the number of points have been calculated we
            // can scale the radius to match the current resolution
            rad *= MOVER_SCALE;

            if (!clockwise) {
                k_increment = -k_increment;
            }

            for (let i = 0; i < pointsCount; i++) {
                const nx = startX + rad * Math.cos(theta);
                const ny = startY + rad * Math.sin(theta);

                this.addPathPoint(new Vector(nx, ny));
                theta += k_increment;
            }
        } else {
            this.addPathPoint(new Vector(startX, startY));
            let pathStr = path;
            if (pathStr[pathStr.length - 1] === ",") {
                pathStr = pathStr.slice(0, pathStr.length - 1);
            }
            const parts = pathStr.split(",");
            const numParts = parts.length;
            for (let i = 0; i < numParts; i += 2) {
                const xs = parseFloat(parts[i]!);
                const ys = parseFloat(parts[i + 1]!);

                this.addPathPoint(new Vector(startX + xs * MOVER_SCALE, startY + ys * MOVER_SCALE));
            }
        }
    }
}

export default CTRMover;
