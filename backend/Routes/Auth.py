from datetime import timedelta
from flask import Response, jsonify, make_response, request, g as flaskg
from flask.blueprints import Blueprint
from flask_jwt_extended import create_access_token, jwt_required, set_access_cookies, unset_jwt_cookies
from dataclasses import dataclass
from mongoengine import ValidationError
from pymongo.errors import DuplicateKeyError
from werkzeug.exceptions import HTTPException, InternalServerError, Unauthorized

from backend.Error import BadBody, UserDoesNotExist, CUnauthorized, HttpValidationError
from backend.Hasher import verify_password
from backend.Logger import Logger
from backend.Database import Collections, Transaction, Audit, AuditAction, AuditData, Role, User
from backend.Utils import set_token, get_token_from

auth = Blueprint("Auth", __name__)

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
                "aud": Role(user.role).value,
                "id": str(user.id), # type: ignore
                "email": user.email,
                "username": user.username
            },
        )
        
        # Create response with user data
        resp = make_response(jsonify({
            "id": str(user.id),
            "email": user.email,
            "username": user.username
        }), 200)
        
        # Set the access token in a cookie
        set_access_cookies(resp, access_token)
        
        # Make sure the cookie is set with proper attributes
        resp.set_cookie(
            'access_token_cookie',
            value=access_token,
            httponly=True,
            samesite='Lax',
            secure=False  # Set to True in production with HTTPS
        )
        
        return resp

    except HTTPException as e:
        raise e
    except Exception as e:
        Logger.log.error(str(e))
        raise InternalServerError()

@auth.route("/logout")
@jwt_required(optional=True)
def logout():
    resp = make_response("", 200)
    unset_jwt_cookies(resp)
    return resp

@auth.route("/me")
@jwt_required(optional=False)
@set_token
def me():
    payload = get_token_from(flaskg)
    if (payload == None):
        return CUnauthorized()
    return jsonify(payload.__dict__), 200


@auth.route("/register", methods=["POST"])
def register():
    try:
        json = request.get_json()
        req_register = ReqRegister(**json)
    except Exception as _:
        raise BadBody()

    Logger.log.info(f"RegisterBody\n\t{str(req_register)}")

    try:
        with Transaction() as (session, db):
                user = User(email=req_register.email, username=req_register.username, password=req_register.password)

                col_user = db.get_collection(Collections.USER.value)
                col_audit = db.get_collection(Collections.AUDIT.value)

                user.validate()
                user.hash_password()
                res_insert = col_user.insert_one(user.to_mongo(), session=session)
                audit = Audit(
                    action=AuditAction.ADD,
                    data=AuditData(
                        collection=Collections.USER.value,
                        ad_id=res_insert.inserted_id
                    ).__dict__
                )
                col_audit.insert_one(audit.to_mongo(), session=session)
    except ValidationError as e:
        raise HttpValidationError(e.to_dict())
    except DuplicateKeyError as e:
        print("Duplicate")
        Logger.log.error(str(e))
        raise Unauthorized(description="User already exists")
    except Exception as e:
        Logger.log.error(str(e))
        raise HTTPException(f"Failed to Register User {str(req_register)}", Response(status=400))

    return "", 200