from flask import Flask
from Logger import Logger

app = Flask(__name__)

@app.route("/")
def Root():
    return "<p>Hello, World!</p>"
