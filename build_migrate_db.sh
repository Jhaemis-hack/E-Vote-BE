#!/usr/bin/env bash

set -e  # Exit immediately if a command exits with a non-zero status

log_info() {
  echo "[INFO] $1"
}

log_error() {
  echo "[ERROR] $1"
}

log_info "Removing existing dist directory..."
rm -rf dist
rm -rf tsconfig.build.tsbuildinfo

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