-- Phase 3 — Preset categories and activities (system-owned).
--
-- These rows have user_id = NULL and is_preset = true. Sync rules expose
-- them globally to every authenticated user; RLS keeps them read-only on
-- the client side.
--
-- IDs are deterministic uuid v5 derived from a fixed namespace + a stable
-- name key, so:
--   1. Re-running the seed is idempotent (ON CONFLICT DO UPDATE).
--   2. The same preset has the same UUID across environments (dev/prod).
--   3. Block 5's local-data-claim migration can remap local preset IDs to
--      server preset IDs by recomputing v5 hashes — no name-matching round
--      trip needed.
--
-- Namespace UUID below was generated once and is committed-as-config. Do
-- not change it without also updating the client-side claim logic.

-- The mirror of constants/presets.ts. Keep these two files in sync.
-- Activity key is "<category>:<activity>" so duplicate activity names
-- across categories (e.g. "Walking" in Health & Fitness AND Travel) get
-- distinct UUIDs.

create or replace function _seed_preset_namespace()
returns uuid language sql immutable as
$$ select 'b6c1f4d2-7e9a-5c43-9f0b-2a8e3d6f1c00'::uuid $$;

-- uuid_generate_v5 lives in Supabase's `extensions` schema (not on the
-- default search_path), so we qualify the call explicitly.
create or replace function _seed_category_id(p_name text)
returns uuid language sql immutable as
$$ select extensions.uuid_generate_v5(_seed_preset_namespace(), 'category:' || p_name) $$;

create or replace function _seed_activity_id(p_category text, p_activity text)
returns uuid language sql immutable as
$$ select extensions.uuid_generate_v5(_seed_preset_namespace(), 'activity:' || p_category || ':' || p_activity) $$;

-- =========================================================================
-- Categories
-- =========================================================================
insert into categories (id, user_id, name, color, icon, is_preset, sort_order, is_archived)
values
  (_seed_category_id('Work'),              null, 'Work',              '#4A90D9', 'briefcase', true, 0,  false),
  (_seed_category_id('Health & Fitness'),  null, 'Health & Fitness',  '#E74C3C', 'heart',     true, 1,  false),
  (_seed_category_id('Sleep'),             null, 'Sleep',             '#8E44AD', 'moon',      true, 2,  false),
  (_seed_category_id('Meals'),             null, 'Meals',             '#F39C12', 'utensils',  true, 3,  false),
  (_seed_category_id('Social'),            null, 'Social',            '#E91E63', 'users',     true, 4,  false),
  (_seed_category_id('Learning'),          null, 'Learning',          '#2ECC71', 'book',      true, 5,  false),
  (_seed_category_id('Entertainment'),     null, 'Entertainment',     '#9B59B6', 'gamepad',   true, 6,  false),
  (_seed_category_id('Personal Care'),     null, 'Personal Care',     '#1ABC9C', 'spa',       true, 7,  false),
  (_seed_category_id('Chores'),            null, 'Chores',            '#95A5A6', 'home',      true, 8,  false),
  (_seed_category_id('Travel'),            null, 'Travel',            '#3498DB', 'plane',     true, 9,  false)
on conflict (id) do update set
  name        = excluded.name,
  color       = excluded.color,
  icon        = excluded.icon,
  sort_order  = excluded.sort_order,
  is_preset   = excluded.is_preset,
  is_archived = excluded.is_archived,
  updated_at  = now();

-- =========================================================================
-- Activities
-- =========================================================================
-- Each row: (category_name, activity_name, sort_order)
with preset_activities(category_name, activity_name, sort_order) as (
  values
    -- Work
    ('Work',             'Deep Work',       0),
    ('Work',             'Meetings',        1),
    ('Work',             'Email',           2),
    ('Work',             'Admin',           3),
    ('Work',             'Commute',         4),
    -- Health & Fitness
    ('Health & Fitness', 'Exercise',        0),
    ('Health & Fitness', 'Stretching',      1),
    ('Health & Fitness', 'Walking',         2),
    ('Health & Fitness', 'Sports',          3),
    -- Sleep
    ('Sleep',            'Night Sleep',     0),
    ('Sleep',            'Nap',             1),
    -- Meals
    ('Meals',            'Breakfast',       0),
    ('Meals',            'Lunch',           1),
    ('Meals',            'Dinner',          2),
    ('Meals',            'Snack',           3),
    ('Meals',            'Cooking',         4),
    -- Social
    ('Social',           'Friends',         0),
    ('Social',           'Family',          1),
    ('Social',           'Phone Calls',     2),
    ('Social',           'Messaging',       3),
    -- Learning
    ('Learning',         'Reading',         0),
    ('Learning',         'Online Course',   1),
    ('Learning',         'Studying',        2),
    ('Learning',         'Practice',        3),
    -- Entertainment
    ('Entertainment',    'TV / Movies',     0),
    ('Entertainment',    'Gaming',          1),
    ('Entertainment',    'Social Media',    2),
    ('Entertainment',    'Music',           3),
    -- Personal Care
    ('Personal Care',    'Hygiene',         0),
    ('Personal Care',    'Meditation',      1),
    ('Personal Care',    'Journaling',      2),
    ('Personal Care',    'Therapy',         3),
    -- Chores
    ('Chores',           'Cleaning',        0),
    ('Chores',           'Laundry',         1),
    ('Chores',           'Groceries',       2),
    ('Chores',           'Errands',         3),
    ('Chores',           'Repairs',         4),
    -- Travel
    ('Travel',           'Driving',         0),
    ('Travel',           'Public Transit',  1),
    ('Travel',           'Walking',         2),
    ('Travel',           'Flying',          3)
)
insert into activities (id, user_id, category_id, name, icon, is_preset, sort_order, is_archived)
select
  _seed_activity_id(pa.category_name, pa.activity_name),
  null,
  _seed_category_id(pa.category_name),
  pa.activity_name,
  null,        -- icon override: NULL means inherit from parent category
  true,
  pa.sort_order,
  false
from preset_activities pa
on conflict (id) do update set
  name        = excluded.name,
  category_id = excluded.category_id,
  sort_order  = excluded.sort_order,
  is_preset   = excluded.is_preset,
  is_archived = excluded.is_archived,
  updated_at  = now();

-- Tags are entirely user-owned; nothing to seed.
