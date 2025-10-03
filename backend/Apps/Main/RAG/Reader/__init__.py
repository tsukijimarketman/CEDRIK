from typing import List
from .Base import *
from .PDF import *
from .Text import *
from .PPT import *
from .Docx import *

READERS: List[BaseRAG] = [
  PDF,
  Docx,
  PPT,
  Text,
]