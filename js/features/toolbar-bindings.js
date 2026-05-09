/**
 * Connects toolbar controls to editor commands and mode state.
 *
 * @param {object} options - Toolbar dependencies.
 * @returns {{syncCommandAvailability: Function}} Toolbar API.
 */
export function initToolbarBindings({
    refs,
    commands,
    selectionService,
    isCodeViewActive,
    onContentChanged
}) {
    const {
        toolbar,
        fontFamilySelect,
        fontSizeSelect,
        fontColorInput,
        backgroundColorInput
    } = refs;
    const compatibilitySensitiveSelectors = [
        'button[data-command]',
        '#insert-image',
        '#create-link',
        '#removeLink',
        '#font-family',
        '#font-size',
        '#font-color',
        '#bg-color'
    ].join(',');

    /**
     * Disables formatting controls while code view is active.
     *
     * @returns {void}
     */
    function syncCommandAvailability() {
        if (!toolbar) {
            return;
        }

        const disabled = isCodeViewActive();
        const controls = toolbar.querySelectorAll(compatibilitySensitiveSelectors);
        controls.forEach((control) => {
            control.disabled = disabled;
            control.setAttribute('aria-disabled', String(disabled));
        });
    }

    toolbar?.addEventListener('click', (event) => {
        const button = event.target.closest('button[data-command]');
        if (!button || isCodeViewActive()) {
            return;
        }

        const command = button.dataset.command;
        if (!command) {
            return;
        }

        if (command === 'unlink') {
            commands.removeLink();
        } else {
            commands.format(command);
        }

        onContentChanged();
    });

    fontFamilySelect?.addEventListener('change', () => {
        if (isCodeViewActive()) {
            return;
        }

        commands.applyFontFamily(fontFamilySelect.value);
        onContentChanged();
    });

    fontSizeSelect?.addEventListener('change', () => {
        if (isCodeViewActive()) {
            return;
        }

        commands.applyFontSize(fontSizeSelect.value);
        onContentChanged();
    });

    fontColorInput?.addEventListener('change', () => {
        if (isCodeViewActive()) {
            return;
        }

        selectionService.restore();
        commands.setTextColor(fontColorInput.value);
        onContentChanged();
    });

    backgroundColorInput?.addEventListener('change', () => {
        if (isCodeViewActive()) {
            return;
        }

        selectionService.restore();
        commands.setHighlightColor(backgroundColorInput.value);
        onContentChanged();
    });

    syncCommandAvailability();

    return {
        syncCommandAvailability
    };
}
