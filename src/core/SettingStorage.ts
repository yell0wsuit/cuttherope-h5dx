import edition from "@/config/editions/net-edition";
import PubSub from "@/utils/PubSub";

class SettingStorage {
    static STORAGE_KEY = "ctr-js-data";
    editionPrefix: string;
    prefix: string;
    settingCache: Record<string, string>;

    constructor() {
        const editionConfig: typeof edition = edition;
        this.editionPrefix = editionConfig.settingPrefix || "";
        this.prefix = this.editionPrefix;

        this.settingCache = {};

        // Subscribe to user ID changes
        PubSub.subscribe(PubSub.ChannelId.UserIdChanged, (data: unknown) => {
            const userId = typeof data === "string" ? data : "";
            this.prefix = userId ? `${userId}-${this.editionPrefix}` : this.editionPrefix;
        });

        // Run migration once
        this.migrateOldData();
    }

    /**
     * Migration: consolidate existing localStorage keys into the single storage object
     */
    migrateOldData(): void {
        if (!window.localStorage) {
            return;
        }

        const existingData = localStorage.getItem(SettingStorage.STORAGE_KEY);
        if (existingData) {
            return;
        } // Already migrated

        const dataToMigrate: Record<string, string | null> = {};
        const keysToRemove: string[] = [];

        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key !== SettingStorage.STORAGE_KEY) {
                const value = localStorage.getItem(key);
                dataToMigrate[key] = value;
                keysToRemove.push(key);
            }
        }

        if (Object.keys(dataToMigrate).length > 0) {
            localStorage.setItem(SettingStorage.STORAGE_KEY, JSON.stringify(dataToMigrate));
            keysToRemove.forEach((key) => localStorage.removeItem(key));
        } else {
            localStorage.setItem(SettingStorage.STORAGE_KEY, JSON.stringify({}));
        }
    }

    /**
     * Get all data from consolidated storage
     */
    getAllData(): Record<string, string> {
        if (!window.localStorage) {
            return {};
        }
        try {
            const data = localStorage.getItem(SettingStorage.STORAGE_KEY);
            return data ? JSON.parse(data) : {};
        } catch (e) {
            console.error("Error parsing localStorage data:", e);
            return {};
        }
    }

    /**
     * Save data to consolidated storage
     */
    saveAllData(data: Record<string, string>): void {
        if (!window.localStorage) {
            return;
        }
        try {
            localStorage.setItem(SettingStorage.STORAGE_KEY, JSON.stringify(data));
        } catch (e) {
            console.error("Error saving localStorage data:", e);
        }
    }

    /**
     * Get setting by key
     */
    get(key: string): string | null {
        if (!window.localStorage) {
            return null;
        }
        if (key in this.settingCache) {
            return this.settingCache[key] ?? null;
        }
        const data = this.getAllData();
        return data[this.prefix + key] ?? null;
    }

    /**
     * Set setting value
     */
    set(key: string, value: string | number | null): void {
        if (!window.localStorage) {
            return;
        }
        const data = this.getAllData();
        const fullKey = this.prefix + key;

        if (value == null) {
            delete this.settingCache[key];
            delete data[fullKey];
        } else {
            const strVal = value.toString();
            this.settingCache[key] = strVal;
            data[fullKey] = strVal;
        }

        this.saveAllData(data);
    }

    /**
     * Remove setting by key
     */
    remove(key: string): void {
        if (!window.localStorage) {
            return;
        }
        delete this.settingCache[key];
        const data = this.getAllData();
        delete data[this.prefix + key];
        this.saveAllData(data);
    }

    /**
     * Get boolean value with default
     */
    getBoolOrDefault(key: string, defaultValue: boolean | null): boolean | null {
        const val = this.get(key);
        return val == null ? defaultValue : val === "true";
    }

    /**
     * Get integer value with default
     */
    getIntOrDefault(key: string, defaultValue: number | null): number | null {
        const val = this.get(key);
        return val == null ? defaultValue : parseInt(val, 10);
    }
}

// Export singleton instance
export default new SettingStorage();
