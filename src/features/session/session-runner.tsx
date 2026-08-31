"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import type { SessionView } from "./queries";
import { ensureSession, finishSession } from "./actions";
import { RestTimer } from "./rest-timer";
import { SetLogger } from "./set-logger";

export function SessionRunner({
  view,
  userProgramId,
  date,
}: {
  view: SessionView;
  userProgramId: string;
  date: string;
}) {
  const t = useTranslations("session");
  const [sessionId, setSessionId] = useState(view.sessionId);
  const [status, setStatus] = useState(view.status);
  const [pending, startTransition] = useTransition();

  if (view.exercises.length === 0) {
    return (
      <p className="rounded-xl border border-border bg-surface p-4 text-sm text-muted">
        {t("nothingScheduled")}
      </p>
    );
  }

  if (!sessionId) {
    return (
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await ensureSession({
              userProgramId,
              date,
              dayType: view.dayType,
            });
            if (result.sessionId) setSessionId(result.sessionId);
          })
        }
        className="w-full rounded-lg bg-accent px-4 py-3 text-base font-medium text-accent-fg disabled:opacity-60"
      >
        {t("start")}
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="sticky top-0 z-10 -mx-4 border-b border-border bg-background/95 px-4 py-2 backdrop-blur">
        <RestTimer />
      </div>

      {view.exercises.map((exercise) => (
        <SetLogger key={exercise.slug} sessionId={sessionId} exercise={exercise} />
      ))}

      {status === "done" ? (
        <p className="rounded-lg bg-accent/10 px-3 py-2 text-center text-sm text-accent">
          {t("finished")}
        </p>
      ) : (
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await finishSession(sessionId);
              if (!result.error) setStatus("done");
            })
          }
          className="rounded-lg border border-accent px-4 py-3 text-base font-medium text-accent disabled:opacity-60"
        >
          {t("finish")}
        </button>
      )}
    </div>
  );
}
