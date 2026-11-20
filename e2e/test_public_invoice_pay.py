import os
import sys
import time
import json
from playwright.sync_api import sync_playwright

BASE_UI_URL = os.environ.get("BASE_UI_URL", "http://localhost:3000")
BASE_API_URL = os.environ.get("BASE_API_URL", "http://localhost:8080/api/v1")
SCREENSHOT_DIR = "/Users/egichandrapratama/Download/OCTO/OCTO-CRM/e2e/screenshots/public_pay"
DOCS_SCREENSHOT_DIR = "/Users/egichandrapratama/Download/OCTO/OCTO-CRM/docs/screenshots/public_pay"
RESULTS = []

os.makedirs(SCREENSHOT_DIR, exist_ok=True)
os.makedirs(DOCS_SCREENSHOT_DIR, exist_ok=True)

def record_result(step_name, status, duration_ms, details=None, screenshot=None):
    entry = {
        "step": step_name,
        "status": status,
        "duration_ms": duration_ms,
        "details": details or "",
        "screenshot": screenshot or ""
    }
    RESULTS.append(entry)
    symbol = "✓" if status == "PASSED" else "✗"
    print(f"  {symbol} {step_name} ({duration_ms} ms)")
    if details:
        print(f"     -> {details}")

def run():
    print("================================================================================")
    print("   OCTO-CRM PUBLIC INVOICE PAYMENT & PDF PRINT QRIS E2E TEST SUITE              ")
    print("   QA Automation Engineer: Quinn (BMAD Team)                                    ")
    print("================================================================================")
    t_start = time.time()

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, channel="chrome")
        
        # ----------------------------------------------------------------------
        # Scenario 1: External Client Unauthenticated Access (Unpaid Invoice)
        # ----------------------------------------------------------------------
        client_context = browser.new_context(
            viewport={"width": 1440, "height": 900},
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
        )
        client_page = client_context.new_page()

        t0 = time.time()
        try:
            target_url = f"{BASE_UI_URL}/pay/INV-202611-0001"
            client_page.goto(target_url, wait_until="networkidle")
            client_page.wait_for_selector("text=INV-202611-0001", timeout=12000)
            
            # Verify no login redirect
            assert "/login" not in client_page.url, f"Unexpected redirect: {client_page.url}"
            assert client_page.is_visible("text=PT OCTO Technologies Indonesia"), "Company header missing"
            assert client_page.is_visible("text=26.750.000"), "Invoice amount missing"

            # Check QRIS barcode image
            qris_img = client_page.wait_for_selector("img[alt*='QRIS']", timeout=8000)
            assert qris_img is not None, "QRIS barcode image not displayed"
            assert client_page.is_visible("text=Simpan Gambar Barcode ke Galeri HP"), "Download QR button missing"

            shot1 = os.path.join(SCREENSHOT_DIR, "01_public_pay_unpaid_qris.png")
            client_page.screenshot(path=shot1)
            client_page.screenshot(path=os.path.join(DOCS_SCREENSHOT_DIR, "01_public_pay_unpaid_qris.png"))
            record_result("Scenario 1: External Client Loads Public Pay Page (Unpaid QRIS)", "PASSED", int((time.time() - t0) * 1000),
                          details="Loaded without login, scannable QRIS displayed with Rp 26.750.000",
                          screenshot=shot1)
        except Exception as e:
            record_result("Scenario 1: External Client Loads Public Pay Page (Unpaid QRIS)", "FAILED", int((time.time() - t0) * 1000), details=str(e))

        # Scenario 1b: Switch to Bank Transfer tab
        t0 = time.time()
        try:
            bank_tab_btn = client_page.wait_for_selector("button:has-text('Transfer Rekening Bank PT')")
            bank_tab_btn.click()
            client_page.wait_for_selector("text=8905575356", timeout=5000)
            assert client_page.is_visible("text=Salin No. Rek"), "Copy account button missing"

            shot2 = os.path.join(SCREENSHOT_DIR, "02_public_pay_bank_transfer.png")
            client_page.screenshot(path=shot2)
            client_page.screenshot(path=os.path.join(DOCS_SCREENSHOT_DIR, "02_public_pay_bank_transfer.png"))
            record_result("Scenario 1b: Dual-Channel Tab Switch to Bank Transfer", "PASSED", int((time.time() - t0) * 1000),
                          details="Bank account number 8905575356 & copy button verified",
                          screenshot=shot2)
        except Exception as e:
            record_result("Scenario 1b: Dual-Channel Tab Switch to Bank Transfer", "FAILED", int((time.time() - t0) * 1000), details=str(e))

        # ----------------------------------------------------------------------
        # Scenario 2: External Client Viewing Settled/Paid Invoice
        # ----------------------------------------------------------------------
        t0 = time.time()
        try:
            target_paid_url = f"{BASE_UI_URL}/pay/INV-202611-4389"
            client_page.goto(target_paid_url, wait_until="networkidle")
            client_page.wait_for_selector("text=PEMBAYARAN TELAH BERHASIL DITERIMA!", timeout=10000)
            assert client_page.is_visible("text=INV-202611-4389"), "Invoice number missing on paid banner"
            assert client_page.is_visible("text=Cetak / Unduh Bukti Faktur Lunas (PDF)"), "Print receipt button missing"

            shot3 = os.path.join(SCREENSHOT_DIR, "03_public_pay_paid_settled.png")
            client_page.screenshot(path=shot3)
            client_page.screenshot(path=os.path.join(DOCS_SCREENSHOT_DIR, "03_public_pay_paid_settled.png"))
            record_result("Scenario 2: Public Payment Page Auto-Settlement Confirmation", "PASSED", int((time.time() - t0) * 1000),
                          details="Paid banner displayed with instant PDF receipt download option",
                          screenshot=shot3)
        except Exception as e:
            record_result("Scenario 2: Public Payment Page Auto-Settlement Confirmation", "FAILED", int((time.time() - t0) * 1000), details=str(e))

        client_context.close()

        # ----------------------------------------------------------------------
        # Scenario 3: Internal Sales Staff (CRM Dashboard & Print PDF)
        # ----------------------------------------------------------------------
        crm_context = browser.new_context(
            viewport={"width": 1440, "height": 900},
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
        )
        crm_page = crm_context.new_page()

        # Step 3a: Login Admin CRM
        t0 = time.time()
        try:
            crm_page.goto(f"{BASE_UI_URL}/login", wait_until="networkidle")
            crm_page.fill("input[type='email']", "budi@octocrm.id")
            crm_page.fill("input[type='password']", "password123")
            crm_page.click("button[type='submit']")
            crm_page.wait_for_function("() => window.location.pathname !== '/login'", timeout=12000)
            crm_page.wait_for_timeout(1000)
            record_result("Step 3a: Login Admin CRM", "PASSED", int((time.time() - t0) * 1000))
        except Exception as e:
            record_result("Step 3a: Login Admin CRM", "FAILED", int((time.time() - t0) * 1000), details=str(e))

        # Step 3b: Invoices List & Quick Copy Public Link
        t0 = time.time()
        try:
            crm_page.goto(f"{BASE_UI_URL}/invoices", wait_until="networkidle")
            crm_page.wait_for_selector("text=Penawaran, Invoice & Payment Gateway", timeout=12000)
            crm_page.wait_for_timeout(1000)

            # Check that "Salin Link Pembayaran Klien" icon button exists in actions
            copy_links = crm_page.query_selector_all("button[title*='Salin Link Pembayaran Klien']")
            assert len(copy_links) > 0, "Quick copy link button not found in invoices table"

            shot4 = os.path.join(SCREENSHOT_DIR, "04_crm_invoices_table_public_link.png")
            crm_page.screenshot(path=shot4)
            crm_page.screenshot(path=os.path.join(DOCS_SCREENSHOT_DIR, "04_crm_invoices_table_public_link.png"))
            record_result("Step 3b: CRM Invoices Table Action Icons", "PASSED", int((time.time() - t0) * 1000),
                          details=f"Found {len(copy_links)} invoice rows with quick copy client payment link",
                          screenshot=shot4)
        except Exception as e:
            record_result("Step 3b: CRM Invoices Table Action Icons", "FAILED", int((time.time() - t0) * 1000), details=str(e))

        # Step 3c: Open Invoice Detail / Print Modal & Verify Embedded QRIS Barcode Box
        t0 = time.time()
        try:
            # Click "Lihat / Cetak" for first available invoice in table
            detail_btn = crm_page.locator("button:has-text('Lihat / Cetak')").first
            detail_btn.wait_for(timeout=10000)
            detail_btn.click()
            crm_page.wait_for_selector("text=INSTRUKSI PEMBAYARAN RESMI PERUSAHAAN", timeout=6000)

            # Verify embedded QRIS stand barcode is present in the printable layout
            qris_img = crm_page.wait_for_selector("img[alt*='QRIS']", timeout=6000)
            assert qris_img is not None, "Embedded printable QRIS barcode missing in detail modal"

            # Verify Public Payment Link is visible in print layout
            assert crm_page.is_visible("text=Tautan Publik Klien:"), "Public client link missing in print layout"
            assert crm_page.is_visible("text=Salin Link Bayar Klien"), "Salin Link Bayar Klien button missing in modal footer"

            shot5 = os.path.join(SCREENSHOT_DIR, "05_crm_invoice_print_embedded_qris.png")
            crm_page.screenshot(path=shot5)
            crm_page.screenshot(path=os.path.join(DOCS_SCREENSHOT_DIR, "05_crm_invoice_print_embedded_qris.png"))
            record_result("Step 3c: Invoice Printable PDF Modal with Embedded QRIS Barcode", "PASSED", int((time.time() - t0) * 1000),
                          details="Embedded QRIS barcode stand and public pay link confirmed in printable layout",
                          screenshot=shot5)
        except Exception as e:
            record_result("Step 3c: Invoice Printable PDF Modal with Embedded QRIS Barcode", "FAILED", int((time.time() - t0) * 1000), details=str(e))

        crm_context.close()
        browser.close()

    total_time = round(time.time() - t_start, 2)
    passed_count = sum(1 for r in RESULTS if r["status"] == "PASSED")
    failed_count = sum(1 for r in RESULTS if r["status"] == "FAILED")
    
    print("\n--------------------------------------------------------------------------------")
    print(f"   SUMMARY: {passed_count} PASSED, {failed_count} FAILED (Total {total_time}s)")
    print("--------------------------------------------------------------------------------")

    with open("/Users/egichandrapratama/Download/OCTO/OCTO-CRM/e2e/public_pay_test_results.json", "w") as f:
        json.dump(RESULTS, f, indent=2)

if __name__ == "__main__":
    run()
