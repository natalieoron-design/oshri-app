export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ShopClient from './ShopClient'

export default async function ShopPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [productsRes, ordersRes] = await Promise.all([
    supabase.from('products').select('*').eq('is_active', true).order('price'),
    supabase.from('orders').select('*, order_items(*, product:products(*))').eq('patient_id', user.id).order('created_at', { ascending: false }).limit(5),
  ])

  return (
    <ShopClient
      userId={user.id}
      products={productsRes.data ?? []}
      orders={ordersRes.data ?? []}
    />
  )
}
