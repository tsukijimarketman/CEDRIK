#!/bin/bash
set -e

serv_all="all"
serv_main="main"
serv_kali="kali"

command_name=$0
is_down=0
is_build=0
action=""
service=$serv_all
declare -a docker_args
docker_args=()


function usage() {
    echo "Usage:"
    echo "    $command_name [Options] [ <Action> [Service] ] [ -- [Docker-Args] ]"
    echo ""
    echo "Script to start, restart, and stop the docker instances of CEDRIK service"
    echo ""
    echo "Options:"
    echo " -h, --help            Print this help message and exit"
    echo " -d, --down            Only for 'stop': uses 'docker compose down' instead of 'docker compose stop'"
    echo " -b, --build           Only for 'start' and 'restart': uses '--build' in 'docker compose up'"
    echo " --                    Values after this are appended to docker"
    echo ""
    echo "Actions:"
    echo " start <service>       Default. Starts a tmux session and runs 'docker compose up' to <service>. See Services below."
    echo " restart <service>     restarts <service> (restart + up if '-b' is provided). See Services below."
    echo " stop <service>        Stops the tmux session and runs 'compose stop' to <service>. See Services below."
    echo ""
    echo "Services:"
    echo " $serv_all    All the docker services"
    echo " $serv_main   The services located in CEDRIK/"
    echo " $serv_kali   The services located in cyber-education-platform/"
    echo ""
    echo "Note:"
    echo " 'start' action will switch to 'restart' if a tmux session already exists."
    echo ""
    echo "Examples"
    echo " $0"
    echo " $0 start main -b"
    echo " $0 restart"
    echo " $0 restart kali -b"
    echo " $0 restart kali -b -- web-ui bridge-server"
    echo " $0 stop -d"
}

while [[ $# -gt 0 ]]; do
    case $1 in
        "-h"|"--help")
            usage
            exit 0
            ;;
        "-d"|"--down")
            is_down=1
            shift
            ;;
        "-b"|"--build")
            is_build=1
            shift
            ;;
        "start"|"stop"|"restart")
            if [[ -n $action ]]; then
                echo "Action is already set"
                exit 1
            fi
            action=$1
            case $2 in
                "$serv_all"|"$serv_main"|"$serv_kali")
                    service=$2
                    shift
                    ;;
            esac
            shift
            ;;
        "--")
            shift
            docker_args=( "$@" )
            break
            ;;
        *)
            echo "Unknown option $1"
            exit 0
            ;;
    esac
done

if [[ -z $action ]]; then
    action="start"
fi

# echo "action $action"
# echo "down $is_down"
# echo "build $is_build"
# echo "service $service"
# echo "docker_args ${docker_args[@]}"
# ls ${docker_args[@]}
# exit 0

cd "$(dirname $0)/../"
cwd=$(pwd)
echo "Changing path to $cwd"

cedrik_service_ses_name=cedrik
d_cyber_education_platform=cyber-education-platform
window_1=main
window_2=kaligpt
window_3=util
session_exists="$(tmux list-session 2>/dev/null | grep "$cedrik_service_ses_name" || true)"

if [[ ! -f "${cwd}/compose.yaml" || ! -f "${cwd}/${d_cyber_education_platform}/docker-compose.yml" ]]; then
    echo "${cwd}/compose.yaml or ${cwd}/${d_cyber_education_platform}/docker-compose.yml does not exist"
    exit 1
fi

function stop_service() {
    local stop_cmd="stop"
    if [[ $is_down -eq 1 ]]; then
        stop_cmd="down"
    fi

    if [[ $service == "$serv_all" || $service == "$serv_main" ]]; then
        echo "Stopping '$serv_main' service"
        cd "${cwd}" && docker compose $stop_cmd ${docker_args[@]}
    fi
    if [[ $service == "$serv_all" || $service == "$serv_kali" ]]; then
        echo "Stopping '$serv_kali' service"
        cd "${cwd}/${d_cyber_education_platform}" && docker compose $stop_cmd ${docker_args[@]}
    fi

    if [[ -z $session_exists ]]; then
        echo "Terminating TMUX $cedrik_service_ses_name session"
        tmux kill-session -t "$cedrik_service_ses_name"
    fi
}

function h_restart_service() {
    docker compose restart ${docker_args[@]}
    if [[ $is_build -eq 1 ]]; then
        docker compose up --build -d ${docker_args[@]}
    fi
}

function restart_service() {
    if [[ -z $session_exists ]]; then
        echo "Cannot restart. A tmux session does not exist"
        exit 1
    fi

    if [[ $service == "$serv_all" || $service == "$serv_main" ]]; then
        echo "Restarting '$serv_main' service"
        cd "${cwd}"
        h_restart_service
    fi

    if [[ $service == "$serv_all" || $service == "$serv_kali" ]]; then
        echo "Restarting '$serv_kali' service"
        cd "${cwd}/${d_cyber_education_platform}"
        h_restart_service
    fi
}

function start_service() {
    if [[ -n $session_exists ]]; then
        echo "TMUX Session already exist. Switching to restart process"
        restart_service
        return 0
    fi

    echo "Creating TMUX session $cedrik_service_ses_name"
    echo "Creating window $window_1 $window_2 $window_3"
    tmux new-session -d -c "$cwd" -s $cedrik_service_ses_name -n $window_1
    tmux new-window -c "$cwd/$d_cyber_education_platform" -t $cedrik_service_ses_name -n $window_2
    tmux new-window -c "$cwd" -t $cedrik_service_ses_name -n $window_3
    sleep .5

    local cmd="docker compose up"
    if [[ $is_build -eq 1 ]]; then
        cmd="$cmd --build"
    fi
    cmd="$cmd ${docker_args[@]}"

    if [[ $service == "$serv_all" || $service == "$serv_main" ]]; then
        echo "Starting $serv_main service"
        tmux send-keys -t "$cedrik_service_ses_name:$window_1" "$cmd" ENTER 2>/dev/null
        sleep .5
    fi

    if [[ $service == "$serv_all" || $service == "$serv_kali" ]]; then
        echo "Starting $serv_kali service"
        tmux send-keys -t "$cedrik_service_ses_name:$window_2" "$cmd" ENTER 2>/dev/null
        sleep .5
    fi
}

case $action in
    "stop")
        stop_service
        ;;
    "start")
        start_service
        ;;
    "restart")
        restart_service
        ;;
    *)
        echo "Unknown Action. See '$command_name -h' for the list of actions"
        exit 1
        ;;
esac
