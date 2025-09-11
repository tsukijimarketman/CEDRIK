from .UserToken import UserToken
from .CustomField import CustomEmail
import json

def load_json(filename):
    if (len(filename) == 0):
        raise FileNotFoundError()

    with open(filename, "r") as f:
        data = json.load(f)
        return data
