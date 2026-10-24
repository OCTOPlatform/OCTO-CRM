import subprocess
import sys
import os
import time

def run():
    print("================================================================")
    print("   OCTO-CRM ULTIMATE E2E & ACCEPTANCE CRITERIA TEST SUITE      ")
    print("================================================================")
    t_start = time.time()

    print("\n[PHASE 1] Running Backend API Acceptance Criteria Tests...")
    api_proc = subprocess.run([sys.executable, "e2e/api_runner.py"], capture_output=False)

    print("\n[PHASE 2] Running Playwright E2E UI Visual Workflow Tests...")
    ui_proc = subprocess.run([sys.executable, "e2e/playwright_runner.py"], capture_output=False)

    total_time = round(time.time() - t_start, 2)
    print("\n================================================================")
    print(f"OVERALL EXECUTION TIME: {total_time}s")
    if api_proc.returncode == 0 and ui_proc.returncode == 0:
        print("RESULT: ALL ACCEPTANCE TESTS PASSED (100% SUCCESS)")
        print("Screenshot evidence stored at: e2e/screenshots/")
        print("================================================================")
        return 0
    else:
        print("RESULT: SOME TESTS FAILED")
        print("================================================================")
        return 1

if __name__ == "__main__":
    sys.exit(run())
