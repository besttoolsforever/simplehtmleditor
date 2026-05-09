import { expect, test } from '@playwright/test';

const unsafeHtml = [
    '<h1 onclick="alert(1)">Safe title</h1>',
    '<script>alert(1)</script>',
    '<a href="javascript:alert(1)" target="_blank">Unsafe link</a>',
    '<p style="position: fixed; color: red; background-image: url(javascript:alert(1))">Styled text</p>'
].join('');

test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.clear());
    await page.goto('/');
});

test('loads the editor and toggles code view safely', async ({ page }) => {
    await expect(page.locator('#editor')).toBeVisible();
    await expect(page.locator('#editor')).toContainText('Introducing the Simple HTML Editor');

    await page.locator('#toggle-view').click();

    await expect(page.locator('#code-editor-surface')).toBeVisible();
    await expect(page.locator('.cm-content')).toContainText('Introducing the Simple HTML Editor');
    await expect(page.locator('.editor-toolbar button[data-command="bold"]')).toBeDisabled();

    await page.locator('#toggle-view').click();

    await expect(page.locator('#editor')).toBeVisible();
    await expect(page.locator('#code-editor-surface')).toBeHidden();
});

test('sanitizes unsafe code before returning to visual view', async ({ page }) => {
    await page.locator('#toggle-view').click();
    await page.locator('.cm-content').click();
    await page.keyboard.press('ControlOrMeta+A');
    await page.keyboard.insertText(unsafeHtml);

    await page.locator('#toggle-view').click();

    const editorHtml = await page.locator('#editor').evaluate((editor) => editor.innerHTML);
    expect(editorHtml).toContain('Safe title');
    expect(editorHtml).toContain('Styled text');
    expect(editorHtml).toContain('color: red');
    expect(editorHtml).not.toMatch(/<script|onclick|javascript:|position:|background-image/i);
});
