/**
 * Creates a small status announcer for toast-like app feedback.
 *
 * @param {HTMLElement} regionElement - Live region element.
 * @returns {{show: Function}} Feedback API.
 */
export function createFeedbackService(regionElement) {
    let hideTimer = null;
    const throttleMap = new Map();

    /**
     * Shows a status message and announces it to assistive technology.
     *
     * @param {string} message - Message to show.
     * @param {object} [options] - Feedback display options.
     * @returns {void}
     */
    function show(message, options = {}) {
        if (!regionElement || !message) {
            return;
        }

        const {
            type = 'info',
            duration = 1800,
            throttleKey = null,
            throttleMs = 0,
            assertive = false
        } = options;

        if (throttleKey && throttleMs > 0) {
            const lastAt = throttleMap.get(throttleKey) || 0;
            const now = Date.now();
            if (now - lastAt < throttleMs) {
                return;
            }
            throttleMap.set(throttleKey, now);
        }

        if (hideTimer) {
            clearTimeout(hideTimer);
            hideTimer = null;
        }

        regionElement.textContent = message;
        regionElement.classList.remove('is-info', 'is-success', 'is-warning', 'is-error', 'is-visible');
        regionElement.classList.add(`is-${type}`);
        regionElement.classList.add('is-visible');
        regionElement.setAttribute('aria-live', assertive ? 'assertive' : 'polite');

        hideTimer = setTimeout(() => {
            regionElement.classList.remove('is-visible');
            hideTimer = null;
        }, duration);
    }

    return {
        show
    };
}
