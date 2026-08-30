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
    print(f"[BUILD] {label} done")


def build_frontends():
    main_frontend = os.path.join(ROOT, "ksp-main", "frontend")
    agent_frontend = os.path.join(ROOT, "ksp-main", "backend", "ksp_dhrushtii2-rohith-sV0.1analysis_agent")

    # 1. Build analysis agent frontend (already has base: '/agent/' set in vite.config.js)
    run_build("analysis agent frontend", agent_frontend, "npm install && npm run build")

    # 2. Copy agent build output to main frontend's public/agent folder
    import shutil
    agent_public_dir = os.path.join(main_frontend, "public", "agent")
    print(f"\n[BUILD] Syncing agent assets to main frontend public/agent...")
    if os.path.exists(agent_public_dir):
        shutil.rmtree(agent_public_dir)
    shutil.copytree(os.path.join(agent_frontend, "dist"), agent_public_dir)

    # 3. Build ksp-main frontend (which packs the public/agent folder into dist/agent)
    run_build("ksp-main frontend", main_frontend, "npm install && npm run build")

    print("\n[BUILD] All frontends built and synced successfully")


# ─── Server Runners ────────────────────────────────────────────────────────────

def run_main_backend():
    """Run unified ksp-main Flask backend on port 5000."""
    backend_dir = os.path.join(ROOT, "ksp-main", "backend")
    env = os.environ.copy()
    env["PORT"] = "5000"
    env["PYTHONPATH"] = backend_dir
    print("[SERVER] Starting unified KSP backend on port 5000...")
    subprocess.run(
        [sys.executable, "main_server.py"],
        cwd=backend_dir,
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

    # Step 2: Start unified server in background thread
    t1 = threading.Thread(target=run_main_backend, daemon=True)
    t1.start()

    print("\n[START] Unified Server running:")
    print("  -> Main KSP Dashboard : http://localhost:5000")
    print("  -> Sentinel Chatbot    : http://localhost:5000/agent/")
    print("\nPress Ctrl+C to stop.\n")

    # Keep main thread alive
    try:
        t1.join()
    except KeyboardInterrupt:
        print("\n[STOP] Shutting down server.")
