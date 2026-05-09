import assert from 'node:assert/strict';
import { ResilientStorage } from '../core/resilient-storage.js';
import { DocumentStore } from '../core/document-store.js';
import { isSafeUrl, sanitizeInlineStyle } from '../core/html-pipeline.js';
import { STORAGE_KEYS, STORAGE_SCHEMA_VERSION } from '../core/constants.js';

function createMockStorage(initial = {}) {
    const map = new Map(Object.entries(initial));
    return {
        getItem(key) {
            return map.has(key) ? map.get(key) : null;
        },
        setItem(key, value) {
            map.set(key, String(value));
        },
        removeItem(key) {
            map.delete(key);
        },
        entries() {
            return Array.from(map.entries());
        }
    };
}

function run(name, fn) {
    try {
        fn();
        console.log(`PASS ${name}`);
    } catch (error) {
        console.error(`FAIL ${name}`);
        console.error(error);
        process.exitCode = 1;
    }
}

function withMutedWarnings(fn) {
    const originalWarn = console.warn;
    console.warn = () => {};
    try {
        fn();
    } finally {
        console.warn = originalWarn;
    }
}

run('ResilientStorage quarantines invalid JSON payload', () => {
    withMutedWarnings(() => {
        const backend = createMockStorage({
            bad: '{invalid-json'
        });

        const storage = new ResilientStorage({ storage: backend, corruptPrefix: 'test.corrupt' });
        const value = storage.readJSON('bad', { ok: true });

        assert.deepEqual(value, { ok: true });

        const hasQuarantine = backend
            .entries()
            .some(([key]) => key.startsWith('test.corrupt.bad.invalid-json'));

        assert.equal(hasQuarantine, true);
        assert.equal(backend.getItem('bad'), null);
    });
});

run('DocumentStore migrates legacy data with schema v2', () => {
    const legacyConfig = {
        currentDocId: 'doc_legacy',
        autoSaveEnabled: false
    };

    const legacyDocs = {
        doc_legacy: {
            id: 'doc_legacy',
            name: 'Legacy Document',
            content: '<h1 onclick="alert(1)">Hello</h1><script>alert(1)</script>',
            createdAt: 1,
            lastModified: 2
        }
    };

    const backend = createMockStorage({
        [STORAGE_KEYS.legacy.docConfig]: JSON.stringify(legacyConfig),
        [STORAGE_KEYS.legacy.docsCollection]: JSON.stringify(legacyDocs),
        [STORAGE_KEYS.legacy.editorTheme]: 'minimal'
    });

    const storage = new ResilientStorage({ storage: backend, corruptPrefix: 'test.corrupt' });
    const store = new DocumentStore(storage);
    const state = store.bootstrap();

    assert.equal(state.version, STORAGE_SCHEMA_VERSION);
    assert.equal(state.config.currentDocId, 'doc_legacy');
    assert.equal(state.config.autoSaveEnabled, false);
    assert.equal(state.preferences.theme, 'minimal');
    assert.match(state.documents.doc_legacy.content, /<h1>Hello<\/h1>/);
    assert.doesNotMatch(state.documents.doc_legacy.content, /script/i);
    assert.doesNotMatch(state.documents.doc_legacy.content, /onclick=/i);
});

run('DocumentStore prevents deleting last remaining document', () => {
    const backend = createMockStorage();
    const storage = new ResilientStorage({ storage: backend, corruptPrefix: 'test.corrupt' });
    const store = new DocumentStore(storage);

    store.bootstrap();

    const onlyDocId = store.getCurrentDocId();
    const deleted = store.deleteDocument(onlyDocId);

    assert.equal(deleted, false);
    assert.equal(store.listDocuments().length, 1);
});

run('DocumentStore creates and switches documents safely', () => {
    const backend = createMockStorage();
    const storage = new ResilientStorage({ storage: backend, corruptPrefix: 'test.corrupt' });
    const store = new DocumentStore(storage);

    store.bootstrap();
    const firstId = store.getCurrentDocId();

    const created = store.createDocument({ name: 'Second', content: '<p>Two</p>' });
    assert.equal(store.getCurrentDocId(), created.id);
    assert.equal(store.getCurrentDocument().name, 'Second');

    const switched = store.setCurrentDocId(firstId);
    assert.equal(switched, true);
    assert.equal(store.getCurrentDocId(), firstId);
});

run('HTML pipeline rejects unsafe URL schemes', () => {
    assert.equal(isSafeUrl('javascript:alert(1)', 'href'), false);
    assert.equal(isSafeUrl('vbscript:msgbox(1)', 'href'), false);
    assert.equal(isSafeUrl('mailto:hello@example.com', 'href'), true);
    assert.equal(isSafeUrl('/relative/path.html', 'href'), true);
    assert.equal(isSafeUrl('data:image/png;base64,aGVsbG8=', 'src'), true);
    assert.equal(isSafeUrl('data:image/svg+xml,<svg></svg>', 'src'), false);
    assert.equal(isSafeUrl('data:image/png;base64,aGVsbG8=', 'href'), false);
});

run('HTML pipeline filters unsupported inline CSS', () => {
    const sanitized = sanitizeInlineStyle('position: fixed; color: red; background-image: url(javascript:alert(1)); font-size: 16px');

    assert.equal(sanitized, 'color: red; font-size: 16px');
});

if (!process.exitCode) {
    console.log('All tests passed');
}
