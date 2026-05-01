/* 
   Code View Module
   Handles HTML formatting and syntax highlighting.
*/

const CodeView = {
    // Configuration for the custom theme classes
    classes: {
        tag: 'token-tag',
        attrName: 'token-attr-name',
        attrValue: 'token-attr-value',
        comment: 'token-comment',
        entity: 'token-entity',
        text: 'token-text',
        punctuation: 'token-punctuation',
        doctype: 'token-doctype'
    },

    // Void tags that don't require closing and don't increase indentation
    voidTags: [
        'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
        'link', 'meta', 'param', 'source', 'track', 'wbr', '!doctype'
    ],

    /**
     * Toggles between Visual and Code view.
     * @param {HTMLElement} editor - The editor element.
     * @param {HTMLElement} button - The toggle button.
     * @param {boolean} isCurrentlyHTML - Current state (true if showing code).
     * @returns {boolean} - New state (true if showing code).
     */
    toggle: function (editor, button, isCurrentlyHTML) {
        if (isCurrentlyHTML) {
            // Switch to Visual View (WYSIWYG)
            // We need to get the text content because the user might have edited the code
            const code = editor.innerText;
            editor.innerHTML = code;
            editor.contentEditable = true;
            editor.classList.remove('code-view-mode');
            button.innerHTML = `<img src="assets/eye-fill.svg" alt="Preview"> Code`;
            return false;
        } else {
            // Switch to Code View (Syntax Highlighted)
            const rawHTML = editor.innerHTML;
            const formattedHTML = this.format(rawHTML);
            const highlightedHTML = this.highlight(formattedHTML);

            editor.innerHTML = highlightedHTML;
            editor.contentEditable = true; // Allow editing!
            editor.classList.add('code-view-mode');

            button.innerHTML = `<img src="assets/code-slash.svg" alt="Code"> Preview`;
            return true;
        }
    },

    /**
     * Formats the HTML string with proper indentation.
     */
    format: function (html) {
        let formatted = '';
        let indentLevel = 0;
        const indentString = '    '; // 4 spaces

        // Remove existing whitespace between tags to start clean
        html = html.replace(/>\s+</g, '><').trim();

        // Regex to split tags and text
        // Captures: 1=Tag, 2=Text content
        const tokens = html.split(/(<[^>]+>)/g).filter(t => t.trim() !== '');

        tokens.forEach(token => {
            if (token.match(/^<\//)) {
                // Closing tag
                indentLevel = Math.max(0, indentLevel - 1);
                formatted += '\n' + indentString.repeat(indentLevel) + token;
            } else if (token.match(/^<[^\/]/)) {
                // Opening tag or Void tag
                formatted += '\n' + indentString.repeat(indentLevel) + token;

                // Check if it's not a void tag to increase indent
                const tagName = token.match(/^<([\w\-!]+)/);
                if (tagName) {
                    const name = tagName[1].toLowerCase();
                    if (!this.voidTags.includes(name) && !token.match(/\/>$/)) {
                        indentLevel++;
                    }
                }
            } else {
                // Text content
                formatted += '\n' + indentString.repeat(indentLevel) + token.trim();
            }
        });

        return formatted.trim();
    },

    /**
     * Applies syntax highlighting to the HTML string.
     */
    highlight: function (code) {
        // Escape HTML entities first to prevent browser from rendering them
        code = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

        // Highlight Comments
        code = code.replace(/&lt;!--[\s\S]*?--&gt;/g, match => {
            return `<span class="${this.classes.comment}">${match}</span>`;
        });

        // Highlight Doctype
        code = code.replace(/&lt;!DOCTYPE[^&]*&gt;/gi, match => {
            return `<span class="${this.classes.doctype}">${match}</span>`;
        });

        // Highlight Tags (Opening and Closing)
        // We look for &lt;tag or &lt;/tag
        code = code.replace(/(&lt;\/?)(\w+)([^&]*)(&gt;)/g, (match, p1, p2, p3, p4) => {
            // p1: < or </ (escaped)
            // p2: tag name
            // p3: attributes part
            // p4: > (escaped)

            let attributes = p3;

            // Highlight Attributes
            // Matches: attr="value" or attr='value' or attr
            attributes = attributes.replace(/(\s+)([\w\-]+)(=)?(["'][^"']*["'])?/g, (m, space, name, equals, value) => {
                let result = space + `<span class="${this.classes.attrName}">${name}</span>`;
                if (equals) {
                    result += `<span class="${this.classes.punctuation}">=</span>`;
                }
                if (value) {
                    result += `<span class="${this.classes.attrValue}">${value}</span>`;
                }
                return result;
            });

            return `<span class="${this.classes.punctuation}">${p1}</span>` +
                `<span class="${this.classes.tag}">${p2}</span>` +
                attributes +
                `<span class="${this.classes.punctuation}">${p4}</span>`;
        });

        return code;
    }
};

// Expose to window
window.CodeView = CodeView;
