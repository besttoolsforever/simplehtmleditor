import { createOverlayController } from '../core/overlay-controller.js';

const THEMES = ['default', 'slim', 'minimal', 'neon-dark', 'vanilla'];

/**
 * Initializes theme, fullscreen, print, settings, and image spacing controls.
 *
 * @param {object} options - UI control dependencies.
 * @returns {{applyTheme: Function, applyDarkMode: Function, closeSettings: Function}} UI control API.
 */
export function initUiControls({ refs, store, appState, onPrint, onStatus }) {
    const {
        body,
        editorContainer,
        toggleThemeButton,
        toggleFullscreenButton,
        toggleBrowserFullscreenButton,
        printButton,
        toggleSettingsButton,
        toggleSpacingButton,
        spacingContent
    } = refs;

    let settingsController = null;

    /**
     * Applies and persists a visual theme class.
     *
     * @param {string} theme - Theme key.
     * @returns {void}
     */
    function applyTheme(theme) {
        editorContainer.classList.remove('theme-default', 'theme-slim', 'theme-minimal', 'theme-neon-dark', 'theme-vanilla');
        editorContainer.classList.add(`theme-${theme}`);
        store.setTheme(theme);
        appState.currentTheme = theme;
    }

    /**
     * Applies and persists dark mode state.
     *
     * @param {boolean} isDarkMode - Whether dark mode should be enabled.
     * @returns {void}
     */
    function applyDarkMode(isDarkMode) {
        appState.isDarkMode = Boolean(isDarkMode);

        if (appState.isDarkMode) {
            body.classList.remove('light-mode');
            body.classList.add('dark-mode');
            toggleThemeButton.innerHTML = '<img src="assets/sun.svg" alt="Light Mode"> <span class="btn-label-text">Light Mode</span>&nbsp;&nbsp;';
            toggleThemeButton.setAttribute('aria-pressed', 'true');
        } else {
            body.classList.remove('dark-mode');
            body.classList.add('light-mode');
            toggleThemeButton.innerHTML = '<img src="assets/moon-fill.svg" alt="Dark Mode"> <span class="btn-label-text">Dark Mode</span>';
            toggleThemeButton.setAttribute('aria-pressed', 'false');
        }

        store.setDarkMode(appState.isDarkMode);
    }

    /**
     * Creates the settings panel lazily when the button is available.
     *
     * @returns {HTMLElement|null} Settings panel element.
     */
    function ensureSettingsPanel() {
        if (!toggleSettingsButton || !editorContainer) {
            return null;
        }

        let settingsPanel = editorContainer.querySelector('#editor-settings-panel');
        if (settingsPanel) {
            return settingsPanel;
        }

        settingsPanel = document.createElement('div');
        settingsPanel.id = 'editor-settings-panel';
        settingsPanel.className = 'editor-settings-panel';
        settingsPanel.style.display = 'none';
        settingsPanel.setAttribute('role', 'dialog');
        settingsPanel.setAttribute('aria-modal', 'false');
        settingsPanel.setAttribute('aria-hidden', 'true');
        settingsPanel.setAttribute('aria-labelledby', 'editor-settings-title');
        settingsPanel.innerHTML = `
            <h3 id="editor-settings-title">Settings</h3>
            <label for="editor-theme-select">Theme</label>
            <select id="editor-theme-select" aria-label="Theme selection">
                ${THEMES.map((theme) => `<option value="${theme}">${theme.charAt(0).toUpperCase() + theme.slice(1).replace('-', ' ')}</option>`).join('')}
            </select>
        `;

        editorContainer.appendChild(settingsPanel);
        return settingsPanel;
    }

    /**
     * Positions the floating settings panel below its trigger.
     *
     * @param {HTMLElement} settingsPanel - Panel to position.
     * @returns {void}
     */
    function positionSettingsPanel(settingsPanel) {
        const btnRect = toggleSettingsButton.getBoundingClientRect();
        const containerRect = editorContainer.getBoundingClientRect();

        let left = btnRect.left - containerRect.left;
        const top = btnRect.bottom - containerRect.top + 5;

        if (left + settingsPanel.offsetWidth > containerRect.width) {
            left = containerRect.width - settingsPanel.offsetWidth - 10;
        }

        settingsPanel.style.top = `${Math.max(8, top)}px`;
        settingsPanel.style.left = `${Math.max(8, left)}px`;
    }

    /**
     * Binds the settings panel overlay and theme selector.
     *
     * @returns {void}
     */
    function setupSettingsPanel() {
        if (!toggleSettingsButton || !editorContainer) {
            return;
        }

        const settingsPanel = ensureSettingsPanel();
        const themeSelect = settingsPanel.querySelector('#editor-theme-select');

        themeSelect.addEventListener('change', () => {
            applyTheme(themeSelect.value);
            onStatus?.('Theme updated.', { type: 'success' });
            settingsController?.close();
        });

        settingsController = createOverlayController({
            element: settingsPanel,
            trigger: toggleSettingsButton,
            onOpen: () => {
                themeSelect.value = appState.currentTheme || 'default';
                settingsPanel.style.display = 'block';
                settingsPanel.style.position = 'absolute';
                settingsPanel.style.zIndex = '99999';
                toggleSettingsButton.setAttribute('aria-expanded', 'true');
                positionSettingsPanel(settingsPanel);
            },
            onClose: () => {
                settingsPanel.style.display = 'none';
                toggleSettingsButton.setAttribute('aria-expanded', 'false');
            },
            initialFocus: () => themeSelect
        });

        toggleSettingsButton.addEventListener('click', (event) => {
            event.stopPropagation();
            settingsController.toggle({ invoker: toggleSettingsButton });
        });

        window.addEventListener('resize', () => {
            if (settingsController?.isOpen()) {
                positionSettingsPanel(settingsPanel);
            }
        });
    }

    const preferences = store.getPreferences();
    applyTheme(preferences.theme || 'default');
    applyDarkMode(Boolean(preferences.darkMode));
    toggleSpacingButton?.setAttribute('aria-expanded', String(!spacingContent?.classList?.contains('hidden')));

    toggleThemeButton?.addEventListener('click', () => {
        applyDarkMode(!appState.isDarkMode);
        onStatus?.(
            appState.isDarkMode ? 'Dark mode enabled.' : 'Dark mode disabled.',
            { type: 'info' }
        );
    });

    toggleFullscreenButton?.addEventListener('click', () => {
        editorContainer.classList.toggle('fullscreen');
        const isFullscreen = editorContainer.classList.contains('fullscreen');

        toggleFullscreenButton.setAttribute('aria-pressed', String(isFullscreen));
        if (isFullscreen) {
            toggleFullscreenButton.innerHTML = '<img src="assets/aspect-ratio.svg" alt="Shrink Screen"> <span class="btn-label-text">Shrink Screen</span>';
            onStatus?.('Editor fullscreen enabled.', { type: 'info' });
        } else {
            toggleFullscreenButton.innerHTML = '<img src="assets/aspect-ratio.svg" alt="Expand Screen"> <span class="btn-label-text">Expand Screen</span>';
            onStatus?.('Editor fullscreen disabled.', { type: 'info' });
        }
    });

    toggleBrowserFullscreenButton?.addEventListener('click', async () => {
        try {
            if (!document.fullscreenElement) {
                if (typeof document.documentElement.requestFullscreen !== 'function') {
                    onStatus?.('Browser fullscreen is not supported in this environment.', { type: 'warning' });
                    return;
                }

                await document.documentElement.requestFullscreen();
                toggleBrowserFullscreenButton.innerHTML = '<img src="assets/arrows-fullscreen.svg" alt="Exit Full Screen"> <span class="btn-label-text">Exit Full Screen (ESC)</span>';
                toggleBrowserFullscreenButton.setAttribute('aria-pressed', 'true');
                onStatus?.('Browser fullscreen enabled.', { type: 'info' });
                return;
            }

            if (typeof document.exitFullscreen === 'function') {
                await document.exitFullscreen();
                toggleBrowserFullscreenButton.innerHTML = '<img src="assets/arrows-fullscreen.svg" alt="Full Screen (F11)"> <span class="btn-label-text">Full Screen (F11)</span>';
                toggleBrowserFullscreenButton.setAttribute('aria-pressed', 'false');
                onStatus?.('Browser fullscreen disabled.', { type: 'info' });
            }
        } catch (error) {
            console.warn('[UiControls] browser fullscreen toggle failed', error);
            onStatus?.('Could not toggle browser fullscreen.', { type: 'error', assertive: true });
        }
    });

    document.addEventListener('fullscreenchange', () => {
        const isFullscreen = Boolean(document.fullscreenElement);
        toggleBrowserFullscreenButton?.setAttribute('aria-pressed', String(isFullscreen));
        if (!toggleBrowserFullscreenButton) {
            return;
        }
        toggleBrowserFullscreenButton.innerHTML = isFullscreen
            ? '<img src="assets/arrows-fullscreen.svg" alt="Exit Full Screen"> <span class="btn-label-text">Exit Full Screen (ESC)</span>'
            : '<img src="assets/arrows-fullscreen.svg" alt="Full Screen (F11)"> <span class="btn-label-text">Full Screen (F11)</span>';
    });

    printButton?.addEventListener('click', () => {
        if (typeof onPrint === 'function') {
            onPrint();
            onStatus?.('Print dialog opened.', { type: 'info' });
            return;
        }
        window.print();
    });

    toggleSpacingButton?.addEventListener('click', () => {
        if (!spacingContent) {
            return;
        }

        const isHidden = spacingContent.classList.contains('hidden');

        if (isHidden) {
            spacingContent.classList.remove('hidden');
            toggleSpacingButton.textContent = 'Hide Spacing (Margin/Padding)';
            toggleSpacingButton.setAttribute('aria-expanded', 'true');
        } else {
            spacingContent.classList.add('hidden');
            toggleSpacingButton.textContent = 'Show Spacing (Margin/Padding)';
            toggleSpacingButton.setAttribute('aria-expanded', 'false');
        }
    });

    setupSettingsPanel();

    return {
        applyTheme,
        applyDarkMode,
        closeSettings: (restoreFocus = false) => settingsController?.close({ shouldRestoreFocus: restoreFocus })
    };
}
