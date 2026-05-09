import { createOverlayController } from '../core/overlay-controller.js';

/**
 * Initializes document management controls for local saved documents.
 *
 * @param {object} options - Document panel dependencies.
 * @returns {{close: Function}} Document panel API.
 */
export function initDocumentPanel({
    refs,
    store,
    appState,
    saveCurrentDocument,
    loadDocumentIntoEditor,
    onImportFile,
    onStatus
}) {
    const {
        toggleDocumentsButton,
        docManagerPanel,
        docNameInput,
        docListSelect,
        docNewButton,
        docSaveButton,
        docImportButton,
        docDeleteButton,
        docAutosaveToggle,
        editorContainer
    } = refs;

    if (!toggleDocumentsButton || !docManagerPanel || !docListSelect) {
        return {
            close: () => {}
        };
    }

    /**
     * Refreshes the document selector and current document name input.
     *
     * @returns {void}
     */
    function refreshDocumentList() {
        docListSelect.innerHTML = '';

        store.listDocuments().forEach((doc) => {
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = doc.name;
            if (doc.id === store.getCurrentDocId()) {
                option.selected = true;
            }
            docListSelect.appendChild(option);
        });

        const currentDoc = store.getCurrentDocument();
        if (currentDoc && docNameInput) {
            docNameInput.value = currentDoc.name;
        }
    }

    /**
     * Positions the document panel below its toolbar trigger.
     *
     * @returns {void}
     */
    function positionPanel() {
        const btnRect = toggleDocumentsButton.getBoundingClientRect();
        const containerRect = editorContainer.getBoundingClientRect();

        let left = btnRect.left - containerRect.left;
        const top = btnRect.bottom - containerRect.top + 5;

        if (left + docManagerPanel.offsetWidth > containerRect.width) {
            left = containerRect.width - docManagerPanel.offsetWidth - 10;
        }

        docManagerPanel.style.top = `${Math.max(8, top)}px`;
        docManagerPanel.style.left = `${Math.max(8, left)}px`;
    }

    const panelController = createOverlayController({
        element: docManagerPanel,
        trigger: toggleDocumentsButton,
        onOpen: () => {
            refreshDocumentList();
            if (docAutosaveToggle) {
                docAutosaveToggle.checked = appState.autoSaveEnabled;
            }
            docManagerPanel.style.display = 'block';
            docManagerPanel.style.position = 'absolute';
            docManagerPanel.style.zIndex = '99999';
            toggleDocumentsButton.setAttribute('aria-expanded', 'true');
            positionPanel();
        },
        onClose: () => {
            docManagerPanel.style.display = 'none';
            toggleDocumentsButton.setAttribute('aria-expanded', 'false');
        },
        initialFocus: () => docNameInput || docListSelect
    });

    toggleDocumentsButton.addEventListener('click', (event) => {
        event.stopPropagation();
        panelController.toggle({ invoker: toggleDocumentsButton });
    });

    window.addEventListener('resize', () => {
        if (panelController.isOpen()) {
            positionPanel();
        }
    });

    docNameInput?.addEventListener('change', () => {
        const newName = docNameInput.value.trim();
        if (!newName) {
            return;
        }

        const currentDocId = store.getCurrentDocId();
        const renamed = store.renameDocument(currentDocId, newName);
        if (renamed) {
            refreshDocumentList();
            onStatus?.('Document renamed.', { type: 'success' });
        }
    });

    docListSelect?.addEventListener('change', () => {
        const selectedDocId = docListSelect.value;
        if (!selectedDocId || selectedDocId === store.getCurrentDocId()) {
            return;
        }

        if (appState.autoSaveEnabled) {
            saveCurrentDocument('autosave');
        }

        const switched = store.setCurrentDocId(selectedDocId);
        if (!switched) {
            onStatus?.('Could not switch document.', { type: 'warning' });
            return;
        }

        appState.currentDocId = store.getCurrentDocId();
        const doc = store.getCurrentDocument();
        loadDocumentIntoEditor(doc?.content || '', {
            sourceFormat: doc?.sourceFormat,
            sourceFileName: doc?.sourceFileName
        });
        refreshDocumentList();
        onStatus?.('Document loaded.', { type: 'info' });
    });

    docNewButton?.addEventListener('click', () => {
        if (appState.autoSaveEnabled) {
            saveCurrentDocument('autosave');
        }

        const doc = store.createDocument({
            name: 'Untitled Document',
            content: ''
        });

        appState.currentDocId = doc.id;
        loadDocumentIntoEditor(doc.content, {
            sourceFormat: doc.sourceFormat,
            sourceFileName: doc.sourceFileName
        });
        refreshDocumentList();
        onStatus?.('New document created.', { type: 'success' });
    });

    docSaveButton?.addEventListener('click', () => {
        const saved = saveCurrentDocument('manual');
        if (!saved) {
            onStatus?.('Document could not be saved.', { type: 'error', assertive: true });
            return;
        }

        const originalText = docSaveButton.textContent;
        docSaveButton.textContent = 'Saved!';
        setTimeout(() => {
            docSaveButton.textContent = originalText;
        }, 1500);
    });

    docImportButton?.addEventListener('click', () => {
        if (typeof onImportFile === 'function') {
            onImportFile();
        }
    });

    docDeleteButton?.addEventListener('click', () => {
        const currentDoc = store.getCurrentDocument();
        const docName = currentDoc?.name || 'this document';

        if (store.listDocuments().length <= 1) {
            onStatus?.('Cannot delete the last remaining document.', { type: 'warning' });
            return;
        }

        if (!window.confirm(`Are you sure you want to delete "${docName}"? This action cannot be undone.`)) {
            return;
        }

        const deleted = store.deleteDocument(store.getCurrentDocId());
        if (!deleted) {
            onStatus?.('Document could not be deleted.', { type: 'error' });
            return;
        }

        const nextDoc = store.getCurrentDocument();
        appState.currentDocId = store.getCurrentDocId();
        loadDocumentIntoEditor(nextDoc?.content || '', {
            sourceFormat: nextDoc?.sourceFormat,
            sourceFileName: nextDoc?.sourceFileName
        });
        refreshDocumentList();

        const originalText = docDeleteButton.textContent;
        const originalColor = docDeleteButton.style.backgroundColor;
        docDeleteButton.textContent = 'Deleted!';
        docDeleteButton.style.backgroundColor = '#666';
        setTimeout(() => {
            docDeleteButton.textContent = originalText;
            docDeleteButton.style.backgroundColor = originalColor;
        }, 1500);

        onStatus?.('Document deleted.', { type: 'success' });
    });

    docAutosaveToggle?.addEventListener('change', () => {
        appState.autoSaveEnabled = docAutosaveToggle.checked;
        store.setAutoSaveEnabled(appState.autoSaveEnabled);
        onStatus?.(
            appState.autoSaveEnabled ? 'Auto-save enabled.' : 'Auto-save disabled.',
            { type: 'info' }
        );
    });

    refreshDocumentList();

    return {
        close: (restoreFocus = false) => panelController.close({ shouldRestoreFocus: restoreFocus })
    };
}
