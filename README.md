# CEDRIK

This is a sample chatgpt clone llm to used in accordance on the task given

# Run Backend

## Install Dependencies

```
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

## Run
Before running activate venv
```
.\.venv\Scripts\Activate.ps1 
# or if in bash
source .\.venv\Scripts\activate
```
then
```
flask --app backend run --debug
```