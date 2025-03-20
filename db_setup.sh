#!/usr/bin/env bash

set -e  # Exit immediately if a command exits with a non-zero status

log_info() {
  echo "[INFO] $1"
}

log_error() {
  echo "[ERROR] $1"
}

log_info "Updating package lists and installing PostgreSQL..."
if ! command -v psql > /dev/null; then
  sudo apt-get update
  sudo apt-get install -y postgresql postgresql-contrib
else
  log_info "PostgreSQL is already installed."
fi

log_info "Starting PostgreSQL service..."
sudo service postgresql start

log_info "Creating PostgreSQL user and database if they do not already exist..."
sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='evote'" | grep -q 1 || sudo -u postgres psql -c "CREATE USER evote WITH PASSWORD 'evote';"
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='evote_db'" | grep -q 1 || sudo -u postgres psql -c "CREATE DATABASE evote_db OWNER evote;"

log_info "Script execution completed."
