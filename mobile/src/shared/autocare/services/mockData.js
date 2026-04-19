// ---------------------------------------------------------------------------
// MOCK DATA LAYER
// Replace individual arrays with real API calls once the backend is ready.
// ---------------------------------------------------------------------------

export const vehicles = [
  { id: 'v1', customerId: 'lp1', plate: 'ABC-1234', model: 'Toyota Fortuner', type: 'SUV', year: 2021, owner: 'Juan dela Cruz', color: 'Pearl White', mileage: 45000, status: 'active' },
  { id: 'v2', customerId: 'lp2', plate: 'XYZ-5678', model: 'Honda Civic', type: 'Sedan', year: 2020, owner: 'Maria Santos', color: 'Midnight Blue', mileage: 62000, status: 'active' },
  { id: 'v3', customerId: 'lp3', plate: 'QRS-9012', model: 'Mitsubishi Montero Sport', type: 'SUV', year: 2019, owner: 'Pedro Reyes', color: 'Titanium Gray', mileage: 78000, status: 'maintenance' },
  { id: 'v4', customerId: 'lp4', plate: 'LMN-3456', model: 'Ford Ranger', type: 'Pickup', year: 2022, owner: 'Ana Lim', color: 'Race Red', mileage: 28000, status: 'active' },
  { id: 'v5', customerId: 'lp5', plate: 'DEF-7890', model: 'Isuzu D-Max', type: 'Pickup', year: 2018, owner: 'Carlos Mendoza', color: 'Summit White', mileage: 95000, status: 'inactive' },
]

export const appointments = [
  { id: 'a1', vehicleId: 'v1', slot: '2026-04-12T09:00', status: 'confirmed', serviceStage: 'intake', chosenServices: ['Oil Change', 'Tire Rotation', 'Brake Inspection'], notes: 'Check AC as well.', shopName: 'CruisersCrib Makati', jobOrderId: 'JO-2026-005' },
  { id: 'a2', vehicleId: 'v2', slot: '2026-04-14T14:00', status: 'pending', serviceStage: null, chosenServices: ['General PMS', 'Wheel Alignment'], notes: '', shopName: 'CruisersCrib BGC', jobOrderId: null },
  { id: 'a3', vehicleId: 'v3', slot: '2026-04-10T10:30', status: 'in_progress', serviceStage: 'in_repair', chosenServices: ['Engine Diagnostic', 'Coolant Flush'], notes: 'Overheating at idle.', shopName: 'CruisersCrib QC', jobOrderId: 'JO-2026-003' },
  { id: 'a4', vehicleId: 'v4', slot: '2026-04-18T08:00', status: 'confirmed', serviceStage: 'intake', chosenServices: ['Oil Change', 'Air Filter Replacement'], notes: '', shopName: 'CruisersCrib Makati', jobOrderId: 'JO-2026-006' },
  { id: 'a5', vehicleId: 'v1', slot: '2026-03-20T11:00', status: 'completed', serviceStage: 'ready', chosenServices: ['Tire Replacement (4 pcs)'], notes: 'All-terrain tires.', shopName: 'CruisersCrib BGC', jobOrderId: 'JO-2026-001' },
]

export const timelineEvents = [
  { id: 't1', vehicleId: 'v1', customerId: 'lp1', type: 'service', category: 'verified', description: 'Oil change and filter replacement completed.', isVerified: true, date: '2026-03-20', technicianName: 'Engr. Renan Castro', jobOrderId: 'JO-2026-001', serviceSummaryId: 'ss1' },
  { id: 't2', vehicleId: 'v1', customerId: 'lp1', type: 'inspection', category: 'verified', description: 'Intake condition verified - no structural damage, all fluids OK.', isVerified: true, date: '2026-03-20', technicianName: 'Engr. Renan Castro', jobOrderId: 'JO-2026-001' },
  { id: 't3', vehicleId: 'v1', customerId: 'lp1', type: 'admin', category: 'administrative', description: 'Booking created for Tire Replacement (4 pcs) at CruisersCrib BGC.', isVerified: false, date: '2026-03-18', technicianName: null, jobOrderId: 'JO-2026-001' },
  { id: 't4', vehicleId: 'v2', customerId: 'lp2', type: 'repair', category: 'verified', description: 'Brake pads replaced (front and rear). Road test passed.', isVerified: true, date: '2026-03-05', technicianName: 'Engr. Dennis Ocampo', jobOrderId: 'JO-2026-002', serviceSummaryId: 'ss2' },
  { id: 't5', vehicleId: 'v2', customerId: 'lp2', type: 'admin', category: 'administrative', description: 'Customer approved repair estimate - PHP 4,200.', isVerified: false, date: '2026-03-04', technicianName: null, jobOrderId: 'JO-2026-002' },
  { id: 't6', vehicleId: 'v3', customerId: 'lp3', type: 'alert', category: 'verified', description: 'Coolant temp sensor fault detected. Vehicle under repair.', isVerified: false, date: '2026-04-08', technicianName: 'Engr. Jose Villanueva', jobOrderId: 'JO-2026-003', serviceSummaryId: 'ss3' },
  { id: 't7', vehicleId: 'v4', customerId: 'lp4', type: 'service', category: 'verified', description: 'Preventive maintenance (PMS 20,000 km) completed.', isVerified: true, date: '2026-01-28', technicianName: 'Engr. Dennis Ocampo', jobOrderId: 'JO-2026-004' },
  { id: 't8', vehicleId: 'v2', customerId: 'lp2', type: 'purchase', category: 'administrative', description: 'Purchased 4 pcs Bridgestone Ecopia tires via Shop - Invoice #INV-0032.', isVerified: true, date: '2026-03-12', technicianName: null, jobOrderId: null },
  { id: 't9', vehicleId: 'v5', customerId: 'lp5', type: 'admin', category: 'administrative', description: 'Insurance inquiry submitted for 2026 renewal.', isVerified: false, date: '2026-04-01', technicianName: null, jobOrderId: null },
]

export const jobOrders = [
  { id: 'JO-2026-001', vehicleId: 'v1', customerId: 'lp1', date: '2026-03-20', completedDate: '2026-03-21', services: ['Oil Change', 'Tire Replacement (4 pcs)'], status: 'completed', technician: 'Engr. Renan Castro', shopName: 'CruisersCrib BGC', qaAuditCaseId: 'qa1', serviceSummaryId: 'ss1' },
  { id: 'JO-2026-002', vehicleId: 'v2', customerId: 'lp2', date: '2026-03-04', completedDate: '2026-03-05', services: ['Brake Pad Replacement'], status: 'completed', technician: 'Engr. Dennis Ocampo', shopName: 'CruisersCrib Makati', serviceSummaryId: 'ss2' },
  { id: 'JO-2026-003', vehicleId: 'v3', customerId: 'lp3', date: '2026-04-08', completedDate: null, services: ['Engine Diagnostic', 'Coolant Flush'], status: 'in_progress', technician: 'Engr. Jose Villanueva', shopName: 'CruisersCrib QC', qaAuditCaseId: 'qa2', serviceSummaryId: 'ss3' },
  { id: 'JO-2026-004', vehicleId: 'v4', customerId: 'lp4', date: '2026-01-28', completedDate: '2026-01-28', services: ['General PMS'], status: 'completed', technician: 'Engr. Dennis Ocampo', shopName: 'CruisersCrib Makati' },
  { id: 'JO-2026-005', vehicleId: 'v1', customerId: 'lp1', date: '2026-04-12', completedDate: null, services: ['Oil Change', 'Tire Rotation', 'Brake Inspection'], status: 'confirmed', technician: 'Engr. Renan Castro', shopName: 'CruisersCrib Makati' },
  { id: 'JO-2026-006', vehicleId: 'v4', customerId: 'lp4', date: '2026-04-18', completedDate: null, services: ['Oil Change', 'Air Filter Replacement'], status: 'confirmed', technician: 'Engr. Dennis Ocampo', shopName: 'CruisersCrib Makati' },
]

export const servicesCatalog = [
  { id: 's1', name: 'Oil Change (Engine Oil + Filter)', category: 'Preventive Maintenance', price: 850 },
  { id: 's2', name: 'PMS 10,000 km Package', category: 'Preventive Maintenance', price: 2500 },
  { id: 's3', name: 'PMS 20,000 km Package', category: 'Preventive Maintenance', price: 4500 },
  { id: 's4', name: 'Air Filter Replacement', category: 'Preventive Maintenance', price: 450 },
  { id: 's5', name: 'Fuel Filter Replacement', category: 'Preventive Maintenance', price: 650 },
  { id: 's6', name: 'Brake Pad Replacement (Front)', category: 'Repair', price: 2200 },
  { id: 's7', name: 'Brake Pad Replacement (Rear)', category: 'Repair', price: 2000 },
  { id: 's8', name: 'Cooling System Flush', category: 'Repair', price: 1500 },
  { id: 's9', name: 'Wheel Alignment', category: 'Repair', price: 800 },
  { id: 's10', name: 'Suspension Check & Repair', category: 'Repair', price: 3500 },
  { id: 's11', name: 'Tire Rotation', category: 'Tires & Wheels', price: 350 },
  { id: 's12', name: 'Tire Replacement (per piece)', category: 'Tires & Wheels', price: 4500 },
  { id: 's13', name: 'Tire Balancing (4 pcs)', category: 'Tires & Wheels', price: 600 },
  { id: 's14', name: 'Engine Diagnostic Scan', category: 'Diagnostics', price: 700 },
  { id: 's15', name: 'Pre-purchase Inspection', category: 'Diagnostics', price: 1200 },
  { id: 's16', name: 'Interior Deep Clean', category: 'Detailing', price: 1800 },
  { id: 's17', name: 'Full Car Detailing', category: 'Detailing', price: 4500 },
  { id: 's18', name: 'Paint Protection Film (PPF)', category: 'Detailing', price: 18000 },
]

export const loyaltyAccounts = [
  { id: 'lp1', owner: 'Juan dela Cruz', points: 1240, tier: 'Gold' },
  { id: 'lp2', owner: 'Maria Santos', points: 875, tier: 'Silver' },
  { id: 'lp3', owner: 'Pedro Reyes', points: 320, tier: 'Bronze' },
  { id: 'lp4', owner: 'Ana Lim', points: 540, tier: 'Silver' },
  { id: 'lp5', owner: 'Carlos Mendoza', points: 95, tier: 'Bronze' },
]

export const qaAuditCases = [
  {
    id: 'qa1',
    jobOrderId: 'JO-2026-001',
    vehicleId: 'v1',
    customerId: 'lp1',
    technicianNotes: 'Performed oil and filter replacement. Tire replacement completed. Final inspection matched customer concern and road test result.',
    uploadedEvidence: [
      'https://mock.autocare.local/audit/qa1-before.jpg',
      'https://mock.autocare.local/audit/qa1-after.jpg',
    ],
    semanticResolutionScore: 0.94,
    inspectionRiskPoints: 1,
    auditStatus: 'Approved',
  },
  {
    id: 'qa2',
    jobOrderId: 'JO-2026-003',
    vehicleId: 'v3',
    customerId: 'lp3',
    technicianNotes: 'Initial concern was overheating at idle. Coolant flush completed, but photo evidence shows residue near hose clamp and diagnosis notes are not fully aligned with intake complaint.',
    uploadedEvidence: [
      'https://mock.autocare.local/audit/qa2-engine-bay.jpg',
      'https://mock.autocare.local/audit/qa2-hose-clamp.jpg',
    ],
    semanticResolutionScore: 0.58,
    inspectionRiskPoints: 5,
    auditStatus: 'Flagged',
  },
]

export const serviceSummaries = [
  {
    id: 'ss1',
    jobOrderId: 'JO-2026-001',
    timelineEventId: 't1',
    vehicleId: 'v1',
    customerId: 'lp1',
    originalTechnicalNote: 'Replaced engine oil and oil filter. Mounted four all-terrain tires and balanced the set. Final road test passed with no vibration.',
    generatedLaymanSummary: 'Your SUV received fresh engine oil, a new oil filter, and a full tire replacement. The team balanced the tires and confirmed the vehicle drove smoothly during the final road test.',
    verificationStatus: 'Verified',
    reviewerId: 'admin-001',
  },
  {
    id: 'ss2',
    jobOrderId: 'JO-2026-002',
    timelineEventId: 't4',
    vehicleId: 'v2',
    customerId: 'lp2',
    originalTechnicalNote: 'Replaced front and rear brake pads. Conducted post-service road test and brake bedding procedure.',
    generatedLaymanSummary: 'We replaced the worn brake pads on both the front and rear wheels, then tested the brakes to make sure stopping performance felt even and safe.',
    verificationStatus: 'Revised',
    reviewerId: 'adviser-001',
  },
  {
    id: 'ss3',
    jobOrderId: 'JO-2026-003',
    timelineEventId: 't6',
    vehicleId: 'v3',
    customerId: 'lp3',
    originalTechnicalNote: 'Detected coolant temperature sensor fault. Vehicle still under observation after coolant flush and clamp recheck.',
    generatedLaymanSummary: 'Your vehicle is still being monitored because the cooling system needs another quality check before the team can confirm the overheating issue is fully resolved.',
    verificationStatus: 'Draft',
    reviewerId: null,
  },
]

export const insuranceInquiries = [
  {
    id: 'iq1',
    vehicleId: 'v5',
    customerId: 'lp5',
    inquiryType: 'CTPL',
    status: 'Submitted',
    quotePdfUrl: null,
    proofOfPaymentUrl: null,
  },
  {
    id: 'iq2',
    vehicleId: 'v1',
    customerId: 'lp1',
    inquiryType: 'Comprehensive',
    status: 'Quoted',
    quotePdfUrl: 'https://mock.autocare.local/quotes/iq2.pdf',
    proofOfPaymentUrl: null,
  },
  {
    id: 'iq3',
    vehicleId: 'v2',
    customerId: 'lp2',
    inquiryType: 'CTPL',
    status: 'Issued',
    quotePdfUrl: 'https://mock.autocare.local/quotes/iq3.pdf',
    proofOfPaymentUrl: 'https://mock.autocare.local/payments/iq3-proof.jpg',
  },
]

export const shopProducts = [
  {
    id: 'p1',
    name: 'Castrol GTX 10W-40 (4L)',
    category: 'Lubricants',
    price: 895,
    stock: 48,
    sku: 'LUB-001',
    description: 'Everyday synthetic blend engine oil for dependable protection.',
    images: ['https://mock.autocare.local/shop-products/castrol-gtx-10w40-4l.jpg'],
    status: 'published',
    createdAt: '2026-03-02T08:00:00.000Z',
    publishedAt: '2026-03-02T08:00:00.000Z',
  },
  {
    id: 'p2',
    name: 'Bridgestone Ecopia EP300 205/55R16',
    category: 'Tires',
    price: 5200,
    stock: 8,
    sku: 'TIR-001',
    description: 'Fuel-efficient touring tire for balanced grip and comfort.',
    images: ['https://mock.autocare.local/shop-products/bridgestone-ecopia-ep300-205-55r16.jpg'],
    status: 'published',
    createdAt: '2026-03-04T08:00:00.000Z',
    publishedAt: '2026-03-04T08:00:00.000Z',
  },
  {
    id: 'p3',
    name: 'Bosch Silver Battery NS60',
    category: 'Battery',
    price: 3850,
    stock: 7,
    sku: 'BAT-001',
    description: 'Maintenance-free battery sized for compact and midsize vehicles.',
    images: ['https://mock.autocare.local/shop-products/bosch-silver-battery-ns60.jpg'],
    status: 'published',
    createdAt: '2026-03-06T08:00:00.000Z',
    publishedAt: '2026-03-06T08:00:00.000Z',
  },
  {
    id: 'p4',
    name: 'K&N High-Flow Air Filter',
    category: 'Filters',
    price: 1650,
    stock: 23,
    sku: 'FIL-001',
    description: 'Reusable performance air filter for improved airflow.',
    images: ['https://mock.autocare.local/shop-products/kn-high-flow-air-filter.jpg'],
    status: 'published',
    createdAt: '2026-03-08T08:00:00.000Z',
    publishedAt: '2026-03-08T08:00:00.000Z',
  },
  {
    id: 'p5',
    name: "Meguiar's Gold Class Car Wax",
    category: 'Detailing',
    price: 780,
    stock: 31,
    sku: 'DET-001',
    description: 'Premium car wax for a glossy finish and paint protection.',
    images: ['https://mock.autocare.local/shop-products/meguiars-gold-class-car-wax.jpg'],
    status: 'published',
    createdAt: '2026-03-10T08:00:00.000Z',
    publishedAt: '2026-03-10T08:00:00.000Z',
  },
  {
    id: 'p6',
    name: 'Motul 8100 X-Cess 5W-40 (5L)',
    category: 'Lubricants',
    price: 1450,
    stock: 22,
    sku: 'LUB-002',
    description: 'Full synthetic engine oil for high-temperature stability.',
    images: ['https://mock.autocare.local/shop-products/motul-8100-x-cess-5w40-5l.jpg'],
    status: 'published',
    createdAt: '2026-03-12T08:00:00.000Z',
    publishedAt: '2026-03-12T08:00:00.000Z',
  },
  {
    id: 'p7',
    name: 'Continental PremiumContact 6 225/45R17',
    category: 'Tires',
    price: 6300,
    stock: 6,
    sku: 'TIR-002',
    description: 'Comfort-focused premium tire with strong wet grip.',
    images: ['https://mock.autocare.local/shop-products/continental-premiumcontact-6-225-45r17.jpg'],
    status: 'published',
    createdAt: '2026-03-14T08:00:00.000Z',
    publishedAt: '2026-03-14T08:00:00.000Z',
  },
  {
    id: 'p8',
    name: 'Philips Ultinon LED H4 Bulb (pair)',
    category: 'Electrical',
    price: 2200,
    stock: 0,
    sku: '',
    description: 'Bright LED headlight upgrade kit for improved visibility.',
    images: ['https://mock.autocare.local/shop-products/philips-ultinon-led-h4-bulb-pair.jpg'],
    status: 'published',
    createdAt: '2026-03-16T08:00:00.000Z',
    publishedAt: '2026-03-16T08:00:00.000Z',
  },
]

export const SHOPS = [
  'CruisersCrib Makati',
  'CruisersCrib BGC',
  'CruisersCrib Quezon City',
]

export const TECHNICIANS = [
  'Engr. Renan Castro',
  'Engr. Dennis Ocampo',
  'Engr. Jose Villanueva',
  'Engr. Mario Bautista',
]

export const rewardCatalog = [
  { id: 'rw1', name: 'Free Oil Change', pointsRequired: 500, discount: null, type: 'service', status: 'active' },
  { id: 'rw2', name: 'Car Wash Voucher', pointsRequired: 200, discount: null, type: 'service', status: 'active' },
  { id: 'rw3', name: 'PMS Discount 20%', pointsRequired: 800, discount: 20, type: 'discount', status: 'active' },
  { id: 'rw4', name: '10% Parts Discount', pointsRequired: 300, discount: 10, type: 'discount', status: 'inactive' },
  { id: 'rw5', name: 'Free Tire Balancing', pointsRequired: 350, discount: null, type: 'service', status: 'active' },
]

export const loyaltyDeals = [
  {
    id: 'ld1',
    title: 'Gold PMS Weekender',
    targetTiers: ['Gold'],
    discountType: 'percentage',
    discountValue: 15,
    code: 'GOLDWEEK',
    validUntil: '2026-05-31',
    status: 'active',
    summary: 'Weekend PMS savings for Gold members across all branches.',
  },
  {
    id: 'ld2',
    title: 'Silver Brake Care',
    targetTiers: ['Silver'],
    discountType: 'percentage',
    discountValue: 10,
    code: 'SILVERSTOP',
    validUntil: '2026-05-15',
    status: 'active',
    summary: 'Brake inspection and pad replacement discount for Silver members.',
  },
  {
    id: 'ld3',
    title: 'Bronze First Detailing',
    targetTiers: ['Bronze'],
    discountType: 'fixed',
    discountValue: 500,
    code: 'BRONZE500',
    validUntil: '2026-04-30',
    status: 'draft',
    summary: 'Entry-tier detailing incentive for first-time Bronze redeemers.',
  },
]

export const redemptionLog = [
  { id: 'rd1', customerId: 'lp1', customerName: 'Juan dela Cruz', rewardId: 'rw1', rewardName: 'Free Oil Change', pointsUsed: 500, date: '2026-04-01', redeemedBy: 'Admin', status: 'used' },
  { id: 'rd2', customerId: 'lp2', customerName: 'Maria Santos', rewardId: 'rw2', rewardName: 'Car Wash Voucher', pointsUsed: 200, date: '2026-03-28', redeemedBy: 'Staff', status: 'used' },
  { id: 'rd3', customerId: 'lp4', customerName: 'Ana Lim', rewardId: 'rw3', rewardName: 'PMS Discount 20%', pointsUsed: 800, date: '2026-03-15', redeemedBy: 'Admin', status: 'pending' },
  { id: 'rd4', customerId: 'lp1', customerName: 'Juan dela Cruz', rewardId: 'rw2', rewardName: 'Car Wash Voucher', pointsUsed: 200, date: '2026-02-20', redeemedBy: 'Admin', status: 'used' },
  { id: 'rd5', customerId: 'lp3', customerName: 'Pedro Reyes', rewardId: 'rw5', rewardName: 'Free Tire Balancing', pointsUsed: 350, date: '2026-01-12', redeemedBy: 'Staff', status: 'used' },
]

export const salesInvoices = [
  { id: 'INV-2026-001', customer: 'Juan dela Cruz', items: ['Castrol GTX 10W-40 (4L) x2', 'K&N High-Flow Air Filter x1'], total: 4990, status: 'paid', date: '2026-04-05', method: 'Cash', createdBy: 'Admin' },
  { id: 'INV-2026-002', customer: 'Maria Santos', items: ['Continental PremiumContact 6 x2'], total: 12600, status: 'partial', date: '2026-04-03', method: 'GCash', createdBy: 'Staff' },
  { id: 'INV-2026-003', customer: 'Pedro Reyes', items: ['Bosch Silver Battery NS60 x1', 'Philips LED H4 x1'], total: 6050, status: 'pending', date: '2026-04-07', method: 'Card', createdBy: 'Admin' },
  { id: 'INV-2026-004', customer: 'Ana Lim', items: ["Meguiar's Gold Class Car Wax x2", 'Motul 8100 X-Cess x1'], total: 3010, status: 'paid', date: '2026-03-30', method: 'Cash', createdBy: 'Staff' },
  { id: 'INV-2026-005', customer: 'Carlos Mendoza', items: ['Bridgestone Ecopia EP300 x1'], total: 5200, status: 'paid', date: '2026-03-25', method: 'Bank', createdBy: 'Admin' },
]

export const monthlyRevenue = [
  { month: 'Nov', revenue: 38400, parts: 17400 },
  { month: 'Dec', revenue: 52100, parts: 24100 },
  { month: 'Jan', revenue: 41800, parts: 19800 },
  { month: 'Feb', revenue: 47300, parts: 22300 },
  { month: 'Mar', revenue: 55600, parts: 24600 },
  { month: 'Apr', revenue: 31200, parts: 13200 },
]

export const bookingVolume = [
  { type: 'Oil Change', count: 18 },
  { type: 'PMS', count: 12 },
  { type: 'Tires', count: 9 },
  { type: 'Detailing', count: 7 },
  { type: 'Diagnostics', count: 5 },
  { type: 'Repair', count: 11 },
]

export const peakHourData = [
  { hour: '8AM', bookings: 3 },
  { hour: '9AM', bookings: 8 },
  { hour: '10AM', bookings: 12 },
  { hour: '11AM', bookings: 9 },
  { hour: '12PM', bookings: 5 },
  { hour: '1PM', bookings: 7 },
  { hour: '2PM', bookings: 11 },
  { hour: '3PM', bookings: 10 },
  { hour: '4PM', bookings: 6 },
  { hour: '5PM', bookings: 4 },
]
