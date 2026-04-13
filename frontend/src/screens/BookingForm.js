'use client'

import { useState } from 'react'
import {
  Check, ChevronRight, Car, CalendarCheck, MapPin,
  CheckCircle2, ArrowLeft, Search, PlusCircle, X,
} from 'lucide-react'
import { servicesCatalog, SHOPS } from '@/lib/mockData'
import { getVehicles, addVehicle, subscribeVehicles } from '@/lib/vehicleStore'
import { addAppointment } from '@/lib/appointmentStore'
import { useEffect, useRef } from 'react'

// ── Status progress bar ───────────────────────────────────────────────────────
const STAGES = [
  { key: 'intake',    label: 'Intake'           },
  { key: 'in_repair', label: 'In-Repair'        },
  { key: 'qc',        label: 'Quality Check'    },
  { key: 'ready',     label: 'Ready for Pickup' },
]

export function ServiceStatusBar({ stage }) {
  const idx = STAGES.findIndex(s => s.key === stage)
  return (
    <div className="w-full">
      <div className="flex items-center">
        {STAGES.map((s, i) => (
          <div key={s.key} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all ${
                  i < idx   ? 'text-white border-transparent'
                  : i === idx ? 'border-transparent'
                  : 'border-surface-border text-ink-dim bg-surface-raised'
                }`}
                style={
                  i < idx   ? { backgroundColor: '#f07c00', borderColor: '#f07c00' }
                  : i === idx ? { backgroundColor: 'rgba(240,124,0,0.1)', borderColor: '#f07c00', color: '#f07c00' }
                  : {}
                }
              >
                {i < idx ? <Check size={13} /> : i + 1}
              </div>
              <span
                className={`text-[10px] font-semibold mt-1 whitespace-nowrap ${i <= idx ? 'text-ink-secondary' : 'text-ink-dim'}`}
                style={i === idx ? { color: '#f07c00' } : {}}
              >
                {s.label}
              </span>
            </div>
            {i < STAGES.length - 1 && (
              <div className="flex-1 h-0.5 mx-1 mb-5 rounded"
                   style={i < idx ? { backgroundColor: '#f07c00' } : { backgroundColor: '#27272a' }} />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Inline quick-register mini form ──────────────────────────────────────────
const VEHICLE_TYPES = ['SUV', 'Sedan', 'Pickup', 'Van', 'Hatchback', 'Crossover', 'Truck']

function QuickRegisterPanel({ onRegistered, onCancel }) {
  const EMPTY = { owner: '', plate: '', model: '', type: 'SUV', year: new Date().getFullYear(), mileage: 0 }
  const [form,   setForm]   = useState(EMPTY)
  const [errors, setErrors] = useState({})

  function f(key, val) {
    setForm(p => ({ ...p, [key]: val }))
    if (errors[key]) setErrors(p => { const n = {...p}; delete n[key]; return n })
  }

  function handleRegister() {
    const e = {}
    if (!form.owner.trim())  e.owner = 'Required'
    if (!form.plate.trim())  e.plate = 'Required'
    if (!form.model.trim())  e.model = 'Required'
    if (Object.keys(e).length) { setErrors(e); return }

    const newV = {
      id: 'v' + Date.now().toString(36),
      plate:   form.plate.trim().toUpperCase(),
      model:   form.model.trim(),
      type:    form.type,
      year:    Number(form.year),
      owner:   form.owner.trim(),
      color:   '',
      mileage: Number(form.mileage) || 0,
      status:  'active',
    }
    addVehicle(newV)
    onRegistered(newV)
  }

  return (
    <div className="mt-4 rounded-xl border p-5 space-y-4 animate-slide-up"
         style={{ borderColor: 'rgba(240,124,0,0.25)', background: 'rgba(240,124,0,0.04)' }}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-ink-primary flex items-center gap-2">
          <PlusCircle size={15} style={{ color: '#f07c00' }} /> Register New Vehicle
        </p>
        <button onClick={onCancel} className="p-1 text-ink-muted hover:text-ink-primary transition-colors">
          <X size={15} />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="label">Owner Name <span className="text-red-400">*</span></label>
          <input value={form.owner} onChange={e => f('owner', e.target.value)}
            placeholder="Full name" className="input" />
          {errors.owner && <p className="text-xs text-red-400 mt-1">{errors.owner}</p>}
        </div>
        <div>
          <label className="label">Plate Number <span className="text-red-400">*</span></label>
          <input value={form.plate} onChange={e => f('plate', e.target.value)}
            placeholder="ABC-1234" className="input"
            style={{ textTransform: 'uppercase' }} />
          {errors.plate && <p className="text-xs text-red-400 mt-1">{errors.plate}</p>}
        </div>
        <div>
          <label className="label">Brand & Model <span className="text-red-400">*</span></label>
          <input value={form.model} onChange={e => f('model', e.target.value)}
            placeholder="Toyota Fortuner" className="input" />
          {errors.model && <p className="text-xs text-red-400 mt-1">{errors.model}</p>}
        </div>
        <div>
          <label className="label">Vehicle Type</label>
          <select value={form.type} onChange={e => f('type', e.target.value)} className="select">
            {VEHICLE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Year</label>
          <input type="number" value={form.year} onChange={e => f('year', e.target.value)}
            min="1980" max={new Date().getFullYear() + 1} className="input" />
        </div>
        <div>
          <label className="label">Mileage (km)</label>
          <input type="number" value={form.mileage} onChange={e => f('mileage', e.target.value)}
            min="0" placeholder="0" className="input" />
        </div>
      </div>

      <div className="flex gap-3">
        <button onClick={onCancel} className="btn-ghost flex-1 justify-center text-xs">Cancel</button>
        <button onClick={handleRegister} className="btn-primary flex-1 justify-center text-xs">
          <CheckCircle2 size={13} /> Register & Select
        </button>
      </div>
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const categories  = [...new Set(servicesCatalog.map(s => s.category))]
const TIME_SLOTS  = ['08:00 AM','09:00 AM','10:00 AM','11:00 AM','01:00 PM','02:00 PM','03:00 PM','04:00 PM']
const STEPS       = ['Select Vehicle', 'Choose Services', 'Schedule', 'Confirm']

// ── Hook: live vehicles list ──────────────────────────────────────────────────
function useLiveVehicles() {
  const [vehicles, setVehicles] = useState(() => getVehicles())
  useEffect(() => {
    const unsub = subscribeVehicles(all => setVehicles(all))
    return unsub
  }, [])
  return vehicles
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function BookingForm({ onSuccess }) {
  const vehicles = useLiveVehicles()

  const [step, setStep] = useState(0)
  const [form, setForm] = useState({
    vehicleId: null,
    services:  [],
    date:      '',
    time:      '',
    shop:      SHOPS[0],
    notes:     '',
  })
  const [submitted,     setSubmitted]     = useState(false)
  const [vehicleSearch, setVehicleSearch] = useState('')
  const [showRegister,  setShowRegister]  = useState(false)
  const [newlyAdded,    setNewlyAdded]    = useState(null) // highlight newly registered

  const vehicle      = vehicles.find(v => v.id === form.vehicleId)
  const selectedSvcs = servicesCatalog.filter(s => form.services.includes(s.id))
  const total        = selectedSvcs.reduce((sum, s) => sum + s.price, 0)

  const filteredVehicles = vehicles.filter(v => {
    const q = vehicleSearch.toLowerCase()
    if (!q) return true
    return v.plate.toLowerCase().includes(q) || v.owner.toLowerCase().includes(q)
  })

  function toggleService(id) {
    setForm(f => ({
      ...f,
      services: f.services.includes(id)
        ? f.services.filter(s => s !== id)
        : [...f.services, id],
    }))
  }

  function canProceed() {
    if (step === 0) return !!form.vehicleId
    if (step === 1) return form.services.length > 0
    if (step === 2) return !!form.date && !!form.time
    return true
  }

  function handleSubmit() {
    // Build slot datetime string
    const [timePart, ampm] = form.time.split(' ')
    let [hh, mm] = timePart.split(':').map(Number)
    if (ampm === 'PM' && hh !== 12) hh += 12
    if (ampm === 'AM' && hh === 12) hh = 0
    const slot = `${form.date}T${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}`

    const newAppt = {
      id:              'a' + Date.now().toString(36),
      vehicleId:       form.vehicleId,
      slot,
      status:          'confirmed',
      serviceStage:    'intake',
      chosenServices:  selectedSvcs.map(s => s.name),
      notes:           form.notes,
      shopName:        form.shop,
      jobOrderId:      null,
    }

    addAppointment(newAppt)
    setSubmitted(true)
    onSuccess?.()
  }

  function handleVehicleRegistered(newV) {
    setShowRegister(false)
    setNewlyAdded(newV.id)
    setVehicleSearch('')
    setForm(f => ({ ...f, vehicleId: newV.id }))
  }

  function reset() {
    setSubmitted(false)
    setStep(0)
    setForm({ vehicleId: null, services: [], date: '', time: '', shop: SHOPS[0], notes: '' })
    setVehicleSearch('')
    setShowRegister(false)
    setNewlyAdded(null)
  }

  if (submitted) return (
    <div className="flex flex-col items-center justify-center flex-1 py-20 gap-4 text-center px-5">
      <div className="w-16 h-16 rounded-full flex items-center justify-center"
           style={{ backgroundColor: 'rgba(34,197,94,0.1)', border: '2px solid #22c55e' }}>
        <CheckCircle2 size={32} className="text-emerald-400" />
      </div>
      <h3 className="text-xl font-bold text-ink-primary">Booking Confirmed!</h3>
      <p className="text-ink-secondary text-sm max-w-sm">
        {vehicle?.plate} has been scheduled for{' '}
        {new Date(form.date).toLocaleDateString('en-PH',{month:'long',day:'numeric'})} at {form.time}{' '}
        at {form.shop}. It now appears in All Bookings.
      </p>
      <button onClick={reset} className="btn-ghost mt-2">+ New Booking</button>
    </div>
  )

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* ── Step header (pinned) ──────────────────── */}
      <div className="shrink-0 px-5 md:px-6 pt-5 md:pt-6 pb-4 border-b border-surface-border">
        <div className="flex items-center gap-0 overflow-x-auto pb-1">
          {STEPS.map((label, i) => (
            <div key={i} className="flex items-center flex-shrink-0">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all`}
                   style={i === step ? { color: '#f07c00' } : {}}>
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border transition-all ${
                    i < step  ? 'text-white border-transparent'
                    : i === step ? 'border-transparent'
                    : 'border-surface-border text-ink-dim'
                  }`}
                  style={
                    i < step  ? { backgroundColor: '#f07c00' }
                    : i === step ? { backgroundColor: 'rgba(240,124,0,0.1)', borderColor: '#f07c00', color: '#f07c00' }
                    : {}
                  }
                >
                  {i < step ? <Check size={11} /> : i + 1}
                </div>
                <span className="hidden sm:block">{label}</span>
              </div>
              {i < STEPS.length - 1 && <ChevronRight size={14} className="text-ink-dim mx-1 flex-shrink-0" />}
            </div>
          ))}
        </div>
      </div>

      {/* ── Scrollable step content ───────────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto cc-scrollbar px-5 md:px-6 py-5">{/* scroll container */}

      {/* ── Step 0: Select Vehicle ────────────────── */}
      {step === 0 && (
        <div className="space-y-4">
          {/* Quick search */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-surface-card border border-surface-border rounded-lg px-3 py-2 flex-1 min-w-[200px] max-w-sm">
              <Search size={14} className="text-ink-muted flex-shrink-0" />
              <input
                value={vehicleSearch}
                onChange={e => setVehicleSearch(e.target.value)}
                placeholder="Quick search by plate or owner…"
                className="bg-transparent text-sm text-ink-secondary placeholder-ink-muted outline-none w-full"
              />
              {vehicleSearch && (
                <button onClick={() => setVehicleSearch('')} className="text-ink-dim hover:text-ink-muted transition-colors">
                  <X size={13} />
                </button>
              )}
            </div>
            <button
              onClick={() => { setShowRegister(v => !v); setVehicleSearch('') }}
              className="btn-ghost text-xs"
            >
              <PlusCircle size={14} style={{ color: '#f07c00' }} />
              Register New Vehicle
            </button>
          </div>

          {/* Inline register panel */}
          {showRegister && (
            <QuickRegisterPanel
              onRegistered={handleVehicleRegistered}
              onCancel={() => setShowRegister(false)}
            />
          )}

          {/* Vehicle cards */}
          {filteredVehicles.length === 0 ? (
            <div className="py-10 text-center text-ink-muted text-sm">
              No vehicles match <span className="font-semibold text-ink-secondary">&quot;{vehicleSearch}&quot;</span>
              <span className="block mt-2">
                <button onClick={() => setShowRegister(true)}
                  className="text-xs font-semibold underline" style={{ color: '#f07c00' }}>
                  Register this vehicle →
                </button>
              </span>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredVehicles.map(v => {
                const isNew = v.id === newlyAdded
                return (
                  <button key={v.id} onClick={() => setForm(f => ({...f, vehicleId: v.id}))}
                    className={`card p-4 text-left transition-all hover:bg-surface-hover`}
                    style={form.vehicleId === v.id
                      ? { outline: '2px solid #f07c00', borderColor: '#f07c00' }
                      : isNew
                        ? { outline: '2px solid rgba(240,124,0,0.4)', borderColor: 'rgba(240,124,0,0.4)' }
                        : {}
                    }>
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                           style={{ background: 'linear-gradient(135deg,#f07c00,#c9951a)' }}>
                        <Car size={17} className="text-white" />
                      </div>
                      <div className="flex items-center gap-1.5">
                        {isNew && <span className="badge badge-green text-[9px]">New</span>}
                        {form.vehicleId === v.id && <Check size={16} style={{ color: '#f07c00' }} />}
                      </div>
                    </div>
                    <p className="font-bold text-ink-primary font-mono text-sm">{v.plate}</p>
                    <p className="text-xs text-ink-secondary mt-0.5">{v.year} {v.model}</p>
                    <p className="text-xs text-ink-muted mt-0.5">{v.owner}</p>
                    <div className="mt-2">
                      <span className={`badge text-[10px] ${
                        v.status === 'active' ? 'badge-green'
                        : v.status === 'maintenance' ? 'badge-orange'
                        : 'badge-gray'
                      }`}>{v.status}</span>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Step 1: Choose Services ───────────────── */}
      {step === 1 && (
        <div className="space-y-4">
          <p className="section-heading">Choose Services</p>
          {categories.map(cat => (
            <div key={cat} className="card overflow-hidden">
              <div className="px-4 py-3 border-b border-surface-border bg-surface-raised">
                <p className="text-xs font-bold uppercase tracking-widest text-ink-secondary">{cat}</p>
              </div>
              <div className="divide-y divide-surface-border">
                {servicesCatalog.filter(s => s.category === cat).map(svc => (
                  <label key={svc.id}
                    className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-surface-hover transition-colors">
                    <div
                      className={`w-5 h-5 rounded flex items-center justify-center border-2 flex-shrink-0 transition-all ${
                        form.services.includes(svc.id) ? 'border-transparent' : 'border-surface-border'
                      }`}
                      style={form.services.includes(svc.id) ? { backgroundColor: '#f07c00' } : {}}
                    >
                      {form.services.includes(svc.id) && <Check size={11} className="text-white" />}
                    </div>
                    <input type="checkbox" checked={form.services.includes(svc.id)}
                      onChange={() => toggleService(svc.id)} className="sr-only" />
                    <span className="text-sm text-ink-primary flex-1">{svc.name}</span>
                    <span className="text-sm font-bold flex-shrink-0" style={{ color: '#f07c00' }}>
                      ₱{svc.price.toLocaleString()}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ))}
          {form.services.length > 0 && (
            <div className="flex items-center justify-between p-4 rounded-xl"
                 style={{ backgroundColor: 'rgba(240,124,0,0.08)', border: '1px solid rgba(240,124,0,0.2)' }}>
              <p className="text-sm font-semibold text-ink-primary">
                {form.services.length} service{form.services.length > 1 ? 's' : ''} selected
              </p>
              <p className="text-base font-extrabold" style={{ color: '#f07c00' }}>₱{total.toLocaleString()} est.</p>
            </div>
          )}
        </div>
      )}

      {/* ── Step 2: Schedule ──────────────────────── */}
      {step === 2 && (
        <div className="space-y-5 max-w-lg">
          <p className="section-heading">Select Schedule & Location</p>

          <div>
            <label className="label">Date</label>
            <input type="date" value={form.date}
              onChange={e => setForm(f=>({...f,date:e.target.value}))}
              min={new Date().toISOString().split('T')[0]} className="input" />
          </div>

          <div>
            <label className="label">Time Slot</label>
            <div className="grid grid-cols-4 gap-2">
              {TIME_SLOTS.map(t => (
                <button key={t} onClick={() => setForm(f=>({...f,time:t}))}
                  className={`py-2 rounded-lg text-xs font-semibold border transition-all ${
                    form.time === t ? 'text-white border-transparent' : 'border-surface-border text-ink-secondary hover:bg-surface-hover'
                  }`}
                  style={form.time === t ? { backgroundColor: '#f07c00', borderColor: '#f07c00' } : {}}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Shop Location</label>
            <select value={form.shop} onChange={e => setForm(f=>({...f,shop:e.target.value}))} className="select">
              {SHOPS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div>
            <label className="label">Notes for Technician (optional)</label>
            <textarea value={form.notes} onChange={e => setForm(f=>({...f,notes:e.target.value}))}
              rows={3} placeholder="Describe any issues or special requests…"
              className="input resize-none" />
          </div>
        </div>
      )}

      {/* ── Step 3: Confirm ───────────────────────── */}
      {step === 3 && (
        <div className="max-w-lg space-y-4">
          <p className="section-heading">Confirm Booking</p>

          <div className="card divide-y divide-surface-border">
            <div className="p-4 flex items-center gap-3">
              <Car size={16} style={{ color: '#f07c00' }} className="flex-shrink-0" />
              <div>
                <p className="text-xs text-ink-muted">Vehicle</p>
                <p className="text-sm font-semibold text-ink-primary">
                  {vehicle?.plate} — {vehicle?.year} {vehicle?.model}
                </p>
                <p className="text-xs text-ink-muted">{vehicle?.owner}</p>
              </div>
            </div>
            <div className="p-4">
              <p className="text-xs text-ink-muted mb-2">Services</p>
              <div className="space-y-1">
                {selectedSvcs.map(s => (
                  <div key={s.id} className="flex items-center justify-between text-sm">
                    <span className="text-ink-secondary">{s.name}</span>
                    <span className="font-semibold text-ink-primary">₱{s.price.toLocaleString()}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between text-sm pt-2 border-t border-surface-border mt-2">
                  <span className="font-bold text-ink-primary">Estimated Total</span>
                  <span className="font-extrabold text-lg" style={{ color: '#f07c00' }}>₱{total.toLocaleString()}</span>
                </div>
              </div>
            </div>
            <div className="p-4 flex items-center gap-3">
              <CalendarCheck size={16} style={{ color: '#f07c00' }} className="flex-shrink-0" />
              <div>
                <p className="text-xs text-ink-muted">Schedule</p>
                <p className="text-sm font-semibold text-ink-primary">
                  {new Date(form.date).toLocaleDateString('en-PH',{weekday:'long',month:'long',day:'numeric',year:'numeric'})} · {form.time}
                </p>
              </div>
            </div>
            <div className="p-4 flex items-center gap-3">
              <MapPin size={16} style={{ color: '#f07c00' }} className="flex-shrink-0" />
              <div>
                <p className="text-xs text-ink-muted">Location</p>
                <p className="text-sm font-semibold text-ink-primary">{form.shop}</p>
              </div>
            </div>
            {form.notes && (
              <div className="p-4">
                <p className="text-xs text-ink-muted mb-1">Notes</p>
                <p className="text-sm text-ink-secondary">{form.notes}</p>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 px-4 py-3 rounded-xl"
               style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)' }}>
            <CheckCircle2 size={14} className="text-emerald-400 flex-shrink-0" />
            <p className="text-xs text-emerald-400 font-medium">
              Booking will be saved with <span className="font-bold">Confirmed</span> status and appear immediately in All Bookings.
            </p>
          </div>
        </div>
      )}

      </div>{/* end scroll container */}

      {/* ── Navigation (pinned footer) ────────────── */}
      <div className="shrink-0 flex items-center justify-between px-5 md:px-6 py-4 border-t border-surface-border bg-surface-card">
        <button onClick={() => setStep(s => s - 1)} disabled={step === 0}
          className="btn-ghost disabled:opacity-0">
          <ArrowLeft size={15} /> Back
        </button>
        {step < 3
          ? <button onClick={() => setStep(s => s + 1)} disabled={!canProceed()}
              className="btn-primary disabled:opacity-40">
              Continue <ChevronRight size={15} />
            </button>
          : <button onClick={handleSubmit} className="btn-primary">
              <CheckCircle2 size={15} /> Confirm Booking
            </button>
        }
      </div>
    </div>
  )
}
