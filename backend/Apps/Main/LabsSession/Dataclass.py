from datetime import datetime
from dataclasses import dataclass

@dataclass
class LabsSessionData:
  uid: str
  sid: str
  expiry: datetime
  refresh: bool = False
