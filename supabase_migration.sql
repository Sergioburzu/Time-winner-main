-- ============================================================
-- Minutos Premio — Supabase Migration
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- 1. FAMILIES
CREATE TABLE IF NOT EXISTS public.families (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  owner_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 2. CHILDREN
CREATE TABLE IF NOT EXISTS public.children (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id             UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  name                  TEXT NOT NULL,
  age                   INTEGER NOT NULL CHECK (age BETWEEN 2 AND 18),
  avatar                TEXT NOT NULL DEFAULT '🦁',
  daily_limit_minutes   INTEGER NOT NULL DEFAULT 60,
  accumulate_extra      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TASKS (family catalog)
CREATE TABLE IF NOT EXISTS public.tasks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id       UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  icon            TEXT NOT NULL DEFAULT '⭐',
  reward_minutes  INTEGER NOT NULL DEFAULT 10 CHECK (reward_minutes BETWEEN 1 AND 120),
  min_age         INTEGER,
  max_age         INTEGER,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 4. ASSIGNED TASKS (daily)
CREATE TABLE IF NOT EXISTS public.assigned_tasks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id        UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  task_id         UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  date            DATE NOT NULL DEFAULT CURRENT_DATE,
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
  minutes_granted INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(child_id, task_id, date)
);

-- 5. MINUTE RECORDS (historical)
CREATE TABLE IF NOT EXISTS public.minute_records (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id              UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  date                  DATE NOT NULL DEFAULT CURRENT_DATE,
  minutes_earned        INTEGER NOT NULL DEFAULT 0,
  minutes_used          INTEGER NOT NULL DEFAULT 0,
  minutes_carried_over  INTEGER NOT NULL DEFAULT 0,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(child_id, date)
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.children ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assigned_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.minute_records ENABLE ROW LEVEL SECURITY;

-- Helper: check if the current user owns the family
CREATE OR REPLACE FUNCTION public.user_owns_family(family_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.families
    WHERE id = family_id AND owner_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Families
CREATE POLICY "Owner can manage their family"
  ON public.families FOR ALL
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Children
CREATE POLICY "Owner can manage children"
  ON public.children FOR ALL
  USING (public.user_owns_family(family_id))
  WITH CHECK (public.user_owns_family(family_id));

-- Tasks
CREATE POLICY "Owner can manage tasks"
  ON public.tasks FOR ALL
  USING (public.user_owns_family(family_id))
  WITH CHECK (public.user_owns_family(family_id));

-- Assigned tasks (via child → family)
CREATE POLICY "Owner can manage assigned tasks"
  ON public.assigned_tasks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.children c
      JOIN public.families f ON f.id = c.family_id
      WHERE c.id = child_id AND f.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.children c
      JOIN public.families f ON f.id = c.family_id
      WHERE c.id = child_id AND f.owner_id = auth.uid()
    )
  );

-- Minute records
CREATE POLICY "Owner can manage minute records"
  ON public.minute_records FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.children c
      JOIN public.families f ON f.id = c.family_id
      WHERE c.id = child_id AND f.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.children c
      JOIN public.families f ON f.id = c.family_id
      WHERE c.id = child_id AND f.owner_id = auth.uid()
    )
  );

-- ============================================================
-- INDEXES for performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_children_family_id ON public.children(family_id);
CREATE INDEX IF NOT EXISTS idx_tasks_family_id ON public.tasks(family_id);
CREATE INDEX IF NOT EXISTS idx_assigned_tasks_child_date ON public.assigned_tasks(child_id, date);
CREATE INDEX IF NOT EXISTS idx_minute_records_child_date ON public.minute_records(child_id, date);
