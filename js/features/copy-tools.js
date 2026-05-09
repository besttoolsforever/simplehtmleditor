/**
 * Temporarily swaps a copy button into its success state.
 *
 * @param {HTMLButtonElement} button - Button to update.
 * @returns {void}
 */
export function showCopiedFeedback(button) {
    if (!button) {
        return;
    }

    const textSpan = button.querySelector('.btn-text');
    const iconCopy = button.querySelector('.btn-icon');
    const iconCheck = button.querySelector('.icon-check');

    const rect = button.getBoundingClientRect();
    button.style.width = `${rect.width}px`;
    button.style.height = `${rect.height}px`;

    if (textSpan) {
        textSpan.style.display = 'none';
    }
    if (iconCopy) {
        iconCopy.style.display = 'none';
    }
    if (iconCheck) {
        iconCheck.style.display = 'block';
    }

    setTimeout(() => {
        button.style.width = '';
        button.style.height = '';
        if (textSpan) {
            textSpan.style.display = '';
        }
        if (iconCopy) {
            iconCopy.style.display = '';
        }
        if (iconCheck) {
            iconCheck.style.display = 'none';
        }
    }, 2000);
}

/**
 * Writes plain text to the clipboard, falling back to execCommand.
 *
 * @param {string} text - Text to copy.
 * @returns {Promise<void>}
 */
async function writePlainText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return;
    }

    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    textarea.remove();
}

/**
 * Initializes code and rich-content copy buttons.
 *
 * @param {object} options - Copy tool dependencies.
 * @returns {void}
 */
export function initCopyTools({
    editor,
    copyCodeButton,
    copyContentButton,
    isCodeViewActive,
    getCodeText,
    getCanonicalHtml,
    onStatus
}) {
    copyCodeButton?.addEventListener('click', async () => {
        try {
            const payload = isCodeViewActive() ? getCodeText() : getCanonicalHtml();
            await writePlainText(payload);
            showCopiedFeedback(copyCodeButton);
            onStatus?.('Code copied to clipboard.', { type: 'success' });
        } catch (error) {
            console.warn('[CopyTools] Code failed', error);
            onStatus?.('Copy failed. Clipboard permission may be blocked.', { type: 'error', assertive: true });
        }
    });

    copyContentButton?.addEventListener('click', async () => {
        try {
            if (isCodeViewActive()) {
                await writePlainText(getCodeText());
                showCopiedFeedback(copyContentButton);
                onStatus?.('Content copied as text.', { type: 'success' });
                return;
            }

            const html = getCanonicalHtml();
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = html;
            document.body.appendChild(tempDiv);

            const range = document.createRange();
            range.selectNodeContents(tempDiv);

            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);

            document.execCommand('copy');

            selection.removeAllRanges();
            tempDiv.remove();

            showCopiedFeedback(copyContentButton);
            onStatus?.('Formatted content copied.', { type: 'success' });
        } catch (error) {
            console.warn('[CopyTools] Content failed', error);
            onStatus?.('Copy failed. Clipboard permission may be blocked.', { type: 'error', assertive: true });
        }
    });
}
