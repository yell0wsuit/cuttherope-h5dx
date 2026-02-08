interface MapLayerItem {
    // Position & dimensions
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    size?: number;

    // Identifiers
    name: number | string;

    // Rotation
    angle?: number;
    handleAngle?: number;
    rotation?: number;

    // Special properties
    special?: number;
    timeout?: number;
    group?: number;
    drawing?: number;

    // Text
    text?: string;
    locale?: string;

    // Movement & physics
    path?: string | unknown[];
    moveLength?: number;
    moveVertical?: boolean;
    moveOffset?: number;
    ropePhysicsSpeed?: number;
    length?: unknown;
    moveSpeed?: number;
    rotateSpeed?: number;

    // Flags
    wheel?: boolean;
    kickable?: boolean;
    kicked?: boolean;
    invisible?: boolean;
    spider?: boolean;
    hidePath?: boolean;
    gun?: boolean;
    toggled?: number | false;
    oneHandle?: boolean;
    nightLevel?: number;
    twoParts?: number;
    litRadius?: number;
    bindBulb?: boolean;
    bulbNumber?: string;

    // Other
    part?: string;
    radius?: number;
    initialDelay?: number;
    onTime?: number;
    offTime?: number;

    // Allow additional properties for extensibility
    [key: string]: unknown;
}

// Specific loader types
interface MapSettingsItem extends MapLayerItem {
    width: number;
    height: number;
}

interface GameDesignItem extends MapLayerItem {
    special?: number;
    ropePhysicsSpeed: number;
    nightLevel: number;
    twoParts: number;
    mapOffsetX?: number;
    mapOffsetY?: number;
}

interface GrabItem extends MapLayerItem {
    x: number;
    y: number;
    length: number;
    wheel: boolean;
    moveLength: number;
    moveVertical: boolean;
    moveOffset: number;
    spider: boolean;
    radius: number;
    // Optional properties with defaults
    kickable?: boolean;
    kicked?: boolean;
    invisible?: boolean;
    hidePath?: boolean;
    gun?: boolean;
    path?: string | unknown[];
    bindBulb?: boolean;
    bulbNumber?: string;
}

interface CandyItem extends MapLayerItem {
    x: number;
    y: number;
}

interface GravitySwitchItem extends MapLayerItem {
    x: number;
    y: number;
}

interface StarItem extends MapLayerItem {
    x: number;
    y: number;
    timeout: number;
}

interface LightBulbItem extends MapLayerItem {
    x: number;
    y: number;
    litRadius: number;
    bulbNumber?: string;
}

interface TutorialTextItem extends MapLayerItem {
    x: number;
    y: number;
    special?: number;
    text?: string;
    width: number;
    locale?: string;
}

interface TutorialImageItem extends MapLayerItem {
    x: number;
    y: number;
    name: number;
    angle?: number;
    special?: number;
    locale?: string;
}

interface HiddenItem extends MapLayerItem {
    x: number;
    y: number;
    name: number;
    angle?: number;
    drawing: number;
}

interface BubbleItem extends MapLayerItem {
    x: number;
    y: number;
}

interface PumpItem extends MapLayerItem {
    x: number;
    y: number;
    angle: number;
}

interface LanternItem extends MapLayerItem {
    x: number;
    y: number;
    candyCaptured?: boolean | number | string;
}

interface SteamTubeItem extends MapLayerItem {
    x: number;
    y: number;
    angle: number;
    scale?: number;
}

interface SockItem extends MapLayerItem {
    x: number;
    y: number;
    group: number;
}

interface SpikeItem extends MapLayerItem {
    x: number;
    y: number;
    size: number;
    angle?: number;
    toggled?: number | false;
    name: number;
    initialDelay?: number;
    onTime?: number;
    offTime?: number;
}

interface RotatedCircleItem extends MapLayerItem {
    x: number;
    y: number;
    size: number;
    handleAngle?: number;
    oneHandle: boolean;
}

interface BouncerItem extends MapLayerItem {
    x: number;
    y: number;
    size: number;
    angle: number;
}

interface GhostItem extends MapLayerItem {
    x: number;
    y: number;
    radius: number;
    angle: number;
    grab?: boolean;
    bubble?: boolean;
    bouncer?: boolean;
}

interface TargetItem extends MapLayerItem {
    x: number;
    y: number;
}

interface MouseItem extends MapLayerItem {
    x: number;
    y: number;
    angle: number;
    radius: number;
    activeTime: number;
    index: number;
}

interface ConveyorBeltItem extends MapLayerItem {
    x: number;
    y: number;
    width: number;
    length: number;
    angle: number;
    velocity: number;
    direction: string;
    type?: string;
}

export type { MapLayerItem as default };
export type {
    MapSettingsItem,
    GameDesignItem,
    GrabItem,
    CandyItem,
    GravitySwitchItem,
    StarItem,
    LightBulbItem,
    TutorialTextItem,
    TutorialImageItem,
    HiddenItem,
    BubbleItem,
    PumpItem,
    LanternItem,
    SteamTubeItem,
    SockItem,
    SpikeItem,
    RotatedCircleItem,
    BouncerItem,
    GhostItem,
    TargetItem,
    MouseItem,
    ConveyorBeltItem,
};
