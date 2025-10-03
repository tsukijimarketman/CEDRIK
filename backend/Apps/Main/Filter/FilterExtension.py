from .Filter import Filter
from flask import Flask

class FilterExtension:
  def __init__(self, app: Flask | None = None):
    if app:
      self.init_app(app)

  def init_app(self, app: Flask):
    if not app or not isinstance(app, Flask):
        raise TypeError("Invalid Flask app instance.")

    app.extensions["m_filter"] = Filter()