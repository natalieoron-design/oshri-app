import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const env = Object.fromEntries(
  readFileSync(resolve(__dirname, '../.env.local'), 'utf8')
    .split('\n').filter(l => l.includes('=')).map(l => l.split('=').map(s => s.trim()))
)

const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

const KEEP_IDS = [
  'dcf0d3a4-f452-4329-aaa1-075570888c6e', // ניר רונן
  '700e39f1-029c-4535-b239-092bdcfa07dd', // נתלי אורון מטופלת
  '7dda24dc-e768-4816-be94-a027f6122111', // אושרי הרץ (therapist)
]

async function main() {
  // Get all patient IDs to delete
  const { data: allProfiles } = await sb.from('profiles').select('id, full_name, email').eq('role', 'patient')
  const toDelete = allProfiles.filter(p => !KEEP_IDS.includes(p.id))

  if (toDelete.length === 0) { console.log('אין מה למחוק'); return }

  console.log(`מוחק ${toDelete.length} מטופלים:`)
  toDelete.forEach(p => console.log(`  - ${p.full_name} (${p.email})`))
  console.log()

  const ids = toDelete.map(p => p.id)

  // Delete from all related tables
  const tables = [
    { table: 'food_diary',      col: 'patient_id' },
    { table: 'water_intake',    col: 'patient_id' },
    { table: 'weight_logs',     col: 'patient_id' },
    { table: 'ai_insights',     col: 'patient_id' },
    { table: 'recommendations', col: 'patient_id' },
    { table: 'patient_details', col: 'patient_id' },
  ]

  for (const { table, col } of tables) {
    const { error, count } = await sb.from(table).delete({ count: 'exact' }).in(col, ids)
    if (error) console.error(`  ❌ ${table}:`, error.message)
    else console.log(`  ✅ ${table}: ${count ?? '?'} רשומות נמחקו`)
  }

  // Messages: delete where sender or recipient is in the list
  const { error: msgErr, count: msgCount } = await sb.from('messages').delete({ count: 'exact' }).in('sender_id', ids)
  if (msgErr) console.error('  ❌ messages (sender):', msgErr.message)
  else console.log(`  ✅ messages (sender): ${msgCount ?? '?'} נמחקו`)

  const { error: msgErr2, count: msgCount2 } = await sb.from('messages').delete({ count: 'exact' }).in('recipient_id', ids)
  if (msgErr2) console.error('  ❌ messages (recipient):', msgErr2.message)
  else console.log(`  ✅ messages (recipient): ${msgCount2 ?? '?'} נמחקו`)

  // Orders and order_items
  const { data: orders } = await sb.from('orders').select('id').in('patient_id', ids)
  if (orders && orders.length > 0) {
    const orderIds = orders.map(o => o.id)
    await sb.from('order_items').delete().in('order_id', orderIds)
    console.log(`  ✅ order_items: נמחקו`)
  }
  const { error: ordErr, count: ordCount } = await sb.from('orders').delete({ count: 'exact' }).in('patient_id', ids)
  if (ordErr) console.error('  ❌ orders:', ordErr.message)
  else console.log(`  ✅ orders: ${ordCount ?? '?'} נמחקו`)

  // Profiles
  const { error: profErr, count: profCount } = await sb.from('profiles').delete({ count: 'exact' }).in('id', ids)
  if (profErr) console.error('  ❌ profiles:', profErr.message)
  else console.log(`  ✅ profiles: ${profCount ?? '?'} נמחקו`)

  // Auth users
  console.log()
  for (const p of toDelete) {
    const { error } = await sb.auth.admin.deleteUser(p.id)
    if (error) console.error(`  ❌ auth user ${p.full_name}:`, error.message)
    else console.log(`  ✅ auth user נמחק: ${p.full_name}`)
  }

  console.log('\n✨ הושלם!')
}

main().catch(console.error)
