'use client'

import { useState, useRef, useEffect } from 'react'
import { MessageCircle, X, ChevronRight, RotateCcw, Cog } from 'lucide-react'
import { vehicles, loyaltyAccounts } from '@/lib/mockData'

// ── Chat tree ─────────────────────────────────────────────────────────────────
const MENU = [
  { id: 'points',    label: '💳 Check loyalty point balance' },
  { id: 'track',     label: '🔧 Track vehicle service status' },
  { id: 'insurance', label: '🛡️ Insurance FAQ'               },
  { id: 'book',      label: '📅 Book a service'               },
  { id: 'staff',     label: '👤 Speak to staff'               },
]

const INSURANCE_FAQ = [
  { q: 'What types of insurance do you offer?',    a: 'We offer Comprehensive, Third-Party Liability (CTPL), and Fleet insurance. Contact our insurance desk for a personalized quote.' },
  { q: 'How long does processing take?',           a: 'Standard processing is 3–5 business days. Renewals for existing customers are typically completed in 1–2 days.' },
  { q: 'What documents are needed?',               a: 'You will need: OR/CR of the vehicle, valid government-issued ID, Certificate of No Claim (if applicable), and a vehicle inspection report.' },
  { q: 'Is on-site inspection required?',          a: 'Yes, for new comprehensive coverage. Our accredited inspector will visit or you may bring the vehicle to any CruisersCrib branch.' },
]

function buildResponse(id, input) {
  if (id === 'points') {
    const q = (input || '').toLowerCase().trim()
    const acc = loyaltyAccounts.find(a =>
      a.owner.toLowerCase().includes(q) ||
      vehicles.find(v => v.owner.toLowerCase() === a.owner.toLowerCase() &&
        (v.plate.toLowerCase().includes(q)))
    )
    if (!acc) return {
      type: 'text',
      text: `No account found for "${input}". Please check the name or plate number.`,
    }
    return {
      type: 'text',
      text: `🏆 Loyalty Account Found!\n\nOwner: ${acc.owner}\nPoints: ${acc.points.toLocaleString()} pts\nTier: ${acc.tier} Member\n\nPoints can be redeemed in the Loyalty Management section.`,
    }
  }

  if (id === 'track') {
    const q = (input || '').toLowerCase().trim()
    const vehicle = vehicles.find(v =>
      v.plate.toLowerCase().includes(q) ||
      v.owner.toLowerCase().includes(q)
    )
    if (!vehicle) return {
      type: 'text',
      text: `No vehicle found for "${input}". Try the plate number (e.g. ABC-1234).`,
    }
    const statusLabel = { active: 'No active repair', maintenance: 'Currently under maintenance', inactive: 'Inactive record' }
    return {
      type: 'text',
      text: `🚗 Vehicle Found!\n\nPlate: ${vehicle.plate}\nOwner: ${vehicle.owner}\nModel: ${vehicle.year} ${vehicle.model}\nStatus: ${statusLabel[vehicle.status] || vehicle.status}\n\nFor detailed timeline, visit the Service Timeline section.`,
    }
  }

  if (id === 'insurance') {
    return { type: 'faq', items: INSURANCE_FAQ }
  }

  if (id === 'book') {
    return { type: 'link', text: 'I\'ll take you to the booking form.', href: '/bookings' }
  }

  if (id === 'staff') {
    return {
      type: 'text',
      text: '📞 Branch Contacts\n\nMakati:  (02) 8888-1234\nBGC:     (02) 8888-5678\nQC:      (02) 8888-9012\n\nHours: Mon–Sat 8:00 AM – 6:00 PM\n\nFor urgent concerns, call your nearest branch directly.',
    }
  }

  return { type: 'text', text: 'Sorry, I didn\'t understand that. Please choose from the menu.' }
}

// ── Message types ─────────────────────────────────────────────────────────────
function BotMessage({ msg }) {
  if (msg.type === 'faq') return (
    <div className="space-y-2">
      {msg.items.map((item, i) => (
        <div key={i} className="rounded-lg p-3" style={{ backgroundColor: 'rgba(240,124,0,0.05)', border: '1px solid rgba(240,124,0,0.15)' }}>
          <p className="text-xs font-bold text-ink-primary mb-1">{item.q}</p>
          <p className="text-xs text-ink-secondary leading-relaxed">{item.a}</p>
        </div>
      ))}
    </div>
  )

  if (msg.type === 'link') return (
    <div>
      <p className="text-sm text-ink-secondary mb-2">{msg.text}</p>
      <a href={msg.href} className="text-xs font-bold underline" style={{ color: '#f07c00' }}>
        Go to Booking Form →
      </a>
    </div>
  )

  return (
    <p className="text-sm text-ink-secondary whitespace-pre-line leading-relaxed">{msg.text}</p>
  )
}

// ── Main widget ───────────────────────────────────────────────────────────────
export default function ChatWidget() {
  const [open,    setOpen]    = useState(false)
  const [msgs,    setMsgs]    = useState([
    { id: 0, from: 'bot', type: 'welcome' },
  ])
  const [phase,   setPhase]   = useState('menu')   // 'menu' | 'input:points' | 'input:track'
  const [input,   setInput]   = useState('')
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [msgs, open])

  function addMsg(from, content) {
    setMsgs(m => [...m, { id: Date.now(), from, ...content }])
  }

  function handleMenu(option) {
    addMsg('user', { type: 'text', text: option.label })

    if (option.id === 'points') {
      setTimeout(() => {
        addMsg('bot', { type: 'text', text: 'Please enter the customer name or plate number to look up:' })
        setPhase('input:points')
      }, 300)
    } else if (option.id === 'track') {
      setTimeout(() => {
        addMsg('bot', { type: 'text', text: 'Enter the plate number or customer name to track:' })
        setPhase('input:track')
      }, 300)
    } else {
      const resp = buildResponse(option.id, null)
      setTimeout(() => { addMsg('bot', resp); setPhase('menu') }, 300)
    }
  }

  function handleInput() {
    if (!input.trim()) return
    addMsg('user', { type: 'text', text: input })
    const actionId = phase.replace('input:', '')
    const resp = buildResponse(actionId, input)
    setTimeout(() => { addMsg('bot', resp); setPhase('menu') }, 400)
    setInput('')
  }

  function reset() {
    setMsgs([{ id: 0, from: 'bot', type: 'welcome' }])
    setPhase('menu')
    setInput('')
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(v => !v)}
        className="fixed bottom-5 right-5 z-50 w-13 h-13 rounded-2xl shadow-glow-orange
                   flex items-center justify-center transition-all duration-200 hover:scale-105"
        style={{ width: 52, height: 52, background: 'linear-gradient(135deg,#f07c00,#c9951a)' }}
      >
        {open ? <X size={22} className="text-white" /> : <MessageCircle size={22} className="text-white" />}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-20 right-5 z-50 w-80 max-h-[520px] flex flex-col rounded-2xl overflow-hidden shadow-card-md border border-surface-border animate-slide-up"
             style={{ backgroundColor: '#111113' }}>

          {/* Header */}
          <div className="px-4 py-3.5 border-b border-surface-border flex items-center justify-between"
               style={{ background: 'linear-gradient(135deg,rgba(240,124,0,0.1),rgba(201,149,26,0.08))' }}>
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                   style={{ background: 'linear-gradient(135deg,#f07c00,#c9951a)' }}>
                <Cog size={13} className="text-white" />
              </div>
              <div>
                <p className="text-xs font-extrabold text-ink-primary leading-none">CruisersCrib Assistant</p>
                <p className="text-[9px] text-ink-muted mt-0.5">Guided Menu · Auto Care Help</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={reset} className="p-1.5 rounded-lg text-ink-muted hover:bg-surface-hover transition-colors" title="Reset">
                <RotateCcw size={13} />
              </button>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg text-ink-muted hover:bg-surface-hover transition-colors">
                <X size={13} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0" style={{ maxHeight: 340 }}>
            {msgs.map(msg => (
              <div key={msg.id} className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.type === 'welcome' ? (
                  <div className="text-sm text-ink-secondary leading-relaxed">
                    👋 Hi! I&apos;m your <span className="font-bold text-ink-primary">CruisersCrib</span> assistant.
                    <p className="mt-1 text-xs text-ink-muted">How can I help you today?</p>
                  </div>
                ) : (
                  <div className={`max-w-[85%] px-3.5 py-2.5 rounded-xl text-sm ${
                    msg.from === 'user'
                      ? 'text-white rounded-br-sm'
                      : 'rounded-bl-sm'
                  }`}
                  style={msg.from === 'user'
                    ? { backgroundColor: '#f07c00' }
                    : { backgroundColor: '#1c1c1f', border: '1px solid #27272a' }
                  }>
                    <BotMessage msg={msg} />
                  </div>
                )}
              </div>
            ))}

            {/* Quick menu */}
            {phase === 'menu' && (
              <div className="space-y-1.5 pt-1">
                {MENU.map(opt => (
                  <button key={opt.id} onClick={() => handleMenu(opt)}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-ink-secondary
                               border border-surface-border hover:bg-surface-hover hover:text-ink-primary
                               transition-all flex items-center justify-between group">
                    {opt.label}
                    <ChevronRight size={12} className="text-ink-dim group-hover:text-ink-secondary transition-colors" />
                  </button>
                ))}
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          {phase.startsWith('input:') && (
            <div className="px-3 py-3 border-t border-surface-border flex gap-2">
              <input value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleInput()}
                placeholder="Type here…"
                className="flex-1 bg-surface-input border border-surface-border rounded-lg px-3 py-2 text-sm text-ink-primary placeholder-ink-muted outline-none"
                style={{ '&:focus': { borderColor: '#f07c00' } }}
                autoFocus />
              <button onClick={handleInput}
                className="px-3 py-2 rounded-lg text-white text-xs font-bold transition-colors"
                style={{ backgroundColor: '#f07c00' }}>
                Send
              </button>
            </div>
          )}
        </div>
      )}
    </>
  )
}
