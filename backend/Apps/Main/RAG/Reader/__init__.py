from typing import List
from .Base import *
from .PDF import *
from .Text import *

READERS: List[BaseRAG] = [
  PDF(),
  Text()
]