#!/bin/bash

# 1. Install Dependencies
echo "Installing dependencies..."
npm install

# 2. Delete Migration Folders
echo "Deleting migration folders..."
rm -rf src/db/migrations dist/db/migrations

# 3. Delete tsconfig.build.tsbuildinfo
echo "Deleting tsconfig.build.tsbuildinfo..."
rm -f tsconfig.build.tsbuildinfo

# 4. Generate Migrations
echo "Generating migrations..."
npm run migration:generate

# 5. Check for Migrations and Run Accordingly
MIGRATION_FILES=$(ls src/db/migrations/*.ts 2>/dev/null | wc -l)

if [ "$MIGRATION_FILES" -eq 0 ]; then
  echo "No migrations generated. Starting server..."
  npm run start:dev
else
  echo "Migrations generated. Running migrations..."
  if npm run migration:run; then
    echo "Migrations ran successfully. Starting development server..."
    npm run start:dev
  else
    echo "Error running migrations. Exiting."
    exit 1  # Exit with a non-zero status to indicate an error
  fi
fi

echo "Setup completed."