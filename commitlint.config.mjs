/**
 * Conventional Commits, enforced on commit-msg by husky.
 *
 * semantic-release derives version bumps from these types, so a commit that
 * doesn't parse is a commit that silently won't trigger a release.
 */
const config = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [
      2,
      "always",
      [
        "feat",
        "fix",
        "perf",
        "refactor",
        "docs",
        "test",
        "build",
        "ci",
        "chore",
        "revert",
      ],
    ],
    "scope-enum": [
      2,
      "always",
      [
        "chain",
        "session",
        "progression",
        "benchmarks",
        "progress",
        "sync",
        "auth",
        "db",
        "i18n",
        "ui",
        "program",
        "deps",
        "release",
      ],
    ],
    // Scopes are useful but not worth blocking a commit over.
    "scope-empty": [0],
    "subject-case": [2, "never", ["upper-case", "pascal-case", "start-case"]],
    "body-max-line-length": [0],
  },
};

export default config;
