from werkzeug.exceptions import HTTPException, InternalServerError
import os
from backend.Error import ErrHTTPExceptionHandler
from flask import Flask, jsonify, redirect, request
from .Database import db_connection_init, init_indexes
from dotenv import load_dotenv
from flask_cors import CORS
from flask_jwt_extended import JWTManager

from .Routes.Auth import auth as routeAuth
from .Routes.AI import ai as routeAi
from .Routes.AI import ai as routeAi

app = Flask(__name__)
load_dotenv()
db_connection_init()
JWT_SECRET = os.getenv("JWT_SECRET")

# app.config["PROPAGATE_EXCEPTIONS"] = False
app.config["TRAP_HTTP_EXCEPTIONS"]=True
app = Flask(__name__)

# JWT Configuration
app.config["JWT_SECRET_KEY"] = JWT_SECRET
app.config["JWT_TOKEN_LOCATION"] = ["cookies"]
app.config["JWT_ACCESS_COOKIE_NAME"] = "access_token_cookie"
app.config["JWT_COOKIE_CSRF_PROTECT"] = False  # Disable CSRF for now
app.config["JWT_COOKIE_SECURE"] = False  # Set to True in production with HTTPS
app.config["JWT_COOKIE_HTTPONLY"] = True
app.config["JWT_COOKIE_SAMESITE"] = "Lax"

# Session Configuration
app.config["SESSION_COOKIE_SAMESITE"] = "Lax"
app.config["SESSION_COOKIE_HTTPONLY"] = True
app.config["TRAP_HTTP_EXCEPTIONS"] = True

# Configure CORS with all necessary settings
cors = CORS(
    app,
    resources={
        r"/*": {
            "origins": ["http://localhost:5173"],
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"],
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
        "type": "ok",
        "message": "No problems",
        "api_map": endpoints
    }), 200

# Removed duplicate CORS configuration - now handled by flask-cors

app.register_blueprint(routeAuth, url_prefix="/api/auth")
app.register_blueprint(routeAi, url_prefix="/api/ai")
