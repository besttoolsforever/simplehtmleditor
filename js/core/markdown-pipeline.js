import { normalizeHtml } from './html-pipeline.js';

const BLOCK_TAGS = new Set([
    'ADDRESS', 'ARTICLE', 'ASIDE', 'BLOCKQUOTE', 'DIV', 'DL', 'FIELDSET', 'FIGCAPTION',
    'FIGURE', 'FOOTER', 'FORM', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'HEADER', 'HR',
    'LI', 'MAIN', 'NAV', 'OL', 'P', 'PRE', 'SECTION', 'TABLE', 'TBODY', 'TD', 'TH',
    'THEAD', 'TR', 'UL'
]);

/**
 * Escapes text for safe insertion into generated HTML.
 *
 * @param {string} value - Raw text.
 * @returns {string} Escaped HTML text.
 */
function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * Normalizes Markdown line endings.
 *
 * @param {string} markdown - Raw Markdown.
 * @returns {string} Markdown with LF line endings.
 */
function normalizeMarkdownInput(markdown) {
    return String(markdown || '').replace(/\r\n?/g, '\n');
}

/**
 * Converts supported inline Markdown tokens to HTML.
 *
 * @param {string} text - Inline Markdown text.
 * @returns {string} HTML fragment.
 */
function parseInlineMarkdown(text) {
    let html = escapeHtml(text);

    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    html = html.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g, (_, alt, src) => {
        return `<img src="${src.trim()}" alt="${alt.trim()}">`;
    });
    html = html.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g, (_, label, href) => {
        return `<a href="${href.trim()}">${label.trim()}</a>`;
    });
    html = html.replace(/\*\*([\s\S]+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__([\s\S]+?)__/g, '<strong>$1</strong>');
    html = html.replace(/(^|[^\*])\*([^*]+)\*(?!\*)/g, '$1<em>$2</em>');
    html = html.replace(/(^|[^_])_([^_]+)_(?!_)/g, '$1<em>$2</em>');

    return html;
}

/**
 * Checks whether a line begins a Markdown block.
 *
 * @param {string} line - Markdown line.
 * @returns {boolean} True when the line starts a block.
 */
function isMarkdownBlockStart(line) {
    const trimmed = line.trim();
    if (!trimmed) {
        return false;
    }

    return (
        /^#{1,6}\s+/.test(trimmed) ||
        /^```/.test(trimmed) ||
        /^\s*>\s?/.test(line) ||
        /^\s*[-+*]\s+/.test(line) ||
        /^\s*\d+\.\s+/.test(line) ||
        /^(\*\s*){3,}$/.test(trimmed) ||
        /^(-\s*){3,}$/.test(trimmed) ||
        /^(_\s*){3,}$/.test(trimmed)
    );
}

/**
 * Converts supported Markdown block syntax into HTML.
 *
 * @param {string} markdown - Markdown document.
 * @returns {string} HTML fragment.
 */
function parseMarkdownBlocks(markdown) {
    const lines = normalizeMarkdownInput(markdown).split('\n');
    const blocks = [];
    let index = 0;

    while (index < lines.length) {
        const line = lines[index];
        const trimmed = line.trim();

        if (!trimmed) {
            index += 1;
            continue;
        }

        if (/^```/.test(trimmed)) {
            const codeLines = [];
            index += 1;

            while (index < lines.length && !/^```/.test(lines[index].trim())) {
                codeLines.push(lines[index]);
                index += 1;
            }

            if (index < lines.length) {
                index += 1;
            }

            blocks.push(`<pre><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
            continue;
        }

        const headingMatch = line.match(/^\s*(#{1,6})\s+(.*)$/);
        if (headingMatch) {
            const level = headingMatch[1].length;
            blocks.push(`<h${level}>${parseInlineMarkdown(headingMatch[2].trim())}</h${level}>`);
            index += 1;
            continue;
        }

        if (/^(\*\s*){3,}$/.test(trimmed) || /^(-\s*){3,}$/.test(trimmed) || /^(_\s*){3,}$/.test(trimmed)) {
            blocks.push('<hr>');
            index += 1;
            continue;
        }

        if (/^\s*>\s?/.test(line)) {
            const quoteLines = [];

            while (index < lines.length && /^\s*>\s?/.test(lines[index])) {
                quoteLines.push(lines[index].replace(/^\s*>\s?/, ''));
                index += 1;
            }

            const innerHtml = parseMarkdownBlocks(quoteLines.join('\n'));
            blocks.push(`<blockquote>${innerHtml}</blockquote>`);
            continue;
        }

        if (/^\s*[-+*]\s+/.test(line)) {
            const items = [];

            while (index < lines.length && /^\s*[-+*]\s+/.test(lines[index])) {
                items.push(lines[index].replace(/^\s*[-+*]\s+/, '').trim());
                index += 1;
            }

            blocks.push(`<ul>${items.map((item) => `<li>${parseInlineMarkdown(item)}</li>`).join('')}</ul>`);
            continue;
        }

        if (/^\s*\d+\.\s+/.test(line)) {
            const items = [];

            while (index < lines.length && /^\s*\d+\.\s+/.test(lines[index])) {
                items.push(lines[index].replace(/^\s*\d+\.\s+/, '').trim());
                index += 1;
            }

            blocks.push(`<ol>${items.map((item) => `<li>${parseInlineMarkdown(item)}</li>`).join('')}</ol>`);
            continue;
        }

        const paragraphLines = [];

        while (index < lines.length) {
            const paragraphLine = lines[index];
            const paragraphTrimmed = paragraphLine.trim();

            if (!paragraphTrimmed) {
                break;
            }

            if (paragraphLines.length > 0 && isMarkdownBlockStart(paragraphLine)) {
                break;
            }

            paragraphLines.push(paragraphTrimmed);
            index += 1;
        }

        const paragraph = paragraphLines
            .map((item) => parseInlineMarkdown(item))
            .join('<br>');

        blocks.push(`<p>${paragraph}</p>`);

        if (index < lines.length && !lines[index].trim()) {
            index += 1;
        }
    }

    return blocks.join('\n');
}

/**
 * Collapses inline text whitespace for Markdown output.
 *
 * @param {string} value - Raw text.
 * @returns {string} Normalized text.
 */
function normalizeInlineText(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
}

/**
 * Checks whether a DOM node is treated as a block for Markdown export.
 *
 * @param {Node} node - Candidate node.
 * @returns {boolean} True when block-like.
 */
function isBlockElement(node) {
    return node?.nodeType === Node.ELEMENT_NODE && BLOCK_TAGS.has(node.tagName);
}

/**
 * Converts an inline DOM node to Markdown.
 *
 * @param {Node} node - DOM node.
 * @returns {string} Markdown fragment.
 */
function toInlineMarkdown(node) {
    if (node.nodeType === Node.TEXT_NODE) {
        return node.textContent || '';
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
        return '';
    }

    const children = Array.from(node.childNodes).map((child) => toInlineMarkdown(child)).join('');
    const tag = node.tagName;

    if (tag === 'STRONG' || tag === 'B') {
        const text = normalizeInlineText(children);
        return text ? `**${text}**` : '';
    }

    if (tag === 'EM' || tag === 'I') {
        const text = normalizeInlineText(children);
        return text ? `*${text}*` : '';
    }

    if (tag === 'CODE' && node.parentElement?.tagName !== 'PRE') {
        const text = children.replace(/\n+/g, ' ').trim();
        return text ? `\`${text}\`` : '';
    }

    if (tag === 'A') {
        const href = (node.getAttribute('href') || '').trim();
        const label = normalizeInlineText(children) || href;
        return href ? `[${label}](${href})` : label;
    }

    if (tag === 'IMG') {
        const src = (node.getAttribute('src') || '').trim();
        const alt = (node.getAttribute('alt') || '').trim();
        return src ? `![${alt}](${src})` : '';
    }

    if (tag === 'BR') {
        return '\n';
    }

    return children;
}

/**
 * Converts list items to Markdown, preserving basic nesting.
 *
 * @param {HTMLElement} listNode - UL or OL node.
 * @param {boolean} ordered - Whether the list is ordered.
 * @param {number} [depth=0] - Nesting depth.
 * @returns {string} Markdown list.
 */
function listItemsToMarkdown(listNode, ordered, depth = 0) {
    const items = Array.from(listNode.children).filter((child) => child.tagName === 'LI');
    return items.map((item, idx) => {
        const marker = ordered ? `${idx + 1}. ` : '- ';
        const prefix = `${'  '.repeat(depth)}${marker}`;
        const inlineParts = [];
        const nestedParts = [];

        Array.from(item.childNodes).forEach((childNode) => {
            if (childNode.nodeType === Node.ELEMENT_NODE && (childNode.tagName === 'UL' || childNode.tagName === 'OL')) {
                nestedParts.push(listItemsToMarkdown(childNode, childNode.tagName === 'OL', depth + 1));
                return;
            }

            if (isBlockElement(childNode)) {
                inlineParts.push(toBlockMarkdown(childNode, depth).trim());
                return;
            }

            inlineParts.push(toInlineMarkdown(childNode));
        });

        const inlineText = normalizeInlineText(inlineParts.join(''));
        const nestedText = nestedParts.filter(Boolean).join('\n');

        if (nestedText) {
            return `${prefix}${inlineText}\n${nestedText}`;
        }

        return `${prefix}${inlineText}`;
    }).join('\n');
}

/**
 * Converts a DOM subtree flow into block Markdown.
 *
 * @param {Node} node - DOM node.
 * @param {number} [depth=0] - Nesting depth.
 * @returns {string} Markdown block flow.
 */
function toFlowMarkdown(node, depth = 0) {
    const output = [];
    let inlineBuffer = '';

    function flushInlineBuffer() {
        const text = normalizeInlineText(inlineBuffer);
        if (text) {
            output.push(`${text}\n\n`);
        }
        inlineBuffer = '';
    }

    Array.from(node.childNodes).forEach((child) => {
        if (child.nodeType === Node.TEXT_NODE) {
            inlineBuffer += child.textContent || '';
            return;
        }

        if (isBlockElement(child)) {
            flushInlineBuffer();
            output.push(toBlockMarkdown(child, depth));
            return;
        }

        inlineBuffer += toInlineMarkdown(child);
    });

    flushInlineBuffer();
    return output.join('');
}

/**
 * Converts a block DOM node to Markdown.
 *
 * @param {Node} node - DOM node.
 * @param {number} [depth=0] - Nesting depth.
 * @returns {string} Markdown block.
 */
function toBlockMarkdown(node, depth = 0) {
    if (node.nodeType === Node.TEXT_NODE) {
        const text = normalizeInlineText(node.textContent || '');
        return text ? `${text}\n\n` : '';
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
        return '';
    }

    const tag = node.tagName;

    if (tag === 'P') {
        const text = normalizeInlineText(Array.from(node.childNodes).map((child) => toInlineMarkdown(child)).join(''));
        return text ? `${text}\n\n` : '';
    }

    if (tag === 'DIV' || tag === 'SECTION' || tag === 'ARTICLE' || tag === 'MAIN') {
        return toFlowMarkdown(node, depth);
    }

    if (/^H[1-6]$/.test(tag)) {
        const level = Number(tag.slice(1));
        const text = normalizeInlineText(Array.from(node.childNodes).map((child) => toInlineMarkdown(child)).join(''));
        return text ? `${'#'.repeat(level)} ${text}\n\n` : '';
    }

    if (tag === 'PRE') {
        const codeNode = node.querySelector('code');
        const codeText = (codeNode ? codeNode.textContent : node.textContent || '').replace(/\n+$/g, '');
        return `\`\`\`\n${codeText}\n\`\`\`\n\n`;
    }

    if (tag === 'UL' || tag === 'OL') {
        const list = listItemsToMarkdown(node, tag === 'OL', depth);
        return list ? `${list}\n\n` : '';
    }

    if (tag === 'BLOCKQUOTE') {
        const raw = toFlowMarkdown(node, depth).trim();
        if (!raw) {
            return '';
        }

        const prefixed = raw
            .split('\n')
            .map((line) => (line ? `> ${line}` : '>'))
            .join('\n');
        return `${prefixed}\n\n`;
    }

    if (tag === 'HR') {
        return '---\n\n';
    }

    if (tag === 'TABLE') {
        const text = normalizeInlineText(node.textContent || '');
        return text ? `${text}\n\n` : '';
    }

    const inline = normalizeInlineText(Array.from(node.childNodes).map((child) => toInlineMarkdown(child)).join(''));
    return inline ? `${inline}\n\n` : '';
}

/**
 * Converts supported Markdown into canonical safe editor HTML.
 *
 * @param {string} markdown - Markdown document.
 * @returns {string} Canonical safe HTML.
 */
export function markdownToHtml(markdown) {
    const html = parseMarkdownBlocks(markdown);
    return normalizeHtml(html || '');
}

/**
 * Converts canonical editor HTML into Markdown.
 *
 * @param {string} html - HTML document.
 * @returns {string} Markdown document.
 */
export function htmlToMarkdown(html) {
    const canonicalHtml = normalizeHtml(html || '');
    if (!canonicalHtml.trim()) {
        return '';
    }

    if (typeof DOMParser === 'undefined') {
        return canonicalHtml.replace(/<[^>]+>/g, '').trim();
    }

    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(`<div id="__markdown_root__">${canonicalHtml}</div>`, 'text/html');
        const root = doc.getElementById('__markdown_root__');
        if (!root) {
            return '';
        }

        const markdownText = toFlowMarkdown(root)
            .replace(/\u00a0/g, ' ')
            .replace(/[ \t]+\n/g, '\n')
            .replace(/\n{3,}/g, '\n\n')
            .trim();

        return markdownText;
    } catch (error) {
        console.warn('[MarkdownPipeline] HTML to markdown conversion failed.', error);
        return canonicalHtml.replace(/<[^>]+>/g, '').trim();
    }
}
