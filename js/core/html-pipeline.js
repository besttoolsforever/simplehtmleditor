const FORBIDDEN_TAGS_REMOVE_WITH_CONTENT = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED']);

const DEFAULT_POLICY = {
    name: 'editor-default',
    allowedTags: new Set([
        'A', 'P', 'DIV', 'SPAN', 'BR',
        'B', 'STRONG', 'I', 'EM', 'U', 'S',
        'UL', 'OL', 'LI',
        'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
        'IMG', 'BLOCKQUOTE', 'PRE', 'CODE', 'HR',
        'TABLE', 'THEAD', 'TBODY', 'TR', 'TD', 'TH',
        'FONT'
    ]),
    allowedAttributes: {
        '*': ['class', 'id', 'title', 'style'],
        A: ['href', 'target', 'rel'],
        IMG: ['src', 'alt', 'width', 'height', 'title'],
        TABLE: ['border', 'cellpadding', 'cellspacing'],
        TD: ['colspan', 'rowspan'],
        TH: ['colspan', 'rowspan'],
        FONT: ['face', 'size', 'color']
    },
    allowedCssProperties: new Set([
        'color', 'background-color',
        'font-family', 'font-size', 'font-weight', 'font-style', 'text-decoration',
        'text-align', 'line-height',
        'width', 'height', 'max-width', 'min-width', 'max-height', 'min-height',
        'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
        'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
        'border', 'border-top', 'border-right', 'border-bottom', 'border-left',
        'border-radius', 'display', 'float'
    ])
};

const POLICY_REGISTRY = {
    editor: DEFAULT_POLICY,
    default: DEFAULT_POLICY
};

const URL_ATTRS = new Set(['href', 'src', 'xlink:href']);

/**
 * Returns the sanitization policy used by editor import, save, and code view flows.
 *
 * @param {string} policyName - Registered policy name.
 * @returns {object} Sanitization policy object.
 */
function resolvePolicy(policyName) {
    if (!policyName) {
        return DEFAULT_POLICY;
    }

    return POLICY_REGISTRY[policyName] || DEFAULT_POLICY;
}

/**
 * Checks whether a URL is safe for an HTML URL-bearing attribute.
 *
 * Relative URLs are allowed because documents may reference local assets. Explicit
 * schemes are limited by attribute type so image data URIs cannot become links.
 *
 * @param {string} value - Candidate URL.
 * @param {string} [attributeName='href'] - Attribute receiving the URL.
 * @returns {boolean} True when the URL can be kept.
 */
export function isSafeUrl(value, attributeName = 'href') {
    const raw = String(value || '').trim();
    if (!raw) {
        return false;
    }

    const compact = raw.replace(/[\u0000-\u001f\u007f\s]+/g, '');
    if (!compact) {
        return false;
    }

    if (compact.startsWith('//')) {
        return true;
    }

    const schemeMatch = compact.match(/^([a-z][a-z0-9+.-]*):/i);
    if (!schemeMatch) {
        return true;
    }

    const scheme = schemeMatch[1].toLowerCase();
    const normalizedAttribute = String(attributeName || '').toLowerCase();

    if (scheme === 'http' || scheme === 'https') {
        return true;
    }

    if (normalizedAttribute === 'href' && (scheme === 'mailto' || scheme === 'tel')) {
        return true;
    }

    if (normalizedAttribute === 'src' && scheme === 'data') {
        return /^data:image\/(?:png|jpe?g|gif|webp);base64,[a-z0-9+/=\s]+$/i.test(raw);
    }

    return false;
}

/**
 * Filters inline CSS against the active editor policy.
 *
 * @param {string} styleValue - Raw style declaration list.
 * @param {object} policy - Sanitization policy.
 * @returns {string} Safe CSS declaration list.
 */
function sanitizeStyleValue(styleValue, policy) {
    if (!styleValue) {
        return '';
    }

    return String(styleValue)
        .split(';')
        .map((declaration) => declaration.trim())
        .filter(Boolean)
        .map((declaration) => {
            const [propertyPart, ...rest] = declaration.split(':');
            if (!propertyPart || !rest.length) {
                return null;
            }

            const property = propertyPart.trim().toLowerCase();
            if (!policy.allowedCssProperties.has(property)) {
                return null;
            }

            const value = rest.join(':').trim();
            if (!value) {
                return null;
            }

            const lowerValue = value.toLowerCase();
            if (lowerValue.includes('expression(') || lowerValue.includes('javascript:') || lowerValue.includes('url(')) {
                return null;
            }

            return `${property}: ${value}`;
        })
        .filter(Boolean)
        .join('; ');
}

function isAllowedAttribute(tagName, attributeName, policy) {
    const normalized = attributeName.toLowerCase();

    if (normalized.startsWith('on')) {
        return false;
    }

    if (normalized.startsWith('data-') || normalized.startsWith('aria-')) {
        return true;
    }

    const globalAllowed = (policy.allowedAttributes['*'] || []).map((item) => item.toLowerCase());
    if (globalAllowed.includes(normalized)) {
        return true;
    }

    const perTagAllowed = (policy.allowedAttributes[tagName] || []).map((item) => item.toLowerCase());
    return perTagAllowed.includes(normalized);
}

function sanitizeElementAttributes(element, policy) {
    const tagName = element.tagName;
    const attrs = Array.from(element.attributes);

    attrs.forEach((attr) => {
        const attrName = attr.name;
        const normalizedName = attrName.toLowerCase();
        const attrValue = attr.value || '';

        if (!isAllowedAttribute(tagName, attrName, policy)) {
            element.removeAttribute(attrName);
            return;
        }

        if (URL_ATTRS.has(normalizedName) && !isSafeUrl(attrValue, normalizedName)) {
            element.removeAttribute(attrName);
            return;
        }

        if (normalizedName === 'style') {
            const sanitized = sanitizeStyleValue(attrValue, policy);
            if (!sanitized) {
                element.removeAttribute(attrName);
            } else {
                element.setAttribute('style', sanitized);
            }
        }

        if (tagName === 'A' && normalizedName === 'target') {
            const target = attrValue.trim().toLowerCase();
            if (!['_blank', '_self', '_parent', '_top'].includes(target)) {
                element.removeAttribute(attrName);
            }
        }
    });

    if (tagName === 'A' && element.getAttribute('target') === '_blank') {
        element.setAttribute('rel', 'noopener noreferrer');
    }
}

function sanitizeDomTree(node, policy) {
    const children = Array.from(node.childNodes);

    children.forEach((child) => {
        if (child.nodeType === Node.ELEMENT_NODE) {
            const tagName = child.tagName;

            if (FORBIDDEN_TAGS_REMOVE_WITH_CONTENT.has(tagName)) {
                child.remove();
                return;
            }

            if (!policy.allowedTags.has(tagName)) {
                while (child.firstChild) {
                    node.insertBefore(child.firstChild, child);
                }
                child.remove();
                return;
            }

            sanitizeElementAttributes(child, policy);
            sanitizeDomTree(child, policy);
            return;
        }

        if (child.nodeType === Node.COMMENT_NODE) {
            child.remove();
        }
    });
}

function fallbackNormalizeWithoutDom(html) {
    let output = String(html || '');

    output = output.replace(/<(script|style|iframe|object|embed)\b[^<]*(?:(?!<\/(script|style|iframe|object|embed)>)<[^<]*)*<\/(script|style|iframe|object|embed)>/gi, '');
    output = output.replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
    output = output.replace(/\s(href|src)\s*=\s*(['"])\s*(javascript:|vbscript:)[\s\S]*?\2/gi, '');

    return output.trim();
}

/**
 * Converts arbitrary HTML into the editor's canonical, sanitized representation.
 *
 * @param {string} html - Raw HTML from the editor, storage, import, or code view.
 * @param {{policy?: string}} [options] - Optional sanitizer policy selection.
 * @returns {string} Canonical safe HTML.
 */
export function normalizeHtml(html, options = {}) {
    const source = String(html || '');
    const policy = resolvePolicy(options.policy);

    if (typeof DOMParser === 'undefined') {
        return fallbackNormalizeWithoutDom(source);
    }

    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(`<div id="__editor_root__">${source}</div>`, 'text/html');
        const root = doc.getElementById('__editor_root__');

        if (!root) {
            return source.trim();
        }

        sanitizeDomTree(root, policy);
        root.normalize();

        return root.innerHTML.trim();
    } catch (error) {
        console.warn('[HtmlPipeline] normalize failed, using fallback sanitization.', error);
        return fallbackNormalizeWithoutDom(source);
    }
}

const VOID_TAGS = new Set([
    'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
    'link', 'meta', 'param', 'source', 'track', 'wbr', '!doctype'
]);

/**
 * Formats canonical HTML into a readable code-view representation.
 *
 * @param {string} html - Source HTML.
 * @param {{policy?: string}} [options] - Optional sanitizer policy selection.
 * @returns {string} Pretty-printed HTML.
 */
export function formatHtmlForCodeView(html, options = {}) {
    const normalized = normalizeHtml(html, options).replace(/>\s+</g, '><').trim();
    if (!normalized) {
        return '';
    }

    const tokens = normalized.split(/(<[^>]+>)/g).filter((token) => token && token.trim() !== '');
    const indent = '    ';
    let level = 0;
    let output = '';

    tokens.forEach((token) => {
        if (/^<\//.test(token)) {
            level = Math.max(0, level - 1);
            output += `\n${indent.repeat(level)}${token}`;
            return;
        }

        if (/^<[^!/][^>]*>$/.test(token) || /^<!DOCTYPE/i.test(token) || /^<\w/.test(token)) {
            output += `\n${indent.repeat(level)}${token}`;

            const tagMatch = token.match(/^<([\w-!]+)/);
            if (tagMatch) {
                const tagName = tagMatch[1].toLowerCase();
                if (!VOID_TAGS.has(tagName) && !/\/>$/.test(token) && !/^<\//.test(token)) {
                    level += 1;
                }
            }
            return;
        }

        output += `\n${indent.repeat(level)}${token.trim()}`;
    });

    return output.trim();
}

/**
 * Parses code-view content back into safe editor HTML.
 *
 * @param {string} rawCode - Raw code editor text.
 * @param {{policy?: string}} [options] - Optional sanitizer policy selection.
 * @returns {string} Canonical safe HTML.
 */
export function parseCodeToCanonicalHtml(rawCode, options = {}) {
    return normalizeHtml(String(rawCode || ''), options);
}

/**
 * Reads the current visual editor DOM as canonical safe HTML.
 *
 * @param {HTMLElement} editorElement - Contenteditable editor element.
 * @param {{policy?: string}} [options] - Optional sanitizer policy selection.
 * @returns {string} Canonical safe HTML.
 */
export function getCanonicalFromEditor(editorElement, options = {}) {
    return normalizeHtml(editorElement.innerHTML, options);
}

/**
 * Exposes a sanitizer policy for tests and feature modules that need consistency.
 *
 * @param {string} [policyName='editor'] - Registered policy name.
 * @returns {object} Sanitization policy object.
 */
export function getHtmlPolicy(policyName = 'editor') {
    return resolvePolicy(policyName);
}

/**
 * Sanitizes a style declaration using an editor policy.
 *
 * @param {string} styleValue - Raw style declaration list.
 * @param {string} [policyName='editor'] - Registered policy name.
 * @returns {string} Safe CSS declaration list.
 */
export function sanitizeInlineStyle(styleValue, policyName = 'editor') {
    return sanitizeStyleValue(styleValue, resolvePolicy(policyName));
}
