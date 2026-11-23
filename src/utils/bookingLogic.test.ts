import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyDateSelection,
  applyPropertyOverrides,
  buildCalendarMonth,
  calculateNights,
  canCustomerCancel,
  computePriceBreakdown,
  computeWipeVisualState,
  easeInOutCubic,
  filterStays,
  formatDateInputValue,
  formatGuestSummary,
  formatPrice,
  formatShortDate,
  generateBookingReference,
  getBookingStatusLabel,
  getGridColumnCount,
  getNextGridIndex,
  getNextLinearIndex,
  getSimilarStays,
  hasActiveBookingForStay,
  isValidSalesTransition,
  summarizeBookings,
  validateCustomerBookingContact,
  type BookingRecord,
} from './bookingLogic';
import { STAY_PROPERTIES } from '../data/egyptData';

test('applyDateSelection sets check-in first, then check-out and calculates nights', () => {
  const initial = { checkIn: null, checkOut: null };
  const step1 = applyDateSelection(initial, new Date(2026, 11, 18), 'checkIn');
  assert.equal(step1.completedCheckout, false);
  assert.equal(formatShortDate(step1.nextRange.checkIn), 'Dec 18');
  assert.equal(step1.nextRange.checkOut, null);

  const step2 = applyDateSelection(step1.nextRange, new Date(2026, 11, 22), 'checkOut');
  assert.equal(step2.completedCheckout, true);
  assert.equal(formatShortDate(step2.nextRange.checkOut), 'Dec 22');
  assert.equal(calculateNights(step2.nextRange.checkIn, step2.nextRange.checkOut), 4);
});

test('buildCalendarMonth builds Monday-first grid and disables invalid dates', () => {
  const range = { checkIn: new Date(2026, 11, 18), checkOut: null };
  const cells = buildCalendarMonth(2026, 11, range, 'checkOut', new Date(2026, 11, 1));
  assert.equal(cells.length % 7, 0);
  const dec15 = cells.find((c) => c.isCurrentMonth && c.dayNumber === 15);
  const dec18 = cells.find((c) => c.isCurrentMonth && c.dayNumber === 18);
  const dec20 = cells.find((c) => c.isCurrentMonth && c.dayNumber === 20);
  assert.equal(dec15?.isDisabled, true);
  assert.equal(dec18?.isDisabled, true);
  assert.equal(dec18?.isCheckIn, true);
  assert.equal(dec20?.isDisabled, false);
});

test('formatGuestSummary and EGP/USD formatPrice behave accurately', () => {
  assert.equal(formatGuestSummary({ adults: 0, children: 0 }), 'Add guests');
  assert.equal(formatGuestSummary({ adults: 1, children: 0 }), '1 guest');
  assert.equal(formatGuestSummary({ adults: 2, children: 1 }), '3 guests');
  assert.equal(formatPrice(9500, 'EGP'), '9,500 EGP');
  assert.equal(formatPrice(9900, 'USD'), '$200');
});

test('Egypt STAY_PROPERTIES are unique, differentiated, and filterable', () => {
  assert.equal(STAY_PROPERTIES.length, 8);
  const names = new Set(STAY_PROPERTIES.map((s) => s.name));
  const prices = new Set(STAY_PROPERTIES.map((s) => s.priceEgp));
  const photos = new Set(STAY_PROPERTIES.map((s) => s.photo700));
  const descriptions = new Set(STAY_PROPERTIES.map((s) => s.description));
  assert.equal(names.size, 8);
  assert.equal(prices.size, 8);
  assert.equal(photos.size, 8);
  assert.equal(descriptions.size, 8);

  const all = filterStays(STAY_PROPERTIES, 'all', 2);
  assert.equal(all.length, 8);

  const aswan = filterStays(STAY_PROPERTIES, 'aswan', 2);
  assert.equal(aswan.length, 2);

  const sixGuests = filterStays(STAY_PROPERTIES, 'all', 6);
  assert.equal(sixGuests.length, 2);

  const similar = getSimilarStays(STAY_PROPERTIES, 'zamalek-nile-pavilion', 4);
  assert.equal(similar.length, 4);
  assert.ok(similar.every((s) => s.id !== 'zamalek-nile-pavilion'));
});

test('applyPropertyOverrides merges live price, availability, and maxGuests cleanly', () => {
  const updated = applyPropertyOverrides(STAY_PROPERTIES, {
    'zamalek-nile-pavilion': {
      id: 'zamalek-nile-pavilion',
      priceEgp: 10500,
      available: false,
      maxGuests: 5,
    },
  });
  const zamalek = updated.find((s) => s.id === 'zamalek-nile-pavilion');
  assert.equal(zamalek?.priceEgp, 10500);
  assert.equal(zamalek?.available, false);
  assert.equal(zamalek?.maxGuests, 5);
});

test('computePriceBreakdown & booking reference generator return exact values', () => {
  const breakdown = computePriceBreakdown(9500, 4);
  assert.deepEqual(breakdown, {
    nights: 4,
    nightlyRateEgp: 9500,
    accommodationSubtotalEgp: 38000,
    hospitalityServiceFeeEgp: 0,
    totalEgp: 38000,
  });

  const ref = generateBookingReference('zamalek-nile-pavilion', 1795459200000);
  assert.match(ref, /^KMT-2026-[A-Z0-9]{7}$/);
});

test('booking status transitions, customer cancel permissions, and summaries work', () => {
  assert.equal(getBookingStatusLabel('pending_confirmation'), 'Pending Confirmation');
  assert.equal(canCustomerCancel('pending_confirmation'), true);
  assert.equal(canCustomerCancel('contacted'), true);
  assert.equal(canCustomerCancel('confirmed'), false);
  assert.equal(canCustomerCancel('rejected'), false);
  assert.equal(canCustomerCancel('cancelled'), false);

  assert.equal(isValidSalesTransition('pending_confirmation', 'contacted'), true);
  assert.equal(isValidSalesTransition('pending_confirmation', 'confirmed'), true);
  assert.equal(isValidSalesTransition('pending_confirmation', 'rejected'), true);
  assert.equal(isValidSalesTransition('cancelled', 'confirmed'), false);

  const sampleBookings: BookingRecord[] = [
    {
      id: 'bk-1',
      reference: 'KMT-2026-ZAM0001',
      userId: 'u1',
      customerName: 'Hana Farouk',
      customerEmail: 'hana@example.com',
      customerPhone: '+201001234567',
      customerNotes: 'Late flight arrival',
      stayId: 'zamalek-nile-pavilion',
      stayName: 'Zamalek Nile Pavilion',
      area: 'Zamalek, Cairo',
      photoUrl: 'images/egypt/stay-zamalek-700.webp',
      checkIn: new Date(2026, 11, 22),
      checkOut: new Date(2026, 11, 25),
      guests: 2,
      nights: 3,
      nightlyRateEgp: 9500,
      totalEgp: 28500,
      status: 'pending_confirmation',
      salesNotes: '',
      confirmationDetails: '',
      createdAtIso: '2026-11-23T10:00:00.000Z',
      updatedAtIso: '2026-11-23T10:00:00.000Z',
    },
    {
      id: 'bk-2',
      reference: 'KMT-2026-DAH0002',
      userId: 'u1',
      customerName: 'Hana Farouk',
      customerEmail: 'hana@example.com',
      customerPhone: '+201001234567',
      customerNotes: '',
      stayId: 'dahab-masbat-loft',
      stayName: 'Masbat Reef Seafront Loft',
      area: 'Masbat Bay, Dahab',
      photoUrl: 'images/egypt/stay-dahab-bay-700.webp',
      checkIn: new Date(2026, 11, 27),
      checkOut: new Date(2026, 11, 29),
      guests: 2,
      nights: 2,
      nightlyRateEgp: 3800,
      totalEgp: 7600,
      status: 'confirmed',
      salesNotes: 'Confirmed via phone',
      confirmationDetails: 'Key locker 4B',
      createdAtIso: '2026-11-23T10:05:00.000Z',
      updatedAtIso: '2026-11-23T10:05:00.000Z',
    },
  ];

  const summary = summarizeBookings(sampleBookings);
  assert.deepEqual(summary, {
    totalRequests: 2,
    pendingCount: 1,
    contactedCount: 0,
    confirmedCount: 1,
    rejectedCount: 0,
    cancelledCount: 0,
    activeCount: 2,
    totalNights: 5,
    totalActiveEgp: 36100,
  });

  assert.equal(hasActiveBookingForStay(sampleBookings, 'zamalek-nile-pavilion'), true);
});

test('validateCustomerBookingContact validates name, email, phone, and notes', () => {
  assert.equal(
    validateCustomerBookingContact({
      customerName: 'Laila Mansour',
      customerEmail: 'laila@example.com',
      customerPhone: '+20 100 555 1234',
      customerNotes: 'High floor preferred',
    }),
    null,
  );
  assert.ok(
    validateCustomerBookingContact({
      customerName: 'A',
      customerEmail: 'laila@example.com',
      customerPhone: '+201005551234',
      customerNotes: '',
    }),
  );
  assert.ok(
    validateCustomerBookingContact({
      customerName: 'Laila Mansour',
      customerEmail: 'bad-email',
      customerPhone: '+201005551234',
      customerNotes: '',
    }),
  );
  assert.ok(
    validateCustomerBookingContact({
      customerName: 'Laila Mansour',
      customerEmail: 'laila@example.com',
      customerPhone: '123',
      customerNotes: '',
    }),
  );
});

test('computeWipeVisualState & keyboard helpers compute exact indices', () => {
  assert.equal(easeInOutCubic(0), 0);
  assert.equal(easeInOutCubic(1), 1);
  const mid = computeWipeVisualState(0.5);
  assert.ok(mid.mistOpacity > 0.94 && mid.mistOpacity <= 0.95);

  assert.equal(getNextLinearIndex(0, 'ArrowDown', 4, true), 1);
  assert.equal(getNextLinearIndex(3, 'ArrowDown', 4, true), 0);
  assert.equal(getGridColumnCount(1440), 4);
  assert.equal(getGridColumnCount(390), 2);
  assert.equal(getNextGridIndex(0, 'ArrowDown', 8, 4), 4);
});

test('formatDateInputValue formats local calendar dates without UTC shift', () => {
  assert.equal(formatDateInputValue(new Date(2026, 11, 22)), '2026-12-22');
  assert.equal(formatDateInputValue(new Date(2026, 0, 5)), '2026-01-05');
});
