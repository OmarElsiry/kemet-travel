# Firestore Security Specification — Kemet Travel (Egypt)

## 1. Data Invariants
1. **PII Isolation (`users/{userId}`)**: A customer profile contains PII (`email`, `phone`). Only the owning user (`request.auth.uid == userId`) or an authorized sales admin (`isAdmin()`) may read (`get`) a profile. Blanket `list` is forbidden to non-admins.
2. **Role Privilege Protection**: On `users/{userId}` create, `role` MUST equal `'customer'`. Users cannot self-assign `'sales'` or write to `/admins/{userId}`.
3. **Booking Request Integrity (`bookings/{bookingId}`)**:
   - Customer `create` MUST bind `userId == request.auth.uid`, `status == 'pending_confirmation'`, `salesNotes == ''`, `confirmationDetails == ''`, and `createdAt == request.time`.
   - Customers CANNOT confirm, reject, or mark their own booking as `'contacted'` or `'confirmed'`, nor modify `salesNotes`, `confirmationDetails`, `totalEgp`, or `nightlyRateEgp`.
   - Customers may ONLY transition their own active booking (`pending_confirmation` or `contacted`) to `'cancelled'`.
   - Once a booking reaches a terminal state (`confirmed`, `rejected`, `cancelled`), non-admins cannot modify it.
   - Only `isAdmin()` may `list` all bookings, update sales statuses/notes/confirmation details, or manage `/properties/{propertyId}` overrides.
4. **Temporal Integrity**: All `createdAt` fields must equal `request.time` on create and remain immutable on update; `updatedAt` must equal `request.time` on every write.
5. **Path & Payload Bounds**: Every document ID matches `^[a-zA-Z0-9_-]{1,128}$` and every string field enforces explicit `.size()` bounds.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Unauthenticated Booking Create**: `auth = null`, `POST /bookings/bk-1` -> `PERMISSION_DENIED`.
2. **Self-Confirmation Shortcut**: Customer creates booking with `status: "confirmed"` -> `PERMISSION_DENIED`.
3. **UID Spoofing on Booking Create**: Customer A (`uid: "u1"`) creates booking with `userId: "u2"` -> `PERMISSION_DENIED`.
4. **Shadow Field Injection on Booking Create**: Valid booking payload + extra `isPaid: true` field -> `PERMISSION_DENIED` (`hasOnly` check).
5. **Customer Sales-Notes Tampering**: Customer updates `salesNotes: "Approved free upgrade"` on own booking -> `PERMISSION_DENIED`.
6. **Customer Status Escalation**: Customer updates own `pending_confirmation` booking to `status: "confirmed"` -> `PERMISSION_DENIED`.
7. **Terminal State Mutation**: Customer updates an already `cancelled` or `confirmed` booking -> `PERMISSION_DENIED`.
8. **Cross-Customer Booking Read (`get` / `list`)**: Customer A reads Customer B's booking or lists `/bookings` without `where('userId', '==', 'u1')` -> `PERMISSION_DENIED`.
9. **Self-Assigned Admin / Sales Role**: Customer creates `/users/u1` with `role: "sales"` or writes `/admins/u1` -> `PERMISSION_DENIED`.
10. **PII Leak on Users Collection**: Customer A reads `/users/u2` or lists `/users` -> `PERMISSION_DENIED`.
11. **Unverified Admin Email Spoof**: User with `email: "omaromar01067@gmail.com"` and `email_verified: false` attempts admin write -> `PERMISSION_DENIED`.
12. **Oversized ID / String Poisoning**: Document ID > 128 chars or containing `/`, or `customerNotes` > 600 chars -> `PERMISSION_DENIED`.
