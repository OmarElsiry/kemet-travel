import {
  Building2,
  Check,
  CheckCircle2,
  Lock,
  Mail,
  Phone,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import type { StayProperty } from '../data/egyptData';
import {
  subscribeToAllBookingsForSales,
  updateBookingBySales,
  upsertPropertyOverride,
} from '../services/firestoreService';
import {
  formatFullDate,
  formatPrice,
  getBookingStatusLabel,
  isValidSalesTransition,
  summarizeBookings,
  type BookingRecord,
  type BookingStatus,
  type CurrencyCode,
} from '../utils/bookingLogic';

interface SalesDashboardModalProps {
  open: boolean;
  stays: StayProperty[];
  currency: CurrencyCode;
  onClose: () => void;
}

const ALL_STATUSES: BookingStatus[] = [
  'pending_confirmation',
  'contacted',
  'confirmed',
  'rejected',
  'cancelled',
];

function statusBadgeStyle(status: BookingStatus): string {
  switch (status) {
    case 'pending_confirmation':
      return 'bg-[#fff4e5] text-[#b45d00] border-[#f39419]/35';
    case 'contacted':
      return 'bg-[#eaf2fe] text-[#1d5ab8] border-[#1d5ab8]/25';
    case 'confirmed':
      return 'bg-[#eaf6ef] text-[#1f7a4c] border-[#249c60]/30';
    case 'rejected':
      return 'bg-[#fdecef] text-[#b3323e] border-[#b3323e]/25';
    case 'cancelled':
      return 'bg-[#f1eeee] text-[#5c5156] border-[#1d1a1c]/15';
  }
}

export function SalesDashboardModal({
  open,
  stays,
  currency,
  onClose,
}: SalesDashboardModalProps) {
  const { isAdmin, firebaseUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'bookings' | 'inventory'>('bookings');
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [bookingsError, setBookingsError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | BookingStatus>('all');
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);

  // Per-booking draft form
  const [draftStatus, setDraftStatus] = useState<BookingStatus>('pending_confirmation');
  const [draftSalesNotes, setDraftSalesNotes] = useState('');
  const [draftConfirmationDetails, setDraftConfirmationDetails] = useState('');
  const [savingBooking, setSavingBooking] = useState(false);
  const [bookingSaveMsg, setBookingSaveMsg] = useState<string | null>(null);

  // Per-property override draft state
  const [propertyDrafts, setPropertyDrafts] = useState<
    Record<string, { priceEgp: string; maxGuests: string; available: boolean }>
  >({});
  const [savingStayId, setSavingStayId] = useState<string | null>(null);
  const [savedStayId, setSavedStayId] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !isAdmin || !firebaseUser?.emailVerified) return;
    setLoadingBookings(true);
    setBookingsError(null);
    const unsubscribe = subscribeToAllBookingsForSales(
      (records) => {
        setBookings(records);
        setLoadingBookings(false);
      },
      (err) => {
        setBookingsError(
          err instanceof Error ? err.message : 'Unable to load incoming bookings.',
        );
        setLoadingBookings(false);
      },
    );
    return () => unsubscribe();
  }, [open, isAdmin, firebaseUser?.emailVerified]);

  useEffect(() => {
    const nextDrafts: Record<string, { priceEgp: string; maxGuests: string; available: boolean }> =
      {};
    for (const s of stays) {
      nextDrafts[s.id] = {
        priceEgp: String(s.priceEgp),
        maxGuests: String(s.maxGuests),
        available: s.available,
      };
    }
    setPropertyDrafts(nextDrafts);
  }, [stays]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  // Strict authorization guard in UI (enforced independently by Firestore rules)
  if (!isAdmin || !firebaseUser?.emailVerified) {
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Sales portal restricted"
        className="fixed inset-0 z-[85] flex items-center justify-center bg-[#1d1a1c]/60 p-4"
        onClick={onClose}
      >
        <div
          className="animate-popover-drop w-full max-w-[440px] rounded-[22px] bg-[#fdf0e7] p-7 text-center text-[#1d1a1c] shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <Lock className="mx-auto h-10 w-10 text-[#b3323e]" strokeWidth={1.6} />
          <h2 className="mt-3 font-display-serif text-[26px]">Authorized Sales Staff Only</h2>
          <p className="mt-2 text-[14px] leading-relaxed text-[#5c5156]">
            Access to customer booking records, confirmations, and property rate management is
            restricted to verified Kemet Travel sales administrators.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="mt-6 rounded-full bg-[#1d1a1c] px-6 py-2.5 text-[14px] font-medium text-white"
          >
            Return Home
          </button>
        </div>
      </div>
    );
  }

  const filteredBookings = bookings.filter((bk) => {
    const matchesStatus = statusFilter === 'all' || bk.status === statusFilter;
    const q = searchTerm.trim().toLowerCase();
    const matchesQuery =
      q.length === 0 ||
      bk.reference.toLowerCase().includes(q) ||
      bk.customerName.toLowerCase().includes(q) ||
      bk.customerEmail.toLowerCase().includes(q) ||
      bk.stayName.toLowerCase().includes(q);
    return matchesStatus && matchesQuery;
  });

  const activeBooking =
    filteredBookings.find((b) => b.id === selectedBookingId) || filteredBookings[0] || null;

  const summary = summarizeBookings(bookings);

  const selectBookingForEdit = (bk: BookingRecord) => {
    setSelectedBookingId(bk.id);
    setDraftStatus(bk.status);
    setDraftSalesNotes(bk.salesNotes);
    setDraftConfirmationDetails(bk.confirmationDetails);
    setBookingSaveMsg(null);
  };

  const handleSaveBookingUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBooking || savingBooking) return;
    if (!isValidSalesTransition(activeBooking.status, draftStatus)) {
      setBookingSaveMsg(
        `Status transition from ${getBookingStatusLabel(activeBooking.status)} to ${getBookingStatusLabel(draftStatus)} is restricted.`,
      );
      return;
    }
    setSavingBooking(true);
    setBookingSaveMsg(null);
    try {
      await updateBookingBySales(activeBooking.id, {
        status: draftStatus,
        salesNotes: draftSalesNotes,
        confirmationDetails: draftConfirmationDetails,
      });
      setBookingSaveMsg(`Updated ${activeBooking.reference} to ${getBookingStatusLabel(draftStatus)}.`);
    } catch (err) {
      setBookingSaveMsg(err instanceof Error ? err.message : 'Failed to save booking update.');
    } finally {
      setSavingBooking(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Kemet Travel Sales and Operations Portal"
      className="fixed inset-0 z-[85] flex items-center justify-center bg-[#1d1a1c]/60 p-3 sm:p-6"
      onClick={onClose}
    >
      <div
        className="flex max-h-[94vh] w-full max-w-[1140px] flex-col overflow-hidden rounded-[22px] bg-[#fdf0e7] text-[#1d1a1c] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#1d1a1c]/10 bg-[#f7d9c6]/60 px-6 py-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#5c5156]">
              Sales &amp; Reservations Operations · {firebaseUser.email}
            </p>
            <h2 className="font-display-serif text-[26px] leading-tight">
              Kemet Travel Sales Desk
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex rounded-full bg-white/80 p-1">
              <button
                type="button"
                onClick={() => setActiveTab('bookings')}
                className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[13px] font-medium transition-colors ${
                  activeTab === 'bookings'
                    ? 'bg-[#1d1a1c] text-white'
                    : 'text-[#5c5156] hover:text-[#1d1a1c]'
                }`}
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Booking Requests ({summary.totalRequests})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('inventory')}
                className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[13px] font-medium transition-colors ${
                  activeTab === 'inventory'
                    ? 'bg-[#1d1a1c] text-white'
                    : 'text-[#5c5156] hover:text-[#1d1a1c]'
                }`}
              >
                <Building2 className="h-3.5 w-3.5" />
                Rates &amp; Availability
              </button>
            </div>

            <button
              type="button"
              aria-label="Close sales portal"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[#1d1a1c]/15 bg-white hover:bg-[#1d1a1c] hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 sm:p-6">
          {activeTab === 'bookings' ? (
            <>
              {/* Summary Strip */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-[14px] bg-white p-3.5">
                  <div className="text-[11.5px] font-medium text-[#8a7f83]">
                    Pending Confirmation
                  </div>
                  <div className="mt-1 text-[22px] font-semibold text-[#b45d00] tabular-nums">
                    {summary.pendingCount}
                  </div>
                </div>
                <div className="rounded-[14px] bg-white p-3.5">
                  <div className="text-[11.5px] font-medium text-[#8a7f83]">Contacted</div>
                  <div className="mt-1 text-[22px] font-semibold text-[#1d5ab8] tabular-nums">
                    {summary.contactedCount}
                  </div>
                </div>
                <div className="rounded-[14px] bg-white p-3.5">
                  <div className="text-[11.5px] font-medium text-[#8a7f83]">Confirmed</div>
                  <div className="mt-1 text-[22px] font-semibold text-[#1f7a4c] tabular-nums">
                    {summary.confirmedCount}
                  </div>
                </div>
                <div className="rounded-[14px] bg-white p-3.5">
                  <div className="text-[11.5px] font-medium text-[#8a7f83]">
                    Active Pipeline Value
                  </div>
                  <div className="mt-1 text-[20px] font-semibold text-[#1d1a1c] tabular-nums">
                    {formatPrice(summary.totalActiveEgp, currency)}
                  </div>
                </div>
              </div>

              {/* Search & Status Filter */}
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <div className="relative min-w-[230px] flex-1">
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a7f83]" />
                  <input
                    type="search"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search reference, customer, email, stay..."
                    aria-label="Search incoming bookings"
                    className="w-full rounded-[12px] border border-[#1d1a1c]/15 bg-white py-2 pl-10 pr-4 text-[13.5px]"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {(['all', ...ALL_STATUSES] as const).map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setStatusFilter(status)}
                      className={`rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors ${
                        statusFilter === status
                          ? 'bg-[#1d1a1c] text-white'
                          : 'bg-white text-[#5c5156] hover:bg-[#fbe7da]'
                      }`}
                    >
                      {status === 'all' ? 'All' : getBookingStatusLabel(status)}
                    </button>
                  ))}
                </div>
              </div>

              {bookingsError && (
                <div className="mt-4 rounded-[12px] bg-[#fdecef] p-4 text-[13.5px] text-[#b3323e]">
                  {bookingsError}
                </div>
              )}

              {loadingBookings ? (
                <div className="mt-6 rounded-[16px] bg-white p-10 text-center text-[14px] text-[#5c5156]">
                  Loading live reservations from Firestore...
                </div>
              ) : filteredBookings.length === 0 ? (
                <div className="mt-6 rounded-[16px] bg-white p-10 text-center text-[14px] text-[#5c5156]">
                  No booking requests match your current filters.
                </div>
              ) : (
                <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[1.1fr_1fr]">
                  {/* Left: Bookings List */}
                  <div className="space-y-2.5">
                    {filteredBookings.map((bk) => {
                      const isSelected = activeBooking?.id === bk.id;
                      return (
                        <button
                          key={bk.id}
                          type="button"
                          onClick={() => selectBookingForEdit(bk)}
                          className={`w-full rounded-[16px] border p-4 text-left transition-all ${
                            isSelected
                              ? 'border-[#1d1a1c] bg-white shadow-md'
                              : 'border-[#1d1a1c]/10 bg-white/85 hover:bg-white'
                          }`}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-mono text-[12px] font-semibold text-[#5c5156]">
                              {bk.reference}
                            </span>
                            <span
                              className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${statusBadgeStyle(
                                bk.status,
                              )}`}
                            >
                              {getBookingStatusLabel(bk.status)}
                            </span>
                          </div>
                          <div className="mt-1.5 flex items-baseline justify-between gap-2">
                            <span className="text-[15.5px] font-semibold text-[#1d1a1c]">
                              {bk.stayName}
                            </span>
                            <span className="text-[14px] font-semibold tabular-nums">
                              {formatPrice(bk.totalEgp, currency)}
                            </span>
                          </div>
                          <div className="mt-1 text-[13px] text-[#5c5156]">
                            {bk.customerName} · {bk.customerPhone}
                          </div>
                          <div className="mt-0.5 text-[12px] text-[#8a7f83] tabular-nums">
                            {formatFullDate(bk.checkIn)} – {formatFullDate(bk.checkOut)} ({bk.nights}{' '}
                            nights · {bk.guests} guests)
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Right: Inspector & Status Editor */}
                  {activeBooking && (
                    <form
                      onSubmit={handleSaveBookingUpdate}
                      className="h-fit rounded-[18px] border border-[#1d1a1c]/10 bg-white p-5"
                    >
                      <div className="flex items-start justify-between gap-3 border-b border-[#1d1a1c]/10 pb-3.5">
                        <div>
                          <div className="font-mono text-[12px] text-[#8a7f83]">
                            {activeBooking.reference}
                          </div>
                          <h3 className="mt-0.5 font-display-serif text-[24px]">
                            {activeBooking.stayName}
                          </h3>
                        </div>
                        <span
                          className={`rounded-full border px-3 py-1 text-[11.5px] font-semibold ${statusBadgeStyle(
                            activeBooking.status,
                          )}`}
                        >
                          {getBookingStatusLabel(activeBooking.status)}
                        </span>
                      </div>

                      <div className="mt-4 space-y-2 rounded-[12px] bg-[#fdf0e7]/75 p-3.5 text-[13px]">
                        <div className="font-semibold text-[#1d1a1c]">
                          {activeBooking.customerName}
                        </div>
                        <div className="flex items-center gap-2 text-[#5c5156]">
                          <Mail className="h-3.5 w-3.5 shrink-0" />
                          <span>{activeBooking.customerEmail}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[#5c5156]">
                          <Phone className="h-3.5 w-3.5 shrink-0" />
                          <span>{activeBooking.customerPhone}</span>
                        </div>
                        {activeBooking.customerNotes && (
                          <div className="border-t border-[#1d1a1c]/10 pt-2 text-[#5c5156]">
                            <span className="font-medium text-[#1d1a1c]">Guest note: </span>
                            {activeBooking.customerNotes}
                          </div>
                        )}
                      </div>

                      <div className="mt-4 space-y-3.5">
                        <label className="block text-[12.5px] font-medium text-[#5c5156]">
                          Booking Status
                          <select
                            value={draftStatus}
                            onChange={(e) => setDraftStatus(e.target.value as BookingStatus)}
                            className="mt-1.5 w-full rounded-[10px] border border-[#1d1a1c]/15 bg-white px-3 py-2 text-[14px] text-[#1d1a1c]"
                          >
                            {ALL_STATUSES.map((s) => (
                              <option
                                key={s}
                                value={s}
                                disabled={!isValidSalesTransition(activeBooking.status, s)}
                              >
                                {getBookingStatusLabel(s)}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="block text-[12.5px] font-medium text-[#5c5156]">
                          Sales Notes (Visible on booking audit &amp; status updates)
                          <textarea
                            rows={2}
                            maxLength={1000}
                            value={draftSalesNotes}
                            onChange={(e) => setDraftSalesNotes(e.target.value)}
                            placeholder="Called guest to verify airport arrival time and availability..."
                            className="mt-1.5 w-full rounded-[10px] border border-[#1d1a1c]/15 bg-white px-3 py-2 text-[13.5px] text-[#1d1a1c]"
                          />
                        </label>

                        <label className="block text-[12.5px] font-medium text-[#5c5156]">
                          Confirmation Details (Shared with customer once Confirmed)
                          <textarea
                            rows={2}
                            maxLength={1000}
                            value={draftConfirmationDetails}
                            onChange={(e) => setDraftConfirmationDetails(e.target.value)}
                            placeholder="Check-in concierge contact, pier gate code, payment instructions..."
                            className="mt-1.5 w-full rounded-[10px] border border-[#1d1a1c]/15 bg-white px-3 py-2 text-[13.5px] text-[#1d1a1c]"
                          />
                        </label>
                      </div>

                      {bookingSaveMsg && (
                        <div className="mt-3 flex items-center gap-2 rounded-[10px] bg-[#eaf6ef] px-3 py-2 text-[12.5px] text-[#1f7a4c]">
                          <CheckCircle2 className="h-4 w-4 shrink-0" />
                          <span>{bookingSaveMsg}</span>
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={savingBooking}
                        className="mt-4 h-11 w-full rounded-full font-urbanist text-[14.5px] font-semibold text-white transition-all hover:brightness-95 disabled:opacity-60"
                        style={{ backgroundColor: '#f39419' }}
                      >
                        {savingBooking ? 'Saving Changes...' : 'Save Status & Notes'}
                      </button>
                    </form>
                  )}
                </div>
              )}
            </>
          ) : (
            /* Property Pricing & Availability Manager */
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {stays.map((stay) => {
                const draft = propertyDrafts[stay.id] || {
                  priceEgp: String(stay.priceEgp),
                  maxGuests: String(stay.maxGuests),
                  available: stay.available,
                };
                const isSaving = savingStayId === stay.id;
                const isSaved = savedStayId === stay.id;

                return (
                  <div
                    key={stay.id}
                    className="rounded-[16px] border border-[#1d1a1c]/10 bg-white p-4"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={stay.photo700}
                        alt={stay.name}
                        className="h-14 w-14 shrink-0 rounded-[10px] object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-[15.5px] font-semibold">{stay.name}</h3>
                        <p className="text-[12.5px] text-[#5c5156]">{stay.area}</p>
                      </div>
                      <label className="inline-flex cursor-pointer items-center gap-2 text-[12.5px] font-medium">
                        <input
                          type="checkbox"
                          checked={draft.available}
                          onChange={(e) =>
                            setPropertyDrafts((prev) => ({
                              ...prev,
                              [stay.id]: { ...draft, available: e.target.checked },
                            }))
                          }
                          className="h-4 w-4 accent-[#1d1a1c]"
                        />
                        <span>{draft.available ? 'Available' : 'Unavailable'}</span>
                      </label>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <label className="text-[12px] font-medium text-[#5c5156]">
                        Nightly Rate (EGP)
                        <input
                          type="number"
                          min={500}
                          max={500000}
                          value={draft.priceEgp}
                          onChange={(e) =>
                            setPropertyDrafts((prev) => ({
                              ...prev,
                              [stay.id]: { ...draft, priceEgp: e.target.value },
                            }))
                          }
                          className="mt-1 w-full rounded-[9px] border border-[#1d1a1c]/15 px-3 py-1.5 text-[14px] text-[#1d1a1c] tabular-nums"
                        />
                      </label>
                      <label className="text-[12px] font-medium text-[#5c5156]">
                        Max Guests
                        <input
                          type="number"
                          min={1}
                          max={20}
                          value={draft.maxGuests}
                          onChange={(e) =>
                            setPropertyDrafts((prev) => ({
                              ...prev,
                              [stay.id]: { ...draft, maxGuests: e.target.value },
                            }))
                          }
                          className="mt-1 w-full rounded-[9px] border border-[#1d1a1c]/15 px-3 py-1.5 text-[14px] text-[#1d1a1c] tabular-nums"
                        />
                      </label>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-2">
                      <span className="text-[11.5px] text-[#8a7f83]">
                        Category: {stay.category}
                      </span>
                      <button
                        type="button"
                        disabled={isSaving}
                        onClick={async () => {
                          setSavingStayId(stay.id);
                          setSavedStayId(null);
                          try {
                            await upsertPropertyOverride({
                              id: stay.id,
                              priceEgp: Number(draft.priceEgp) || stay.priceEgp,
                              maxGuests: Number(draft.maxGuests) || stay.maxGuests,
                              available: draft.available,
                            });
                            setSavedStayId(stay.id);
                          } finally {
                            setSavingStayId(null);
                          }
                        }}
                        className="inline-flex items-center gap-1.5 rounded-full bg-[#1d1a1c] px-4 py-1.5 text-[12.5px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                      >
                        {isSaved && <Check className="h-3.5 w-3.5 text-[#5be398]" />}
                        {isSaving ? 'Updating...' : isSaved ? 'Saved' : 'Update Stay'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
