from datetime import datetime
from dataclasses import dataclass

@dataclass
class LabsSessionData:
  user_id: str
  session_id: str
  expiry: datetime
  refresh: bool = False
