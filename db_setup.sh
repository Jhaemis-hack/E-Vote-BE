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
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='evotedb'" | grep -q 1 || sudo -u postgres psql -c "CREATE DATABASE evotedb OWNER evote;"

log_info "Exporting environment variables for database connection..."
export DB_HOST=localhost
export DB_PORT=5432
export DB_USERNAME=evote
export DB_PASSWORD=evote
export DB_NAME=evotedb

log_info "Building the project..."
npm run build

log_info "Running migration:generate..."
npm run migration:generate
generate_exit_code=$?

if [ $generate_exit_code -ne 0 ]; then
  log_error "migration:generate failed, but continuing..."
fi

log_info "Running migration:run..."
npm run migration:run
run_exit_code=$?

if [ $run_exit_code -eq 0 ]; then
  log_info "Migration completed successfully. Running setup commands..."

  log_info "Setup commands executed successfully. Deleting db/ directory..."
  rm -rf src/db/migrations
  log_info "src/db/migrations directory deleted successfully."
else
  log_error "Migration failed, but script will continue..."
fi

log_info "Starting the application in production mode..."
npm run start:prod

log_info "Script execution completed."
