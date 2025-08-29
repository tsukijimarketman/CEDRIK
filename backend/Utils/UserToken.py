class UserToken:
    def __init__(self, token):
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