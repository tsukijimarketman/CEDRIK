class UserToken:
    id = None
    aud = ""
    username = ""
    email = ""
    def __init__(self, token):
        if token == None:
            return

        # Copy constructor
        if isinstance(token, UserToken):
            self.id = token.id
            self.aud = token.aud
            self.username = token.username
            self.email = token.email
            return

        self.id = token["id"]
        self.aud = token["aud"]
        self.username = token["username"]
        self.email = token["email"]

def get_token_from(flask_global):
    if hasattr(flask_global, "user_token"):
        return UserToken(flask_global.user_token)
    return None