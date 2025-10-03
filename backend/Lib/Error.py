from werkzeug.exceptions import HTTPException, BadRequest
from werkzeug.wrappers import Response
from flask import jsonify
from .Logger import Logger

class BadBody(BadRequest):
    def __init__(self, description: str="Bad Body"):
        super().__init__(description=description)

class UserDoesNotExist(HTTPException):
    def __init__(self):
        super().__init__("User Does not exist", Response(status=400))
        self.code = 400

class UserAlreadyExist(HTTPException):
    def __init__(self):
        super().__init__("User already exist", Response(status=400))
        self.code = 400

class HttpValidationError(HTTPException):
    def __init__(self, msg: str = "Validation Error"):
        super().__init__(msg, Response(status=400))
        self.code = 400

class HttpInvalidId(HTTPException):
    def __init__(self, msg: str = "Invalid Id"):
        super().__init__(msg, Response(status=400))
        self.code = 400

class FileNotSupported(HTTPException):
    def __init__(self, msg: str = "File is not supported"):
        super().__init__(msg)
        self.code = 400

class TooManyFiles(HTTPException):
    def __init__(self, msg: str = "Too many files in key `file`"):
        super().__init__(msg)
        self.code = 400

class InvalidId(Exception): ...

def ErrHTTPExceptionHandler(e: HTTPException):
    Logger.log.error(repr(e))
    status = e.code if e.code else 500
    message = e.description

    return jsonify({
        "error": message,
        "type": e.__class__.__name__
    }), status

