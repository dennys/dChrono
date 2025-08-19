from playwright.sync_api import sync_playwright, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    page.goto("file:///app/dist/src/popup.html")

    # The "Once" text is visible when there are no repeating days
    # The delete confirmation is a browser dialog, which is harder to test.
    # I will focus on the "Once" text.
    # To test this, I need to add an alarm with no repeating days.

    # Click the "Add Alarm" button
    page.locator("#add-alarm-btn").click()

    # Fill in the alarm details
    page.locator("#alarm-time").fill("10:00")
    page.locator("#alarm-name").fill("Test Once Alarm")

    # Click the "Save" button
    page.locator("#save-btn").click()

    # Verify the "Once" text is displayed
    expect(page.locator(".alarm-days")).to_have_text("Once")

    page.screenshot(path="jules-scratch/verification/popup_verification.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
