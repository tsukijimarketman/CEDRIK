from flask import jsonify, request
from flask.blueprints import Blueprint
from dataclasses import dataclass

from ..Logger import Logger
from ..Database.Models.User import User

auth = Blueprint("auth", __name__, url_prefix="/auth")

@dataclass
class ReqLogin:
    email: str
    password: str

@dataclass
class ReqRegister:
    email: str
    username: str
    password: str

@auth.route("/login", methods=["POST"])
def login():
    req_login = ReqLogin(**request.get_json())
    Logger.log.info(f"LoginBody\n\t{str(req_login)}")

    user = User.objects

    return str(user), 200

@auth.route("/register", methods=["POST"])
def register():
    req_register = ReqRegister(**request.get_json())
    Logger.log.info(f"RegisterBody\n\t{str(req_register)}")

    u = User(email=req_register.email, username=req_register.username, password=req_register.password)
    u.save()

    return jsonify({
        "result": str(u)
    }), 200

