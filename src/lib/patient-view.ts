import { cookies } from 'next/headers'

/**
 * When the therapist is in patient-view mode with a selected patient,
 * returns that patient's ID. Otherwise returns the logged-in user's own ID.
 */
export async function getViewPatientId(userId: string): Promise<string> {
  const store = await cookies()
  const isPatientView = store.get('patient_view_mode')?.value === '1'
  const viewId = store.get('patient_view_id')?.value
  return isPatientView && viewId ? viewId : userId
}
