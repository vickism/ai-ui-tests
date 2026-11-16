# Releasing AI UI Tests

## Automatic release flow

1. Open a normal PR with a Conventional Commit title. CI runs audit, lint,
   TypeScript formatting and type checks, build, unit tests, and packaged CLI checks.
2. Squash-merge the PR using its title as the commit subject. Release Please runs
   on pushes to `main` and maintains one release PR containing the next version,
   the updated package lockfile, and `CHANGELOG.md`.
3. Review and merge that release PR. Release Please creates the `vX.Y.Z` tag and
   GitHub release. In the same workflow, preparation checks out that exact release
   commit, verifies its tag and ancestry on `main`, repeats all checks, rejects an
   already-published npm version, and uploads the checked archive and checksum.
4. Review the preparation summary and approve the pending `npm` deployment.
   A separate job publishes that archive with npm Trusted Publishing and provenance.

Version selection, the release PR, changelog, tag, and GitHub release are automatic.
Merging the release PR and approving npm publication remain maintainer decisions.
There is no version input or routine manual version bump.

Only the publishing job has `id-token: write`. It does not check out repository
code, install project dependencies, run lifecycle scripts, or rebuild the archive.
The release bot's private key stays in the metadata-only release job, which never
checks out repository code. Fork PRs receive neither credential.
Releases are serialized and an in-progress publication is not canceled.

## PR titles and version policy

| PR title                                            | Release impact before 1.0  |
| --------------------------------------------------- | -------------------------- |
| `fix: handle browser timeouts`                      | Patch, e.g. 0.1.0 to 0.1.1 |
| `fix(deps): update vulnerable runtime dependencies` | Patch                      |
| `feat: add a browser option`                        | Minor, e.g. 0.1.0 to 0.2.0 |
| `feat!: change the config format`                   | Minor while below 1.0      |
| `docs: explain authentication`                      | No release by itself       |
| `ci: improve workflow checks`                       | No release by itself       |

The PR title check also permits `style`, `refactor`, `perf`, `test`, `build`,
`chore`, and `revert`, with an optional scope and `!` breaking marker. Release
Please decides the release impact; for a user-facing fix or feature, use `fix` or
`feat`. Once at 1.0+, breaking changes bump major, features minor, and fixes patch.
The Node release strategy updates both package files. CLI `--version` reads the
installed package's version and the packed CLI check verifies that they agree.

## One-time GitHub setup

1. In repository **Settings ? General ? Pull Requests**, enable **Allow squash
   merging**, set its default commit message to **Pull request title**, and disable
   merge commits and rebase merging. This preserves the title used for versioning.
2. Protect `main` with required checks **Build and test** and **Conventional PR
   title**. Review workflow changes and limit write access to trusted people.
   The release App must use normal release PRs; do not give it a ruleset bypass.
3. Create a GitHub App in your account's **Settings ? Developer settings ? GitHub
   Apps**. Disable its webhook if you do not use one, restrict installation to your
   account, and grant these repository permissions:
   - **Contents: Read and write** (release branches, tags, and GitHub releases).
   - **Pull requests: Read and write** (release PRs).
   - **Issues: Read and write** (release labels).
     Install the App on **only `ai-ui-tests`**, then generate a private key.
4. In the repository's **Settings ? Secrets and variables ? Actions**, add:
   - Repository variable **`RELEASE_APP_ID`**: the App ID (not the installation ID).
   - Repository secret **`RELEASE_APP_PRIVATE_KEY`**: the generated PEM private key.
     Never commit the private key. The workflow creates a short-lived token limited
     to this repository and those three permissions, and revokes it after the job.
     Using an App ensures release PR changes trigger CI normally; pushes made with
     the default `GITHUB_TOKEN` would not trigger those workflows.
5. In repository **Settings ? Environments**, create **`npm`**:
   - Add **`vickism`** as the required reviewer.
   - Leave **Prevent self-review** disabled, so you can approve your own releases.
   - Disable administrator bypass.
   - Permit deployments from the **branch `main` only**, without a tag rule.
     The workflow itself runs on `main`; it checks out the tagged release SHA only
     in preparation. Creating a named environment does not configure approval rules.
     Required reviewers are available for public repositories on GitHub Free;
     private repositories have plan restrictions. Provenance requires a public repo.
6. Enable 2FA on your GitHub and npm accounts. Restrict npm maintainer access too.

The release job fails with an explanatory message until its App configuration is
present. Account settings are not applied by committing the workflow files.

## One-time npm setup

If the package does not exist yet, create the initial package from this project:

```sh
npm login
npm whoami
npm run audit
npm publish --access public
```

Confirm the npm username is **`vickism`**. The normal prepublish script builds and
tests. This bootstraps npm package settings; later versions use the workflow.

In **@vickism/ai-ui-tests ? Settings ? Trusted Publisher**, select GitHub Actions:

| Setting              | Value                                       |
| -------------------- | ------------------------------------------- |
| Organization or user | `vickism`                                   |
| Repository           | `ai-ui-tests`                               |
| Workflow filename    | `publish.yml`                               |
| Environment          | `npm`                                       |
| Allowed action       | Enable direct publishing with `npm publish` |

Do not store an `NPM_TOKEN` secret in GitHub. Trusted publishing requires npm
11.5.1+ and Node 22.14+; the workflow uses Node 24 and its bundled npm. Configuring
trusted publishing does not revoke existing npm tokens or manual publishing access.

## Baseline and first automated release

`.release-please-manifest.json` records **0.1.0** as the initial baseline.
`bootstrap-sha` in `release-please-config.json` is the existing main commit
**57eb4c025dbebd89db29a49264fc438fd3e116dc**. History through that commit is excluded
from the initial release calculation; subsequent Conventional Commits count.
Do not manually update the manifest after releases; Release Please maintains it.

After configuring the App and merging this setup, merge a `fix:` or `feat:` PR.
Review the bot's release PR, then merge it when ready and approve npm publication.

## Recovery

If npm publication fails after the GitHub release was created, check npm first:
a network error can occur after successful publication. To retry an unpublished
version, open **Actions ? Publish ? Run workflow**, choose **main**, and enter the
existing GitHub release tag in **retry_tag**, such as `v0.1.1`. Only `vickism` can
initiate or re-run manual dispatches. The workflow checks the tag's actual commit
and package version, reruns all checks, and waits for the same approval gate.
Published versions are rejected; prepare a new release for further changes.

Leaving `retry_tag` blank runs Release Please to synchronize its release PR. If it
creates no GitHub release, the preparation and publication jobs are skipped.

## Dependency maintenance

Audit failures block CI and release preparation. Type checking runs within
`npm run build` via `build:2-check-types`, or separately with `npm run check-types`.
The minimatch override for `@typescript-eslint/typescript-estree` selects 11.0.8+
for [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249). It applies
only to this lint dependency. Revisit it when typescript-eslint adopts a patched
version and validate lint, types, tests, and audit when changing it.

References: [Release Please action](https://github.com/googleapis/release-please-action),
[GitHub App tokens](https://github.com/actions/create-github-app-token),
[npm Trusted Publishing](https://docs.npmjs.com/trusted-publishers/), and
[environment protection](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments).
