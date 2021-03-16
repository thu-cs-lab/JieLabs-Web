#!/bin/sh
docker build -t thu-cs-lab/jielabs-backend .
docker tag thu-cs-lab/jielabs-backend:latest $REGISTRY/thu-cs-lab/jielabs-backend:latest
docker push $REGISTRY/thu-cs-lab/jielabs-backend:latest
