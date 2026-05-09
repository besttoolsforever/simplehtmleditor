/**
 * Stores and restores editor selections across toolbar and dialog focus changes.
 */
export class SelectionService {
    /**
     * @param {HTMLElement} editor - Contenteditable editor boundary.
     */
    constructor(editor) {
        this.editor = editor;
        this.savedRange = null;
    }

    /**
     * Saves the current selection when it belongs to the editor.
     *
     * @returns {void}
     */
    save() {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount < 1) {
            return;
        }

        const range = selection.getRangeAt(0);
        if (this.editor.contains(range.commonAncestorContainer)) {
            this.savedRange = range.cloneRange();
        }
    }

    /**
     * Restores the last saved editor selection.
     *
     * @returns {boolean} True when a selection was restored.
     */
    restore() {
        if (!this.savedRange) {
            return false;
        }

        const selection = window.getSelection();
        if (!selection) {
            return false;
        }

        selection.removeAllRanges();
        selection.addRange(this.savedRange);
        return true;
    }

    /**
     * Clears the saved selection.
     *
     * @returns {void}
     */
    clear() {
        this.savedRange = null;
    }
}
