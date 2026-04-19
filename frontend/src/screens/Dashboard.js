'use client'

import Link from 'next/link'
import {
  Car, CalendarCheck, Wrench, AlertTriangle, ArrowUpRight,
  Clock, CheckCircle2, AlertCircle, Star, Plus, TrendingUp,
} from 'lucide-react'
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, AreaChart, Area,
} from 'recharts'
import { useVehicles }     from '@/hooks/useVehicles'
import { useAppointments } from '@/hooks/useAppointments'
import StaffProvisioningPanel from '@/components/StaffProvisioningPanel'
import { useUser }         from '@/lib/userContext'
import { shopProducts, monthlyRevenue, bookingVolume, peakHourData } from '@/lib/mockData'

// ── Recharts theme helpers ────────────────────────────────────────────────────
const CHART_STYLE = {
  tickStyle:    { fill: '#71717a', fontSize: 11 },
  gridColor:    '#27272a',
  tooltipStyle: { backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: 10, fontSize: 12 },
  tooltipLabel: { color: '#f4f4f5', fontWeight: 700 },
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={CHART_STYLE.tooltipStyle} className="px-3 py-2 shadow-lg">
      <p className="text-xs font-bold text-ink-primary mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.dataKey} className="text-xs" style={{ color: p.color }}>
          {p.name}: {typeof p.value === 'number' && p.name?.toLowerCase().includes('₱')
            ? `₱${p.value.toLocaleString()}` : p.value}
        </p>
      ))}
    </div>
  )
}

function RevenueTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={CHART_STYLE.tooltipStyle} className="px-3 py-2 shadow-lg">
      <p className="text-xs font-bold text-ink-primary mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.dataKey} className="text-xs" style={{ color: p.color }}>
          {p.name}: ₱{Number(p.value).toLocaleString()}
        </p>
      ))}
    </div>
  )
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function Stat({ icon: Icon, label, value, sub, iconBg }) {
  return (
    <div className="card p-5 flex items-start gap-4">
      <div className="p-2.5 rounded-xl flex-shrink-0" style={{ backgroundColor: iconBg }}>
        <Icon size={19} className="text-white" />
      </div>
      <div>
        <p className="text-2xl font-extrabold text-ink-primary">{value}</p>
        <p className="text-xs font-semibold text-ink-secondary mt-0.5">{label}</p>
        {sub && <p className="text-xs text-ink-muted mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

function Skeleton({ w = 'w-3/4' }) {
  return <div className={`h-3.5 bg-surface-raised rounded animate-pulse ${w}`} />
}

// ── Component ─────────────────────────────────────────────────────────────────
function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function Dashboard() {
  const user = useUser()
  const { vehicles,     loading: vLoad } = useVehicles()
  const { appointments, loading: aLoad } = useAppointments()

  const vehicleMap   = Object.fromEntries(vehicles.map(v => [v.id, v]))
  const activeAppt   = appointments.filter(a => ['confirmed','pending','in_progress'].includes(a.status)).length
  const pendingCount = appointments.filter(a => a.status === 'pending').length
  const lowStock     = shopProducts.filter(p => p.stock < 10).length
  const totalRevenue = monthlyRevenue.reduce((s, m) => s + m.revenue, 0)
  const firstName    = user?.name?.split(' ')[0] ?? 'Admin'

  return (
    <div className="space-y-6">

      {/* ── Welcome banner ──────────────────────────── */}
      <section className="relative overflow-hidden rounded-2xl p-6"
               style={{ background: 'linear-gradient(135deg, #111113 0%, #1a1000 100%)', border: '1px solid rgba(240,124,0,0.15)' }}>
        <div className="absolute top-0 right-0 w-72 h-72 rounded-full opacity-[0.07] blur-3xl pointer-events-none"
             style={{ background: 'radial-gradient(circle, #f07c00, transparent)' }} />
        <div className="relative">
          <p className="text-2xl font-extrabold text-ink-primary">
            {getGreeting()}, <span style={{ color: '#f07c00' }}>{firstName}</span>
          </p>
          <p className="text-sm text-ink-secondary mt-1.5">
            Here&apos;s your operational snapshot for today. {pendingCount > 0
              ? `You have ${pendingCount} pending request${pendingCount > 1 ? 's' : ''} awaiting confirmation.`
              : 'All bookings are confirmed — looking good!'}
          </p>
        </div>
      </section>

      {/* ── Stat cards ──────────────────────────────── */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat icon={CalendarCheck} label="Active Bookings"  value={activeAppt}          sub="today"                         iconBg="#f07c00" />
        <Stat icon={Clock}         label="Pending Requests" value={pendingCount}         sub="awaiting confirmation"         iconBg="#b45309" />
        <Stat icon={AlertTriangle} label="Low Stock Alerts" value={lowStock}             sub={`of ${shopProducts.length} products`} iconBg="#dc2626" />
        <Stat icon={TrendingUp}    label="6-Mo Revenue"    value={`₱${(totalRevenue/1000).toFixed(0)}k`} sub="service + parts"  iconBg="#16a34a" />
      </section>

      {/* ── Quick actions ───────────────────────────── */}
      <section className="flex flex-wrap gap-3">
        <Link href="/bookings" className="btn-primary"><Plus size={15} /> New Booking</Link>
        <Link href="/vehicles" className="btn-ghost"><Car size={15} /> Register Vehicle</Link>
        <Link href="/bookings?tab=backjob" className="btn-ghost"><Wrench size={15} /> Back-Job Intake</Link>
      </section>

      {/* ── Charts row 1: Revenue + Booking Volume ───── */}
      {user?.role === 'super_admin' ? <StaffProvisioningPanel /> : null}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* Revenue Trend */}
        <section className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="card-title">Revenue / Sales Trend</p>
            <span className="text-xs text-ink-muted">Last 6 months</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={monthlyRevenue} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#f07c00" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#f07c00" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="partsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#c9951a" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#c9951a" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_STYLE.gridColor} />
              <XAxis dataKey="month" tick={CHART_STYLE.tickStyle} axisLine={false} tickLine={false} />
              <YAxis tick={CHART_STYLE.tickStyle} axisLine={false} tickLine={false}
                     tickFormatter={v => `₱${(v/1000).toFixed(0)}k`} width={48} />
              <Tooltip content={<RevenueTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11, color: '#71717a' }} />
              <Area type="monotone" dataKey="revenue" name="Total Revenue" stroke="#f07c00" strokeWidth={2}
                    fill="url(#revGrad)" dot={{ r: 3, fill: '#f07c00' }} activeDot={{ r: 5 }} />
              <Area type="monotone" dataKey="parts" name="Parts Sales" stroke="#c9951a" strokeWidth={2}
                    fill="url(#partsGrad)" dot={{ r: 3, fill: '#c9951a' }} activeDot={{ r: 5 }} />
            </AreaChart>
          </ResponsiveContainer>
        </section>

        {/* Booking Volume by Service Type */}
        <section className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="card-title">Booking Volume by Service</p>
            <span className="text-xs text-ink-muted">Current period</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={bookingVolume} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_STYLE.gridColor} vertical={false} />
              <XAxis dataKey="type" tick={CHART_STYLE.tickStyle} axisLine={false} tickLine={false}
                     angle={-30} textAnchor="end" height={44} interval={0} />
              <YAxis tick={CHART_STYLE.tickStyle} axisLine={false} tickLine={false} width={28} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="count" name="Bookings" fill="#f07c00" radius={[4, 4, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </section>
      </div>

      {/* ── Chart row 2: Peak Hour ────────────────────── */}
      <section className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="card-title">Peak Hour Analysis</p>
          <span className="text-xs text-ink-muted">Average walk-ins / appointments per hour</span>
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={peakHourData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_STYLE.gridColor} vertical={false} />
            <XAxis dataKey="hour" tick={CHART_STYLE.tickStyle} axisLine={false} tickLine={false} />
            <YAxis tick={CHART_STYLE.tickStyle} axisLine={false} tickLine={false} width={28} />
            <Tooltip content={<ChartTooltip />} />
            <Bar dataKey="bookings" name="Bookings" fill="#c9951a" radius={[4, 4, 0, 0]} maxBarSize={36} />
          </BarChart>
        </ResponsiveContainer>
      </section>

      {/* ── Priority alert row ───────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* Low Stock Alerts */}
        <section className="card">
          <div className="px-5 py-4 border-b border-surface-border flex items-center justify-between">
            <p className="card-title flex items-center gap-2">
              <AlertTriangle size={15} className="text-red-400" /> Low Stock Alerts
            </p>
            <Link href="/shop" className="text-xs font-semibold flex items-center gap-1 hover:underline"
                  style={{ color: '#f07c00' }}>
              Manage Inventory <ArrowUpRight size={11} />
            </Link>
          </div>
          <div className="divide-y divide-surface-border">
            {shopProducts.filter(p => p.stock < 10).map(p => (
              <div key={p.id} className="px-5 py-3.5 flex items-center justify-between gap-3 hover:bg-surface-hover">
                <div>
                  <p className="text-sm font-medium text-ink-primary">{p.name}</p>
                  <p className="text-xs text-ink-muted">{p.category} · {p.sku}</p>
                </div>
                <span className={`badge flex-shrink-0 ${p.stock <= 5 ? 'badge-red' : 'badge-orange'}`}>
                  {p.stock} left
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Pending bookings */}
        <section className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-surface-border flex items-center justify-between">
            <p className="card-title flex items-center gap-2">
              <Clock size={15} style={{ color: '#f07c00' }} /> Pending Requests
            </p>
            <Link href="/bookings" className="text-xs font-semibold flex items-center gap-1 hover:underline"
                  style={{ color: '#f07c00' }}>
              View all <ArrowUpRight size={11} />
            </Link>
          </div>
          <ul className="divide-y divide-surface-border">
            {aLoad
              ? Array.from({length:3}).map((_,i)=>(
                  <li key={i} className="px-5 py-4 space-y-2"><Skeleton /><Skeleton w="w-1/2"/></li>
                ))
              : appointments.filter(a => a.status === 'pending').map(a => {
                  const v = vehicleMap[a.vehicleId]
                  const d = new Date(a.slot).toLocaleString('en-PH',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})
                  return (
                    <li key={a.id} className="px-5 py-3.5 hover:bg-surface-hover transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-ink-primary">
                            {v ? `${v.owner} — ` : ''}<span className="font-mono text-xs" style={{color:'#f07c00'}}>{v?.plate}</span>
                          </p>
                          <p className="text-xs text-ink-muted mt-0.5">
                            {a.chosenServices.join(', ')}
                          </p>
                          <p className="text-xs text-ink-dim mt-0.5"><Clock size={10} className="inline mr-1" />{d}</p>
                        </div>
                        <span className="badge badge-orange flex-shrink-0">Pending</span>
                      </div>
                    </li>
                  )
                })
            }
            {!aLoad && appointments.filter(a => a.status === 'pending').length === 0 && (
              <li className="px-5 py-8 text-center text-ink-muted text-sm">No pending requests</li>
            )}
          </ul>
        </section>
      </div>
    </div>
  )
}
