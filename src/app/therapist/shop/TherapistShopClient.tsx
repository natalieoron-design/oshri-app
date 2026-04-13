'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Product } from '@/lib/types'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import { useToast } from '@/components/ui/Toast'

interface OrderWithRelations {
  id: string
  patient_id: string
  status: string
  total_amount: number
  created_at: string
  profiles?: { full_name: string }
  order_items?: Array<{
    id: string
    quantity: number
    unit_price: number
    product?: Product
  }>
}

interface Props {
  products: Product[]
  initialOrders: OrderWithRelations[]
}

const STATUS_OPTIONS = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled']
const STATUS_LABELS: Record<string, string> = {
  pending: 'ממתין', confirmed: 'אושר', shipped: 'נשלח', delivered: 'נמסר', cancelled: 'בוטל',
}
const STATUS_BADGE: Record<string, 'yellow' | 'green' | 'blue' | 'gray' | 'red'> = {
  pending: 'yellow', confirmed: 'green', shipped: 'blue', delivered: 'green', cancelled: 'red',
}

export default function TherapistShopClient({ products, initialOrders }: Props) {
  const [orders, setOrders] = useState<OrderWithRelations[]>(initialOrders)
  const [activeTab, setActiveTab] = useState<'orders' | 'products'>('orders')
  const [updatingOrder, setUpdatingOrder] = useState<string | null>(null)
  const { showToast } = useToast()
  const supabase = createClient()

  const updateOrderStatus = async (orderId: string, status: string) => {
    setUpdatingOrder(orderId)
    try {
      const { error } = await supabase.from('orders').update({ status, updated_at: new Date().toISOString() }).eq('id', orderId)
      if (error) throw error
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o))
      showToast(`סטטוס עודכן: ${STATUS_LABELS[status]}`, 'success')
    } catch {
      showToast('שגיאה בעדכון סטטוס', 'error')
    } finally {
      setUpdatingOrder(null)
    }
  }

  const totalRevenue = orders
    .filter(o => o.status !== 'cancelled')
    .reduce((s, o) => s + (o.total_amount ?? 0), 0)

  const pendingOrders = orders.filter(o => o.status === 'pending')

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[#4a7c59]">ניהול חנות 🛍️</h1>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="text-center">
          <div className="text-2xl font-bold text-[#4a7c59]">{orders.length}</div>
          <div className="text-xs text-gray-500">סה"כ הזמנות</div>
        </Card>
        <Card className="text-center">
          <div className={`text-2xl font-bold ${pendingOrders.length > 0 ? 'text-orange-500' : 'text-[#4a7c59]'}`}>
            {pendingOrders.length}
          </div>
          <div className="text-xs text-gray-500">ממתינות לטיפול</div>
        </Card>
        <Card className="text-center">
          <div className="text-2xl font-bold text-[#4a7c59]">₪{totalRevenue}</div>
          <div className="text-xs text-gray-500">סה"כ הכנסות</div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex bg-white rounded-xl p-1 border border-[#c8dece]/50 w-fit gap-1">
        {(['orders', 'products'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab ? 'bg-[#4a7c59] text-white' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab === 'orders' ? 'הזמנות' : 'מוצרים'}
          </button>
        ))}
      </div>

      {activeTab === 'orders' && (
        <div className="space-y-4">
          {orders.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <div className="text-4xl mb-3">🛍️</div>
              <p>אין הזמנות עדיין</p>
            </div>
          ) : (
            orders.map(order => (
              <Card key={order.id}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="font-semibold text-gray-800">
                        {order.profiles?.full_name ?? 'מטופל'}
                      </span>
                      <Badge variant={STATUS_BADGE[order.status] ?? 'gray'}>
                        {STATUS_LABELS[order.status]}
                      </Badge>
                      <span className="text-xs text-gray-400">
                        {new Date(order.created_at).toLocaleDateString('he-IL')}
                      </span>
                    </div>

                    {order.order_items && order.order_items.length > 0 && (
                      <div className="space-y-1 mb-3">
                        {order.order_items.map(item => (
                          <div key={item.id} className="flex items-center justify-between text-sm text-gray-600 bg-[#f5f0e8] rounded-lg px-3 py-1.5">
                            <span>{item.product?.name_he} × {item.quantity}</span>
                            <span className="font-medium">₪{item.unit_price * item.quantity}</span>
                          </div>
                        ))}
                        <div className="flex justify-between text-sm font-bold text-[#4a7c59] pt-1">
                          <span>סה"כ:</span>
                          <span>₪{order.total_amount}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    <select
                      value={order.status}
                      onChange={e => updateOrderStatus(order.id, e.target.value)}
                      disabled={updatingOrder === order.id}
                      className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#4a7c59]"
                    >
                      {STATUS_OPTIONS.map(s => (
                        <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {activeTab === 'products' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {products.map(product => (
            <Card key={product.id}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-800">{product.name_he}</h3>
                  <p className="text-sm text-gray-500">{product.name}</p>
                  <p className="text-xl font-bold text-[#4a7c59] mt-1">₪{product.price}</p>
                </div>
                <div className="text-left">
                  <Badge variant={product.is_active ? 'green' : 'red'}>
                    {product.is_active ? 'פעיל' : 'לא פעיל'}
                  </Badge>
                  <p className="text-xs text-gray-400 mt-1">מלאי: {product.stock}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
