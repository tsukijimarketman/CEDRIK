# CEDRIK

This is a sample chatgpt clone llm to used in accordance on the task given

# Run Backend

## Install Dependencies
On Windows
```
winget install llama.cpp
```
<br/>
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
then run backend
> match the ports to the one defined in .env
```
flask --app backend.Server.Main run --debug --port 5000
flask --app backend.Server.Encoder run --debug --port 5001
flask --app backend.Server.Model run --debug --port 5002
```