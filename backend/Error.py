from werkzeug.exceptions import HTTPException, Unauthorized
from werkzeug.wrappers import Response
from flask import jsonify
from .Logger import Logger

class BadBody(Unauthorized):
    def __init__(self):
        super().__init__("Bad Body")

class UserDoesNotExist(HTTPException):
    def __init__(self):
        super().__init__("User Does not exist", Response(status=400))

def ErrHTTPExceptionHandler(e):
    Logger.log.error(str(e))
    status = e.code
    message = e.description

    return jsonify({
        "error": message,
        "type": e.__class__.__name__
    }), status

