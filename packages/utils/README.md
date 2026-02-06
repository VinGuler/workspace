# @workspace/utils

Shared utility functions used across all apps in the workspace.

## What's in here

- `log(level, source, message)` — structured console logger with timestamps

## Usage

```ts
import { log } from '@workspace/utils';

log('info', 'my-app', 'Server started');
// [2026-02-06T12:00:00.000Z] [INFO] [my-app] Server started
```

## Adding utilities

Add new exports to `src/index.ts`. All apps that depend on `@workspace/utils` will pick them up after a rebuild.
