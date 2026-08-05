import { ActivityIndicator, ScrollView, Text, View } from 'react-native';

import EmptyState from '../components/ui/EmptyState';
import Button from '../components/ui/Button';
import InsuranceVehiclePicker from './insurance/InsuranceVehiclePicker';
import InsuranceEntryPanel from './insurance/InsuranceEntryPanel';
import InsuranceHomePanel from './insurance/InsuranceHomePanel';
import InsuranceModeShell from './insurance/InsuranceModeShell';
import InsuranceRequestPanel from './insurance/InsuranceRequestPanel';
import InsuranceStatusDetailPanel from './insurance/InsuranceStatusDetailPanel';
import {
  BookingDateCard,
  BookingDiscoveryStatePanel,
  BookingModeTab,
  BookingServiceCard,
  BookingTimeSlot,
  BookingVehicleCard,
} from './dashboard/BookingPresentationComponents';

const noop = () => {};

const vehicles = [
  {
    id: 'vehicle-1',
    make: 'Toyota',
    model: 'Vios',
    year: 2019,
    plateNumber: 'QAJ01001',
    color: 'Silver',
  },
  {
    id: 'vehicle-2',
    make: 'Honda',
    model: 'City',
    year: 2022,
    plateNumber: 'ABC1234',
    color: 'White',
  },
];

const meta = {
  title: 'Mobile/Customer workflows',
  decorators: [
    (Story) => (
      <ScrollView contentContainerStyle={{ padding: 16, gap: 18 }}>
        <Story />
      </ScrollView>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component: 'Touch-sized, recoverable customer workflow states for compact mobile screens.',
      },
    },
  },
};

export default meta;

export const Booking = {
  render: () => (
    <View style={{ gap: 14 }}>
      <Text accessibilityRole="header" style={{ color: '#f8fafc', fontSize: 24, fontWeight: '800' }}>
        New booking
      </Text>
      <View accessibilityRole="tablist" style={{ flexDirection: 'row', gap: 8 }}>
        <BookingModeTab label="New Booking" isActive onPress={noop} />
        <BookingModeTab label="My Bookings" isActive={false} onPress={noop} />
      </View>
      <BookingServiceCard
        item={{
          icon: 'wrench-outline',
          title: 'Brake inspection',
          subtitle: 'Check pad wear and rotor condition.',
          enabled: true,
          metaLabel: 'PHP 1,500',
          durationLabel: '45 min',
        }}
        isSelected
        onPress={noop}
        isCompact
      />
      <BookingServiceCard
        item={{
          icon: 'engine-outline',
          title: 'Engine diagnostics',
          subtitle: 'Unavailable for this date.',
          enabled: false,
          badgeLabel: 'Unavailable',
          metaLabel: 'PHP 2,000',
          durationLabel: '60 min',
        }}
        isSelected={false}
        onPress={noop}
        isCompact
      />
      <BookingVehicleCard
        item={{ title: '2019 Toyota Vios', subtitle: 'Silver', plateNumber: 'QAJ01001' }}
        isSelected
        onPress={noop}
        isCompact
      />
      <BookingDateCard
        item={{
          weekday: 'Tue',
          day: '12',
          month: 'Aug',
          capacityLabel: '3 spaces left',
          detailLabel: 'Morning availability',
          statusLabel: 'Available',
          statusTone: 'success',
          isSelectable: true,
          accessibilityLabel: 'Tuesday, August 12. 3 spaces left. Available.',
        }}
        isSelected
        onPress={noop}
        isCompact
      />
      <BookingTimeSlot
        item={{ label: '9:00 AM', timeRangeLabel: '9:00 - 10:00', capacityLabel: '3 spaces left', available: true }}
        isSelected
        onPress={noop}
        isCompact
      />
    </View>
  ),
};

export const BookingLoading = {
  render: () => (
    <BookingDiscoveryStatePanel
      icon="refresh"
      title="Loading booking options"
      message="Checking services, vehicles, and available times."
      isLoading
    />
  ),
};

export const BookingUnavailable = {
  render: () => (
    <BookingDiscoveryStatePanel
      icon="wifi-off-outline"
      title="Booking options unavailable"
      message="Your draft is safe. Check the connection and try again."
      actionLabel="Try again"
      onAction={noop}
    />
  ),
};

export const GarageVehiclePicker = {
  render: () => (
    <View style={{ minHeight: 680 }}>
      <Text accessibilityRole="header" style={{ color: '#f8fafc', fontSize: 24, fontWeight: '800', marginBottom: 12 }}>
        Garage
      </Text>
      <Text style={{ color: '#94a3b8', marginBottom: 16 }}>
        Search by plate, make, model, or year before starting a task.
      </Text>
      <InsuranceVehiclePicker
        visible
        vehicles={vehicles}
        selectedVehicleId="vehicle-1"
        onAddVehicle={noop}
        onClose={noop}
        onSelectVehicle={noop}
      />
    </View>
  ),
};

export const GarageEmpty = {
  render: () => (
    <EmptyState
      icon="car-outline"
      title="Your Garage is empty"
      message="Add a vehicle once, then use it for bookings and insurance assistance."
      actionLabel="Add vehicle"
      onAction={noop}
    />
  ),
};

const insuranceStatus = {
  title: 'Documents requested',
  summary: 'Your adviser needs the OR/CR scan before the guided claim review can continue.',
  ctaRouteKey: 'documents',
  ctaLabel: 'Open documents',
  latestUpdateLabel: 'Updated today by your service adviser.',
  timeline: [
    { key: 'submitted', label: 'Request submitted', active: true },
    { key: 'review', label: 'Staff review', active: true },
    { key: 'documents', label: 'Documents needed', active: true },
    { key: 'complete', label: 'Review complete', active: false },
  ],
};

const insuranceOverview = {
  title: 'Continue your claim request',
  message: 'Upload the requested document to keep the adviser review moving.',
  routeKey: 'documents',
  routeRows: [
    { key: 'request', label: 'Request details', description: 'Review the incident and coverage details.' },
    { key: 'documents', label: 'Documents', description: 'Upload or replace requested files.' },
    { key: 'status', label: 'Status', description: 'See the latest customer-visible update.' },
  ],
};

export const InsuranceHome = {
  render: () => (
    <InsuranceModeShell
      activeSection="home"
      onChangeSection={noop}
      selectedVehicleLabel="2019 Toyota Vios / QAJ01001"
      isVehiclePickerAvailable
      onOpenVehiclePicker={noop}
      summaryChips={[{ label: 'Status', value: 'Needs documents', emphasis: true, icon: 'file-alert-outline' }]}
    >
      <InsuranceHomePanel
        selectedVehicleLabel="2019 Toyota Vios / QAJ01001"
        currentRequestSummary={{ purposeLabel: 'Claim assistance', inquiryTypeLabel: 'Comprehensive' }}
        overviewState={insuranceOverview}
        statusState={{ title: 'Needs documents', summary: insuranceStatus.summary }}
        onOpenSection={noop}
      />
    </InsuranceModeShell>
  ),
};

export const InsuranceRequest = {
  render: () => (
    <InsuranceRequestPanel
      selectedVehicleLabel="2019 Toyota Vios / QAJ01001"
      draft={{
        purpose: 'claim',
        inquiryType: 'comprehensive',
        subject: 'Front bumper accident claim',
        description: 'Front bumper and right headlight were damaged in a minor collision.',
        providerName: 'Safe Road Insurance',
        policyNumber: 'POL-2026-0042',
        notes: 'I will upload the OR/CR scan after this step.',
        incidentOccurredAt: '2026-08-04T09:30:00.000Z',
        incidentLocation: 'Quezon City',
        renewalPolicyMode: 'replace',
      }}
      purposeOptions={[{ value: 'claim', label: 'Claim assistance' }, { value: 'renewal', label: 'Renewal' }]}
      inquiryTypeOptions={[{ value: 'comprehensive', label: 'Comprehensive' }, { value: 'ctpl', label: 'CTPL' }]}
      requestGuidance={{ sectionHelper: 'Tell us what you need help with. This is a guided inquiry, not insurer approval.' }}
      isRefreshing={false}
      onRefresh={noop}
      onChangeDraft={noop}
      onSubmit={noop}
      isSubmitting={false}
      intakeState="draft_ready"
      intakeMessage="Draft saved on this device."
      checklist={{ required: [{ type: 'or_cr', label: 'OR/CR', complete: true }], supporting: [], optional: [], guidance: [] }}
      stagedDocuments={[]}
      onFileDocuments={[]}
      hasOnFileRenewalPolicy={false}
      canSubmitRequest
      initialStageIndex={1}
      onStageChange={noop}
      onStageDocument={noop}
      onRemoveStagedDocument={noop}
    />
  ),
};

export const InsuranceStatus = {
  render: () => (
    <InsuranceStatusDetailPanel
      title="Claim assistance status"
      subtitle="Follow the staff review and the next customer action."
      statusState={insuranceStatus}
      processSteps={[
        { key: 'intake', label: 'Inquiry received', active: true, done: true },
        { key: 'review', label: 'Adviser review', active: true, done: false },
        { key: 'resolution', label: 'Customer update', active: false, done: false },
      ]}
      isRefreshing={false}
      onRefresh={noop}
      onAction={noop}
    />
  ),
};

export const InsuranceEntry = {
  render: () => (
    <InsuranceEntryPanel
      entryState={{
        title: 'Get help with insurance',
        summary: 'Submit a guided inquiry and keep your documents in one place.',
        vehicleLabel: '2019 Toyota Vios / QAJ01001',
        statusLabel: 'No active request',
        ctaLabel: 'Start a request',
      }}
      onEnterMode={noop}
    />
  ),
};

export const SharedSuccessState = {
  render: () => (
    <View style={{ gap: 14 }}>
      <View accessibilityLiveRegion="polite" style={{ padding: 16, borderRadius: 12, backgroundColor: '#163b2a' }}>
        <Text style={{ color: '#bbf7d0', fontSize: 16, fontWeight: '800' }}>Saved successfully</Text>
        <Text style={{ color: '#dcfce7', marginTop: 6 }}>Your next step is ready and the queue has been refreshed.</Text>
      </View>
      <Button label="Continue" onPress={noop} fullWidth />
    </View>
  ),
};

export const SharedLoadingAndErrorStates = {
  render: () => (
    <View style={{ gap: 14 }}>
      <View accessibilityLiveRegion="polite" style={{ alignItems: 'center', gap: 10, padding: 22 }}>
        <ActivityIndicator accessibilityLabel="Loading" />
        <Text style={{ color: '#94a3b8' }}>Loading the latest vehicle timeline...</Text>
      </View>
      <EmptyState
        icon="alert-circle-outline"
        title="Could not load this workspace"
        message="Your saved draft is still available. Check your connection and retry."
        actionLabel="Retry"
        onAction={noop}
      />
    </View>
  ),
};
