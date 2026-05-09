/** Current persisted localStorage schema version. */
export const STORAGE_SCHEMA_VERSION = 2;

/** Storage keys used by the current app and legacy migrations. */
export const STORAGE_KEYS = {
    appState: 'htmlEditor.appState.v2',
    corruptPrefix: 'htmlEditor.corrupt',
    legacy: {
        docConfig: 'docManagerConfig',
        docsCollection: 'docManagerDocs',
        editorContent: 'editorContent',
        editorTheme: 'editorTheme'
    }
};

/** Default title assigned to the first local document. */
export const DEFAULT_DOCUMENT_NAME = 'document1';

/** Default editor chrome theme. */
export const DEFAULT_THEME = 'default';

/** Default dark mode preference. */
export const DEFAULT_DARK_MODE = false;

/** Starter HTML shown when a user opens the editor for the first time. */
export const DEFAULT_CONTENT = `
<div class="header">
    <img src="https://picsum.photos/200/50?random=1" alt="Simple HTML Editor Logo" style="width: 25%; height: auto;">
</div>
<div class="hero">
    <img src="https://picsum.photos/800/400?random=2" alt="Editor Interface Preview" style="width: 80%; height: auto;">
</div>

<h1>Introducing the Simple HTML Editor</h1>

<p>Hi there,</p>

<p>Creating clean, compliant HTML is now faster than ever. The Simple HTML Editor is built to help you build professional email templates, documentation, and web messages without any unnecessary clutter.</p>

<p><strong>Key features in this build:</strong></p>

<ul>
    <li>
        <strong>Smart Image Scaling:</strong>
        Resize images instantly using drag-and-drop controls or by entering custom dimensions.
    </li>
    <li>
        <strong>Easy Link Management:</strong>
        Seamlessly insert and manage URLs to guide your audience to your best content.
    </li>
    <li>
        <strong>Pro Templating:</strong>
        Draft newsletters and corporate updates in a lightweight, focused interface.
    </li>
</ul>

<p>Get a reliable foundation for formatted text that looks great across all platforms.</p>

<p>Best regards,<br>The Development Team</p>

<hr>

<div class="footer">
    <img src="https://picsum.photos/100/25?random=3" alt="Tech Footer Icon" style="width: 10%; height: auto;">
    <div class="contact-info">
        <p><strong>Project:</strong> Simple HTML Editor</p>
        <p><strong>Access the App:</strong>
            <a href="https://besttoolsforever.github.io/simplehtmleditor/" target="_blank">besttoolsforever.github.io/simplehtmleditor/</a>
        </p>
        <p><strong>More Projects:</strong>
            <a href="https://besttoolsforever.github.io/support/" target="_blank">besttoolsforever.github.io/support/</a>
        </p>
    </div>
</div>
`.trim();
