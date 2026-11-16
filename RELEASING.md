# Releasing AI UI Tests

## Workflows

- **CI** runs on pull requests targeting `main` and pushes to `main`. It installs the
  lockfile dependencies, runs `npm run audit`, builds (including lint, TypeScript formatting and type
  checks), runs the unit tests, checks the npm package contents, and exercises
  `--help` and `init` from the packed CLI. It has read-only repository permissions.
- **Publish** runs manually from `main`, in `vickism/ai-ui-tests`, initiated and
  re-run only by `vickism`. Enter the version already committed in `package.json`.
  Stable versions only are supported; published versions are rejected. Preparation
  repeats CI checks and uploads the checked archive and its checksum. A separate
  job waits for the `npm` environment before publishing that archive with OIDC.

Audit failures block both workflows. Type checking runs as part of `npm run build`
via `build:2-check-types`; it can also be run locally with `npm run check-types`.

The `package.json` override for `@typescript-eslint/typescript-estree` selects
minimatch 11.0.8+ because its upstream minimatch 10 dependency is affected by
[GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249).
The override applies only to this lint dependency, not the older minimatch APIs
used by other tools. Revisit it when typescript-eslint adopts a patched version;
run lint, type checks, tests, and audit when updating it.

Only the publish job can request an OIDC token. It does not check out source,
install project dependencies, run lifecycle scripts, or rebuild the archive.
Publishing is serialized and does not cancel a release already in progress.
Actions are pinned to commit hashes; review dependency updates before merging.

## One-time account setup

Workflow YAML does not create approval rules. Configure these settings **before
running Publish**; an environment created implicitly has no approval protection.
The workflow requests npm provenance, so use a public GitHub repository for releases.

1. In GitHub **Settings → Environments**, create `npm`.
   - Add `vickism` as its required reviewer.
   - Leave **Prevent self-review** disabled so you can approve your own release.
   - Disable administrator bypass.
   - Allow deployment from the branch `main` only (no tag rule).
   - Required reviewers are available on GitHub Free for public repositories.
     Private repositories have plan restrictions; do not assume approval is
     enforced if GitHub does not offer this setting.
2. Protect `main` with a ruleset that requires the **Build and test** CI check.
   Review workflow changes before merging, limit write access to trusted people,
   and enable 2FA on your GitHub and npm accounts.
3. If the npm package does not exist yet, publish the initial version locally:

   ```sh
   npm login
   npm whoami
   npm publish --access public
   ```

   Confirm the logged-in npm account is `vicksim`. This creates the package;
   workflow releases start with the next version. The normal prepublish script
   builds and tests before the initial manual publish.

4. In the npm package's **Settings → Trusted Publisher**, configure GitHub Actions:

   | Setting              | Value                                       |
   | -------------------- | ------------------------------------------- |
   | Organization or user | `vickism`                                   |
   | Repository           | `ai-ui-tests`                               |
   | Workflow filename    | `publish.yml`                               |
   | Environment          | `npm`                                       |
   | Allowed action       | Enable direct publishing with `npm publish` |

   Use the exact environment name in both services. Do not add an `NPM_TOKEN`
   secret. Trusted publishing needs npm 11.5.1+ and Node 22.14+; the workflow uses
   Node 24 with its bundled npm. Keep npm package maintainer access restricted too;
   trusted publishing does not revoke existing tokens or manual publishing access.

References: [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/),
[GitHub environment protection](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments).

## Each workflow release

1. Update the version and lockfile, for example:

   ```sh
   npm version patch --no-git-tag-version
   ```

2. Commit and push the version change to `main`; confirm CI passes.
3. Open **Actions → Publish → Run workflow**. Select `main` and enter the exact
   version, without a `v` prefix. A non-main run or another initiating user is skipped.
4. After preparation passes, inspect the commit, archive checksum, and artifact
   in the run summary. Approve the pending `npm` environment deployment.
5. Check the publish job and the package version on npm. The workflow does not
   create a GitHub release, tag, version commit, or automatic version bump.

If preparation fails, nothing is published. An existing version cannot be reused.
If publishing reports an error, check npm before retrying: a failed run can have
published successfully before a later error. Bump the version for a new release.
