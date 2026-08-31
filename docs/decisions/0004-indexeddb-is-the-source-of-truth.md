# 4. IndexedDB is the UI's source of truth

**Status:** accepted (design; implementation is phase 5) · **Date:** 2026-08-31

## Context

Sets get logged mid-workout — in a basement, on a walk, wherever reception is
bad. A logging action that waits on the network and fails loses the entry at
exactly the moment the user cannot retry.

## Decision

The UI reads and writes **Dexie (IndexedDB)**. The network is a background
detail. Mutations write to Dexie and append to an `outbox` in the same IndexedDB
transaction; a sync engine drains the outbox to Supabase and pulls deltas back.

- **Idempotency:** every record's primary key is a client-generated UUIDv7, so a
  retry after an ambiguous failure is an upsert, not a duplicate row.
- **Conflicts:** last-write-wins per row on `updated_at`.
- **Deletes:** soft (`deleted_at`), because a hard delete cannot be propagated to
  a device that was offline when it happened.
- **Triggers:** `online`, `visibilitychange`, a foreground interval, and app
  start.

## Why last-write-wins is correct here, not a shortcut

The data is single-writer-per-user. The realistic conflict is one person on two
devices editing the same set, where the later edit is the intended one. A CRDT
would add significant complexity to solve a problem this data shape does not have.

## Consequences

- **No Background Sync API** — Safari doesn't implement it, so on iPhone all sync
  is foreground-triggered. The UI must never show a "saved" state that implies
  the server has acknowledged.
- A failed-permanently outbox entry (4xx, RLS rejection) must move to a
  dead-letter list surfaced in Settings, or it blocks the queue forever.
- Phases 3–4 deliberately ship online-only. Building the offline layer under a
  settled data shape is far easier than building both at once, and the refactor
  stays contained to the query layer.
