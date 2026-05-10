export function filterLoyaltyRewards(rewards, queryValue) {
  const query = queryValue.trim().toLowerCase()

  return rewards.filter((reward) =>
    !query ||
    reward.name.toLowerCase().includes(query) ||
    reward.typeLabel.toLowerCase().includes(query) ||
    reward.statusLabel.toLowerCase().includes(query),
  )
}

export function filterLoyaltyRules(rules, queryValue) {
  const query = queryValue.trim().toLowerCase()

  return rules.filter((rule) =>
    !query ||
    rule.name.toLowerCase().includes(query) ||
    rule.sourceLabel.toLowerCase().includes(query) ||
    rule.formulaLabel.toLowerCase().includes(query),
  )
}
