from dataclasses import fields, MISSING

def get_schema_of_dataclass(class_name):
  """
  Returns the schema of `class_name`

  Return:
    `dict`
  """
  out = {}
  for f in fields(class_name):
    required = f.default is MISSING and f.default_factory is MISSING

    ftype = str(f.type) if hasattr(f.type, '__origin__') else f.type.__name__
    out[f.name] = {
      "type": ftype,
      "required": required
    }
  return out