import { deepClone } from './utils.js';

/**
 * Creates a minimal Storage-compatible in-memory fallback.
 *
 * @returns {Storage} Storage-like object.
 */
function createMemoryStorage() {
    const map = new Map();
    return {
        getItem(key) {
            return map.has(key) ? map.get(key) : null;
        },
        setItem(key, value) {
            map.set(key, String(value));
        },
        removeItem(key) {
            map.delete(key);
        }
    };
}

/**
 * Resolves the best storage backend available in the current environment.
 *
 * @param {Storage} customStorage - Optional injected storage.
 * @returns {Storage} Storage-like backend.
 */
function resolveStorage(customStorage) {
    if (customStorage) {
        return customStorage;
    }

    try {
        const testKey = '__html_editor_storage_test__';
        window.localStorage.setItem(testKey, '1');
        window.localStorage.removeItem(testKey);
        return window.localStorage;
    } catch (error) {
        console.warn('[Storage] localStorage unavailable, using in-memory fallback.', error);
        return createMemoryStorage();
    }
}

/**
 * Storage adapter that protects the app from corrupt payloads and unavailable
 * localStorage implementations.
 */
export class ResilientStorage {
    /**
     * @param {{storage?: Storage, corruptPrefix?: string}} [options] - Storage options.
     */
    constructor({ storage, corruptPrefix = 'htmlEditor.corrupt' } = {}) {
        this.storage = resolveStorage(storage);
        this.corruptPrefix = corruptPrefix;
    }

    /**
     * Reads a raw value from storage.
     *
     * @param {string} key - Storage key.
     * @returns {string|null} Raw value or null.
     */
    getRaw(key) {
        try {
            return this.storage.getItem(key);
        } catch (error) {
            console.warn(`[Storage] read failed for key "${key}"`, error);
            return null;
        }
    }

    /**
     * Removes a storage key.
     *
     * @param {string} key - Storage key.
     * @returns {void}
     */
    remove(key) {
        try {
            this.storage.removeItem(key);
        } catch (error) {
            console.warn(`[Storage] remove failed for key "${key}"`, error);
        }
    }

    /**
     * Writes a JSON-compatible value.
     *
     * @param {string} key - Storage key.
     * @param {*} value - JSON-compatible value.
     * @returns {boolean} True when written.
     */
    writeJSON(key, value) {
        try {
            this.storage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.warn(`[Storage] write failed for key "${key}"`, error);
            return false;
        }
    }

    /**
     * Reads and validates JSON, returning a cloned fallback on failure.
     *
     * @template T
     * @param {string} key - Storage key.
     * @param {T} fallback - Fallback value.
     * @param {(value: unknown) => boolean} [validator] - Optional schema validator.
     * @returns {T|unknown} Parsed value or fallback.
     */
    readJSON(key, fallback, validator) {
        const raw = this.getRaw(key);
        if (!raw) {
            return deepClone(fallback);
        }

        let parsed;
        try {
            parsed = JSON.parse(raw);
        } catch (error) {
            this.quarantineCorruptPayload(key, raw, 'invalid-json', error);
            return deepClone(fallback);
        }

        if (typeof validator === 'function' && !validator(parsed)) {
            this.quarantineCorruptPayload(key, raw, 'schema-invalid');
            return deepClone(fallback);
        }

        return parsed;
    }

    /**
     * Moves corrupt storage content to a quarantine key for troubleshooting.
     *
     * @param {string} key - Original storage key.
     * @param {string} rawValue - Corrupt raw value.
     * @param {string} reason - Quarantine reason.
     * @param {Error} [error] - Original error.
     * @returns {void}
     */
    quarantineCorruptPayload(key, rawValue, reason, error) {
        const safeReason = String(reason || 'unknown').replace(/\s+/g, '-');
        const quarantineKey = `${this.corruptPrefix}.${key}.${safeReason}.${Date.now()}`;
        try {
            const payload = {
                key,
                reason: safeReason,
                createdAt: Date.now(),
                rawValue: String(rawValue).slice(0, 200000)
            };
            this.storage.setItem(quarantineKey, JSON.stringify(payload));
            this.storage.removeItem(key);
        } catch (quarantineError) {
            console.warn('[Storage] quarantine failed', quarantineError);
        }

        if (error) {
            console.warn(`[Storage] corrupted payload detected at key "${key}" (${safeReason})`, error);
        } else {
            console.warn(`[Storage] corrupted payload detected at key "${key}" (${safeReason})`);
        }
    }
}

/**
 * Factory for the resilient storage adapter.
 *
 * @param {{storage?: Storage, corruptPrefix?: string}} [options] - Storage options.
 * @returns {ResilientStorage} Storage adapter.
 */
export function createResilientStorage(options = {}) {
    return new ResilientStorage(options);
}
