from playwright.sync_api import sync_playwright, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    # Navigate to the alarm page with some dummy data
    page.goto("http://localhost:4173/src/alarm.html?name=Test%20Alarm&description=Test%20Description&alarmName=test&days=[]")

    # Check the title
    expect(page).to_have_title("dChrono")

    # Check that the "Name:" and "Description:" labels are gone
    name_label = page.locator("strong:has-text('Name:')")
    description_label = page.locator("strong:has-text('Description:')")
    expect(name_label).to_have_count(0)
    expect(description_label).to_have_count(0)

    # Check the content of the alarm details
    expect(page.locator("#alarm-name-display")).to_have_text("Test Alarm")
    expect(page.locator("#alarm-description-display")).to_have_text("Test Description")

    # Check the internationalized text
    expect(page.locator("#alarm-title")).to_have_text("Alarm Ringing")
    expect(page.locator("#snooze-btn")).to_have_text("Snooze (5 min)")
    expect(page.locator("#close-btn")).to_have_text("Close")

    page.screenshot(path="jules-scratch/verification/alarm_verification.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
