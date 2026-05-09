import { formatHtmlForCodeView, parseCodeToCanonicalHtml } from './html-pipeline.js';
import {
    EditorState,
    EditorView,
    basicSetup,
    html,
    HighlightStyle,
    syntaxHighlighting,
    tags
} from '../vendor/codemirror.bundle.js';

const htmlHighlightStyle = HighlightStyle.define([
    { tag: tags.tagName, class: 'cm-token-tag' },
    { tag: tags.attributeName, class: 'cm-token-attr-name' },
    { tag: tags.attributeValue, class: 'cm-token-attr-value' },
    { tag: tags.comment, class: 'cm-token-comment' },
    { tag: [tags.documentMeta, tags.meta, tags.processingInstruction], class: 'cm-token-doctype' },
    { tag: [tags.angleBracket, tags.punctuation], class: 'cm-token-punctuation' },
    { tag: [tags.character, tags.escape], class: 'cm-token-entity' }
]);

/**
 * Coordinates the visual editor with the CodeMirror HTML source view.
 */
export class CodeViewService {
    /**
     * @param {object} options - Code view dependencies.
     * @param {HTMLElement} options.editor - Visual contenteditable editor.
     * @param {HTMLElement} options.editorContainer - Editor shell.
     * @param {HTMLButtonElement} options.toggleButton - Code/preview toggle button.
     */
    constructor({ editor, editorContainer, toggleButton }) {
        this.editor = editor;
        this.editorContainer = editorContainer;
        this.toggleButton = toggleButton;
        this.active = false;

        this.surface = document.createElement('div');
        this.surface.id = 'code-editor-surface';
        this.surface.className = 'code-editor-surface hidden';
        this.surface.setAttribute('aria-label', 'Code editor');
        this.surface.setAttribute('aria-multiline', 'true');
        this.surface.setAttribute('aria-hidden', 'true');
        this.surface.setAttribute('role', 'textbox');

        this.view = new EditorView({
            state: EditorState.create({
                doc: '',
                extensions: [
                    basicSetup,
                    html(),
                    syntaxHighlighting(htmlHighlightStyle),
                    EditorView.contentAttributes.of({
                        spellcheck: 'false',
                        autocorrect: 'off',
                        autocapitalize: 'off',
                        autocomplete: 'off'
                    })
                ]
            }),
            parent: this.surface
        });

        this.editorContainer.insertBefore(this.surface, this.editor.nextSibling);
        this.setButtonVisual(false);
    }

    /**
     * Indicates whether code view is currently active.
     *
     * @returns {boolean} Active state.
     */
    isActive() {
        return this.active;
    }

    /**
     * Reads raw CodeMirror text.
     *
     * @returns {string} Code view content.
     */
    getRawCode() {
        return this.view.state.doc.toString();
    }

    /**
     * Replaces CodeMirror text without recreating the editor instance.
     *
     * @param {string} value - Next code content.
     * @returns {void}
     */
    setRawCode(value) {
        const nextValue = String(value || '');
        const currentValue = this.getRawCode();

        if (currentValue === nextValue) {
            return;
        }

        this.view.dispatch({
            changes: {
                from: 0,
                to: currentValue.length,
                insert: nextValue
            }
        });
    }

    /**
     * Updates the toggle button icon and label.
     *
     * @param {boolean} isCodeView - Whether code view is active.
     * @returns {void}
     */
    setButtonVisual(isCodeView) {
        if (!this.toggleButton) {
            return;
        }

        if (isCodeView) {
            this.toggleButton.innerHTML = '<img src="assets/code-slash.svg" alt="Code"> <span class="btn-label-text">Preview</span>';
        } else {
            this.toggleButton.innerHTML = '<img src="assets/eye-fill.svg" alt="Preview"> <span class="btn-label-text">Code</span>';
        }
    }

    /**
     * Switches from visual editing into code editing.
     *
     * @param {string} canonicalHtml - Current editor HTML.
     * @returns {void}
     */
    enter(canonicalHtml) {
        this.setRawCode(formatHtmlForCodeView(canonicalHtml));

        this.editor.classList.add('hidden');
        this.editor.classList.add('code-view-mode');
        this.editor.contentEditable = 'false';
        this.editor.setAttribute('aria-hidden', 'true');

        this.surface.classList.remove('hidden');
        this.surface.classList.add('code-view-mode');
        this.surface.setAttribute('aria-hidden', 'false');
        this.view.focus();

        this.active = true;
        this.setButtonVisual(true);
    }

    /**
     * Switches from code editing back to visual editing.
     *
     * @returns {string} Canonical HTML parsed from code view.
     */
    exit() {
        const canonicalHtml = parseCodeToCanonicalHtml(this.getRawCode());

        this.surface.classList.add('hidden');
        this.surface.classList.remove('code-view-mode');
        this.surface.setAttribute('aria-hidden', 'true');

        this.editor.classList.remove('hidden');
        this.editor.classList.remove('code-view-mode');
        this.editor.contentEditable = 'true';
        this.editor.setAttribute('aria-hidden', 'false');

        this.active = false;
        this.setButtonVisual(false);

        return canonicalHtml;
    }

    /**
     * Toggles between visual and code editing modes.
     *
     * @param {string} canonicalHtml - Current visual editor HTML.
     * @returns {{active: boolean, canonicalHtml: string}} Toggle result.
     */
    toggle(canonicalHtml) {
        if (this.active) {
            return {
                active: false,
                canonicalHtml: this.exit()
            };
        }

        this.enter(canonicalHtml);
        return {
            active: true,
            canonicalHtml
        };
    }
}
