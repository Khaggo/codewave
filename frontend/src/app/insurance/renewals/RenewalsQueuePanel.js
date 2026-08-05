import { EmptyPanel, WorkflowBadge, formatDateOnly } from './RenewalsPanels'

export function RenewalsQueuePanel({
  filteredItems,
  listState,
  onSelect,
  selectedInquiry,
  selectedInquiryId,
}) {
  return (
    <section className="table-surface">
      <div className="flex flex-col gap-2 border-b border-surface-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="card-title">Renewals Queue</p>
          <p className="mt-1 text-xs text-ink-muted">Timing stays visible for quick triage.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className={`badge ${filteredItems.length ? 'badge-orange' : 'badge-gray'}`}>
            {filteredItems.length} visible renewal{filteredItems.length === 1 ? '' : 's'}
          </span>
          <span className="badge badge-gray">
            {selectedInquiry
              ? `Selected ${selectedInquiry.inquiryReference || selectedInquiry.customerDisplayName || 'renewal case'}`
              : 'No active selection'}
          </span>
        </div>
      </div>

      {listState === 'loading' ? (
        <div className="px-4 py-8 text-sm text-ink-muted">Loading live renewal cases...</div>
      ) : filteredItems.length ? (
        <div className="table-scroll">
          <table className="data-table w-full min-w-[1120px]">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Vehicle</th>
                <th>Status</th>
                <th>Renewal Stage</th>
                <th>Renewal Due</th>
                <th>Policy Expiry</th>
                <th>Time Window</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map(({ inquiry, row }) => {
                const isSelected = inquiry.id === selectedInquiryId

                return (
                  <tr
                    key={row.key}
                    onClick={() => onSelect(inquiry.id)}
                    className={isSelected ? 'bg-[#f07c00]/10' : undefined}
                    style={{ cursor: 'pointer' }}
                  >
                    <td>
                      <div className="space-y-1">
                        <p className="font-semibold text-ink-primary">{row.customer}</p>
                        <p className="text-xs text-ink-muted">
                          {inquiry.subject || inquiry.inquiryReference || 'Renewal case'}
                        </p>
                      </div>
                    </td>
                    <td>{row.vehicle}</td>
                    <td>
                      <WorkflowBadge value={inquiry.status}>{row.status}</WorkflowBadge>
                    </td>
                    <td>
                      <WorkflowBadge value={inquiry.renewalStatus}>{row.renewalStage}</WorkflowBadge>
                    </td>
                    <td>{formatDateOnly(row.renewalDueAt)}</td>
                    <td>{formatDateOnly(row.policyExpiryAt)}</td>
                    <td>
                      {row.timeWindow ? (
                        <span className={`badge ${row.timeWindow === 'Overdue' ? 'badge-orange' : 'badge-gray'}`}>
                          {row.timeWindow}
                        </span>
                      ) : (
                        <span className="badge badge-gray">No target date</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyPanel title="No renewals match the current filters" copy="Broaden filters or clear manual-only mode." />
      )}
    </section>
  )
}
