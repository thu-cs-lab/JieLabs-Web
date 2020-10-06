#!/bin/sh
sudo docker build -t jielabs-backend .
sudo docker tag jielabs-backend:latest jiegec/jielabs-backend:latest
sudo docker push jiegec/jielabs-backend:latest
