#!/usr/bin/env bash

sudo apt-get update
sudo apt-get install -y postgresql postgresql-contrib

sudo service postgresql start

sudo -u postgres psql -c "CREATE USER evote WITH PASSWORD 'evote';"
sudo -u postgres psql -c "CREATE DATABASE evotedb OWNER evote;"

export DB_HOST=localhost
export DB_PORT=5432
export DB_USERNAME=evote
export DB_PASSWORD=evote
export DB_NAME=evotedb

npm run build
npm run migration:generate
npm run migration:run
npm run start:prod
