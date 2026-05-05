# Staff Operations Manual Test Runbook

## Booking To Job Order Lifecycle

1. Sign in to the web portal as `service_adviser` or `super_admin`.
2. Open `Booking Schedule`.
3. Keep `Schedule view` on `Active`.
4. Confirm a pending booking.
5. Verify the booking now shows `Confirmed`.
6. Use `Send To Workshop`.
7. Verify the booking status changes to `Workshop Handoff`.
8. Open `Job Orders`.
9. Keep the workbench on `Active`.
10. Refresh booking handoffs.
11. Confirm the handoff source appears for the same booking date.
12. Create a job order from the booking handoff.
13. Verify the booking no longer needs manual completion from the booking screen.
14. Move the job order through assignment, progress, QA, finalization, and payment.
15. Return to `Booking Schedule`.
16. Switch the schedule to `History`.
17. Confirm the booking is now `Completed` only after the job order was finalized.

## Active And History Split

1. Open `Booking Schedule`.
2. Compare `Active` and `History`.
3. Confirm `Active` shows operational bookings only.
4. Confirm `History` shows `completed`, `declined`, and `cancelled` records.
5. Open `Job Orders`.
6. Compare `Active` and `History`.
7. Confirm `Active` excludes finalized and cancelled job orders.
8. Confirm `History` shows finalized and cancelled job orders for lookup and review.
9. Open `Invoices & Orders`.
10. Confirm the job-order selector loads finalized/history records rather than active workshop records.

## Service Management

1. Open `Service Management`.
2. Create a service category.
3. Create a booking service under that category.
4. Verify the new service appears in the live service list.
5. Open `Catalog Admin`.
6. Confirm booking-service creation is no longer shown there.
7. Confirm `Catalog Admin` remains focused on ecommerce catalog management only.

## Back-Job Flow

1. Sign in as `service_adviser` or `super_admin`.
2. Make sure you already have one finalized booking/job order from the lifecycle flow.
3. Open `Back-Jobs`.
4. Pick the finalized original vehicle and finalized original job order or source record.
5. Create a back-job case with a clear complaint or return reason.
6. Save the case.
7. Verify the back-job appears in the review list.
8. Review the back-job details and move it into the approval or release-ready state supported by the page.
9. Create or open the rework job order tied to that back-job.
10. Assign a technician.
11. Add progress and evidence.
12. Move the rework job order through QA.
13. Finalize the rework.
14. Return to `Back-Jobs`.
15. Confirm the original-finalized lineage remains visible and the rework resolution is attached to the back-job record.

## Insurance Flow

1. Sign in as `service_adviser` or `super_admin`.
2. Make sure at least one customer insurance inquiry exists.
3. Open `Insurance`.
4. Load the inquiry list or the target customer inquiry from the current review surface.
5. Open one inquiry.
6. Confirm customer details, vehicle details, and inquiry notes are visible.
7. Move the inquiry through the available review statuses.
8. Save staff review notes.
9. Refresh the page.
10. Confirm the new status and notes persist.
11. Verify the page still reflects the current customer-first review model instead of a fake global queue.

## Staff Account Flow

1. Sign in as `super_admin`.
2. Open `Staff Accounts`.
3. Create one `staff` account.
4. Create one `technician` or `mechanic` account.
5. Create one `admin` account.
6. Verify each new account receives an auto-generated staff ID.
7. Verify each new account receives an auto-generated unique employee email.
8. Sign out.
9. Sign in with one of the newly created accounts.
10. Confirm login succeeds immediately without waiting for a separate activation workaround.
11. Sign back in as `super_admin`.
12. Return to `Staff Accounts`.
13. Deactivate the created account from the status control.
14. Try logging in with that deactivated account and confirm access is blocked.
15. Reactivate the same account.
16. Sign in with that account again and confirm access is restored.
17. Sign in as a non-super-admin role.
18. Confirm `Staff Accounts` is hidden or blocked for that role.

## Navigation Checks

1. Verify the sidebar now shows:
   - `Service Timeline`
   - `Settings`
   - `Service Management`
2. Open each page once from the sidebar.
3. Use the top search bar to find each page.
4. Confirm search and sidebar both route to the same restored pages.
