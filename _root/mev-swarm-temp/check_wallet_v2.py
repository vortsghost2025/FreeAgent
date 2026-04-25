# REMOVED: sensitive data redacted by automated security cleanup
#!/usr/bin/env python3
"""Check wallet with screenshot"""

from playwright.sync_api import sync_playwright

WALLET = "REDACTED_ADDRESS"

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1920, 'height': 1080})
        page = context.new_page()
        
        print(f"Checking wallet: {WALLET}")
        
        # Go to etherscan and get screenshot
        print("\n=== TAKING SCREENSHOT ===")
        page.goto(f"https://etherscan.io/address/{WALLET}", timeout=60000)
        page.wait_for_timeout(15000)
        
        page.screenshot(path='etherscan_wallet.png', full_page=True)
        print("Screenshot saved to etherscan_wallet.png")
        
        # Get page content
        content = page.content()
        print(f"Page length: {len(content)} chars")
        
        # Try to find balance
        print("\n=== LOOKING FOR BALANCE ===")
        # Etherscan uses different selectors
        try:
            # Look for any text containing "Ether" or balance
            all_text = page.locator('body').inner_text()
            print(f"Body text (first 2000 chars):\n{all_text[:2000]}")
        except Exception as e:
            print(f"Error getting text: {e}")
        
        browser.close()
        print("\nDone!")

if __name__ == "__main__":
    main()
