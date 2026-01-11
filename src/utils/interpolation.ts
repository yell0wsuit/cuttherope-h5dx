import Constants from "@/utils/Constants";
import Vector from "@/core/Vector";

/**
 * Clamps alpha to [0, 1] range for interpolation.
 */
export function clampAlpha(alpha: number): number {
    return Math.min(Math.max(alpha, 0), 1);
}

/**
 * Linear interpolation between two values.
 */
export function lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
}

/**
 * Interpolates between previous and current position for smooth rendering.
 * Skips interpolation if:
 * - prevPos is uninitialized (INT_MAX)
 * - alpha >= 1 (no interpolation needed)
 * - distance exceeds maxDistanceSq (teleport/state change)
 *
 * @param prev Previous position
 * @param curr Current position
 * @param alpha Interpolation factor (0 = prev, 1 = curr)
 * @param maxDistanceSq Maximum squared distance before skipping interpolation
 * @returns Interpolated position or current position if skipped
 */
export function getInterpolatedPosition(
    prev: Vector,
    curr: Vector,
    alpha: number,
    maxDistanceSq: number
): Vector {
    // Skip interpolation if prevPos is uninitialized
    if (prev.x === Constants.INT_MAX || prev.y === Constants.INT_MAX || alpha >= 1) {
        return curr;
    }

    const dx = curr.x - prev.x;
    const dy = curr.y - prev.y;

    // Skip interpolation if distance is too large (teleport/state change)
    if (dx * dx + dy * dy > maxDistanceSq) {
        return curr;
    }

    if (alpha <= 0) {
        return prev;
    }

    return new Vector(prev.x + dx * alpha, prev.y + dy * alpha);
}
