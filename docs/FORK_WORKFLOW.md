# Self-hosted Fork Workflow

This document records the fork-specific workflow for CyberChef. Keep these instructions separate from upstream feature documentation.

## Environment ownership

- The devcontainer owns dependency installation, checks, tests, and production builds.
- Windows is used only for the local Wrangler preview server.
- Use Node.js `>=24 <25` in both environments. The repository's devcontainer is based on Node 24.
- Do not run `npm install`, `npm test`, or a production build in the Windows host checkout.

## Start the devcontainer

From the repository root, start the configured devcontainer with the existing `up` helper. In automation shells where that helper is unavailable, use the equivalent command:

```text
devcontainer up --workspace-folder .
```

Run commands in the container, for example:

```text
devcontainer exec --workspace-folder . npm test
```

The container's post-create setup installs dependencies into its dedicated `node_modules` volume.

## Checks and operations

Run these inside the devcontainer:

```text
npm test
npm run lint
```

For a new operation, use `npm run newop`, implement the source under `src/core/operations/`, add its category in `src/core/config/Categories.json`, and add tests under `tests/operations/tests/`. Self-hosted operations belong in the `Custom Extension` category.

## Cloudflare build

The preview and Cloudflare deployment serve `deploy/cyberchef`, not `build/prod`. Always use the fork's deployment build:

```text
npm run build:deploy
```

This runs the upstream production build, verifies the expected Windows-mounted-filesystem `chmod` failure when it occurs, and prepares `deploy/cyberchef` with the files that Wrangler serves. Running only `npm run build` updates `build/prod` but leaves the preview stale.

Before rebuilding, stop the Windows Wrangler preview. `prepareCloudflare.mjs` replaces the `deploy` directory, and an active `workerd` process can lock it and cause `EACCES`. Start exactly one preview instance after the build finishes.

The external deployment command is:

```text
npm run deploy
```

Run it only when deployment is explicitly intended. It runs `build:deploy` and then `wrangler deploy` using `wrangler.jsonc`.

## Windows preview

After `npm run build:deploy` completes, start one Node 24 Wrangler process from the Windows checkout:

```text
npx --yes wrangler@4.122.0 dev --ip 127.0.0.1 --port 8080
```

Open the self-hosted app at `http://127.0.0.1:8080/cyberchef/`. If the page is stale, first verify that `deploy/cyberchef/assets/main.js` is newer than `build/prod/assets/main.js` and contains the changed operation, then reload the page. If 8080 has multiple listeners, stop the duplicate Wrangler trees before rebuilding or restarting.
