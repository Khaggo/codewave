import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import {
  REFERENCE_UNAVAILABLE,
  getAnalyticsSourceDomainDisplayLabel,
  getInvoiceDisplayReference,
  getPeakHourDisplayLabel,
  getSafePresentationText,
  getServiceDemandDisplayLabel,
} from './analyticsPresentation.mjs'

const rawUuid = 'a3cce1f2-a6eb-4fdd-bf11-8b17d3ddfc17'

test('analytics presentation keeps business labels and redacts UUID/hash fallbacks', () => {
  assert.equal(getServiceDemandDisplayLabel({ serviceName: 'Engine Tune-Up', serviceId: rawUuid }), 'Engine Tune-Up')
  assert.equal(getPeakHourDisplayLabel({ label: rawUuid, startTime: '08:00', endTime: '09:00' }), '08:00 - 09:00')
  assert.equal(getSafePresentationText(rawUuid), REFERENCE_UNAVAILABLE)
  assert.equal(getSafePresentationText('7f83b1657ff1fc53b92dc18148a1d65dfa13514a'), REFERENCE_UNAVAILABLE)
  assert.equal(getSafePresentationText('INV-2026-0042'), 'INV-2026-0042')
})

test('Demand and Peak-Hour tables never interpolate transport IDs as visible copy', () => {
  const source = readFileSync(new URL('../screens/AdminAnalyticsWorkspace.js', import.meta.url), 'utf8')
  assert.doesNotMatch(source, /\{entry\.serviceId\}<\/p>/)
  assert.doesNotMatch(source, /\{entry\.timeSlotId\}<\/p>/)
  assert.doesNotMatch(source, /Trace Booking IDs/)
  assert.match(source, /\{entry\.displayLabel\}/)
})

test('audit source domains redact technical identifiers and preserve readable domains', () => {
  assert.equal(getAnalyticsSourceDomainDisplayLabel(rawUuid), REFERENCE_UNAVAILABLE)
  assert.equal(
    getAnalyticsSourceDomainDisplayLabel('7f83b1657ff1fc53b92dc18148a1d65dfa13514a'),
    REFERENCE_UNAVAILABLE,
  )
  assert.equal(getAnalyticsSourceDomainDisplayLabel('main-service.auth'), 'Main Service · Auth')
  assert.equal(getAnalyticsSourceDomainDisplayLabel('Workshop Operations'), 'Workshop Operations')
})

test('invoice references cannot bypass UUID/hash redaction', () => {
  assert.equal(
    getInvoiceDisplayReference({ displayReference: rawUuid, invoiceReference: 'INV-2026-0042' }),
    'INV-2026-0042',
  )
  assert.equal(
    getInvoiceDisplayReference({
      displayReference: rawUuid,
      invoiceReference: '7f83b1657ff1fc53b92dc18148a1d65dfa13514a',
    }),
    REFERENCE_UNAVAILABLE,
  )
  assert.equal(getInvoiceDisplayReference({ invoiceReference: 'INV-2026-0088' }), 'INV-2026-0088')
})

test('audit and invoice cells route presentation through the shared sanitizer', () => {
  const source = readFileSync(new URL('../screens/AdminAnalyticsWorkspace.js', import.meta.url), 'utf8')
  assert.doesNotMatch(source, />\{entry\.sourceDomain\}<\/p>/)
  assert.doesNotMatch(source, /entry\.displayReference \|\| entry\.invoiceReference/)
  assert.match(source, /getAnalyticsSourceDomainDisplayLabel\(entry\.sourceDomain\)/)
  assert.match(source, /getInvoiceDisplayReference\(entry\)/)
})
