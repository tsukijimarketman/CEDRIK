from datetime import timedelta
from flask import Response, jsonify, make_response, request
from flask.blueprints import Blueprint
from dataclasses import dataclass

from mongoengine import NotUniqueError, OperationError
from mongoengine.errors import MongoEngineException
from werkzeug.exceptions import HTTPException, InternalServerError, Unauthorized

from backend.Error import BadBody, UserDoesNotExist
from backend.Hasher import verify_password
from flask_jwt_extended import create_access_token, jwt_required, get_jwt, set_access_cookies, unset_jwt_cookies

from ..Logger import Logger
from ..Database.Models.User import User

auth = Blueprint("auth", __name__)

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
    try:
        json = request.get_json()
        req_login = ReqLogin(**json)
    except Exception as _:
        raise BadBody()

    Logger.log.info(f"LoginBody\n\t{str(req_login)}")

    try:
        userQS = User.objects(email=req_login.email) # type: ignore
        if (len(userQS) == 0):
            raise UserDoesNotExist()

        user: User = userQS.first()
        if not verify_password(str(user.password), req_login.password):
            raise UserDoesNotExist()

        access_token = create_access_token(
            identity=str(user.id), # type: ignore
            expires_delta=timedelta(days=5),
            additional_claims={
                "aud": user.role,
                "id": str(user.id), # type: ignore
                "email": user.email,
                "username": user.username
            },
        )
        resp = make_response("", 200)
        set_access_cookies(resp, access_token)
        return resp

    except HTTPException as e:
        raise e
    except Exception as e:
        Logger.log.error(str(e))
        raise InternalServerError()

@auth.route("/verify")
@jwt_required()
def verify():
    token = get_jwt()
    return jsonify(token), 200

@auth.route("/logout")
@jwt_required()
def logout():
    resp = make_response("", 200)
    unset_jwt_cookies(resp)
    return resp

@auth.route("/register", methods=["POST"])
def register():
    try:
        json = request.get_json()
        req_register = ReqRegister(**json)
    except Exception as _:
        raise BadBody()

    Logger.log.info(f"RegisterBody\n\t{str(req_register)}")

    u = None
    try:
        u = User(email=req_register.email, username=req_register.username, password=req_register.password)
        u.save()
    except NotUniqueError as e:
        Logger.log.error(str(e))
        raise Unauthorized(description="User already exists")
    except Exception as e:
        Logger.log.error(str(e));
        raise HTTPException(f"Failed to Register User {str(req_register)}", Response(status=400))

    Logger.log.info(f"Registered {str(u)}")
    return "", 200

