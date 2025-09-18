from .UserToken import *
from .CustomField import CustomEmail
from .Decorator import *
from .Enum import *
import json

def load_json(filename):
    if (len(filename) == 0):
        raise FileNotFoundError()

    with open(filename, "r") as f:
        data = json.load(f)
        return data
