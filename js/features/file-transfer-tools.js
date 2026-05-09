import { htmlToMarkdown, markdownToHtml } from '../core/markdown-pipeline.js';

const MARKDOWN_EXTENSIONS = new Set(['.md', '.markdown', '.mdown', '.mkd']);
const HTML_EXTENSIONS = new Set(['.html', '.htm']);

/**
 * Gets a lower-case extension from a file name.
 *
 * @param {string} fileName - File name.
 * @returns {string} File extension including the dot.
 */
function getExtension(fileName) {
    const raw = String(fileName || '').trim();
    const lastDot = raw.lastIndexOf('.');
    if (lastDot < 0) {
        return '';
    }
    return raw.slice(lastDot).toLowerCase();
}

/**
 * Removes the last extension from a file name.
 *
 * @param {string} fileName - File name.
 * @returns {string} Name without extension.
 */
function stripExtension(fileName) {
    const raw = String(fileName || '').trim();
    const lastDot = raw.lastIndexOf('.');
    if (lastDot <= 0) {
        return raw;
    }
    return raw.slice(0, lastDot);
}

/**
 * Infers supported import/export format from a file name.
 *
 * @param {string} fileName - File name.
 * @returns {'html'|'md'|null} Document format.
 */
function inferFormatFromFileName(fileName) {
    const extension = getExtension(fileName);
    if (MARKDOWN_EXTENSIONS.has(extension)) {
        return 'md';
    }
    if (HTML_EXTENSIONS.has(extension)) {
        return 'html';
    }
    return null;
}

/**
 * Removes filesystem-hostile characters from a download name.
 *
 * @param {string} name - Candidate file name.
 * @returns {string} Safe file name.
 */
function sanitizeFileName(name) {
    const fallback = 'document';
    const normalized = String(name || fallback)
        .replace(/[\\/:*?"<>|]+/g, '_')
        .replace(/\s+/g, ' ')
        .trim();

    return normalized || fallback;
}

/**
 * Ensures a file name has a desired extension.
 *
 * @param {string} fileName - Candidate file name.
 * @param {string} extension - Extension to append when missing.
 * @returns {string} Safe file name with extension.
 */
function ensureExtension(fileName, extension) {
    const normalized = sanitizeFileName(fileName);
    if (normalized.toLowerCase().endsWith(extension.toLowerCase())) {
        return normalized;
    }
    return `${normalized}${extension}`;
}

/**
 * Starts a browser download for generated content.
 *
 * @param {object} options - Download options.
 * @returns {void}
 */
function triggerDownload({ content, mimeType, fileName }) {
    const blob = new Blob([String(content || '')], { type: mimeType });
    const objectUrl = URL.createObjectURL(blob);

    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = fileName;
    anchor.style.display = 'none';

    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(objectUrl);
}

/**
 * Converts an imported file name into a document title.
 *
 * @param {string} fileName - Source file name.
 * @returns {string} Document name.
 */
function getDocumentNameFromFile(fileName) {
    const base = stripExtension(fileName);
    return sanitizeFileName(base || 'Imported Document');
}

/**
 * Clears the import input so the same file can be imported again.
 *
 * @param {HTMLInputElement} input - File input.
 * @returns {void}
 */
function resetImportInput(input) {
    if (input) {
        input.value = '';
    }
}

/**
 * Initializes HTML/Markdown import and export controls.
 *
 * @param {object} options - File transfer dependencies.
 * @returns {{openFilePicker: Function}} File transfer API.
 */
export function initFileTransferTools({
    refs,
    store,
    appState,
    getCanonicalHtml,
    loadDocumentIntoEditor,
    onStatus
}) {
    const {
        exportFileButton,
        fileImportInput
    } = refs;

    /**
     * Imports the selected HTML or Markdown file into the active document.
     *
     * @returns {Promise<void>}
     */
    async function importSelectedFile() {
        const file = fileImportInput?.files?.[0];
        if (!file) {
            return;
        }

        const format = inferFormatFromFileName(file.name);
        if (!format) {
            onStatus?.('Unsupported file. Import .html or .md files.', { type: 'warning' });
            resetImportInput(fileImportInput);
            return;
        }

        try {
            const rawText = await file.text();
            const content = format === 'md' ? markdownToHtml(rawText) : rawText;
            const currentDoc = store.getCurrentDocument();
            const docName = getDocumentNameFromFile(file.name);

            if (!currentDoc) {
                const createdDoc = store.createDocument({
                    name: docName,
                    content,
                    sourceFormat: format,
                    sourceFileName: file.name
                });

                appState.currentDocId = createdDoc.id;
            } else {
                store.upsertDocument({
                    id: currentDoc.id,
                    name: docName,
                    createdAt: currentDoc.createdAt,
                    content,
                    sourceFormat: format,
                    sourceFileName: file.name
                });
            }

            appState.currentSourceFormat = format;
            appState.currentSourceFileName = file.name;

            loadDocumentIntoEditor(content, {
                sourceFormat: format,
                sourceFileName: file.name
            });

            onStatus?.(
                format === 'md'
                    ? 'Markdown file imported and rendered.'
                    : 'HTML file imported.',
                { type: 'success' }
            );
        } catch (error) {
            console.warn('[FileTransfer] import failed', error);
            onStatus?.('Could not import the selected file.', { type: 'error', assertive: true });
        } finally {
            resetImportInput(fileImportInput);
        }
    }

    /**
     * Exports the active document in its source format.
     *
     * @returns {void}
     */
    function exportCurrentDocument() {
        try {
            const currentDoc = store.getCurrentDocument();
            const canonicalHtml = getCanonicalHtml();
            const sourceFormat = currentDoc?.sourceFormat === 'md' ? 'md' : 'html';
            const preferredName = currentDoc?.sourceFileName || currentDoc?.name || 'document';

            if (sourceFormat === 'md') {
                const markdown = htmlToMarkdown(canonicalHtml);
                const fileName = ensureExtension(preferredName, '.md');
                triggerDownload({
                    content: markdown,
                    mimeType: 'text/markdown;charset=utf-8',
                    fileName
                });
                onStatus?.('Markdown file exported.', { type: 'success' });
                return;
            }

            const fileName = ensureExtension(preferredName, '.html');
            triggerDownload({
                content: canonicalHtml,
                mimeType: 'text/html;charset=utf-8',
                fileName
            });
            onStatus?.('HTML file exported.', { type: 'success' });
        } catch (error) {
            console.warn('[FileTransfer] export failed', error);
            onStatus?.('Could not export the current file.', { type: 'error', assertive: true });
        }
    }

    fileImportInput?.addEventListener('change', () => {
        importSelectedFile();
    });

    exportFileButton?.addEventListener('click', () => {
        exportCurrentDocument();
    });

    return {
        openFilePicker: () => fileImportInput?.click()
    };
}
