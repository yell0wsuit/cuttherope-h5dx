enum Alignment {
    UNDEFINED = 0,
    LEFT = 1,
    HCENTER = 2,
    RIGHT = 4,
    TOP = 8,
    VCENTER = 16,
    BOTTOM = 32,
    CENTER = 18, // 2 | 16
}

export function parseAlignment(s: string): Alignment {
    const upper = s.trim().toUpperCase();
    let a = Alignment.UNDEFINED;

    if (upper.includes("LEFT")) {
        a = Alignment.LEFT;
    } else if (upper.includes("HCENTER") || upper === "CENTER") {
        a = Alignment.HCENTER;
    } else if (upper.includes("RIGHT")) {
        a = Alignment.RIGHT;
    }

    if (upper.includes("TOP")) {
        a |= Alignment.TOP;
    } else if (upper.includes("VCENTER") || upper === "CENTER") {
        a |= Alignment.VCENTER;
    } else if (upper.includes("BOTTOM")) {
        a |= Alignment.BOTTOM;
    }

    return a;
}

export default Alignment;
