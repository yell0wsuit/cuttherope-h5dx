// penner easing (we use for canvas animations)

//@t is the current time (or position) of the tween. This can be seconds or frames, steps, seconds, ms, whatever - as long as the unit is the same as is used for the total time [3].
//@b is the beginning value of the property.
//@c is the change between the beginning and destination value of the property.
//@d is the total time of the tween.

class Easing {
    static noEase(t: number, b: number, c: number, d: number) {
        return (c * t) / d + b;
    }

    static easeOutCirc(t: number, b: number, c: number, d: number) {
        return c * Math.sqrt(1 - (t = t / d - 1) * t) + b;
    }

    static easeInCirc(t: number, b: number, c: number, d: number) {
        return -c * (Math.sqrt(1 - (t /= d) * t) - 1) + b;
    }

    static easeInOutCirc(t: number, b: number, c: number, d: number) {
        if ((t /= d / 2) < 1) {
            return (-c / 2) * (Math.sqrt(1 - t * t) - 1) + b;
        }
        return (c / 2) * (Math.sqrt(1 - (t -= 2) * t) + 1) + b;
    }

    static easeInSine(t: number, b: number, c: number, d: number) {
        return -c * Math.cos((t / d) * (Math.PI / 2)) + c + b;
    }

    static easeOutSine(t: number, b: number, c: number, d: number) {
        return c * Math.sin((t / d) * (Math.PI / 2)) + b;
    }

    static easeInOutSine(t: number, b: number, c: number, d: number) {
        return (-c / 2) * (Math.cos((Math.PI * t) / d) - 1) + b;
    }

    static easeInCubic(t: number, b: number, c: number, d: number) {
        return c * (t /= d) * t * t + b;
    }

    static easeOutCubic(t: number, b: number, c: number, d: number) {
        return c * ((t = t / d - 1) * t * t + 1) + b;
    }

    static easeInOutCubic(t: number, b: number, c: number, d: number) {
        if ((t /= d / 2) < 1) {
            return (c / 2) * t * t * t + b;
        }
        return (c / 2) * ((t -= 2) * t * t + 2) + b;
    }

    static easeInExpo(t: number, b: number, c: number, d: number) {
        return t == 0 ? b : c * Math.pow(2, 10 * (t / d - 1)) + b;
    }

    static easeOutExpo(t: number, b: number, c: number, d: number) {
        return t == d ? b + c : c * (-Math.pow(2, (-10 * t) / d) + 1) + b;
    }

    static easeInOutExpo(t: number, b: number, c: number, d: number) {
        if (t == 0) {
            return b;
        }
        if (t == d) {
            return b + c;
        }
        if ((t /= d / 2) < 1) {
            return (c / 2) * Math.pow(2, 10 * (t - 1)) + b;
        }
        return (c / 2) * (-Math.pow(2, -10 * --t) + 2) + b;
    }

    static easeInBounce(t: number, b: number, c: number, d: number, s: number | undefined) {
        if (s == undefined) {
            s = 1.70158;
        }
        return c * (t /= d) * t * ((s + 1) * t - s) + b;
    }

    static easeOutBounce(t: number, b: number, c: number, d: number, s: number | undefined) {
        if (s == undefined) {
            s = 1.70158;
        }
        return c * ((t = t / d - 1) * t * ((s + 1) * t + s) + 1) + b;
    }

    static easeInOutBounce(t: number, b: number, c: number, d: number, s: number | undefined) {
        if (s == undefined) {
            s = 1.70158;
        }
        if ((t /= d / 2) < 1) {
            return (c / 2) * (t * t * (((s *= 1.525) + 1) * t - s)) + b;
        }
        return (c / 2) * ((t -= 2) * t * (((s *= 1.525) + 1) * t + s) + 2) + b;
    }

    static easeInOutQuad(t: number, b: number, c: number, d: number) {
        if ((t /= d / 2) < 1) {
            return (c / 2) * t * t + b;
        }
        return (-c / 2) * (--t * (t - 2) - 1) + b;
    }
}

export default Easing;
