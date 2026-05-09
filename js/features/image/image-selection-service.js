/**
 * Creates the selection overlay service for editor images.
 *
 * @param {object} options - Selection service dependencies.
 * @returns {object} Image selection API.
 */
export function createImageSelectionService({ editor, isCodeViewActive, onResizeHandleMouseDown }) {
    const state = {
        selectedImage: null,
        resizeContainer: null
    };

    /**
     * Creates resize handles around a selected image.
     *
     * @param {HTMLImageElement} image - Selected image.
     * @returns {void}
     */
    function createResizeHandles(image) {
        if (isCodeViewActive()) {
            return;
        }

        const container = document.createElement('div');
        container.className = 'image-resize-container active';

        const imgRect = image.getBoundingClientRect();
        const editorRect = editor.getBoundingClientRect();

        container.style.left = `${imgRect.left - editorRect.left + editor.scrollLeft}px`;
        container.style.top = `${imgRect.top - editorRect.top + editor.scrollTop}px`;
        container.style.width = `${imgRect.width}px`;
        container.style.height = `${imgRect.height}px`;

        ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'].forEach((position) => {
            const handle = document.createElement('div');
            handle.className = `resize-handle resize-handle-${position}`;
            handle.dataset.position = position;
            handle.addEventListener('mousedown', onResizeHandleMouseDown);
            container.appendChild(handle);
        });

        editor.appendChild(container);
        state.resizeContainer = container;
    }

    /**
     * Clears the selected image and overlay.
     *
     * @param {{clearImage?: boolean}} [options] - Clear options.
     * @returns {void}
     */
    function clearSelection({ clearImage = true } = {}) {
        if (state.resizeContainer) {
            state.resizeContainer.remove();
            state.resizeContainer = null;
        }

        if (state.selectedImage && clearImage) {
            state.selectedImage.classList.remove('image-selected');
            state.selectedImage = null;
        }
    }

    /**
     * Selects an image and renders its resize overlay.
     *
     * @param {HTMLImageElement} image - Image to select.
     * @returns {void}
     */
    function selectImage(image) {
        if (state.selectedImage === image) {
            return;
        }

        if (state.resizeContainer) {
            state.resizeContainer.remove();
            state.resizeContainer = null;
        }

        if (state.selectedImage && state.selectedImage !== image) {
            state.selectedImage.classList.remove('image-selected');
        }

        state.selectedImage = image;
        image.classList.add('image-selected');
        createResizeHandles(image);
    }

    /**
     * Repositions the overlay using measured or supplied geometry.
     *
     * @param {object|null} [geometry=null] - Optional geometry override.
     * @returns {void}
     */
    function updateOverlayPosition(geometry = null) {
        if (!state.selectedImage || !state.resizeContainer) {
            return;
        }

        if (geometry?.box) {
            const { left, top, width, height } = geometry.box;
            state.resizeContainer.style.left = `${left}px`;
            state.resizeContainer.style.top = `${top}px`;
            state.resizeContainer.style.width = `${width}px`;
            state.resizeContainer.style.height = `${height}px`;
            return;
        }

        const imgRect = geometry?.imageRect || state.selectedImage.getBoundingClientRect();
        const editorRect = geometry?.editorRect || editor.getBoundingClientRect();

        state.resizeContainer.style.left = `${imgRect.left - editorRect.left + editor.scrollLeft}px`;
        state.resizeContainer.style.top = `${imgRect.top - editorRect.top + editor.scrollTop}px`;
        state.resizeContainer.style.width = `${imgRect.width}px`;
        state.resizeContainer.style.height = `${imgRect.height}px`;
    }

    /**
     * Checks whether a pointer target is a resize handle.
     *
     * @param {Element} target - Pointer target.
     * @returns {boolean} True when target is a handle.
     */
    function isResizeHandle(target) {
        return target?.classList?.contains('resize-handle') || false;
    }

    /**
     * Checks whether a pointer target is inside the image overlay.
     *
     * @param {Element} target - Pointer target.
     * @returns {boolean} True when inside overlay.
     */
    function isInsideOverlay(target) {
        return Boolean(target?.closest('.image-resize-container'));
    }

    return {
        getSelectedImage: () => state.selectedImage,
        getResizeContainer: () => state.resizeContainer,
        selectImage,
        clearSelection,
        updateOverlayPosition,
        isResizeHandle,
        isInsideOverlay
    };
}
