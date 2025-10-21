from datetime import timedelta
from flask import Response, jsonify, make_response, request
from flask.blueprints import Blueprint
from flask_jwt_extended import create_access_token, jwt_required, set_access_cookies, unset_jwt_cookies
from dataclasses import dataclass
from mongoengine import ValidationError
from pymongo.errors import DuplicateKeyError
from werkzeug.exceptions import HTTPException, InternalServerError, Unauthorized

from backend.Lib.Error import BadBody, UserAlreadyExist, UserDoesNotExist, HttpValidationError
from backend.Apps.Main.Hasher import verify_password, hash as hash_password
from backend.Lib.Logger import Logger
from backend.Apps.Main.Database import Transaction, Audit, User
from backend.Apps.Main.Utils import get_token, Role, AuditType, Collections, get_object_id
from backend.Apps.Main.Validation import validate_username, validate_password

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
    role: str | None = None

@dataclass
class ReqUpdateProfile:
    username: str | None = None
    password: str | None = None

@dataclass
class ReqAdminUpdateUser:
    username: str | None = None
    email: str | None = None
    role: str | None = None
    status: str | None = None

@auth.route("/login", methods=["POST"])
def login():
    try:
        json = request.get_json()
        req_login = ReqLogin(**json)
    except Exception as _:
        raise BadBody()

    Logger.log.info(f"LoginBody\n\t{str(req_login)}")

    try:
        userQS = User.objects(email=req_login.email, is_active=True) # type: ignore
        if (len(userQS) == 0):
            raise UserDoesNotExist()

        user: User = userQS.first()
        if not isinstance(user, User):
            raise UserDoesNotExist()

        if not verify_password(str(user.password), req_login.password):
            raise UserDoesNotExist()

        raw_is_active = getattr(user, "is_active", True)
        if isinstance(raw_is_active, str):
            user_is_active = raw_is_active.strip().lower() in {"true", "1", "yes"}
        else:
            user_is_active = bool(raw_is_active)

        if not user_is_active:
            raise Unauthorized(description="Account is inactive. Please contact support.")

        access_token = create_access_token(
            identity=str(user.id), # type: ignore
            expires_delta=timedelta(days=5),
            additional_claims={
                "aud": Role(user.role).value,
                "id": str(user.id), # type: ignore
                "email": user.email,
                "username": user.username,
                "is_active": user_is_active,
            },
        )

        # Create response with user data
        resp = make_response(jsonify({
            "id": str(user.id), # type: ignore
            "email": user.email,
            "username": user.username,
            "is_active": user_is_active,
            "role": Role(user.role).value,
        }), 200)
        
        # handles Set-Cookie and other params based on app.config
        set_access_cookies(resp, access_token)
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
def me():
    payload = get_token()
    if (payload == None):
        return Unauthorized()
    return jsonify(payload.__dict__), 200

@auth.route("/me", methods=["PUT"])
@jwt_required(optional=False)
def update_me():
    try:
        json = request.get_json() or {}
        req_update = ReqUpdateProfile(**json)
    except Exception as _:
        raise BadBody()

    payload = get_token()
    if payload is None:
        return Unauthorized()

    try:
        with Transaction() as (session, db):
            col_user = db.get_collection(Collections.USER.value)
            col_audit = db.get_collection(Collections.AUDIT.value)

            user_id = get_object_id(payload.id)
            existing = col_user.find_one({"_id": user_id}, session=session)
            if existing is None:
                raise UserDoesNotExist()

            update_fields: dict = {}
            ad_from: dict = {}
            ad_to: dict = {}

            # Username update
            if req_update.username is not None and req_update.username.strip() != "":
                new_username = req_update.username.strip()
                if new_username != existing.get("username"):
                    # Validate username
                    validate_username(new_username)
                    update_fields["username"] = new_username
                    ad_from["username"] = existing.get("username")
                    ad_to["username"] = new_username

            # Password update (only if provided and not empty)
            if req_update.password is not None and req_update.password.strip() != "":
                new_password = req_update.password
                validate_password(new_password)
                hashed = hash_password(new_password)
                update_fields["password"] = hashed
                # Avoid storing sensitive data in audit
                ad_from["password"] = "***"
                ad_to["password"] = "***"

            if len(update_fields) == 0:
                # Nothing to update, return current user info
                resp = make_response(jsonify({
                    "id": str(existing.get("_id")),
                    "email": existing.get("email"),
                    "username": existing.get("username"),
                }), 200)
                return resp

            col_user.update_one(
                {"_id": user_id},
                {"$set": update_fields},
                session=session,
            )

            audit = Audit.audit_collection(
                type=AuditType.EDIT,
                collection=Collections.USER,
                id=user_id,
                from_data=ad_from if len(ad_from) > 0 else None,
                to_data=ad_to if len(ad_to) > 0 else None
            )
            col_audit.insert_one(audit.to_mongo(), session=session)

            # Prepare updated values for response and token
            updated_username = update_fields.get("username", existing.get("username"))
            email = existing.get("email")
            aud = existing.get("role", "user")

            access_token = create_access_token(
                identity=str(user_id),
                expires_delta=timedelta(days=5),
                additional_claims={
                    "aud": aud,
                    "id": str(user_id),
                    "email": email,
                    "username": updated_username,
                },
            )

            resp = make_response(jsonify({
                "id": str(user_id),
                "email": email,
                "username": updated_username,
            }), 200)

            set_access_cookies(resp, access_token)

            return resp

    except DuplicateKeyError as e:
        Logger.log.error(str(e))
        raise Unauthorized(description="Username already exists")
    except ValidationError as e:
        raise HttpValidationError(e.to_dict()) # type: ignore
    except HTTPException as e:
        raise e
    except Exception as e:
        Logger.log.error(str(e))
        raise InternalServerError()


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
                user = User(
                    email=req_register.email,
                    username=req_register.username,
                    password=req_register.password,
                    is_active=True,
                )

                requested_role = (req_register.role or "").strip().lower()
                if requested_role:
                    try:
                        user.role = Role(requested_role)
                    except ValueError:
                        Logger.log.warning(f"Invalid role '{requested_role}' provided during registration. Defaulting to user role.")

                col_user = db.get_collection(Collections.USER.value)
                col_audit = db.get_collection(Collections.AUDIT.value)

                user.validate()
                user.hash_password()
                res_insert = col_user.insert_one(user.to_mongo(), session=session)
                audit = Audit.audit_collection(
                    type=AuditType.ADD,
                    collection=Collections.USER,
                    id=res_insert.inserted_id,
                    from_data=None,
                    to_data=None
                )
                col_audit.insert_one(audit.to_mongo(), session=session)
    except ValidationError as e:
        raise HttpValidationError(e.to_dict()) # type: ignore
    except DuplicateKeyError as e:
        Logger.log.error(str(e))
        raise UserAlreadyExist()
    except Exception as e:
        Logger.log.error(repr(e))
        raise HTTPException(description=str(e))

    return "", 200


@auth.route("/users/<user_id>", methods=["PUT"])
@jwt_required(optional=False)
def update_user(user_id: str):
    payload = get_token()
    if payload is None:
        return Unauthorized()

    aud = getattr(payload, "aud", "").strip().lower()
    if aud not in {Role.ADMIN.value, Role.SUPERADMIN.value}:
        raise Unauthorized(description="Insufficient permissions")

    try:
        json = request.get_json() or {}
        req_update = ReqAdminUpdateUser(**json)
    except Exception as _:
        raise BadBody()

    try:
        with Transaction() as (session, db):
            col_user = db.get_collection(Collections.USER.value)
            col_audit = db.get_collection(Collections.AUDIT.value)

            target_id = get_object_id(user_id)
            existing = col_user.find_one({"_id": target_id}, session=session)
            if existing is None:
                raise UserDoesNotExist()

            update_fields: dict = {}
            ad_from: dict = {}
            ad_to: dict = {}

            if req_update.username is not None and req_update.username.strip() != "":
                new_username = req_update.username.strip()
                if new_username != existing.get("username"):
                    validate_username(new_username)
                    update_fields["username"] = new_username
                    ad_from["username"] = existing.get("username")
                    ad_to["username"] = new_username

            if req_update.email is not None and req_update.email.strip() != "":
                new_email = req_update.email.strip()
                if new_email != existing.get("email"):
                    update_fields["email"] = new_email
                    ad_from["email"] = existing.get("email")
                    ad_to["email"] = new_email

            if req_update.role is not None and req_update.role.strip() != "":
                normalized_role = req_update.role.strip().lower()
                try:
                    role_enum = Role(normalized_role)
                    existing_role = existing.get("role")
                    existing_role_value = existing_role.value if isinstance(existing_role, Role) else str(existing_role)
                    if role_enum.value != existing_role_value:
                        update_fields["role"] = role_enum.value
                        ad_from["role"] = existing_role_value
                        ad_to["role"] = role_enum.value
                except ValueError:
                    raise HttpValidationError({"role": ["Invalid role"]})

            if req_update.status is not None and req_update.status.strip() != "":
                normalized_status = req_update.status.strip().lower()
                if normalized_status not in {"active", "inactive"}:
                    raise HttpValidationError({"status": ["Invalid status"]})

                raw_is_active = existing.get("is_active", True)
                if isinstance(raw_is_active, str):
                    existing_is_active = raw_is_active.strip().lower() in {"true", "1", "yes"}
                else:
                    existing_is_active = bool(raw_is_active)

                desired_is_active = normalized_status == "active"
                if desired_is_active != existing_is_active:
                    update_fields["is_active"] = desired_is_active
                    ad_from["is_active"] = existing_is_active
                    ad_to["is_active"] = desired_is_active

            if len(update_fields) == 0:
                return jsonify({
                    "id": str(existing.get("_id")),
                    "email": existing.get("email"),
                    "username": existing.get("username"),
                    "role": existing.get("role"),
                    "is_active": existing.get("is_active", True),
                }), 200

            col_user.update_one(
                {"_id": target_id},
                {"$set": update_fields},
                session=session,
            )

            audit = Audit.audit_collection(
                type=AuditType.EDIT,
                collection=Collections.USER,
                id=target_id,
                from_data=ad_from if len(ad_from) > 0 else None,
                to_data=ad_to if len(ad_to) > 0 else None
            )
            col_audit.insert_one(audit.to_mongo(), session=session)

            updated = col_user.find_one({"_id": target_id}, session=session)

            updated_role = updated.get("role") if updated else update_fields.get("role", existing.get("role"))

            return jsonify({
                "id": str(target_id),
                "email": updated.get("email") if updated else update_fields.get("email", existing.get("email")),
                "username": updated.get("username") if updated else update_fields.get("username", existing.get("username")),
                "role": updated_role.value if isinstance(updated_role, Role) else str(updated_role),
                "is_active": updated.get("is_active") if updated else update_fields.get("is_active", existing.get("is_active", True)),
            }), 200

    except DuplicateKeyError as e:
        Logger.log.error(str(e))
        raise UserAlreadyExist()
    except ValidationError as e:
        raise HttpValidationError(e.to_dict())  # type: ignore
    except HTTPException as e:
        raise e
    except Exception as e:
        Logger.log.error(str(e))
        raise InternalServerError()


@auth.route("/users", methods=["GET"])
@jwt_required(optional=False)
def list_users():
    payload = get_token()
    if payload is None:
        return Unauthorized()

    try:
        users = User.objects()  # type: ignore
        response_data = []
        for user in users:
            raw_is_active = getattr(user, "is_active", True)
            if isinstance(raw_is_active, str):
                user_is_active = raw_is_active.strip().lower() in {"true", "1", "yes"}
            else:
                user_is_active = bool(raw_is_active)

            response_data.append({
                "id": str(user.id),  # type: ignore
                "email": user.email,
                "username": user.username,
                "role": user.role.value if isinstance(user.role, Role) else str(user.role),
                "is_active": user_is_active,
                "created_at": user.created_at.isoformat() if getattr(user, "created_at", None) else None,
                "updated_at": user.updated_at.isoformat() if getattr(user, "updated_at", None) else None,
            })

        return jsonify(response_data), 200
    except Exception as e:
        Logger.log.error(str(e))
        raise InternalServerError()