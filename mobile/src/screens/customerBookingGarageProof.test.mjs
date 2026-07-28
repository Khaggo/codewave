import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const TEST_DIR = dirname(fileURLToPath(import.meta.url))
const read = (relativePath) => readFileSync(resolve(TEST_DIR, relativePath), 'utf8')

test('mobile booking supports selecting multiple services and submits the live serviceIds payload', () => {
  const source = read('./Dashboard.js')

  const requiredFragments = [
    'const [selectedBookingServiceIds, setSelectedBookingServiceIds] = useState([]);',
    'const toggleBookingServiceSelection = (serviceId) => {',
    'Step 1: Choose Services',
    'Choose one or more services for the same appointment. Your selections stay highlighted while you move through the flow.',
    'Step 2: Select Vehicle',
    'Step 3: Pick a Schedule',
    'Step 4: Review Booking',
    'label="Choose Services"',
    'label="Active Services"',
    'serviceIds: selectedServices.map((service) => service.id),',
    '<Text style={styles.bookingSummaryLabel}>Services</Text>',
    "selectedServices.map((service) => service.name).join(', ')",
    'const getBookingRequestedServiceNames = (booking) => {',
    '<BookingRequestedServiceChips booking={booking} compact />',
    '<Text style={styles.bookingSectionLabel}>Requested services</Text>',
    '<BookingRequestedServiceChips booking={selectedBookingDetail} />',
    'Choose one or more services',
    'Complete all steps to book',
  ]

  for (const fragment of requiredFragments) {
    assert.ok(source.includes(fragment), `Expected multi-service booking fragment: ${fragment}`)
  }

  assert.doesNotMatch(source, /serviceId:\s*selectedService/i)
  assert.doesNotMatch(source, /Choose one service/i)
})

test('mobile app persists and restores the active session across refreshes', () => {
  const source = read('../../App.js')

  const requiredFragments = [
    "const MOBILE_SESSION_STORAGE_KEY = '@autocare/mobile-session-v1';",
    "const [isSessionHydrated, setIsSessionHydrated] = useState(false);",
    'const hydratePersistedMobileSession = async () => {',
    'await AsyncStorage.getItem(MOBILE_SESSION_STORAGE_KEY);',
    'await AsyncStorage.setItem(MOBILE_SESSION_STORAGE_KEY, JSON.stringify(snapshot));',
    'await AsyncStorage.removeItem(MOBILE_SESSION_STORAGE_KEY);',
    "currentMobileSessionAccessState === 'customer_session_active'",
    "initialRouteName={appInitialRouteName}",
    "Checking your saved customer session before the app loads.",
  ]

  for (const fragment of requiredFragments) {
    assert.ok(source.includes(fragment), `Expected session restore fragment: ${fragment}`)
  }
})

test('mobile garage supports vehicle creation, bounded timeline paging, and customer-safe summaries', () => {
  const source = read('./VehicleLifecycleScreen.js')

  const requiredFragments = [
    'const GARAGE_PAGE_SIZE = 3;',
    'createCustomerVehicle({',
    'setVehiclePage(Math.max(0, Math.ceil(nextVehicles.length / GARAGE_PAGE_SIZE) - 1));',
    'Showing {Math.min(vehiclePage * GARAGE_PAGE_SIZE + 1, vehicles.length)}-',
    '{Math.min((vehiclePage + 1) * GARAGE_PAGE_SIZE, vehicles.length)} of {vehicles.length} vehicles',
    '<Text style={styles.vehiclePagerButtonText}>Prev</Text>',
    '<Text style={styles.vehiclePagerButtonText}>Next</Text>',
    'getCustomerGarageSummary({',
    'listCustomerVehicleTimelinePage({',
    'limit: 20,',
    'cursor: snapshot.page.nextCursor,',
    'setIsLoadingMore(true);',
    'Load more',
    '<Text style={styles.summaryProofTitle}>Service summary</Text>',
    '<Text style={styles.modalTitle}>Add vehicle</Text>',
    'accessibilityLiveRegion="assertive"',
  ]

  for (const fragment of requiredFragments) {
    assert.ok(source.includes(fragment), `Expected garage proof fragment: ${fragment}`)
  }
})

test('mobile customer and technician surfaces prefer business-readable references over raw UUID snippets', () => {
  const dashboardSource = read('./Dashboard.js')
  const technicianSource = read('./TechnicianDashboard.js')

  assert.match(dashboardSource, /if \(booking\?\.bookingReference\) \{/)
  assert.match(dashboardSource, /return booking\.bookingReference;/)
  assert.match(dashboardSource, /BK-\$\{compactDate\}-\$\{plateToken\}/)
  assert.doesNotMatch(dashboardSource, /slice\(0,\s*8\)/)

  assert.match(technicianSource, /const getJobOrderReference = \(jobOrder\) => \{/)
  assert.match(technicianSource, /if \(jobOrder\?\.jobOrderReference\) \{/)
  assert.match(technicianSource, /const prefix = jobOrder\?\.jobType === 'back_job' \? 'JO-RW' : 'JO';/)
  assert.match(technicianSource, /return compactDate \? `\$\{prefix\}-\$\{compactDate\}-\$\{timeToken \|\| plateToken\}` : `\$\{prefix\}-\$\{plateToken\}`;/)
  assert.match(technicianSource, /<Text style=\{styles\.jobOrderId\}>\{getJobOrderReference\(jobOrder\)\}<\/Text>/)
  assert.match(technicianSource, /<Text style=\{styles\.modalTitle\}>\{getJobOrderReference\(jobOrder\)\}<\/Text>/)
  assert.doesNotMatch(technicianSource, /slice\(0,\s*8\)/)
})
