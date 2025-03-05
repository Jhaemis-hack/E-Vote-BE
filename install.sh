#!/bin/bash

# Set environment variables
PROFILE=local
NODE_ENV=development
DATABASE_HOST=localhost
DATABASE_USERNAME=evote
DATABASE_PASSWORD="mypassword"
DATABASE_PORT=5432
DATABASE_NAME=evote_db
ENV_FILE=".env"
PORT=3300

# Update and install PostgreSQL
echo "Updating package list and installing PostgreSQL..."
sudo apt update
sudo apt install -y postgresql postgresql-contrib

# Start PostgreSQL service
echo "Starting PostgreSQL service..."
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Switch to the postgres user and create the database and user
echo "Creating PostgreSQL user and database..."
sudo -u postgres psql <<EOF
CREATE DATABASE $DATABASE_NAME;
CREATE USER $DATABASE_USERNAME WITH ENCRYPTED PASSWORD '$DATABASE_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE $DATABASE_NAME TO $DATABASE_USERNAME;
EOF

# Add credentials to .env file
echo "Saving credentials to $ENV_FILE..."
cat <<EOL > $ENV_FILE
PROFILE=local
NODE_ENV=development
DATABASE_HOST=localhost
DATABASE_USERNAME=evote
DATABASE_PASSWORD="mypassword"
DATABASE_PORT=5432
DATABASE_NAME=evote_db
ENV_FILE=".env"
PORT=3300
EOL

echo "Installation complete! Credentials saved in $ENV_FILE."
