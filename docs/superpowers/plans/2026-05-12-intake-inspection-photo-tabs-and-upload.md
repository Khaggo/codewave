# Intake Inspection Photo Tabs And Upload Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add real arrival-photo upload cards, move history/detail into a `Vehicle Inspection` tab, and fix the intake fuel-level layout while preserving the existing inspection create payload.

**Architecture:** Keep `attachmentRefs` as the persisted inspection-media contract, but add a dedicated inspection photo-upload endpoint so the intake screen can select files, preview locally, and upload explicitly before the main inspection save. On the frontend, keep persisted refs in the intake draft, track local file/preview state separately, and convert the workspace layout from a split view into two tabs: `Booking Reference` and `Vehicle Inspection`.

**Tech Stack:** Next.js, React, Tailwind utility classes, NestJS, Jest, Node `node:test`

---

## File Structure

- `backend/apps/main-service/src/modules/inspections/controllers/inspections.controller.ts`
  Responsibility: expose `POST /api/vehicles/:id/inspections/photos/upload` alongside the existing inspection routes.
- `backend/apps/main-service/src/modules/inspections/services/inspections.service.ts`
  Responsibility: validate the target vehicle, reject non-image uploads, persist the file, and return the `attachmentRef`.
- `backend/apps/main-service/src/modules/inspections/services/inspection-evidence-storage.service.ts`
  Responsibility: store uploaded inspection images under a dedicated runtime directory and return a stable storage key.
- `backend/apps/main-service/src/modules/inspections/dto/upload-inspection-photo.dto.ts`
  Responsibility: define multipart upload metadata (`slot`).
- `backend/apps/main-service/src/modules/inspections/dto/upload-inspection-photo-response.dto.ts`
  Responsibility: document the upload response (`attachmentRef`, `slot`, `storageKey`).
- `backend/apps/main-service/src/modules/inspections/inspections.module.ts`
  Responsibility: register the new storage service provider.
- `backend/apps/main-service/test/inspections.integration.spec.ts`
  Responsibility: verify upload success and validation failures against the live Nest test app.

- `frontend/src/lib/inspectionStaffClient.js`
  Responsibility: call the new upload endpoint with `FormData` and keep the existing inspection create/list behavior intact.
- `frontend/src/lib/api/generated/inspections/requests.ts`
  Responsibility: document the new route contract for inspection photo upload.
- `frontend/src/lib/api/generated/inspections/staff-web-inspections.ts`
  Responsibility: document frontend upload states that match the new intake-photo flow.
- `frontend/src/screens/digitalIntakeInspectionWorkspacePhotoState.mjs`
  Responsibility: hold pure helper logic for local photo-card state, pending upload detection, and slot validation.
- `frontend/src/screens/digitalIntakeInspectionWorkspacePhotoState.test.mjs`
  Responsibility: regression coverage for local preview state versus persisted upload-ref state.
- `frontend/src/screens/digitalIntakeInspectionWorkspaceForm.mjs`
  Responsibility: extend slot metadata for card rendering while keeping payload serialization focused on uploaded refs only.
- `frontend/src/screens/digitalIntakeInspectionWorkspaceForm.test.mjs`
  Responsibility: verify payload mapping still emits uploaded `attachmentRefs` cleanly.
- `frontend/src/screens/DigitalIntakeInspectionWorkspace.js`
  Responsibility: render the tabbed layout, upload cards, explicit upload actions, grouped history/detail view, and corrected fuel-level alignment.
- `frontend/src/screens/workspaceCopyCleanup.test.mjs`
  Responsibility: source-level regression checks for the new tab labels and removal of stale raw-ref copy.

### Task 1: Add the backend inspection photo-upload endpoint

**Files:**
- Create: `backend/apps/main-service/src/modules/inspections/dto/upload-inspection-photo.dto.ts`
- Create: `backend/apps/main-service/src/modules/inspections/dto/upload-inspection-photo-response.dto.ts`
- Create: `backend/apps/main-service/src/modules/inspections/services/inspection-evidence-storage.service.ts`
- Modify: `backend/apps/main-service/src/modules/inspections/controllers/inspections.controller.ts`
- Modify: `backend/apps/main-service/src/modules/inspections/services/inspections.service.ts`
- Modify: `backend/apps/main-service/src/modules/inspections/inspections.module.ts`
- Test: `backend/apps/main-service/test/inspections.integration.spec.ts`

- [ ] **Step 1: Write the failing integration test**

Add this test to `backend/apps/main-service/test/inspections.integration.spec.ts`:

```ts
  it('uploads an intake photo and returns an attachment ref for the vehicle', async () => {
    const { app } = await createMainServiceTestApp();

    try {
      const userResponse = await request(app.getHttpServer()).post('/api/users').send({
        email: 'inspection-upload@example.com',
        firstName: 'Taylor',
        lastName: 'Uploader',
      });

      const vehicleResponse = await request(app.getHttpServer()).post('/api/vehicles').send({
        userId: userResponse.body.id,
        plateNumber: 'UPL123',
        make: 'Toyota',
        model: 'Vios',
        year: 2022,
      });

      const uploadResponse = await request(app.getHttpServer())
        .post(`/api/vehicles/${vehicleResponse.body.id}/inspections/photos/upload`)
        .field('slot', 'front')
        .attach('file', Buffer.from([0xff, 0xd8, 0xff, 0xd9]), {
          filename: 'front.jpg',
          contentType: 'image/jpeg',
        });

      expect(uploadResponse.status).toBe(200);
      expect(uploadResponse.body).toEqual(
        expect.objectContaining({
          slot: 'front',
          attachmentRef: expect.stringMatching(/^upload:\/\/vehicle\//),
          storageKey: expect.any(String),
        }),
      );
    } finally {
      await app.close();
    }
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- inspections.integration.spec.ts --runInBand`
Working directory: `backend`
Expected: FAIL with `404` or missing upload handler for `/api/vehicles/:id/inspections/photos/upload`

- [ ] **Step 3: Write the minimal backend implementation**

Create `backend/apps/main-service/src/modules/inspections/dto/upload-inspection-photo.dto.ts`:

```ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UploadInspectionPhotoDto {
  @ApiPropertyOptional({
    description: 'Arrival-photo slot being uploaded from the intake workspace.',
    example: 'front',
  })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  slot?: string;
}
```

Create `backend/apps/main-service/src/modules/inspections/dto/upload-inspection-photo-response.dto.ts`:

```ts
import { ApiProperty } from '@nestjs/swagger';

export class UploadInspectionPhotoResponseDto {
  @ApiProperty({
    example: 'front',
  })
  slot!: string;

  @ApiProperty({
    example: 'upload://vehicle/vehicle-id/front/inspection-photo-id.jpg',
  })
  attachmentRef!: string;

  @ApiProperty({
    example: 'vehicle-id/front/inspection-photo-id.jpg',
  })
  storageKey!: string;
}
```

Create `backend/apps/main-service/src/modules/inspections/services/inspection-evidence-storage.service.ts`:

```ts
import { Injectable } from '@nestjs/common';
import { mkdir, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { randomUUID } from 'node:crypto';

@Injectable()
export class InspectionEvidenceStorageService {
  private readonly rootDirectory = join(process.cwd(), '.runtime', 'uploads', 'inspection-evidence');

  async saveImage(vehicleId: string, slot: string, file: Express.Multer.File) {
    const extension = extname(file.originalname || '').toLowerCase() || '.jpg';
    const photoId = randomUUID();
    const relativeDirectory = join(vehicleId, slot || 'unslotted');
    const storageKey = join(relativeDirectory, `${photoId}${extension}`).replace(/\\/g, '/');
    const absolutePath = join(this.rootDirectory, storageKey);

    await mkdir(join(this.rootDirectory, relativeDirectory), { recursive: true });
    await writeFile(absolutePath, file.buffer);

    return {
      storageKey,
      attachmentRef: `upload://vehicle/${storageKey}`,
    };
  }
}
```

Update `backend/apps/main-service/src/modules/inspections/controllers/inspections.controller.ts`:

```ts
import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { ApiBody, ApiConsumes } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadInspectionPhotoDto } from '../dto/upload-inspection-photo.dto';
import { UploadInspectionPhotoResponseDto } from '../dto/upload-inspection-photo-response.dto';

  @Post('vehicles/:id/inspections/photos/upload')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload an arrival photo for an inspection draft.' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        slot: { type: 'string' },
      },
      required: ['file'],
    },
  })
  @ApiOkResponse({
    description: 'The uploaded arrival photo reference for the intake workspace.',
    type: UploadInspectionPhotoResponseDto,
  })
  uploadPhoto(
    @Param('id') id: string,
    @Body() payload: UploadInspectionPhotoDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.inspectionsService.uploadPhoto(id, payload, file);
  }
```

Update `backend/apps/main-service/src/modules/inspections/services/inspections.service.ts`:

```ts
import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { UploadInspectionPhotoDto } from '../dto/upload-inspection-photo.dto';
import { InspectionEvidenceStorageService } from './inspection-evidence-storage.service';

  constructor(
    private readonly inspectionsRepository: InspectionsRepository,
    private readonly vehiclesService: VehiclesService,
    private readonly bookingsService: BookingsService,
    private readonly inspectionEvidenceStorageService: InspectionEvidenceStorageService,
  ) {}

  async uploadPhoto(vehicleId: string, payload: UploadInspectionPhotoDto, file: Express.Multer.File) {
    await this.vehiclesService.findById(vehicleId);

    if (!file?.buffer?.length) {
      throw new BadRequestException('An image upload is required');
    }

    if (!file.mimetype?.startsWith('image/')) {
      throw new BadRequestException('Only image uploads are supported for intake arrival photos');
    }

    const slot = payload.slot?.trim() || 'unslotted';
    const persistedFile = await this.inspectionEvidenceStorageService.saveImage(vehicleId, slot, file);

    return {
      slot,
      attachmentRef: persistedFile.attachmentRef,
      storageKey: persistedFile.storageKey,
    };
  }
```

Update `backend/apps/main-service/src/modules/inspections/inspections.module.ts`:

```ts
import { InspectionEvidenceStorageService } from './services/inspection-evidence-storage.service';

@Module({
  imports: [VehiclesModule, BookingsModule],
  controllers: [InspectionsController],
  providers: [InspectionsRepository, InspectionsService, InspectionEvidenceStorageService],
  exports: [InspectionsRepository, InspectionsService],
})
export class InspectionsModule {}
```

- [ ] **Step 4: Run the backend integration test again**

Run: `npm test -- inspections.integration.spec.ts --runInBand`
Working directory: `backend`
Expected: PASS with the new upload test and the existing inspection-route coverage

- [ ] **Step 5: Commit**

```bash
git add backend/apps/main-service/src/modules/inspections/controllers/inspections.controller.ts backend/apps/main-service/src/modules/inspections/services/inspections.service.ts backend/apps/main-service/src/modules/inspections/services/inspection-evidence-storage.service.ts backend/apps/main-service/src/modules/inspections/dto/upload-inspection-photo.dto.ts backend/apps/main-service/src/modules/inspections/dto/upload-inspection-photo-response.dto.ts backend/apps/main-service/src/modules/inspections/inspections.module.ts backend/apps/main-service/test/inspections.integration.spec.ts
git commit -m "feat: add inspection arrival photo upload route"
```

### Task 2: Add frontend upload client support and pure photo-state helpers

**Files:**
- Create: `frontend/src/screens/digitalIntakeInspectionWorkspacePhotoState.mjs`
- Create: `frontend/src/screens/digitalIntakeInspectionWorkspacePhotoState.test.mjs`
- Modify: `frontend/src/lib/inspectionStaffClient.js`
- Modify: `frontend/src/lib/api/generated/inspections/requests.ts`
- Modify: `frontend/src/lib/api/generated/inspections/staff-web-inspections.ts`
- Modify: `frontend/src/screens/digitalIntakeInspectionWorkspaceForm.mjs`
- Test: `frontend/src/screens/digitalIntakeInspectionWorkspaceForm.test.mjs`

- [ ] **Step 1: Write the failing frontend helper tests**

Create `frontend/src/screens/digitalIntakeInspectionWorkspacePhotoState.test.mjs`:

```javascript
import test from 'node:test'
import assert from 'node:assert/strict'

import {
  createInitialArrivalPhotoUiState,
  hasPendingArrivalPhotoUploads,
  markArrivalPhotoSelected,
  markArrivalPhotoUploaded,
} from './digitalIntakeInspectionWorkspacePhotoState.mjs'

test('markArrivalPhotoSelected stores local preview state without creating a persisted ref', () => {
  const state = markArrivalPhotoSelected(createInitialArrivalPhotoUiState(), 'front', {
    file: { name: 'front.jpg' },
    previewUrl: 'blob:front-preview',
  })

  assert.equal(state.front.status, 'selected')
  assert.equal(state.front.previewUrl, 'blob:front-preview')
  assert.equal(state.front.attachmentRef, '')
})

test('markArrivalPhotoUploaded keeps the preview and adds the persisted attachment ref', () => {
  const selectedState = markArrivalPhotoSelected(createInitialArrivalPhotoUiState(), 'front', {
    file: { name: 'front.jpg' },
    previewUrl: 'blob:front-preview',
  })

  const uploadedState = markArrivalPhotoUploaded(selectedState, 'front', 'upload://vehicle/front-ref')

  assert.equal(uploadedState.front.status, 'uploaded')
  assert.equal(uploadedState.front.previewUrl, 'blob:front-preview')
  assert.equal(uploadedState.front.attachmentRef, 'upload://vehicle/front-ref')
})

test('hasPendingArrivalPhotoUploads only flags selected but not yet uploaded slots', () => {
  const selectedState = markArrivalPhotoSelected(createInitialArrivalPhotoUiState(), 'front', {
    file: { name: 'front.jpg' },
    previewUrl: 'blob:front-preview',
  })

  assert.equal(hasPendingArrivalPhotoUploads(selectedState), true)
  assert.equal(
    hasPendingArrivalPhotoUploads(
      markArrivalPhotoUploaded(selectedState, 'front', 'upload://vehicle/front-ref'),
    ),
    false,
  )
})
```

Add this assertion to `frontend/src/screens/digitalIntakeInspectionWorkspaceForm.test.mjs`:

```javascript
test('buildIntakeInspectionPayload only serializes uploaded arrival-photo refs', () => {
  const draft = {
    ...createInitialIntakeDraft(),
    arrivalPhotos: {
      ...createInitialIntakeDraft().arrivalPhotos,
      front: 'upload://vehicle/front-ref',
      rear: '',
    },
  }

  const payload = buildIntakeInspectionPayload({
    draft,
    userId: 'staff-14',
  })

  assert.deepEqual(payload.attachmentRefs, ['upload://vehicle/front-ref'])
})
```

- [ ] **Step 2: Run the frontend tests to verify they fail**

Run: `node --test frontend/src/screens/digitalIntakeInspectionWorkspacePhotoState.test.mjs frontend/src/screens/digitalIntakeInspectionWorkspaceForm.test.mjs`
Working directory: `codewave`
Expected: FAIL because `digitalIntakeInspectionWorkspacePhotoState.mjs` does not exist yet

- [ ] **Step 3: Write the minimal helper and client implementation**

Create `frontend/src/screens/digitalIntakeInspectionWorkspacePhotoState.mjs`:

```javascript
import { arrivalPhotoSlots } from './digitalIntakeInspectionWorkspaceForm.mjs'

const createEmptySlotState = () => ({
  file: null,
  fileName: '',
  previewUrl: '',
  status: 'idle',
  attachmentRef: '',
  error: '',
})

export const createInitialArrivalPhotoUiState = () =>
  Object.fromEntries(arrivalPhotoSlots.map((slot) => [slot.value, createEmptySlotState()]))

export const markArrivalPhotoSelected = (state, slot, { file, previewUrl }) => ({
  ...state,
  [slot]: {
    ...createEmptySlotState(),
    file,
    fileName: file?.name ?? '',
    previewUrl: previewUrl ?? '',
    status: 'selected',
    attachmentRef: state?.[slot]?.attachmentRef ?? '',
  },
})

export const markArrivalPhotoUploaded = (state, slot, attachmentRef) => ({
  ...state,
  [slot]: {
    ...state[slot],
    status: 'uploaded',
    attachmentRef,
    error: '',
  },
})

export const markArrivalPhotoUploadError = (state, slot, message) => ({
  ...state,
  [slot]: {
    ...state[slot],
    status: 'error',
    error: message,
  },
})

export const hasPendingArrivalPhotoUploads = (state) =>
  Object.values(state ?? {}).some((entry) => entry?.status === 'selected')
```

Update `frontend/src/lib/inspectionStaffClient.js` so `request` supports `FormData` and add `uploadInspectionPhoto`:

```javascript
const request = async (path, { accessToken, body, method = 'GET' } = {}) => {
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: body ? (isFormData ? body : JSON.stringify(body)) : undefined,
  })

  // existing parseResponse + error handling stays the same
}

export const uploadInspectionPhoto = async ({ vehicleId, slot, file, accessToken }) => {
  if (!vehicleId) {
    throw new ApiError('Select a vehicle before uploading an arrival photo.', 400, {
      path: '/api/vehicles/:id/inspections/photos/upload',
    })
  }

  if (!(file instanceof File) || file.size < 1) {
    throw new ApiError('Choose an image file before uploading an arrival photo.', 400, {
      path: '/api/vehicles/:id/inspections/photos/upload',
    })
  }

  const formData = new FormData()
  formData.append('file', file)
  formData.append('slot', slot)

  return request(`/api/vehicles/${vehicleId}/inspections/photos/upload`, {
    method: 'POST',
    accessToken,
    body: formData,
  })
}
```

Update `frontend/src/lib/api/generated/inspections/requests.ts`:

```ts
  uploadInspectionPhoto: {
    method: 'POST',
    path: '/api/vehicles/:id/inspections/photos/upload',
    status: 'live',
    source: 'codex',
  },
```

Update `frontend/src/lib/api/generated/inspections/staff-web-inspections.ts`:

```ts
export type StaffInspectionPhotoUploadState =
  | 'photo_ready'
  | 'photo_submitting'
  | 'photo_saved'
  | 'vehicle_not_found'
  | 'photo_failed';
```

Update `frontend/src/screens/digitalIntakeInspectionWorkspaceForm.mjs` so slot metadata is card-friendly:

```javascript
const arrivalPhotoLabels = {
  front: { label: 'Front', helper: 'Front view', required: true, accent: 'bg-sky-50 text-sky-700' },
  rear: { label: 'Rear', helper: 'Rear view', required: true, accent: 'bg-emerald-50 text-emerald-700' },
  leftSide: { label: 'Left side', helper: 'Left side', required: true, accent: 'bg-violet-50 text-violet-700' },
  rightSide: { label: 'Right side', helper: 'Right side', required: true, accent: 'bg-amber-50 text-amber-700' },
  dashboardOdometer: { label: 'Dashboard / odometer', helper: 'Dashboard / odometer', required: false, accent: 'bg-surface-raised text-ink-secondary' },
  interior: { label: 'Interior', helper: 'Interior', required: false, accent: 'bg-surface-raised text-ink-secondary' },
  damageCloseup: { label: 'Damage close-up', helper: 'Damage close-up', required: false, accent: 'bg-surface-raised text-ink-secondary' },
  additional: { label: 'Additional', helper: 'Additional photo', required: false, accent: 'bg-surface-raised text-ink-secondary' },
}

export const arrivalPhotoSlots = Object.entries(arrivalPhotoLabels).map(([value, meta]) => ({
  value,
  ...meta,
}))
```

- [ ] **Step 4: Run the frontend helper tests again**

Run: `node --test frontend/src/screens/digitalIntakeInspectionWorkspacePhotoState.test.mjs frontend/src/screens/digitalIntakeInspectionWorkspaceForm.test.mjs`
Working directory: `codewave`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/inspectionStaffClient.js frontend/src/lib/api/generated/inspections/requests.ts frontend/src/lib/api/generated/inspections/staff-web-inspections.ts frontend/src/screens/digitalIntakeInspectionWorkspacePhotoState.mjs frontend/src/screens/digitalIntakeInspectionWorkspacePhotoState.test.mjs frontend/src/screens/digitalIntakeInspectionWorkspaceForm.mjs frontend/src/screens/digitalIntakeInspectionWorkspaceForm.test.mjs
git commit -m "feat: add intake arrival photo upload helpers"
```

### Task 3: Rebuild the intake workspace around tabs, upload cards, and aligned fuel controls

**Files:**
- Modify: `frontend/src/screens/DigitalIntakeInspectionWorkspace.js`
- Modify: `frontend/src/screens/workspaceCopyCleanup.test.mjs`
- Test: `frontend/src/screens/digitalIntakeInspectionWorkspaceView.test.mjs`

- [ ] **Step 1: Write the failing workspace regression checks**

Add this block to `frontend/src/screens/workspaceCopyCleanup.test.mjs` inside the intake workspace assertions:

```javascript
  assert.ok(intakeScreen.includes('Booking Reference'))
  assert.ok(intakeScreen.includes('Vehicle Inspection'))
  assert.ok(intakeScreen.includes('Selected file stays local until you upload it.'))
  assert.ok(!intakeScreen.includes('Ref-based save'))
  assert.ok(!intakeScreen.includes('History stays on the right'))
```

- [ ] **Step 2: Run the regression test to verify it fails**

Run: `node --test frontend/src/screens/workspaceCopyCleanup.test.mjs`
Working directory: `codewave`
Expected: FAIL because the current workspace still uses the raw-ref arrival-photo section and right-column history copy

- [ ] **Step 3: Implement the tabbed workspace and photo-card UI**

Update `frontend/src/screens/DigitalIntakeInspectionWorkspace.js` with these structural changes:

```javascript
import { Upload, ImagePlus, CheckCircle2 } from 'lucide-react'
import { uploadInspectionPhoto } from '@/lib/inspectionStaffClient'
import {
  createInitialArrivalPhotoUiState,
  hasPendingArrivalPhotoUploads,
  markArrivalPhotoSelected,
  markArrivalPhotoUploaded,
  markArrivalPhotoUploadError,
} from './digitalIntakeInspectionWorkspacePhotoState.mjs'

const [activeTab, setActiveTab] = useState('booking_reference')
const [arrivalPhotoUiState, setArrivalPhotoUiState] = useState(createInitialArrivalPhotoUiState())
const photoInputRefs = useRef({})
```

Add object-URL cleanup and photo handlers:

```javascript
useEffect(() => {
  return () => {
    Object.values(arrivalPhotoUiState).forEach((entry) => {
      if (entry?.previewUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(entry.previewUrl)
      }
    })
  }
}, [arrivalPhotoUiState])

const handleSelectArrivalPhoto = (slot, file) => {
  if (!(file instanceof File)) {
    return
  }

  const nextPreviewUrl = URL.createObjectURL(file)
  const previousPreviewUrl = arrivalPhotoUiState[slot]?.previewUrl
  if (previousPreviewUrl?.startsWith('blob:')) {
    URL.revokeObjectURL(previousPreviewUrl)
  }

  setArrivalPhotoUiState((current) =>
    markArrivalPhotoSelected(current, slot, {
      file,
      previewUrl: nextPreviewUrl,
    }),
  )
}

const handleUploadArrivalPhoto = async (slot) => {
  const entry = arrivalPhotoUiState[slot]
  if (!(entry?.file instanceof File) || !draft.vehicleId.trim()) {
    return
  }

  setArrivalPhotoUiState((current) => ({
    ...current,
    [slot]: {
      ...current[slot],
      status: 'uploading',
      error: '',
    },
  }))

  try {
    const response = await uploadInspectionPhoto({
      vehicleId: draft.vehicleId.trim(),
      slot,
      file: entry.file,
      accessToken: user?.accessToken,
    })

    updateArrivalPhoto(slot, response.attachmentRef)
    setArrivalPhotoUiState((current) => markArrivalPhotoUploaded(current, slot, response.attachmentRef))
  } catch (error) {
    setArrivalPhotoUiState((current) =>
      markArrivalPhotoUploadError(current, slot, error?.message || 'Photo upload failed.'),
    )
  }
}
```

Render the new tab shell under the hero/meta area:

```jsx
<div className="mt-6 inline-flex rounded-[28px] border border-surface-border bg-[#121214] p-1">
  {[
    { value: 'booking_reference', label: 'Booking Reference' },
    { value: 'vehicle_inspection', label: 'Vehicle Inspection' },
  ].map((tab) => (
    <button
      key={tab.value}
      type="button"
      onClick={() => setActiveTab(tab.value)}
      className={`rounded-[22px] px-5 py-3 text-sm font-semibold transition ${
        activeTab === tab.value
          ? 'bg-brand-orange text-white'
          : 'text-ink-muted hover:text-ink-primary'
      }`}
    >
      {tab.label}
    </button>
  ))}
</div>
```

Replace the fuel section with a true equal-width segmented row:

```jsx
<div className="grid grid-cols-5 gap-2 rounded-[28px] border border-surface-border bg-[#121214] p-2">
  {fuelLevelOptions.map((option) => (
    <button
      key={option}
      type="button"
      onClick={() => updateDraft({ fuelLevel: option })}
      className={`min-h-[56px] rounded-[18px] text-center text-lg font-semibold transition ${
        draft.fuelLevel === option
          ? 'bg-brand-orange text-white'
          : 'text-ink-muted hover:text-ink-primary'
      }`}
    >
      {option}
    </button>
  ))}
</div>
```

Replace the raw text inputs in `Arrival Photos` with card slots:

```jsx
<div className="grid gap-3 md:grid-cols-4">
  {arrivalPhotoSlots.map((slot) => {
    const photoEntry = arrivalPhotoUiState[slot.value]
    const isUploaded = Boolean(draft.arrivalPhotos[slot.value])

    return (
      <div key={slot.value} className="rounded-2xl border border-surface-border bg-surface-card p-3">
        <button
          type="button"
          onClick={() => photoInputRefs.current[slot.value]?.click()}
          className={`flex h-[168px] w-full flex-col items-center justify-center rounded-2xl border border-dashed border-surface-border transition ${slot.accent}`}
        >
          {photoEntry.previewUrl ? (
            <img
              src={photoEntry.previewUrl}
              alt={slot.label}
              className="h-full w-full rounded-[14px] object-cover"
            />
          ) : (
            <>
              <ImagePlus size={22} />
              <span className="mt-3 text-sm font-semibold">{slot.label}</span>
              <span className="mt-1 text-xs">{slot.helper}</span>
            </>
          )}
        </button>

        <input
          ref={(node) => {
            photoInputRefs.current[slot.value] = node
          }}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => handleSelectArrivalPhoto(slot.value, event.target.files?.[0] ?? null)}
        />

        <div className="mt-3 flex items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-ink-primary">{slot.label}</p>
            <p className="text-xs text-ink-muted">
              {isUploaded ? 'Uploaded' : photoEntry.status === 'selected' ? 'Selected file stays local until you upload it.' : 'No file uploaded yet.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void handleUploadArrivalPhoto(slot.value)}
            disabled={photoEntry.status !== 'selected'}
            className="btn-ghost"
          >
            {isUploaded ? <CheckCircle2 size={15} /> : <Upload size={15} />}
            {isUploaded ? 'Saved' : 'Upload'}
          </button>
        </div>
      </div>
    )
  })}
</div>
```

Move history and detail into the `Vehicle Inspection` tab instead of the permanent right column:

```jsx
{activeTab === 'vehicle_inspection' ? (
  <div className="space-y-5">
    <section className="card p-5 md:p-6">{/* Vehicle Inspection History */}</section>
    <section className="card p-5 md:p-6">{/* Selected Inspection Detail */}</section>
  </div>
) : (
  <div className="space-y-5">{/* Booking Reference tab content */}</div>
)}
```

Update the action area copy so it reflects pending uploads:

```jsx
<span className="badge badge-gray">
  {hasPendingArrivalPhotoUploads(arrivalPhotoUiState) ? 'Pending photo uploads' : 'Ready to save'}
</span>
```

- [ ] **Step 4: Run the frontend tests for the touched helpers and copy checks**

Run: `node --test frontend/src/screens/digitalIntakeInspectionWorkspacePhotoState.test.mjs frontend/src/screens/digitalIntakeInspectionWorkspaceForm.test.mjs frontend/src/screens/digitalIntakeInspectionWorkspaceView.test.mjs frontend/src/screens/workspaceCopyCleanup.test.mjs`
Working directory: `codewave`
Expected: PASS

- [ ] **Step 5: Run lint and build**

Run: `npm run lint`
Working directory: `frontend`
Expected: PASS

Run: `npm run build`
Working directory: `frontend`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add frontend/src/screens/DigitalIntakeInspectionWorkspace.js frontend/src/screens/workspaceCopyCleanup.test.mjs
git commit -m "feat: add tabbed intake photo upload workspace"
```

### Task 4: Final cross-stack verification

**Files:**
- Verify only: `backend/apps/main-service/test/inspections.integration.spec.ts`
- Verify only: `frontend/src/screens/digitalIntakeInspectionWorkspacePhotoState.test.mjs`
- Verify only: `frontend/src/screens/digitalIntakeInspectionWorkspaceForm.test.mjs`
- Verify only: `frontend/src/screens/digitalIntakeInspectionWorkspaceView.test.mjs`
- Verify only: `frontend/src/screens/workspaceCopyCleanup.test.mjs`

- [ ] **Step 1: Run the backend upload coverage**

Run: `npm test -- inspections.integration.spec.ts --runInBand`
Working directory: `backend`
Expected: PASS

- [ ] **Step 2: Run the frontend regression pack for this feature**

Run: `node --test frontend/src/screens/digitalIntakeInspectionWorkspacePhotoState.test.mjs frontend/src/screens/digitalIntakeInspectionWorkspaceForm.test.mjs frontend/src/screens/digitalIntakeInspectionWorkspaceView.test.mjs frontend/src/screens/workspaceCopyCleanup.test.mjs`
Working directory: `codewave`
Expected: PASS

- [ ] **Step 3: Run the frontend static verification**

Run: `npm run lint`
Working directory: `frontend`
Expected: PASS

Run: `npm run build`
Working directory: `frontend`
Expected: PASS

- [ ] **Step 4: Run the backend compile check**

Run: `npm run build:main`
Working directory: `backend`
Expected: PASS

- [ ] **Step 5: Commit the final verification sweep if any verification-only fixes were required**

```bash
git add backend frontend
git commit -m "chore: verify intake inspection upload and tab flow"
```

## Self-Review

- Spec coverage:
  - `Booking Reference` / `Vehicle Inspection` tabs are implemented in Task 3.
  - `Vehicle Inspection History` and `Selected Inspection Detail` are grouped under one tab in Task 3.
  - Real arrival-photo upload flow is implemented by Task 1 backend route plus Task 2 client and Task 3 UI.
  - Thumbnail previews with select-first-then-upload behavior are implemented in Tasks 2 and 3.
  - Fuel-level alignment cleanup is implemented in Task 3.
- Placeholder scan:
  - No `TODO`, `TBD`, or “similar to previous task” shortcuts remain.
- Type consistency:
  - The plan uses one endpoint name throughout: `uploadInspectionPhoto`.
  - Persisted media values remain `attachmentRefs` and local card state stays in `arrivalPhotoUiState`.
