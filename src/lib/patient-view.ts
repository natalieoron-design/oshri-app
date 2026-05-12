import { headers } from 'next/headers'

/**
 * When the therapist is in patient-view mode with a selected patient,
 * returns that patient's ID. Otherwise returns the logged-in user's own ID.
 *
 * Reads from the x-patient-view-id request header injected by middleware,
 * which is more reliable than reading custom cookies directly in Server Components.
 */
export async function getViewPatientId(userId: string): Promise<string> {
  const headerStore = await headers()
  const patientViewId = headerStore.get('x-patient-view-id')
  const result = patientViewId ?? userId
  console.log('[getViewPatientId] x-patient-view-id header:', patientViewId, '| userId:', userId, '| result:', result)
  return result
}
