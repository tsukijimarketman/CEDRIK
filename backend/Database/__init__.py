import mongoengine
import os

from ..Logger import Logger
URI = os.getenv("CyberSync_DatabaseUri")

def db_connection_init():
    Logger.log.info(f"Starting connection to {URI}")
    mongoengine.connect(
        db="CyberSync",
        host=URI,
        tls=True,
        tlsAllowInvalidCertificates=True
    )
    # sslAllowInvalidCertificates=True
    # tls=True,
    # ssl=True
