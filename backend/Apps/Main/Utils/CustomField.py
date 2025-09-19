from mongoengine import EmailField, ValidationError

class CustomEmail(EmailField):
  def validate(self, value):
    try:
      super().validate(value)
    except ValidationError as _:
      raise ValidationError("Invalid Email Address")