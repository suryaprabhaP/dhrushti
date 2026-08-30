"""
KSP Sentinel AI — Unified Startup Server
=========================================
Runs both:
  1. ksp-main backend (Flask) on PORT 5000 → serves main KSP dashboard at /
  2. analysis agent backend (Flask) on PORT 5001 → serves agent UI at /agent/

Root path for Zoho Catalyst App Service: ./
Start command: python start.py
"""

import subprocess
import sys
import os
import threading
import time

ROOT = os.path.dirname(os.path.abspath(__file__))

# ─── Build Helper ──────────────────────────────────────────────────────────────

def run_build(label, cwd, cmd):
    print(f"\n[BUILD] {label}...")
    result = subprocess.run(cmd, cwd=cwd, shell=True)
    if result.returncode != 0:
        print(f"[ERROR] Build failed for {label}")
        sys.exit(1)
    print(f"[BUILD] {label} ✓ done")


def build_frontends():
    main_frontend = os.path.join(ROOT, "ksp-main", "frontend")
    agent_frontend = os.path.join(ROOT, "ksp_dhrushtii2-rohith-sV0.1analysis_agent")

    # Build ksp-main frontend
    run_build("ksp-main frontend", main_frontend, "npm install && npm run build")

    # Build analysis agent frontend (already has base: '/agent/' set in vite.config.js)
    run_build("analysis agent frontend", agent_frontend, "npm install && npm run build")

    print("\n[BUILD] All frontends built successfully ✓")


# ─── Server Runners ────────────────────────────────────────────────────────────

def run_main_backend():
    """Run ksp-main Flask backend on port 5000."""
    backend_dir = os.path.join(ROOT, "ksp-main", "backend")
    env = os.environ.copy()
    env["PORT"] = "5000"
    env["PYTHONPATH"] = backend_dir
    print("[SERVER] Starting ksp-main backend on port 5000...")
    subprocess.run(
        [sys.executable, "app.py"],
        cwd=backend_dir,
        env=env
    )


def run_agent_backend():
    """Run analysis agent Flask backend on port 5001."""
    agent_dir = os.path.join(ROOT, "ksp_dhrushtii2-rohith-sV0.1analysis_agent")
    env = os.environ.copy()
    env["PORT"] = "5001"
    env["PYTHONPATH"] = agent_dir
    print("[SERVER] Starting analysis agent backend on port 5001...")
    subprocess.run(
        [sys.executable, "server.py"],
        cwd=agent_dir,
        env=env
    )


# ─── Entry Point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    # Step 1: Build both frontends (only if dist/ doesn't exist yet)
    main_dist = os.path.join(ROOT, "ksp-main", "frontend", "dist")
    agent_dist = os.path.join(ROOT, "ksp_dhrushtii2-rohith-sV0.1analysis_agent", "dist")

    if not os.path.exists(main_dist) or not os.path.exists(agent_dist):
        build_frontends()
    else:
        print("[START] Pre-built dist/ folders found. Skipping build step.")

    # Step 2: Start both servers in parallel threads
    t1 = threading.Thread(target=run_main_backend, daemon=True)
    t2 = threading.Thread(target=run_agent_backend, daemon=True)

    t1.start()
    time.sleep(2)  # Small delay so main backend starts first
    t2.start()

    print("\n[START] Both servers running:")
    print("  → Main KSP Dashboard : http://0.0.0.0:5000")
    print("  → Analysis Agent      : http://0.0.0.0:5001")
    print("\nPress Ctrl+C to stop.\n")

    # Keep main thread alive
    try:
        t1.join()
        t2.join()
    except KeyboardInterrupt:
        print("\n[STOP] Shutting down servers.")
