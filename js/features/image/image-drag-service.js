const DRAG_START_DISTANCE_PX = 3;

/**
 * Checks whether a node belongs to the editor.
 *
 * @param {Node} node - Candidate node.
 * @param {HTMLElement} editor - Editor boundary.
 * @returns {boolean} True when inside the editor.
 */
function isNodeInsideEditor(node, editor) {
    return node === editor || editor.contains(node);
}

function createRangeFromCaretPosition(position) {
    if (!position) {
        return null;
    }

    const range = document.createRange();
    range.setStart(position.offsetNode, position.offset);
    range.collapse(true);
    return range;
}

function getRangeFromPoint(clientX, clientY) {
    if (typeof document.caretRangeFromPoint === 'function') {
        return document.caretRangeFromPoint(clientX, clientY);
    }

    if (typeof document.caretPositionFromPoint === 'function') {
        return createRangeFromCaretPosition(document.caretPositionFromPoint(clientX, clientY));
    }

    return null;
}

function createEditorEdgeRange(editor, edge) {
    const range = document.createRange();
    range.selectNodeContents(editor);
    range.collapse(edge === 'start');
    return range;
}

function anchorContainsOnlyImage(anchor, image) {
    return Array.from(anchor.childNodes).every((node) => {
        if (node === image) {
            return true;
        }

        return node.nodeType === Node.TEXT_NODE && !node.textContent.trim();
    });
}

function getDragSubject(image) {
    const parent = image.parentElement;
    if (parent?.tagName === 'A' && anchorContainsOnlyImage(parent, image)) {
        return parent;
    }

    return image;
}

function closestAnchor(node) {
    if (!node) {
        return null;
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
        return node.closest('a');
    }

    return node.parentElement?.closest('a') || null;
}

function pointToRangeFallback(clientX, clientY, editor) {
    const editorRect = editor.getBoundingClientRect();
    const edge = clientY < (editorRect.top + editorRect.height / 2) ? 'start' : 'end';

    if (
        clientY < editorRect.top
        || clientY > editorRect.bottom
        || clientX < editorRect.left
        || clientX > editorRect.right
    ) {
        return createEditorEdgeRange(editor, edge);
    }

    return null;
}

function resolveDropRangeAtPoint({ clientX, clientY, editor, dragSubject }) {
    const rawRange = getRangeFromPoint(clientX, clientY);
    const baseRange = rawRange && isNodeInsideEditor(rawRange.startContainer, editor)
        ? rawRange
        : pointToRangeFallback(clientX, clientY, editor);

    if (!baseRange) {
        return null;
    }

    const range = baseRange.cloneRange();
    range.collapse(true);

    if (dragSubject && (range.startContainer === dragSubject || dragSubject.contains(range.startContainer))) {
        const dragRect = dragSubject.getBoundingClientRect();
        const shouldInsertBefore = clientY < (dragRect.top + dragRect.height / 2);
        const adjustedRange = document.createRange();
        if (shouldInsertBefore) {
            adjustedRange.setStartBefore(dragSubject);
        } else {
            adjustedRange.setStartAfter(dragSubject);
        }
        adjustedRange.collapse(true);
        return adjustedRange;
    }

    if (dragSubject?.tagName === 'A') {
        const targetAnchor = closestAnchor(range.startContainer);
        if (targetAnchor && targetAnchor !== dragSubject && isNodeInsideEditor(targetAnchor, editor)) {
            const adjustedRange = document.createRange();
            adjustedRange.setStartAfter(targetAnchor);
            adjustedRange.collapse(true);
            return adjustedRange;
        }
    }

    return range;
}

function toRectLike(rect) {
    if (!rect) {
        return null;
    }

    return {
        left: rect.left,
        top: rect.top,
        right: rect.right,
        height: rect.height
    };
}

function getCaretRect(range) {
    const probe = range.cloneRange();
    probe.collapse(true);

    const directRects = Array.from(probe.getClientRects());
    const visibleRect = directRects.find((rect) => rect.height > 0 || rect.width > 0);
    if (visibleRect) {
        return toRectLike(visibleRect);
    }

    const container = probe.startContainer;
    const offset = probe.startOffset;

    if (container.nodeType === Node.TEXT_NODE) {
        const textLength = container.textContent?.length || 0;

        if (textLength > 0 && offset > 0) {
            const leftProbe = document.createRange();
            leftProbe.setStart(container, offset - 1);
            leftProbe.setEnd(container, offset);
            const rect = leftProbe.getBoundingClientRect();
            if (rect.height > 0 || rect.width > 0) {
                return {
                    left: rect.right,
                    top: rect.top,
                    right: rect.right,
                    height: rect.height
                };
            }
        }

        if (textLength > offset) {
            const rightProbe = document.createRange();
            rightProbe.setStart(container, offset);
            rightProbe.setEnd(container, Math.min(textLength, offset + 1));
            const rect = rightProbe.getBoundingClientRect();
            if (rect.height > 0 || rect.width > 0) {
                return {
                    left: rect.left,
                    top: rect.top,
                    right: rect.left,
                    height: rect.height
                };
            }
        }
    }

    if (container.nodeType === Node.ELEMENT_NODE) {
        const element = container;
        const forwardNode = element.childNodes[offset] || null;
        const backwardNode = offset > 0 ? element.childNodes[offset - 1] : null;
        const referenceNode = forwardNode || backwardNode || element;

        if (referenceNode.nodeType === Node.TEXT_NODE) {
            const textLength = referenceNode.textContent?.length || 0;
            if (textLength > 0) {
                const textProbe = document.createRange();
                if (forwardNode) {
                    textProbe.setStart(referenceNode, 0);
                    textProbe.setEnd(referenceNode, 1);
                    const rect = textProbe.getBoundingClientRect();
                    if (rect.height > 0 || rect.width > 0) {
                        return {
                            left: rect.left,
                            top: rect.top,
                            right: rect.left,
                            height: rect.height
                        };
                    }
                } else {
                    textProbe.setStart(referenceNode, textLength - 1);
                    textProbe.setEnd(referenceNode, textLength);
                    const rect = textProbe.getBoundingClientRect();
                    if (rect.height > 0 || rect.width > 0) {
                        return {
                            left: rect.right,
                            top: rect.top,
                            right: rect.right,
                            height: rect.height
                        };
                    }
                }
            }
        }

        if (typeof referenceNode.getBoundingClientRect === 'function') {
            const rect = referenceNode.getBoundingClientRect();
            if (rect.height > 0 || rect.width > 0) {
                const x = forwardNode ? rect.left : rect.right;
                return {
                    left: x,
                    top: rect.top,
                    right: x,
                    height: rect.height
                };
            }
        }
    }

    return null;
}

function safeSetPointerCapture(image, pointerId) {
    if (typeof image?.setPointerCapture !== 'function') {
        return;
    }

    try {
        image.setPointerCapture(pointerId);
    } catch {
        // Best effort only. We still keep document-level listeners as fallback.
    }
}

function safeReleasePointerCapture(image, pointerId) {
    if (typeof image?.releasePointerCapture !== 'function') {
        return;
    }

    try {
        if (typeof image.hasPointerCapture !== 'function' || image.hasPointerCapture(pointerId)) {
            image.releasePointerCapture(pointerId);
        }
    } catch {
        // Pointer may already be released.
    }
}

/**
 * Creates the drag-and-drop service for repositioning images inside the editor.
 *
 * @param {object} options - Drag service dependencies.
 * @returns {{beginDrag: Function, stopDrag: Function}} Drag API.
 */
export function createImageDragService({ editor, selectionService, onContentChanged }) {
    const state = {
        dragIntentActive: false,
        isDragging: false,
        usingPointerEvents: false,
        pointerId: null,
        sourceImage: null,
        dragSubject: null,
        startClientX: 0,
        startClientY: 0,
        dropRange: null,
        dropIndicator: null
    };

    function suppressNativeDrag(event) {
        event.preventDefault();
    }

    function resetState() {
        state.dragIntentActive = false;
        state.isDragging = false;
        state.usingPointerEvents = false;
        state.pointerId = null;
        state.sourceImage = null;
        state.dragSubject = null;
        state.startClientX = 0;
        state.startClientY = 0;
        state.dropRange = null;
    }

    function ensureDropIndicator() {
        if (state.dropIndicator) {
            return state.dropIndicator;
        }

        const indicator = document.createElement('div');
        indicator.className = 'image-drop-indicator';
        editor.appendChild(indicator);
        state.dropIndicator = indicator;
        return indicator;
    }

    function hideDropIndicator() {
        if (!state.dropIndicator) {
            return;
        }

        state.dropIndicator.remove();
        state.dropIndicator = null;
    }

    function getActiveImage() {
        const selectedImage = selectionService.getSelectedImage();
        if (!selectedImage || selectedImage !== state.sourceImage) {
            return null;
        }

        return selectedImage;
    }

    function applyDraggingVisualState(selectedImage) {
        selectedImage.classList.add('dragging-image');
        const resizeContainer = selectionService.getResizeContainer();
        if (resizeContainer) {
            resizeContainer.classList.add('dragging-active');
        }
        document.body.style.cursor = 'grabbing';
    }

    function removeDraggingVisualState(selectedImage) {
        if (selectedImage) {
            selectedImage.classList.remove('dragging-image');
        }

        const resizeContainer = selectionService.getResizeContainer();
        if (resizeContainer) {
            resizeContainer.classList.remove('dragging-active');
        }

        document.body.style.cursor = '';
    }

    function renderDropIndicator(range) {
        const caretRect = getCaretRect(range);
        if (!caretRect) {
            hideDropIndicator();
            return;
        }

        const editorRect = editor.getBoundingClientRect();
        const left = caretRect.left - editorRect.left + editor.scrollLeft;
        const top = caretRect.top - editorRect.top + editor.scrollTop;
        const height = Math.max(14, Math.round(caretRect.height || 0));

        const indicator = ensureDropIndicator();
        indicator.style.left = `${Math.round(left)}px`;
        indicator.style.top = `${Math.round(top)}px`;
        indicator.style.height = `${height}px`;
        indicator.classList.add('active');
    }

    function updateDropTarget(clientX, clientY) {
        const range = resolveDropRangeAtPoint({
            clientX,
            clientY,
            editor,
            dragSubject: state.dragSubject
        });

        if (!range) {
            state.dropRange = null;
            hideDropIndicator();
            return;
        }

        state.dropRange = range.cloneRange();
        renderDropIndicator(state.dropRange);
    }

    function maybeActivateDragging(clientX, clientY) {
        if (state.isDragging) {
            return true;
        }

        const deltaX = clientX - state.startClientX;
        const deltaY = clientY - state.startClientY;
        if (Math.hypot(deltaX, deltaY) < DRAG_START_DISTANCE_PX) {
            return false;
        }

        const selectedImage = getActiveImage();
        if (!selectedImage) {
            stopDrag({ commitDrop: false });
            return false;
        }

        state.isDragging = true;
        applyDraggingVisualState(selectedImage);
        updateDropTarget(clientX, clientY);
        return true;
    }

    function doDrag({ clientX, clientY, event }) {
        if (!state.dragIntentActive) {
            return;
        }

        if (!getActiveImage()) {
            stopDrag({ commitDrop: false });
            return;
        }

        event.preventDefault();

        if (!maybeActivateDragging(clientX, clientY)) {
            return;
        }

        updateDropTarget(clientX, clientY);
    }

    function commitDrop() {
        if (!state.isDragging || !state.dropRange || !state.dragSubject) {
            return false;
        }

        const selectedImage = getActiveImage() || state.sourceImage;
        if (!selectedImage) {
            return false;
        }

        const subject = state.dragSubject;
        if (!isNodeInsideEditor(subject, editor)) {
            return false;
        }

        const dropRange = state.dropRange.cloneRange();
        if (!isNodeInsideEditor(dropRange.startContainer, editor)) {
            return false;
        }

        const previousParent = subject.parentNode;
        const previousNextSibling = subject.nextSibling;

        try {
            dropRange.insertNode(subject);
        } catch {
            return false;
        }

        selectionService.updateOverlayPosition();
        return subject.parentNode !== previousParent || subject.nextSibling !== previousNextSibling;
    }

    function bindPointerListeners() {
        const selectedImage = state.sourceImage;
        if (!selectedImage) {
            return;
        }

        selectedImage.addEventListener('pointermove', handlePointerMove);
        selectedImage.addEventListener('pointerup', handlePointerUp);
        selectedImage.addEventListener('pointercancel', handlePointerCancel);
        selectedImage.addEventListener('lostpointercapture', handleLostPointerCapture);
        selectedImage.addEventListener('dragstart', suppressNativeDrag);

        document.addEventListener('pointermove', handlePointerMove);
        document.addEventListener('pointerup', handlePointerUp);
        document.addEventListener('pointercancel', handlePointerCancel);
    }

    function unbindPointerListeners() {
        const selectedImage = state.sourceImage;
        if (selectedImage) {
            selectedImage.removeEventListener('pointermove', handlePointerMove);
            selectedImage.removeEventListener('pointerup', handlePointerUp);
            selectedImage.removeEventListener('pointercancel', handlePointerCancel);
            selectedImage.removeEventListener('lostpointercapture', handleLostPointerCapture);
            selectedImage.removeEventListener('dragstart', suppressNativeDrag);
        }

        document.removeEventListener('pointermove', handlePointerMove);
        document.removeEventListener('pointerup', handlePointerUp);
        document.removeEventListener('pointercancel', handlePointerCancel);
    }

    function bindMouseListeners() {
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        state.sourceImage?.addEventListener('dragstart', suppressNativeDrag);
    }

    function unbindMouseListeners() {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        state.sourceImage?.removeEventListener('dragstart', suppressNativeDrag);
    }

    function stopDrag({ commitDrop: shouldCommitDrop = true } = {}) {
        if (!state.dragIntentActive && !state.isDragging) {
            return false;
        }

        const selectedImage = state.sourceImage;
        if (state.usingPointerEvents && selectedImage && state.pointerId !== null) {
            unbindPointerListeners();
            safeReleasePointerCapture(selectedImage, state.pointerId);
        } else {
            unbindMouseListeners();
        }

        const changed = shouldCommitDrop ? commitDrop() : false;
        removeDraggingVisualState(selectedImage);
        hideDropIndicator();
        selectionService.updateOverlayPosition();
        resetState();

        if (changed) {
            onContentChanged();
        }

        return changed;
    }

    /**
     * Begins a pointer or mouse drag interaction for the selected image.
     *
     * @param {MouseEvent|PointerEvent} event - Initial pointer/mouse event.
     * @returns {void}
     */
    function beginDrag(event) {
        if (state.dragIntentActive || state.isDragging) {
            stopDrag({ commitDrop: false });
        }

        if (event.button !== 0) {
            return;
        }

        const selectedImage = selectionService.getSelectedImage();
        if (!selectedImage) {
            return;
        }

        state.dragIntentActive = true;
        state.usingPointerEvents = typeof event.pointerId === 'number';
        state.pointerId = state.usingPointerEvents ? event.pointerId : null;
        state.sourceImage = selectedImage;
        state.dragSubject = getDragSubject(selectedImage);
        state.startClientX = event.clientX;
        state.startClientY = event.clientY;
        state.dropRange = null;

        event.preventDefault();

        if (state.usingPointerEvents) {
            safeSetPointerCapture(selectedImage, state.pointerId);
            bindPointerListeners();
            return;
        }

        bindMouseListeners();
    }

    function handlePointerMove(event) {
        if (!state.dragIntentActive || !state.usingPointerEvents || event.pointerId !== state.pointerId) {
            return;
        }

        doDrag({
            clientX: event.clientX,
            clientY: event.clientY,
            event
        });
    }

    function handlePointerUp(event) {
        if (!state.dragIntentActive || !state.usingPointerEvents || event.pointerId !== state.pointerId) {
            return;
        }

        doDrag({
            clientX: event.clientX,
            clientY: event.clientY,
            event
        });

        stopDrag({ commitDrop: true });
    }

    function handlePointerCancel(event) {
        if (!state.dragIntentActive || !state.usingPointerEvents || event.pointerId !== state.pointerId) {
            return;
        }

        stopDrag({ commitDrop: false });
    }

    function handleLostPointerCapture(event) {
        if (!state.dragIntentActive || !state.usingPointerEvents || event.pointerId !== state.pointerId) {
            return;
        }

        stopDrag({ commitDrop: true });
    }

    function handleMouseMove(event) {
        if (!state.dragIntentActive || state.usingPointerEvents) {
            return;
        }

        doDrag({
            clientX: event.clientX,
            clientY: event.clientY,
            event
        });
    }

    function handleMouseUp(event) {
        if (!state.dragIntentActive || state.usingPointerEvents) {
            return;
        }

        doDrag({
            clientX: event.clientX,
            clientY: event.clientY,
            event
        });

        stopDrag({ commitDrop: true });
    }

    return {
        beginDrag,
        stopDrag
    };
}
