-- Seed: ОПЕРАЦІЯ «БАЗА», the 42-day program.
--
-- Transcribed from docs/program/operation-6-weeks.md, which is the source of
-- truth. If the two ever disagree, the document wins.
--
-- Idempotent: re-running updates in place rather than duplicating. Rows are
-- referenced by slug throughout — no generated UUID is ever hardcoded, so this
-- file is safe to run against any environment.

-- ---------------------------------------------------------------------------
-- Program
-- ---------------------------------------------------------------------------
insert into programs (slug, name, duration_days, version)
values (
  'operation-base',
  '{"uk": "Операція «База»", "en": "Operation Base"}'::jsonb,
  42, 1
)
on conflict (slug) do update
  set name = excluded.name,
      duration_days = excluded.duration_days,
      version = excluded.version;

-- ---------------------------------------------------------------------------
-- Exercises
-- ---------------------------------------------------------------------------
-- `cues` carry the program's own safety language, shown in the session runner.
-- The app surfaces the document's words; it does not invent coaching advice.
insert into exercises (slug, name, cues, metric_type, is_bodyweight)
values
  ('kettlebell-deadlift',
   '{"uk": "Станова з гирею", "en": "Kettlebell deadlift"}'::jsonb,
   '{"uk": "Рух іде стегном, а не поперековим прогином.", "en": "Drive from the hips, not by arching the lower back."}'::jsonb,
   'reps_weight', false),

  ('kettlebell-swing',
   '{"uk": "Мах гирею", "en": "Kettlebell swing"}'::jsonb,
   '{"uk": "Рух іде стегном, а не поперековим прогином. Якщо після махів болить поперек — техніка неправильна, повертайся до станової.", "en": "Drive from the hips, not by arching the lower back. If your lower back hurts after swings, the technique is wrong — go back to deadlifts."}'::jsonb,
   'reps_weight', false),

  ('goblet-squat',
   '{"uk": "Присід із гирею до лавки (гоблет)", "en": "Goblet squat to bench"}'::jsonb,
   '{"uk": "Присідаєш до лавки, спина рівна.", "en": "Squat down to the bench, back flat."}'::jsonb,
   'reps_weight', false),

  ('floor-press',
   '{"uk": "Жим гантелей лежачи на підлозі", "en": "Dumbbell floor press"}'::jsonb, null,
   'reps_weight', false),

  ('australian-row',
   '{"uk": "Австралійська тяга під турніком", "en": "Australian row"}'::jsonb, null,
   'reps', true),

  ('dip-support-hold',
   '{"uk": "Утримання на брусах (руки прямі)", "en": "Dip support hold"}'::jsonb,
   '{"uk": "Руки прямі, плечі опущені.", "en": "Arms straight, shoulders down."}'::jsonb,
   'time', true),

  ('farmers-walk',
   '{"uk": "Фермерська хода", "en": "Farmer''s walk"}'::jsonb, null,
   'distance_weight', false),

  ('step-up',
   '{"uk": "Зашагування на лаву", "en": "Step-up to bench"}'::jsonb, null,
   'reps_weight', false),

  ('kettlebell-row',
   '{"uk": "Тяга гирі в нахилі, одна рука", "en": "Single-arm kettlebell row"}'::jsonb, null,
   'reps_weight', false),

  ('incline-push-up',
   '{"uk": "Віджимання з упором на лаву", "en": "Incline push-up"}'::jsonb, null,
   'reps', true),

  ('romanian-deadlift',
   '{"uk": "Румунська тяга з гантелями", "en": "Romanian deadlift"}'::jsonb, null,
   'reps_weight', false),

  ('bar-hang',
   '{"uk": "Вис на турніку", "en": "Bar hang"}'::jsonb, null,
   'time', true),

  ('dead-bug',
   '{"uk": "«Мертвий жук»", "en": "Dead bug"}'::jsonb, null,
   'reps', true),

  ('suitcase-carry',
   '{"uk": "Валіза-хода (гиря в одній руці)", "en": "Suitcase carry"}'::jsonb, null,
   'distance_weight', false),

  -- Unlocked by progression rules 3 and 4, not scheduled from day one.
  ('negative-pull-up',
   '{"uk": "Негативні підтягування", "en": "Negative pull-up"}'::jsonb,
   '{"uk": "Стрибком угору, повільно вниз 5 сек.", "en": "Jump up, lower slowly over 5 seconds."}'::jsonb,
   'reps', true),

  ('negative-dip',
   '{"uk": "Повільні негативні віджимання на брусах", "en": "Negative dip"}'::jsonb, null,
   'reps', true),

  -- Walk days log duration rather than sets.
  ('walk',
   '{"uk": "Ходьба", "en": "Walk"}'::jsonb, null,
   'time', true),

  ('long-walk',
   '{"uk": "Довгий вихід", "en": "Long walk"}'::jsonb,
   '{"uk": "60 хв ходьби. З тижня 4 — 75–90 хв або рюкзак 8 кг.", "en": "60 min walking. From week 4 — 75-90 min, or an 8 kg pack."}'::jsonb,
   'time', true)
on conflict (slug) do update
  set name = excluded.name,
      cues = excluded.cues,
      metric_type = excluded.metric_type,
      is_bodyweight = excluded.is_bodyweight;

-- ---------------------------------------------------------------------------
-- Days
-- ---------------------------------------------------------------------------
insert into program_days (program_id, day_type, name)
select p.id, d.day_type, d.name
from programs p
cross join (values
  ('strength_a'::day_type, '{"uk": "Сила А", "en": "Strength A"}'::jsonb),
  ('strength_b'::day_type, '{"uk": "Сила Б", "en": "Strength B"}'::jsonb),
  ('walk'::day_type,       '{"uk": "Ходьба 40 хв", "en": "Walk 40 min"}'::jsonb),
  ('long_walk'::day_type,  '{"uk": "Довгий вихід", "en": "Long walk"}'::jsonb),
  ('rest'::day_type,       '{"uk": "Відпочинок", "en": "Rest"}'::jsonb)
) as d(day_type, name)
where p.slug = 'operation-base'
on conflict (program_id, day_type) do update
  set name = excluded.name;

-- ---------------------------------------------------------------------------
-- Prescriptions
-- ---------------------------------------------------------------------------
-- `progression` is interpreted by src/lib/progression. Shapes used here:
--
--   reps_then_weight  +repIncrement reps each week; on passing repCap, step up
--                     weightLadderKg and reset to target_reps
--   time_then_unlock  +secondsIncrement each week; at capSeconds the exercise
--                     is replaced by `unlock.replaceWith`
--   fixed             no automatic progression (carries, core, walks)
--
-- `requires` on an unlock expresses rule 3's second condition: negative pull-ups
-- need the bar hang at 60 s *and* australian rows at 3×15.

with prog as (select id from programs where slug = 'operation-base'),
     day as (
       select pd.id, pd.day_type
       from program_days pd join prog on pd.program_id = prog.id
     ),
     ex as (select id, slug from exercises)
insert into program_exercises (
  program_day_id, exercise_id, order_index,
  target_sets, target_reps, target_weight_kg, target_seconds, target_distance_m,
  per_side, active_from_week, active_to_week, progression
)
select day.id, ex.id, v.order_index,
       v.sets, v.reps, v.weight_kg, v.seconds, v.distance_m,
       v.per_side, v.from_week, v.to_week, v.progression::jsonb
from (values
  -- ===== ДЕНЬ А =====
  -- "Станова з гирею (тиждень 1–2) → Мах гирею (з тижня 3)" is modelled as two
  -- rows with complementary week windows rather than a special case in code.
  ('strength_a', 'kettlebell-deadlift', 1, 3, 10, 16.0, null, null, false, 1, 2,
   '{"type":"reps_then_weight","repIncrement":2,"cadence":"week","repCap":15,"weightLadderKg":[16,20]}'),
  ('strength_a', 'kettlebell-swing',    1, 5, 10, 16.0, null, null, false, 3, null,
   '{"type":"reps_then_weight","repIncrement":2,"cadence":"week","repCap":15,"weightLadderKg":[16,20],"stepUpWhen":"rpe_easy"}'),
  ('strength_a', 'goblet-squat',        2, 3,  8, 12.0, null, null, false, 1, null,
   '{"type":"reps_then_weight","repIncrement":2,"cadence":"week","repCap":15,"weightLadderKg":[12,16,20]}'),
  ('strength_a', 'floor-press',         3, 3, 10, 10.0, null, null, false, 1, null,
   '{"type":"reps_then_weight","repIncrement":2,"cadence":"week","repCap":15,"weightLadderKg":[10,12,15,20,25]}'),
  ('strength_a', 'australian-row',      4, 3,  8, null, null, null, false, 1, null,
   '{"type":"reps_then_weight","repIncrement":2,"cadence":"week","repCap":15,"weightLadderKg":[]}'),
  ('strength_a', 'dip-support-hold',    5, 3, null, null, 20, null, false, 1, null,
   '{"type":"time_then_unlock","secondsIncrement":5,"cadence":"week","capSeconds":60,"unlock":{"replaceWith":"negative-dip"}}'),
  ('strength_a', 'farmers-walk',        6, 2, null, 20.0, null, 40, false, 1, null,
   '{"type":"fixed"}'),

  -- ===== ДЕНЬ Б =====
  ('strength_b', 'step-up',             1, 3, 10, 10.0, null, null, true,  1, null,
   '{"type":"reps_then_weight","repIncrement":2,"cadence":"week","repCap":15,"weightLadderKg":[10,12,15,20]}'),
  ('strength_b', 'kettlebell-row',      2, 3, 10, 16.0, null, null, true,  1, null,
   '{"type":"reps_then_weight","repIncrement":2,"cadence":"week","repCap":15,"weightLadderKg":[16,20]}'),
  ('strength_b', 'incline-push-up',     3, 3, 10, null, null, null, false, 1, null,
   '{"type":"reps_then_weight","repIncrement":2,"cadence":"week","repCap":15,"weightLadderKg":[]}'),
  ('strength_b', 'romanian-deadlift',   4, 3, 10, 15.0, null, null, false, 1, null,
   '{"type":"reps_then_weight","repIncrement":2,"cadence":"week","repCap":15,"weightLadderKg":[15,20,25]}'),
  -- "3× макс": no rep target, held to failure. Progresses by unlocking, not by
  -- prescription, so target_seconds stays null.
  ('strength_b', 'bar-hang',            5, 3, null, null, null, null, false, 1, null,
   '{"type":"time_then_unlock","cadence":"week","capSeconds":60,"maxEffort":true,"unlock":{"replaceWith":"negative-pull-up","requires":[{"exercise":"australian-row","sets":3,"reps":15}]}}'),
  ('strength_b', 'dead-bug',            6, 3, 10, null, null, null, false, 1, null,
   '{"type":"fixed"}'),
  ('strength_b', 'suitcase-carry',      7, 2, null, 20.0, null, 30, true,  1, null,
   '{"type":"fixed"}'),

  -- ===== ХОДЬБА =====
  ('walk',      'walk',                 1, 1, null, null, 2400, null, false, 1, null,
   '{"type":"fixed"}'),
  -- "60 хв ходьби. З тижня 4 — 75–90 хв або рюкзак 8 кг."
  ('long_walk', 'long-walk',            1, 1, null, null, 3600, null, false, 1, 3,
   '{"type":"fixed"}'),
  ('long_walk', 'long-walk',            1, 1, null, null, 4500, null, false, 4, null,
   '{"type":"fixed","note":"75-90 min, or 60 min with an 8 kg pack"}')
) as v(day_type, slug, order_index, sets, reps, weight_kg, seconds, distance_m,
       per_side, from_week, to_week, progression)
join day on day.day_type = v.day_type::day_type
join ex  on ex.slug = v.slug
on conflict (program_day_id, order_index, active_from_week) do update
  set exercise_id       = excluded.exercise_id,
      target_sets       = excluded.target_sets,
      target_reps       = excluded.target_reps,
      target_weight_kg  = excluded.target_weight_kg,
      target_seconds    = excluded.target_seconds,
      target_distance_m = excluded.target_distance_m,
      per_side          = excluded.per_side,
      active_from_week  = excluded.active_from_week,
      active_to_week    = excluded.active_to_week,
      progression       = excluded.progression;
