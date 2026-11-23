import type { StayProperty } from '../data/egyptData';

export type CurrencyCode = 'EGP' | 'USD';

export const EGP_PER_USD = 49.5; // Indicative Nov 2026 conversion reference (centralized)

export interface DateRange {
  checkIn: Date | null;
  checkOut: Date | null;
}

export interface GuestCounts {
  adults: number;
  children: number;
}

export interface CalendarCell {
  date: Date;
  dayNumber: number;
  isCurrentMonth: boolean;
  isDisabled: boolean;
  isCheckIn: boolean;
  isCheckOut: boolean;
  isInRange: boolean;
}

export type BookingStatus =
  | 'pending_confirmation'
  | 'contacted'
  | 'confirmed'
  | 'rejected'
  | 'cancelled';

export interface PropertyOverride {
  id: string;
  priceEgp: number;
  available: boolean;
  maxGuests: number;
  updatedAtIso?: string;
}

export interface BookingRecord {
  id: string;
  reference: string;
  userId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerNotes: string;
  stayId: string;
  stayName: string;
  area: string;
  photoUrl: string;
  checkIn: Date;
  checkOut: Date;
  guests: number;
  nights: number;
  nightlyRateEgp: number;
  totalEgp: number;
  status: BookingStatus;
  salesNotes: string;
  confirmationDetails: string;
  createdAtIso: string;
  updatedAtIso: string;
}

export interface StayReviewRecord {
  id: string;
  stayId: string;
  userId: string;
  authorName: string;
  rating: number;
  comment: string;
  createdAtIso: string;
}

export interface BookingsSummary {
  totalRequests: number;
  pendingCount: number;
  contactedCount: number;
  confirmedCount: number;
  rejectedCount: number;
  cancelledCount: number;
  activeCount: number;
  totalNights: number;
  totalActiveEgp: number;
}

export interface PriceBreakdown {
  nights: number;
  nightlyRateEgp: number;
  accommodationSubtotalEgp: number;
  hospitalityServiceFeeEgp: number;
  totalEgp: number;
}

export const MANDATORY_BOOKING_PENDING_MESSAGE =
  'Your booking request has been received. It is currently pending confirmation. Our sales team will contact you within 24 hours to confirm availability and discuss your booking details.';

const MONTH_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const MONTH_FULL = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export function stripTime(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function isSameDay(a: Date | null, b: Date | null): boolean {
  if (!a || !b) return false;
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function formatShortDate(date: Date | null, fallback = 'Add date'): string {
  if (!date) return fallback;
  return `${MONTH_SHORT[date.getMonth()]} ${date.getDate()}`;
}

export function formatFullDate(date: Date): string {
  return `${MONTH_SHORT[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

export function formatMonthYear(year: number, monthIndex: number): string {
  return `${MONTH_FULL[monthIndex]} ${year}`;
}

export function formatDateInputValue(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function calculateNights(checkIn: Date | null, checkOut: Date | null): number {
  if (!checkIn || !checkOut) return 3;
  const msPerDay = 86_400_000;
  const diff = Math.round(
    (stripTime(checkOut).getTime() - stripTime(checkIn).getTime()) / msPerDay,
  );
  return diff > 0 ? diff : 1;
}

export function computePriceBreakdown(nightlyRateEgp: number, nights: number): PriceBreakdown {
  const safeNights = Math.max(1, Math.round(nights));
  const safeRate = Math.max(500, Math.round(nightlyRateEgp));
  const accommodationSubtotalEgp = safeRate * safeNights;
  const hospitalityServiceFeeEgp = 0; // Transparent direct rate: concierge coordination included
  return {
    nights: safeNights,
    nightlyRateEgp: safeRate,
    accommodationSubtotalEgp,
    hospitalityServiceFeeEgp,
    totalEgp: accommodationSubtotalEgp + hospitalityServiceFeeEgp,
  };
}

export function applyDateSelection(
  current: DateRange,
  clickedDate: Date,
  activeField: 'checkIn' | 'checkOut',
): { nextRange: DateRange; completedCheckout: boolean } {
  const clicked = stripTime(clickedDate);

  if (activeField === 'checkIn' || !current.checkIn || (current.checkIn && current.checkOut)) {
    return {
      nextRange: { checkIn: clicked, checkOut: null },
      completedCheckout: false,
    };
  }

  const checkInStripped = stripTime(current.checkIn);
  if (clicked.getTime() <= checkInStripped.getTime()) {
    return {
      nextRange: { checkIn: clicked, checkOut: null },
      completedCheckout: false,
    };
  }

  return {
    nextRange: { checkIn: checkInStripped, checkOut: clicked },
    completedCheckout: true,
  };
}

export function buildCalendarMonth(
  year: number,
  monthIndex: number,
  range: DateRange,
  activeField: 'checkIn' | 'checkOut',
  minDate: Date = new Date(2026, 10, 1),
): CalendarCell[] {
  const firstOfMonth = new Date(year, monthIndex, 1);
  const startOffset = (firstOfMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const totalSlots = Math.ceil((startOffset + daysInMonth) / 7) * 7;

  const minTime = stripTime(minDate).getTime();
  const checkInTime = range.checkIn ? stripTime(range.checkIn).getTime() : null;
  const checkOutTime = range.checkOut ? stripTime(range.checkOut).getTime() : null;

  const cells: CalendarCell[] = [];
  for (let i = 0; i < totalSlots; i++) {
    const dayOffset = i - startOffset;
    const cellDate = new Date(year, monthIndex, 1 + dayOffset);
    const cellTime = cellDate.getTime();
    const isCurrentMonth = cellDate.getMonth() === monthIndex;

    let isDisabled = !isCurrentMonth || cellTime < minTime;
    if (
      activeField === 'checkOut' &&
      checkInTime !== null &&
      checkOutTime === null &&
      cellTime <= checkInTime
    ) {
      isDisabled = true;
    }

    const isCheckIn = isSameDay(cellDate, range.checkIn);
    const isCheckOut = isSameDay(cellDate, range.checkOut);
    const isInRange =
      checkInTime !== null &&
      checkOutTime !== null &&
      cellTime > checkInTime &&
      cellTime < checkOutTime;

    cells.push({
      date: cellDate,
      dayNumber: cellDate.getDate(),
      isCurrentMonth,
      isDisabled,
      isCheckIn,
      isCheckOut,
      isInRange,
    });
  }

  return cells;
}

export function formatGuestSummary(guests: GuestCounts): string {
  const total = guests.adults + guests.children;
  if (total <= 0) return 'Add guests';
  return total === 1 ? '1 guest' : `${total} guests`;
}

export function formatPrice(priceEgp: number, currency: CurrencyCode): string {
  if (currency === 'USD') {
    const usd = Math.round(priceEgp / EGP_PER_USD);
    return `$${usd.toLocaleString('en-US')}`;
  }
  return `${Math.round(priceEgp).toLocaleString('en-US')} EGP`;
}

export function applyPropertyOverrides(
  stays: StayProperty[],
  overrides: Record<string, PropertyOverride>,
): StayProperty[] {
  return stays.map((stay) => {
    const ov = overrides[stay.id];
    if (!ov) return stay;
    return {
      ...stay,
      priceEgp: ov.priceEgp,
      available: ov.available,
      maxGuests: ov.maxGuests,
    };
  });
}

export function filterStays(
  stays: StayProperty[],
  districtKey: string,
  totalGuests: number,
): StayProperty[] {
  return stays.filter((stay) => {
    const matchesDistrict = districtKey === 'all' || stay.districtKey === districtKey;
    const matchesGuests = totalGuests <= 0 || stay.maxGuests >= totalGuests;
    return matchesDistrict && matchesGuests;
  });
}

export function getSimilarStays(
  stays: StayProperty[],
  currentStayId: string,
  count = 4,
): StayProperty[] {
  const others = stays.filter((s) => s.id !== currentStayId);
  return others.slice(0, count);
}

export function easeInOutCubic(t: number): number {
  const clamped = Math.max(0, Math.min(1, t));
  return clamped < 0.5
    ? 4 * clamped * clamped * clamped
    : 1 - Math.pow(-2 * clamped + 2, 3) / 2;
}

export interface WipeVisualState {
  opaqueStopPct: number;
  midStopPct: number;
  transparentStopPct: number;
  mistLeftPct: number;
  mistOpacity: number;
  incomingScale: number;
  incomingShiftXPct: number;
  outgoingScale: number;
  outgoingShiftXPct: number;
}

export function computeWipeVisualState(rawT: number): WipeVisualState {
  const t = Math.max(0, Math.min(1, rawT));
  const p = easeInOutCubic(t);

  const transparentStopPct = p * 135;
  const opaqueStopPct = transparentStopPct - 35;
  const midStopPct = transparentStopPct - 17.5;

  const edgeFromLeftPct = 100 - midStopPct;
  const mistLeftPct = edgeFromLeftPct - 17;
  const mistOpacity = Math.sin(Math.PI * t) * 0.95;

  return {
    opaqueStopPct,
    midStopPct,
    transparentStopPct,
    mistLeftPct,
    mistOpacity,
    incomingScale: 1.12 - 0.08 * p,
    incomingShiftXPct: 2 * (1 - p),
    outgoingScale: 1.04 + 0.05 * p,
    outgoingShiftXPct: -2 * p,
  };
}

export function generateBookingReference(stayId: string, timestampMs = Date.now()): string {
  const code = stayId
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()
    .slice(0, 3)
    .padEnd(3, 'X');
  const suffix = (timestampMs % 1_000_000).toString(36).toUpperCase().padStart(4, '0').slice(-4);
  return `KMT-2026-${code}${suffix}`;
}

export function getBookingStatusLabel(status: BookingStatus): string {
  switch (status) {
    case 'pending_confirmation':
      return 'Pending Confirmation';
    case 'contacted':
      return 'Contacted by Sales';
    case 'confirmed':
      return 'Confirmed';
    case 'rejected':
      return 'Declined / Unavailable';
    case 'cancelled':
      return 'Cancelled';
  }
}

export function canCustomerCancel(status: BookingStatus): boolean {
  return status === 'pending_confirmation' || status === 'contacted';
}

export function isValidSalesTransition(from: BookingStatus, to: BookingStatus): boolean {
  if (from === to) return true;
  switch (from) {
    case 'pending_confirmation':
      return to === 'contacted' || to === 'confirmed' || to === 'rejected' || to === 'cancelled';
    case 'contacted':
      return to === 'confirmed' || to === 'rejected' || to === 'cancelled';
    case 'confirmed':
      return to === 'cancelled';
    case 'rejected':
      return to === 'contacted' || to === 'pending_confirmation';
    case 'cancelled':
      return false;
  }
}

export function isActiveBookingStatus(status: BookingStatus): boolean {
  return status === 'pending_confirmation' || status === 'contacted' || status === 'confirmed';
}

export function hasActiveBookingForStay(bookings: BookingRecord[], stayId: string): boolean {
  return bookings.some((b) => b.stayId === stayId && isActiveBookingStatus(b.status));
}

export function summarizeBookings(bookings: BookingRecord[]): BookingsSummary {
  let pendingCount = 0;
  let contactedCount = 0;
  let confirmedCount = 0;
  let rejectedCount = 0;
  let cancelledCount = 0;
  let totalNights = 0;
  let totalActiveEgp = 0;

  for (const booking of bookings) {
    switch (booking.status) {
      case 'pending_confirmation':
        pendingCount += 1;
        totalNights += booking.nights;
        totalActiveEgp += booking.totalEgp;
        break;
      case 'contacted':
        contactedCount += 1;
        totalNights += booking.nights;
        totalActiveEgp += booking.totalEgp;
        break;
      case 'confirmed':
        confirmedCount += 1;
        totalNights += booking.nights;
        totalActiveEgp += booking.totalEgp;
        break;
      case 'rejected':
        rejectedCount += 1;
        break;
      case 'cancelled':
        cancelledCount += 1;
        break;
    }
  }

  return {
    totalRequests: bookings.length,
    pendingCount,
    contactedCount,
    confirmedCount,
    rejectedCount,
    cancelledCount,
    activeCount: pendingCount + contactedCount + confirmedCount,
    totalNights,
    totalActiveEgp,
  };
}

export function validateCustomerBookingContact(input: {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerNotes: string;
}): string | null {
  const name = input.customerName.trim();
  const email = input.customerEmail.trim();
  const phone = input.customerPhone.trim();
  const notes = input.customerNotes.trim();

  if (name.length < 2 || name.length > 100) {
    return 'Please enter your full name (2–100 characters).';
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 160) {
    return 'Please enter a valid email address.';
  }
  if (!/^\+?[0-9\s\-()]{6,32}$/.test(phone)) {
    return 'Please enter a valid contact phone or WhatsApp number (at least 6 digits).';
  }
  if (notes.length > 600) {
    return 'Special requests must be 600 characters or fewer.';
  }
  return null;
}

export function getNextLinearIndex(
  currentIndex: number,
  key: string,
  totalItems: number,
  loop = true,
): number | null {
  if (totalItems <= 0) return null;
  const safeCurrent = Math.max(0, Math.min(totalItems - 1, currentIndex));

  if (key === 'Home') return 0;
  if (key === 'End') return totalItems - 1;

  if (key === 'ArrowDown' || key === 'ArrowRight') {
    if (safeCurrent + 1 < totalItems) return safeCurrent + 1;
    return loop ? 0 : totalItems - 1;
  }

  if (key === 'ArrowUp' || key === 'ArrowLeft') {
    if (safeCurrent - 1 >= 0) return safeCurrent - 1;
    return loop ? totalItems - 1 : 0;
  }

  return null;
}

export function getNextGridIndex(
  currentIndex: number,
  key: string,
  totalItems: number,
  columns: number,
): number | null {
  if (totalItems <= 0 || columns <= 0) return null;
  const safeCurrent = Math.max(0, Math.min(totalItems - 1, currentIndex));

  switch (key) {
    case 'ArrowRight':
      return Math.min(totalItems - 1, safeCurrent + 1);
    case 'ArrowLeft':
      return Math.max(0, safeCurrent - 1);
    case 'ArrowDown':
      return safeCurrent + columns < totalItems ? safeCurrent + columns : safeCurrent;
    case 'ArrowUp':
      return safeCurrent - columns >= 0 ? safeCurrent - columns : safeCurrent;
    case 'Home':
      return 0;
    case 'End':
      return totalItems - 1;
    default:
      return null;
  }
}

export function getGridColumnCount(viewportWidth: number): number {
  return viewportWidth > 1000 ? 4 : 2;
}
