# Database Migrations Guide

This project uses TypeORM migrations for database schema management. Migrations are automatically run when the application starts.

## How Migrations Work

1. When the application starts, all pending migrations are automatically applied.
2. This behavior is controlled by the `migrationsRun: true` setting in the database configuration.

## Creating New Migrations

When you need to create a new migration:

1. Make changes to your entity files
2. Run the migration generate command:
   ```
   npm run migration:generate -- migrations/MigrationName
   ```
3. Review the generated migration file in `src/migrations/`
4. The migration will be applied automatically the next time the application starts

## Manual Migration Commands

- **Generate a migration**:
  ```
  npm run migration:generate -- migrations/MigrationName
  ```

- **Run migrations manually**:
  ```
  npm run migration:run
  ```

- **Revert the last migration**:
  ```
  npm run migration:revert
  ```

## Configuration Files

- **src/migrations/migration.config.ts**: Contains the TypeORM DataSource configuration used for running migrations from the CLI
- **src/config/database.config.ts**: Contains the database configuration used by the application, including the migrations settings

Note: Make sure your database credentials are properly set in your `.env` file before running migrations.