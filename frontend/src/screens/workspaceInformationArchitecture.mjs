export const WORKSPACE_INFORMATION_ARCHITECTURE = Object.freeze({
  jobOrders: Object.freeze({
    description:
      'Claim work, monitor the workshop queue, and open one focused job workspace.',
    sections: Object.freeze({
      queue: 'Workshop queue',
      progress: 'Service Progress',
      qa: 'QA handoff',
    }),
    sectionOrder: Object.freeze(['queue', 'progress', 'qa']),
    progressDescription:
      'Track each service, blocker, update, and required evidence item.',
  }),
  qaAudit: Object.freeze({
    description:
      'Review release checks, record verdicts, and keep overrides auditable.',
    sections: Object.freeze({
      queue: 'QA Queue',
      selectedAudit: 'Selected Audit',
      blockingFindings: 'Blocking Findings',
      verdict: 'Verdict / Override',
    }),
    sectionOrder: Object.freeze([
      'queue',
      'selectedAudit',
      'blockingFindings',
      'verdict',
    ]),
  }),
  invoices: Object.freeze({
    description:
      'Review finalized service invoices, payment entries, and completion records.',
    sections: Object.freeze({
      queue: 'Service Invoices',
      detail: 'Invoice Detail',
      payments: 'Payment Entries',
    }),
    sectionOrder: Object.freeze(['queue', 'detail', 'payments']),
  }),
  intake: Object.freeze({
    description: 'Capture the visit, then record the vehicle condition.',
    sections: Object.freeze({
      arrival: 'Arrival',
      visitType: 'Visit Type',
      concern: 'Customer Concern',
      requirements: 'Requirements',
      inspection: 'Arrival Inspection',
      history: 'Inspection History',
      detail: 'Selected Inspection Detail',
    }),
    sectionOrder: Object.freeze([
      'arrival',
      'visitType',
      'concern',
      'requirements',
      'inspection',
      'history',
      'detail',
    ]),
  }),
})

export function getWorkspaceSectionTitles(workspaceKey) {
  const workspace = WORKSPACE_INFORMATION_ARCHITECTURE[workspaceKey]
  if (!workspace) return []
  return workspace.sectionOrder.map((key) => workspace.sections[key])
}

export function isConciseWorkspaceDescription(description, maximumLength = 120) {
  const normalizedDescription = String(description ?? '').trim()
  if (!normalizedDescription || normalizedDescription.length > maximumLength) {
    return false
  }

  return (normalizedDescription.match(/[.!?](?:\s|$)/g) ?? []).length === 1
}
