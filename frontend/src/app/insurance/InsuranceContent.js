'use client'

import { ShieldCheck, Clock } from 'lucide-react'

const FAQ = [
  { q: 'What types of insurance are offered?',    a: 'Comprehensive, CTPL, and Fleet coverage. Contact our insurance desk for a quote.' },
  { q: 'How long does processing take?',          a: 'Standard: 3-5 business days. Renewals: 1-2 days for existing customers.' },
  { q: 'What documents are needed?',              a: 'OR/CR, valid government ID, Certificate of No Claim, and vehicle inspection report.' },
  { q: 'Is on-site inspection required?',         a: 'Yes for new comprehensive policies. Bring the vehicle to any CruisersCrib branch.' },
  { q: 'Can I inquire via this portal?',          a: 'Full inquiry and document submission is coming in the next sprint.' },
]

export default function InsuranceContent() {
  return (
    <div className="space-y-6 max-w-2xl">

      {/* Coming soon banner */}
      <div className="relative overflow-hidden rounded-2xl p-6"
           style={{ background: 'linear-gradient(135deg,#111113,#1a1000)', border: '1px solid rgba(240,124,0,0.2)' }}>
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-10 blur-3xl pointer-events-none"
             style={{ background: 'radial-gradient(circle,#f07c00,transparent)', transform: 'translate(30%,-30%)' }} />
        <div className="relative flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
               style={{ background: 'linear-gradient(135deg,#f07c00,#c9951a)' }}>
            <ShieldCheck size={24} className="text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <p className="text-lg font-extrabold text-ink-primary">Insurance Inquiries</p>
              <span className="badge badge-orange">Coming Soon</span>
            </div>
            <p className="text-sm text-ink-secondary leading-relaxed">
              Full inquiry submission, document upload, and status tracking will be available
              in the next sprint. For now, contact your nearest branch.
            </p>
          </div>
        </div>
      </div>

      {/* Branch contacts */}
      <section className="card p-5">
        <p className="card-title mb-4">Branch Contacts</p>
        <div className="space-y-3">
          {[
            { branch: 'CruisersCrib Makati',       phone: '(02) 8888-1234', hours: 'Mon-Sat 8AM-6PM' },
            { branch: 'CruisersCrib BGC',           phone: '(02) 8888-5678', hours: 'Mon-Sat 8AM-6PM' },
            { branch: 'CruisersCrib Quezon City',   phone: '(02) 8888-9012', hours: 'Mon-Sat 8AM-6PM' },
          ].map(b => (
            <div key={b.branch} className="flex items-center justify-between p-4 bg-surface-raised rounded-xl border border-surface-border">
              <div>
                <p className="text-sm font-semibold text-ink-primary">{b.branch}</p>
                <p className="text-xs text-ink-muted mt-0.5">{b.hours}</p>
              </div>
              <a href={`tel:${b.phone}`} className="text-sm font-bold" style={{ color: '#f07c00' }}>{b.phone}</a>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="card p-5">
        <p className="card-title mb-4">Insurance FAQ</p>
        <div className="space-y-3">
          {FAQ.map((item, i) => (
            <div key={i} className="p-4 bg-surface-raised rounded-xl border border-surface-border">
              <p className="text-sm font-semibold text-ink-primary mb-1.5">{item.q}</p>
              <p className="text-sm text-ink-secondary leading-relaxed">{item.a}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
