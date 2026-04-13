'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Message, Profile } from '@/lib/types'
import { Card } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'

interface Props {
  userId: string
  profile: Profile | null
  therapist: Profile | null
  initialMessages: Message[]
}

export default function MessagesClient({ userId, profile, therapist, initialMessages }: Props) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const { showToast } = useToast()
  const supabase = createClient()

  const handleSend = async () => {
    if (!newMessage.trim() || !therapist) return
    setSending(true)
    try {
      const { data, error } = await supabase.from('messages').insert({
        sender_id: userId,
        recipient_id: therapist.id,
        content: newMessage.trim(),
        message_type: 'manual',
      }).select().single()

      if (error) throw error
      setMessages(prev => [data, ...prev])
      setNewMessage('')
      showToast('הודעה נשלחה', 'success')
    } catch {
      showToast('שגיאה בשליחת הודעה', 'error')
    } finally {
      setSending(false)
    }
  }

  const messageTypeLabel = (type: string) => {
    if (type === 'auto_missed_weigh') return '⚖️ תזכורת שקילה'
    if (type === 'auto_encouragement') return '🌟 עידוד'
    return null
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[#4a7c59]">הודעות 💬</h1>

      {/* Send message to therapist */}
      {therapist && (
        <Card>
          <h2 className="font-semibold text-gray-700 mb-3">שלח הודעה ל{therapist.full_name}</h2>
          <textarea
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            placeholder="כתוב הודעה..."
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#4a7c59] resize-none h-24 text-sm mb-3"
          />
          <Button onClick={handleSend} loading={sending}>שלח הודעה</Button>
        </Card>
      )}

      {/* Messages list */}
      <div className="space-y-3">
        {messages.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <div className="text-4xl mb-3">💬</div>
            <p>אין הודעות עדיין</p>
          </div>
        ) : (
          messages.map(msg => {
            const isFromMe = msg.sender_id === userId
            const typeLabel = messageTypeLabel(msg.message_type)
            return (
              <div key={msg.id} className={`flex ${isFromMe ? 'justify-start' : 'justify-end'}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  isFromMe
                    ? 'bg-white border border-[#c8dece]/50'
                    : 'bg-[#4a7c59] text-white'
                }`}>
                  {typeLabel && (
                    <div className="text-xs mb-1 opacity-70">{typeLabel}</div>
                  )}
                  <p className="text-sm leading-relaxed">{msg.content}</p>
                  <div className={`text-xs mt-1 ${isFromMe ? 'text-gray-400' : 'text-white/70'}`}>
                    {new Date(msg.created_at).toLocaleString('he-IL', {
                      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                    })}
                    {isFromMe && <span className="mr-2">{msg.is_read ? '✓✓' : '✓'}</span>}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
