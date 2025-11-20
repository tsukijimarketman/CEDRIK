#!/bin/bash
set -e

# echo "Changing directory to /tmp/"
# cd /tmp/
#
# echo "Downloading frontend.tar"
# dist_frontend="https://github.com/tsukijimarketman/CEDRIK/releases/download/Test-Deployment/frontend.tar"
# wget $dist_frontend
# tar -xf ./frontend.tar
#
# echo "Moving /tmp/dist/ contents to /var/www/html/"
# chown -R 1000:1000 ./dist/
# sudo mv ./dist/* /var/www/html/
#
# echo "Cleaning up tmp files"
# rm -rf ./dist
# rm ./frontend.tar
#

imagename="build-frontend"

cwd=$(dirname $0)
echo "Changing path to $cwd"
cd "$cwd"
cwd=$(pwd)

echo "Building Dockerfile..."
docker build -t $imagename "$cwd/../frontend/"

echo "Creating Temp Container"
id=$(docker create $imagename)

if [[ -f ./frontend.tar ]]; then
    echo "Deleting ./frontend.tar"
    rm ./frontend.tar
fi
if [[ -d ./dist/ ]]; then
    echo "Deleting ./dist/"
    rm -rf ./frontend.tar
fi

echo "Copying /app/dist/ to host as $cwd/frontend.tar"
docker cp $id:/app/dist/ - > frontend.tar

echo "Deleting Temp Container and Image"
docker rm -v $id
docker image rm $imagename

echo "Extracting frontend.tar"
tar -xf frontend.tar

echo "Moving $cwd/dist/ contents to /var/www/html/"
if [[ -d /var/www/html/assets/ ]]; then
    sudo rm -rf /var/www/html/assets
fi
sudo mv ./dist/* /var/www/html/

echo "restarting nginx"
sudo systemctl restart nginx
