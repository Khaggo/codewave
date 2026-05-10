const findingSeverityPriority = {
  critical: 0,
  warning: 1,
  info: 2,
}

const findingGroupDefinitions = [
  {
    key: 'critical',
    title: 'Blocking Findings',
    badgeClass: 'badge-red',
    matches: (finding) => finding.severity === 'critical',
  },
  {
    key: 'warning',
    title: 'Review Needed',
    badgeClass: 'badge-orange',
    matches: (finding) => finding.severity === 'warning',
  },
  {
    key: 'info',
    title: 'Informational Findings',
    badgeClass: 'badge-gray',
    matches: (finding) => finding.severity === 'info',
  },
  {
    key: 'other',
    title: 'Additional Findings',
    badgeClass: 'badge-gray',
    matches: (finding) => !Object.hasOwn(findingSeverityPriority, finding.severity ?? ''),
  },
]

export function getFindingSortPriority(finding) {
  const severity = finding?.severity ?? ''
  return Object.hasOwn(findingSeverityPriority, severity)
    ? findingSeverityPriority[severity]
    : findingGroupDefinitions.length
}

export function sortQualityFindings(findings) {
  return [...findings].sort((left, right) => {
    const severityDelta = getFindingSortPriority(left) - getFindingSortPriority(right)
    if (severityDelta !== 0) return severityDelta

    const riskDelta = (right.riskContribution ?? -1) - (left.riskContribution ?? -1)
    if (riskDelta !== 0) return riskDelta

    const createdAtDelta = String(right.createdAt ?? '').localeCompare(String(left.createdAt ?? ''))
    if (createdAtDelta !== 0) return createdAtDelta

    return `${left.gate}:${left.code}`.localeCompare(`${right.gate}:${right.code}`)
  })
}

export function getGroupedQualityFindings(findings) {
  const sortedFindings = sortQualityFindings(findings)
  const groupedFindingIds = new Set()

  return findingGroupDefinitions
    .map((group) => {
      const items = sortedFindings.filter((finding) => {
        if (groupedFindingIds.has(finding.id) || !group.matches(finding)) {
          return false
        }

        groupedFindingIds.add(finding.id)
        return true
      })

      return {
        ...group,
        items,
      }
    })
    .filter((group) => group.items.length > 0)
}
