#!/bin/sh
# use with: DOCKER_ARGS="--build-arg https_proxy=proxy" REGISTRY=host:port ./build.sh 
set -e

docker pull $REGISTRY/thu-cs-lab/jielabs-backend:builder || true
docker build --target builder --cache-from $REGISTRY/thu-cs-lab/jielabs-backend:builder $DOCKER_ARGS -t thu-cs-lab/jielabs-backend:builder .
docker tag thu-cs-lab/jielabs-backend:builder $REGISTRY/thu-cs-lab/jielabs-backend:builder
docker push $REGISTRY/thu-cs-lab/jielabs-backend:builder
docker pull $REGISTRY/thu-cs-lab/jielabs-backend:latest || true
docker build --cache-from $REGISTRY/thu-cs-lab/jielabs-backend:builder --cache-from $REGISTRY/thu-cs-lab/jielabs-backend:latest $DOCKER_ARGS -t thu-cs-lab/jielabs-backend:latest .
docker tag thu-cs-lab/jielabs-backend:latest $REGISTRY/thu-cs-lab/jielabs-backend:latest
docker push $REGISTRY/thu-cs-lab/jielabs-backend:latest
