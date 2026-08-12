import { useEffect, useState } from 'react'
import { Loader2, UserPlus } from 'lucide-react'

import { ApiError, createWalkInCustomer } from '@/lib/authClient'
import { IntakeFocusedModal } from './DigitalIntakeInspectionComponents'

const initialForm = {
  fullName: '',
  phone: '',
  email: '',
  consentAcknowledged: false,
  plateNumber: '',
  make: '',
  model: '',
  year: '',
  color: '',
}

const normalizePhone = (value) => {
  const digits = String(value ?? '').replace(/\D/g, '')
  return digits.startsWith('63') ? `0${digits.slice(2)}` : digits
}

const getValidationErrors = (form) => {
  const errors = {}
  if (String(form.fullName).trim().split(/\s+/).filter(Boolean).length < 2) errors.fullName = 'Enter the customer’s full name.'
  if (normalizePhone(form.phone).length < 10) errors.phone = 'Enter a valid mobile or contact number.'
  if (!form.consentAcknowledged) errors.consentAcknowledged = 'A contact and record consent acknowledgement is required.'
  if (!String(form.plateNumber).trim()) errors.plateNumber = 'Enter a plate or vehicle reference.'
  if (!String(form.make).trim()) errors.make = 'Enter the vehicle make.'
  if (!String(form.model).trim()) errors.model = 'Enter the vehicle model.'
  const year = Number(form.year)
  if (!Number.isInteger(year) || year < 1900 || year > new Date().getFullYear() + 1) errors.year = 'Enter a valid vehicle year.'
  return errors
}

const getServerMessage = (error) => {
  if (!(error instanceof ApiError)) return error?.message || 'The walk-in record could not be saved.'
  if (error.status === 401 || error.status === 403) return 'Your staff session cannot create walk-in records. Sign in again or ask an authorized adviser.'
  if (error.status === 409) return error.message || 'A possible match or ownership conflict needs staff review.'
  if (error.status === 400) return error.message || 'Check the highlighted walk-in fields and try again.'
  return error.message || 'The walk-in record could not be saved. Try again.'
}

export function WalkInCustomerModal({ open, accessToken, onClose, onSuccess, returnFocusRef }) {
  const [form, setForm] = useState(initialForm)
  const [fieldErrors, setFieldErrors] = useState({})
  const [submitState, setSubmitState] = useState({ status: 'idle', message: '', matches: [] })

  useEffect(() => {
    if (!open) return
    setForm(initialForm)
    setFieldErrors({})
    setSubmitState({ status: 'idle', message: '', matches: [] })
  }, [open])

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }))
    setFieldErrors((current) => ({ ...current, [field]: '' }))
  }

  const submit = async (event) => {
    event.preventDefault()
    const errors = getValidationErrors(form)
    if (Object.keys(errors).length) {
      setFieldErrors(errors)
      setSubmitState({ status: 'validation', message: 'Complete the required fields before saving.', matches: [] })
      return
    }

    setSubmitState({ status: 'loading', message: '', matches: [] })
    try {
      const result = await createWalkInCustomer({
        fullName: form.fullName.trim(),
        phone: normalizePhone(form.phone),
        email: form.email.trim() || undefined,
        consentAcknowledged: true,
        plateNumber: form.plateNumber.trim(),
        make: form.make.trim(),
        model: form.model.trim(),
        year: Number(form.year),
        color: form.color.trim() || undefined,
      }, accessToken)
      onSuccess({ result, form })
    } catch (error) {
      setSubmitState({
        status: 'error',
        message: getServerMessage(error),
        matches: Array.isArray(error?.details?.matches) ? error.details.matches : [],
      })
    }
  }

  const renderField = (field, label, props = {}) => (
    <label className="label">
      {label}
      <input
        {...props}
        value={form[field]}
        onChange={(event) => updateField(field, event.target.value)}
        className="input"
        aria-invalid={Boolean(fieldErrors[field])}
        aria-describedby={fieldErrors[field] ? `${field}-error` : undefined}
      />
      {fieldErrors[field] ? <span id={`${field}-error`} className="mt-1 block text-xs text-red-300">{fieldErrors[field]}</span> : null}
    </label>
  )

  return (
    <IntakeFocusedModal
      open={open}
      id="walk-in-customer-dialog"
      title="Add walk-in customer"
      description="Create or reuse an intake-only customer profile and owned vehicle."
      onClose={onClose}
      returnFocusRef={returnFocusRef}
      widthClassName="max-w-3xl"
    >
      <form className="space-y-4" onSubmit={submit} noValidate>
        <div className="grid gap-3 md:grid-cols-2">
          {renderField('fullName', 'Full name', { required: true, autoComplete: 'name', autoFocus: true })}
          {renderField('phone', 'Mobile / contact number', { required: true, inputMode: 'tel', autoComplete: 'tel' })}
          {renderField('email', 'Email (optional)', { type: 'email', autoComplete: 'email' })}
          {renderField('plateNumber', 'Plate / vehicle reference', { required: true, autoComplete: 'off' })}
          {renderField('make', 'Make', { required: true, autoComplete: 'off' })}
          {renderField('model', 'Model', { required: true, autoComplete: 'off' })}
          {renderField('year', 'Year', { required: true, type: 'number', min: 1900, max: new Date().getFullYear() + 1, inputMode: 'numeric' })}
          {renderField('color', 'Color (optional)', { autoComplete: 'off' })}
        </div>

        <label className={`flex items-start gap-3 rounded-xl border p-3 text-sm ${fieldErrors.consentAcknowledged ? 'border-red-400/50 bg-red-400/5' : 'border-surface-border bg-surface-raised'}`}>
          <input
            type="checkbox"
            checked={form.consentAcknowledged}
            onChange={(event) => updateField('consentAcknowledged', event.target.checked)}
            className="mt-1 h-4 w-4 accent-[#f07c00]"
            aria-invalid={Boolean(fieldErrors.consentAcknowledged)}
          />
          <span>
            I acknowledge consent to record this customer’s contact details and vehicle for today’s intake.
            {fieldErrors.consentAcknowledged ? <span className="mt-1 block text-xs text-red-300">{fieldErrors.consentAcknowledged}</span> : null}
          </span>
        </label>

        <p className="text-xs text-ink-muted">This is an intake-only profile. Mobile sign-in is not enabled by this action.</p>

        {submitState.message ? (
          <div className={`status-message ${submitState.status === 'error' || submitState.status === 'validation' ? 'status-message-danger' : 'status-message-warning'}`} role={submitState.status === 'error' ? 'alert' : 'status'}>
            <p>{submitState.message}</p>
            {submitState.matches.length ? (
              <ul className="mt-2 list-disc space-y-1 pl-5 text-xs">
                {submitState.matches.map((match) => <li key={`${match.customerUserId}-${match.matchedBy?.join('-')}`}>{match.customerLabel || 'Existing customer'} matched by {(match.matchedBy ?? []).join(' and ') || 'contact details'}. Select the existing record or resolve ownership before retrying.</li>)}
              </ul>
            ) : null}
          </div>
        ) : null}

        <div className="flex flex-wrap justify-end gap-2 border-t border-surface-border pt-3">
          <button type="button" className="btn-ghost min-h-11" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary min-h-11" disabled={submitState.status === 'loading'}>
            {submitState.status === 'loading' ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <UserPlus size={16} aria-hidden="true" />}
            {submitState.status === 'loading' ? 'Saving...' : 'Save walk-in customer'}
          </button>
        </div>
      </form>
    </IntakeFocusedModal>
  )
}
