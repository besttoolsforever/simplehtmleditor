import {
    DEFAULT_CONTENT,
    DEFAULT_DARK_MODE,
    DEFAULT_DOCUMENT_NAME,
    DEFAULT_THEME,
    STORAGE_KEYS,
    STORAGE_SCHEMA_VERSION
} from './constants.js';
import { normalizeHtml } from './html-pipeline.js';
import { createId } from './utils.js';

function isObject(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Sanitizes a persisted document record before it reaches the editor.
 *
 * @param {object} candidate - Raw document-like object.
 * @param {string} fallbackId - Id to use when the candidate id is missing.
 * @returns {object} Safe document record.
 */
function sanitizeDocument(candidate, fallbackId) {
    const now = Date.now();
    const id = typeof candidate?.id === 'string' && candidate.id.trim() ? candidate.id.trim() : fallbackId;
    const name = typeof candidate?.name === 'string' && candidate.name.trim() ? candidate.name.trim() : DEFAULT_DOCUMENT_NAME;
    const content = normalizeHtml(typeof candidate?.content === 'string' ? candidate.content : '');
    const sourceFormat = candidate?.sourceFormat === 'md' ? 'md' : 'html';
    const sourceFileName = typeof candidate?.sourceFileName === 'string' ? candidate.sourceFileName.trim() : '';

    const createdAt = Number.isFinite(candidate?.createdAt) ? Number(candidate.createdAt) : now;
    const lastModified = Number.isFinite(candidate?.lastModified) ? Number(candidate.lastModified) : now;

    return {
        id,
        name,
        content,
        sourceFormat,
        sourceFileName,
        createdAt,
        lastModified
    };
}

/**
 * Validates the persisted app-state envelope before migration or repair.
 *
 * @param {object} state - Parsed storage state.
 * @returns {boolean} True when the shape matches the active schema.
 */
function validateStateShape(state) {
    if (!isObject(state)) {
        return false;
    }

    if (state.version !== STORAGE_SCHEMA_VERSION) {
        return false;
    }

    if (!isObject(state.config) || !isObject(state.documents) || !isObject(state.preferences)) {
        return false;
    }

    if (typeof state.config.currentDocId !== 'string') {
        return false;
    }

    if (typeof state.config.autoSaveEnabled !== 'boolean') {
        return false;
    }

    return true;
}

/**
 * Builds the first-run document store state.
 *
 * @returns {object} Default app state.
 */
function buildDefaultState() {
    const now = Date.now();
    const id = createId('doc');
    return {
        version: STORAGE_SCHEMA_VERSION,
        config: {
            currentDocId: id,
            autoSaveEnabled: true
        },
        preferences: {
            theme: DEFAULT_THEME,
            darkMode: DEFAULT_DARK_MODE
        },
        documents: {
            [id]: {
                id,
                name: DEFAULT_DOCUMENT_NAME,
                content: normalizeHtml(DEFAULT_CONTENT),
                sourceFormat: 'html',
                sourceFileName: '',
                createdAt: now,
                lastModified: now
            }
        }
    };
}

/**
 * Manages local editor documents, preferences, schema repair, and migration.
 */
export class DocumentStore {
    /**
     * @param {import('./resilient-storage.js').ResilientStorage} storage - Storage adapter.
     */
    constructor(storage) {
        this.storage = storage;
        this.state = null;
    }

    /**
     * Loads app state from storage, migrating or repairing when necessary.
     *
     * @returns {object} Active app state.
     */
    bootstrap() {
        const candidate = this.storage.readJSON(STORAGE_KEYS.appState, null, validateStateShape);

        if (candidate) {
            this.state = this.repairState(candidate);
            this.persist();
            return this.state;
        }

        this.state = this.migrateLegacyState();
        this.persist();
        return this.state;
    }

    /**
     * Converts legacy localStorage keys into the current schema.
     *
     * @returns {object} Migrated app state.
     */
    migrateLegacyState() {
        const legacyConfigRaw = this.storage.getRaw(STORAGE_KEYS.legacy.docConfig);
        const legacyDocsRaw = this.storage.getRaw(STORAGE_KEYS.legacy.docsCollection);
        const legacyContentRaw = this.storage.getRaw(STORAGE_KEYS.legacy.editorContent);
        const legacyThemeRaw = this.storage.getRaw(STORAGE_KEYS.legacy.editorTheme);

        let legacyConfig = null;
        let legacyDocs = null;

        try {
            legacyConfig = legacyConfigRaw ? JSON.parse(legacyConfigRaw) : null;
        } catch (error) {
            this.storage.quarantineCorruptPayload(STORAGE_KEYS.legacy.docConfig, legacyConfigRaw, 'legacy-invalid-json', error);
        }

        try {
            legacyDocs = legacyDocsRaw ? JSON.parse(legacyDocsRaw) : null;
        } catch (error) {
            this.storage.quarantineCorruptPayload(STORAGE_KEYS.legacy.docsCollection, legacyDocsRaw, 'legacy-invalid-json', error);
        }

        const now = Date.now();
        const nextState = {
            version: STORAGE_SCHEMA_VERSION,
            config: {
                currentDocId: '',
                autoSaveEnabled: legacyConfig?.autoSaveEnabled !== false
            },
            preferences: {
                theme: typeof legacyThemeRaw === 'string' && legacyThemeRaw.trim() ? legacyThemeRaw.trim() : DEFAULT_THEME,
                darkMode: DEFAULT_DARK_MODE
            },
            documents: {}
        };

        if (isObject(legacyDocs)) {
            Object.keys(legacyDocs).forEach((docId) => {
                nextState.documents[docId] = sanitizeDocument(legacyDocs[docId], docId);
            });
        }

        if (!Object.keys(nextState.documents).length) {
            const id = createId('doc');
            nextState.documents[id] = sanitizeDocument({
                id,
                name: DEFAULT_DOCUMENT_NAME,
                content: legacyContentRaw || DEFAULT_CONTENT,
                createdAt: now,
                lastModified: now
            }, id);
        }

        const requestedId = typeof legacyConfig?.currentDocId === 'string' ? legacyConfig.currentDocId : '';
        nextState.config.currentDocId = nextState.documents[requestedId]
            ? requestedId
            : Object.keys(nextState.documents)[0];

        return this.repairState(nextState);
    }

    /**
     * Repairs an app state object so it satisfies the active schema.
     *
     * @param {object} candidate - Candidate state.
     * @returns {object} Repaired state.
     */
    repairState(candidate) {
        const repaired = {
            version: STORAGE_SCHEMA_VERSION,
            config: {
                currentDocId: typeof candidate?.config?.currentDocId === 'string' ? candidate.config.currentDocId : '',
                autoSaveEnabled: candidate?.config?.autoSaveEnabled !== false
            },
            preferences: {
                theme: typeof candidate?.preferences?.theme === 'string' && candidate.preferences.theme.trim()
                    ? candidate.preferences.theme.trim()
                    : DEFAULT_THEME,
                darkMode: Boolean(candidate?.preferences?.darkMode)
            },
            documents: {}
        };

        if (isObject(candidate?.documents)) {
            Object.keys(candidate.documents).forEach((docId) => {
                repaired.documents[docId] = sanitizeDocument(candidate.documents[docId], docId);
            });
        }

        if (!Object.keys(repaired.documents).length) {
            const fallback = buildDefaultState();
            return fallback;
        }

        if (!repaired.documents[repaired.config.currentDocId]) {
            repaired.config.currentDocId = Object.keys(repaired.documents)[0];
        }

        return repaired;
    }

    /**
     * Persists the active state to storage.
     *
     * @returns {void}
     */
    persist() {
        if (!this.state) {
            this.state = buildDefaultState();
        }
        this.storage.writeJSON(STORAGE_KEYS.appState, this.state);
    }

    /**
     * Returns the active state, bootstrapping it if needed.
     *
     * @returns {object} Active app state.
     */
    getState() {
        if (!this.state) {
            this.bootstrap();
        }
        return this.state;
    }

    /**
     * Returns mutable document configuration.
     *
     * @returns {object} Config object.
     */
    getConfig() {
        return this.getState().config;
    }

    /**
     * Returns mutable user preferences.
     *
     * @returns {object} Preferences object.
     */
    getPreferences() {
        return this.getState().preferences;
    }

    /**
     * Gets the active document id.
     *
     * @returns {string} Current document id.
     */
    getCurrentDocId() {
        return this.getConfig().currentDocId;
    }

    /**
     * Switches the active document.
     *
     * @param {string} id - Document id.
     * @returns {boolean} True when the document exists.
     */
    setCurrentDocId(id) {
        const state = this.getState();
        if (!state.documents[id]) {
            return false;
        }
        state.config.currentDocId = id;
        this.persist();
        return true;
    }

    /**
     * Persists the auto-save setting.
     *
     * @param {boolean} enabled - Whether auto-save is enabled.
     * @returns {void}
     */
    setAutoSaveEnabled(enabled) {
        this.getState().config.autoSaveEnabled = Boolean(enabled);
        this.persist();
    }

    /**
     * Persists the current theme.
     *
     * @param {string} theme - Theme key.
     * @returns {void}
     */
    setTheme(theme) {
        this.getState().preferences.theme = theme || DEFAULT_THEME;
        this.persist();
    }

    /**
     * Persists dark mode state.
     *
     * @param {boolean} isDarkMode - Whether dark mode is enabled.
     * @returns {void}
     */
    setDarkMode(isDarkMode) {
        this.getState().preferences.darkMode = Boolean(isDarkMode);
        this.persist();
    }

    /**
     * Returns the document map.
     *
     * @returns {Record<string, object>} Documents keyed by id.
     */
    getAllDocuments() {
        return this.getState().documents;
    }

    /**
     * Lists documents in creation order.
     *
     * @returns {object[]} Ordered documents.
     */
    listDocuments() {
        return Object.values(this.getAllDocuments()).sort((a, b) => a.createdAt - b.createdAt);
    }

    /**
     * Gets a document by id.
     *
     * @param {string} id - Document id.
     * @returns {object|null} Document or null.
     */
    getDocument(id) {
        return this.getAllDocuments()[id] || null;
    }

    /**
     * Gets the active document.
     *
     * @returns {object|null} Current document.
     */
    getCurrentDocument() {
        return this.getDocument(this.getCurrentDocId());
    }

    /**
     * Creates or updates a document after sanitizing its content.
     *
     * @param {object} partialDoc - Partial document fields.
     * @returns {object} Saved document.
     */
    upsertDocument(partialDoc) {
        const docId = partialDoc?.id || createId('doc');
        const existing = this.getDocument(docId);
        const merged = sanitizeDocument({
            ...(existing || {}),
            ...(partialDoc || {}),
            id: docId,
            createdAt: existing?.createdAt || Date.now(),
            lastModified: Date.now()
        }, docId);

        this.getAllDocuments()[docId] = merged;
        this.persist();
        return merged;
    }

    /**
     * Creates a new document and makes it active.
     *
     * @param {object} [options] - New document fields.
     * @returns {object} Created document.
     */
    createDocument({
        name = 'Untitled Document',
        content = '',
        sourceFormat = 'html',
        sourceFileName = ''
    } = {}) {
        const id = createId('doc');
        const doc = sanitizeDocument({
            id,
            name,
            content,
            sourceFormat,
            sourceFileName,
            createdAt: Date.now(),
            lastModified: Date.now()
        }, id);

        this.getAllDocuments()[id] = doc;
        this.getConfig().currentDocId = id;
        this.persist();
        return doc;
    }

    /**
     * Renames a document.
     *
     * @param {string} id - Document id.
     * @param {string} newName - New document name.
     * @returns {object|null} Renamed document or null.
     */
    renameDocument(id, newName) {
        const doc = this.getDocument(id);
        if (!doc) {
            return null;
        }

        doc.name = (newName || '').trim() || doc.name;
        doc.lastModified = Date.now();
        this.persist();
        return doc;
    }

    /**
     * Deletes a document unless it is the last remaining document.
     *
     * @param {string} id - Document id.
     * @returns {boolean} True when deleted.
     */
    deleteDocument(id) {
        const documents = this.getAllDocuments();
        const ids = Object.keys(documents);

        if (!documents[id] || ids.length <= 1) {
            return false;
        }

        delete documents[id];

        if (this.getCurrentDocId() === id) {
            this.getConfig().currentDocId = Object.keys(documents)[0];
        }

        this.persist();
        return true;
    }
}
