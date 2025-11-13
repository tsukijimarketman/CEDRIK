from backend.Apps.Main.Filter import FilterExtension
from backend.Lib.Config import JWT_SECRET
from werkzeug.exceptions import HTTPException, InternalServerError
from backend.Lib.Error import ErrHTTPExceptionHandler
from flask import Flask, jsonify, redirect, request
from backend.Apps.Main.Database import db_connection_init
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from backend.Apps.Main.Routes import ROUTES
from backend.Lib.Config import RESOURCE_DIR, MAX_CONTENT_LENGTH, FRONTEND_SERVER
from werkzeug.middleware.proxy_fix import ProxyFix
import os
from backend.Lib.Logger import Logger

Logger.log.info(f"Static Resource Folder {os.path.abspath(RESOURCE_DIR)}")

resource_abs_path = os.path.abspath(RESOURCE_DIR)
app = Flask(__name__, static_url_path="/static/", static_folder=resource_abs_path)
db_connection_init()

app.config["TRAP_HTTP_EXCEPTIONS"]=True
# JWT Configuration
app.config["JWT_SECRET_KEY"] = JWT_SECRET
app.config["JWT_TOKEN_LOCATION"] = ["cookies"]
app.config["JWT_ACCESS_COOKIE_NAME"] = "access_token_cookie"
app.config["JWT_COOKIE_CSRF_PROTECT"] = not app.debug  # Disable CSRF for in debug
app.config["JWT_COOKIE_SECURE"] = not app.debug
app.config["JWT_COOKIE_HTTPONLY"] = True
app.config["JWT_COOKIE_SAMESITE"] = "Lax"
app.config["MAX_CONTENT_LENGTH"] = MAX_CONTENT_LENGTH

FilterExtension(app)

app.wsgi_app = ProxyFix(
    app.wsgi_app,
    x_for=1,
    x_proto=1,
    x_host=1,
    x_prefix=1
)

# Configure CORS with all necessary settings
cors = CORS(
    app,
    resources={
        r"/*": {
            "origins": [FRONTEND_SERVER],
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization", "X-CSRF-TOKEN"],
            "supports_credentials": True,
            "expose_headers": ["Content-Type", "Content-Length", "Authorization"]
        }
    },
    supports_credentials=True
)

_JWT = JWTManager(app)
app.register_error_handler(HTTPException, ErrHTTPExceptionHandler)
app.register_error_handler(InternalServerError, ErrHTTPExceptionHandler)

@app.route("/")
def Root():
    return redirect("/health")

@app.route("/health")
def Health():
    endpoints = {}
    for rule in app.url_map.iter_rules():
        endpoints[rule.rule] = {
            "endpoint": rule.endpoint,
            "methods": list(rule.methods) # type: ignore
        }

    return jsonify({
      "ip": request.remote_addr,
        "type": "ok",
        "message": "No problems",
        "api_map": endpoints
    }), 200

for route in ROUTES:
    app.register_blueprint(route.blueprint, url_prefix=f"/api/{route.path}")
