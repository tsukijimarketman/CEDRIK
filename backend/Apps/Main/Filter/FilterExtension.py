from .FilterService import FilterService
from flask import Flask

KEY = "cedrik-filter"

class FilterExtension:
  def __init__(self, app: Flask | None = None):
    if not app or not isinstance(app, Flask):
        raise TypeError("Invalid Flask app instance.")

    if app:
      self.init_app(app)

  def init_app(self, app: Flask):
    app.extensions[KEY] = FilterService()
