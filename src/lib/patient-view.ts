import { cookies } from 'next/headers'

/**
 * When the therapist is in patient-view mode with a selected patient,
 * returns that patient's ID. Otherwise returns the logged-in user's own ID.
 */
export async function getViewPatientId(userId: string): Promise<string> {
  const store = await cookies()
  const allCookies = store.getAll()
  const isPatientView = store.get('patient_view_mode')?.value === '1'
  const viewId = store.get('patient_view_id')?.value
  const result = isPatientView && viewId ? viewId : userId
  console.log('[getViewPatientId] ALL cookies:', allCookies.map(c => `${c.name}=${c.value}`).join(', '))
  console.log('[getViewPatientId] isPatientView:', isPatientView, '| patient_view_id:', viewId, '| userId:', userId, '| RESULT:', result)
  return result
}
