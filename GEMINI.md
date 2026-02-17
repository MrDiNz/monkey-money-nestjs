//# Gemini Code Assistant Context

This document provides context for the Gemini code assistant to understand the project structure, conventions, and common tasks.

## Project Overview

This is a backend application built with the [NestJS](https://nestjs.com/) framework using TypeScript. Based on the file structure, the primary purpose of this project is to provide a RESTful API for user management.

The main application logic is structured into modules, with a `UserModule` handling user-related features. The `UserController` defines the API endpoints (e.g., for creating, reading, updating, and deleting users), and the `UserService` contains the business logic for these operations.

## Building and Running

The project uses `pnpm` as the package manager.

- **Install dependencies:**
  ```bash
  pnpm install
  ```

- **Run the application in development mode (with watch):**
  ```bash
  pnpm run start:dev
  ```
  The application will be available at `http://localhost:3000`.

- **Build the application for production:**
  ```bash
  pnpm run build
  ```

- **Run the application in production mode:**
  ```bash
  pnpm run start:prod
  ```

## Testing

The project uses [Jest](https://jestjs.io/) for testing.

- **Run unit tests:**
  ```bash
  pnpm run test
  ```

- **Run end-to-end (e2e) tests:**
  ```bash
  pnpm run test:e2e
  ```

- **Generate a test coverage report:**
  ```bash
  pnpm run test:cov
  ```

## Development Conventions

- **Code Formatting:** The project uses [Prettier](https://prettier.io/) for code formatting. To format the code, run:
  ```bash
  pnpm run format
  ```

- **Linting:** The project uses [ESLint](https://eslint.org/) to identify and fix problems in the code. To lint the code, run:
  ```bash
  pnpm run lint
  ```
- **Framework CLI:** This project uses the NestJS CLI (`nest`) for generating new components. For example, to generate a new module:
  ```bash
  nest generate module <module-name>
  ```

## Development Workflow

This project follows a Test-Driven Development (TDD) approach.

1.  **Write/Edit Tests First:** Before writing or modifying any implementation code, corresponding unit or e2e tests must be created or updated.
2.  **Confirm Test Failure:** Run the tests to ensure they fail as expected.
3.  **Implement Code:** Write the implementation code required to make the tests pass.
4.  **Ensure 100% Linter Pass:** All code must pass the ESLint checks without any errors. Run `pnpm run lint` to verify.
5.  **Ensure 100% TypeScript Pass:** All code must pass TypeScript checks without any errors. Run `pnpm run build` to verify.
6.  **Refactor:** Refactor the code as needed, ensuring all tests continue to pass.
