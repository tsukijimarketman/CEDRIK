#!/bin/bash
set -e

echo "CEDRIK Server Bootstrap script (Debian / Ubuntu)"

if [ "$(id -u)" -ne 0 ]; then
    echo "This script must be run as 'root' user"
    exit 1
fi

echo "Installing Packages:"
echo "    nginx"
echo "    git"
echo "    tmux"
echo "    ufw"
echo "    curl"
echo "    docker"
echo "    btop"

apt install -y nginx git tmux ufw curl btop
./insdocker.sh

cd ~

echo "Creating logs folder for nginx..."
if [[ ! -d "~/logs/" ]]; then
    mkdir ~/logs/
    touch ~/logs/access.log
    touch ~/logs/error.log
fi
chmod 777 -R ~/logs/

echo "Creating cache folder for nginx..."
if [[ ! -d "/data/nginx/cache" ]]; then
    mkdir -p /data/nginx/cache
fi

echo "Adding 'cedrik' user"
adduser --disabled-password \
    --comment "cedrik app" \
    --shell /bin/bash \
    --group \
    cedrik

echo "Adding groupd docker to cedrik"
usermod -aG docker cedrik

echo "Creating tools folder"
if [[ ! -d "~/tools/" ]]; then
    mkdir ~/tools/
if

echo "Installing bkp.sh"
cd ~/tools/
curl -O https://raw.githubusercontent.com/Mark-Asuncion/dotfiles/refs/heads/main/tools/bkp.sh

echo "Creating crontab entries"
tmp_file=$(mktemp)
crontab -l 2>/dev/null > $tmp_file
tee -a $tmp_file <<EOF
0 12  * * 1   /root/tools/bkp.sh -m /root/logs/access.log
0 12  * * 1   /root/tools/bkp.sh -m /root/logs/error.log

EOF
cat $tmp_file | crontab -
rm $tmp_file
cd ~

echo "Creating tmux.conf"
touch /home/cedrik/.tmux.conf
tee "/home/cedrik/.tmux.conf" <<EOF
set -s default-terminal 'xterm-256color'
set -ag terminal-overrides ",xterm-256color:Tc"
set -g base-index 1
set -g mouse 'on'
set -g mode-keys 'vi'

bind-key -T copy-mode-vi y send-keys -X copy-pipe-and-cancel
bind-key -T copy-mode-vi Y send-keys -X copy-pipe-end-of-line-and-cancel
bind-key -T copy-mode-vi v send-keys -X begin-selection
EOF
chown cedrik:cedrik "/home/cedrik/.tmux.conf"

echo "Cloning the repo"
cd /home/cedrik/
sudo -u cedrik git clone https://github.com/tsukijimarketman/CEDRIK.git
cd ./CEDRIK/
sudo -u cedrik mkdir -m 777 hf_cache/
sudo -u cedrik mkdir -m 777 log/
cd ~

echo "Installing cedrik service"
if [[ ! -f "/etc/systemd/system/cedrik.service" ]]; then
    cp /home/cedrik/deployment/cedrik.service /etc/systemd/system/
    chown root:root /etc/systemd/system/cedrik.service
fi
systemctl daemon-reload

echo "Setting up Firewall"
ufw default deny incoming
ufw allow in ssh
ufw allow in https
ufw enable
ufw status verbose


echo "Firewall(UFW) WARN: Configure ssh to allow specific ip address only"
echo ""

echo "Nginx"
echo "Please copy the nginx.conf to /etc/nginx/nginx.conf"
echo ""

echo "CEDRIK Docker Images"
echo "Before building the images. Please copy the .env files into:"
echo "    CEDRIK/"
echo "    cyber-education-platform/"
echo "    web-ui/"
echo "    frontend/"
echo "Make sure the paths are configured and do not softlink the file"
