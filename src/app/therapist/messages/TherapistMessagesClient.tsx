'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Profile, Message } from '@/lib/types'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import { useToast } from '@/components/ui/Toast'

interface Props {
  therapistId: string
  patients: Profile[]
  initialMessages: Message[]
}

export default function TherapistMessagesClient({ therapistId, patients, initialMessages }: Props) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [selectedPatient, setSelectedPatient] = useState<string>('')
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [broadcastMsg, setBroadcastMsg] = useState('')
  const [broadcastLoading, setBroadcastLoading] = useState(false)
  const { showToast } = useToast()
  const supabase = createClient()

  const conversationMessages = selectedPatient
    ? messages.filter(m =>
        (m.sender_id === therapistId && m.recipient_id === selectedPatient) ||
        (m.sender_id === selectedPatient && m.recipient_id === therapistId)
      )
    : []

  const getUnreadCount = (patientId: string) =>
    messages.filter(m => m.sender_id === patientId && m.recipient_id === therapistId && !m.is_read).length

  const handleSend = async () => {
    if (!newMessage.trim() || !selectedPatient) return
    setSending(true)
    try {
      const { data, error } = await supabase.from('messages').insert({
        sender_id: therapistId,
        recipient_id: selectedPatient,
        content: newMessage.trim(),
        message_type: 'manual',
      }).select().single()
      if (error) throw error
      setMessages(prev => [data, ...prev])
      setNewMessage('')
      showToast('הודעה נשלחה', 'success')
    } catch {
      showToast('שגיאה בשליחה', 'error')
    } finally {
      setSending(false)
    }
  }

  const handleBroadcast = async () => {
    if (!broadcastMsg.trim()) return
    setBroadcastLoading(true)
    try {
      const inserts = patients.map(p => ({
        sender_id: therapistId,
        recipient_id: p.id,
        content: broadcastMsg.trim(),
        message_type: 'manual' as const,
      }))
      const { error } = await supabase.from('messages').insert(inserts)
      if (error) throw error
      setBroadcastMsg('')
      showToast(`הודעה נשלחה ל-${patients.length} מטופלים`, 'success')
    } catch {
      showToast('שגיאה בשליחת הודעה קבוצתית', 'error')
    } finally {
      setBroadcastLoading(false)
    }
  }

  const sendAutoNotification = async (patientId: string, type: 'auto_missed_weigh' | 'auto_encouragement') => {
    const content = type === 'auto_missed_weigh'
      ? 'שלום! לא שכחת לשקול את עצמך השבוע? זכרי לרשום את משקלך המעודכן 😊'
      : 'כל הכבוד על ההתמדה! ממשיכים יחד 🌿'

    try {
      const { data, error } = await supabase.from('messages').insert({
        sender_id: therapistId,
        recipient_id: patientId,
        content,
        message_type: type,
      }).select().single()
      if (error) throw error
      setMessages(prev => [data, ...prev])
      showToast('הודעה אוטומטית נשלחה', 'success')
    } catch {
      showToast('שגיאה', 'error')
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[#4a7c59]">הודעות 💬</h1>

      {/* Broadcast */}
      <Card>
        <CardHeader><CardTitle>הודעה קבוצתית לכל המטופלים</CardTitle></CardHeader>
        <textarea
          value={broadcastMsg}
          onChange={e => setBroadcastMsg(e.target.value)}
          placeholder="כתובי הודעה שתשלח לכל המטופלים..."
          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#4a7c59] resize-none h-20 text-sm mb-3"
        />
        <Button variant="secondary" onClick={handleBroadcast} loading={broadcastLoading}>
          📢 שלח לכולם ({patients.length})
        </Button>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Patients sidebar */}
        <Card className="md:col-span-1">
          <CardHeader><CardTitle>מטופלים</CardTitle></CardHeader>
          <div className="space-y-2">
            {patients.map(patient => {
              const unread = getUnreadCount(patient.id)
              return (
                <div
                  key={patient.id}
                  onClick={() => setSelectedPatient(patient.id)}
                  className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${
                    selectedPatient === patient.id
                      ? 'bg-[#4a7c59] text-white'
                      : 'hover:bg-[#c8dece]/30'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      selectedPatient === patient.id ? 'bg-white/20' : 'bg-[#c8dece]'
                    }`}>
                      {patient.full_name?.[0] ?? '?'}
                    </div>
                    <span className="text-sm font-medium">{patient.full_name}</span>
                  </div>
                  {unread > 0 && (
                    <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {unread}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </Card>

        {/* Conversation */}
        <div className="md:col-span-2 space-y-4">
          {selectedPatient ? (
            <>
              <Card>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-[#4a7c59]">
                    {patients.find(p => p.id === selectedPatient)?.full_name}
                  </h3>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => sendAutoNotification(selectedPatient, 'auto_missed_weigh')}
                    >
                      ⚖️ תזכורת שקילה
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => sendAutoNotification(selectedPatient, 'auto_encouragement')}
                    >
                      🌟 עידוד
                    </Button>
                  </div>
                </div>
                <textarea
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  placeholder="כתוב הודעה..."
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#4a7c59] resize-none h-20 text-sm mb-3"
                />
                <Button onClick={handleSend} loading={sending}>שלח</Button>
              </Card>

              <div className="space-y-3 max-h-96 overflow-y-auto">
                {conversationMessages.length === 0 ? (
                  <p className="text-center text-gray-400 py-4">אין הודעות עדיין</p>
                ) : (
                  conversationMessages.map(msg => {
                    const isFromTherapist = msg.sender_id === therapistId
                    return (
                      <div key={msg.id} className={`flex ${isFromTherapist ? 'justify-start' : 'justify-end'}`}>
                        <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                          isFromTherapist ? 'bg-[#4a7c59] text-white' : 'bg-white border border-[#c8dece]/50'
                        }`}>
                          {msg.message_type !== 'manual' && (
                            <div className="text-xs mb-1 opacity-70">
                              {msg.message_type === 'auto_missed_weigh' ? '⚖️ תזכורת שקילה' : '🌟 עידוד'}
                            </div>
                          )}
                          <p className="text-sm">{msg.content}</p>
                          <p className={`text-xs mt-1 ${isFromTherapist ? 'text-white/70' : 'text-gray-400'}`}>
                            {new Date(msg.created_at).toLocaleString('he-IL', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-gray-400">
              <div className="text-4xl mb-3">💬</div>
              <p>בחר מטופל כדי לצפות בשיחה</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
