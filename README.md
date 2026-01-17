# CEDRIK

This is a sample chatgpt clone llm to used in accordance on the task given

# Development
> make sure you have populated the .env first and created copies in
> `./cyber-education-platform/` and `./cyber-education-platform/web-ui/`
> Its recommended to hardlink the file in the subdirectories instead of copying

## SERVICE: Backend
> Optional if you want autocompletion in python for the lsp
```bash
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r all.requirements.txt
```

To run the backend it is recommended to run via docker see [Running The Services](#running-the-services)

## SERVICE: Frontend
```bash
npm i
npm run dev
```

## SERVICE: Kali (Cyber Education Platform)
see [Running The Services](#running-the-services)

# Running The Services
## Local
### Backend
run backend
```bash
docker compose -f compose.local.yaml up
```
### Frontend
```bash
npm run dev
```

### Kali
```bash
docker compose up
```

## Deployment
> If the `cedrik.service` is configured properly it should run the script so there is no need to run manually
```bash
./deployment/run.sh
```
The script creates a tmux session for user `uid=1000` with 3 windows see `./deployment/run.sh` script

### Restarting the services
Whenever there is an update run
```bash
# CEDRIK/ or cyber-education-platform/ directory depending on where the update is
docker compose up --build -d
```
