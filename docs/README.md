# Documentation

| Document | What it's for |
|---|---|
| [`program/operation-6-weeks.md`](program/operation-6-weeks.md) | **The source of truth.** The training program itself. Every schedule rule, exercise, weight and progression rule in the app traces back to this file. |
| [`plan.md`](plan.md) | The technical plan — stack, data model, offline architecture, build phases, risks. Written before implementation. |
| [`architecture.md`](architecture.md) | How the code is actually organized, and why. Updated as the build progresses. |
| [`development.md`](development.md) | Setup, commands, environment variables, how to run tests. |
| [`decisions/`](decisions/) | Architecture decision records — one file per decision that would otherwise get re-litigated. |

## Reading order

New to the project: `program/operation-6-weeks.md` → `plan.md` → `development.md`.

Changing code: `architecture.md` → the relevant ADR in `decisions/`.

## A note on the program document

`operation-6-weeks.md` is written in Ukrainian and is treated as immutable input.
The app renders its content in both Ukrainian and English, but the Ukrainian
strings are the originals — if the two ever disagree, the program document wins.
