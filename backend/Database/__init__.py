import mongoengine
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
