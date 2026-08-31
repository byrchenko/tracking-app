# Branching and releases

## Branches

| Branch | Purpose | Release channel |
|---|---|---|
| `main` | Stable. Deploys to production. | `1.4.0`, `1.5.0`, … |
| `develop` | Integration branch — day-to-day work lands here. | `1.5.0-beta.1`, … |
| `feat/*`, `fix/*` | Short-lived, branched from `develop`. | none |

Normal flow: branch from `develop` → PR into `develop` → when a set of work is
ready, PR `develop` into `main`.

## Commit messages

[Conventional Commits](https://www.conventionalcommits.org/), enforced by
commitlint on a husky `commit-msg` hook. **semantic-release derives version bumps
from these**, so a commit that doesn't parse is one that silently won't release.

```
<type>(<scope>): <subject>
```

**Types:** `feat` `fix` `perf` `refactor` `docs` `test` `build` `ci` `chore` `revert`

**Scopes:** `chain` `session` `progression` `benchmarks` `progress` `sync`
`auth` `db` `i18n` `ui` `program` `deps` `release`

Examples:

```
feat(chain): add daily step entry
fix(progression): reset reps when stepping up the weight ladder
docs: record the offline sync decision
```

### How the version is decided

| Commit | Bump |
|---|---|
| `fix:` `perf:` `refactor:` `docs:` | patch |
| `feat:` | minor |
| `BREAKING CHANGE:` in the body, or `feat!:` | major |

`test:`, `chore:` and `ci:` do not trigger a release.

## Hooks

- **`pre-commit`** — typecheck, lint, unit tests. Roughly 6 seconds.
- **`commit-msg`** — commitlint.

To bypass in a genuine emergency: `git commit --no-verify`. CI still runs
everything, so this only defers the failure.

## Releasing

Releases are automatic. Pushing to `main` or `develop` runs semantic-release,
which reads the commits since the last tag and — if any of them warrant it —
bumps the version, writes `CHANGELOG.md`, tags, and creates a GitHub release.

It needs no secrets beyond the built-in `GITHUB_TOKEN`. Nothing is published to
npm; `package.json` is private and `@semantic-release/npm` runs with
`npmPublish: false` purely to keep the version field in sync.

The release commit is tagged `[skip ci]` so it doesn't retrigger the pipeline.
