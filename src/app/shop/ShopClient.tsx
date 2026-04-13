'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Product, Order } from '@/lib/types'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import { useToast } from '@/components/ui/Toast'

interface Props {
  userId: string
  products: Product[]
  orders: Order[]
}

interface CartItem { product: Product; quantity: number }

const STATUS_LABELS: Record<string, string> = {
  pending: 'ממתין',
  confirmed: 'אושר',
  shipped: 'נשלח',
  delivered: 'נמסר',
  cancelled: 'בוטל',
}
const STATUS_BADGE: Record<string, 'yellow' | 'green' | 'blue' | 'gray' | 'red'> = {
  pending: 'yellow',
  confirmed: 'green',
  shipped: 'blue',
  delivered: 'green',
  cancelled: 'red',
}

const PRODUCT_EMOJIS: Record<string, string> = {
  'Face Serum': '✨',
  'Face & Body Cream': '🌿',
  'Calendula Cream': '🌼',
  'Healing Candle': '🕯️',
}

export default function ShopClient({ userId, products, orders: initialOrders }: Props) {
  const [cart, setCart] = useState<CartItem[]>([])
  const [orders, setOrders] = useState<Order[]>(initialOrders)
  const [activeTab, setActiveTab] = useState<'shop' | 'orders'>('shop')
  const [loading, setLoading] = useState(false)
  const [showCart, setShowCart] = useState(false)
  const { showToast } = useToast()
  const supabase = createClient()

  const totalItems = cart.reduce((s, i) => s + i.quantity, 0)
  const totalPrice = cart.reduce((s, i) => s + i.product.price * i.quantity, 0)

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(i => i.product.id === product.id)
      if (existing) {
        return prev.map(i => i.product.id === product.id
          ? { ...i, quantity: i.quantity + 1 }
          : i
        )
      }
      return [...prev, { product, quantity: 1 }]
    })
    showToast(`${product.name_he} נוסף לסל`, 'success')
  }

  const updateQty = (productId: string, qty: number) => {
    if (qty <= 0) {
      setCart(prev => prev.filter(i => i.product.id !== productId))
    } else {
      setCart(prev => prev.map(i => i.product.id === productId ? { ...i, quantity: qty } : i))
    }
  }

  const handleOrder = async () => {
    if (cart.length === 0) return
    setLoading(true)
    try {
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          patient_id: userId,
          total_amount: totalPrice,
          status: 'pending',
        })
        .select()
        .single()

      if (orderError) throw orderError

      const items = cart.map(item => ({
        order_id: order.id,
        product_id: item.product.id,
        quantity: item.quantity,
        unit_price: item.product.price,
      }))

      await supabase.from('order_items').insert(items)

      setOrders(prev => [order, ...prev])
      setCart([])
      setShowCart(false)
      setActiveTab('orders')
      showToast('הזמנה נשלחה בהצלחה!', 'success')
    } catch {
      showToast('שגיאה בשליחת הזמנה', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#4a7c59]">חנות 🛍️</h1>
        {totalItems > 0 && (
          <button
            onClick={() => setShowCart(!showCart)}
            className="relative bg-[#4a7c59] text-white px-4 py-2 rounded-xl text-sm font-medium"
          >
            🛒 סל ({totalItems})
            <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center">
              {totalItems}
            </span>
          </button>
        )}
      </div>

      {/* Cart panel */}
      {showCart && cart.length > 0 && (
        <Card className="border-[#4a7c59]/30 border-2">
          <CardHeader><CardTitle>סל קניות</CardTitle></CardHeader>
          <div className="space-y-3">
            {cart.map(item => (
              <div key={item.product.id} className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{item.product.name_he}</p>
                  <p className="text-xs text-gray-500">₪{item.product.price} ליחידה</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => updateQty(item.product.id, item.quantity - 1)} className="w-7 h-7 rounded-full bg-[#c8dece] flex items-center justify-center text-[#4a7c59] font-bold">-</button>
                  <span className="w-6 text-center text-sm">{item.quantity}</span>
                  <button onClick={() => updateQty(item.product.id, item.quantity + 1)} className="w-7 h-7 rounded-full bg-[#c8dece] flex items-center justify-center text-[#4a7c59] font-bold">+</button>
                </div>
                <div className="font-semibold text-[#4a7c59]">₪{item.product.price * item.quantity}</div>
              </div>
            ))}
          </div>
          <div className="border-t border-[#c8dece] mt-4 pt-4 flex items-center justify-between">
            <span className="font-bold text-lg">סה"כ: ₪{totalPrice}</span>
            <Button onClick={handleOrder} loading={loading}>
              שלח הזמנה
            </Button>
          </div>
        </Card>
      )}

      {/* Tabs */}
      <div className="flex bg-white rounded-xl p-1 border border-[#c8dece]/50 w-fit gap-1">
        {(['shop', 'orders'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab ? 'bg-[#4a7c59] text-white' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab === 'shop' ? 'מוצרים' : 'הזמנות שלי'}
          </button>
        ))}
      </div>

      {activeTab === 'shop' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {products.map(product => {
            const cartItem = cart.find(i => i.product.id === product.id)
            const emoji = PRODUCT_EMOJIS[product.name] ?? '🌿'
            return (
              <Card key={product.id}>
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 bg-[#c8dece]/50 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0">
                    {emoji}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-800">{product.name_he}</h3>
                    {product.description_he && (
                      <p className="text-sm text-gray-500 mt-0.5">{product.description_he}</p>
                    )}
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-xl font-bold text-[#4a7c59]">₪{product.price}</span>
                      {cartItem ? (
                        <div className="flex items-center gap-2">
                          <button onClick={() => updateQty(product.id, cartItem.quantity - 1)} className="w-7 h-7 rounded-full bg-[#c8dece] flex items-center justify-center text-[#4a7c59] font-bold">-</button>
                          <span className="w-6 text-center">{cartItem.quantity}</span>
                          <button onClick={() => updateQty(product.id, cartItem.quantity + 1)} className="w-7 h-7 rounded-full bg-[#4a7c59] flex items-center justify-center text-white font-bold">+</button>
                        </div>
                      ) : (
                        <Button variant="secondary" size="sm" onClick={() => addToCart(product)}>
                          + הוסף לסל
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {activeTab === 'orders' && (
        <div className="space-y-3">
          {orders.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <div className="text-4xl mb-3">🛍️</div>
              <p>אין הזמנות עדיין</p>
            </div>
          ) : (
            orders.map(order => (
              <Card key={order.id}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-semibold text-gray-800">הזמנה #{order.id.slice(-6)}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(order.created_at).toLocaleDateString('he-IL')}
                    </p>
                  </div>
                  <div className="text-left">
                    <Badge variant={STATUS_BADGE[order.status] ?? 'gray'}>
                      {STATUS_LABELS[order.status]}
                    </Badge>
                    <p className="text-sm font-bold text-[#4a7c59] mt-1">₪{order.total_amount}</p>
                  </div>
                </div>
                {order.items && order.items.length > 0 && (
                  <div className="space-y-1">
                    {order.items.map(item => (
                      <div key={item.id} className="flex items-center justify-between text-sm text-gray-600">
                        <span>{item.product?.name_he} × {item.quantity}</span>
                        <span>₪{item.unit_price * item.quantity}</span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  )
}
