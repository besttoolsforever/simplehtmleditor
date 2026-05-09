import { isSafeUrl } from './html-pipeline.js';

const INLINE_TAG_MAP = {
    bold: 'strong',
    italic: 'em',
    underline: 'u'
};

const ALIGNMENT_MAP = {
    justifyLeft: 'left',
    justifyCenter: 'center',
    justifyRight: 'right',
    justifyFull: 'justify'
};

const BLOCK_TAGS = new Set([
    'P', 'DIV', 'LI', 'BLOCKQUOTE', 'PRE',
    'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
    'TD', 'TH'
]);

function unwrapElement(element) {
    const parent = element?.parentNode;
    if (!parent) {
        return;
    }

    while (element.firstChild) {
        parent.insertBefore(element.firstChild, element);
    }
    parent.removeChild(element);
}

/**
 * Normalizes a CSS value entered through a controlled toolbar field.
 *
 * @param {string} value - Raw CSS value.
 * @returns {string} Safe value or empty string.
 */
function sanitizeCssValue(value) {
    if (value === null || value === undefined) {
        return '';
    }

    const normalized = String(value).trim();
    const lowered = normalized.toLowerCase();
    if (lowered.includes('javascript:') || lowered.includes('expression(') || lowered.includes('url(')) {
        return '';
    }

    return normalized;
}

/**
 * Applies editing commands to the contenteditable surface with modern DOM
 * implementations first and document.execCommand as a compatibility fallback.
 */
export class EditorCommands {
    /**
     * @param {HTMLElement} editor - Contenteditable editor element.
     */
    constructor(editor) {
        this.editor = editor;
    }

    /**
     * Executes a browser editing command.
     *
     * @param {string} command - Browser command name.
     * @param {string|null} [value=null] - Optional command value.
     * @returns {boolean} True when the command succeeds.
     */
    execute(command, value = null) {
        this.editor.focus();
        try {
            return document.execCommand(command, false, value);
        } catch (error) {
            console.warn(`[EditorCommands] command failed: ${command}`, error);
            return false;
        }
    }

    /**
     * Gets the active selection range if it belongs to the editor.
     *
     * @returns {Range|null} Current editor range.
     */
    getSelectionRange() {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount < 1) {
            return null;
        }

        const range = selection.getRangeAt(0);
        if (!this.editor.contains(range.commonAncestorContainer)) {
            return null;
        }

        return range;
    }

    /**
     * Finds the closest ancestor matching a predicate without leaving the editor.
     *
     * @param {Node} node - Starting node.
     * @param {(node: Element) => boolean} predicate - Match predicate.
     * @returns {Element|null} Matching element.
     */
    getClosestElement(node, predicate) {
        let current = node && node.nodeType === Node.TEXT_NODE ? node.parentNode : node;
        while (current && current !== this.editor) {
            if (predicate(current)) {
                return current;
            }
            current = current.parentNode;
        }
        return null;
    }

    /**
     * Collects block elements touched by a selection range.
     *
     * @param {Range} range - Selection range.
     * @returns {Element[]} Matching block elements.
     */
    collectSelectedBlocks(range) {
        const blocks = [];
        const walker = document.createTreeWalker(this.editor, NodeFilter.SHOW_ELEMENT, {
            acceptNode: (node) => {
                if (!BLOCK_TAGS.has(node.tagName)) {
                    return NodeFilter.FILTER_SKIP;
                }

                try {
                    return range.intersectsNode(node) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
                } catch {
                    return NodeFilter.FILTER_SKIP;
                }
            }
        });

        while (walker.nextNode()) {
            blocks.push(walker.currentNode);
        }

        if (!blocks.length) {
            const fallback = this.getClosestElement(range.startContainer, (node) => BLOCK_TAGS.has(node.tagName));
            if (fallback) {
                blocks.push(fallback);
            }
        }

        return blocks;
    }

    /**
     * Toggles a supported inline formatting command around the selection.
     *
     * @param {string} command - Inline command name.
     * @returns {boolean} True when formatting was applied.
     */
    toggleInline(command) {
        const tagName = INLINE_TAG_MAP[command];
        if (!tagName) {
            return false;
        }

        const range = this.getSelectionRange();
        if (!range || range.collapsed) {
            return false;
        }

        const selection = window.getSelection();
        const startWrapper = this.getClosestElement(range.startContainer, (node) => node.tagName?.toLowerCase() === tagName);
        const endWrapper = this.getClosestElement(range.endContainer, (node) => node.tagName?.toLowerCase() === tagName);

        if (startWrapper && startWrapper === endWrapper) {
            unwrapElement(startWrapper);
            return true;
        }

        const wrapper = document.createElement(tagName);
        const fragment = range.extractContents();
        wrapper.appendChild(fragment);
        range.insertNode(wrapper);

        const newRange = document.createRange();
        newRange.selectNodeContents(wrapper);
        selection.removeAllRanges();
        selection.addRange(newRange);
        return true;
    }

    /**
     * Applies text alignment to selected blocks.
     *
     * @param {string} command - Alignment command name.
     * @returns {boolean} True when alignment was applied.
     */
    applyAlignment(command) {
        const alignment = ALIGNMENT_MAP[command];
        if (!alignment) {
            return false;
        }

        const range = this.getSelectionRange();
        if (!range) {
            return false;
        }

        const blocks = this.collectSelectedBlocks(range);
        if (!blocks.length) {
            return false;
        }

        blocks.forEach((block) => {
            block.style.textAlign = alignment;
        });

        return true;
    }

    /**
     * Creates an ordered or unordered list from selected blocks or text.
     *
     * @param {string} command - List command name.
     * @returns {boolean} True when a list was created.
     */
    createList(command) {
        const isOrdered = command === 'insertOrderedList';
        if (!isOrdered && command !== 'insertUnorderedList') {
            return false;
        }

        const range = this.getSelectionRange();
        if (!range) {
            return false;
        }

        const blocks = this.collectSelectedBlocks(range).filter((block) => block !== this.editor);
        const list = document.createElement(isOrdered ? 'ol' : 'ul');

        if (blocks.length) {
            const firstBlock = blocks[0];
            const parent = firstBlock.parentNode;

            blocks.forEach((block) => {
                const li = document.createElement('li');
                li.innerHTML = block.innerHTML || block.textContent || '';
                list.appendChild(li);
            });

            parent.insertBefore(list, firstBlock);
            blocks.forEach((block) => {
                if (block.parentNode) {
                    block.parentNode.removeChild(block);
                }
            });
            return true;
        }

        if (range.collapsed) {
            return false;
        }

        const textLines = range
            .toString()
            .split(/\n+/)
            .map((line) => line.trim())
            .filter(Boolean);

        if (!textLines.length) {
            return false;
        }

        textLines.forEach((line) => {
            const li = document.createElement('li');
            li.textContent = line;
            list.appendChild(li);
        });

        range.deleteContents();
        range.insertNode(list);
        return true;
    }

    /**
     * Wraps selected content in a span with inline styles.
     *
     * @param {Record<string, string>} styles - CSS property/value map.
     * @returns {boolean} True when styles were applied.
     */
    applyInlineStyles(styles) {
        const range = this.getSelectionRange();
        if (!range || range.collapsed) {
            return false;
        }

        const styleEntries = Object.entries(styles || {}).filter(([, value]) => sanitizeCssValue(value));
        if (!styleEntries.length) {
            return false;
        }

        const selection = window.getSelection();
        const fragment = range.extractContents();
        const wrapper = document.createElement('span');
        styleEntries.forEach(([property, value]) => {
            wrapper.style[property] = sanitizeCssValue(value);
        });
        wrapper.appendChild(fragment);
        range.insertNode(wrapper);

        const newRange = document.createRange();
        newRange.selectNodeContents(wrapper);
        selection.removeAllRanges();
        selection.addRange(newRange);
        return true;
    }

    /**
     * Creates a link using DOM Range APIs.
     *
     * @param {string} url - Safe link URL.
     * @returns {boolean} True when the link was created.
     */
    createLinkModern(url) {
        const range = this.getSelectionRange();
        if (!range) {
            return false;
        }

        const selection = window.getSelection();

        if (range.collapsed) {
            const anchor = document.createElement('a');
            anchor.href = url;
            anchor.textContent = url;
            range.insertNode(anchor);

            const newRange = document.createRange();
            newRange.selectNodeContents(anchor);
            selection.removeAllRanges();
            selection.addRange(newRange);
            return true;
        }

        const fragment = range.extractContents();
        if (fragment.querySelectorAll) {
            fragment.querySelectorAll('a').forEach((nestedAnchor) => unwrapElement(nestedAnchor));
        }

        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.appendChild(fragment);
        range.insertNode(anchor);

        const newRange = document.createRange();
        newRange.selectNodeContents(anchor);
        selection.removeAllRanges();
        selection.addRange(newRange);
        return true;
    }

    /**
     * Removes a link from the current selection using DOM APIs.
     *
     * @returns {boolean} True when a link was removed.
     */
    removeLinkModern() {
        const range = this.getSelectionRange();
        if (!range) {
            return false;
        }

        const singleAnchor = this.getClosestElement(range.startContainer, (node) => node.tagName === 'A');
        if (singleAnchor) {
            unwrapElement(singleAnchor);
            return true;
        }

        const anchors = Array.from(this.editor.querySelectorAll('a')).filter((anchor) => {
            try {
                return range.intersectsNode(anchor);
            } catch {
                return false;
            }
        });

        if (!anchors.length) {
            return false;
        }

        anchors.forEach((anchor) => unwrapElement(anchor));
        return true;
    }

    /**
     * Formats the current selection using the best available implementation.
     *
     * @param {string} command - Formatting command.
     * @returns {boolean} True when formatting was applied.
     */
    format(command) {
        if (INLINE_TAG_MAP[command]) {
            const applied = this.toggleInline(command);
            if (applied) {
                return true;
            }
            return this.execute(command);
        }

        if (ALIGNMENT_MAP[command]) {
            const applied = this.applyAlignment(command);
            if (applied) {
                return true;
            }
            return this.execute(command);
        }

        if (command === 'insertOrderedList' || command === 'insertUnorderedList') {
            const applied = this.createList(command);
            if (applied) {
                return true;
            }
            return this.execute(command);
        }

        if (command === 'unlink') {
            return this.removeLink();
        }

        return this.execute(command);
    }

    /**
     * Applies a font family to the current selection.
     *
     * @param {string} fontFamily - CSS font-family value.
     * @returns {boolean} True when applied.
     */
    applyFontFamily(fontFamily) {
        const normalized = sanitizeCssValue(fontFamily);
        if (!normalized) {
            return false;
        }

        const applied = this.applyInlineStyles({ fontFamily: normalized });
        if (applied) {
            return true;
        }

        return this.execute('fontName', normalized);
    }

    /**
     * Applies a font size to the current selection.
     *
     * @param {string} fontSize - CSS font-size value.
     * @returns {boolean} True when applied.
     */
    applyFontSize(fontSize) {
        const normalized = sanitizeCssValue(fontSize);
        if (!normalized) {
            return false;
        }

        const applied = this.applyInlineStyles({ fontSize: normalized });
        if (applied) {
            return true;
        }

        const success = this.execute('fontSize', '7');
        if (success) {
            const fontElements = this.editor.getElementsByTagName('font');
            for (let i = 0; i < fontElements.length; i += 1) {
                if (fontElements[i].size === '7') {
                    fontElements[i].removeAttribute('size');
                    fontElements[i].style.fontSize = normalized;
                }
            }
        }
        return success;
    }

    /**
     * Applies foreground color to the current selection.
     *
     * @param {string} color - CSS color value.
     * @returns {boolean} True when applied.
     */
    setTextColor(color) {
        const normalized = sanitizeCssValue(color);
        if (!normalized) {
            return false;
        }

        const applied = this.applyInlineStyles({ color: normalized });
        if (applied) {
            return true;
        }

        return this.execute('foreColor', normalized);
    }

    /**
     * Applies highlight color to the current selection.
     *
     * @param {string} color - CSS color value.
     * @returns {boolean} True when applied.
     */
    setHighlightColor(color) {
        const normalized = sanitizeCssValue(color);
        if (!normalized) {
            return false;
        }

        const applied = this.applyInlineStyles({ backgroundColor: normalized });
        if (applied) {
            return true;
        }

        return this.execute('hiliteColor', normalized);
    }

    /**
     * Creates a link after validating its URL.
     *
     * @param {string} url - Link URL.
     * @returns {boolean} True when created.
     */
    createLink(url) {
        if (!url || !isSafeUrl(url, 'href')) {
            return false;
        }

        try {
            const applied = this.createLinkModern(url);
            if (applied) {
                return true;
            }
        } catch (error) {
            console.warn('[EditorCommands] modern createLink failed, using fallback.', error);
        }

        return this.execute('createLink', url);
    }

    /**
     * Removes links from the current selection.
     *
     * @returns {boolean} True when removed.
     */
    removeLink() {
        try {
            const removed = this.removeLinkModern();
            if (removed) {
                return true;
            }
        } catch (error) {
            console.warn('[EditorCommands] modern unlink failed, using fallback.', error);
        }

        return this.execute('unlink');
    }
}
