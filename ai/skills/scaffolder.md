# Skill: Scaffolder

## Purpose

The Scaffolder skill automates the process of creating new applications within the `/apps` directory from the "Gold Master" templates located in `/templates`. This ensures new projects adhere to the monorepo's standards and are immediately buildable and runnable.

## Workflow & Actions

The Scaffolder performs the following steps to create a new application:

1.  **Select Template**: Identifies the desired template from `/templates/<tier>` (e.g., `templates/client-server`).
2.  **Copy Core Files**: Copies all necessary files and directories from the chosen template into a new application directory within `/apps` (e.g., `apps/my-new-app`).
3.  **Update `package.json`**:
    - Renames the `name` field in the new application's `package.json` to reflect the new app name (e.g., `@workspace/my-new-app`).
    - Updates any internal `@workspace` dependencies to correctly point to shared packages.
    - Ensures external dependencies are correctly defined.
4.  **Update Workspace Configurations**:
    - Modifies the root `pnpm-workspace.yaml` to include the new application in the workspace.
    - Updates `tsconfig.json` paths or other workspace-level configurations if required, to ensure proper TypeScript resolution and project recognition.
5.  **Inject Local Scripts**: Adds or modifies necessary scripts within the new application's `package.json` (e.g., `dev`, `build`, `test`, `lint` commands specific to the app).
6.  **Install Dependencies**: Runs `pnpm install` at the workspace root to resolve and link all dependencies for the newly added application.
7.  **Verify Build**: Executes `pnpm run build:<new-app>` to ensure the new application builds successfully and integrates correctly into the Turborepo graph.

## Inputs

- **`templateName`**: The name of the template to use (e.g., `client-server`).
- **`appName`**: The desired name for the new application (e.g., `my-new-app`). This will also determine its package scope (e.g., `@workspace/my-new-app`).

## Outputs

- A new, fully configured application directory within `/apps`.
- Updated workspace configuration files (e.g., `pnpm-workspace.yaml`).
- A buildable and runnable application, verified post-scaffolding.

## Usage Example

`gemini-cli skill run scaffolder --templateName=client-server --appName=my-new-app`
(Note: Actual command structure will depend on the skill implementation.)

## Notes

- The Scaffolder ensures that new applications immediately benefit from the monorepo's shared tooling and standards.
- It significantly reduces manual setup and potential configuration errors.
