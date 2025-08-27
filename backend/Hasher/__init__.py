import bcrypt

def hash(raw: str):
    hashed = bcrypt.hashpw(raw.encode(encoding="utf-8"), bcrypt.gensalt())
    return hashed.decode("utf-8")

def verify_password(hashed: str, raw: str):
    return bcrypt.checkpw(raw.encode(encoding="utf-8"), hashed.encode(encoding="utf-8"))
