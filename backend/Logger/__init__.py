import logging
from logging.handlers import TimedRotatingFileHandler
from datetime import datetime
import os

os.makedirs("log", exist_ok=True)
TODAY = datetime.now().strftime("%Y-%m-%d")
FORMATTER = logging.Formatter("%(levelname)s %(asctime)s - %(message)s")

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
CONSOLE_HANDLER.setFormatter(FORMATTER)

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
