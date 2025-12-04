class MapItemDefinition {
    id: number;
    key: string;
    loader: string | null;
    priority: number;

    constructor({
        id,
        key,
        loader = null,
        priority = 1,
    }: {
        id: number;
        key: string;
        loader?: string | null;
        priority?: number;
    }) {
        this.id = id;
        this.key = key;
        this.loader = loader;
        this.priority = priority;
    }
}

/**
 * Helper to create an immutable map item definition.
 */
const createMapItem = (
    config: ConstructorParameters<typeof MapItemDefinition>[0]
): MapItemDefinition => Object.freeze(new MapItemDefinition(config));

/**
 * Registry of available map items and the loaders that handle them.
 * Items with a lower priority are processed before higher ones when loading a map.
 */
const mapItemDefinitions = {
    MAP: createMapItem({ id: 0, key: "map", loader: "loadMapSettings", priority: 0 }),
    GAME_DESIGN: createMapItem({ id: 1, key: "gameDesign", loader: "loadGameDesign", priority: 0 }),
    TARGET: createMapItem({ id: 2, key: "target", loader: "loadTarget" }),
    STAR: createMapItem({ id: 3, key: "star", loader: "loadStar" }),
    TUTORIAL_TEXT: createMapItem({ id: 4, key: "tutorialText", loader: "loadTutorialText" }),
    TUTORIAL_01: createMapItem({ id: 5, key: "tutorial01", loader: "loadTutorialImage" }),
    TUTORIAL_02: createMapItem({ id: 6, key: "tutorial02", loader: "loadTutorialImage" }),
    TUTORIAL_03: createMapItem({ id: 7, key: "tutorial03", loader: "loadTutorialImage" }),
    TUTORIAL_04: createMapItem({ id: 8, key: "tutorial04", loader: "loadTutorialImage" }),
    TUTORIAL_05: createMapItem({ id: 9, key: "tutorial05", loader: "loadTutorialImage" }),
    TUTORIAL_06: createMapItem({ id: 10, key: "tutorial06", loader: "loadTutorialImage" }),
    TUTORIAL_07: createMapItem({ id: 11, key: "tutorial07", loader: "loadTutorialImage" }),
    TUTORIAL_08: createMapItem({ id: 12, key: "tutorial08", loader: "loadTutorialImage" }),
    TUTORIAL_09: createMapItem({ id: 13, key: "tutorial09", loader: "loadTutorialImage" }),
    TUTORIAL_10: createMapItem({ id: 14, key: "tutorial10", loader: "loadTutorialImage" }),
    TUTORIAL_11: createMapItem({ id: 15, key: "tutorial11", loader: "loadTutorialImage" }),
    TUTORIAL_12: createMapItem({ id: 16, key: "tutorial12", loader: "loadTutorialImage" }),
    TUTORIAL_13: createMapItem({ id: 17, key: "tutorial13", loader: "loadTutorialImage" }),
    TUTORIAL_14: createMapItem({ id: 18, key: "tutorial14", loader: "loadTutorialImage" }),
    // leave space for future tutorial elements
    // (which the game assumes are sequentially numbered)

    CANDY_L: createMapItem({ id: 50, key: "candyL", loader: "loadCandyL", priority: 0 }),
    CANDY_R: createMapItem({ id: 51, key: "candyR", loader: "loadCandyR", priority: 0 }),
    CANDY: createMapItem({ id: 52, key: "candy", loader: "loadCandy", priority: 0 }),
    GRAVITY_SWITCH: createMapItem({ id: 53, key: "gravitySwitch", loader: "loadGravitySwitch" }),
    BUBBLE: createMapItem({ id: 54, key: "bubble", loader: "loadBubble" }),
    PUMP: createMapItem({ id: 55, key: "pump", loader: "loadPump" }),
    SOCK: createMapItem({ id: 56, key: "sock", loader: "loadSock" }),
    SPIKE_1: createMapItem({ id: 57, key: "spike1", loader: "loadSpike" }),
    SPIKE_2: createMapItem({ id: 58, key: "spike2", loader: "loadSpike" }),
    SPIKE_3: createMapItem({ id: 59, key: "spike3", loader: "loadSpike" }),
    SPIKE_4: createMapItem({ id: 60, key: "spike4", loader: "loadSpike" }),
    SPIKES_SWITCH: createMapItem({ id: 61, key: "spikesSwitch", loader: null }),
    // leave space for future spike elements

    ELECTRO: createMapItem({ id: 80, key: "electro", loader: "loadSpike" }),
    BOUNCER1: createMapItem({ id: 81, key: "bouncer1", loader: "loadBouncer" }),
    BOUNCER2: createMapItem({ id: 82, key: "bouncer2", loader: "loadBouncer" }),
    // leave space for future bouncers

    GRAB: createMapItem({ id: 100, key: "grab", loader: "loadGrab" }),
    HIDDEN_01: createMapItem({ id: 101, key: "hidden01", loader: "loadHidden" }),
    HIDDEN_02: createMapItem({ id: 102, key: "hidden02", loader: "loadHidden" }),
    HIDDEN_03: createMapItem({ id: 103, key: "hidden03", loader: "loadHidden" }),
    // leave space for additional hidden

    ROTATED_CIRCLE: createMapItem({ id: 120, key: "rotatedCircle", loader: "loadRotatedCircle" }),
    TARGET_2: createMapItem({ id: 121, key: "target2", loader: "loadTarget" }),
    CANDY_2: createMapItem({ id: 122, key: "candy2", loader: "loadCandy" }),
    GHOST: createMapItem({ id: 130, key: "ghost", loader: "loadGhost" }),
};

const mapItems = Object.values(mapItemDefinitions);
const mapItemsById = new Map(mapItems.map((definition) => [definition.id, definition]));
const mapItemsByKey = new Map(mapItems.map((definition) => [definition.key, definition]));

/**
 * Resolves a map item definition by its numeric identifier.
 */
const getMapItemDefinitionById = (id: number): MapItemDefinition | null =>
    mapItemsById.get(id) ?? null;

/**
 * Resolves a map item definition by its string key.
 */
const getMapItemDefinitionByKey = (key: string): MapItemDefinition | null =>
    mapItemsByKey.get(key) ?? null;

const getMapItem = (name: string) => {
    const definition = getMapItemDefinitionByKey(name);
    if (!definition) {
        alert(`Unknown map item: ${name}`);
        return null;
    }
    return definition.id;
};

const MapItem = Object.freeze({
    ...mapItemDefinitions,
    fromName: getMapItem,
    getDefinitionById: getMapItemDefinitionById,
    getDefinitionByKey: getMapItemDefinitionByKey,
});

export { MapItemDefinition, getMapItemDefinitionById, getMapItemDefinitionByKey, mapItemsById };

export default MapItem;
