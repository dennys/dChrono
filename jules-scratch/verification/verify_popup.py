from playwright.sync_api import sync_playwright
import os

def main():
    with sync_playwright() as p:
        path_to_extension = os.path.abspath('dist')
        user_data_dir = '/tmp/test-user-data-dir'

        context = p.chromium.launch_persistent_context(
            user_data_dir,
            headless=False,
            args=[
                f"--disable-extensions-except={path_to_extension}",
                f"--load-extension={path_to_extension}",
            ],
        )

        # Wait for the service worker to be available
        service_worker = context.wait_for_event("serviceworker", timeout=60000)
        extension_id = service_worker.url.split('/')[2]

        page = context.new_page()
        page.goto(f"chrome-extension://{extension_id}/src/popup.html")

        # Wait for the page to load
        page.wait_for_selector("h1")

        page.screenshot(path="jules-scratch/verification/verification.png")

        context.close()

if __name__ == "__main__":
    main()
