'use client'

import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, CheckCircle2, RefreshCw, UserRound, Wrench } from 'lucide-react'

import {
  ApiError,
  createTechnicianProfile,
  listTechnicianProfiles,
  updateTechnicianProfile,
} from '@/lib/authClient'
import { useUser } from '@/lib/userContext'

const emptyForm = {
  fullName: '',
  specialtiesText: '',
  phone: '',
  notes: '',
}

const normalizeSpecialties = (value) =>
  [...new Set(String(value ?? '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean))]

const buildErrors = (form) => {
  const errors = {}

  if (!String(form.fullName ?? '').trim()) {
    errors.fullName = 'Enter the technician profile name.'
  }

  if (!normalizeSpecialties(form.specialtiesText).length) {
    errors.specialtiesText = 'Add at least one specialty.'
  }

  return errors
}

function Field({ label, error, helper, children }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="label uppercase tracking-[0.18em]">{label}</span>
      {children}
      {helper ? <span className="text-xs leading-5 text-ink-muted">{helper}</span> : null}
      {error ? <span className="text-xs text-red-400">{error}</span> : null}
    </label>
  )
}

function Notice({ notice }) {
  if (!notice?.text) return null

  const isSuccess = notice.tone === 'success'

  return (
    <div className={`flex items-start gap-2.5 rounded-2xl px-4 py-3 ${isSuccess ? 'status-message status-message-success' : 'status-message status-message-danger'}`}>
      {isSuccess ? <CheckCircle2 size={15} className="mt-0.5 shrink-0" /> : <AlertCircle size={15} className="mt-0.5 shrink-0" />}
      <p>{notice.text}</p>
    </div>
  )
}

export default function TechnicianDirectoryPanel() {
  const user = useUser()
  const canManageDirectory = user?.role === 'super_admin'
  const canReadDirectory = user?.role === 'service_adviser' || user?.role === 'super_admin'
  const [profiles, setProfiles] = useState([])
  const [query, setQuery] = useState('')
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState({})
  const [notice, setNotice] = useState(null)
  const [directoryState, setDirectoryState] = useState({ status: 'idle', message: '' })
  const [saving, setSaving] = useState(false)
  const [togglingId, setTogglingId] = useState('')

  const visibleProfiles = useMemo(() => {
    const normalizedQuery = String(query ?? '').trim().toLowerCase()
    if (!normalizedQuery) {
      return profiles
    }

    return profiles.filter((profile) => {
      const haystack = [
        profile.code,
        profile.fullName,
        ...(Array.isArray(profile.specialties) ? profile.specialties : []),
      ]
        .join(' ')
        .toLowerCase()

      return haystack.includes(normalizedQuery)
    })
  }, [profiles, query])

  const loadProfiles = async () => {
    if (!user?.accessToken || !canReadDirectory) return

    setDirectoryState({ status: 'loading', message: '' })
    try {
      const nextProfiles = await listTechnicianProfiles(user.accessToken, { activeOnly: false })
      setProfiles(nextProfiles)
      setDirectoryState({
        status: 'success',
        message: nextProfiles.length ? '' : 'No technician profiles have been created yet.',
      })
    } catch (error) {
      setDirectoryState({
        status: 'error',
        message: error instanceof ApiError ? error.message : 'Unable to load the technician directory right now.',
      })
    }
  }

  useEffect(() => {
    void loadProfiles()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.accessToken, canReadDirectory])

  if (!canReadDirectory) {
    return null
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const nextErrors = buildErrors(form)
    setErrors(nextErrors)
    setNotice(null)

    if (Object.keys(nextErrors).length) {
      return
    }

    setSaving(true)
    try {
      const createdProfile = await createTechnicianProfile(
        {
          fullName: form.fullName.trim(),
          specialties: normalizeSpecialties(form.specialtiesText),
          phone: form.phone.trim() || undefined,
          notes: form.notes.trim() || undefined,
        },
        user.accessToken,
      )

      setForm(emptyForm)
      setErrors({})
      setNotice({
        tone: 'success',
        text: `${createdProfile.fullName} is now available for adviser assignment and checklist generation.`,
      })
      await loadProfiles()
    } catch (error) {
      setNotice({
        tone: 'error',
        text: error instanceof ApiError ? error.message : 'Unable to save the technician profile right now.',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleToggleStatus = async (profile) => {
    if (!canManageDirectory || !profile?.id) return

    setTogglingId(profile.id)
    setNotice(null)
    try {
      const updated = await updateTechnicianProfile(
        profile.id,
        {
          isActive: !profile.isActive,
        },
        user.accessToken,
      )

      setNotice({
        tone: 'success',
        text: `${updated.fullName} is now ${updated.isActive ? 'active' : 'inactive'}.`,
      })
      await loadProfiles()
    } catch (error) {
      setNotice({
        tone: 'error',
        text: error instanceof ApiError ? error.message : 'Unable to update the technician profile status right now.',
      })
    } finally {
      setTogglingId('')
    }
  }

  return (
    <section className="card overflow-hidden">
      <div className="flex items-start justify-between gap-4 border-b border-surface-border bg-surface-raised/70 px-5 py-4">
        <div>
          <p className="card-title">Technician Directory</p>
          <p className="mt-1 text-sm text-ink-muted">
            Technicians are now managed as non-login workshop profiles with multi-specialty assignment support.
          </p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-full border border-surface-border px-3 py-2 text-xs font-semibold text-ink-secondary transition hover:border-brand-orange/40 hover:text-ink-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/50"
          onClick={() => void loadProfiles()}
          aria-label="Refresh technician directory"
        >
          <RefreshCw size={14} aria-hidden="true" />
          Refresh
        </button>
      </div>

      <div className="space-y-6 p-5">
        <Notice notice={notice} />

        {canManageDirectory ? (
          <form className="grid gap-4 rounded-3xl border border-surface-border bg-surface-panel p-5 md:grid-cols-2" onSubmit={handleSubmit}>
            <Field label="Full Name" error={errors.fullName}>
              <input
                type="text"
                name="fullName"
                autoComplete="off"
                className="input"
                value={form.fullName}
                onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))}
                placeholder="e.g. Jamie Santos…"
              />
            </Field>
            <Field
              label="Specialties"
              error={errors.specialtiesText}
              helper="Use comma-separated specialties such as mechanic, electrician, body repair."
            >
              <input
                type="text"
                name="specialties"
                autoComplete="off"
                className="input"
                value={form.specialtiesText}
                onChange={(event) => setForm((current) => ({ ...current, specialtiesText: event.target.value }))}
                placeholder="mechanic, electrician…"
              />
            </Field>
            <Field label="Phone">
              <input
                type="tel"
                name="phone"
                autoComplete="off"
                className="input"
                value={form.phone}
                onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                placeholder="09171234567…"
              />
            </Field>
            <Field label="Notes">
              <input
                type="text"
                name="notes"
                autoComplete="off"
                className="input"
                value={form.notes}
                onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                placeholder="Preferred repair lanes or reminders…"
              />
            </Field>
            <div className="md:col-span-2 flex items-center justify-between gap-3 rounded-2xl border border-surface-border bg-surface-base px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-ink-primary">Workshop profile creation</p>
                <p className="text-xs text-ink-muted">These profiles are assignable in job orders but cannot sign in to the portal or mobile app.</p>
              </div>
              <button
                type="submit"
                className="btn-primary"
                disabled={saving}
              >
                {saving ? 'Saving…' : 'Create Profile'}
              </button>
            </div>
          </form>
        ) : null}

        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_120px]">
          <label className="flex flex-col gap-2">
            <span className="label uppercase tracking-[0.18em]">Directory Search</span>
            <input
              type="search"
              name="technicianDirectorySearch"
              autoComplete="off"
              className="input"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by code, name, or specialty…"
            />
          </label>
          <div className="rounded-2xl border border-surface-border bg-surface-panel px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">Profiles</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-ink-primary">{visibleProfiles.length}</p>
            <p className="text-xs text-ink-secondary">Shown in the current filter</p>
          </div>
        </div>

        {directoryState.status === 'error' ? (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-300">
            {directoryState.message}
          </div>
        ) : null}

        <div className="grid gap-3">
          {visibleProfiles.map((profile) => (
            <article key={profile.id} className="rounded-3xl border border-surface-border bg-surface-panel px-5 py-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-orange/10 text-brand-orange">
                      <UserRound size={16} aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink-primary">{profile.fullName}</p>
                      <p className="text-xs uppercase tracking-[0.16em] text-ink-muted">{profile.code}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {profile.specialties.map((specialty) => (
                      <span key={`${profile.id}-${specialty}`} className="inline-flex items-center gap-1 rounded-full bg-surface-base px-3 py-1 text-xs font-semibold text-ink-secondary">
                        <Wrench size={12} aria-hidden="true" />
                        {specialty}
                      </span>
                    ))}
                  </div>
                  <div className="mt-3 grid gap-1 text-sm text-ink-secondary">
                    <p>{profile.phone ? `Phone: ${profile.phone}` : 'Phone: Not set'}</p>
                    <p>{profile.notes ? `Notes: ${profile.notes}` : 'Notes: None yet'}</p>
                  </div>
                </div>

                <div className="flex flex-col items-start gap-2 md:items-end">
                  <span className={`badge ${profile.isActive ? 'badge-green' : 'badge-gray'}`}>
                    {profile.isActive ? 'Active' : 'Inactive'}
                  </span>
                  {canManageDirectory ? (
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => void handleToggleStatus(profile)}
                      disabled={togglingId === profile.id}
                      aria-label={`${profile.isActive ? 'Deactivate' : 'Activate'} ${profile.fullName}`}
                    >
                      {togglingId === profile.id ? 'Saving…' : profile.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  ) : null}
                </div>
              </div>
            </article>
          ))}

          {directoryState.status === 'success' && visibleProfiles.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-surface-border px-6 py-10 text-center">
              <p className="text-sm font-semibold text-ink-primary">No technician profiles match this filter</p>
              <p className="mt-2 text-sm text-ink-secondary">Try a different specialty, code, or name keyword.</p>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  )
}
