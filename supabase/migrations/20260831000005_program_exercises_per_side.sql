-- Several prescriptions in the program are per side, not per set:
--   "Зашагування на лаву — 3×10 на ногу"
--   "Тяга гирі в нахилі, одна рука — 3×10 на руку"
--   "Валіза-хода — 2×30 м на руку"
--
-- Without this flag, "3×10" reads as 30 reps when the program means 60, and the
-- session runner would prompt for half the work. Set logs still record one row
-- per side, so the flag only affects how targets are presented and totalled.
alter table program_exercises
  add column per_side boolean not null default false;

comment on column program_exercises.per_side is
  'When true, target_reps/target_distance_m apply to each side separately.';
