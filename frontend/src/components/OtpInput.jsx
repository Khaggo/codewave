'use client'

import { useRef, useCallback } from 'react'

export default function OtpInput({ value = '', onChange, disabled = false, error = false }) {
  const inputsRef = useRef([])
  const normalizedValue = String(value ?? '').replace(/\D/g, '').slice(0, 6)
  const digits = Array.from({ length: 6 }, (_, index) => normalizedValue[index] || '')

  const focusAt = useCallback((i) => {
    setTimeout(() => inputsRef.current[i]?.focus(), 0)
  }, [])

  const updateValue = useCallback((nextDigits) => {
    onChange(nextDigits.join(''))
  }, [onChange])

  const commitDigits = useCallback((startIndex, rawValue) => {
    const incomingDigits = String(rawValue).replace(/\D/g, '').slice(0, 6 - startIndex)
    if (!incomingDigits) return

    const next = digits.slice()
    incomingDigits.split('').forEach((digit, offset) => {
      next[startIndex + offset] = digit
    })
    updateValue(next)

    const nextFocusIndex = Math.min(startIndex + incomingDigits.length, 5)
    if (nextFocusIndex > startIndex) focusAt(nextFocusIndex)
  }, [digits, focusAt, updateValue])

  function handleChange(e, i) {
    const val = e.target.value
    if (!/^\d*$/.test(val)) return

    commitDigits(i, val)
  }

  function handleKeyDown(e, i) {
    if (e.key === 'Backspace') {
      if (digits[i]) {
        const next = digits.slice()
        next[i] = ''
        updateValue(next)
      } else if (i > 0) {
        const next = digits.slice()
        next[i - 1] = ''
        updateValue(next)
        focusAt(i - 1)
      }
      e.preventDefault()
    }

    if (e.key === 'ArrowLeft') {
      if (i > 0) focusAt(i - 1)
      e.preventDefault()
    }

    if (e.key === 'ArrowRight') {
      if (i < 5) focusAt(i + 1)
      e.preventDefault()
    }
  }

  function handlePaste(e, i) {
    e.preventDefault()
    const pastedText =
      typeof e.clipboardData?.getData === 'function'
        ? e.clipboardData.getData('text') || e.clipboardData.getData('text/plain')
        : e.clipboardData?.text || ''
    commitDigits(i, pastedText)
  }

  return (
    <div className="flex gap-2.5 justify-center">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={el => (inputsRef.current[i] = el)}
          type="text"
          inputMode="numeric"
          maxLength={1}
          disabled={disabled}
          aria-label={`OTP digit ${i + 1}`}
          value={d}
          onChange={e => handleChange(e, i)}
          onKeyDown={e => handleKeyDown(e, i)}
          onPaste={e => handlePaste(e, i)}
          onFocus={e => e.target.select()}
          className={`
            w-12 h-14 text-center text-xl font-bold rounded-xl
            bg-surface-input border outline-none
            transition-all duration-150
            disabled:opacity-50 disabled:cursor-not-allowed
            ${error
              ? 'border-red-500/60 text-red-400'
              : 'border-surface-border text-ink-primary focus:border-brand-orange/60 focus:ring-2 focus:ring-brand-orange/15'
            }
          `}
          autoComplete="one-time-code"
        />
      ))}
    </div>
  )
}
