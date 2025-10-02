# CEDRIK

This is a sample chatgpt clone llm to used in accordance on the task given

# Run Backend

## Install Dependencies
```
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

## Run Backend
On powershell
```
.\RunBackend.ps1
```

## Docker
### Backend
build service `backend`
> No need to rebuild `backendbase` the latest image is uploaded to dockerhub
```
docker compose --profile backend build
```
run backend
```
docker compose --profile llama up
```
### Frontend
```
docker compose  --profile frontend up
```
### All runnables
```
docker compose --profile llama --profile frontend up
```
