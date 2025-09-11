from enum import Enum
import mongoengine
from mongoengine import get_connection, get_db
from pymongo.database import Database
from pymongo.client_session import ClientSession
from typing import Tuple
from contextlib import contextmanager
from .Models import *
import os
from dotenv import load_dotenv
from pathlib import Path

from ..Logger import Logger

# Load environment variables from .env file
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(dotenv_path=env_path)

URI = os.getenv("CyberSync_DatabaseUri")

def db_connection_init():
    if not URI:
        raise ValueError("CyberSync_DatabaseUri is not set in the environment variables")
        
    Logger.log.info(f"Starting connection to database")
    mongoengine.connect(
        db="CyberSync",
        host=URI,
        tls=True,
        tlsAllowInvalidCertificates=True
    )
    init_indexes()
    # sslAllowInvalidCertificates=True
    # tls=True,
    # ssl=True


class Collections(Enum):
    USER = "user"
    AUDIT = "audit"

class Transaction:
    session: ClientSession = None
    def __enter__(self) -> Tuple [ ClientSession, Database ]:
        connection = get_connection()
        self.session: ClientSession = connection.start_session()
        print(connection, self.session)
        self.session.start_transaction()
        return self.session, get_db()
    
    def __exit__(self, ex_type, ex_value, traceback):
        if ex_type:
            self.session.abort_transaction()
            Logger.log.info(f"Transaction::{ex_type} {ex_value} {traceback}")
        else:
            self.session.commit_transaction()

        self.session.end_session()