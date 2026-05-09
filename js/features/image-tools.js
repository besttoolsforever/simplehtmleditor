import { createImageSelectionService } from './image/image-selection-service.js';
import { createImageResizeService } from './image/image-resize-service.js';
import { createImageDragService } from './image/image-drag-service.js';
import { createImageDialogService } from './image/image-dialog-service.js';

/**
 * Shows the temporary snap-to-grid status bubble near the page edge.
 *
 * @param {boolean} enabled - Whether snapping is enabled.
 * @param {number} gridSize - Active snap grid size.
 * @returns {void}
 */
function showSnapNotification(enabled, gridSize) {
    const notification = document.createElement('div');
    notification.className = 'snap-notification';
    notification.textContent = enabled ? `Snap to Grid: ON (${gridSize}px)` : 'Snap to Grid: OFF';
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 300);
    }, 2000);
}

/**
 * Initializes image insertion, selection, resize, drag, and dialog behavior.
 *
 * @param {object} options - Image tool dependencies.
 * @returns {{removeResizeHandles: Function, closeDialog: Function}} Image tool API.
 */
export function initImageTools({
    editor,
    imageDialog,
    imageRefs,
    insertImageButton,
    selectionService: textSelectionService,
    appState,
    onContentChanged,
    isCodeViewActive,
    onStatus
}) {
    let resizeService;
    const hasPointerEvents = typeof window !== 'undefined' && 'PointerEvent' in window;

    /**
     * Persists an image edit while keeping selected-image affordances in sync.
     *
     * @returns {void}
     */
    function persistImageContentChange() {
        const selectedImage = imageSelectionService.getSelectedImage();
        const shouldRestoreSelection = Boolean(selectedImage && selectedImage.isConnected);

        if (shouldRestoreSelection) {
            imageSelectionService.clearSelection();
        }

        onContentChanged();

        if (shouldRestoreSelection && selectedImage.isConnected && !isCodeViewActive()) {
            imageSelectionService.selectImage(selectedImage);
            imageSelectionService.updateOverlayPosition();
        }
    }

    const imageSelectionService = createImageSelectionService({
        editor,
        isCodeViewActive,
        onResizeHandleMouseDown: (event) => resizeService.startResize(event)
    });

    resizeService = createImageResizeService({
        appState,
        selectionService: imageSelectionService,
        onContentChanged: persistImageContentChange
    });

    const dragService = createImageDragService({
        editor,
        selectionService: imageSelectionService,
        onContentChanged: persistImageContentChange
    });

    const dialogService = createImageDialogService({
        editor,
        imageDialog,
        imageRefs,
        selectionService: textSelectionService,
        appState,
        onContentChanged: persistImageContentChange,
        isCodeViewActive,
        onStatus
    });

    dialogService.bindEvents();

    insertImageButton?.addEventListener('click', () => {
        dialogService.openForNewImage();
    });

    editor.addEventListener('dblclick', (event) => {
        if (isCodeViewActive()) {
            return;
        }

        if (event.target?.tagName === 'IMG') {
            dialogService.openForImage(event.target);
        }
    });

    editor.addEventListener('pointerdown', (event) => {
        if (!hasPointerEvents || isCodeViewActive()) {
            return;
        }

        if (imageSelectionService.isResizeHandle(event.target)) {
            return;
        }

        if (event.target?.tagName === 'IMG' && imageSelectionService.getSelectedImage() === event.target) {
            dragService.beginDrag(event);
        }
    });

    editor.addEventListener('mousedown', (event) => {
        if (imageSelectionService.isResizeHandle(event.target)) {
            resizeService.startResize(event);
            return;
        }

        if (event.target?.tagName === 'IMG' && !isCodeViewActive()) {
            if (imageSelectionService.getSelectedImage() === event.target) {
                if (!hasPointerEvents) {
                    dragService.beginDrag(event);
                }
            } else {
                setTimeout(() => imageSelectionService.selectImage(event.target), 0);
            }
            return;
        }

        if (!imageSelectionService.isInsideOverlay(event.target)) {
            imageSelectionService.clearSelection();
        }
    });

    editor.addEventListener('click', (event) => {
        if (imageSelectionService.isResizeHandle(event.target)) {
            event.preventDefault();
            event.stopPropagation();
        }
    });

    editor.addEventListener('scroll', () => {
        imageSelectionService.updateOverlayPosition();
    });

    document.addEventListener('keydown', (event) => {
        resizeService.handleKeyDown(event);

        if (event.key.toLowerCase() === 'g' && !event.ctrlKey && !event.altKey) {
            const activeElement = document.activeElement;
            const isTyping = activeElement?.tagName === 'INPUT'
                || activeElement?.tagName === 'TEXTAREA'
                || activeElement?.contentEditable === 'true';

            if (!isTyping) {
                appState.snapEnabled = !appState.snapEnabled;
                editor.classList.toggle('snap-enabled', appState.snapEnabled);
                showSnapNotification(appState.snapEnabled, appState.gridSize);
                onStatus?.(
                    appState.snapEnabled
                        ? `Snap to grid enabled (${appState.gridSize}px).`
                        : 'Snap to grid disabled.',
                    { type: 'info', throttleKey: 'snap-toggle', throttleMs: 800 }
                );
            }
        }
    });

    document.addEventListener('keyup', (event) => {
        resizeService.handleKeyUp(event);
    });

    return {
        removeResizeHandles: () => imageSelectionService.clearSelection(),
        closeDialog: () => dialogService.forceClose()
    };
}
