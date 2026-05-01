document.addEventListener('DOMContentLoaded', function () {

    // --- Elements ---
    const editor = document.getElementById('editor');
    const toggleViewButton = document.getElementById('toggle-view');
    const fontFamilySelect = document.getElementById('font-family');
    const fontSizeSelect = document.getElementById('font-size');
    const toggleFullscreenButton = document.getElementById('toggle-fullscreen');
    const toggleBrowserFullscreenButton = document.getElementById('toggle-browser-fullscreen');

    // Image Dialog Elements
    const imageDialog = document.getElementById('image-dialog');
    const imageUrlInput = document.getElementById('image-url');
    const imageAltInput = document.getElementById('image-alt');
    const imageWidthInput = document.getElementById('image-width');
    const imageHeightInput = document.getElementById('image-height');
    // New Fields
    const imageTitleInput = document.getElementById('image-title');
    const imageBorderRadiusInput = document.getElementById('image-border-radius');
    const imageMarginTopInput = document.getElementById('image-margin-top');
    const imageMarginRightInput = document.getElementById('image-margin-right');
    const imageMarginBottomInput = document.getElementById('image-margin-bottom');
    const imageMarginLeftInput = document.getElementById('image-margin-left');
    const imagePaddingTopInput = document.getElementById('image-padding-top');
    const imagePaddingRightInput = document.getElementById('image-padding-right');
    const imagePaddingBottomInput = document.getElementById('image-padding-bottom');
    const imagePaddingLeftInput = document.getElementById('image-padding-left');
    const imageCustomCssInput = document.getElementById('image-custom-css');
    const imageLinkUrlInput = document.getElementById('image-link-url');
    const imageLinkNewTabCheckbox = document.getElementById('image-link-new-tab');
    const saveImageButton = document.getElementById('save-image');
    const cancelImageButton = document.getElementById('cancel-image');

    // Link Dialog Elements
    const linkDialog = document.getElementById('link-dialog');
    const linkUrlInput = document.getElementById('link-url');
    const linkNewTabCheckbox = document.getElementById('link-new-tab');
    const saveLinkButton = document.getElementById('save-link');
    const cancelLinkButton = document.getElementById('cancel-link');

    const createLinkButton = document.getElementById('create-link');
    const printButton = document.getElementById('print');
    const toggleThemeButton = document.getElementById('toggle-theme');
    const darkModeIcon = document.querySelector('#toggle-theme img');

    // --- State ---
    let isHTMLView = false;
    let isDarkMode = false;
    let currentElement = null;
    let savedRange = null;

    // --- Initialization ---
    // --- Initialization ---
    const storedContent = localStorage.getItem('editorContent');
    const defaultContent = `
        <div class="header">
            <img src="https://wdv.com.br/storage/2024/05/wdvblue_little.webp" alt="Company Logo" style="width: 25%; height: 25%;">
        </div>
        <div class="hero">
            <img src="https://wdv.com.br/storage/2024/05/websitecreation-scaled.webp" alt="Featured Image" style="width: 25%; height: 25%;">
        </div>
        <h1>Introducing Our New Products/Services</h1>
        <p>Dear [Client Name],</p>
        <p>We are excited to share our latest news with you. Our products/services have been designed to help your company achieve new levels of success and efficiency.</p>
        <p>Check out the highlights of our products/services below:</p>
        <ul>
            <li><strong>Product/Service 1:</strong> [Brief description of Product/Service 1]</li>
            <li><strong>Product/Service 2:</strong> [Brief description of Product/Service 2]</li>
            <li><strong>Product/Service 3:</strong> [Brief description of Product/Service 3]</li>
        </ul>
        <p>Our team is available to provide more information and answer any questions you may have. Do not hesitate to contact us.</p>
        <p>We are confident that our products/services will provide significant benefits to your company.</p>
        <p>Sincerely,<br>[Your Name]</p>
        <div class="footer">
            <img src="https://wdv.com.br/storage/2024/05/wdvblue_little.webp" alt="Company Logo" style="width: 10%; height: 10%;">
            <div class="contact-info">
                <p><strong>Position:</strong> [Your Position]</p>
                <p><strong>Name:</strong> [Your Name]</p>
                <p><strong>Phone:</strong> [Your Phone]</p>
                <p><strong>Email:</strong> <a href="mailto:email@yoursite.com">email@yoursite.com</a></p>
                <p><strong>Website:</strong> <a href="https://yoursite.com">yoursite.com</a></p>
            </div>
        </div>
    `;

    if (storedContent) {
        editor.innerHTML = storedContent;
    } else {
        editor.innerHTML = defaultContent;
    }

    // --- Helper Functions ---
    function saveSelection() {
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            if (editor.contains(range.commonAncestorContainer)) {
                savedRange = range;
            }
        }
    }

    function restoreSelection() {
        const selection = window.getSelection();
        selection.removeAllRanges();
        if (savedRange) {
            selection.addRange(savedRange);
        }
    }

    function getParentAnchor(element) {
        while (element && element !== editor) {
            if (element.tagName === 'A') {
                return element;
            }
            element = element.parentNode;
        }
        return null;
    }

    function formatUnit(val) {
        if (!val) return '';
        val = val.trim();
        if (val && !isNaN(val)) return val + 'px';
        return val;
    }

    function ensureProtocol(url) {
        if (!url) return '';
        // If it starts with http://, https://, mailto:, tel:, or is a relative path/anchor, leave it alone
        if (/^(http:\/\/|https:\/\/|mailto:|tel:|\/|#)/i.test(url)) {
            return url;
        }
        // Otherwise, assume https://
        return 'https://' + url;
    }

    // --- Event Listeners ---

    // Save content
    function saveEditorContent() {
        let newContent;
        if (isHTMLView) {
            // In Code View, the content is the innerText (the raw HTML code)
            newContent = editor.innerText;
        } else {
            // In Visual View, the content is the innerHTML
            newContent = editor.innerHTML;
        }
        localStorage.setItem('editorContent', newContent);
    }
    editor.addEventListener('input', saveEditorContent);

    // Print - Global function for use by HTML onclick and event listener
    window.printDocument = function () {
        // The CSS @media print rules will automatically handle:
        // - Hiding all non-editor elements
        // - Detecting dark mode (body.dark-mode class)
        // - Detecting code view (.code-view-mode class)
        // - Preserving syntax highlighting colors
        // - Printing all content (including scrolled areas)
        window.print();
    };

    // Attach to button click as well
    printButton.addEventListener('click', window.printDocument);

    // Toggle View (WYSIWYG / HTML)
    toggleViewButton.addEventListener('click', () => {
        isHTMLView = CodeView.toggle(editor, toggleViewButton, isHTMLView);
    });

    // Font Family
    fontFamilySelect.addEventListener('change', function () {
        document.execCommand('fontName', false, fontFamilySelect.value);
    });

    // Font Size
    fontSizeSelect.addEventListener('change', function () {
        document.execCommand('fontSize', false, '7'); // Arbitrary value
        const fontElements = editor.getElementsByTagName('font');
        for (let i = 0; i < fontElements.length; i++) {
            if (fontElements[i].size === '7') {
                fontElements[i].removeAttribute('size');
                fontElements[i].style.fontSize = fontSizeSelect.value;
            }
        }
    });

    // Theme Toggle
    toggleThemeButton.addEventListener('click', () => {
        if (isDarkMode) {
            document.body.classList.remove('dark-mode');
            document.body.classList.add('light-mode');
            darkModeIcon.src = 'assets/moon-fill.svg';
            toggleThemeButton.innerHTML = `<img src="assets/moon-fill.svg" alt="Dark Mode"> Dark Mode`;
        } else {
            document.body.classList.remove('light-mode');
            document.body.classList.add('dark-mode');
            darkModeIcon.src = 'assets/sun.svg';
            toggleThemeButton.innerHTML = `<img src="assets/sun.svg" alt="Light Mode"> Light Mode&nbsp;&nbsp;`;
        }
        isDarkMode = !isDarkMode;
    });

    // Fullscreen (Editor)
    toggleFullscreenButton.addEventListener('click', () => {
        const editorContainer = document.querySelector('.editor-container');
        editorContainer.classList.toggle('fullscreen');
        if (editorContainer.classList.contains('fullscreen')) {
            toggleFullscreenButton.innerHTML = `<img src="assets/aspect-ratio.svg" alt="Shrink Screen"> Shrink Screen`;
        } else {
            toggleFullscreenButton.innerHTML = `<img src="assets/aspect-ratio.svg" alt="Expand Screen"> Expand Screen`;
        }
    });

    // Fullscreen (Browser)
    toggleBrowserFullscreenButton.addEventListener('click', () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
            toggleBrowserFullscreenButton.innerHTML = `<img src="assets/arrows-fullscreen.svg" alt="Exit Full Screen"> Exit Full Screen (ESC)`;
        } else if (document.exitFullscreen) {
            document.exitFullscreen();
            toggleBrowserFullscreenButton.innerHTML = `<img src="assets/arrows-fullscreen.svg" alt="Full Screen (F11)"> Full Screen (F11)`;
        }
    });

    // Create Link Button Click
    createLinkButton.addEventListener('click', function () {
        const selection = window.getSelection();
        let anchor = null;

        if (selection.rangeCount > 0) {
            const node = selection.anchorNode;
            anchor = getParentAnchor(node.nodeType === 3 ? node.parentNode : node);
        }

        if (anchor) {
            currentElement = anchor;
            linkUrlInput.value = anchor.href;
            linkNewTabCheckbox.checked = anchor.target === '_blank';
        } else {
            // Save selection before dialog opens to preserve selected text
            saveSelection();
            currentElement = null;
            linkUrlInput.value = 'https://';
            linkNewTabCheckbox.checked = false;
        }

        linkDialog.classList.remove('hidden');
    });

    // Save Link
    saveLinkButton.addEventListener('click', () => {
        const url = ensureProtocol(linkUrlInput.value);
        const openInNewTab = linkNewTabCheckbox.checked;

        if (currentElement && currentElement.tagName === 'A') {
            // Edit existing link
            currentElement.href = url;
            currentElement.target = openInNewTab ? '_blank' : '_self';
        } else {
            // Create new link
            restoreSelection();
            document.execCommand('createLink', false, url);

            // The execCommand doesn't handle target, so we need to find the just created link
            // This is a bit tricky, but usually the selection is still inside the link
            const selection = window.getSelection();
            if (selection.rangeCount > 0) {
                const anchor = getParentAnchor(selection.anchorNode);
                if (anchor) {
                    anchor.target = openInNewTab ? '_blank' : '_self';
                }
            }
        }

        linkDialog.classList.add('hidden');
        currentElement = null;
    });

    // Cancel Link
    cancelLinkButton.addEventListener('click', () => {
        linkDialog.classList.add('hidden');
        currentElement = null;
    });

    // Track Cursor Position for Image/Link Insertion
    editor.addEventListener('keyup', saveSelection);
    editor.addEventListener('mouseup', saveSelection);
    editor.addEventListener('click', saveSelection);

    // Double Click Handling (Image & Link)
    editor.addEventListener('dblclick', (e) => {
        const target = e.target;

        // Image Editing
        if (target.tagName === 'IMG') {
            currentElement = target;
            imageUrlInput.value = target.src;
            imageAltInput.value = target.alt;
            imageWidthInput.value = target.style.width;
            imageHeightInput.value = target.style.height;
            imageTitleInput.value = target.title;
            imageBorderRadiusInput.value = target.style.borderRadius;
            imageMarginTopInput.value = target.style.marginTop;
            imageMarginRightInput.value = target.style.marginRight;
            imageMarginBottomInput.value = target.style.marginBottom;
            imageMarginLeftInput.value = target.style.marginLeft;
            imagePaddingTopInput.value = target.style.paddingTop;
            imagePaddingRightInput.value = target.style.paddingRight;
            imagePaddingBottomInput.value = target.style.paddingBottom;
            imagePaddingLeftInput.value = target.style.paddingLeft;
            imageCustomCssInput.value = ''; // Reset custom CSS field

            const parentAnchor = target.closest('a');
            if (parentAnchor) {
                imageLinkUrlInput.value = parentAnchor.href;
                imageLinkNewTabCheckbox.checked = parentAnchor.target === '_blank';
            } else {
                imageLinkUrlInput.value = '';
                imageLinkNewTabCheckbox.checked = false;
            }

            imageDialog.classList.remove('hidden');
        }
        // Link Editing
        else {
            const anchor = getParentAnchor(target);
            if (anchor) {
                currentElement = anchor;
                linkUrlInput.value = anchor.href;
                linkNewTabCheckbox.checked = anchor.target === '_blank';
                linkDialog.classList.remove('hidden');
            }
        }
    });

    // Insert Image Button
    document.getElementById('insert-image').addEventListener('click', () => {
        // saveSelection(); // Removed to prevent overwriting valid editor selection with button selection
        currentElement = null;
        imageDialog.classList.remove('hidden');
    });

    // Save Image
    saveImageButton.addEventListener('click', () => {
        const url = imageUrlInput.value;
        const alt = imageAltInput.value;
        const title = imageTitleInput.value;
        const width = formatUnit(imageWidthInput.value);
        const height = formatUnit(imageHeightInput.value);
        const borderRadius = formatUnit(imageBorderRadiusInput.value);

        const marginTop = formatUnit(imageMarginTopInput.value);
        const marginRight = formatUnit(imageMarginRightInput.value);
        const marginBottom = formatUnit(imageMarginBottomInput.value);
        const marginLeft = formatUnit(imageMarginLeftInput.value);

        const paddingTop = formatUnit(imagePaddingTopInput.value);
        const paddingRight = formatUnit(imagePaddingRightInput.value);
        const paddingBottom = formatUnit(imagePaddingBottomInput.value);
        const paddingLeft = formatUnit(imagePaddingLeftInput.value);

        const customCss = imageCustomCssInput.value;

        const linkUrl = ensureProtocol(imageLinkUrlInput.value);
        const openInNewTab = imageLinkNewTabCheckbox.checked;

        let imgToUpdate = currentElement;

        if (currentElement && currentElement.tagName === 'IMG') {
            currentElement.src = url;
            currentElement.alt = alt;
            currentElement.title = title;
            if (width !== '') currentElement.style.width = width;
            if (height !== '') currentElement.style.height = height;
            if (borderRadius !== '') currentElement.style.borderRadius = borderRadius;

            if (marginTop !== '') currentElement.style.marginTop = marginTop;
            if (marginRight !== '') currentElement.style.marginRight = marginRight;
            if (marginBottom !== '') currentElement.style.marginBottom = marginBottom;
            if (marginLeft !== '') currentElement.style.marginLeft = marginLeft;

            if (paddingTop !== '') currentElement.style.paddingTop = paddingTop;
            if (paddingRight !== '') currentElement.style.paddingRight = paddingRight;
            if (paddingBottom !== '') currentElement.style.paddingBottom = paddingBottom;
            if (paddingLeft !== '') currentElement.style.paddingLeft = paddingLeft;

            if (customCss) currentElement.style.cssText += ';' + customCss;

        } else {
            restoreSelection();
            const img = document.createElement('img');
            img.src = url;
            img.alt = alt;
            img.title = title;
            if (width) img.style.width = width;
            if (height) img.style.height = height;
            if (borderRadius) img.style.borderRadius = borderRadius;

            if (marginTop) img.style.marginTop = marginTop;
            if (marginRight) img.style.marginRight = marginRight;
            if (marginBottom) img.style.marginBottom = marginBottom;
            if (marginLeft) img.style.marginLeft = marginLeft;

            if (paddingTop) img.style.paddingTop = paddingTop;
            if (paddingRight) img.style.paddingRight = paddingRight;
            if (paddingBottom) img.style.paddingBottom = paddingBottom;
            if (paddingLeft) img.style.paddingLeft = paddingLeft;

            if (customCss) img.style.cssText += ';' + customCss;

            const selection = window.getSelection();
            if (selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                if (editor.contains(range.commonAncestorContainer)) {
                    range.deleteContents();
                    range.insertNode(img);
                } else {
                    editor.appendChild(img);
                }
            } else {
                editor.appendChild(img);
            }
            imgToUpdate = img;
        }

        // Handle Link
        const parentAnchor = imgToUpdate.closest('a');
        if (linkUrl) {
            if (parentAnchor) {
                parentAnchor.href = linkUrl;
                parentAnchor.target = openInNewTab ? '_blank' : '_self';
            } else {
                const anchor = document.createElement('a');
                anchor.href = linkUrl;
                anchor.target = openInNewTab ? '_blank' : '_self';
                imgToUpdate.parentNode.insertBefore(anchor, imgToUpdate);
                anchor.appendChild(imgToUpdate);
            }
        } else {
            // Remove link if it exists
            if (parentAnchor) {
                // Move image out of anchor
                parentAnchor.parentNode.insertBefore(imgToUpdate, parentAnchor);
                parentAnchor.remove();
            }
        }

        imageDialog.classList.add('hidden');
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
        currentElement = null;
    });

    // Cancel Image
    cancelImageButton.addEventListener('click', () => {
        imageDialog.classList.add('hidden');
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
        currentElement = null;
    });

    window.formatText = function (command) {
        document.execCommand(command, false, null);
    };

    window.changeFontColor = function (color) {
        restoreSelection();
        document.execCommand('foreColor', false, color);
    };

    window.changeBackgroundColor = function (color) {
        restoreSelection();
        document.execCommand('hiliteColor', false, color);
    };

    window.openImageDialog = function () {
        imageDialog.classList.remove('hidden');
    };

    // --- Copy Buttons ---
    const copyCodeBtn = document.querySelector("#copyCodeButton");
    const copyContentBtn = document.querySelector("#copyContentButton");

    function showCopiedFeedback(button) {
        const textSpan = button.querySelector('.btn-text');
        const iconCopy = button.querySelector('.btn-icon');
        const iconCheck = button.querySelector('.icon-check');

        // Lock dimensions to prevent resizing
        const rect = button.getBoundingClientRect();
        button.style.width = `${rect.width}px`;
        button.style.height = `${rect.height}px`;

        // Hide text and copy icon
        textSpan.style.display = 'none';
        if (iconCopy) iconCopy.style.display = 'none';

        // Show check icon centered
        if (iconCheck) {
            iconCheck.style.display = 'block';
            // Since button is flex centered, hiding others and showing this one centers it automatically
        }

        setTimeout(function () {
            // Restore original state
            button.style.width = '';
            button.style.height = '';

            textSpan.style.display = '';
            if (iconCopy) iconCopy.style.display = '';
            if (iconCheck) iconCheck.style.display = 'none';
        }, 2000);
    }

    function copyCode() {
        let html;
        if (isHTMLView) {
            html = editor.innerText;
        } else {
            html = editor.innerHTML;
        }
        navigator.clipboard.writeText(html).then(() => {
            showCopiedFeedback(copyCodeBtn);
        });
    }

    function copyContent() {
        if (isHTMLView) {
            // In code view, copy the text content (the code)
            const html = editor.innerText;
            navigator.clipboard.writeText(html).then(() => {
                showCopiedFeedback(copyContentBtn);
            });
        } else {
            // In visual view, copy the rich text
            const html = editor.innerHTML;
            const tempDiv = document.createElement("div");
            tempDiv.innerHTML = html;
            document.body.appendChild(tempDiv);

            const range = document.createRange();
            range.selectNodeContents(tempDiv);
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);

            document.execCommand("copy");

            selection.removeAllRanges();
            document.body.removeChild(tempDiv);

            showCopiedFeedback(copyContentBtn);
        }
    }

    if (copyCodeBtn) copyCodeBtn.addEventListener("click", copyCode);
    if (copyContentBtn) copyContentBtn.addEventListener("click", copyContent);

    // Toggle Spacing Button
    const toggleSpacingBtn = document.getElementById('toggle-spacing-btn');
    const spacingContent = document.getElementById('spacing-content');

    if (toggleSpacingBtn && spacingContent) {
        toggleSpacingBtn.addEventListener('click', function () {
            const isHidden = spacingContent.classList.contains('hidden');

            if (isHidden) {
                spacingContent.classList.remove('hidden');
                toggleSpacingBtn.textContent = '▲ Hide Spacing (Margin/Padding)';
            } else {
                spacingContent.classList.add('hidden');
                toggleSpacingBtn.textContent = '▼ Show Spacing (Margin/Padding)';
            }
        });
    }

    // --- Settings Panel (Minimal) ---
    const settingsBtn = document.getElementById('toggle-settings');
    const editorContainer = document.querySelector('.editor-container');
    let settingsPanel = null;

    function applyTheme(theme) {
        editorContainer.classList.remove('theme-default', 'theme-vanilla', 'theme-minimal', 'theme-commercial-pro');
        if (theme !== 'default') {
            editorContainer.classList.add('theme-' + theme);
        }
        localStorage.setItem('editorTheme', theme);
    }

    // Load saved theme on startup
    if (editorContainer) {
        const savedTheme = localStorage.getItem('editorTheme') || 'default';
        if (savedTheme !== 'default') {
            applyTheme(savedTheme);
        }
    }

    if (settingsBtn && editorContainer) {
        settingsBtn.addEventListener('click', function (e) {
            e.stopPropagation();

            // Create panel if doesn't exist
            if (!settingsPanel) {
                settingsPanel = document.createElement('div');
                settingsPanel.className = 'editor-settings-panel';
                settingsPanel.style.display = 'none';
                settingsPanel.innerHTML = `
                    <h3>Settings</h3>
                    <label for="editor-theme-select">Theme</label>
                    <select id="editor-theme-select">
                        <option value="default">Default</option>
                        <option value="vanilla">Vanilla</option>
                        <option value="minimal">Minimal</option>
                        <option value="commercial-pro">Commercial Pro</option>
                    </select>
                `;
                editorContainer.appendChild(settingsPanel);

                // Theme change handler
                const themeSelect = settingsPanel.querySelector('#editor-theme-select');
                themeSelect.addEventListener('change', function () {
                    applyTheme(this.value);
                    settingsPanel.style.display = 'none'; // Close on selection
                });

                // Set current value
                themeSelect.value = localStorage.getItem('editorTheme') || 'default';
            }

            // Toggle visibility
            const isVisible = settingsPanel.style.display === 'block';

            if (isVisible) {
                settingsPanel.style.display = 'none';
            } else {
                // Update value in case it changed elsewhere
                const themeSelect = settingsPanel.querySelector('#editor-theme-select');
                if (themeSelect) themeSelect.value = localStorage.getItem('editorTheme') || 'default';

                // Calculate position
                const btnRect = settingsBtn.getBoundingClientRect();
                const containerRect = editorContainer.getBoundingClientRect();

                settingsPanel.style.display = 'block';
                settingsPanel.style.position = 'absolute';
                settingsPanel.style.zIndex = '99999';

                // Position below the button, left-aligned with button
                // Relative to editorContainer
                let top = btnRect.bottom - containerRect.top + 5;
                let left = btnRect.left - containerRect.left;

                // Prevent overflow
                if (left + settingsPanel.offsetWidth > containerRect.width) {
                    left = containerRect.width - settingsPanel.offsetWidth - 10;
                }

                settingsPanel.style.top = `${top}px`;
                settingsPanel.style.left = `${left}px`;

                // Close on outside click
                const closeHandler = function (event) {
                    if (!settingsPanel.contains(event.target) && event.target !== settingsBtn && !settingsBtn.contains(event.target)) {
                        settingsPanel.style.display = 'none';
                        document.removeEventListener('click', closeHandler);
                    }
                };
                setTimeout(() => {
                    document.addEventListener('click', closeHandler);
                }, 0);
            }
        });
    }

});
