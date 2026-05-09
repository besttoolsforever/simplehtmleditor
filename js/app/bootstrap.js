import { getDomRefs, getImageDialogRefs, getLinkDialogRefs } from './dom-refs.js';
import { createEditorState } from '../core/editor-state.js';
import { createResilientStorage } from '../core/resilient-storage.js';
import { DocumentStore } from '../core/document-store.js';
import { normalizeHtml, parseCodeToCanonicalHtml, getCanonicalFromEditor } from '../core/html-pipeline.js';
import { EditorCommands } from '../core/editor-commands.js';
import { SelectionService } from '../core/selection-service.js';
import { CodeViewService } from '../core/code-view-service.js';
import { initToolbarBindings } from '../features/toolbar-bindings.js';
import { initLinkTools } from '../features/link-tools.js';
import { initImageTools } from '../features/image-tools.js';
import { initCopyTools } from '../features/copy-tools.js';
import { initUiControls } from '../features/ui-controls.js';
import { initDocumentPanel } from '../features/document-panel.js';
import { initFileTransferTools } from '../features/file-transfer-tools.js';
import { createFeedbackService } from '../features/feedback-service.js';
import { DEFAULT_CONTENT, STORAGE_KEYS } from '../core/constants.js';

/**
 * Boots the HTML editor after the DOM is ready and wires all feature modules.
 *
 * @returns {void}
 */
function initApp() {
    const refs = getDomRefs();
    const imageRefs = getImageDialogRefs();
    const linkRefs = getLinkDialogRefs();

    if (!refs.editor || !refs.editorContainer) {
        console.error('[Bootstrap] Required DOM nodes are missing.');
        return;
    }

    const appState = createEditorState();
    const feedback = createFeedbackService(refs.statusRegion);

    const storage = createResilientStorage({
        corruptPrefix: STORAGE_KEYS.corruptPrefix
    });

    const store = new DocumentStore(storage);
    store.bootstrap();

    appState.autoSaveEnabled = store.getConfig().autoSaveEnabled;
    appState.currentDocId = store.getCurrentDocId();

    const selectionService = new SelectionService(refs.editor);
    const commands = new EditorCommands(refs.editor);

    const codeViewService = new CodeViewService({
        editor: refs.editor,
        editorContainer: refs.editorContainer,
        toggleButton: refs.toggleViewButton
    });
    const codeSurface = document.getElementById('code-editor-surface');
    let toolbarApi = null;
    let linkTools = null;
    let imageTools = null;
    let uiControlsApi = null;
    let documentPanelApi = null;
    let fileTransferApi = null;

    /**
     * Gets canonical HTML from whichever editor mode is currently active.
     *
     * @returns {string} Canonical safe HTML.
     */
    function getCanonicalHtmlFromActiveView() {
        if (codeViewService.isActive()) {
            return parseCodeToCanonicalHtml(codeViewService.getRawCode());
        }

        return getCanonicalFromEditor(refs.editor);
    }

    /**
     * Shows a status message through the shared feedback service.
     *
     * @param {string} message - Message to show.
     * @param {object} [options] - Feedback options.
     * @returns {void}
     */
    function showStatus(message, options = {}) {
        feedback.show(message, options);
    }

    /**
     * Saves the current document, optionally respecting the auto-save setting.
     *
     * @param {object|string} [options] - Save options or legacy reason string.
     * @returns {boolean} True when the document was saved.
     */
    function saveCurrentDocument(options = {}) {
        const normalizedOptions = typeof options === 'string'
            ? {
                reason: options,
                respectAutoSave: options === 'autosave'
            }
            : options;

        const {
            respectAutoSave = true,
            reason = 'autosave'
        } = normalizedOptions;

        if (respectAutoSave && !appState.autoSaveEnabled) {
            return false;
        }

        const currentDoc = store.getCurrentDocument();
        if (!currentDoc) {
            return false;
        }

        try {
            const content = getCanonicalHtmlFromActiveView();
            store.upsertDocument({
                id: currentDoc.id,
                name: currentDoc.name,
                createdAt: currentDoc.createdAt,
                content
            });

            if (reason === 'autosave') {
                showStatus('Draft auto-saved.', {
                    type: 'info',
                    duration: 900,
                    throttleKey: 'autosave-status',
                    throttleMs: 6000
                });
            }

            if (reason === 'manual') {
                showStatus('Document saved.', { type: 'success' });
            }

            return true;
        } catch (error) {
            console.error('[Bootstrap] save failed', error);
            showStatus('Save failed. Please try again.', { type: 'error', assertive: true });
            return false;
        }
    }

    /**
     * Loads document content into the visual editor and synchronizes code view state.
     *
     * @param {string} content - HTML content to load.
     * @param {{sourceFormat?: string, sourceFileName?: string}} [options] - Source metadata.
     * @returns {void}
     */
    function loadDocumentIntoEditor(content, options = {}) {
        const canonicalHtml = normalizeHtml(content || '');
        refs.editor.innerHTML = canonicalHtml;

        if (codeViewService.isActive()) {
            codeViewService.setRawCode(canonicalHtml);
        }

        appState.currentSourceFormat = options.sourceFormat === 'md' ? 'md' : 'html';
        appState.currentSourceFileName = typeof options.sourceFileName === 'string'
            ? options.sourceFileName
            : '';
    }

    const initialDoc = store.getCurrentDocument();
    if (initialDoc && initialDoc.content) {
        refs.editor.innerHTML = normalizeHtml(initialDoc.content);
        appState.currentSourceFormat = initialDoc.sourceFormat === 'md' ? 'md' : 'html';
        appState.currentSourceFileName = initialDoc.sourceFileName || '';
    } else {
        const fallbackContent = normalizeHtml(DEFAULT_CONTENT);
        refs.editor.innerHTML = fallbackContent;

        const fallbackDoc = initialDoc
            ? {
                id: initialDoc.id,
                name: initialDoc.name,
                createdAt: initialDoc.createdAt,
                content: fallbackContent,
                sourceFormat: 'html',
                sourceFileName: ''
            }
            : {
                name: 'document1',
                content: fallbackContent,
                sourceFormat: 'html',
                sourceFileName: ''
            };

        store.upsertDocument(fallbackDoc);
        appState.currentSourceFormat = 'html';
        appState.currentSourceFileName = '';
    }

    refs.editor.addEventListener('input', () => {
        saveCurrentDocument({ respectAutoSave: true, reason: 'autosave' });
    });

    ['keyup', 'mouseup', 'click'].forEach((eventName) => {
        refs.editor.addEventListener(eventName, () => {
            if (!codeViewService.isActive()) {
                selectionService.save();
            }
        });
    });

    uiControlsApi = initUiControls({
        refs,
        store,
        appState,
        onPrint: () => window.print(),
        onStatus: showStatus
    });

    toolbarApi = initToolbarBindings({
        refs,
        commands,
        selectionService,
        isCodeViewActive: () => codeViewService.isActive(),
        onContentChanged: () => saveCurrentDocument({ respectAutoSave: true, reason: 'autosave' })
    });

    linkTools = initLinkTools({
        editor: refs.editor,
        createLinkButton: refs.createLinkButton,
        linkDialog: refs.linkDialog,
        linkRefs,
        selectionService,
        commands,
        appState,
        onContentChanged: () => saveCurrentDocument({ respectAutoSave: true, reason: 'autosave' }),
        isCodeViewActive: () => codeViewService.isActive(),
        onStatus: showStatus
    });

    imageTools = initImageTools({
        editor: refs.editor,
        imageDialog: refs.imageDialog,
        imageRefs,
        insertImageButton: refs.insertImageButton,
        selectionService,
        appState,
        onContentChanged: () => saveCurrentDocument({ respectAutoSave: true, reason: 'autosave' }),
        isCodeViewActive: () => codeViewService.isActive(),
        onStatus: showStatus
    });

    initCopyTools({
        editor: refs.editor,
        copyCodeButton: refs.copyCodeButton,
        copyContentButton: refs.copyContentButton,
        isCodeViewActive: () => codeViewService.isActive(),
        getCodeText: () => codeViewService.getRawCode(),
        getCanonicalHtml: () => getCanonicalHtmlFromActiveView(),
        onStatus: showStatus
    });

    documentPanelApi = initDocumentPanel({
        refs,
        store,
        appState,
        saveCurrentDocument: (reason = 'manual') => {
            if (reason === 'autosave') {
                return saveCurrentDocument({ respectAutoSave: true, reason: 'autosave' });
            }
            return saveCurrentDocument({ respectAutoSave: false, reason: reason || 'manual' });
        },
        loadDocumentIntoEditor,
        onImportFile: () => fileTransferApi?.openFilePicker?.(),
        onStatus: showStatus
    });

    fileTransferApi = initFileTransferTools({
        refs,
        store,
        appState,
        getCanonicalHtml: () => getCanonicalHtmlFromActiveView(),
        loadDocumentIntoEditor,
        onStatus: showStatus
    });

    /**
     * Synchronizes ARIA and toolbar state after switching editor modes.
     *
     * @returns {void}
     */
    function syncModeState() {
        const isCodeView = codeViewService.isActive();
        refs.toggleViewButton?.setAttribute('aria-pressed', String(isCodeView));
        refs.editor?.setAttribute('aria-hidden', String(isCodeView));
        codeSurface?.setAttribute('aria-hidden', String(!isCodeView));
        toolbarApi?.syncCommandAvailability();
    }

    refs.toggleViewButton?.addEventListener('click', () => {
        if (codeViewService.isActive()) {
            const { canonicalHtml } = codeViewService.toggle('');
            const safeHtml = normalizeHtml(canonicalHtml);
            refs.editor.innerHTML = safeHtml;
            appState.isCodeView = false;
            saveCurrentDocument({ respectAutoSave: false, reason: 'mode-switch' });
            syncModeState();
            showStatus('Visual view enabled.', { type: 'info' });
            return;
        }

        imageTools.removeResizeHandles();
        imageTools.closeDialog();
        linkTools?.closeDialog?.(false);
        uiControlsApi?.closeSettings?.(false);
        documentPanelApi?.close?.(false);
        const canonical = getCanonicalFromEditor(refs.editor);
        codeViewService.toggle(canonical);
        appState.isCodeView = true;
        syncModeState();
        showStatus('Code view enabled. Formatting tools disabled.', { type: 'info' });
    });

    codeSurface?.addEventListener('input', () => {
        saveCurrentDocument({ respectAutoSave: true, reason: 'autosave' });
    });

    syncModeState();

    window.addEventListener('beforeunload', () => {
        saveCurrentDocument({ respectAutoSave: true, reason: 'unload' });
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp, { once: true });
} else {
    initApp();
}
