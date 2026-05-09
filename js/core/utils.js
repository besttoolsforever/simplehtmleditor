/**
 * Normalizes numeric CSS unit input for dialog fields.
 *
 * @param {string|number} value - Raw CSS unit value.
 * @returns {string} Value with px appended when only a number is supplied.
 */
export function formatUnit(value) {
    if (value === null || value === undefined) {
        return '';
    }

    const trimmed = String(value).trim();
    if (!trimmed) {
        return '';
    }

    if (!Number.isNaN(Number(trimmed))) {
        return `${trimmed}px`;
    }

    return trimmed;
}

/**
 * Normalizes user-entered link text into a safe URL value.
 *
 * @param {string} url - Raw URL from a text input.
 * @returns {string} URL with a default https scheme, or an empty string if unsafe.
 */
export function ensureProtocol(url) {
    const raw = String(url || '').trim();
    if (!raw) {
        return '';
    }

    if (/^(https?:\/\/|mailto:|tel:|\/|#|\/\/)/i.test(raw)) {
        return raw;
    }

    if (/^[a-z][a-z0-9+.-]*:/i.test(raw)) {
        return '';
    }

    return `https://${raw}`;
}

/**
 * Creates a compact document id for locally stored editor documents.
 *
 * @param {string} [prefix='doc'] - Prefix used to identify the id source.
 * @returns {string} Unique-enough id for client-side storage.
 */
export function createId(prefix = 'doc') {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Constrains a numeric value between inclusive bounds.
 *
 * @param {number} value - Candidate value.
 * @param {number} min - Lower bound.
 * @param {number} max - Upper bound.
 * @returns {number} Clamped value.
 */
export function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

/**
 * Snaps a numeric value to the nearest grid increment.
 *
 * @param {number} value - Candidate value.
 * @param {number} gridSize - Grid increment.
 * @returns {number} Snapped value.
 */
export function snapToGrid(value, gridSize) {
    return Math.round(value / gridSize) * gridSize;
}

/**
 * Deep-clones JSON-compatible data.
 *
 * @template T
 * @param {T} value - Value to clone.
 * @returns {T} Cloned value.
 */
export function deepClone(value) {
    if (value === undefined) {
        return undefined;
    }

    return JSON.parse(JSON.stringify(value));
}
