from flask import Flask, jsonify
from .Database import db_connection_init
from dotenv import load_dotenv

from .Routes.Auth import auth as routeAuth

load_dotenv()
db_connection_init()
app = Flask(__name__)

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

app.register_blueprint(routeAuth, url_prefix="/api")
# app.register_error_handler()
