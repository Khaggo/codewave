'use client'

import { motion } from 'framer-motion'
import { LockKeyhole, UserRound } from 'lucide-react'
import { useState } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import AccountSecurity from './AccountSecurity.js'
import ProfileInformation from './ProfileInformation.js'
import { settingsTabs } from './settingsView.mjs'

const tabIcons = {
  profile: UserRound,
  security: LockKeyhole,
}

export default function SettingsWorkspace() {
  const [activeTab, setActiveTab] = useState('profile')

  return (
    <div className="ops-page-shell max-w-4xl">
      <PageHeader
        eyebrow="Staff Settings"
        title="Profile And Account Security"
        description="Review the staff identity details shown across the portal and follow the current security controls for account protection."
        meta={
          <>
            <span className="badge badge-gray">Profile</span>
            <span className="badge badge-gray">Security</span>
          </>
        }
      />

      <div className="toolbar-surface w-fit p-2">
        <div className="flex flex-wrap gap-2">
        {settingsTabs.map((tab) => {
          const Icon = tabIcons[tab.key]
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
