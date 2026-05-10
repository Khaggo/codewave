export const settingsTabs = [
  {
    key: 'profile',
    label: 'Profile Information',
  },
  {
    key: 'security',
    label: 'Account Security',
  },
]

export function getSettingsTab(key) {
  return settingsTabs.find((tab) => tab.key === key) ?? settingsTabs[0]
}
