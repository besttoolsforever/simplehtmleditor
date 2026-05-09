import { ensureProtocol } from '../core/utils.js';
import { isSafeUrl } from '../core/html-pipeline.js';
import { createOverlayController } from '../core/overlay-controller.js';

/**
 * Finds a link ancestor inside the editor.
 *
 * @param {HTMLElement} rootEditor - Editor boundary element.
 * @param {Node} element - Starting node.
 * @returns {HTMLAnchorElement|null} Matching anchor element.
 */
function getParentAnchor(rootEditor, element) {
    let current = element;
    while (current && current !== rootEditor) {
        if (current.tagName === 'A') {
            return current;
        }
        current = current.parentNode;
    }
    return null;
}

/**
 * Applies safe target and rel attributes to a link.
 *
 * @param {HTMLAnchorElement} anchor - Link element to update.
 * @param {boolean} openInNewTab - Whether the link should open in a new tab.
 * @returns {void}
 */
function applyAnchorTarget(anchor, openInNewTab) {
    anchor.target = openInNewTab ? '_blank' : '_self';
    if (openInNewTab) {
        anchor.rel = 'noopener noreferrer';
    } else {
        anchor.removeAttribute('rel');
    }
}

/**
 * Wires the link dialog and link editing interactions.
 *
 * @param {object} options - Link tool dependencies.
 * @returns {{closeDialog: Function, isDialogOpen: Function}} Link tool API.
 */
export function initLinkTools({
    editor,
    createLinkButton,
    linkDialog,
    linkRefs,
    selectionService,
    commands,
    appState,
    onContentChanged,
    isCodeViewActive,
    onStatus
}) {
    const {
        linkUrlInput,
        linkNewTabCheckbox,
        saveLinkButton,
        cancelLinkButton
    } = linkRefs;

    const dialogController = createOverlayController({
        element: linkDialog,
        trigger: createLinkButton,
        onOpen: () => {
            linkDialog.classList.remove('hidden');
        },
        onClose: () => {
            linkDialog.classList.add('hidden');
            appState.currentElement = null;
        },
        initialFocus: () => linkUrlInput
    });

    function openDialog(invoker) {
        dialogController.open({ invoker });
    }

    function closeDialog(restoreFocus = true) {
        dialogController.close({ shouldRestoreFocus: restoreFocus });
    }

    createLinkButton?.addEventListener('click', () => {
        if (isCodeViewActive()) {
            onStatus?.('Switch to visual view to edit links.', { type: 'warning' });
            return;
        }

        const selection = window.getSelection();
        let anchor = null;

        if (selection && selection.rangeCount > 0) {
            const node = selection.anchorNode;
            const baseNode = node && node.nodeType === Node.TEXT_NODE ? node.parentNode : node;
            anchor = getParentAnchor(editor, baseNode);
        }

        if (anchor) {
            appState.currentElement = anchor;
            linkUrlInput.value = anchor.getAttribute('href') || '';
            linkNewTabCheckbox.checked = anchor.target === '_blank';
        } else {
            selectionService.save();
            appState.currentElement = null;
            linkUrlInput.value = 'https://';
            linkNewTabCheckbox.checked = false;
        }

        openDialog(createLinkButton);
    });

    saveLinkButton?.addEventListener('click', () => {
        const url = ensureProtocol(linkUrlInput.value);
        const openInNewTab = linkNewTabCheckbox.checked;

        if (!url || !isSafeUrl(url, 'href')) {
            onStatus?.('Please provide a valid URL for the link.', { type: 'warning' });
            return;
        }

        let success = false;
        if (appState.currentElement && appState.currentElement.tagName === 'A') {
            appState.currentElement.setAttribute('href', url);
            applyAnchorTarget(appState.currentElement, openInNewTab);
            success = true;
        } else {
            selectionService.restore();
            success = commands.createLink(url);

            const selection = window.getSelection();
            if (selection && selection.rangeCount > 0) {
                const anchor = getParentAnchor(editor, selection.anchorNode);
                if (anchor) {
                    applyAnchorTarget(anchor, openInNewTab);
                    success = true;
                }
            }
        }

        if (success) {
            closeDialog();
            onContentChanged();
            onStatus?.('Link saved.', { type: 'success' });
            return;
        }

        onStatus?.('Could not apply link to the current selection.', { type: 'warning' });
    });

    cancelLinkButton?.addEventListener('click', () => {
        closeDialog();
    });

    linkDialog.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && event.target === linkUrlInput) {
            event.preventDefault();
            saveLinkButton?.click();
        }
    });

    editor.addEventListener('dblclick', (event) => {
        if (isCodeViewActive()) {
            return;
        }

        if (event.target?.tagName === 'IMG') {
            return;
        }

        const anchor = getParentAnchor(editor, event.target);
        if (!anchor) {
            return;
        }

        appState.currentElement = anchor;
        linkUrlInput.value = anchor.getAttribute('href') || '';
        linkNewTabCheckbox.checked = anchor.target === '_blank';
        openDialog(event.target);
    });

    return {
        closeDialog: (restoreFocus = true) => closeDialog(restoreFocus),
        isDialogOpen: () => dialogController.isOpen()
    };
}
