import {
  CalendarCheck2,
  CheckCircle2,
  Heart,
  LogIn,
  LogOut,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  ShieldCheck,
  User as UserIcon,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { SALES_CONTACT_CONFIG } from '../config/contactConfig';
import { useAuth } from '../context/AuthContext';
import {
  HERO_SLIDES,
  INTERIOR_GALLERY_ITEMS,
  STAY_PROPERTIES,
  type StayProperty,
} from '../data/egyptData';
import { submitConciergeInquiry } from '../services/firestoreService';
import {
  canCustomerCancel,
  formatFullDate,
  formatPrice,
  getBookingStatusLabel,
  getNextLinearIndex,
  summarizeBookings,
  type BookingRecord,
  type BookingStatus,
  type CurrencyCode,
} from '../utils/bookingLogic';
import type { DrawerTab } from './Navbar';

interface GuestMenuDrawerProps {
  open: boolean;
  activeTab: DrawerTab;
  onChangeTab: (tab: DrawerTab) => void;
  onClose: () => void;
  stays: StayProperty[];
  favorites: string[];
  bookings: BookingRecord[];
  bookingsLoading: boolean;
  currency: CurrencyCode;
  onChangeCurrency: (c: CurrencyCode) => void;
  onSelectStay: (stay: StayProperty) => void;
  onCancelBooking: (bookingId: string) => Promise<void>;
  onNavigateSection: (sectionId: string) => void;
  onOpenHostModal: () => void;
  onOpenContactModal: () => void;
  onOpenAuthModal: () => void;
  onOpenSalesPortal: () => void;
}

function customerStatusColors(status: BookingStatus): string {
  switch (status) {
    case 'pending_confirmation':
      return 'bg-[#fff4e5] text-[#b45d00] border-[#f39419]/30';
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

export function GuestMenuDrawer({
  open,
  activeTab,
  onChangeTab,
  onClose,
  stays,
  favorites,
  bookings,
  bookingsLoading,
  currency,
  onChangeCurrency,
  onSelectStay,
  onCancelBooking,
  onNavigateSection,
  onOpenHostModal,
  onOpenContactModal,
  onOpenAuthModal,
  onOpenSalesPortal,
}: GuestMenuDrawerProps) {
  const {
    firebaseUser,
    profile,
    isAdmin,
    authActionPending,
    updateProfileDetails,
    sendResetEmail,
    resendVerificationEmail,
    refreshVerificationStatus,
    logout,
  } = useAuth();

  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  // Account profile editor
  const [profileName, setProfileName] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profileCurrency, setProfileCurrency] = useState<CurrencyCode>(currency);
  const [profileMsg, setProfileMsg] = useState<string | null>(null);

  useEffect(() => {
    setProfileName(profile?.displayName || firebaseUser?.displayName || '');
    setProfilePhone(profile?.phone || '');
    setProfileCurrency(profile?.preferredCurrency || currency);
  }, [profile, firebaseUser, currency]);

  useEffect(() => {
    if (!open) return;
    setProfileMsg(null);
    window.requestAnimationFrame(() => {
      if (activeTab === 'bookings') {
        tabRefs.current[1]?.focus();
      } else if (activeTab === 'account') {
        tabRefs.current[2]?.focus();
      } else {
        closeButtonRef.current?.focus();
      }
    });

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, activeTab, onClose]);

  if (!open) return null;

  const favoriteStays = stays.filter((s) => favorites.includes(s.id));
  const summary = summarizeBookings(bookings);

  const handleTabKeyDown = (
    e: React.KeyboardEvent<HTMLButtonElement>,
    idx: number,
  ) => {
    const next = getNextLinearIndex(idx, e.key, 3, true);
    if (
      next !== null &&
      (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'Home' || e.key === 'End')
    ) {
      e.preventDefault();
      const tabs: DrawerTab[] = ['overview', 'bookings', 'account'];
      onChangeTab(tabs[next]);
      tabRefs.current[next]?.focus();
    }
  };

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMsg(null);
    if (profileName.trim().length < 2) {
      setProfileMsg('Display name must be at least 2 characters.');
      return;
    }
    const ok = await updateProfileDetails({
      displayName: profileName,
      phone: profilePhone,
      preferredCurrency: profileCurrency,
    });
    if (ok) {
      onChangeCurrency(profileCurrency);
      setProfileMsg('Profile saved to your account.');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Guest and Account Menu"
      className="fixed inset-0 z-[70] flex justify-end bg-[#1d1a1c]/45"
      onClick={onClose}
    >
      <div
        className="flex h-full w-full max-w-[430px] flex-col justify-between overflow-y-auto bg-[#fdf0e7] p-6 text-[#1d1a1c] shadow-2xl sm:p-7"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <div className="flex items-center justify-between border-b border-[#1d1a1c]/10 pb-5">
            <div>
              <span className="font-urbanist text-[22px] font-light">Kemet Travel</span>
              <div className="text-[11.5px] text-[#8a7f83]">Egypt Concierge &amp; Stays</div>
            </div>
            <button
              ref={closeButtonRef}
              type="button"
              aria-label="Close guest menu"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[#1d1a1c]/15 bg-white hover:bg-[#1d1a1c] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d1a1c]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Drawer View Switcher */}
          <div
            role="tablist"
            aria-label="Guest menu views"
            className="mt-5 grid grid-cols-3 gap-1 rounded-[12px] bg-[#1d1a1c]/8 p-1"
          >
            <button
              ref={(el) => {
                tabRefs.current[0] = el;
              }}
              id="drawer-tab-overview"
              type="button"
              role="tab"
              aria-selected={activeTab === 'overview'}
              aria-controls="drawer-panel-overview"
              onClick={() => onChangeTab('overview')}
              onKeyDown={(e) => handleTabKeyDown(e, 0)}
              className={`rounded-[9px] px-2 py-2 text-[12.5px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#1d1a1c] ${
                activeTab === 'overview'
                  ? 'bg-white text-[#1d1a1c] shadow-sm'
                  : 'text-[#5c5156] hover:text-[#1d1a1c]'
              }`}
            >
              Explore &amp; Saved
            </button>
            <button
              ref={(el) => {
                tabRefs.current[1] = el;
              }}
              id="drawer-tab-bookings"
              type="button"
              role="tab"
              aria-selected={activeTab === 'bookings'}
              aria-controls="drawer-panel-bookings"
              onClick={() => onChangeTab('bookings')}
              onKeyDown={(e) => handleTabKeyDown(e, 1)}
              className={`rounded-[9px] px-2 py-2 text-[12.5px] font-medium tabular-nums transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#1d1a1c] ${
                activeTab === 'bookings'
                  ? 'bg-white text-[#1d1a1c] shadow-sm'
                  : 'text-[#5c5156] hover:text-[#1d1a1c]'
              }`}
            >
              Bookings ({summary.activeCount})
            </button>
            <button
              ref={(el) => {
                tabRefs.current[2] = el;
              }}
              id="drawer-tab-account"
              type="button"
              role="tab"
              aria-selected={activeTab === 'account'}
              aria-controls="drawer-panel-account"
              onClick={() => onChangeTab('account')}
              onKeyDown={(e) => handleTabKeyDown(e, 2)}
              className={`rounded-[9px] px-2 py-2 text-[12.5px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#1d1a1c] ${
                activeTab === 'account'
                  ? 'bg-white text-[#1d1a1c] shadow-sm'
                  : 'text-[#5c5156] hover:text-[#1d1a1c]'
              }`}
            >
              Account
            </button>
          </div>

          {activeTab === 'overview' && (
            <div
              id="drawer-panel-overview"
              role="tabpanel"
              aria-labelledby="drawer-tab-overview"
            >
              <div className="mt-5 space-y-1 border-b border-[#1d1a1c]/10 pb-5">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onNavigateSection('stays-section');
                  }}
                  className="block w-full rounded-[10px] px-3 py-2.5 text-left text-[15px] font-medium hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#1d1a1c]"
                >
                  Egypt Stays &amp; Villas
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onNavigateSection('where-to-go-section');
                  }}
                  className="block w-full rounded-[10px] px-3 py-2.5 text-left text-[15px] font-medium hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#1d1a1c]"
                >
                  Where to go in Egypt
                </button>
                <button
                  type="button"
                  onClick={() => onChangeTab('bookings')}
                  className="flex w-full items-center justify-between rounded-[10px] px-3 py-2.5 text-left text-[15px] font-medium hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#1d1a1c]"
                >
                  <span>My Bookings</span>
                  <span className="text-[12.5px] text-[#5c5156] tabular-nums">
                    {summary.activeCount} active
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenHostModal();
                  }}
                  className="block w-full rounded-[10px] px-3 py-2.5 text-left text-[15px] font-medium hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#1d1a1c]"
                >
                  Become a host
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenContactModal();
                  }}
                  className="block w-full rounded-[10px] px-3 py-2.5 text-left text-[15px] font-medium hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#1d1a1c]"
                >
                  Contact Us
                </button>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenSalesPortal();
                    }}
                    className="flex w-full items-center justify-between rounded-[10px] border border-[#f39419]/30 bg-white px-3 py-2.5 text-left text-[14.5px] font-semibold text-[#1d1a1c] hover:bg-[#f7d9c6]"
                  >
                    <span>Sales Operations Desk</span>
                    <ShieldCheck className="h-4 w-4 text-[#f39419]" />
                  </button>
                )}
              </div>

              {/* Saved Favorites */}
              <div className="mt-6">
                <h3 className="flex items-center gap-2 font-display-serif text-[20px]">
                  <Heart className="h-4 w-4 fill-[#ff4d5e] text-[#ff4d5e]" />
                  <span>Saved Favorites ({favoriteStays.length})</span>
                </h3>
                {favoriteStays.length === 0 ? (
                  <p className="mt-2 text-[13.5px] text-[#5c5156]">
                    Tap the heart on any Egyptian residence to save it here.
                  </p>
                ) : (
                  <div className="mt-3 space-y-2.5">
                    {favoriteStays.map((stay) => (
                      <button
                        key={stay.id}
                        type="button"
                        onClick={() => {
                          onClose();
                          onSelectStay(stay);
                        }}
                        className="flex w-full items-center gap-3 rounded-[14px] bg-white p-2.5 text-left transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d1a1c]"
                      >
                        <img
                          src={stay.photo700}
                          alt={stay.name}
                          className="h-12 w-12 rounded-[10px] object-cover"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[14px] font-semibold">{stay.name}</div>
                          <div className="flex items-center gap-1 text-[12px] text-[#5c5156]">
                            <MapPin className="h-3 w-3" />
                            <span className="truncate">{stay.area}</span>
                          </div>
                        </div>
                        <span className="text-[12.5px] font-semibold tabular-nums">
                          {formatPrice(stay.priceEgp, currency)}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'bookings' && (
            <div
              id="drawer-panel-bookings"
              role="tabpanel"
              aria-labelledby="drawer-tab-bookings"
              className="mt-6"
            >
              {!firebaseUser ? (
                <div className="rounded-[16px] border border-[#1d1a1c]/10 bg-white p-6 text-center">
                  <LogIn className="mx-auto h-8 w-8 text-[#f39419]" strokeWidth={1.6} />
                  <h3 className="mt-3 font-display-serif text-[22px]">
                    Sign In to View Your Bookings
                  </h3>
                  <p className="mt-2 text-[13.5px] leading-relaxed text-[#5c5156]">
                    Your booking requests, reference numbers, and live sales confirmation updates
                    are securely tied to your verified customer account.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenAuthModal();
                    }}
                    className="mt-4 rounded-full bg-[#1d1a1c] px-6 py-2.5 text-[13.5px] font-semibold text-white"
                  >
                    Sign In or Register
                  </button>
                </div>
              ) : (
                <>
                  <div
                    data-testid="bookings-summary"
                    className="rounded-[16px] border border-[#1d1a1c]/10 bg-white p-4"
                  >
                    <div className="flex items-baseline justify-between">
                      <h3 className="font-display-serif text-[20px] text-[#1d1a1c]">
                        My Bookings
                      </h3>
                      <span className="text-[12px] text-[#8a7f83] tabular-nums">
                        {summary.pendingCount} pending · {summary.confirmedCount} confirmed
                      </span>
                    </div>

                    <div className="mt-3 grid grid-cols-3 gap-2 border-t border-[#1d1a1c]/8 pt-3">
                      <div>
                        <div className="text-[11px] font-medium text-[#8a7f83]">Active</div>
                        <div className="mt-0.5 text-[18px] font-semibold text-[#1d1a1c] tabular-nums">
                          {summary.activeCount}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] font-medium text-[#8a7f83]">Nights</div>
                        <div className="mt-0.5 text-[18px] font-semibold text-[#1d1a1c] tabular-nums">
                          {summary.totalNights}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] font-medium text-[#8a7f83]">Value</div>
                        <div className="mt-0.5 text-[15px] font-semibold text-[#1d1a1c] tabular-nums">
                          {formatPrice(summary.totalActiveEgp, currency)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {bookingsLoading ? (
                    <div className="mt-5 rounded-[16px] bg-white p-6 text-center text-[13.5px] text-[#5c5156]">
                      Syncing your booking records...
                    </div>
                  ) : bookings.length === 0 ? (
                    <div className="mt-5 rounded-[16px] border border-[#1d1a1c]/10 bg-white/80 p-6 text-center">
                      <CalendarCheck2
                        className="mx-auto h-8 w-8 text-[#8a7f83]"
                        strokeWidth={1.5}
                      />
                      <p className="mt-3 font-display-serif text-[20px] text-[#1d1a1c]">
                        No booking requests yet
                      </p>
                      <p className="mt-1.5 text-[13.5px] leading-relaxed text-[#5c5156]">
                        Select any Egyptian residence to submit a request for sales confirmation.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onNavigateSection('stays-section');
                        }}
                        className="mt-4 rounded-[20px] bg-[#1d1a1c] px-5 py-2 text-[13px] font-medium text-white"
                      >
                        Explore Egypt Stays
                      </button>
                    </div>
                  ) : (
                    <div className="mt-4 space-y-3" data-testid="my-bookings-list">
                      {bookings.map((bk) => {
                        const matchedStay = stays.find((s) => s.id === bk.stayId);
                        const allowCancel = canCustomerCancel(bk.status);

                        return (
                          <article
                            key={bk.id}
                            data-testid={`booking-item-${bk.stayId}`}
                            className="rounded-[16px] border border-[#1d1a1c]/10 bg-white p-3.5"
                          >
                            <div className="mb-2 flex items-center justify-between gap-2">
                              <span className="font-mono text-[11.5px] font-semibold text-[#5c5156]">
                                {bk.reference}
                              </span>
                              <span
                                className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${customerStatusColors(
                                  bk.status,
                                )}`}
                              >
                                {getBookingStatusLabel(bk.status)}
                              </span>
                            </div>

                            <div className="flex items-start gap-3">
                              <img
                                src={bk.photoUrl}
                                alt={bk.stayName}
                                className={`h-14 w-14 shrink-0 rounded-[10px] object-cover ${
                                  bk.status === 'cancelled' || bk.status === 'rejected'
                                    ? 'opacity-55 grayscale'
                                    : ''
                                }`}
                              />
                              <div className="min-w-0 flex-1">
                                {matchedStay ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onClose();
                                      onSelectStay(matchedStay);
                                    }}
                                    className="truncate text-left text-[14.5px] font-semibold text-[#1d1a1c] underline-offset-2 hover:underline"
                                  >
                                    {bk.stayName}
                                  </button>
                                ) : (
                                  <div className="truncate text-[14.5px] font-semibold text-[#1d1a1c]">
                                    {bk.stayName}
                                  </div>
                                )}
                                <div className="mt-0.5 text-[12px] text-[#5c5156] tabular-nums">
                                  {formatFullDate(bk.checkIn)} – {formatFullDate(bk.checkOut)}
                                </div>
                                <div className="mt-0.5 text-[12px] text-[#8a7f83] tabular-nums">
                                  {bk.nights} {bk.nights === 1 ? 'night' : 'nights'} · {bk.guests}{' '}
                                  guests ·{' '}
                                  <span className="font-semibold text-[#1d1a1c]">
                                    {formatPrice(bk.totalEgp, currency)}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {(bk.salesNotes || bk.confirmationDetails) && (
                              <div className="mt-2.5 rounded-[10px] bg-[#fdf0e7] p-2.5 text-[12px] text-[#5c5156] space-y-1">
                                {bk.salesNotes && (
                                  <div>
                                    <strong className="text-[#1d1a1c]">Sales update: </strong>
                                    {bk.salesNotes}
                                  </div>
                                )}
                                {bk.confirmationDetails && (
                                  <div>
                                    <strong className="text-[#1f7a4c]">Confirmation details: </strong>
                                    {bk.confirmationDetails}
                                  </div>
                                )}
                              </div>
                            )}

                            {allowCancel && (
                              <div className="mt-2.5 flex items-center justify-between border-t border-[#1d1a1c]/8 pt-2">
                                <span className="text-[11.5px] text-[#8a7f83]">
                                  Pending sales team contact
                                </span>
                                <button
                                  type="button"
                                  disabled={cancellingId === bk.id}
                                  onClick={async () => {
                                    setCancellingId(bk.id);
                                    try {
                                      await onCancelBooking(bk.id);
                                    } finally {
                                      setCancellingId(null);
                                    }
                                  }}
                                  className="rounded-[8px] border border-[#b3323e]/30 px-2.5 py-1 text-[12px] font-medium text-[#b3323e] transition-colors hover:bg-[#b3323e] hover:text-white disabled:opacity-50"
                                >
                                  {cancellingId === bk.id ? 'Cancelling...' : 'Cancel Request'}
                                </button>
                              </div>
                            )}
                          </article>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {activeTab === 'account' && (
            <div
              id="drawer-panel-account"
              role="tabpanel"
              aria-labelledby="drawer-tab-account"
              className="mt-6"
            >
              {!firebaseUser ? (
                <div className="rounded-[16px] border border-[#1d1a1c]/10 bg-white p-6 text-center">
                  <UserIcon className="mx-auto h-9 w-9 text-[#f39419]" strokeWidth={1.6} />
                  <h3 className="mt-3 font-display-serif text-[22px]">
                    Customer Account
                  </h3>
                  <p className="mt-2 text-[13.5px] leading-relaxed text-[#5c5156]">
                    Sign in to manage your traveler profile, preferred currency, saved Egyptian
                    stays, and booking confirmations.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenAuthModal();
                    }}
                    className="mt-4 w-full rounded-full bg-[#1d1a1c] px-5 py-2.5 text-[14px] font-semibold text-white"
                  >
                    Sign In / Create Account
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-[16px] bg-white p-4">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-[16px] font-semibold">
                          {profile?.displayName || firebaseUser.displayName || 'Traveler'}
                        </div>
                        <div className="truncate text-[12.5px] text-[#5c5156]">
                          {firebaseUser.email}
                        </div>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                          firebaseUser.emailVerified
                            ? 'bg-[#eaf6ef] text-[#1f7a4c]'
                            : 'bg-[#fff4e5] text-[#b45d00]'
                        }`}
                      >
                        {firebaseUser.emailVerified ? 'Verified' : 'Unverified'}
                      </span>
                    </div>

                    {!firebaseUser.emailVerified && (
                      <div className="mt-3 flex flex-wrap gap-2 border-t border-[#1d1a1c]/10 pt-3">
                        <button
                          type="button"
                          onClick={async () => {
                            await refreshVerificationStatus();
                          }}
                          className="rounded-full bg-[#1d1a1c] px-3 py-1 text-[12px] font-medium text-white"
                        >
                          Check Verification
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            const ok = await resendVerificationEmail();
                            if (ok) setProfileMsg('Verification link resent to your email.');
                          }}
                          className="rounded-full border border-[#1d1a1c]/20 px-3 py-1 text-[12px] font-medium"
                        >
                          Resend Email
                        </button>
                      </div>
                    )}
                  </div>

                  <form
                    onSubmit={handleProfileSave}
                    className="space-y-3 rounded-[16px] bg-white p-4"
                  >
                    <h3 className="font-display-serif text-[19px]">Profile Details</h3>
                    <label className="block text-[12px] font-medium text-[#5c5156]">
                      Full Name
                      <input
                        type="text"
                        required
                        value={profileName}
                        onChange={(e) => setProfileName(e.target.value)}
                        className="mt-1 w-full rounded-[10px] border border-[#1d1a1c]/15 px-3 py-2 text-[13.5px] text-[#1d1a1c]"
                      />
                    </label>
                    <label className="block text-[12px] font-medium text-[#5c5156]">
                      Contact Phone / WhatsApp
                      <input
                        type="tel"
                        value={profilePhone}
                        onChange={(e) => setProfilePhone(e.target.value)}
                        placeholder="+20 100 ..."
                        className="mt-1 w-full rounded-[10px] border border-[#1d1a1c]/15 px-3 py-2 text-[13.5px] text-[#1d1a1c]"
                      />
                    </label>
                    <label className="block text-[12px] font-medium text-[#5c5156]">
                      Preferred Currency
                      <select
                        value={profileCurrency}
                        onChange={(e) => setProfileCurrency(e.target.value as CurrencyCode)}
                        className="mt-1 w-full rounded-[10px] border border-[#1d1a1c]/15 bg-white px-3 py-2 text-[13.5px] text-[#1d1a1c]"
                      >
                        <option value="EGP">Egypt (EGP)</option>
                        <option value="USD">International (USD)</option>
                      </select>
                    </label>

                    {profileMsg && (
                      <div className="rounded-[10px] bg-[#eaf6ef] px-3 py-2 text-[12.5px] text-[#1f7a4c]">
                        {profileMsg}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={authActionPending || !firebaseUser.emailVerified}
                      className="h-10 w-full rounded-full bg-[#1d1a1c] text-[13.5px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                    >
                      Save Profile
                    </button>
                  </form>

                  <div className="flex flex-col gap-2">
                    {firebaseUser.email && (
                      <button
                        type="button"
                        onClick={async () => {
                          if (!firebaseUser.email) return;
                          const sent = await sendResetEmail(firebaseUser.email);
                          if (sent) {
                            setProfileMsg(`Password reset email sent to ${firebaseUser.email}.`);
                          }
                        }}
                        className="rounded-full border border-[#1d1a1c]/20 bg-white py-2 text-[13px] font-medium text-[#1d1a1c] hover:bg-[#f7d9c6]/60"
                      >
                        Send Password Reset Email
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={async () => {
                        await logout();
                        onClose();
                      }}
                      className="inline-flex items-center justify-center gap-2 rounded-full border border-[#b3323e]/30 bg-white py-2 text-[13px] font-medium text-[#b3323e] hover:bg-[#b3323e] hover:text-white"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mt-8 border-t border-[#1d1a1c]/10 pt-4 text-[12px] text-[#8a7f83]">
          Kemet Travel · {SALES_CONTACT_CONFIG.officeLocation}
        </div>
      </div>
    </div>
  );
}

interface HostAndContactModalProps {
  mode: 'host' | 'contact' | null;
  onClose: () => void;
  onRequireAuth: (message: string) => void;
}

export function HostAndContactModal({
  mode,
  onClose,
  onRequireAuth,
}: HostAndContactModalProps) {
  const { firebaseUser, profile, isOnline } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [detail, setDetail] = useState('');
  const [district, setDistrict] = useState('Zamalek, Cairo');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submittedRef, setSubmittedRef] = useState<string | null>(null);

  useEffect(() => {
    if (!mode) return;
    setName(profile?.displayName || firebaseUser?.displayName || '');
    setEmail(profile?.email || firebaseUser?.email || '');
    setPhone(profile?.phone || '');
    setErrorMsg(null);
    setSubmittedRef(null);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mode, profile, firebaseUser, onClose]);

  if (!mode) return null;

  const isHost = mode === 'host';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setErrorMsg(null);

    if (name.trim().length < 2) {
      setErrorMsg('Please enter your full name.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }
    if (detail.trim().length < 5) {
      setErrorMsg('Please enter at least a few words describing your inquiry.');
      return;
    }
    if (!isOnline) {
      setErrorMsg('Network connection is offline. Please reconnect to submit.');
      return;
    }
    if (!firebaseUser || !firebaseUser.emailVerified) {
      onRequireAuth('Sign in with a verified account to submit a host partnership or concierge inquiry.');
      return;
    }

    setSubmitting(true);
    try {
      const id = await submitConciergeInquiry({
        type: mode,
        name,
        email,
        phone,
        district: isHost ? district : 'Egypt Concierge',
        message: detail,
      });
      setSubmittedRef(id);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to send inquiry right now.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={isHost ? 'Become a host in Egypt' : 'Contact Kemet Travel Egypt concierge'}
      className="fixed inset-0 z-[75] flex items-center justify-center bg-[#1d1a1c]/50 p-4"
      onClick={onClose}
    >
      <div
        className="animate-popover-drop max-h-[92vh] w-full max-w-[490px] overflow-y-auto rounded-[22px] bg-[#fdf0e7] p-6 text-[#1d1a1c] shadow-2xl sm:p-7"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[12px] font-medium uppercase tracking-[0.1em] text-[#8a7f83]">
              {isHost ? 'Host Partnership · Egypt' : 'Egypt Sales & Concierge'}
            </p>
            <h2 className="mt-1 font-display-serif text-[28px] leading-tight sm:text-[30px]">
              {isHost ? 'List Your Egyptian Property' : 'Speak With Our Team'}
            </h2>
          </div>
          <button
            type="button"
            aria-label="Close modal"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#1d1a1c]/15 bg-white hover:bg-[#1d1a1c] hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Direct configured channels block */}
        {!isHost && (
          <div className="mt-4 rounded-[14px] bg-white p-3.5 text-[12.5px] text-[#5c5156]">
            <div className="font-semibold text-[#1d1a1c]">
              {SALES_CONTACT_CONFIG.officeLocation}
            </div>
            {SALES_CONTACT_CONFIG.hasDirectChannels ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {SALES_CONTACT_CONFIG.phone && (
                  <a
                    href={`tel:${SALES_CONTACT_CONFIG.phone}`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[#1d1a1c]/15 px-3 py-1 hover:bg-[#fdf0e7]"
                  >
                    <Phone className="h-3.5 w-3.5" />
                    {SALES_CONTACT_CONFIG.phone}
                  </a>
                )}
                {SALES_CONTACT_CONFIG.whatsappDigits && (
                  <a
                    href={`https://wa.me/${SALES_CONTACT_CONFIG.whatsappDigits}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full border border-[#1d1a1c]/15 px-3 py-1 hover:bg-[#fdf0e7]"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    WhatsApp
                  </a>
                )}
                {SALES_CONTACT_CONFIG.email && (
                  <a
                    href={`mailto:${SALES_CONTACT_CONFIG.email}`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[#1d1a1c]/15 px-3 py-1 hover:bg-[#fdf0e7]"
                  >
                    <Mail className="h-3.5 w-3.5" />
                    {SALES_CONTACT_CONFIG.email}
                  </a>
                )}
              </div>
            ) : (
              <p className="mt-1">
                Submit the inquiry form below and our reservations team will reply within{' '}
                {SALES_CONTACT_CONFIG.responseSlaHours} hours. (Direct phone/WhatsApp/email
                channels are centrally configurable in <code>contactConfig.ts</code>.)
              </p>
            )}
          </div>
        )}

        {submittedRef ? (
          <div className="mt-5 rounded-[16px] bg-white p-6 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-[#249c60]" strokeWidth={1.6} />
            <h3 className="mt-3 font-display-serif text-[24px]">
              {isHost ? 'Property Application Received' : 'Concierge Inquiry Recorded'}
            </h3>
            <p className="mt-2 font-mono text-[12px] text-[#8a7f83]">Ref: {submittedRef}</p>
            <p className="mt-2 text-[14px] text-[#5c5156]">
              Thank you, {name}. Our Egyptian travel team will follow up at {email} within{' '}
              {SALES_CONTACT_CONFIG.responseSlaHours} hours.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-5 rounded-full bg-[#1d1a1c] px-6 py-2.5 text-[13.5px] font-medium text-white"
            >
              Return to Kemet Travel
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-5 space-y-3.5" noValidate>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block text-[12.5px] font-medium text-[#5c5156]">
                Full Name
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nadia Mansour"
                  className="mt-1.5 w-full rounded-[12px] border border-[#1d1a1c]/12 bg-white px-3.5 py-2.5 text-[14px] text-[#1d1a1c]"
                />
              </label>

              <label className="block text-[12.5px] font-medium text-[#5c5156]">
                Phone / WhatsApp
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+20 100 ..."
                  className="mt-1.5 w-full rounded-[12px] border border-[#1d1a1c]/12 bg-white px-3.5 py-2.5 text-[14px] text-[#1d1a1c]"
                />
              </label>
            </div>

            <label className="block text-[12.5px] font-medium text-[#5c5156]">
              Email Address
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@domain.com"
                className="mt-1.5 w-full rounded-[12px] border border-[#1d1a1c]/12 bg-white px-3.5 py-2.5 text-[14px] text-[#1d1a1c]"
              />
            </label>

            {isHost && (
              <label className="block text-[12.5px] font-medium text-[#5c5156]">
                Governorate / Destination
                <select
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="mt-1.5 w-full rounded-[12px] border border-[#1d1a1c]/12 bg-white px-3.5 py-2.5 text-[14px] text-[#1d1a1c]"
                >
                  <option>Zamalek, Cairo</option>
                  <option>Giza Plateau</option>
                  <option>Luxor East or West Bank</option>
                  <option>Aswan &amp; Nubian Islands</option>
                  <option>Siwa Oasis</option>
                  <option>El Gouna, Red Sea</option>
                  <option>Dahab, South Sinai</option>
                </select>
              </label>
            )}

            <label className="block text-[12.5px] font-medium text-[#5c5156]">
              {isHost ? 'Property Highlights' : 'How can we tailor your Egypt stay?'}
              <textarea
                required
                rows={3}
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
                placeholder={
                  isHost
                    ? 'Nile-view villa, suites, nightly rate expectations...'
                    : 'Preferred Egypt cities, travel dates, transfers, or accessibility needs...'
                }
                className="mt-1.5 w-full rounded-[12px] border border-[#1d1a1c]/12 bg-white px-3.5 py-2.5 text-[14px] text-[#1d1a1c]"
              />
            </label>

            {errorMsg && (
              <div className="rounded-[10px] bg-[#fdecef] px-3 py-2 text-[12.5px] text-[#b3323e]">
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="h-12 w-full rounded-full font-urbanist text-[15px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
              style={{ backgroundColor: '#f39419' }}
            >
              {submitting
                ? 'Sending...'
                : isHost
                  ? 'Submit Property Inquiry'
                  : 'Send Inquiry'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export function SourcesAndAttributionModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Image sources, licenses, and Egypt pricing methodology"
      className="fixed inset-0 z-[80] flex items-center justify-center bg-[#1d1a1c]/55 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[88vh] w-full max-w-[680px] overflow-y-auto rounded-[22px] bg-[#fdf0e7] p-6 text-[#1d1a1c] shadow-2xl sm:p-7"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[#1d1a1c]/10 pb-4">
          <div>
            <p className="text-[11.5px] font-semibold uppercase tracking-[0.1em] text-[#8a7f83]">
              Transparency &amp; Attribution
            </p>
            <h2 className="mt-1 font-display-serif text-[26px]">
              Egyptian Photography &amp; Market Pricing
            </h2>
          </div>
          <button
            type="button"
            aria-label="Close attribution modal"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[#1d1a1c]/15 bg-white hover:bg-[#1d1a1c] hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 space-y-4 text-[13px] text-[#5c5156]">
          <div className="rounded-[14px] bg-white p-4">
            <h3 className="font-semibold text-[#1d1a1c]">EGP Pricing Basis (November 2026)</h3>
            <p className="mt-1 leading-relaxed">
              Rates are displayed in Egyptian Pounds (EGP) by default with indicative USD toggle
              (1 USD ≈ 49.5 EGP). Quoted rates are provisional Egyptian hospitality benchmarks by
              region and property tier—final confirmed rates are locked only after sales team
              availability verification.
            </p>
          </div>

          <div className="rounded-[14px] bg-white p-4">
            <h3 className="font-semibold text-[#1d1a1c]">
              Verified Wikimedia Commons Photography ({HERO_SLIDES.length + STAY_PROPERTIES.length + INTERIOR_GALLERY_ITEMS.length} sources)
            </h3>
            <ul className="mt-2 space-y-2">
              {STAY_PROPERTIES.map((s) => (
                <li key={s.id} className="flex flex-wrap justify-between gap-1 border-b border-[#1d1a1c]/6 pb-1.5">
                  <span>
                    <strong className="text-[#1d1a1c]">{s.name}</strong> — {s.imageAttribution.author}{' '}
                    ({s.imageAttribution.license})
                  </span>
                  <a
                    href={s.imageAttribution.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-[#1d1a1c]"
                  >
                    Source
                  </a>
                </li>
              ))}
              {INTERIOR_GALLERY_ITEMS.map((item, idx) => (
                <li key={idx} className="flex flex-wrap justify-between gap-1 border-b border-[#1d1a1c]/6 pb-1.5">
                  <span>
                    <strong className="text-[#1d1a1c]">{item.attribution.subject}</strong> —{' '}
                    {item.attribution.author} ({item.attribution.license})
                  </span>
                  <a
                    href={item.attribution.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-[#1d1a1c]"
                  >
                    Source
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
