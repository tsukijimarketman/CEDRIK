import logging
from datetime import datetime
import os

os.makedirs("log", exist_ok=True)
TODAY = datetime.now().strftime("%Y-%m-%d")
FORMATTER = logging.Formatter("%(levelname)s %(asctime)s - %(message)s")

FILE_HANDLER = logging.FileHandler(os.path.join("log", f"{TODAY}.log"))
FILE_HANDLER.setFormatter(FORMATTER)
FILE_HANDLER.setLevel(logging.DEBUG)

CONSOLE_HANDLER = logging.StreamHandler()
CONSOLE_HANDLER.setLevel(logging.DEBUG)
CONSOLE_HANDLER.setFormatter(FORMATTER)

class Logger:
    log = logging.getLogger(f"{__name__}.logger")
    log.setLevel(logging.DEBUG)

    log.addHandler(FILE_HANDLER)
    log.addHandler(CONSOLE_HANDLER)
    # logging.basicConfig(
    #     filename=os.path.join("log", f"{TODAY}.log"),
    #     level=logging.DEBUG,
    #     format="%(levelname)s:%(asctime)s - %(message)s"
    # )
