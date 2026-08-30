"""
Karnataka State Police - Sentinel AI Command Platform
Flask Application Entry Point

Main server setup, route blueprints, static file serving, and error handling.
"""

import logging
import os
import sys
from flask import Flask, jsonify
from flask_cors import CORS

# ── PYTHONPATH: Inject analysis agent module so agent_server.py can resolve
# `from app.config import ...`, `from app.providers.orchestrator import ...`, etc.
# This is required because agent_server.py imports from the analysis agent's
# own `app/` package (ksp_dhrushtii2-rohith-sV0.1analysis_agent/app/), which is
# separate from the main backend's `app/` package.
_AGENT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'ksp_dhrushtii2-rohith-sV0.1analysis_agent')
if _AGENT_DIR not in sys.path:
    sys.path.insert(0, _AGENT_DIR)

from routes import chat_bp
from agent_server import agent_bp
from config import Config


def create_app():
    """
    Application factory initializing Flask server, application logging,
    and blueprint route registrations.
    """
    # 1. Initialize logging system
    log_directory = Config.BASE_DIR / 'logs'
    log_directory.mkdir(exist_ok=True)
    
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
        handlers=[
            logging.FileHandler(log_directory / 'application.log'),
            logging.StreamHandler()
        ]
    )
    
    logger = logging.getLogger("KSP_Sentinel_App")
    logger.info("Initializing KSP Sentinel Command AI Server...")

    # 2. Configure static distribution path for compiled React frontend
    frontend_dist_path = os.path.abspath(
        os.path.join(os.path.dirname(__file__), '..', 'frontend', 'dist')
    )

    app = Flask(
        __name__,
        template_folder=frontend_dist_path,
        static_folder=None
    )
    app.config.from_object(Config)

    # 3. Enable CORS for cloud deployments (Zoho Catalyst / cross-origin)
    CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=False)

    # 4. Register route blueprints
    app.register_blueprint(chat_bp)
    app.register_blueprint(agent_bp, url_prefix='/agent_api')

    # 5. Health check endpoint for Zoho Catalyst / cloud platforms
    @app.route('/health', methods=['GET'])
    @app.route('/api/health', methods=['GET'])
    def health_check():
        return jsonify({
            "status": "ok",
            "service": "KSP Sentinel AI",
            "version": "2.0.0",
            "architecture": "Unified Flask Backend (Zoho Catalyst)"
        }), 200

    # 6. Catch-all SPA Router (handles main dashboard & agent sub-app routing / assets)
    @app.route('/', defaults={'path': ''})
    @app.route('/<path:path>')
    def catch_all(path):
        # Serve existing static files (JS, CSS, images, etc.) from root dist/
        file_path = os.path.join(frontend_dist_path, path)
        if path and os.path.exists(file_path) and os.path.isfile(file_path):
            from flask import send_from_directory
            return send_from_directory(frontend_dist_path, path)

        # Agent sub-app routing fallback
        if path == 'agent' or path == 'agent/' or path.startswith('agent/'):
            agent_dir = os.path.join(frontend_dist_path, 'agent')
            agent_index = os.path.join(agent_dir, 'index.html')
            
            # Extract subpath within agent/ (e.g. assets/index-*.js)
            agent_subpath = path[5:].lstrip('/') if path.startswith('agent/') else ''
            agent_file = os.path.join(agent_dir, agent_subpath)
            
            if agent_subpath and os.path.exists(agent_file) and os.path.isfile(agent_file):
                from flask import send_from_directory
                return send_from_directory(agent_dir, agent_subpath)
                
            from flask import send_file
            if os.path.exists(agent_index):
                return send_file(agent_index)
            return jsonify({"success": False, "error": "Agent sub-app index.html not found."}), 404

        # Main dashboard fallback (serve main index.html)
        main_index = os.path.join(frontend_dist_path, 'index.html')
        if os.path.exists(main_index):
            from flask import send_file
            return send_file(main_index)
        return jsonify({"status": "healthy", "service": "KSP Sentinel Backend API"}), 200

    # 7. Global Exception Handlers
    @app.errorhandler(404)
    def handle_not_found(error):
        return jsonify({
            "success": False,
            "error": "Requested resource endpoint was not found on KSP Sentinel server."
        }), 404
        
    @app.errorhandler(500)
    def handle_internal_error(error):
        return jsonify({
            "success": False,
            "error": "An internal server error occurred while processing the request."
        }), 500

    return app


if __name__ == '__main__':
    # Launch development command server
    port = int(os.environ.get('PORT', 5000))
    server_app = create_app()
    server_app.run(host='0.0.0.0', port=port, debug=False, use_reloader=False)
