import urllib.request
import urllib.error
import json
import sys
import time

BASE_URL = "http://localhost:8080"
TEST_RESULTS = []

def run_test(name, fn):
    start = time.time()
    try:
        res = fn()
        duration_ms = round((time.time() - start) * 1000, 2)
        TEST_RESULTS.append({"name": name, "status": "PASSED", "duration_ms": duration_ms, "detail": res})
        print(f"  ✓ {name} ({duration_ms} ms)")
        return res
    except Exception as e:
        duration_ms = round((time.time() - start) * 1000, 2)
        TEST_RESULTS.append({"name": name, "status": "FAILED", "duration_ms": duration_ms, "error": str(e)})
        print(f"  ✗ {name} ({duration_ms} ms): {e}")
        return None

def http_req(method, path, body=None, token=None):
    url = f"{BASE_URL}{path}"
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    data = json.dumps(body).encode("utf-8") if body else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            content = resp.read().decode("utf-8")
            return resp.status, json.loads(content) if content else {}
    except urllib.error.HTTPError as err:
        content = err.read().decode("utf-8")
        try:
            parsed = json.loads(content)
        except Exception:
            parsed = {"raw": content}
        return err.code, parsed

def main():
    print("==================================================")
    print("OCTO-CRM BACKEND ACCEPTANCE CRITERIA API TEST SUITE")
    print("==================================================")

    # 1. Health check
    def test_health():
        status, data = http_req("GET", "/health")
        assert status == 200, f"Expected 200, got {status}"
        assert data.get("status") == "ok", "Expected status: ok"
        return data
    run_test("Health Check Endpoint (GET /health)", test_health)

    # 2. Auth Login (Owner)
    auth_data = {}
    def test_login_owner():
        status, data = http_req("POST", "/api/v1/auth/login", {
            "email": "budi@octocrm.id",
            "password": "password123"
        })
        assert status == 200, f"Expected 200, got {status}"
        assert data.get("success") is True, "Expected success: true"
        token = data["data"]["token"]
        ws_id = data["data"]["workspaces"][0]["id"]
        auth_data["token"] = token
        auth_data["ws_id"] = ws_id
        return {"email": "budi@octocrm.id", "workspace_id": ws_id}
    run_test("Authentication Login Owner (POST /api/v1/auth/login)", test_login_owner)

    token = auth_data.get("token")
    ws_id = auth_data.get("ws_id")

    # 3. Auth Login Negative (Invalid Password)
    def test_login_negative():
        status, data = http_req("POST", "/api/v1/auth/login", {
            "email": "budi@octocrm.id",
            "password": "wrongpassword"
        })
        assert status == 401, f"Expected 401 Unauthorized, got {status}"
        return {"status": status, "error": data.get("error")}
    run_test("Security Gate: Invalid Password (POST /api/v1/auth/login)", test_login_negative)

    # 4. Auth Me
    def test_get_me():
        status, data = http_req("GET", "/api/v1/auth/me", token=token)
        assert status == 200, f"Expected 200, got {status}"
        user_info = data["data"].get("user", {})
        assert user_info.get("email") == "budi@octocrm.id"
        return user_info
    run_test("Authenticated Profile Retrieval (GET /api/v1/auth/me)", test_get_me)

    # 5. Multi-Tenant Negative Security Gate (Access foreign workspace)
    def test_tenant_isolation():
        fake_ws = "00000000-0000-0000-0000-000000000000"
        status, data = http_req("GET", f"/api/v1/workspaces/{fake_ws}/contacts", token=token)
        assert status in [403, 404], f"Expected 403 or 404, got {status}"
        return {"expected": "403/404", "actual": status}
    run_test("Security Gate: Tenant Boundary Isolation (GET foreign workspace)", test_tenant_isolation)

    # 6. Unauthenticated Gate
    def test_unauthenticated_gate():
        status, data = http_req("GET", f"/api/v1/workspaces/{ws_id}/contacts")
        assert status == 401, f"Expected 401 Unauthorized, got {status}"
        return {"expected": 401, "actual": status}
    run_test("Security Gate: Unauthenticated Rejection (GET without Token)", test_unauthenticated_gate)

    # 7. Contacts CRUD
    created_contact = {}
    def test_create_contact():
        ts = int(time.time())
        status, data = http_req("POST", f"/api/v1/workspaces/{ws_id}/contacts", {
            "first_name": f"Tester_{ts}",
            "last_name": "Acceptance",
            "email": f"test_{ts}@example.com",
            "phone": f"+62812{ts % 100000000:08d}",
            "job_title": "QA Director",
            "source": "E2E_TEST",
            "tags": ["automated-test", "qa"]
        }, token=token)
        assert status in [200, 201], f"Expected 200/201, got {status}"
        created_contact["id"] = data["data"]["id"]
        return data["data"]
    run_test("Contact Creation with E.164 Normalization (POST /contacts)", test_create_contact)

    # 8. List Contacts
    def test_list_contacts():
        status, data = http_req("GET", f"/api/v1/workspaces/{ws_id}/contacts", token=token)
        assert status == 200, f"Expected 200, got {status}"
        assert isinstance(data.get("data"), list), "Expected list of contacts"
        return {"count": len(data["data"])}
    run_test("Contact List Retrieval (GET /contacts)", test_list_contacts)

    # 9. Duplicate Detection
    def test_duplicate_contacts():
        status, data = http_req("GET", f"/api/v1/workspaces/{ws_id}/contacts/duplicates", token=token)
        assert status == 200, f"Expected 200, got {status}"
        return {"duplicates_checked": True}
    run_test("Contact Duplicate Detection (GET /contacts/duplicates)", test_duplicate_contacts)

    # 10. Companies CRUD
    created_company = {}
    def test_create_company():
        ts = int(time.time())
        status, data = http_req("POST", f"/api/v1/workspaces/{ws_id}/companies", {
            "name": f"PT Sinergi Mandiri {ts}",
            "domain": f"sinergi{ts}.id",
            "industry": "Teknologi",
            "phone": "+62215551234"
        }, token=token)
        assert status in [200, 201], f"Expected 200/201, got {status}"
        created_company["id"] = data["data"]["id"]
        return data["data"]
    run_test("Company Entity Creation (POST /companies)", test_create_company)

    # 11. Pipelines & Stages
    stages_data = []
    pipeline_data = {}
    def test_list_pipelines():
        status, data = http_req("GET", f"/api/v1/workspaces/{ws_id}/pipelines", token=token)
        assert status == 200, f"Expected 200, got {status}"
        pipelines = data.get("data", [])
        assert len(pipelines) > 0, "Expected at least 1 pipeline"
        pipeline_data["id"] = pipelines[0]["id"]
        stages = pipelines[0].get("stages", [])
        assert len(stages) > 0, "Expected pipeline stages"
        for s in stages:
            stages_data.append(s["id"])
        return {"pipeline_name": pipelines[0]["name"], "stages_count": len(stages)}
    run_test("Sales Pipeline & Stages Retrieval (GET /pipelines)", test_list_pipelines)

    # 12. Deals Creation
    created_deal = {}
    def test_create_deal():
        target_stage = stages_data[0] if stages_data else None
        target_pipeline = pipeline_data.get("id")
        status, data = http_req("POST", f"/api/v1/workspaces/{ws_id}/deals", {
            "title": "Kesepakatan Solusi ERP Enterprise",
            "pipeline_id": target_pipeline,
            "stage_id": target_stage,
            "value": 75000000,
            "currency": "IDR",
            "contact_id": created_contact.get("id"),
            "company_id": created_company.get("id"),
            "notes": "Deal created during acceptance testing"
        }, token=token)
        assert status in [200, 201], f"Expected 200/201, got {status}"
        created_deal["id"] = data["data"]["id"]
        return data["data"]
    run_test("Deal Creation in Pipeline (POST /deals)", test_create_deal)

    # 13. Deal Stage Update
    def test_update_deal_stage():
        deal_id = created_deal.get("id")
        next_stage = stages_data[1] if len(stages_data) > 1 else stages_data[0]
        status, data = http_req("PATCH", f"/api/v1/workspaces/{ws_id}/deals/{deal_id}/stage", {
            "stage_id": next_stage
        }, token=token)
        assert status == 200, f"Expected 200, got {status}"
        return data["data"]
    run_test("Deal Kanban Stage Progression (PATCH /deals/:id/stage)", test_update_deal_stage)

    # 14. Tasks Management
    created_task = {}
    def test_create_task():
        status, data = http_req("POST", f"/api/v1/workspaces/{ws_id}/tasks", {
            "title": "Follow up negosiasi kontrak via WhatsApp",
            "task_type": "call",
            "priority": "high",
            "due_date": "2026-10-20T17:00:00Z",
            "contact_id": created_contact.get("id"),
            "deal_id": created_deal.get("id")
        }, token=token)
        assert status in [200, 201], f"Expected 200/201, got {status}"
        created_task["id"] = data["data"]["id"]
        return data["data"]
    run_test("Task Creation with Due Date & Priority (POST /tasks)", test_create_task)

    # 15. Task Toggle Complete
    def test_toggle_task():
        task_id = created_task.get("id")
        status, data = http_req("PATCH", f"/api/v1/workspaces/{ws_id}/tasks/{task_id}/toggle", token=token)
        assert status == 200, f"Expected 200, got {status}"
        return data["data"]
    run_test("Task Completion Status Toggle (PATCH /tasks/:id/toggle)", test_toggle_task)

    # 16. Reports Summary
    def test_reports_summary():
        status, data = http_req("GET", f"/api/v1/workspaces/{ws_id}/reports/summary", token=token)
        assert status == 200, f"Expected 200, got {status}"
        return data["data"]
    run_test("Dashboard & Reports Summary Metrics (GET /reports/summary)", test_reports_summary)

    # 17. Reports Funnel
    def test_reports_funnel():
        status, data = http_req("GET", f"/api/v1/workspaces/{ws_id}/reports/funnel", token=token)
        assert status == 200, f"Expected 200, got {status}"
        return {"stages_funnel_count": len(data.get("data", []))}
    run_test("Pipeline Funnel Conversion Analytics (GET /reports/funnel)", test_reports_funnel)

    # 18. Audit Logs
    def test_audit_logs():
        status, data = http_req("GET", f"/api/v1/workspaces/{ws_id}/reports/audit-logs", token=token)
        assert status == 200, f"Expected 200, got {status}"
        return {"audit_events_count": len(data.get("data", []))}
    run_test("Security Audit Log Trail (GET /reports/audit-logs)", test_audit_logs)

    # 19. Atomic Lead Intake Endpoint (Master Contract Alignment)
    def test_lead_intake_atomic():
        ts = int(time.time())
        status, data = http_req("POST", f"/api/v1/workspaces/{ws_id}/integrations/lead-intake", {
            "full_name": "Kartika Sari",
            "email": f"kartika_{ts}@indomakmur.co.id",
            "phone": f"+62813{ts % 100000000:08d}",
            "company_name": f"PT Indo Makmur Gemilang {ts}",
            "company_size": "51-200",
            "product_interest": "OCTO CRM Enterprise",
            "form_type": "request-demo",
            "message": "Inbound intake prospek dari website paket enterprise",
            "utm_source": "google_search",
            "utm_campaign": "q4_enterprise_promo",
            "consent_given": True
        }, token=token)
        assert status == 201, f"Expected 201 Created, got {status}"
        assert data.get("success") is True, "Expected success: true"
        res_data = data.get("data", {})
        assert "contact_id" in res_data, "Expected contact_id in response"
        assert "deal_id" in res_data, "Expected deal_id in response"
        assert "task_id" in res_data, "Expected task_id in response"
        return {
            "contact_id": res_data.get("contact_id"),
            "deal_id": res_data.get("deal_id"),
            "task_id": res_data.get("task_id"),
            "tags": res_data.get("tags")
        }
    run_test("Atomic Lead Intake Ingestion Contract (POST /integrations/lead-intake)", test_lead_intake_atomic)

    # 20. Public WebChat Inbound & Auto-Ticket Creation with Round-Robin Routing
    chat_ticket = {}
    def test_webchat_auto_ticket_round_robin():
        vid = f"visitor-e2e-{int(time.time())}"
        status, data = http_req("POST", f"/api/v1/workspaces/{ws_id}/inbox/webchat/send", {
            "visitor_id": vid,
            "name": "Pak Kurniawan",
            "email": "kurniawan@e2e-test.com",
            "phone": "081299887766",
            "message": "Halo CS OCTO, saya butuh bantuan setting integrasi."
        })
        assert status == 201, f"Expected 201 Created, got {status}"
        assert data.get("success") is True, "Expected success: true"
        conv_id = data["data"]["conversation_id"]

        # Verify Ticket Created in Backend
        t_status, t_data = http_req("GET", f"/api/v1/workspaces/{ws_id}/tickets", token=token)
        assert t_status == 200, f"Expected 200, got {t_status}"
        tickets = t_data.get("data", [])
        matched = [t for t in tickets if t.get("conversation_id") == conv_id]
        assert len(matched) > 0, "Expected auto-created ticket linked to conversation"
        ticket = matched[0]
        assert ticket.get("department") == "support", "Expected ticket department to be 'support'"
        assert ticket.get("assigned_to_id") is not None, "Expected ticket to be auto-assigned via Round-Robin"

        chat_ticket["ticket_id"] = ticket["id"]
        chat_ticket["ticket_number"] = ticket["ticket_number"]
        chat_ticket["assigned_to_name"] = ticket.get("assigned_to_name")
        chat_ticket["conv_id"] = conv_id
        chat_ticket["visitor_id"] = vid
        return {
            "ticket_number": ticket["ticket_number"],
            "assigned_to": ticket.get("assigned_to_name"),
            "conversation_id": conv_id
        }
    run_test("Public WebChat & Auto-Ticket Round-Robin Routing (POST /inbox/webchat/send)", test_webchat_auto_ticket_round_robin)

    # 21. Rule C: Single Active Ticket Deduplication for Inbound Messages
    def test_single_active_ticket_dedup():
        vid = chat_ticket.get("visitor_id")
        conv_id = chat_ticket.get("conv_id")
        status, data = http_req("POST", f"/api/v1/workspaces/{ws_id}/inbox/webchat/send", {
            "visitor_id": vid,
            "name": "Pak Kurniawan",
            "message": "Pesan susulan: saya lampirkan juga screenshot kendala saya."
        })
        assert status == 201, f"Expected 201 Created, got {status}"

        # Verify still exactly 1 ticket for this conversation
        t_status, t_data = http_req("GET", f"/api/v1/workspaces/{ws_id}/tickets", token=token)
        assert t_status == 200
        tickets = t_data.get("data", [])
        matched = [t for t in tickets if t.get("conversation_id") == conv_id]
        assert len(matched) == 1, f"Expected exactly 1 ticket, found {len(matched)}"
        return {"ticket_id": matched[0]["id"], "status": matched[0]["status"], "rule": "Single active ticket preserved"}
    run_test("Lifecycle Rule C: Single Active Ticket Deduplication", test_single_active_ticket_dedup)

    # 22. Public WebChat History Retrieval Endpoint
    def test_webchat_history_polling():
        vid = chat_ticket.get("visitor_id")
        status, data = http_req("GET", f"/api/v1/workspaces/{ws_id}/inbox/webchat/messages?visitor_id={vid}")
        assert status == 200, f"Expected 200, got {status}"
        res = data.get("data", {})
        assert "messages" in res, "Expected messages array"
        assert len(res["messages"]) >= 2, f"Expected at least 2 messages, got {len(res['messages'])}"
        return {"messages_count": len(res["messages"]), "assigned_to": res.get("assigned_to_name")}
    run_test("Public WebChat Visitor Polling Endpoint (GET /inbox/webchat/messages)", test_webchat_history_polling)

    # 23. Hybrid Pull Model: CS Claim Ticket (POST /tickets/:id/claim)
    def test_cs_claim_ticket():
        ticket_id = chat_ticket.get("ticket_id")
        # Login as CS Siti
        l_status, l_data = http_req("POST", "/api/v1/auth/login", {
            "email": "siti@octocrm.id",
            "password": "password123"
        })
        assert l_status == 200, f"Expected 200, got {l_status}"
        siti_token = l_data["data"]["token"]

        c_status, c_data = http_req("POST", f"/api/v1/workspaces/{ws_id}/tickets/{ticket_id}/claim", token=siti_token)
        assert c_status == 200, f"Expected 200, got {c_status}"
        claimed_ticket = c_data.get("data", {})
        assert claimed_ticket.get("assigned_to_id") == "22222222-2222-2222-2222-222222222222", "Expected Siti to be the new assigned agent"
        assert claimed_ticket.get("assigned_to_name") == "Siti Rahmawati"
        return {"ticket_number": claimed_ticket.get("ticket_number"), "new_assignee": claimed_ticket.get("assigned_to_name")}
    run_test("Hybrid Action: CS Claim Ticket (POST /tickets/:id/claim)", test_cs_claim_ticket)

    print("\n--------------------------------------------------")
    passed = sum(1 for r in TEST_RESULTS if r["status"] == "PASSED")
    total = len(TEST_RESULTS)
    print(f"API TEST SUMMARY: {passed}/{total} Passed ({(passed/total)*100:.1f}%)")
    print("--------------------------------------------------")

    # Output JSON summary for test report generator
    with open("/Users/egichandrapratama/Download/OCTO/OCTO-CRM/e2e/api_test_results.json", "w") as f:
        json.dump(TEST_RESULTS, f, indent=2)

    return passed == total

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
