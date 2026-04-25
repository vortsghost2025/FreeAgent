# REMOVED: sensitive data redacted by automated security cleanup
#!/usr/bin/env python3
"""Find the drain transaction"""

from playwright.sync_api import sync_playwright

WALLET = "REDACTED_ADDRESS"

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()
        
        print(f"Checking wallet: {WALLET}")
        
        # Check internal transactions
        print("\n=== CHECKING INTERNAL TXS ===")
        page.goto(f"https://etherscan.io/address/{WALLET}#internaltx", timeout=60000)
        page.wait_for_timeout(10000)
        
        # Get all text content to find internal txs
        content = page.content()
        
        # Look for the table data
        table_rows = page.locator('#ContentPlaceHolder1_divinternaltable table tbody tr').all()
        print(f"Found {len(table_rows)} internal tx rows")
        
        for row in table_rows[:10]:
            try:
                cells = row.locator('td').all()
                if cells:
                    row_data = [c.inner_text() for c in cells]
                    print(f"Internal tx: {row_data}")
            except:
                pass
        
        # Check normal transactions for any after block 24701231
        print("\n=== CHECKING LATEST TXS ===")
        page.goto(f"https://etherscan.io/txs?a={WALLET}&p=1", timeout=60000)
        page.wait_for_timeout(10000)
        
        # Look for transaction table
        tx_rows = page.locator('table tbody tr').all()
        print(f"Found {len(tx_rows)} tx rows")
        
        for row in tx_rows[:10]:
            try:
                cells = row.locator('td').all()
                if cells:
                    row_data = [c.inner_text() for c in cells]
                    print(f"Tx: {row_data[:4]}")  # First 4 columns
            except:
                pass
        
        # Check balance
        print("\n=== CURRENT BALANCE ===")
        page.goto(f"https://etherscan.io/address/{WALLET}", timeout=60000)
        page.wait_for_timeout(10000)
        
        # Look for balance
        balance_elem = page.locator('.card-body').first
        if balance_elem:
            print(f"Balance area: {balance_elem.inner_text()[:500]}")
        
        browser.close()
        print("\nDone!")

if __name__ == "__main__":
    main()
