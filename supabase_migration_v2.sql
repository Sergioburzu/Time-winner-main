-- ============================================================
-- Time winner — Migración v2 (nuevas funciones)
-- Ejecutar UNA VEZ en: Supabase Dashboard → SQL Editor → New Query
-- Es seguro ejecutarla varias veces (usa IF NOT EXISTS).
-- ============================================================

-- 1. FAMILIAS: PIN de padres guardado en la nube (hash) + aprobación de tareas
ALTER TABLE public.families ADD COLUMN IF NOT EXISTS parent_pin_hash TEXT;
ALTER TABLE public.families ADD COLUMN IF NOT EXISTS require_approval BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. TAREAS ASIGNADAS: nuevo estado "esperando aprobación"
ALTER TABLE public.assigned_tasks DROP CONSTRAINT IF EXISTS assigned_tasks_status_check;
ALTER TABLE public.assigned_tasks
  ADD CONSTRAINT assigned_tasks_status_check
  CHECK (status IN ('pending', 'awaiting_approval', 'completed'));

-- 3. TAREAS QUE SE REPITEN
-- weekdays: 0 = domingo, 1 = lunes ... 6 = sábado
CREATE TABLE IF NOT EXISTS public.recurring_tasks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id    UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  task_id     UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  weekdays    SMALLINT[] NOT NULL DEFAULT '{0,1,2,3,4,5,6}',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (child_id, task_id)
);

-- 4. PREMIOS (catálogo de la familia)
CREATE TABLE IF NOT EXISTS public.rewards (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id     UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  icon          TEXT NOT NULL DEFAULT '🎁',
  cost_stars    INTEGER NOT NULL CHECK (cost_stars BETWEEN 1 AND 100000),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 5. PREMIOS CANJEADOS
CREATE TABLE IF NOT EXISTS public.reward_redemptions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id      UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  reward_id     UUID REFERENCES public.rewards(id) ON DELETE SET NULL,
  reward_name   TEXT NOT NULL,
  reward_icon   TEXT NOT NULL DEFAULT '🎁',
  cost_stars    INTEGER NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'delivered')),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.recurring_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_redemptions ENABLE ROW LEVEL SECURITY;

-- Helper: ¿el usuario actual es dueño de la familia de este hijo?
CREATE OR REPLACE FUNCTION public.user_owns_child(p_child_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.children c
    JOIN public.families f ON f.id = c.family_id
    WHERE c.id = p_child_id AND f.owner_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

DROP POLICY IF EXISTS "Owner can manage recurring tasks" ON public.recurring_tasks;
CREATE POLICY "Owner can manage recurring tasks"
  ON public.recurring_tasks FOR ALL
  USING (public.user_owns_child(child_id))
  WITH CHECK (public.user_owns_child(child_id));

DROP POLICY IF EXISTS "Owner can manage rewards" ON public.rewards;
CREATE POLICY "Owner can manage rewards"
  ON public.rewards FOR ALL
  USING (public.user_owns_family(family_id))
  WITH CHECK (public.user_owns_family(family_id));

DROP POLICY IF EXISTS "Owner can manage redemptions" ON public.reward_redemptions;
CREATE POLICY "Owner can manage redemptions"
  ON public.reward_redemptions FOR ALL
  USING (public.user_owns_child(child_id))
  WITH CHECK (public.user_owns_child(child_id));

-- ============================================================
-- ÍNDICES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_recurring_tasks_child ON public.recurring_tasks(child_id);
CREATE INDEX IF NOT EXISTS idx_rewards_family ON public.rewards(family_id);
CREATE INDEX IF NOT EXISTS idx_redemptions_child ON public.reward_redemptions(child_id);
CREATE INDEX IF NOT EXISTS idx_assigned_tasks_child_status ON public.assigned_tasks(child_id, status);

-- ============================================================
-- OPCIONAL: evitar familias duplicadas por usuario.
-- Primero comprueba que no hay duplicados:
--   SELECT owner_id, count(*) FROM public.families GROUP BY owner_id HAVING count(*) > 1;
-- Si no devuelve filas, descomenta y ejecuta:
-- ALTER TABLE public.families ADD CONSTRAINT families_owner_unique UNIQUE (owner_id);
-- ============================================================
