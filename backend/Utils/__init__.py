from mongoengine import ValidationError

def validate_password(password: str):
    upperCount = 0
    numCount = 0
    specialCount = 0

    num = {
        "min": ord('0'),
        "max": ord('9'),
    }

    upper = {
        "min": ord('A'),
        "max": ord('Z'),
    }

    lower = {
        "min": ord('a'),
        "max": ord('z'),
    }

    for i in range(len(password)):
        asciiCode = ord(password[i]);
        if (asciiCode >= num["min"] and asciiCode <= num["max"]):
            numCount+=1
        elif (asciiCode >= upper["min"] and asciiCode <= upper["max"]):
            upperCount+=1
        elif (not (asciiCode >= lower["min"] and asciiCode <= lower["max"])):
            specialCount+=1;

    errors = [];

    if (numCount < 1):
        errors.append("Must contain at least 1 number");
    if (upperCount < 1):
        errors.append("Must contain at least 1 uppercase character");
    if (specialCount < 1):
        errors.append("Must contain at least 1 special character");

    if len(errors) == 0:
        return

    raise ValidationError('\n'.join(errors))
