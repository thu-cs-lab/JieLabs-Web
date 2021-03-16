#!/bin/sh
# use with: DOCKER_ARGS="--build-arg https_proxy=proxy" REGISTRY=host:port ./build.sh 
set -e

cd backend
docker pull $REGISTRY/thu-cs-lab/jielabs-backend:builder || true
docker build --target builder --cache-from $REGISTRY/thu-cs-lab/jielabs-backend:builder $DOCKER_ARGS -t thu-cs-lab/jielabs-backend:builder .
docker tag thu-cs-lab/jielabs-backend:builder $REGISTRY/thu-cs-lab/jielabs-backend:builder
docker push $REGISTRY/thu-cs-lab/jielabs-backend:builder
docker pull $REGISTRY/thu-cs-lab/jielabs-backend:latest || true
docker build --cache-from $REGISTRY/thu-cs-lab/jielabs-backend:builder --cache-from $REGISTRY/thu-cs-lab/jielabs-backend:latest $DOCKER_ARGS -t thu-cs-lab/jielabs-backend:latest .
docker tag thu-cs-lab/jielabs-backend:latest $REGISTRY/thu-cs-lab/jielabs-backend:latest
docker push $REGISTRY/thu-cs-lab/jielabs-backend:latest
cd ..


cd frontend
docker pull $REGISTRY/thu-cs-lab/jielabs-frontend:wasm || true
docker build --target wasm --cache-from $REGISTRY/thu-cs-lab/jielabs-frontend:wasm $DOCKER_ARGS -t thu-cs-lab/jielabs-frontend:wasm .
docker tag thu-cs-lab/jielabs-frontend:wasm $REGISTRY/thu-cs-lab/jielabs-frontend:wasm
docker push $REGISTRY/thu-cs-lab/jielabs-frontend:wasm

docker pull $REGISTRY/thu-cs-lab/jielabs-frontend:builder || true
docker build --target builder --cache-from $REGISTRY/thu-cs-lab/jielabs-frontend:builder $DOCKER_ARGS -t thu-cs-lab/jielabs-frontend:builder .
docker tag thu-cs-lab/jielabs-frontend:builder $REGISTRY/thu-cs-lab/jielabs-frontend:builder
docker push $REGISTRY/thu-cs-lab/jielabs-frontend:builder

docker pull $REGISTRY/thu-cs-lab/jielabs-frontend:latest || true
docker build --cache-from $REGISTRY/thu-cs-lab/jielabs-frontend:builder --cache-from $REGISTRY/thu-cs-lab/jielabs-frontend:latest $DOCKER_ARGS -t thu-cs-lab/jielabs-frontend:latest .
docker tag thu-cs-lab/jielabs-frontend:latest $REGISTRY/thu-cs-lab/jielabs-frontend:latest
docker push $REGISTRY/thu-cs-lab/jielabs-frontend:latest
cd ..

