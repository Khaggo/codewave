'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ShieldCheck, Mail, Loader2, TriangleAlert } from 'lucide-react'
import OtpInput from './OtpInput.jsx'
import { getOtpContent, maskEmail, MOCK_OTP, RESEND_SECONDS } from '@/lib/otp'

export default function OtpModal({
  isOpen,
  onClose,
  onVerify,
  onInvalidCode,
  email,
  purpose = 'login',
}) {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resendTimer, setResendTimer] = useState(RESEND_SECONDS)
  const [sent, setSent] = useState(false)
  const resendTimeoutRef = useRef(null)
  const isMountedRef = useRef(true)

  const texts = getOtpContent(purpose)

  useEffect(() => {
    return () => {
      isMountedRef.current = false
      if (resendTimeoutRef.current) {
        clearTimeout(resendTimeoutRef.current)
        resendTimeoutRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (!isOpen) {
      if (resendTimeoutRef.current) {
        clearTimeout(resendTimeoutRef.current)
        resendTimeoutRef.current = null
      }
      return
    }

    setCode('')
    setError('')
    setLoading(false)
    setResendTimer(RESEND_SECONDS)
    setSent(false)
  }, [isOpen])

  useEffect(() => {
    if (!isOpen || resendTimer <= 0) return undefined

    const timer = setInterval(() => setResendTimer((prev) => prev - 1), 1000)
    return () => clearInterval(timer)
  }, [isOpen, resendTimer])

  const handleVerify = useCallback(async () => {
    if (code.length !== 6) {
      setError('Enter all 6 digits.')
      return
    }

    setLoading(true)
    setError('')

    try {
      await new Promise((resolve) => setTimeout(resolve, 300))

      if (code === MOCK_OTP) {
        await Promise.resolve(onVerify?.())
        return
      }

      const message = texts.invalidMessage
      if (isMountedRef.current) {
        setError(message)
        onInvalidCode?.(message)
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false)
      }
    }
  }, [code, onInvalidCode, onVerify, texts.invalidMessage])

  const handleResend = useCallback(() => {
    if (resendTimeoutRef.current) {
      clearTimeout(resendTimeoutRef.current)
    }

    setResendTimer(RESEND_SECONDS)
    setSent(true)
    setError('')

    resendTimeoutRef.current = setTimeout(() => {
      if (isMountedRef.current) {
        setSent(false)
      }
      resendTimeoutRef.current = null
    }, 2000)
  }, [])

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={texts.title}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[90] flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.70)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !loading) onClose()
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="w-full max-w-md rounded-2xl p-6 md:p-8"
            style={{
              backgroundColor: '#111113',
              border: '1px solid rgba(240,124,0,0.15)',
              boxShadow: '0 24px 70px rgba(0,0,0,0.65)',
            }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(240,124,0,0.12)', border: '1px solid rgba(240,124,0,0.2)' }}
              >
                <ShieldCheck size={20} style={{ color: '#f07c00' }} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-ink-primary">{texts.title}</h3>
                <p className="text-xs text-ink-muted">{texts.subtitle}</p>
              </div>
            </div>

            <div
              className="flex items-center gap-2 px-4 py-3 rounded-xl mb-6"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <Mail size={14} className="text-ink-dim" />
              <p className="text-sm font-mono text-ink-secondary">{maskEmail(email)}</p>
            </div>

            <div
              className="rounded-xl px-4 py-3 mb-5"
              style={{ background: 'rgba(240,124,0,0.06)', border: '1px solid rgba(240,124,0,0.15)' }}
            >
              <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: '#f07c00' }}>
                Prototype Code
              </p>
              <p className="text-2xl font-black tracking-[6px] text-ink-primary">123456</p>
            </div>

            {error && (
              <div
                className="mb-4 flex items-start gap-2 rounded-xl px-4 py-3"
                style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.22)' }}
                role="alert"
              >
                <TriangleAlert size={16} className="mt-0.5 text-red-400" />
                <p className="text-xs font-medium text-red-200">{error}</p>
              </div>
            )}

            <div className="mb-4">
              <OtpInput value={code} onChange={setCode} disabled={loading} error={!!error} />
            </div>

            {sent && (
              <p className="text-xs text-emerald-400 text-center mb-3">Code resent successfully!</p>
            )}

            <div className="text-center mb-5">
              {resendTimer > 0 ? (
                <p className="text-xs text-ink-muted">
                  Resend code in <span className="font-bold text-ink-secondary">{resendTimer}s</span>
                </p>
              ) : (
                <button
                  onClick={handleResend}
                  disabled={loading}
                  className="text-xs font-bold transition-colors hover:underline"
                  style={{ color: '#f07c00' }}
                >
                  {texts.resendLabel}
                </button>
              )}
            </div>

            <button
              onClick={handleVerify}
              disabled={loading || code.length !== 6}
              className="w-full py-3.5 rounded-xl text-sm font-bold text-white transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: loading ? 'rgba(179,84,30,0.5)' : 'linear-gradient(135deg,#f07c00 0%,#b3541e 100%)',
                boxShadow: loading ? 'none' : '0 4px 20px rgba(179,84,30,0.35)',
              }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 size={16} className="animate-spin" /> Verifying...
                </span>
              ) : (
                texts.verifyLabel
              )}
            </button>

            <button
              onClick={onClose}
              disabled={loading}
              className="w-full mt-2.5 py-2.5 text-xs font-semibold text-ink-muted hover:text-ink-secondary transition-colors disabled:opacity-50"
            >
              Close
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
