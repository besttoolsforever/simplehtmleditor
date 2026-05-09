/**
 * Creates the mutable runtime state shared by feature modules.
 *
 * @returns {object} Editor runtime state.
 */
export function createEditorState() {
    return {
        currentDocId: null,
        isCodeView: false,
        isDarkMode: false,
        autoSaveEnabled: true,
        currentSourceFormat: 'html',
        currentSourceFileName: '',
        selectedImage: null,
        currentElement: null,
        snapEnabled: false,
        gridSize: 10,
        savedRange: null
    };
}
