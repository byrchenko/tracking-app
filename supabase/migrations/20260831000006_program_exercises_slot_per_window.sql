-- The program swaps one exercise for another mid-programme:
--   "Станова з гирею (тиждень 1–2) → Мах гирею (з тижня 3)"
--
-- Both occupy the *same* slot in the Day A order — they are the same movement
-- pattern at different stages, not two separate exercises to be done in
-- sequence. Modelling them as two rows sharing order_index but holding
-- complementary week windows is what keeps the ordering honest.
--
-- The original unique (program_day_id, order_index) made that impossible; the
-- seed failed against it with "ON CONFLICT DO UPDATE command cannot affect row
-- a second time". Including active_from_week allows one occupant of a slot per
-- week window, while still preventing two exercises claiming the same slot at
-- the same time.
alter table program_exercises
  drop constraint program_exercises_program_day_id_order_index_key;

alter table program_exercises
  add constraint program_exercises_slot_per_window_key
  unique (program_day_id, order_index, active_from_week);
