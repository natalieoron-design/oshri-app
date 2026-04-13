export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import TherapistShopClient from './TherapistShopClient'

export default async function TherapistShopPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'therapist') redirect('/dashboard')

  const [productsRes, ordersRes] = await Promise.all([
    supabase.from('products').select('*').order('price'),
    supabase.from('orders')
      .select('*, profiles!orders_patient_id_fkey(full_name), order_items(*, product:products(*))')
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  return (
    <TherapistShopClient
      products={productsRes.data ?? []}
      initialOrders={ordersRes.data ?? []}
    />
  )
}
