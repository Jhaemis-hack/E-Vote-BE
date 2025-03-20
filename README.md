# E-Vote Backend Integration Documentation

## Overview

A secure and scalable electronic voting backend service built with NestJS. This system enables secure election creation, management, and automated status updates.

## Folder Structure

```
src/
├── modules/         # Feature modules
├── migrations/      # Database migrations
├── schedule-tasks/  # Scheduled tasks for election updates
├── config/          # Configuration files
└── main.ts          # Application entry point
```

## Dependencies

### Main Dependencies
- Node.js
- NestJS framework
- TypeORM
- PostgreSQL
- Bull Queue
- JWT Authentication
- Swagger API Documentation

### Dev Dependencies
- TypeScript
- @nestjs/cli
- @nestjs/testing
- ESLint
- Other NestJS dependencies

## Getting Started

Before you begin, ensure you have the following installed on your machine:

- [Node.js](https://nodejs.org/) (v14 or later)
- [PostgreSQL](https://www.postgresql.org/)
- [npm](https://www.npmjs.com/) (Node Package Manager)
- [Git](https://git-scm.com/)

## Setup Guide

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/E-Vote-BE.git
cd E-Vote-BE
```

### 2. Install Dependencies
## Install dependencies

```bash
npm install
```
## Build the application

```bash
npm run build
```
### 3. Configure Environment Variables

```bash
# Set up environment variables
cp .env.example .env
# Edit .env with your configuration details
```

### 4. Database Setup

```bash
# Initialize the database
npm run reset:db

# Run migrations
npm run migration:run

# Seed the database
npm run seed
```

### 5. Run the Application

```bash
# development
npm run start

# watch mode
npm run start:dev

# production mode
npm run start:prod
```

### 6. Verify the Setup

Access the Swagger documentation to verify that the application is running:
- Local: `http://localhost:3000/api/docs`
- Deployed: `https://api.resolve.vote/api/docs#/`

## Scripts

- `npm run start` - Start the development server
- `npm run start:dev` - Start the development server in watch mode
- `npm run start:prod` - Start the production server
- `npm run lint` - Run ESLint to check code quality
- `npm run migration:generate` - Generate migrations
- `npm run migration:run` - Run migrations
- `npm run migration:revert` - Revert migrations
- `npm run reset:db` - Reset the database
- `npm run test` - Run unit tests
- `npm run test:e2e` - Run e2e tests
- `npm run test:cov` - Run tests with coverage

## Features

- User authentication and authorization
- Election creation and management
- Automated election status updates (upcoming → ongoing → completed)
- Email notifications with Nodemailer
- Background job processing with Bull
- API documentation with Swagger

## Testing

```bash
# unit tests
npm run test

# e2e tests
npm run test:e2e

# test coverage
npm run test:cov
```

## API Documentation

### Swagger Documentation

The API documentation is available through Swagger UI at:

```
http://localhost:3000/api/docs
```

For the deployed version:

```
https://api.resolve.vote/api/docs#/
```

## Contribution Guide

### Getting Started

If you don't have git on your machine, [install it](https://docs.github.com/en/get-started/quickstart/set-up-git).

### Fork this repository

Fork this repository by clicking on the fork button on the top of this page.
This will create a copy of this repository in your account.

### Clone the repository

```bash
git clone "url you just copied"
```

### Create a branch

```bash
cd E-Vote-BE
git switch -c your-new-branch-name
```

### Make Changes

Make your changes to the codebase. Ensure your code follows the project's coding standards and guidelines.

### Run Tests

```bash
npm run test
```

### Push changes to GitHub

```bash
git push -u origin your-branch-name
```

### Submit your changes for review into Staging

Go to your repository on GitHub, click on the "Compare & pull request" button, and submit the pull request.

## License

This project is licensed under the MIT License.

## Support

For support, please reach out to the project maintainers.