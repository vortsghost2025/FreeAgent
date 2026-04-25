# REMOVED: sensitive data redacted by automated security cleanup
#!/usr/bin/env python3
"""Check Etherscan for drain transaction details"""

from playwright.sync_api import sync_playwright

WALLET = "REDACTED_ADDRESS"

def main():
    with sync_playwright() as p:
        # Launch browser (headless for automation)
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()
        
        print(f"Checking wallet: {WALLET}")
        
        # Check internal transactions tab
        print("\n=== CHECKING INTERNAL TRANSACTIONS ===")
        try:
            page.goto(f"https://etherscan.io/address/{WALLET}#internaltx", timeout=60000)
            page.wait_for_timeout(8000)  # Wait for content to load
            page.screenshot(path='internal_tx.png', full_page=True)
            print("Screenshot saved to internal_tx.png")
            
            # Look for internal transaction data
            content = page.content()
            if "No transactions" in content or "There are no internal" in content:
                print("No internal transactions found")
            else:
                print("Found internal transactions - check screenshot")
        except Exception as e:
            print(f"Error: {e}")
        
        # Check normal transactions
        print("\n=== CHECKING NORMAL TRANSACTIONS ===")
        try:
            page.goto(f"https://etherscan.io/txs?a={WALLET}", timeout=60000)
            page.wait_for_timeout(8000)
            page.screenshot(path='normal_txs.png', full_page=True)
            print("Screenshot saved to normal_txs.png")
        except Exception as e:
            print(f"Error: {e}")
        
        browser.close()
        print("\nDone! Check the screenshots.")

if __name__ == "__main__":
    main()
