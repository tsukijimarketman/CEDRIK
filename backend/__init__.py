from werkzeug.exceptions import HTTPException, InternalServerError
import os
from backend.Error import ErrHTTPExceptionHandler
from flask import Flask, jsonify
from .Database import db_connection_init
from dotenv import load_dotenv
from flask_cors import CORS
from flask_jwt_extended import JWTManager

from .Routes.Auth import auth as routeAuth

load_dotenv()

JWT_SECRET = os.getenv("JWT_SECRET")

db_connection_init()

app = Flask(__name__)
# So the GlobalErrHandler Works
# app.config["PROPAGATE_EXCEPTIONS"] = False
app.config["TRAP_HTTP_EXCEPTIONS"]=True
app.config["JWT_SECRET_KEY"] = JWT_SECRET
app.config["JWT_TOKEN_LOCATION"] = "cookies"
# app.debug = False

CORS(app, origins=["http://localhost:5173"])

_JWT = JWTManager(app)
app.register_error_handler(HTTPException, ErrHTTPExceptionHandler)
app.register_error_handler(InternalServerError, ErrHTTPExceptionHandler)

@app.route("/")
def Root():
    return "<p>Hello, World!</p>"

@app.route("/health")
def Health():
    return jsonify({
        "type": "ok",
        "message": "No problems",
        "map": str(app.url_map)
    }), 200

app.register_blueprint(routeAuth, url_prefix="/api/auth")
