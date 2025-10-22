from bson.objectid import ObjectId
from flask_jwt_extended import get_jwt

from backend.Lib.Error import InvalidId
from backend.Lib.Logger import Logger

class UserToken:
    id = ""
    aud = ""
    username = ""
    email = ""
    def __init__(self, token):
        if token == None:
            return

        # Copy constructor
        if isinstance(token, UserToken):
            self.id = token.id
            self.aud = token.aud
            self.username = token.username
            self.email = token.email
            return

        if isinstance(token, dict):
            self.id = token.get("id", None)
            self.aud = token.get("aud", "")
            self.username = token.get("username", "")
            self.email = token.get("email", "")
            return

        raise TypeError("Invalid Type")

def get_token():
    token = get_jwt()
    if len(token) == 0:
        return None
    return UserToken(token)

# NOTE move this to another file
def get_object_id(id: str):
    try:
        return ObjectId(id)
    except Exception as e:
        Logger.log.error(str(e))
        raise InvalidId()
