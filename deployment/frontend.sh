#!/bin/bash
set -e

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
    rm -rf ./dist/
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
