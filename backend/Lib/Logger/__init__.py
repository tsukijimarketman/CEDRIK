import logging
from logging.handlers import TimedRotatingFileHandler
from datetime import datetime
from .ColorFormatter import ColorFormatter
import os

os.makedirs("log", exist_ok=True)
TODAY = datetime.now().strftime("%Y-%m-%d")
FORMAT_STR = "%(levelname)s %(asctime)s [%(filename)s:%(lineno)d] - %(message)s"
FORMATTER = logging.Formatter(FORMAT_STR)

FILE_HANDLER = TimedRotatingFileHandler(
    filename=os.path.join("log", "app.log"),
    when="midnight",
    interval=1,
    encoding="utf-8",
    utc=False
)
FILE_HANDLER.setFormatter(FORMATTER)
FILE_HANDLER.setLevel(logging.DEBUG)

CONSOLE_HANDLER = logging.StreamHandler()
CONSOLE_HANDLER.setLevel(logging.DEBUG)
CONSOLE_HANDLER.setFormatter(ColorFormatter(FORMAT_STR))

class Logger:
    log = logging.getLogger(f"{__name__}")
    log.setLevel(logging.DEBUG)

    log.addHandler(FILE_HANDLER)
    log.addHandler(CONSOLE_HANDLER)
    # logging.basicConfig(
    #     filename=os.path.join("log", f"{TODAY}.log"),
    #     level=logging.DEBUG,
    #     format="%(levelname)s:%(asctime)s - %(message)s"
    # )
