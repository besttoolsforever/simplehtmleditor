/**
 * Checks whether an element can receive focus.
 *
 * @param {HTMLElement} element - Candidate focus target.
 * @returns {boolean} True when focusable.
 */
function isFocusable(element) {
    return Boolean(
        element
        && typeof element.focus === 'function'
        && !element.hasAttribute('disabled')
        && element.tabIndex !== -1
    );
}

/**
 * Creates a small accessible overlay controller for dialogs and popovers.
 *
 * @param {object} options - Overlay options.
 * @returns {{open: Function, close: Function, toggle: Function, isOpen: Function}} Overlay API.
 */
export function createOverlayController({
    element,
    trigger,
    onOpen,
    onClose,
    initialFocus,
    closeOnEscape = true,
    closeOnOutsideClick = true,
    outsideIgnore = []
}) {
    let open = false;
    let lastFocused = null;

    const shouldIgnoreOutsideTarget = (target) => {
        return outsideIgnore.some((item) => item && (item === target || item.contains(target)));
    };

    const handleOutsidePointerDown = (event) => {
        if (!open || !closeOnOutsideClick) {
            return;
        }

        const target = event.target;
        if (!target) {
            return;
        }

        if (element.contains(target)) {
            return;
        }

        if (trigger && trigger.contains(target)) {
            return;
        }

        if (shouldIgnoreOutsideTarget(target)) {
            return;
        }

        close();
    };

    const handleDocumentKeyDown = (event) => {
        if (!open || !closeOnEscape) {
            return;
        }

        if (event.key === 'Escape') {
            event.preventDefault();
            close();
        }
    };

    const attachListeners = () => {
        document.addEventListener('pointerdown', handleOutsidePointerDown, true);
        document.addEventListener('keydown', handleDocumentKeyDown, true);
    };

    const detachListeners = () => {
        document.removeEventListener('pointerdown', handleOutsidePointerDown, true);
        document.removeEventListener('keydown', handleDocumentKeyDown, true);
    };

    const focusInitialTarget = () => {
        const nextFocus = typeof initialFocus === 'function' ? initialFocus() : initialFocus;
        if (isFocusable(nextFocus)) {
            nextFocus.focus();
        }
    };

    const restoreFocus = () => {
        if (isFocusable(lastFocused)) {
            lastFocused.focus();
        }
    };

    const openOverlay = ({ invoker } = {}) => {
        if (open) {
            return;
        }

        lastFocused = invoker || document.activeElement;
        open = true;

        if (typeof onOpen === 'function') {
            onOpen();
        }

        element.setAttribute('aria-hidden', 'false');
        attachListeners();

        requestAnimationFrame(() => {
            focusInitialTarget();
        });
    };

    const close = ({ shouldRestoreFocus = true } = {}) => {
        if (!open) {
            return;
        }

        open = false;
        detachListeners();

        if (typeof onClose === 'function') {
            onClose();
        }

        element.setAttribute('aria-hidden', 'true');

        if (shouldRestoreFocus) {
            requestAnimationFrame(() => {
                restoreFocus();
            });
        }
    };

    const toggle = ({ invoker } = {}) => {
        if (open) {
            close();
            return;
        }

        openOverlay({ invoker });
    };

    return {
        open: openOverlay,
        close,
        toggle,
        isOpen: () => open
    };
}
