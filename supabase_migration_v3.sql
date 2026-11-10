-- ============================================================
-- Time winner — Migración v3: borrar cuenta (requisito de Google Play)
-- Ejecutar en: Supabase Dashboard → SQL Editor → New Query
-- Requiere haber ejecutado antes supabase_migration.sql (y recomendable la v2).
-- ============================================================

-- Borra la cuenta del usuario que llama a la función y TODOS sus datos.
-- Al borrar de auth.users, el ON DELETE CASCADE elimina en cadena:
-- familia → hijos → tareas, tareas asignadas, registros de minutos,
-- tareas recurrentes, premios y canjes.
CREATE OR REPLACE FUNCTION public.delete_my_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$;

-- Solo usuarios con sesión iniciada pueden ejecutarla (y solo borra su propia cuenta)
REVOKE ALL ON FUNCTION public.delete_my_account() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_my_account() FROM anon;
GRANT EXECUTE ON FUNCTION public.delete_my_account() TO authenticated;

-- Recargar la caché de la API
NOTIFY pgrst, 'reload schema';
