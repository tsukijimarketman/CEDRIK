#!/bin/bash
set -e

echo "Changing directory to /tmp/"
cd /tmp/

echo "Downloading frontend.tar"
dist_frontend="https://github.com/tsukijimarketman/CEDRIK/releases/download/Test-Deployment/frontend.tar"
wget $dist_frontend
tar -xf ./frontend.tar

echo "Moving /tmp/dist/ contents to /var/www/html/"
chown -R 1000:1000 ./dist/
sudo mv -r ./dist/* /var/www/html/

echo "Cleaning up tmp files"
rm -rf ./dist
rm ./frontend.tar
