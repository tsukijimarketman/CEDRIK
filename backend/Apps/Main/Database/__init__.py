import mongoengine
from mongoengine import get_connection, get_db
from pymongo.database import Database
from pymongo.client_session import ClientSession
from typing import Tuple
from backend.Apps.Main.Database.Models import *
from backend.Lib.Logger import Logger
from backend.Lib.Config import DATABASE_URI

def db_connection_init():
    if not DATABASE_URI:
        raise ValueError("CyberSync_DatabaseUri is not set in the environment variables")
        
    Logger.log.info(f"Starting connection to database")
    mongoengine.connect(
        db="CyberSync",
        host=DATABASE_URI,
        tls=True,
        tlsAllowInvalidCertificates=True,
        connect=False
    )
    init_indexes()
    # sslAllowInvalidCertificates=True
    # tls=True,
    # ssl=True

class Transaction:
    session: ClientSession = None
    def __enter__(self) -> Tuple [ ClientSession, Database ]:
        connection = get_connection()
        self.session: ClientSession = connection.start_session()
        self.session.start_transaction()
        return self.session, get_db()
    
    def __exit__(self, ex_type, ex_value, traceback):
        if ex_type:
            self.session.abort_transaction()
            Logger.log.info(f"Transaction::{ex_type} {ex_value} {traceback}")
        else:
            self.session.commit_transaction()

        self.session.end_session()
