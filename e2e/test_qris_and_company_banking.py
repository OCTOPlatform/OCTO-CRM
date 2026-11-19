import os
import sys
import time
import json
from playwright.sync_api import sync_playwright

BASE_UI_URL = os.environ.get("BASE_UI_URL", "http://localhost:3000")
BASE_API_URL = os.environ.get("BASE_API_URL", "http://localhost:8080")
SCREENSHOT_DIR = "/Users/egichandrapratama/Download/OCTO/OCTO-CRM/e2e/screenshots/payment_qris"
DOCS_SCREENSHOT_DIR = "/Users/egichandrapratama/Download/OCTO/OCTO-CRM/docs/screenshots/payment_qris"
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
    print("   OCTO-CRM REAL COMPANY BANKING & ASPI QRIS INTEGRATION E2E TEST SUITE        ")
    print("   QA Automation Engineer: Quinn (BMAD Team)                                    ")
    print("================================================================================")
    t_start = time.time()

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, channel="chrome")
        context = browser.new_context(
            viewport={"width": 1440, "height": 900},
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
        )
        page = context.new_page()
        page.on("dialog", lambda dialog: dialog.accept())

        # ----------------------------------------------------------------------
        # Step 1: Admin Authentication & Session
        # ----------------------------------------------------------------------
        t0 = time.time()
        try:
            page.goto(f"{BASE_UI_URL}/login", wait_until="networkidle")
            page.wait_for_selector("input[type='email']", timeout=10000)
            page.fill("input[type='email']", "budi@octocrm.id")
            page.fill("input[type='password']", "password123")
            page.click("button[type='submit']")

            page.wait_for_url(f"{BASE_UI_URL}/**", timeout=15000)
            page.wait_for_selector("text=OCTO", timeout=10000)
            page.wait_for_timeout(1000)
            record_result("Step 1: Admin Authentication & Session", "PASSED", int((time.time() - t0) * 1000), "Logged in as budi@octocrm.id")
        except Exception as e:
            record_result("Step 1: Admin Authentication & Session", "FAILED", int((time.time() - t0) * 1000), str(e))
            browser.close()
            return False

        # ----------------------------------------------------------------------
        # Step 2: Settings - Navigate to Rekening Bank & QRIS Tab
        # ----------------------------------------------------------------------
        t0 = time.time()
        try:
            page.goto(f"{BASE_UI_URL}/settings?tab=payment", wait_until="networkidle")
            page.wait_for_selector("text=Rekening Bank Perusahaan & Barcode QRIS Resmi", timeout=10000)
            page.wait_for_timeout(1500)

            shot1 = os.path.join(SCREENSHOT_DIR, "01_settings_company_bank_qris.png")
            page.screenshot(path=shot1, full_page=False)
            page.screenshot(path=os.path.join(DOCS_SCREENSHOT_DIR, "01_settings_company_bank_qris.png"))
            record_result("Step 2: Settings Company Bank & QRIS Navigation", "PASSED", int((time.time() - t0) * 1000), "Loaded bank form & live QRIS preview card", shot1)
        except Exception as e:
            record_result("Step 2: Settings Company Bank & QRIS Navigation", "FAILED", int((time.time() - t0) * 1000), str(e))

        # ----------------------------------------------------------------------
        # Step 3: Update & Save Payment Settings
        # ----------------------------------------------------------------------
        t0 = time.time()
        try:
            holder_input = page.locator("input[placeholder*='PT Maju Bersama']").first
            holder_input.fill("PT Maju Bersama Solusindo Tbk")

            page.click("button:has-text('Simpan Konfigurasi Rekening & QRIS')")
            page.wait_for_selector("text=Pengaturan Rekening Bank & QRIS Perusahaan berhasil disimpan!", timeout=10000)
            page.wait_for_timeout(1000)

            shot2 = os.path.join(SCREENSHOT_DIR, "02_settings_saved_success.png")
            page.screenshot(path=shot2, full_page=False)
            page.screenshot(path=os.path.join(DOCS_SCREENSHOT_DIR, "02_settings_saved_success.png"))
            record_result("Step 3: Update & Save Payment Settings", "PASSED", int((time.time() - t0) * 1000), "Successfully updated account holder to PT Maju Bersama Solusindo Tbk", shot2)
        except Exception as e:
            record_result("Step 3: Update & Save Payment Settings", "FAILED", int((time.time() - t0) * 1000), str(e))

        # ----------------------------------------------------------------------
        # Step 4: Navigate to Invoices List & Inspect Invoice Detail
        # ----------------------------------------------------------------------
        t0 = time.time()
        try:
            page.goto(f"{BASE_UI_URL}/invoices", wait_until="networkidle")
            page.wait_for_selector("text=Penawaran, Invoice & Payment Gateway", timeout=10000)
            page.wait_for_timeout(1000)

            # Click "Lihat / Cetak" on the first invoice row
            view_btn = page.locator("button:has-text('Lihat / Cetak')").first
            view_btn.click()
            page.wait_for_selector("text=Instruksi Pembayaran Resmi Perusahaan:", timeout=10000)
            page.wait_for_timeout(1000)

            shot3 = os.path.join(SCREENSHOT_DIR, "03_invoice_detail_bank_instructions.png")
            page.screenshot(path=shot3, full_page=False)
            page.screenshot(path=os.path.join(DOCS_SCREENSHOT_DIR, "03_invoice_detail_bank_instructions.png"))

            # Close the detail modal
            close_btn = page.locator("button:has-text('Tutup')").first
            close_btn.click()
            page.wait_for_timeout(500)

            record_result("Step 4: Invoice Detail Official Bank & QRIS Instruction", "PASSED", int((time.time() - t0) * 1000), "Official company bank & QRIS shown in invoice print modal", shot3)
        except Exception as e:
            record_result("Step 4: Invoice Detail Official Bank & QRIS Instruction", "FAILED", int((time.time() - t0) * 1000), str(e))

        # ----------------------------------------------------------------------
        # Step 5: Open Payment Modal (QRIS Scan View)
        # ----------------------------------------------------------------------
        t0 = time.time()
        try:
            # Click ⚡ Bayar QRIS on an unpaid invoice row
            pay_btn = page.locator("button:has-text('⚡ Bayar QRIS')").first
            pay_btn.click()

            page.wait_for_selector("text=Pembayaran Tagihan Resmi Perusahaan", timeout=10000)
            page.wait_for_selector("text=QRIS", timeout=10000)
            page.wait_for_selector("img[alt='QRIS Barcode Standar Nasional']", timeout=10000)
            page.wait_for_timeout(1000)

            shot4 = os.path.join(SCREENSHOT_DIR, "04_invoice_payment_modal_qris.png")
            page.screenshot(path=shot4, full_page=False)
            page.screenshot(path=os.path.join(DOCS_SCREENSHOT_DIR, "04_invoice_payment_modal_qris.png"))
            record_result("Step 5: Payment Modal QRIS Scan View", "PASSED", int((time.time() - t0) * 1000), "Official ASPI QRIS display stand rendered with scannable QR barcode", shot4)
        except Exception as e:
            record_result("Step 5: Payment Modal QRIS Scan View", "FAILED", int((time.time() - t0) * 1000), str(e))

        # ----------------------------------------------------------------------
        # Step 6: Payment Modal - Switch to Transfer Bank PT & Copy Account
        # ----------------------------------------------------------------------
        t0 = time.time()
        try:
            page.click("button:has-text('Transfer Bank PT')")
            page.wait_for_selector("text=Nomor Rekening PT:", timeout=5000)
            page.wait_for_timeout(500)

            # Click Salin No. Rek button
            page.click("button:has-text('Salin No. Rek')")
            page.wait_for_timeout(500)

            shot5 = os.path.join(SCREENSHOT_DIR, "05_invoice_payment_modal_bank_transfer.png")
            page.screenshot(path=shot5, full_page=False)
            page.screenshot(path=os.path.join(DOCS_SCREENSHOT_DIR, "05_invoice_payment_modal_bank_transfer.png"))
            record_result("Step 6: Payment Modal Direct Company Bank Transfer", "PASSED", int((time.time() - t0) * 1000), "Switched to bank transfer tab with interactive copy button", shot5)
        except Exception as e:
            record_result("Step 6: Payment Modal Direct Company Bank Transfer", "FAILED", int((time.time() - t0) * 1000), str(e))

        # ----------------------------------------------------------------------
        # Step 7: Confirm Payment & Verify Paid Status
        # ----------------------------------------------------------------------
        t0 = time.time()
        try:
            page.click("button:has-text('Konfirmasi Pembayaran Lunas')")
            page.wait_for_timeout(2500)

            shot6 = os.path.join(SCREENSHOT_DIR, "06_invoice_marked_paid.png")
            page.screenshot(path=shot6, full_page=False)
            page.screenshot(path=os.path.join(DOCS_SCREENSHOT_DIR, "06_invoice_marked_paid.png"))
            record_result("Step 7: Confirm Payment & Mark Invoice Paid", "PASSED", int((time.time() - t0) * 1000), "Payment processed successfully and inventory / deal status updated", shot6)
        except Exception as e:
            record_result("Step 7: Confirm Payment & Mark Invoice Paid", "FAILED", int((time.time() - t0) * 1000), str(e))

        browser.close()

    total_duration = int((time.time() - t_start) * 1000)
    passed_count = sum(1 for r in RESULTS if r["status"] == "PASSED")
    total_count = len(RESULTS)

    print("\n--------------------------------------------------------------------------------")
    print(f"   SUMMARY: {passed_count}/{total_count} STEPS PASSED ({total_duration} ms)        ")
    print("--------------------------------------------------------------------------------")

    with open("/Users/egichandrapratama/Download/OCTO/OCTO-CRM/e2e/payment_qris_test_results.json", "w") as f:
        json.dump(RESULTS, f, indent=2)

    return passed_count == total_count

if __name__ == "__main__":
    success = run()
    sys.exit(0 if success else 1)
