#!/bin/sh
set -v
git pull
cd frontend
yarn
yarn build
sudo cp -r build/* /srv/jielabsweb-frontend/
