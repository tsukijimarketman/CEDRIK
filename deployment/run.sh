#!/bin/bash
set -e

cd "$(dirname $0)/../"
cwd=$(pwd)
echo "Changing path to $cwd"

cedrik_service_ses_name=CedrikService

function dire() {
    if [[ ! -d $1 ]]; then
        echo "$1 directory do not exists"
        exit 1
    fi
}

d_cyber_education_platform=cyber-education-platform
d_deployment=deployment

dire $d_cyber_education_platform
dire $d_deployment

window_1=main
window_2=kaligpt
window_3=util

tmux_session="$(tmux list-session 2>/dev/null | grep "$cedrik_service_ses_name" || true)"

echo "Checking for existing TMUX session"
echo "===================="
if [[ -z $tmux_session ]]; then

    echo "Creating TMUX session $cedrik_service_ses_name"
    echo "Creating window $window_1 $window_2 $window_3"
    tmux new-session -d -c $cwd -s $cedrik_service_ses_name -n $window_1
    tmux new-window -c "$cwd/$d_cyber_education_platform" -t $cedrik_service_ses_name -n $window_2
    tmux new-window -c "$cwd/$d_deployment" -t $cedrik_service_ses_name -n $window_3

    echo "===================="
    echo "Running command in $window_1"
    tmux send-keys -t "$cedrik_service_ses_name:$window_1" "docker compose up" ENTER 2>/dev/null
    sleep .5

    echo "===================="
    echo "Running command in $window_2"
    tmux send-keys -t "$cedrik_service_ses_name:$window_2" "docker compose up" ENTER 2>/dev/null
    sleep .5

    echo "===================="
    echo "Running command in $window_3"
    tmux send-keys -t "$cedrik_service_ses_name:$window_3" "pwd" ENTER 2>/dev/null
    echo "===================="
else
    echo "TMUX session $cedrik_service_ses_name already exists"
    echo "Restarting services and deploying frontend"

    cmd_1="cd \"${cwd}\" && docker compose restart"
    cmd_2="cd \"${cwd}/${d_cyber_education_platform}\" && docker compose restart"
    cmd_3="${cwd}/${d_deployment}/frontend.sh"

    tmux send-keys -t "$cedrik_service_ses_name:$window_3" "$cmd_1 && $cmd_2 && $cmd_3" ENTER 2>/dev/null
    echo "Command exited with code $?"
fi

tmux list-session | grep $cedrik_service_ses_name
