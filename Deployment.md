# How To Deploy
## Requirements
- The server can be connected via ssh
- Disable password login. Logins must be via ssh only
- A user that is not root UID >=1000

## Environment
- OS - Linux
- User - must not be root
- Packages
    - Tmux
    - Nginx
    - Git
    - Crontab (optional)

# Setup the environment (debian / ubuntu)
```
sudo apt install -y nginx git tmux

# Log files for nginx
mkdir ~/logs/ && touch ~/logs/access.log && touch ~/logs/error.log
chmod 777 -R ~/logs/

# Util scripts for server management (add more if needed)
mkdir ~/tools/ && cd ~/tools/ && curl -O https://raw.githubusercontent.com/Mark-Asuncion/dotfiles/refs/heads/main/tools/bkp.sh
```

# Clone the repo
```
cd ~ && git clone https://github.com/tsukijimarketman/CEDRIK.git
cd CEDRIK
mkdir -m 777 hf_cache/
mkdir -m 777 log/

# copy the .env from Local to server
scp -i <ssh_key> <local_path_to_.env> <user>@<ip>:<path_to_CEDRIK_dir>

# edit .env SERVER_FRONTEND var to the ip of the server

cd cyber-education-platform/ && ln -sr ../.env ./.env && cd ~/CEDRIK
cd frontend/ && ln -sr ../.env ./.env && cd ~/CEDRIK
```
## Edit compose.yaml
uncomment all commands with `uwsgi` except for main service

# Setup nginx
## Copy nginx.conf (not the file in repo)
before copying fix the paths first
```
# From Local computer
scp -i <ssh_key> <local_path_to_nginx.conf> <user>@<ip>:/etc/nginx/nginx.conf
```

# Install the cedrik.service
- Before installing edit the file:
    - replace path with the correct path to the cloned repo
    - replace user with the UID of the created user or the current user if its not root. you can view the UID of the user with `cat /etc/passwd`
```
# Copy the contents of the file with your clipboard
# And paste after running the command
sudo systemctl edit --full --force cedrik.service
```
> if you have a preferred cli editor you can run with
> `sudo EDITOR=<editor> systemctl edit --full --force cedrik.service`
> example
> `sudo EDITOR=vim systemctl edit --full --force cedrik.service`

## enable the service
```
sudo systemctl enable cedrik.service
```
> the next time the server reboots it will start the docker services with this service

# Crontab (scheduler)
```
crontab -e
# or
EDITOR=<editor> crontab -e

# paste
0 12  * * 1   <home>/tools/bkp.sh -m /home/cedrik/logs/access.log
0 12  * * 1   <home>/tools/bkp.sh -m /home/cedrik/logs/error.log
# save the file and confirm with
crontab -l
```

# Running the applications
```
cd ~/CEDRIK/ && ./deployment/frontend.sh && ./deployment/run.sh
```
> run.sh will create a tmux session
> access it via `tmux a`
