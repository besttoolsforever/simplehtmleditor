# Simple HTML Editor

A lightweight browser-based HTML editor with visual editing, CodeMirror source view, local document management, and HTML/Markdown import/export.

## Features

- Visual rich-text editing with formatting toolbar
- CodeMirror HTML source view with sanitized round-trip back to visual mode
- Local multi-document storage with auto-save and legacy storage migration
- HTML and Markdown import/export
- Image insertion, editing, resizing, dragging, and optional image links
- Theme, dark mode, editor fullscreen, and browser fullscreen controls
- Clipboard copy for raw HTML and formatted content

## Getting Started

```bash
npm install
npm run build
npm run serve
```

Open `http://127.0.0.1:4173`.

The app can also be opened directly through `index.html`. In `file://` mode it uses `js/app/bootstrap-standalone.js`, so run `npm run build` after changing source modules.

## Scripts

- `npm run build` - rebuilds CodeMirror and the standalone browser bundle
- `npm run serve` - serves the project locally for manual testing
- `npm run test:unit` - runs storage and sanitizer smoke tests
- `npm run test:e2e` - runs Playwright browser tests
- `npm test` - builds and runs all tests

## Project Structure

```text
assets/              Toolbar and UI icons
css/                 Base and premium UI styles
js/app/              DOM bootstrap and generated standalone bundle
js/core/             State, storage, sanitization, commands, and editor services
js/features/         Toolbar, documents, import/export, links, copy, UI, and image tools
js/vendor/           CodeMirror entry and generated browser bundle
js/tests/            Node smoke tests
tests/e2e/           Playwright tests and static test server
```

## Security Notes

Imported, stored, and code-view HTML is normalized through the editor sanitizer. The sanitizer removes script-capable tags, event attributes, unsafe URL schemes, and unsupported inline CSS before content is saved or rendered back into visual mode.

## Preparing For GitHub

Generated and local-only folders such as `node_modules/`, `playwright-report/`, `test-results/`, and `coverage/` are ignored by `.gitignore`. Commit the source files, `package.json`, `package-lock.json`, generated standalone bundles, and documentation.
