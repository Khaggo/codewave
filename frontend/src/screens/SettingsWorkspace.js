'use client'

import { motion } from 'framer-motion'
import { LockKeyhole, UserRound } from 'lucide-react'
import { useState } from 'react'
import AccountSecurity from './AccountSecurity.js'
import ProfileInformation from './ProfileInformation.js'

const tabs = [
  {
    key: 'profile',
    label: 'Profile Information',
    icon: UserRound,
  },
  {
    key: 'security',
    label: 'Account Security',
    icon: LockKeyhole,
  },
]

export default function SettingsWorkspace() {
  const [activeTab, setActiveTab] = useState('profile')

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-wrap gap-2 rounded-2xl border border-surface-border bg-surface-card p-2 w-fit">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const active = tab.key === activeTab

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
                active ? 'bg-brand-orange text-white shadow-glow-sm' : 'text-ink-muted hover:bg-surface-hover hover:text-ink-primary'
              }`}
            >
              <Icon size={15} />
              {tab.label}
            </button>
          )
        })}
      </div>

      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
      >
        {activeTab === 'profile' ? <ProfileInformation /> : <AccountSecurity />}
      </motion.div>
    </div>
  )
}
