import { useEffect, useState } from 'react'
import { useAuthStore } from '../store/authStore'
import { useChildrenStore } from '../store/childrenStore'
import { useTasksStore } from '../store/tasksStore'

let loadedFamilyId: string | null = null
let inflight: Promise<void> | null = null

/**
 * Garantiza que los hijos y el catálogo de tareas de la familia están cargados.
 * Antes solo se cargaban desde el panel de padres, así que al recargar la vista
 * del niño (o Historial / Ajustes) aparecía "Perfil no encontrado" o listas vacías.
 */
export function useFamilyData() {
  const family = useAuthStore((s) => s.family)
  const fetchChildren = useChildrenStore((s) => s.fetchChildren)
  const fetchTasks = useTasksStore((s) => s.fetchTasks)
  const [ready, setReady] = useState(() => Boolean(family && loadedFamilyId === family.id))

  useEffect(() => {
    if (!family) return
    if (loadedFamilyId === family.id) { setReady(true); return }
    if (!inflight) {
      inflight = Promise.all([fetchChildren(family.id), fetchTasks(family.id)]).then(() => {
        loadedFamilyId = family.id
        inflight = null
      })
    }
    let cancelled = false
    inflight?.then(() => { if (!cancelled) setReady(true) })
    return () => { cancelled = true }
  }, [family, fetchChildren, fetchTasks])

  return { ready, family }
}

/** Fuerza recargar en la próxima llamada (p. ej. tras cerrar sesión o pulsar "Actualizar"). */
export function invalidateFamilyData() {
  loadedFamilyId = null
}
