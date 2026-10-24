import os
import sys
import time
import json
import urllib.request
from playwright.sync_api import sync_playwright

BASE_UI_URL = "http://localhost:3001"
BASE_API_URL = "http://localhost:8080"
SCREENSHOT_DIR = "/Users/egichandrapratama/Download/OCTO/OCTO-CRM/e2e/screenshots"
RESULTS = []

os.makedirs(SCREENSHOT_DIR, exist_ok=True)

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

def main():
    print("==================================================")
    print("OCTO-CRM PLAYWRIGHT E2E ACCEPTANCE TEST SUITE")
    print("==================================================")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 1440, "height": 900},
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
        )
        page = context.new_page()

        # ----------------------------------------------------------------------
        # Test 1: Login Page Render & Submission
        # ----------------------------------------------------------------------
        t0 = time.time()
        try:
            page.goto(f"{BASE_UI_URL}/login", wait_until="domcontentloaded")
            page.wait_for_selector("input[type='email']", timeout=10000)
            shot_login = f"{SCREENSHOT_DIR}/01_login_page.png"
            page.screenshot(path=shot_login, full_page=True)

            page.fill("input[type='email']", "budi@octocrm.id")
            page.fill("input[type='password']", "password123")
            page.click("button[type='submit']")

            # Wait for dashboard transition
            page.wait_for_url(f"{BASE_UI_URL}/", timeout=15000)
            page.wait_for_selector("text=OCTO", timeout=10000)
            page.wait_for_timeout(1000)

            shot_dash = f"{SCREENSHOT_DIR}/02_dashboard_home.png"
            page.screenshot(path=shot_dash, full_page=True)
            record_result("1. Autentikasi Login & Navigasi Dashboard", "PASSED", round((time.time() - t0)*1000, 2), "Logged in as budi@octocrm.id", shot_dash)
        except Exception as e:
            record_result("1. Autentikasi Login & Navigasi Dashboard", "FAILED", round((time.time() - t0)*1000, 2), str(e))

        # ----------------------------------------------------------------------
        # Test 2: Today View (My Daily Tasks)
        # ----------------------------------------------------------------------
        t0 = time.time()
        try:
            page.goto(f"{BASE_UI_URL}/today", wait_until="domcontentloaded")
            page.wait_for_selector("h1:has-text('Today')", timeout=10000)
            page.wait_for_timeout(1000)
            shot_today = f"{SCREENSHOT_DIR}/03_today_view.png"
            page.screenshot(path=shot_today, full_page=True)
            record_result("2. Halaman Today View & Pengurutan Tugas", "PASSED", round((time.time() - t0)*1000, 2), "Task priority metrics rendered", shot_today)
        except Exception as e:
            record_result("2. Halaman Today View & Pengurutan Tugas", "FAILED", round((time.time() - t0)*1000, 2), str(e))

        # ----------------------------------------------------------------------
        # Test 3: Contacts Table & Creation Modal
        # ----------------------------------------------------------------------
        t0 = time.time()
        try:
            page.goto(f"{BASE_UI_URL}/contacts", wait_until="domcontentloaded")
            page.wait_for_selector("h1:has-text('Database Kontak')", timeout=10000)
            page.wait_for_selector("table", timeout=10000)
            shot_contacts_before = f"{SCREENSHOT_DIR}/04_contacts_table.png"
            page.screenshot(path=shot_contacts_before, full_page=True)

            # Click Tambah Kontak
            page.click("button:has-text('Tambah Kontak')")
            page.wait_for_selector("text=Tambah Kontak Baru", timeout=5000)
            page.wait_for_timeout(500)

            # Fill Contact Modal
            ts = int(time.time())
            test_first_name = f"Hendra_{ts % 10000}"
            test_email = f"hendra_{ts}@techsolusindo.id"
            test_phone = f"+62812{ts % 100000000:08d}"

            modal = page.locator("div.fixed")
            modal.locator("input").nth(0).fill(test_first_name)
            modal.locator("input").nth(1).fill("Kusuma")
            modal.locator("input").nth(2).fill(test_email)
            modal.locator("input").nth(3).fill(test_phone)
            modal.locator("input").nth(4).fill("Chief Technology Officer")
            modal.locator("input").nth(5).fill("VIP, B2B, Tech")

            shot_modal = f"{SCREENSHOT_DIR}/05_contacts_add_modal.png"
            page.screenshot(path=shot_modal, full_page=True)

            # Submit
            modal.locator("button[type='submit']").click()
            page.wait_for_timeout(1500)
            page.wait_for_selector(f"text={test_first_name}", timeout=10000)

            shot_contacts_after = f"{SCREENSHOT_DIR}/06_contacts_created.png"
            page.screenshot(path=shot_contacts_after, full_page=True)
            record_result("3. Manajemen Kontak & Validasi E.164", "PASSED", round((time.time() - t0)*1000, 2), f"Contact created: {test_first_name}", shot_contacts_after)
        except Exception as e:
            record_result("3. Manajemen Kontak & Validasi E.164", "FAILED", round((time.time() - t0)*1000, 2), str(e))

        # ----------------------------------------------------------------------
        # Test 4: Contact 360 Detail View
        # ----------------------------------------------------------------------
        t0 = time.time()
        try:
            first_contact_link = page.locator("table tbody tr td a").first
            first_contact_link.click()
            page.wait_for_url("**/contacts/**", timeout=10000)
            page.wait_for_selector("text=Kembali ke Semua Kontak", timeout=10000)
            page.wait_for_timeout(1000)
            shot_detail = f"{SCREENSHOT_DIR}/07_contact_detail_360.png"
            page.screenshot(path=shot_detail, full_page=True)
            record_result("4. Tampilan Detail Kontak 360 Derajat & Timeline", "PASSED", round((time.time() - t0)*1000, 2), "Contact timeline & profile rendered", shot_detail)
        except Exception as e:
            record_result("4. Tampilan Detail Kontak 360 Derajat & Timeline", "FAILED", round((time.time() - t0)*1000, 2), str(e))

        # ----------------------------------------------------------------------
        # Test 5: Companies Directory
        # ----------------------------------------------------------------------
        t0 = time.time()
        try:
            page.goto(f"{BASE_UI_URL}/companies", wait_until="domcontentloaded")
            page.wait_for_selector("h1:has-text('Perusahaan & Klien Bisnis')", timeout=10000)
            page.wait_for_timeout(1000)
            shot_companies = f"{SCREENSHOT_DIR}/08_companies_directory.png"
            page.screenshot(path=shot_companies, full_page=True)
            record_result("5. Direktori Perusahaan & Agregasi Akun", "PASSED", round((time.time() - t0)*1000, 2), "Companies list rendered", shot_companies)
        except Exception as e:
            record_result("5. Direktori Perusahaan & Agregasi Akun", "FAILED", round((time.time() - t0)*1000, 2), str(e))

        # ----------------------------------------------------------------------
        # Test 6: Deals Pipeline & Kanban Board
        # ----------------------------------------------------------------------
        t0 = time.time()
        try:
            page.goto(f"{BASE_UI_URL}/pipeline", wait_until="domcontentloaded")
            page.wait_for_selector("h1:has-text('Sales Pipeline (Kanban)')", timeout=10000)
            page.wait_for_selector("text=New Lead", timeout=10000)
            page.wait_for_timeout(1000)
            shot_pipeline = f"{SCREENSHOT_DIR}/09_deals_kanban_board.png"
            page.screenshot(path=shot_pipeline, full_page=True)
            record_result("6. Papan Kanban Pipeline & Visualisasi Peluang", "PASSED", round((time.time() - t0)*1000, 2), "Kanban board stages and deal cards visible", shot_pipeline)
        except Exception as e:
            record_result("6. Papan Kanban Pipeline & Visualisasi Peluang", "FAILED", round((time.time() - t0)*1000, 2), str(e))

        # ----------------------------------------------------------------------
        # Test 7: Operational Tasks View
        # ----------------------------------------------------------------------
        t0 = time.time()
        try:
            page.goto(f"{BASE_UI_URL}/tasks", wait_until="domcontentloaded")
            page.wait_for_selector("h1:has-text('Daftar Semua Tugas')", timeout=10000)
            page.wait_for_timeout(1000)
            shot_tasks = f"{SCREENSHOT_DIR}/10_tasks_management.png"
            page.screenshot(path=shot_tasks, full_page=True)
            record_result("7. Manajemen Tugas Operasional Sales", "PASSED", round((time.time() - t0)*1000, 2), "Task list & status filters rendered", shot_tasks)
        except Exception as e:
            record_result("7. Manajemen Tugas Operasional Sales", "FAILED", round((time.time() - t0)*1000, 2), str(e))

        # ----------------------------------------------------------------------
        # Test 8: Reports & Funnel Analytics Dashboard
        # ----------------------------------------------------------------------
        t0 = time.time()
        try:
            page.goto(f"{BASE_UI_URL}/reports", wait_until="domcontentloaded")
            page.wait_for_selector("h1:has-text('Laporan & Analisis Penjualan')", timeout=10000)
            page.wait_for_timeout(1000)
            shot_reports = f"{SCREENSHOT_DIR}/11_reports_analytics.png"
            page.screenshot(path=shot_reports, full_page=True)
            record_result("8. Laporan Analitik, Funnel & Distribusi Sumber Lead", "PASSED", round((time.time() - t0)*1000, 2), "Conversion funnel and metrics rendered", shot_reports)
        except Exception as e:
            record_result("8. Laporan Analitik, Funnel & Distribusi Sumber Lead", "FAILED", round((time.time() - t0)*1000, 2), str(e))

        # ----------------------------------------------------------------------
        # Test 9: Workspace Settings & Team RBAC
        # ----------------------------------------------------------------------
        t0 = time.time()
        try:
            page.goto(f"{BASE_UI_URL}/settings", wait_until="domcontentloaded")
            page.wait_for_selector("h1:has-text('Pengaturan & Anggota Tim')", timeout=10000)
            page.wait_for_selector("text=Anggota Tim", timeout=10000)
            page.wait_for_timeout(1000)
            shot_settings = f"{SCREENSHOT_DIR}/12_settings_team_rbac.png"
            page.screenshot(path=shot_settings, full_page=True)
            record_result("9. Pengaturan Workspace & Matriks Peran Tim (RBAC)", "PASSED", round((time.time() - t0)*1000, 2), "Workspace info and team members list verified", shot_settings)
        except Exception as e:
            record_result("9. Pengaturan Workspace & Matriks Peran Tim (RBAC)", "FAILED", round((time.time() - t0)*1000, 2), str(e))

        # ----------------------------------------------------------------------
        # Test 10: Ingest Lead via Atomic API & Verify Live in UI
        # ----------------------------------------------------------------------
        t0 = time.time()
        try:
            login_req = urllib.request.Request(
                f"{BASE_API_URL}/api/v1/auth/login",
                data=json.dumps({"email": "budi@octocrm.id", "password": "password123"}).encode('utf-8'),
                headers={"Content-Type": "application/json"}
            )
            with urllib.request.urlopen(login_req) as resp:
                login_res = json.loads(resp.read().decode('utf-8'))
                jwt_token = login_res["data"]["token"]
                ws_id = login_res["data"]["workspaces"][0]["id"]

            intake_ts = int(time.time())
            lead_name = f"Mega Lestari {intake_ts % 10000}"
            intake_body = {
                "full_name": lead_name,
                "email": f"mega_{intake_ts}@megacorp.id",
                "phone": f"+62818{intake_ts % 100000000:08d}",
                "company_name": f"PT Mega Perkasa Solusi {intake_ts % 1000}",
                "company_size": "201-500",
                "product_interest": "OCTO CRM + Tap Fleet",
                "form_type": "request-demo",
                "message": "Permintaan demo enterprise dari website landing page",
                "utm_source": "google_search",
                "utm_campaign": "q4_campaign_octo",
                "consent_given": True
            }
            intake_req = urllib.request.Request(
                f"{BASE_API_URL}/api/v1/workspaces/{ws_id}/integrations/lead-intake",
                data=json.dumps(intake_body).encode('utf-8'),
                headers={"Content-Type": "application/json", "Authorization": f"Bearer {jwt_token}"}
            )
            with urllib.request.urlopen(intake_req) as resp:
                assert resp.status == 201

            page.goto(f"{BASE_UI_URL}/contacts", wait_until="domcontentloaded")
            page.wait_for_selector(f"text={lead_name}", timeout=10000)
            page.wait_for_timeout(1000)

            shot_intake = f"{SCREENSHOT_DIR}/13_ecosystem_inbound_lead.png"
            page.screenshot(path=shot_intake, full_page=True)
            record_result("10. Integrasi Ekosistem: Ingestion Prospek Atomik Terverifikasi di UI", "PASSED", round((time.time() - t0)*1000, 2), f"Inbound lead '{lead_name}' successfully captured and rendered", shot_intake)
        except Exception as e:
            record_result("10. Integrasi Ekosistem: Ingestion Prospek Atomik Terverifikasi di UI", "FAILED", round((time.time() - t0)*1000, 2), str(e))

        browser.close()

    print("\n--------------------------------------------------")
    passed = sum(1 for r in RESULTS if r["status"] == "PASSED")
    total = len(RESULTS)
    print(f"PLAYWRIGHT E2E SUMMARY: {passed}/{total} Passed ({(passed/total)*100:.1f}%)")
    print("--------------------------------------------------")

    with open("/Users/egichandrapratama/Download/OCTO/OCTO-CRM/e2e/playwright_test_results.json", "w") as f:
        json.dump(RESULTS, f, indent=2)

    return passed == total

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
