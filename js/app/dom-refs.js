/**
 * Collects the main DOM references used during app bootstrap.
 *
 * @returns {object} Main DOM reference map.
 */
export function getDomRefs() {
    return {
        body: document.body,
        editor: document.getElementById('editor'),
        editorContainer: document.querySelector('.editor-container'),
        toggleViewButton: document.getElementById('toggle-view'),
        toggleThemeButton: document.getElementById('toggle-theme'),
        toggleFullscreenButton: document.getElementById('toggle-fullscreen'),
        toggleBrowserFullscreenButton: document.getElementById('toggle-browser-fullscreen'),
        toggleDocumentsButton: document.getElementById('toggle-documents'),
        toggleSettingsButton: document.getElementById('toggle-settings'),
        exportFileButton: document.getElementById('export-file'),
        fontFamilySelect: document.getElementById('font-family'),
        fontSizeSelect: document.getElementById('font-size'),
        fontColorInput: document.getElementById('font-color'),
        backgroundColorInput: document.getElementById('bg-color'),
        toolbar: document.querySelector('.editor-toolbar'),
        insertImageButton: document.getElementById('insert-image'),
        createLinkButton: document.getElementById('create-link'),
        removeLinkButton: document.getElementById('removeLink'),
        printButton: document.getElementById('print'),
        copyCodeButton: document.getElementById('copyCodeButton'),
        copyContentButton: document.getElementById('copyContentButton'),
        statusRegion: document.getElementById('app-status-region'),
        imageDialog: document.getElementById('image-dialog'),
        linkDialog: document.getElementById('link-dialog'),
        toggleSpacingButton: document.getElementById('toggle-spacing-btn'),
        spacingContent: document.getElementById('spacing-content'),
        docManagerPanel: document.getElementById('document-manager-panel'),
        docNameInput: document.getElementById('doc-name-input'),
        docListSelect: document.getElementById('doc-list-select'),
        docNewButton: document.getElementById('doc-new-btn'),
        docSaveButton: document.getElementById('doc-save-btn'),
        docImportButton: document.getElementById('doc-import-btn'),
        docDeleteButton: document.getElementById('doc-delete-btn'),
        docAutosaveToggle: document.getElementById('doc-autosave-toggle'),
        fileImportInput: document.getElementById('file-import-input')
    };
}

/**
 * Collects image dialog DOM references.
 *
 * @returns {object} Image dialog reference map.
 */
export function getImageDialogRefs() {
    return {
        imageUrlInput: document.getElementById('image-url'),
        imageAltInput: document.getElementById('image-alt'),
        imageTitleInput: document.getElementById('image-title'),
        imageWidthInput: document.getElementById('image-width'),
        imageHeightInput: document.getElementById('image-height'),
        imageBorderRadiusInput: document.getElementById('image-border-radius'),
        imageMarginTopInput: document.getElementById('image-margin-top'),
        imageMarginRightInput: document.getElementById('image-margin-right'),
        imageMarginBottomInput: document.getElementById('image-margin-bottom'),
        imageMarginLeftInput: document.getElementById('image-margin-left'),
        imagePaddingTopInput: document.getElementById('image-padding-top'),
        imagePaddingRightInput: document.getElementById('image-padding-right'),
        imagePaddingBottomInput: document.getElementById('image-padding-bottom'),
        imagePaddingLeftInput: document.getElementById('image-padding-left'),
        imageCustomCssInput: document.getElementById('image-custom-css'),
        imageLinkUrlInput: document.getElementById('image-link-url'),
        imageLinkNewTabCheckbox: document.getElementById('image-link-new-tab'),
        saveImageButton: document.getElementById('save-image'),
        cancelImageButton: document.getElementById('cancel-image')
    };
}

/**
 * Collects link dialog DOM references.
 *
 * @returns {object} Link dialog reference map.
 */
export function getLinkDialogRefs() {
    return {
        linkUrlInput: document.getElementById('link-url'),
        linkNewTabCheckbox: document.getElementById('link-new-tab'),
        saveLinkButton: document.getElementById('save-link'),
        cancelLinkButton: document.getElementById('cancel-link')
    };
}
