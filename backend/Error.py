from werkzeug.exceptions import HTTPException, Unauthorized
from werkzeug.wrappers import Response
from flask import jsonify
from .Logger import Logger

class BadBody(Unauthorized):
    def __init__(self, description="Bad Body"):
        super().__init__(description=description)

class UserDoesNotExist(HTTPException):
    def __init__(self):
        super().__init__("User Does not exist", Response(status=400))
        self.code = 400

class CUnauthorized(HTTPException):
    def __init__(self):
        super().__init__("Unauthorized", Response(status=401))
        self.code = 401

class HttpValidationError(HTTPException):
    def __init__(self, msg = "Validation Error"):
        super().__init__(msg, Response(status=400))
        self.code = 400

class HttpInvalidId(HTTPException):
    def __init__(self, msg = "Invalid Id"):
        super().__init__(msg, Response(status=400))
        self.code = 400

class InvalidId(Exception): ...

def ErrHTTPExceptionHandler(e):
    Logger.log.error(str(e))
    status = e.code
    message = e.description

    return jsonify({
        "error": message,
        "type": e.__class__.__name__
    }), status

