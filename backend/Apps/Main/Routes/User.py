from flask import jsonify, request
from flask.blueprints import Blueprint
from flask_jwt_extended import jwt_required
from dataclasses import asdict
from werkzeug.exceptions import InternalServerError, Unauthorized

from backend.Apps.Main.Utils.Aggregate import Pagination, PaginationResults
from backend.Lib.Logger import Logger
from backend.Apps.Main.Database import User
from backend.Apps.Main.Utils import get_token, Role

b_user = Blueprint("User", __name__)

@b_user.route("/get", methods=["GET"])
@jwt_required(optional=False)
def list_users():
    payload = get_token()
    if payload is None:
        raise Unauthorized()

    pagination = Pagination(request.args)

    jsonDict = request.get_json(silent=True)
    jsonDict = dict(jsonDict) if jsonDict != None else {}

    try:
        users = list( User.objects.aggregate(pagination.build()) )  # type: ignore
        results = []
        for user in users:
            raw_is_active = getattr(user, "is_active", True)
            if isinstance(raw_is_active, str):
                user_is_active = raw_is_active.strip().lower() in {"true", "1", "yes"}
            else:
                user_is_active = bool(raw_is_active)

            results.append({
                "id": str(user.id),  # type: ignore
                "email": user.email,
                "username": user.username,
                "role": user.role.value if isinstance(user.role, Role) else str(user.role),
                "is_active": user_is_active,
                "created_at": user.created_at.isoformat() if getattr(user, "created_at", None) else None,
                "updated_at": user.updated_at.isoformat() if getattr(user, "updated_at", None) else None,
            })

        return jsonify(PaginationResults(
          total=users[0].get("total", len(users)) if len(users) > 0 else len(users),
          page=pagination.page,
          items=[ asdict(i) for i in results]
        )), 200
    except Exception as e:
        Logger.log.error(str(e))
        raise InternalServerError()
