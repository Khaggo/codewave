'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  Award,
  BarChart3,
  CheckCircle2,
  Database,
  Edit2,
  Gift,
  History,
  Plus,
  RefreshCcw,
  Search,
  Settings,
  SlidersHorizontal,
  X,
} from 'lucide-react'

import { ApiError } from '@/lib/authClient'
import {
  createLoyaltyEarningRule,
  createLoyaltyReward,
  getLoyaltyAnalytics,
  listLoyaltyEarningRules,
  listLoyaltyRewards,
  updateLoyaltyEarningRule,
  updateLoyaltyEarningRuleStatus,
  updateLoyaltyReward,
  updateLoyaltyRewardStatus,
} from '@/lib/loyaltyAdminClient'
import { useUser } from '@/lib/userContext'

const rewardTypeOptions = [
  { value: 'service_voucher', label: 'Service Voucher' },
  { value: 'discount_coupon', label: 'Discount Coupon' },
]

const rewardStatusOptions = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
]

const earningRuleSourceOptions = [
  { value: 'service', label: 'Service' },
  { value: 'ecommerce', label: 'E-commerce' },
  { value: 'both', label: 'Service + E-commerce' },
]

const earningRuleFormulaOptions = [
  { value: 'amount_ratio', label: 'Amount Ratio' },
  { value: 'flat_points', label: 'Flat Points' },
]

const createEmptyRewardForm = (reward = null) => ({
  name: reward?.name ?? '',
  description: reward?.description ?? '',
  fulfillmentNote: reward?.fulfillmentNote ?? '',
  rewardType: reward?.rewardType ?? 'service_voucher',
  pointsCost: reward?.pointsCost ? String(reward.pointsCost) : '',
  discountPercent: reward?.discountPercent ? String(reward.discountPercent) : '',
  status: reward?.status ?? 'active',
  reason: '',
})

const createEmptyRuleForm = (rule = null) => ({
  name: rule?.name ?? '',
  description: rule?.description ?? '',
  accrualSource: rule?.accrualSource ?? 'service',
  formulaType: rule?.formulaType ?? 'amount_ratio',
  flatPoints: rule?.flatPoints ? String(rule.flatPoints) : '',
  amountStepPhp: rule?.amountStepCents ? String(rule.amountStepCents / 100) : '',
  pointsPerStep: rule?.pointsPerStep ? String(rule.pointsPerStep) : '',
  minimumAmountPhp: rule?.minimumAmountCents ? String(rule.minimumAmountCents / 100) : '',
  eligibleServiceTypes: rule?.eligibleServiceTypes?.join(', ') ?? '',
  eligibleServiceCategories: rule?.eligibleServiceCategories?.join(', ') ?? '',
  eligibleProductIds: rule?.eligibleProductIds?.join(', ') ?? '',
  eligibleProductCategoryIds: rule?.eligibleProductCategoryIds?.join(', ') ?? '',
  promoLabel: rule?.promoLabel ?? '',
  manualBenefitNote: rule?.manualBenefitNote ?? '',
  status: rule?.status ?? 'active',
  reason: '',
})

const trimOrUndefined = (value) => {
  const normalizedValue = String(value ?? '').trim()
  return normalizedValue ? normalizedValue : undefined
}

const parseIntOrUndefined = (value) => {
  const normalizedValue = Number(value)
  return Number.isInteger(normalizedValue) && normalizedValue > 0 ? normalizedValue : undefined
}

const parseMoneyToCentsOrUndefined = (value) => {
  const normalizedValue = Number(value)
  return Number.isFinite(normalizedValue) && normalizedValue >= 0
    ? Math.round(normalizedValue * 100)
    : undefined
}

const parseCsv = (value) =>
  String(value ?? '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)

const getErrorMessage = (error, fallback) =>
  error instanceof Error && error.message ? error.message : fallback

const buildRewardPayload = (form, { includeStatus = false } = {}) => {
  const pointsCost = parseIntOrUndefined(form.pointsCost)

  if (!trimOrUndefined(form.name) || !pointsCost) {
    throw new ApiError('Reward name and point cost are required.', 400)
  }

  const payload = {
    name: trimOrUndefined(form.name),
    description: trimOrUndefined(form.description),
    fulfillmentNote: trimOrUndefined(form.fulfillmentNote),
    rewardType: form.rewardType,
    pointsCost,
    reason: trimOrUndefined(form.reason) ?? 'Updated from Loyalty Management.',
  }
  const discountPercent = parseIntOrUndefined(form.discountPercent)

  if (form.rewardType === 'discount_coupon' && discountPercent) {
    payload.discountPercent = discountPercent
  }

  if (includeStatus) {
    payload.status = form.status
  }

  return payload
}

const buildRulePayload = (form, { includeStatus = false } = {}) => {
  if (!trimOrUndefined(form.name)) {
    throw new ApiError('Earning rule name is required.', 400)
  }

  const payload = {
    name: trimOrUndefined(form.name),
    description: trimOrUndefined(form.description),
    accrualSource: form.accrualSource,
    formulaType: form.formulaType,
    minimumAmountCents: parseMoneyToCentsOrUndefined(form.minimumAmountPhp),
    eligibleServiceTypes: parseCsv(form.eligibleServiceTypes),
    eligibleServiceCategories: parseCsv(form.eligibleServiceCategories),
    eligibleProductIds: parseCsv(form.eligibleProductIds),
    eligibleProductCategoryIds: parseCsv(form.eligibleProductCategoryIds),
    promoLabel: trimOrUndefined(form.promoLabel),
    manualBenefitNote: trimOrUndefined(form.manualBenefitNote),
    reason: trimOrUndefined(form.reason) ?? 'Updated from Loyalty Management.',
  }

  if (form.formulaType === 'flat_points') {
    const flatPoints = parseIntOrUndefined(form.flatPoints)

    if (!flatPoints) {
      throw new ApiError('Flat-point rules need a positive point value.', 400)
    }

    payload.flatPoints = flatPoints
  } else {
    const amountStepCents = parseMoneyToCentsOrUndefined(form.amountStepPhp)
    const pointsPerStep = parseIntOrUndefined(form.pointsPerStep)

    if (!amountStepCents || !pointsPerStep) {
      throw new ApiError('Amount-ratio rules need a paid amount step and points per step.', 400)
    }

    payload.amountStepCents = amountStepCents
    payload.pointsPerStep = pointsPerStep
  }

  if (includeStatus) {
    payload.status = form.status
  }

  return payload
}

function Modal({ title, onClose, children }) {
  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-surface-raised border border-surface-border rounded-2xl w-full max-w-2xl shadow-card-md animate-slide-up">
          <div className="flex items-center justify-between px-5 py-4 border-b border-surface-border">
            <p className="font-bold text-ink-primary">{title}</p>
            <button onClick={onClose} className="p-1.5 rounded-lg text-ink-muted hover:bg-surface-hover">
              <X size={17} />
            </button>
          </div>
          <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto cc-scrollbar">{children}</div>
        </div>
      </div>
    </>
  )
}

function StatusPill({ status }) {
  return (
    <span className={`badge ${status === 'active' ? 'badge-green' : 'badge-gray'}`}>
      {status === 'active' ? 'Active' : 'Inactive'}
    </span>
  )
}

function InfoPanel({ title, body, tone = 'info' }) {
  const Icon = tone === 'warning' ? AlertTriangle : Database

  return (
    <div className="card p-5 flex gap-3">
      <div className="w-10 h-10 rounded-xl bg-surface-raised border border-surface-border flex items-center justify-center flex-shrink-0">
        <Icon size={18} className={tone === 'warning' ? 'text-amber-400' : 'text-ink-muted'} />
      </div>
      <div>
        <p className="font-bold text-ink-primary">{title}</p>
        <p className="text-sm text-ink-secondary leading-6 mt-1">{body}</p>
      </div>
    </div>
  )
}

function StatCard({ label, value, helper }) {
  return (
    <div className="card p-4">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-ink-muted">{label}</p>
      <p className="text-2xl font-extrabold text-ink-primary mt-2 tabular-nums">{value}</p>
      {helper ? <p className="text-xs text-ink-muted mt-1">{helper}</p> : null}
    </div>
  )
}

function RewardForm({ form, setForm, mode, onCancel, onSave, saving }) {
  return (
    <>
      <div>
        <label className="label">Reward Name</label>
        <input
          value={form.name}
          onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
          placeholder="Free wheel alignment"
          className="input"
        />
      </div>
      <div>
        <label className="label">Description</label>
        <textarea
          value={form.description}
          onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
          placeholder="Customer-visible reward description."
          className="input min-h-[92px]"
        />
      </div>
      <div>
        <label className="label">Fulfillment Note</label>
        <input
          value={form.fulfillmentNote}
          onChange={(event) => setForm((current) => ({ ...current, fulfillmentNote: event.target.value }))}
          placeholder="Internal redemption handling note."
          className="input"
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="label">Type</label>
          <select
            value={form.rewardType}
            onChange={(event) => setForm((current) => ({ ...current, rewardType: event.target.value }))}
            className="select"
          >
            {rewardTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Point Cost</label>
          <input
            type="number"
            min="1"
            value={form.pointsCost}
            onChange={(event) => setForm((current) => ({ ...current, pointsCost: event.target.value }))}
            placeholder="500"
            className="input"
          />
        </div>
        <div>
          <label className="label">Discount %</label>
          <input
            type="number"
            min="1"
            max="100"
            value={form.discountPercent}
            onChange={(event) => setForm((current) => ({ ...current, discountPercent: event.target.value }))}
            placeholder="Optional"
            className="input"
            disabled={form.rewardType !== 'discount_coupon'}
          />
        </div>
      </div>
      {mode === 'create' ? (
        <div>
          <label className="label">Initial Status</label>
          <select
            value={form.status}
            onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
            className="select"
          >
            {rewardStatusOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
      ) : null}
      <div>
        <label className="label">Audit Reason</label>
        <input
          value={form.reason}
          onChange={(event) => setForm((current) => ({ ...current, reason: event.target.value }))}
          placeholder="Spring campaign update."
          className="input"
        />
      </div>
      <div className="flex gap-3 pt-1">
        <button onClick={onCancel} className="btn-ghost flex-1 justify-center">Cancel</button>
        <button onClick={onSave} disabled={saving} className="btn-primary flex-1 justify-center">
          <CheckCircle2 size={14} /> {saving ? 'Saving...' : mode === 'create' ? 'Create Reward' : 'Save Reward'}
        </button>
      </div>
    </>
  )
}

function EarningRuleForm({ form, setForm, mode, onCancel, onSave, saving }) {
  return (
    <>
      <div>
        <label className="label">Rule Name</label>
        <input
          value={form.name}
          onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
          placeholder="Paid service invoice points"
          className="input"
        />
      </div>
      <div>
        <label className="label">Description</label>
        <textarea
          value={form.description}
          onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
          placeholder="How and when this rule earns points."
          className="input min-h-[82px]"
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="label">Accrual Source</label>
          <select
            value={form.accrualSource}
            onChange={(event) => setForm((current) => ({ ...current, accrualSource: event.target.value }))}
            className="select"
          >
            {earningRuleSourceOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Formula Type</label>
          <select
            value={form.formulaType}
            onChange={(event) => setForm((current) => ({ ...current, formulaType: event.target.value }))}
            className="select"
          >
            {earningRuleFormulaOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
      </div>
      {form.formulaType === 'flat_points' ? (
        <div>
          <label className="label">Flat Points</label>
          <input
            type="number"
            min="1"
            value={form.flatPoints}
            onChange={(event) => setForm((current) => ({ ...current, flatPoints: event.target.value }))}
            placeholder="100"
            className="input"
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="label">Paid Amount Step (PHP)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.amountStepPhp}
              onChange={(event) => setForm((current) => ({ ...current, amountStepPhp: event.target.value }))}
              placeholder="50"
              className="input"
            />
          </div>
          <div>
            <label className="label">Points Per Step</label>
            <input
              type="number"
              min="1"
              value={form.pointsPerStep}
              onChange={(event) => setForm((current) => ({ ...current, pointsPerStep: event.target.value }))}
              placeholder="1"
              className="input"
            />
          </div>
        </div>
      )}
      <div>
        <label className="label">Minimum Paid Amount (PHP)</label>
        <input
          type="number"
          min="0"
          step="0.01"
          value={form.minimumAmountPhp}
          onChange={(event) => setForm((current) => ({ ...current, minimumAmountPhp: event.target.value }))}
          placeholder="Optional"
          className="input"
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="label">Eligible Service Types</label>
          <input
            value={form.eligibleServiceTypes}
            onChange={(event) => setForm((current) => ({ ...current, eligibleServiceTypes: event.target.value }))}
            placeholder="collision_repair, pms"
            className="input"
          />
        </div>
        <div>
          <label className="label">Eligible Service Categories</label>
          <input
            value={form.eligibleServiceCategories}
            onChange={(event) => setForm((current) => ({ ...current, eligibleServiceCategories: event.target.value }))}
            placeholder="repair, maintenance"
            className="input"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="label">Eligible Product IDs</label>
          <input
            value={form.eligibleProductIds}
            onChange={(event) => setForm((current) => ({ ...current, eligibleProductIds: event.target.value }))}
            placeholder="Optional comma-separated IDs"
            className="input"
          />
        </div>
        <div>
          <label className="label">Eligible Product Category IDs</label>
          <input
            value={form.eligibleProductCategoryIds}
            onChange={(event) => setForm((current) => ({ ...current, eligibleProductCategoryIds: event.target.value }))}
            placeholder="Optional comma-separated IDs"
            className="input"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="label">Promo Label</label>
          <input
            value={form.promoLabel}
            onChange={(event) => setForm((current) => ({ ...current, promoLabel: event.target.value }))}
            placeholder="Summer Service Bonus"
            className="input"
          />
        </div>
        <div>
          <label className="label">Manual Benefit Note</label>
          <input
            value={form.manualBenefitNote}
            onChange={(event) => setForm((current) => ({ ...current, manualBenefitNote: event.target.value }))}
            placeholder="Issue sticker at cashier."
            className="input"
          />
        </div>
      </div>
      {mode === 'create' ? (
        <div>
          <label className="label">Initial Status</label>
          <select
            value={form.status}
            onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
            className="select"
          >
            {rewardStatusOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
      ) : null}
      <div>
        <label className="label">Audit Reason</label>
        <input
          value={form.reason}
          onChange={(event) => setForm((current) => ({ ...current, reason: event.target.value }))}
          placeholder="Rule configuration update."
          className="input"
        />
      </div>
      <div className="flex gap-3 pt-1">
        <button onClick={onCancel} className="btn-ghost flex-1 justify-center">Cancel</button>
        <button onClick={onSave} disabled={saving} className="btn-primary flex-1 justify-center">
          <CheckCircle2 size={14} /> {saving ? 'Saving...' : mode === 'create' ? 'Create Rule' : 'Save Rule'}
        </button>
      </div>
    </>
  )
}

function AnalyticsOverview({ analytics, status, errorMessage, onRefresh }) {
  if (status === 'loading' && !analytics) {
    return <InfoPanel title="Loading loyalty analytics" body="Reading the derived loyalty snapshot from the backend." />
  }

  if (errorMessage && !analytics) {
    return <InfoPanel tone="warning" title="Analytics unavailable" body={errorMessage} />
  }

  const totals = analytics?.totals ?? {
    accountCount: 0,
    totalPointsBalance: 0,
    totalPointsEarned: 0,
    totalPointsRedeemed: 0,
    redemptionCount: 0,
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-ink-muted">Live Analytics</p>
          <h2 className="text-xl font-extrabold text-ink-primary mt-1">Loyalty Snapshot</h2>
          <p className="text-sm text-ink-muted mt-1">
            {analytics?.refreshedAtLabel ? `Last refreshed ${analytics.refreshedAtLabel}` : 'Snapshot has not loaded yet.'}
          </p>
        </div>
        <button onClick={onRefresh} className="btn-ghost">
          <RefreshCcw size={14} /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
        <StatCard label="Accounts" value={totals.accountCount.toLocaleString()} />
        <StatCard label="Point Balance" value={totals.totalPointsBalance.toLocaleString()} />
        <StatCard label="Points Earned" value={totals.totalPointsEarned.toLocaleString()} />
        <StatCard label="Points Redeemed" value={totals.totalPointsRedeemed.toLocaleString()} />
        <StatCard label="Redemptions" value={totals.redemptionCount.toLocaleString()} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-surface-border">
            <p className="font-bold text-ink-primary">Transaction Types</p>
          </div>
          <div className="divide-y divide-surface-border">
            {analytics?.transactionTypes?.length ? analytics.transactionTypes.map((item) => (
              <div key={item.transactionType} className="px-5 py-3 flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-ink-primary">{item.typeLabel}</p>
                  <p className="text-xs text-ink-muted">{item.count.toLocaleString()} transaction(s)</p>
                </div>
                <p className="font-bold tabular-nums" style={{ color: item.netPointsDelta >= 0 ? '#22c55e' : '#f97316' }}>
                  {item.netPointsDelta >= 0 ? '+' : ''}{item.netPointsDelta.toLocaleString()} pts
                </p>
              </div>
            )) : (
              <p className="px-5 py-8 text-center text-sm text-ink-muted">No loyalty transaction activity yet.</p>
            )}
          </div>
        </div>

        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-surface-border">
            <p className="font-bold text-ink-primary">Top Rewards</p>
          </div>
          <div className="divide-y divide-surface-border">
            {analytics?.topRewards?.length ? analytics.topRewards.map((item) => (
              <div key={item.rewardId ?? item.rewardName} className="px-5 py-3 flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-ink-primary">{item.rewardName}</p>
                  <p className="text-xs text-ink-muted capitalize">{item.rewardStatus}</p>
                </div>
                <p className="font-bold text-ink-primary tabular-nums">{item.redemptionCount.toLocaleString()}</p>
              </div>
            )) : (
              <p className="px-5 py-8 text-center text-sm text-ink-muted">No reward redemptions recorded yet.</p>
            )}
          </div>
        </div>
      </div>

      {errorMessage ? <InfoPanel tone="warning" title="Partial analytics issue" body={errorMessage} /> : null}
    </div>
  )
}

export default function LoyaltyManager() {
  const user = useUser()
  const isSuperAdmin = user?.role === 'super_admin'
  const canReadLoyalty = ['service_adviser', 'super_admin'].includes(user?.role)
  const [tab, setTab] = useState('overview')
  const [state, setState] = useState({
    status: 'idle',
    rewards: [],
    earningRules: [],
    analytics: null,
    errors: {},
  })
  const [rewardQuery, setRewardQuery] = useState('')
  const [ruleQuery, setRuleQuery] = useState('')
  const [modal, setModal] = useState(null)
  const [selected, setSelected] = useState(null)
  const [rewardForm, setRewardForm] = useState(createEmptyRewardForm)
  const [ruleForm, setRuleForm] = useState(createEmptyRuleForm)
  const [actionState, setActionState] = useState({ status: 'idle', message: '' })

  const loadLoyaltyState = useCallback(async () => {
    if (!user?.accessToken) {
      setState((current) => ({
        ...current,
        status: 'error',
        errors: { page: 'Sign in as staff before loading loyalty management.' },
      }))
      return
    }

    setState((current) => ({
      ...current,
      status: current.status === 'idle' ? 'loading' : 'refreshing',
      errors: {},
    }))

    const [rewardsResult, rulesResult, analyticsResult] = await Promise.allSettled([
      listLoyaltyRewards(user.accessToken),
      listLoyaltyEarningRules(user.accessToken),
      getLoyaltyAnalytics(user.accessToken),
    ])
    const nextErrors = {}

    if (rewardsResult.status === 'rejected') {
      nextErrors.rewards = getErrorMessage(rewardsResult.reason, 'Unable to load reward catalog.')
    }

    if (rulesResult.status === 'rejected') {
      nextErrors.earningRules = getErrorMessage(rulesResult.reason, 'Unable to load earning rules.')
    }

    if (analyticsResult.status === 'rejected') {
      nextErrors.analytics = getErrorMessage(analyticsResult.reason, 'Unable to load loyalty analytics.')
    }

    setState((current) => ({
      status: 'ready',
      rewards: rewardsResult.status === 'fulfilled' ? rewardsResult.value : current.rewards,
      earningRules: rulesResult.status === 'fulfilled' ? rulesResult.value : current.earningRules,
      analytics: analyticsResult.status === 'fulfilled' ? analyticsResult.value : current.analytics,
      errors: nextErrors,
    }))
  }, [user?.accessToken])

  useEffect(() => {
    if (canReadLoyalty && user?.accessToken) {
      void loadLoyaltyState()
    }
  }, [canReadLoyalty, loadLoyaltyState, user?.accessToken])

  const filteredRewards = useMemo(() => {
    const query = rewardQuery.trim().toLowerCase()

    return state.rewards.filter((reward) =>
      !query ||
      reward.name.toLowerCase().includes(query) ||
      reward.typeLabel.toLowerCase().includes(query) ||
      reward.statusLabel.toLowerCase().includes(query),
    )
  }, [rewardQuery, state.rewards])

  const filteredRules = useMemo(() => {
    const query = ruleQuery.trim().toLowerCase()

    return state.earningRules.filter((rule) =>
      !query ||
      rule.name.toLowerCase().includes(query) ||
      rule.sourceLabel.toLowerCase().includes(query) ||
      rule.formulaLabel.toLowerCase().includes(query),
    )
  }, [ruleQuery, state.earningRules])

  const openCreateReward = () => {
    setSelected(null)
    setRewardForm(createEmptyRewardForm())
    setModal('createReward')
    setActionState({ status: 'idle', message: '' })
  }

  const openEditReward = (reward) => {
    setSelected(reward)
    setRewardForm(createEmptyRewardForm(reward))
    setModal('editReward')
    setActionState({ status: 'idle', message: '' })
  }

  const openCreateRule = () => {
    setSelected(null)
    setRuleForm(createEmptyRuleForm())
    setModal('createRule')
    setActionState({ status: 'idle', message: '' })
  }

  const openEditRule = (rule) => {
    setSelected(rule)
    setRuleForm(createEmptyRuleForm(rule))
    setModal('editRule')
    setActionState({ status: 'idle', message: '' })
  }

  const handleRewardSave = async () => {
    if (!isSuperAdmin) {
      setActionState({ status: 'error', message: 'Only super admins can manage reward catalog entries.' })
      return
    }

    setActionState({ status: 'saving', message: '' })

    try {
      if (modal === 'createReward') {
        await createLoyaltyReward(buildRewardPayload(rewardForm, { includeStatus: true }), user.accessToken)
      } else {
        await updateLoyaltyReward({
          rewardId: selected?.id,
          ...buildRewardPayload(rewardForm),
        }, user.accessToken)
      }

      setModal(null)
      setActionState({ status: 'idle', message: '' })
      await loadLoyaltyState()
    } catch (error) {
      setActionState({
        status: 'error',
        message: getErrorMessage(error, 'Unable to save reward.'),
      })
    }
  }

  const handleRewardStatusToggle = async (reward) => {
    if (!isSuperAdmin) {
      setActionState({ status: 'error', message: 'Only super admins can change reward status.' })
      return
    }

    const nextStatus = reward.status === 'active' ? 'inactive' : 'active'
    setActionState({ status: 'saving', message: `Updating ${reward.name}...` })

    try {
      await updateLoyaltyRewardStatus({
        rewardId: reward.id,
        status: nextStatus,
        reason: `${nextStatus === 'active' ? 'Activated' : 'Deactivated'} from Loyalty Management.`,
      }, user.accessToken)
      setActionState({ status: 'idle', message: '' })
      await loadLoyaltyState()
    } catch (error) {
      setActionState({
        status: 'error',
        message: getErrorMessage(error, 'Unable to update reward status.'),
      })
    }
  }

  const handleRuleSave = async () => {
    if (!isSuperAdmin) {
      setActionState({ status: 'error', message: 'Only super admins can manage earning rules.' })
      return
    }

    setActionState({ status: 'saving', message: '' })

    try {
      if (modal === 'createRule') {
        await createLoyaltyEarningRule(buildRulePayload(ruleForm, { includeStatus: true }), user.accessToken)
      } else {
        await updateLoyaltyEarningRule({
          ruleId: selected?.id,
          ...buildRulePayload(ruleForm),
        }, user.accessToken)
      }

      setModal(null)
      setActionState({ status: 'idle', message: '' })
      await loadLoyaltyState()
    } catch (error) {
      setActionState({
        status: 'error',
        message: getErrorMessage(error, 'Unable to save earning rule.'),
      })
    }
  }

  const handleRuleStatusToggle = async (rule) => {
    if (!isSuperAdmin) {
      setActionState({ status: 'error', message: 'Only super admins can change earning rule status.' })
      return
    }

    const nextStatus = rule.status === 'active' ? 'inactive' : 'active'
    setActionState({ status: 'saving', message: `Updating ${rule.name}...` })

    try {
      await updateLoyaltyEarningRuleStatus({
        ruleId: rule.id,
        status: nextStatus,
        reason: `${nextStatus === 'active' ? 'Activated' : 'Deactivated'} from Loyalty Management.`,
      }, user.accessToken)
      setActionState({ status: 'idle', message: '' })
      await loadLoyaltyState()
    } catch (error) {
      setActionState({
        status: 'error',
        message: getErrorMessage(error, 'Unable to update earning rule status.'),
      })
    }
  }

  if (!canReadLoyalty) {
    return (
      <InfoPanel
        tone="warning"
        title="Loyalty management is staff/admin only"
        body="Sign in as a service adviser or super admin to view customer loyalty administration."
      />
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-ink-muted">Customer Loyalty</p>
          <h1 className="text-2xl font-extrabold text-ink-primary mt-1">Loyalty Management</h1>
          <p className="text-sm text-ink-muted mt-1">
            Rewards, earning rules, and usage analytics now read from the live backend.
          </p>
        </div>
        <button onClick={loadLoyaltyState} className="btn-ghost self-start lg:self-auto">
          <RefreshCcw size={14} /> Refresh Live Data
        </button>
      </div>

      {actionState.status === 'error' ? (
        <InfoPanel tone="warning" title="Action failed" body={actionState.message} />
      ) : null}
      {actionState.status === 'saving' && actionState.message ? (
        <InfoPanel title="Working" body={actionState.message} />
      ) : null}
      {!isSuperAdmin ? (
        <InfoPanel
          tone="warning"
          title="Read-only for service advisers"
          body="Service advisers can view loyalty analytics and visible rewards. Reward catalog and earning-rule configuration are super-admin actions."
        />
      ) : null}

      <div className="flex gap-1 p-1 bg-surface-card border border-surface-border rounded-xl w-fit flex-wrap">
        {[
          { key: 'overview', icon: BarChart3, label: 'Overview' },
          { key: 'rewards', icon: Gift, label: 'Reward Config' },
          { key: 'rules', icon: SlidersHorizontal, label: 'Earning Rules' },
          { key: 'customers', icon: Award, label: 'Customer Accounts' },
          { key: 'log', icon: History, label: 'Redemption Log' },
        ].map((item) => (
          <button
            key={item.key}
            onClick={() => setTab(item.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === item.key ? 'text-white' : 'text-ink-muted hover:text-ink-secondary hover:bg-surface-hover'
            }`}
            style={tab === item.key ? { background: '#f07c00' } : {}}
          >
            <item.icon size={14} /> {item.label}
          </button>
        ))}
      </div>

      {tab === 'overview' ? (
        <AnalyticsOverview
          analytics={state.analytics}
          status={state.status}
          errorMessage={state.errors.analytics}
          onRefresh={loadLoyaltyState}
        />
      ) : null}

      {tab === 'rewards' ? (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex items-center gap-2 bg-surface-card border border-surface-border rounded-lg px-3 py-2 flex-1 max-w-md">
              <Search size={14} className="text-ink-muted flex-shrink-0" />
              <input
                value={rewardQuery}
                onChange={(event) => setRewardQuery(event.target.value)}
                placeholder="Search reward catalog..."
                className="bg-transparent text-sm text-ink-secondary placeholder-ink-muted outline-none w-full"
              />
            </div>
            <button onClick={openCreateReward} disabled={!isSuperAdmin} className="btn-primary justify-center">
              <Plus size={15} /> Create Reward
            </button>
          </div>

          {state.errors.rewards ? <InfoPanel tone="warning" title="Reward catalog issue" body={state.errors.rewards} /> : null}

          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[760px]">
                <thead>
                  <tr className="text-left text-xs text-ink-muted border-b border-surface-border bg-surface-raised">
                    <th className="px-5 py-3.5 font-semibold">Reward</th>
                    <th className="px-5 py-3.5 font-semibold">Type</th>
                    <th className="px-5 py-3.5 font-semibold">Cost</th>
                    <th className="px-5 py-3.5 font-semibold">Discount</th>
                    <th className="px-5 py-3.5 font-semibold">Status</th>
                    <th className="px-5 py-3.5 font-semibold">Updated</th>
                    <th className="px-5 py-3.5 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {filteredRewards.length ? filteredRewards.map((reward) => (
                    <tr key={reward.id} className="hover:bg-surface-hover transition-colors">
                      <td className="px-5 py-3.5">
                        <p className="font-semibold text-ink-primary">{reward.name}</p>
                        <p className="text-xs text-ink-muted max-w-sm truncate">
                          {reward.description ?? reward.fulfillmentNote ?? 'No description yet.'}
                        </p>
                      </td>
                      <td className="px-5 py-3.5"><span className="badge badge-blue">{reward.typeLabel}</span></td>
                      <td className="px-5 py-3.5 font-bold tabular-nums" style={{ color: '#f07c00' }}>
                        {reward.pointsLabel}
                      </td>
                      <td className="px-5 py-3.5 text-ink-secondary">{reward.discountLabel}</td>
                      <td className="px-5 py-3.5"><StatusPill status={reward.status} /></td>
                      <td className="px-5 py-3.5 text-xs text-ink-muted">{reward.updatedAtLabel}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEditReward(reward)}
                            disabled={!isSuperAdmin}
                            className="p-1.5 rounded-lg text-ink-muted hover:text-ink-primary hover:bg-surface-hover transition-colors disabled:opacity-40"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            onClick={() => handleRewardStatusToggle(reward)}
                            disabled={!isSuperAdmin || actionState.status === 'saving'}
                            className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-surface-border text-ink-secondary hover:bg-surface-hover transition-colors disabled:opacity-40"
                          >
                            {reward.status === 'active' ? 'Deactivate' : 'Activate'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={7} className="px-5 py-12 text-center text-ink-muted text-sm">
                        No rewards found in the live catalog.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}

      {tab === 'rules' ? (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex items-center gap-2 bg-surface-card border border-surface-border rounded-lg px-3 py-2 flex-1 max-w-md">
              <Search size={14} className="text-ink-muted flex-shrink-0" />
              <input
                value={ruleQuery}
                onChange={(event) => setRuleQuery(event.target.value)}
                placeholder="Search earning rules..."
                className="bg-transparent text-sm text-ink-secondary placeholder-ink-muted outline-none w-full"
              />
            </div>
            <button onClick={openCreateRule} disabled={!isSuperAdmin} className="btn-primary justify-center">
              <Plus size={15} /> Create Earning Rule
            </button>
          </div>

          {state.errors.earningRules ? (
            <InfoPanel tone="warning" title="Earning rules unavailable" body={state.errors.earningRules} />
          ) : null}

          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[860px]">
                <thead>
                  <tr className="text-left text-xs text-ink-muted border-b border-surface-border bg-surface-raised">
                    <th className="px-5 py-3.5 font-semibold">Rule</th>
                    <th className="px-5 py-3.5 font-semibold">Source</th>
                    <th className="px-5 py-3.5 font-semibold">Formula</th>
                    <th className="px-5 py-3.5 font-semibold">Minimum</th>
                    <th className="px-5 py-3.5 font-semibold">Window</th>
                    <th className="px-5 py-3.5 font-semibold">Status</th>
                    <th className="px-5 py-3.5 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {filteredRules.length ? filteredRules.map((rule) => (
                    <tr key={rule.id} className="hover:bg-surface-hover transition-colors">
                      <td className="px-5 py-3.5">
                        <p className="font-semibold text-ink-primary">{rule.name}</p>
                        <p className="text-xs text-ink-muted max-w-sm truncate">
                          {rule.description ?? rule.promoLabel ?? 'No description yet.'}
                        </p>
                      </td>
                      <td className="px-5 py-3.5"><span className="badge badge-purple">{rule.sourceLabel}</span></td>
                      <td className="px-5 py-3.5">
                        <p className="font-bold text-ink-primary">{rule.formulaSummary}</p>
                        <p className="text-xs text-ink-muted">{rule.formulaLabel}</p>
                      </td>
                      <td className="px-5 py-3.5 text-ink-secondary">{rule.minimumAmountLabel}</td>
                      <td className="px-5 py-3.5 text-xs text-ink-muted max-w-[220px]">{rule.activeWindowLabel}</td>
                      <td className="px-5 py-3.5"><StatusPill status={rule.status} /></td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEditRule(rule)}
                            disabled={!isSuperAdmin}
                            className="p-1.5 rounded-lg text-ink-muted hover:text-ink-primary hover:bg-surface-hover transition-colors disabled:opacity-40"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            onClick={() => handleRuleStatusToggle(rule)}
                            disabled={!isSuperAdmin || actionState.status === 'saving'}
                            className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-surface-border text-ink-secondary hover:bg-surface-hover transition-colors disabled:opacity-40"
                          >
                            {rule.status === 'active' ? 'Deactivate' : 'Activate'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={7} className="px-5 py-12 text-center text-ink-muted text-sm">
                        No live earning rules found, or your role cannot read this super-admin configuration.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}

      {tab === 'customers' ? (
        <div className="space-y-4">
          <InfoPanel
            tone="warning"
            title="Customer account list needs one backend route"
            body="The backend can read a specific customer's loyalty balance by user id, but it does not yet expose an admin route to list or search all loyalty accounts. The cards below use analytics totals only."
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <StatCard label="Known Accounts" value={(state.analytics?.totals.accountCount ?? 0).toLocaleString()} />
            <StatCard label="Total Balance" value={(state.analytics?.totals.totalPointsBalance ?? 0).toLocaleString()} helper="Across all loyalty accounts" />
            <StatCard label="Manual Adjustment" value="Blocked" helper="Needs an admin adjustment endpoint" />
          </div>
        </div>
      ) : null}

      {tab === 'log' ? (
        <div className="space-y-4">
          <InfoPanel
            tone="warning"
            title="Detailed redemption log needs one backend route"
            body="The backend records redemptions and analytics can summarize top rewards, but the web app does not yet have a live route to list every redemption row for staff review."
          />
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-surface-border">
              <p className="font-bold text-ink-primary">Analytics-backed Top Rewards</p>
            </div>
            <div className="divide-y divide-surface-border">
              {state.analytics?.topRewards?.length ? state.analytics.topRewards.map((item) => (
                <div key={item.rewardId ?? item.rewardName} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-ink-primary">{item.rewardName}</p>
                    <p className="text-xs text-ink-muted capitalize">{item.rewardStatus}</p>
                  </div>
                  <p className="font-bold text-ink-primary">{item.redemptionCount.toLocaleString()} redemption(s)</p>
                </div>
              )) : (
                <p className="px-5 py-10 text-center text-sm text-ink-muted">No redemption analytics yet.</p>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {(modal === 'createReward' || modal === 'editReward') ? (
        <Modal
          title={modal === 'createReward' ? 'Create Reward' : `Edit Reward - ${selected?.name ?? ''}`}
          onClose={() => setModal(null)}
        >
          {actionState.status === 'error' ? (
            <InfoPanel tone="warning" title="Unable to save" body={actionState.message} />
          ) : null}
          <RewardForm
            form={rewardForm}
            setForm={setRewardForm}
            mode={modal === 'createReward' ? 'create' : 'edit'}
            saving={actionState.status === 'saving'}
            onCancel={() => setModal(null)}
            onSave={handleRewardSave}
          />
        </Modal>
      ) : null}

      {(modal === 'createRule' || modal === 'editRule') ? (
        <Modal
          title={modal === 'createRule' ? 'Create Earning Rule' : `Edit Rule - ${selected?.name ?? ''}`}
          onClose={() => setModal(null)}
        >
          {actionState.status === 'error' ? (
            <InfoPanel tone="warning" title="Unable to save" body={actionState.message} />
          ) : null}
          <EarningRuleForm
            form={ruleForm}
            setForm={setRuleForm}
            mode={modal === 'createRule' ? 'create' : 'edit'}
            saving={actionState.status === 'saving'}
            onCancel={() => setModal(null)}
            onSave={handleRuleSave}
          />
        </Modal>
      ) : null}
    </div>
  )
}
