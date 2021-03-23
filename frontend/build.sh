#!/bin/sh
set -e

docker pull $REGISTRY/thu-cs-lab/jielabs-frontend:wasm || true
docker build --target wasm --cache-from $REGISTRY/thu-cs-lab/jielabs-frontend:wasm $DOCKER_ARGS -t thu-cs-lab/jielabs-frontend:wasm .
docker tag thu-cs-lab/jielabs-frontend:wasm $REGISTRY/thu-cs-lab/jielabs-frontend:wasm
docker push $REGISTRY/thu-cs-lab/jielabs-frontend:wasm

docker pull $REGISTRY/thu-cs-lab/jielabs-frontend:builder || true
docker build --target builder \
  --cache-from $REGISTRY/thu-cs-lab/jielabs-frontend:wasm \
  --cache-from $REGISTRY/thu-cs-lab/jielabs-frontend:builder \
  --build-arg commit_sha=$CI_COMMIT_SHA \
  --build-arg sentry=$SENTRY \
  --build-arg backend=$BACKEND \
  --build-arg base=$BASE \
  $DOCKER_ARGS -t thu-cs-lab/jielabs-frontend:builder .
docker tag thu-cs-lab/jielabs-frontend:builder $REGISTRY/thu-cs-lab/jielabs-frontend:builder
docker push $REGISTRY/thu-cs-lab/jielabs-frontend:builder

docker pull $REGISTRY/thu-cs-lab/jielabs-frontend:latest || true
docker build \
  --cache-from $REGISTRY/thu-cs-lab/jielabs-frontend:wasm \
  --cache-from $REGISTRY/thu-cs-lab/jielabs-frontend:builder \
  --cache-from $REGISTRY/thu-cs-lab/jielabs-frontend:latest \
  --build-arg commit_sha=$CI_COMMIT_SHA \
  --build-arg sentry=$SENTRY \
  --build-arg backend=$BACKEND \
  --build-arg base=$BASE \
  $DOCKER_ARGS -t thu-cs-lab/jielabs-frontend:latest .
docker tag thu-cs-lab/jielabs-frontend:latest $REGISTRY/thu-cs-lab/jielabs-frontend:latest
docker push $REGISTRY/thu-cs-lab/jielabs-frontend:latest
