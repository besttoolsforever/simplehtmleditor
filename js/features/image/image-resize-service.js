import { snapToGrid } from '../../core/utils.js';

/**
 * Creates the mouse/keyboard image resize service.
 *
 * @param {object} options - Resize dependencies.
 * @returns {{startResize: Function, handleKeyDown: Function, handleKeyUp: Function, stopResize: Function}} Resize API.
 */
export function createImageResizeService({ appState, selectionService, onContentChanged }) {
    const state = {
        isResizing: false,
        currentHandle: null,
        startX: 0,
        startY: 0,
        startWidth: 0,
        startHeight: 0,
        aspectRatio: null,
        shiftPressed: false,
        dimensionLabel: null
    };

    /**
     * Creates or returns the floating dimensions label.
     *
     * @returns {HTMLElement} Dimensions label.
     */
    function ensureDimensionLabel() {
        if (!state.dimensionLabel) {
            state.dimensionLabel = document.createElement('div');
            state.dimensionLabel.className = 'dimension-label';
            document.body.appendChild(state.dimensionLabel);
        }
        return state.dimensionLabel;
    }

    /**
     * Starts a resize interaction from a resize handle.
     *
     * @param {MouseEvent} event - Mouse down event.
     * @returns {void}
     */
    function startResize(event) {
        if (state.isResizing) {
            return;
        }

        const selectedImage = selectionService.getSelectedImage();
        if (!selectedImage) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();

        state.isResizing = true;
        state.currentHandle = event.target.dataset.position;
        state.startX = event.clientX;
        state.startY = event.clientY;

        const rect = selectedImage.getBoundingClientRect();
        state.startWidth = rect.width;
        state.startHeight = rect.height;
        state.aspectRatio = rect.width / Math.max(1, rect.height);

        const label = ensureDimensionLabel();
        label.textContent = `${Math.round(rect.width)}px x ${Math.round(rect.height)}px`;
        label.style.display = 'block';

        document.addEventListener('mousemove', doResize);
        document.addEventListener('mouseup', stopResize);
    }

    /**
     * Applies resize deltas while dragging a handle.
     *
     * @param {MouseEvent} event - Mouse move event.
     * @returns {void}
     */
    function doResize(event) {
        if (!state.isResizing) {
            return;
        }

        const selectedImage = selectionService.getSelectedImage();
        if (!selectedImage) {
            stopResize();
            return;
        }

        const deltaX = event.clientX - state.startX;
        const deltaY = event.clientY - state.startY;

        let newWidth = state.startWidth;
        let newHeight = state.startHeight;

        switch (state.currentHandle) {
            case 'se':
            case 'e':
                newWidth = state.startWidth + deltaX;
                if (state.currentHandle === 'se') {
                    newHeight = state.startHeight + deltaY;
                }
                break;
            case 'sw':
            case 'w':
                newWidth = state.startWidth - deltaX;
                if (state.currentHandle === 'sw') {
                    newHeight = state.startHeight + deltaY;
                }
                break;
            case 'ne':
                newWidth = state.startWidth + deltaX;
                newHeight = state.startHeight - deltaY;
                break;
            case 'nw':
                newWidth = state.startWidth - deltaX;
                newHeight = state.startHeight - deltaY;
                break;
            case 's':
                newHeight = state.startHeight + deltaY;
                break;
            case 'n':
                newHeight = state.startHeight - deltaY;
                break;
            default:
                break;
        }

        if (state.shiftPressed && state.aspectRatio) {
            if (['nw', 'ne', 'se', 'sw', 'e', 'w'].includes(state.currentHandle)) {
                newHeight = newWidth / state.aspectRatio;
            } else {
                newWidth = newHeight * state.aspectRatio;
            }
        }

        newWidth = Math.max(50, newWidth);
        newHeight = Math.max(50, newHeight);

        if (appState.snapEnabled) {
            newWidth = snapToGrid(newWidth, appState.gridSize);
            newHeight = snapToGrid(newHeight, appState.gridSize);
        }

        selectedImage.style.width = `${newWidth}px`;
        selectedImage.style.height = `${newHeight}px`;

        const label = ensureDimensionLabel();
        const rect = selectedImage.getBoundingClientRect();
        label.textContent = `${Math.round(newWidth)}px x ${Math.round(newHeight)}px`;
        label.style.left = `${rect.left + rect.width / 2}px`;
        label.style.top = `${rect.top - 40}px`;

        selectionService.updateOverlayPosition();
    }

    /**
     * Finishes a resize interaction and persists the change.
     *
     * @returns {void}
     */
    function stopResize() {
        if (!state.isResizing) {
            return;
        }

        state.isResizing = false;
        document.removeEventListener('mousemove', doResize);
        document.removeEventListener('mouseup', stopResize);

        if (state.dimensionLabel) {
            state.dimensionLabel.style.opacity = '0';
            setTimeout(() => {
                if (state.dimensionLabel) {
                    state.dimensionLabel.style.display = 'none';
                    state.dimensionLabel.style.opacity = '1';
                }
            }, 200);
        }

        onContentChanged();
    }

    /**
     * Tracks Shift while resizing to lock aspect ratio.
     *
     * @param {KeyboardEvent} event - Key down event.
     * @returns {void}
     */
    function handleKeyDown(event) {
        if (event.key === 'Shift' && !state.shiftPressed) {
            state.shiftPressed = true;
            const container = selectionService.getResizeContainer();
            if (state.isResizing && container) {
                container.classList.add('aspect-locked');
            }
        }
    }

    /**
     * Clears Shift aspect lock state.
     *
     * @param {KeyboardEvent} event - Key up event.
     * @returns {void}
     */
    function handleKeyUp(event) {
        if (event.key === 'Shift' && state.shiftPressed) {
            state.shiftPressed = false;
            const container = selectionService.getResizeContainer();
            if (container) {
                container.classList.remove('aspect-locked');
            }
        }
    }

    return {
        startResize,
        handleKeyDown,
        handleKeyUp,
        stopResize
    };
}
