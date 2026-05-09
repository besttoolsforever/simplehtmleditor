import { ensureProtocol, formatUnit } from '../../core/utils.js';
import { isSafeUrl, sanitizeInlineStyle } from '../../core/html-pipeline.js';
import { createOverlayController } from '../../core/overlay-controller.js';

/**
 * Creates the image dialog controller used for insert, edit, link, and spacing flows.
 *
 * @param {object} options - Image dialog dependencies.
 * @returns {object} Public image dialog service API.
 */
export function createImageDialogService({
    editor,
    imageDialog,
    imageRefs,
    selectionService,
    appState,
    onContentChanged,
    isCodeViewActive,
    onStatus
}) {
    const {
        imageUrlInput,
        imageAltInput,
        imageTitleInput,
        imageWidthInput,
        imageHeightInput,
        imageBorderRadiusInput,
        imageMarginTopInput,
        imageMarginRightInput,
        imageMarginBottomInput,
        imageMarginLeftInput,
        imagePaddingTopInput,
        imagePaddingRightInput,
        imagePaddingBottomInput,
        imagePaddingLeftInput,
        imageCustomCssInput,
        imageLinkUrlInput,
        imageLinkNewTabCheckbox,
        saveImageButton,
        cancelImageButton
    } = imageRefs;

    const dialogController = createOverlayController({
        element: imageDialog,
        onOpen: () => {
            imageDialog.classList.remove('hidden');
        },
        onClose: () => {
            imageDialog.classList.add('hidden');
            clearDialogFields();
            appState.currentElement = null;
        },
        initialFocus: () => imageUrlInput
    });

    /**
     * Clears all dialog fields after closing or before a new image is created.
     *
     * @returns {void}
     */
    function clearDialogFields() {
        imageUrlInput.value = '';
        imageAltInput.value = '';
        imageTitleInput.value = '';
        imageWidthInput.value = '';
        imageHeightInput.value = '';
        imageBorderRadiusInput.value = '';
        imageMarginTopInput.value = '';
        imageMarginRightInput.value = '';
        imageMarginBottomInput.value = '';
        imageMarginLeftInput.value = '';
        imagePaddingTopInput.value = '';
        imagePaddingRightInput.value = '';
        imagePaddingBottomInput.value = '';
        imagePaddingLeftInput.value = '';
        imageCustomCssInput.value = '';
        imageLinkUrlInput.value = '';
        imageLinkNewTabCheckbox.checked = false;
    }

    /**
     * Closes the image dialog and restores focus to the opener.
     *
     * @returns {void}
     */
    function closeDialog() {
        dialogController.close({ shouldRestoreFocus: true });
    }

    /**
     * Opens an empty image dialog for a new image.
     *
     * @returns {void}
     */
    function openForNewImage() {
        if (isCodeViewActive()) {
            return;
        }

        appState.currentElement = null;
        dialogController.open();
    }

    /**
     * Opens the dialog populated from an existing image.
     *
     * @param {HTMLImageElement} image - Image being edited.
     * @returns {void}
     */
    function openForImage(image) {
        if (isCodeViewActive()) {
            return;
        }

        appState.currentElement = image;
        imageUrlInput.value = image.getAttribute('src') || '';
        imageAltInput.value = image.getAttribute('alt') || '';
        imageTitleInput.value = image.getAttribute('title') || '';

        imageWidthInput.value = image.style.width || '';
        imageHeightInput.value = image.style.height || '';
        imageBorderRadiusInput.value = image.style.borderRadius || '';

        imageMarginTopInput.value = image.style.marginTop || '';
        imageMarginRightInput.value = image.style.marginRight || '';
        imageMarginBottomInput.value = image.style.marginBottom || '';
        imageMarginLeftInput.value = image.style.marginLeft || '';

        imagePaddingTopInput.value = image.style.paddingTop || '';
        imagePaddingRightInput.value = image.style.paddingRight || '';
        imagePaddingBottomInput.value = image.style.paddingBottom || '';
        imagePaddingLeftInput.value = image.style.paddingLeft || '';

        imageCustomCssInput.value = '';

        const anchor = image.closest('a');
        if (anchor) {
            imageLinkUrlInput.value = anchor.getAttribute('href') || '';
            imageLinkNewTabCheckbox.checked = anchor.target === '_blank';
        } else {
            imageLinkUrlInput.value = '';
            imageLinkNewTabCheckbox.checked = false;
        }

        dialogController.open();
    }

    /**
     * Applies dialog field values to an image element.
     *
     * @param {HTMLImageElement} image - Image to update.
     * @returns {void}
     */
    function applyImageAttributes(image) {
        image.setAttribute('src', String(imageUrlInput.value || '').trim());
        image.alt = imageAltInput.value;
        image.title = imageTitleInput.value;

        image.style.width = formatUnit(imageWidthInput.value) || '';
        image.style.height = formatUnit(imageHeightInput.value) || '';
        image.style.borderRadius = formatUnit(imageBorderRadiusInput.value) || '';

        image.style.marginTop = formatUnit(imageMarginTopInput.value) || '';
        image.style.marginRight = formatUnit(imageMarginRightInput.value) || '';
        image.style.marginBottom = formatUnit(imageMarginBottomInput.value) || '';
        image.style.marginLeft = formatUnit(imageMarginLeftInput.value) || '';

        image.style.paddingTop = formatUnit(imagePaddingTopInput.value) || '';
        image.style.paddingRight = formatUnit(imagePaddingRightInput.value) || '';
        image.style.paddingBottom = formatUnit(imagePaddingBottomInput.value) || '';
        image.style.paddingLeft = formatUnit(imagePaddingLeftInput.value) || '';

        const customCss = String(imageCustomCssInput.value || '').trim();
        if (customCss) {
            const safeCss = sanitizeInlineStyle(customCss);
            if (safeCss) {
                image.style.cssText += `;${safeCss}`;
            } else {
                onStatus?.('Custom CSS was ignored because it is not supported.', { type: 'warning' });
            }
        }
    }

    /**
     * Builds a new image element from the dialog values.
     *
     * @returns {HTMLImageElement} New image element.
     */
    function buildImage() {
        const image = document.createElement('img');
        applyImageAttributes(image);
        return image;
    }

    /**
     * Inserts an image at the saved editor selection or appends it to the editor.
     *
     * @param {HTMLImageElement} image - Image to insert.
     * @returns {void}
     */
    function insertImageIntoEditor(image) {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            if (editor.contains(range.commonAncestorContainer)) {
                range.deleteContents();
                range.insertNode(image);
                return;
            }
        }

        editor.appendChild(image);
    }

    /**
     * Wraps or unwraps the image with a safe link based on dialog fields.
     *
     * @param {HTMLImageElement} image - Image being linked.
     * @returns {void}
     */
    function applyImageLink(image) {
        const linkUrl = ensureProtocol(imageLinkUrlInput.value);
        const openInNewTab = imageLinkNewTabCheckbox.checked;
        const anchor = image.closest('a');

        if (!linkUrl || !isSafeUrl(linkUrl, 'href')) {
            if (anchor) {
                anchor.parentNode.insertBefore(image, anchor);
                anchor.remove();
            }
            return;
        }

        if (anchor) {
            anchor.href = linkUrl;
            anchor.target = openInNewTab ? '_blank' : '_self';
            if (openInNewTab) {
                anchor.rel = 'noopener noreferrer';
            } else {
                anchor.removeAttribute('rel');
            }
            return;
        }

        const newAnchor = document.createElement('a');
        newAnchor.href = linkUrl;
        newAnchor.target = openInNewTab ? '_blank' : '_self';

        if (openInNewTab) {
            newAnchor.rel = 'noopener noreferrer';
        }

        image.parentNode.insertBefore(newAnchor, image);
        newAnchor.appendChild(image);
    }

    /**
     * Validates and saves dialog values into the editor.
     *
     * @returns {void}
     */
    function saveImage() {
        if (isCodeViewActive()) {
            closeDialog();
            return;
        }

        const imageUrl = String(imageUrlInput.value || '').trim();
        if (!imageUrl) {
            onStatus?.('Please provide an image URL.', { type: 'warning' });
            imageUrlInput.focus();
            return;
        }

        if (!isSafeUrl(imageUrl, 'src')) {
            onStatus?.('Please provide a safe image URL.', { type: 'warning' });
            imageUrlInput.focus();
            return;
        }

        const rawLinkUrl = String(imageLinkUrlInput.value || '').trim();
        const normalizedLinkUrl = ensureProtocol(rawLinkUrl);
        if (rawLinkUrl && (!normalizedLinkUrl || !isSafeUrl(normalizedLinkUrl, 'href'))) {
            onStatus?.('Please provide a safe link URL for the image.', { type: 'warning' });
            imageLinkUrlInput.focus();
            return;
        }

        let image = appState.currentElement;
        if (image && image.tagName === 'IMG') {
            applyImageAttributes(image);
        } else {
            selectionService.restore();
            image = buildImage();
            insertImageIntoEditor(image);
        }

        applyImageLink(image);
        closeDialog();
        onContentChanged();
        onStatus?.('Image saved.', { type: 'success' });
    }

    /**
     * Binds dialog button and keyboard handlers.
     *
     * @returns {void}
     */
    function bindEvents() {
        saveImageButton?.addEventListener('click', saveImage);
        cancelImageButton?.addEventListener('click', closeDialog);
        imageDialog.addEventListener('keydown', (event) => {
            if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
                event.preventDefault();
                saveImage();
            }
        });
    }

    return {
        bindEvents,
        openForNewImage,
        openForImage,
        closeDialog,
        forceClose: () => dialogController.close({ shouldRestoreFocus: false }),
        isOpen: () => dialogController.isOpen()
    };
}
