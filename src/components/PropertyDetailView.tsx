import {
  Award,
  BellRing,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Compass,
  Heart,
  Mail,
  MessageCircle,
  Minus,
  Phone,
  Plus,
  Sailboat,
  Sparkles,
  Star,
  ThermometerSnowflake,
  UtensilsCrossed,
  Waves,
  Wifi,
  X,
} from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  buildMailtoBookingUrl,
  buildWhatsappBookingUrl,
  SALES_CONTACT_CONFIG,
} from '../config/contactConfig';
import { useAuth } from '../context/AuthContext';
import {
  INTERIOR_GALLERY_ITEMS,
  INTERIOR_THUMBNAILS,
  type AmenityIconKey,
  type StayProperty,
} from '../data/egyptData';
import {
  submitBookingRequest,
  submitStayReview,
  subscribeToStayReviews,
} from '../services/firestoreService';
import {
  calculateNights,
  computePriceBreakdown,
  formatFullDate,
  formatPrice,
  getBookingStatusLabel,
  getSimilarStays,
  MANDATORY_BOOKING_PENDING_MESSAGE,
  validateCustomerBookingContact,
  type BookingRecord,
  type CurrencyCode,
  type DateRange,
  type GuestCounts,
  type StayReviewRecord,
} from '../utils/bookingLogic';
import { StayCard } from './StayCard';

export type ConfirmedBooking = BookingRecord;

interface PropertyDetailViewProps {
  stay: StayProperty;
  allStays: StayProperty[];
  originRect: DOMRect | null;
  currency: CurrencyCode;
  dateRange: DateRange;
  onChangeDateRange: (next: DateRange) => void;
  guests: GuestCounts;
  onChangeGuests: (next: GuestCounts) => void;
  favorites: string[];
  onToggleFavorite: (stayId: string) => void;
  existingBooking: BookingRecord | null;
  onBookingCreated: (booking: BookingRecord) => void;
  onOpenMyBookings: () => void;
  onRequireAuth: (message: string) => void;
  onSelectSimilarStay: (stay: StayProperty, rect: DOMRect) => void;
  onCloseHome: () => void;
}

const DEFAULT_CHECKIN = new Date(2026, 11, 22);
const DEFAULT_CHECKOUT = new Date(2026, 11, 25);

function getAmenityIcon(key: AmenityIconKey) {
  switch (key) {
    case 'wifi':
      return Wifi;
    case 'concierge':
      return BellRing;
    case 'boat':
      return Sailboat;
    case 'award':
      return Award;
    case 'pool':
      return Waves;
    case 'breakfast':
      return UtensilsCrossed;
    case 'ac':
      return ThermometerSnowflake;
    case 'desert':
      return Compass;
    case 'reef':
      return Sparkles;
  }
}

export function PropertyDetailView({
  stay,
  allStays,
  originRect,
  currency,
  dateRange,
  onChangeDateRange,
  guests,
  onChangeGuests,
  favorites,
  onToggleFavorite,
  existingBooking,
  onBookingCreated,
  onOpenMyBookings,
  onRequireAuth,
  onSelectSimilarStay,
  onCloseHome,
}: PropertyDetailViewProps) {
  const { firebaseUser, profile, isOnline } = useAuth();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const targetPhotoRef = useRef<HTMLDivElement>(null);
  const [pageVisible, setPageVisible] = useState(false);
  const [closing, setClosing] = useState(false);
  const [flightDone, setFlightDone] = useState(!originRect);
  const [flightStyle, setFlightStyle] = useState<React.CSSProperties | null>(null);
  const [heartPop, setHeartPop] = useState(false);
  const [heroImgFailed, setHeroImgFailed] = useState(false);

  // Interactive gallery & date states
  const [activePhotoIndex, setActivePhotoIndex] = useState<number | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [editingDates, setEditingDates] = useState(false);

  // Two-step booking request state
  const [bookingStep, setBookingStep] = useState<'details' | 'contact' | 'submitted'>('details');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [submittingBooking, setSubmittingBooking] = useState(false);
  const [submittedRecord, setSubmittedRecord] = useState<BookingRecord | null>(null);

  // Reviews state
  const [reviews, setReviews] = useState<StayReviewRecord[]>([]);
  const [ratingOpen, setRatingOpen] = useState(false);
  const [userStars, setUserStars] = useState(5);
  const [userNote, setUserNote] = useState('');
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [submittedRating, setSubmittedRating] = useState(false);

  // Prefill contact inputs from authenticated profile
  useEffect(() => {
    setCustomerName((prev) => prev || profile?.displayName || firebaseUser?.displayName || '');
    setCustomerEmail((prev) => prev || profile?.email || firebaseUser?.email || '');
    setCustomerPhone((prev) => prev || profile?.phone || '');
  }, [profile, firebaseUser]);

  // Subscribe to live Firestore reviews for this stay
  useEffect(() => {
    const unsub = subscribeToStayReviews(stay.id, setReviews);
    return () => unsub();
  }, [stay.id]);

  const effectiveCheckIn = dateRange.checkIn || DEFAULT_CHECKIN;
  const effectiveCheckOut = dateRange.checkOut || DEFAULT_CHECKOUT;
  const rawNights = calculateNights(effectiveCheckIn, effectiveCheckOut);
  const nights = Math.max(stay.minNights, rawNights);
  const totalGuests = Math.min(stay.maxGuests, Math.max(1, guests.adults + guests.children));
  const priceBreakdown = computePriceBreakdown(stay.priceEgp, nights);
  const isFav = favorites.includes(stay.id);
  const similarStays = getSimilarStays(allStays, stay.id, 4);

  const galleryPhotos = [
    { url: stay.photo1400, caption: stay.imageAlt, attribution: stay.imageAttribution },
    ...INTERIOR_GALLERY_ITEMS,
  ];
  const currentMainPhoto =
    activePhotoIndex === null ? stay.photo1400 : galleryPhotos[activePhotoIndex].url;

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
    setActivePhotoIndex(null);
    setHeroImgFailed(false);
    setSubmittedRating(false);
    setRatingOpen(false);
    setReviewError(null);
    setBookingError(null);
    setSubmittedRecord(null);
    setBookingStep('details');
    const raf = requestAnimationFrame(() => setPageVisible(true));
    return () => cancelAnimationFrame(raf);
  }, [stay.id]);

  // Shared-element photo flight (900ms, easeInOutCubic, radius 12 -> 10)
  useLayoutEffect(() => {
    if (!originRect || !targetPhotoRef.current) {
      setFlightDone(true);
      setFlightStyle(null);
      return;
    }

    setFlightDone(false);
    const targetRect = targetPhotoRef.current.getBoundingClientRect();

    setFlightStyle({
      position: 'fixed',
      left: `${originRect.left}px`,
      top: `${originRect.top}px`,
      width: `${originRect.width}px`,
      height: `${originRect.height}px`,
      borderRadius: '12px',
      zIndex: 80,
      overflow: 'hidden',
      pointerEvents: 'none',
      boxShadow: '0 24px 60px rgba(60,30,30,0.22)',
      transition: 'none',
    });

    const raf1 = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setFlightStyle({
          position: 'fixed',
          left: `${targetRect.left}px`,
          top: `${targetRect.top}px`,
          width: `${targetRect.width}px`,
          height: `${targetRect.height}px`,
          borderRadius: '10px',
          zIndex: 80,
          overflow: 'hidden',
          pointerEvents: 'none',
          boxShadow: '0 14px 36px rgba(60,30,30,0.12)',
          transition:
            'left 900ms cubic-bezier(.65,0,.35,1), top 900ms cubic-bezier(.65,0,.35,1), width 900ms cubic-bezier(.65,0,.35,1), height 900ms cubic-bezier(.65,0,.35,1), border-radius 900ms cubic-bezier(.65,0,.35,1), box-shadow 900ms cubic-bezier(.65,0,.35,1)',
        });
      });
    });

    const timer = window.setTimeout(() => {
      setFlightDone(true);
      setFlightStyle(null);
    }, 920);

    return () => {
      cancelAnimationFrame(raf1);
      window.clearTimeout(timer);
    };
  }, [stay.id, originRect]);

  const handleClose = () => {
    setClosing(true);
    setPageVisible(false);
    window.setTimeout(() => {
      onCloseHome();
    }, 450);
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (lightboxOpen) {
        setLightboxOpen(false);
      } else {
        handleClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [lightboxOpen]);

  const handleContinueToContact = () => {
    setBookingError(null);
    if (!stay.available) {
      setBookingError('This residence is currently placed on hold by our sales desk.');
      return;
    }
    if (rawNights < stay.minNights) {
      setBookingError(
        `${stay.name} requires a minimum stay of ${stay.minNights} nights. Please adjust your check-out date.`,
      );
      setEditingDates(true);
      return;
    }
    setBookingStep('contact');
  };

  const handleSubmitBookingRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingBooking) return;
    setBookingError(null);

    if (!isOnline) {
      setBookingError('You are currently offline. Please reconnect before submitting your booking request.');
      return;
    }

    const validationErr = validateCustomerBookingContact({
      customerName,
      customerEmail,
      customerPhone,
      customerNotes,
    });
    if (validationErr) {
      setBookingError(validationErr);
      return;
    }

    if (!firebaseUser) {
      onRequireAuth('Sign in or create an account to submit your booking request and track sales confirmation.');
      return;
    }

    if (!firebaseUser.emailVerified) {
      onRequireAuth('Please verify your email address so our sales team can securely confirm your reservation.');
      return;
    }

    setSubmittingBooking(true);
    try {
      const created = await submitBookingRequest({
        userId: firebaseUser.uid,
        customerName,
        customerEmail,
        customerPhone,
        customerNotes,
        stayId: stay.id,
        stayName: stay.name,
        area: stay.area,
        photoUrl: stay.photo700,
        checkIn: effectiveCheckIn,
        checkOut: effectiveCheckOut,
        nights,
        guests: totalGuests,
        nightlyRateEgp: stay.priceEgp,
        totalEgp: priceBreakdown.totalEgp,
      });
      setSubmittedRecord(created);
      onBookingCreated(created);
      setBookingStep('submitted');
    } catch (err) {
      setBookingError(
        err instanceof Error
          ? err.message
          : 'Unable to submit booking request right now. Please try again.',
      );
    } finally {
      setSubmittingBooking(false);
    }
  };

  const handleRateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingReview) return;
    setReviewError(null);

    if (!firebaseUser || !firebaseUser.emailVerified) {
      onRequireAuth('Please sign in with a verified account to submit a verified stay review.');
      return;
    }
    if (userNote.trim().length < 2) {
      setReviewError('Please add a brief note about your experience.');
      return;
    }

    setSubmittingReview(true);
    try {
      await submitStayReview({
        stayId: stay.id,
        userId: firebaseUser.uid,
        authorName: profile?.displayName || firebaseUser.displayName || 'Verified Guest',
        rating: userStars,
        comment: userNote,
      });
      setSubmittedRating(true);
      setRatingOpen(false);
      setUserNote('');
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : 'Unable to save review.');
    } finally {
      setSubmittingReview(false);
    }
  };

  const activeRequestToDisplay = submittedRecord || existingBooking;
  const waUrl = activeRequestToDisplay
    ? buildWhatsappBookingUrl(activeRequestToDisplay.reference, stay.name)
    : null;
  const mailUrl = activeRequestToDisplay
    ? buildMailtoBookingUrl(activeRequestToDisplay.reference, stay.name)
    : null;

  return (
    <div
      ref={scrollContainerRef}
      role="dialog"
      aria-modal="true"
      aria-label={`${stay.name} property details`}
      className="fixed inset-0 z-40 overflow-y-auto bg-white"
      style={{
        opacity: pageVisible && !closing ? 1 : 0,
        transition: 'opacity 0.55s cubic-bezier(.65,0,.35,1)',
      }}
    >
      {/* Floating shared-element flight clone */}
      {flightStyle && !flightDone && (
        <div style={flightStyle} aria-hidden="true">
          <img
            src={stay.photo700}
            alt=""
            className="h-full w-full object-cover"
          />
        </div>
      )}

      {/* Top 290px peach band */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-0 right-0 top-0 h-[290px]"
        style={{ backgroundColor: '#f7d9c6' }}
      />

      <div
        className="relative z-10 pb-20 pt-[102px]"
        style={{
          paddingLeft: 'clamp(16px, 9.5vw, 170px)',
          paddingRight: 'clamp(16px, 9.5vw, 170px)',
        }}
      >
        {/* Breadcrumb */}
        <nav
          aria-label="Breadcrumb"
          className="animate-detail-rise mb-6 flex flex-wrap items-center gap-1.5 text-[12.5px] text-[#1d1a1c]"
          style={{ animationDelay: '250ms' }}
        >
          <button
            type="button"
            onClick={handleClose}
            className="font-medium underline-offset-4 hover:underline"
          >
            Home
          </button>
          <ChevronRight className="h-3.5 w-3.5 text-[#5c5156]" />
          <button
            type="button"
            onClick={handleClose}
            className="hover:underline"
          >
            Egypt Stays
          </button>
          <ChevronRight className="h-3.5 w-3.5 text-[#5c5156]" />
          <span>{stay.category}</span>
          <ChevronRight className="h-3.5 w-3.5 text-[#8a7f83]" />
          <span className="text-[#8a7f83]">
            {stay.name}, {stay.area}
          </span>
        </nav>

        {/* Two columns */}
        <div className="grid grid-cols-1 gap-10 min-[1001px]:grid-cols-[1.18fr_1fr] min-[1001px]:gap-14">
          {/* Left Column */}
          <div>
            <div
              ref={targetPhotoRef}
              className="relative aspect-[512/445] w-full overflow-hidden rounded-[10px] bg-[#ead0be]"
              style={{
                opacity: flightDone ? 1 : 0,
                boxShadow: '0 16px 40px rgba(80, 45, 40, 0.14)',
              }}
            >
              {heroImgFailed ? (
                <div className="flex h-full w-full flex-col items-center justify-center bg-[#ead0be] p-6 text-center text-[#1d1a1c]">
                  <span className="font-display-serif text-[26px]">{stay.name}</span>
                  <span className="mt-1 text-[14px] text-[#5c5156]">{stay.area}</span>
                </div>
              ) : (
                <>
                  <img
                    src={stay.photo700}
                    alt=""
                    aria-hidden="true"
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                  <img
                    src={currentMainPhoto}
                    alt={stay.imageAlt}
                    onError={() => setHeroImgFailed(true)}
                    className="relative z-[1] h-full w-full object-cover transition-opacity duration-300"
                  />
                </>
              )}

              <button
                type="button"
                onClick={() => {
                  setHeartPop(true);
                  onToggleFavorite(stay.id);
                  window.setTimeout(() => setHeartPop(false), 360);
                }}
                aria-label={isFav ? `Remove ${stay.name} from favorites` : `Save ${stay.name} to favorites`}
                className={`absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-md transition-transform hover:scale-105 ${
                  heartPop ? 'animate-heart-pop' : ''
                }`}
              >
                <Heart
                  className="h-4 w-4"
                  style={{
                    color: isFav ? '#ff4d5e' : '#1d1a1c',
                    fill: isFav ? '#ff4d5e' : 'transparent',
                  }}
                  strokeWidth={1.8}
                />
              </button>
            </div>

            {/* Image attribution line */}
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11.5px] text-[#8a7f83]">
              <span>
                Photo: {stay.imageAttribution.author} ({stay.imageAttribution.license})
              </span>
              <a
                href={stay.imageAttribution.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 hover:text-[#1d1a1c]"
              >
                Wikimedia Commons Source
              </a>
            </div>

            {/* Three square interior thumbnails */}
            <div
              className="animate-detail-rise mt-4 grid grid-cols-3 gap-[12px] sm:gap-[16px]"
              style={{ animationDelay: '320ms' }}
            >
              {INTERIOR_THUMBNAILS.map((thumbUrl, idx) => {
                const isThird = idx === 2;
                const isSelected = activePhotoIndex === idx + 1;
                const itemMeta = INTERIOR_GALLERY_ITEMS[idx];
                return (
                  <button
                    key={thumbUrl}
                    type="button"
                    onClick={() => {
                      if (isThird) {
                        setLightboxOpen(true);
                      } else {
                        setActivePhotoIndex((prev) => (prev === idx + 1 ? null : idx + 1));
                      }
                    }}
                    aria-label={
                      isThird
                        ? `Open all Egyptian architecture photos of ${stay.name}`
                        : `Preview ${itemMeta?.caption || `photo ${idx + 1}`}`
                    }
                    className={`group relative aspect-square overflow-hidden rounded-[10px] transition-transform duration-300 hover:-translate-y-1 ${
                      isSelected ? 'ring-2 ring-[#1d1a1c] ring-offset-2' : ''
                    }`}
                  >
                    <img
                      src={thumbUrl}
                      alt={itemMeta?.caption || `${stay.name} detail ${idx + 1}`}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    {isThird && (
                      <div className="absolute inset-0 flex items-center justify-center bg-[#1d1a1c]/55 font-urbanist text-[20px] font-semibold text-white transition-colors group-hover:bg-[#1d1a1c]/45 sm:text-[22px]">
                        +{galleryPhotos.length}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column */}
          <div>
            <div className="animate-detail-rise" style={{ animationDelay: '320ms' }}>
              <div className="text-[12px] font-medium uppercase tracking-[0.08em] text-[#8a7f83]">
                {stay.governorate} · {stay.category}
              </div>
              <h1 className="mt-1 font-display-serif text-[32px] font-normal leading-[1.12] text-[#1d1a1c] sm:text-[38px]">
                {stay.name}
              </h1>

              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[13.5px] text-[#5c5156]">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#f7d9c6] text-[12px] font-semibold text-[#1d1a1c]">
                  {stay.hostName.charAt(0)}
                </span>
                <span>
                  Hosted by <strong className="font-medium text-[#1d1a1c]">{stay.hostName}</strong>{' '}
                  · {stay.hostRole}
                </span>
              </div>

              {/* Property Specifications */}
              <div className="mt-4 flex flex-wrap gap-2 text-[12.5px] text-[#5c5156]">
                <span className="rounded-full bg-[#fdf0e7] px-3 py-1 font-medium text-[#1d1a1c]">
                  {stay.bedrooms} {stay.bedrooms === 1 ? 'Bedroom' : 'Bedrooms'}
                </span>
                <span className="rounded-full bg-[#fdf0e7] px-3 py-1 font-medium text-[#1d1a1c]">
                  {stay.bathrooms} {stay.bathrooms === 1 ? 'Bath' : 'Baths'}
                </span>
                <span className="rounded-full bg-[#fdf0e7] px-3 py-1 font-medium text-[#1d1a1c]">
                  {stay.sizeSqm} m²
                </span>
                <span className="rounded-full bg-[#fdf0e7] px-3 py-1 font-medium text-[#1d1a1c]">
                  Min {stay.minNights} {stay.minNights === 1 ? 'night' : 'nights'}
                </span>
                <span className="rounded-full bg-[#fdf0e7] px-3 py-1 font-medium text-[#1d1a1c]">
                  Check-in {stay.checkInWindow}
                </span>
              </div>
            </div>

            {/* About Section */}
            <div className="animate-detail-rise mt-7" style={{ animationDelay: '390ms' }}>
              <h2 className="font-display-serif text-[22px] font-normal text-[#1d1a1c]">
                About {stay.name}
              </h2>
              <p className="mt-2.5 text-[14.5px] leading-[1.68] text-[#5c5156]">
                {stay.description}
              </p>
            </div>

            {/* Booking Request Card (Pending Confirmation Workflow) */}
            <div
              className="animate-detail-rise mt-6 rounded-[18px] bg-white p-5 sm:p-6"
              style={{
                animationDelay: '460ms',
                boxShadow: '0 18px 50px rgba(90, 50, 45, 0.12)',
              }}
            >
              {bookingStep === 'submitted' && activeRequestToDisplay ? (
                <div data-testid="booking-pending-confirmation" className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Clock3 className="mt-0.5 h-7 w-7 shrink-0 text-[#f39419]" strokeWidth={1.7} />
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-[#fff4e5] px-3 py-0.5 text-[11.5px] font-semibold text-[#b45d00]">
                          {getBookingStatusLabel(activeRequestToDisplay.status)}
                        </span>
                        <span className="font-mono text-[12.5px] font-semibold text-[#1d1a1c]">
                          Ref: {activeRequestToDisplay.reference}
                        </span>
                      </div>
                      <h3 className="mt-2 font-display-serif text-[24px] leading-tight text-[#1d1a1c]">
                        Booking Request Received
                      </h3>
                    </div>
                  </div>

                  <div className="rounded-[14px] border border-[#f39419]/30 bg-[#fdf0e7] p-4 text-[13.5px] leading-relaxed text-[#1d1a1c]">
                    {MANDATORY_BOOKING_PENDING_MESSAGE}
                  </div>

                  <div className="rounded-[12px] bg-[#f4f2f2] p-3.5 text-[13px] text-[#5c5156] space-y-1">
                    <div className="flex justify-between">
                      <span>Dates</span>
                      <span className="font-medium text-[#1d1a1c] tabular-nums">
                        {formatFullDate(activeRequestToDisplay.checkIn)} –{' '}
                        {formatFullDate(activeRequestToDisplay.checkOut)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Stay &amp; Party</span>
                      <span className="font-medium text-[#1d1a1c] tabular-nums">
                        {activeRequestToDisplay.nights} nights · {activeRequestToDisplay.guests}{' '}
                        guests
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-[#1d1a1c]/10 pt-1.5 font-semibold text-[#1d1a1c]">
                      <span>Estimated Total</span>
                      <span className="tabular-nums">
                        {formatPrice(activeRequestToDisplay.totalEgp, currency)}
                      </span>
                    </div>
                  </div>

                  {/* Sales Contact Channels */}
                  <div className="rounded-[12px] border border-[#1d1a1c]/10 p-3.5 text-[12.5px]">
                    <div className="font-semibold text-[#1d1a1c]">
                      Direct Sales Follow-Up ({SALES_CONTACT_CONFIG.officeLocation})
                    </div>
                    {SALES_CONTACT_CONFIG.hasDirectChannels ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {SALES_CONTACT_CONFIG.phone && (
                          <a
                            href={`tel:${SALES_CONTACT_CONFIG.phone}`}
                            className="inline-flex items-center gap-1.5 rounded-full border border-[#1d1a1c]/20 px-3 py-1 text-[12px] font-medium hover:bg-[#fdf0e7]"
                          >
                            <Phone className="h-3.5 w-3.5" />
                            {SALES_CONTACT_CONFIG.phone}
                          </a>
                        )}
                        {waUrl && (
                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-full border border-[#1d1a1c]/20 px-3 py-1 text-[12px] font-medium hover:bg-[#fdf0e7]"
                          >
                            <MessageCircle className="h-3.5 w-3.5" />
                            WhatsApp Sales
                          </a>
                        )}
                        {mailUrl && (
                          <a
                            href={mailUrl}
                            className="inline-flex items-center gap-1.5 rounded-full border border-[#1d1a1c]/20 px-3 py-1 text-[12px] font-medium hover:bg-[#fdf0e7]"
                          >
                            <Mail className="h-3.5 w-3.5" />
                            {SALES_CONTACT_CONFIG.email}
                          </a>
                        )}
                      </div>
                    ) : (
                      <p className="mt-1 text-[#5c5156]">
                        Our sales team reaches out via your submitted phone and email within{' '}
                        {SALES_CONTACT_CONFIG.responseSlaHours} hours. (Direct business phone,
                        WhatsApp, and email channels can be configured in{' '}
                        <code className="text-[11.5px]">contactConfig.ts</code>.)
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={onOpenMyBookings}
                    className="h-11 w-full rounded-full bg-[#1d1a1c] text-[14px] font-semibold text-white transition-opacity hover:opacity-90"
                  >
                    View Request in My Bookings
                  </button>
                </div>
              ) : bookingStep === 'contact' ? (
                <form onSubmit={handleSubmitBookingRequest} className="space-y-3.5" noValidate>
                  <div className="flex items-center justify-between border-b border-[#1d1a1c]/10 pb-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8a7f83]">
                        Step 2 of 2 · Review &amp; Contact
                      </p>
                      <h3 className="font-display-serif text-[22px] text-[#1d1a1c]">
                        Request Confirmation
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setBookingStep('details')}
                      className="text-[12.5px] font-medium text-[#5c5156] underline underline-offset-2 hover:text-[#1d1a1c]"
                    >
                      Edit Dates
                    </button>
                  </div>

                  <div className="rounded-[12px] bg-[#f4f2f2] p-3 text-[12.5px] text-[#5c5156] space-y-1">
                    <div className="flex justify-between font-medium text-[#1d1a1c]">
                      <span>
                        {formatFullDate(effectiveCheckIn)} – {formatFullDate(effectiveCheckOut)}
                      </span>
                      <span className="tabular-nums">
                        {nights} nights · {totalGuests} guests
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>
                        {formatPrice(stay.priceEgp, currency)} × {nights} nights
                      </span>
                      <span className="font-semibold text-[#1d1a1c] tabular-nums">
                        {formatPrice(priceBreakdown.totalEgp, currency)}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <label className="block text-[12px] font-medium text-[#5c5156]">
                      Full Name *
                      <input
                        type="text"
                        required
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Nadia Mansour"
                        className="mt-1 w-full rounded-[10px] border border-[#1d1a1c]/15 px-3 py-2 text-[14px] text-[#1d1a1c]"
                      />
                    </label>
                    <label className="block text-[12px] font-medium text-[#5c5156]">
                      Phone / WhatsApp *
                      <input
                        type="tel"
                        required
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="+20 100 555 1234"
                        className="mt-1 w-full rounded-[10px] border border-[#1d1a1c]/15 px-3 py-2 text-[14px] text-[#1d1a1c]"
                      />
                    </label>
                  </div>

                  <label className="block text-[12px] font-medium text-[#5c5156]">
                    Email Address *
                    <input
                      type="email"
                      required
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="mt-1 w-full rounded-[10px] border border-[#1d1a1c]/15 px-3 py-2 text-[14px] text-[#1d1a1c]"
                    />
                  </label>

                  <label className="block text-[12px] font-medium text-[#5c5156]">
                    Special Requests (Optional)
                    <textarea
                      rows={2}
                      maxLength={600}
                      value={customerNotes}
                      onChange={(e) => setCustomerNotes(e.target.value)}
                      placeholder="Airport pickup, early arrival, crib, dietary notes..."
                      className="mt-1 w-full rounded-[10px] border border-[#1d1a1c]/15 px-3 py-2 text-[13.5px] text-[#1d1a1c]"
                    />
                  </label>

                  <p className="text-[11.5px] leading-relaxed text-[#5c5156]">
                    Submitting places a request at <strong>Pending Confirmation</strong>. No
                    instant charge occurs; our sales desk confirms availability within 24 hours.
                  </p>

                  {bookingError && (
                    <div
                      role="alert"
                      className="rounded-[10px] bg-[#fdecef] px-3 py-2 text-[12.5px] text-[#b3323e]"
                    >
                      {bookingError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={submittingBooking}
                    className="flex h-12 w-full items-center justify-center rounded-full font-urbanist text-[15px] font-semibold text-white transition-all hover:brightness-95 disabled:opacity-60"
                    style={{ backgroundColor: '#b85c00' }}
                  >
                    {submittingBooking ? 'Submitting Request...' : 'Submit Booking Request'}
                  </button>
                </form>
              ) : (
                <>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <div className="font-urbanist text-[24px] font-semibold text-[#1d1a1c] tabular-nums sm:text-[26px]">
                      {formatPrice(stay.priceEgp, currency)}
                      <span className="text-[14px] font-normal text-[#8a7f83]">/night</span>
                    </div>
                    <span className="text-[13px] font-medium text-[#5c5156] tabular-nums">
                      {nights} {nights === 1 ? 'night' : 'nights'} ·{' '}
                      {formatPrice(priceBreakdown.totalEgp, currency)} total
                    </span>
                  </div>
                  <p className="mt-1 text-[11.5px] text-[#8a7f83]">{stay.pricingBasisNote}</p>

                  {existingBooking && (
                    <div className="mt-3 flex items-center justify-between gap-2 rounded-[10px] border border-[#f39419]/30 bg-[#fdf0e7] px-3.5 py-2.5 text-[12.5px]">
                      <span>
                        Active request ({existingBooking.reference}):{' '}
                        <strong>{getBookingStatusLabel(existingBooking.status)}</strong>
                      </span>
                      <button
                        type="button"
                        onClick={onOpenMyBookings}
                        className="font-semibold underline underline-offset-2"
                      >
                        View
                      </button>
                    </div>
                  )}

                  {/* Pale grey Check In / Check Out box */}
                  <div className="mt-4 rounded-[12px] bg-[#f4f2f2] p-3.5">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#8a7f83]">
                          Check In
                        </div>
                        <div className="mt-0.5 text-[14px] font-medium text-[#1d1a1c] tabular-nums">
                          {formatFullDate(effectiveCheckIn)}
                        </div>
                      </div>
                      <div className="border-l border-[#1d1a1c]/10 pl-3">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#8a7f83]">
                          Check Out
                        </div>
                        <div className="mt-0.5 text-[14px] font-medium text-[#1d1a1c] tabular-nums">
                          {formatFullDate(effectiveCheckOut)}
                        </div>
                      </div>
                    </div>

                    {editingDates && (
                      <div className="mt-3 grid grid-cols-2 gap-2 border-t border-[#1d1a1c]/10 pt-3">
                        <label className="text-[11.5px] text-[#5c5156]">
                          New Check-in
                          <input
                            type="date"
                            className="mt-1 w-full rounded-[8px] border border-[#1d1a1c]/15 bg-white px-2 py-1 text-[12.5px] text-[#1d1a1c]"
                            value={effectiveCheckIn.toISOString().slice(0, 10)}
                            onChange={(e) => {
                              if (!e.target.value) return;
                              const nextIn = new Date(`${e.target.value}T00:00:00`);
                              const minOutMs = 86_400_000 * stay.minNights;
                              const nextOut =
                                effectiveCheckOut.getTime() - nextIn.getTime() < minOutMs
                                  ? new Date(nextIn.getTime() + minOutMs)
                                  : effectiveCheckOut;
                              onChangeDateRange({ checkIn: nextIn, checkOut: nextOut });
                            }}
                          />
                        </label>
                        <label className="text-[11.5px] text-[#5c5156]">
                          New Check-out
                          <input
                            type="date"
                            className="mt-1 w-full rounded-[8px] border border-[#1d1a1c]/15 bg-white px-2 py-1 text-[12.5px] text-[#1d1a1c]"
                            value={effectiveCheckOut.toISOString().slice(0, 10)}
                            min={new Date(
                              effectiveCheckIn.getTime() + 86_400_000 * stay.minNights,
                            )
                              .toISOString()
                              .slice(0, 10)}
                            onChange={(e) => {
                              if (!e.target.value) return;
                              const nextOut = new Date(`${e.target.value}T00:00:00`);
                              if (nextOut > effectiveCheckIn) {
                                onChangeDateRange({
                                  checkIn: effectiveCheckIn,
                                  checkOut: nextOut,
                                });
                              }
                            }}
                          />
                        </label>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => setEditingDates((v) => !v)}
                      className="mt-2 text-[12px] font-medium text-[#5c5156] underline-offset-2 hover:text-[#1d1a1c] hover:underline"
                    >
                      {editingDates ? 'Done editing dates' : 'Change dates'}
                    </button>
                  </div>

                  {/* Guests row */}
                  <div className="mt-4 flex items-center justify-between px-1">
                    <div>
                      <div className="text-[14px] font-medium text-[#1d1a1c]">Guests</div>
                      <div className="text-[12px] text-[#8a7f83]">
                        Up to {stay.maxGuests} guests
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        aria-label="Decrease booking guests"
                        disabled={totalGuests <= 1}
                        onClick={() => {
                          if (guests.children > 0) {
                            onChangeGuests({ ...guests, children: guests.children - 1 });
                          } else if (guests.adults > 1) {
                            onChangeGuests({ ...guests, adults: guests.adults - 1 });
                          }
                        }}
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-[#1d1a1c]/20 text-[#1d1a1c] transition-colors hover:border-[#1d1a1c] disabled:opacity-35"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-6 text-center text-[15px] font-semibold tabular-nums">
                        {totalGuests}
                      </span>
                      <button
                        type="button"
                        aria-label="Increase booking guests"
                        disabled={totalGuests >= stay.maxGuests}
                        onClick={() =>
                          onChangeGuests({ ...guests, adults: guests.adults + 1 })
                        }
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-[#1d1a1c]/20 text-[#1d1a1c] transition-colors hover:border-[#1d1a1c] disabled:opacity-35"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {bookingError && (
                    <div className="mt-3 rounded-[10px] bg-[#fdecef] px-3 py-2 text-[12.5px] text-[#b3323e]">
                      {bookingError}
                    </div>
                  )}

                  <button
                    type="button"
                    disabled={!stay.available}
                    onClick={handleContinueToContact}
                    className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-full font-urbanist text-[15px] font-semibold text-white transition-all duration-300 hover:brightness-95 disabled:cursor-not-allowed disabled:bg-[#8a7f83]"
                    style={{
                      backgroundColor: stay.available ? '#b85c00' : '#8a7f83',
                    }}
                  >
                    {stay.available ? 'Request Booking' : 'Currently Placed on Hold'}
                  </button>
                  <p className="mt-2.5 text-center text-[12px] text-[#8a7f83]">
                    Reservations require sales availability confirmation within 24 hours.
                  </p>
                </>
              )}
            </div>

            {/* Rating row + Verified Firestore Reviews */}
            <div
              className="animate-detail-rise mt-6 border-y border-[#1d1a1c]/10 py-4"
              style={{ animationDelay: '530ms' }}
            >
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-[22px] font-semibold text-[#1d1a1c] tabular-nums">
                      {stay.rating.toFixed(1)}
                    </span>
                    <span className="text-[13px] text-[#8a7f83] tabular-nums">
                      ({stay.reviewCount + reviews.length} reviews)
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-0.5" aria-hidden="true">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className="h-3.5 w-3.5 fill-[#ff4d5e] text-[#ff4d5e]"
                      />
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setRatingOpen((v) => !v)}
                  className="rounded-full border border-[#1d1a1c] px-4 py-1.5 text-[13px] font-medium text-[#1d1a1c] transition-colors hover:bg-[#1d1a1c] hover:text-white"
                >
                  {submittedRating ? 'Review Submitted ✓' : 'Rate Now'}
                </button>
              </div>

              {ratingOpen && (
                <form onSubmit={handleRateSubmit} className="mt-4 rounded-[12px] bg-[#fdf0e7] p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[13.5px] font-medium text-[#1d1a1c]">
                      Share your stay impression
                    </span>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          type="button"
                          aria-label={`Rate ${n} stars`}
                          onClick={() => setUserStars(n)}
                          className="p-0.5"
                        >
                          <Star
                            className={`h-4 w-4 ${
                              n <= userStars
                                ? 'fill-[#f39419] text-[#f39419]'
                                : 'text-[#8a7f83]/40'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                  {reviewError && (
                    <div className="mt-2 text-[12.5px] text-[#b3323e]">{reviewError}</div>
                  )}
                  <div className="mt-3 flex gap-2">
                    <input
                      type="text"
                      required
                      maxLength={600}
                      value={userNote}
                      onChange={(e) => setUserNote(e.target.value)}
                      placeholder="Nile terrace views, quiet courtyard, attentive host..."
                      className="flex-1 rounded-[10px] border border-[#1d1a1c]/15 bg-white px-3 py-2 text-[13px] text-[#1d1a1c]"
                    />
                    <button
                      type="submit"
                      disabled={submittingReview}
                      className="rounded-[10px] bg-[#1d1a1c] px-4 py-2 text-[13px] font-medium text-white disabled:opacity-60"
                    >
                      {submittingReview ? 'Posting...' : 'Submit'}
                    </button>
                  </div>
                </form>
              )}

              {reviews.length > 0 && (
                <div className="mt-4 space-y-2.5">
                  {reviews.slice(0, 3).map((rev) => (
                    <div key={rev.id} className="rounded-[10px] bg-[#fdf0e7]/70 p-3 text-[13px]">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-[#1d1a1c]">{rev.authorName}</span>
                        <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#b45d00]">
                          <Star className="h-3 w-3 fill-[#f39419] text-[#f39419]" />
                          {rev.rating.toFixed(1)}
                        </span>
                      </div>
                      <p className="mt-1 text-[#5c5156]">{rev.comment}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Stay-Specific Amenities Grid */}
            <div className="animate-detail-rise mt-6" style={{ animationDelay: '600ms' }}>
              <h3 className="font-display-serif text-[20px] font-normal text-[#1d1a1c]">
                Amenities &amp; Highlights
              </h3>
              <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-3">
                {stay.amenities.map(({ iconKey, label }) => {
                  const Icon = getAmenityIcon(iconKey);
                  return (
                    <div
                      key={label}
                      className="flex items-center gap-2.5 text-[13.5px] text-[#5c5156]"
                    >
                      <Icon className="h-[18px] w-[18px] shrink-0 text-[#1d1a1c]" strokeWidth={1.5} />
                      <span>{label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Similar Places to Stay */}
        <section
          aria-labelledby="similar-heading"
          className="animate-detail-rise mt-16 border-t border-[#1d1a1c]/10 pt-12"
          style={{ animationDelay: '670ms' }}
        >
          <h2
            id="similar-heading"
            className="mb-7 font-display-serif font-normal text-[#1d1a1c]"
            style={{ fontSize: 'clamp(24px, 2.2vw, 32px)' }}
          >
            Similar Places to Stay in Egypt
          </h2>
          <div
            className="grid grid-cols-2 min-[1001px]:grid-cols-4"
            style={{ gap: 'clamp(12px, 2.2vw, 30px)' }}
          >
            {similarStays.map((sim, idx) => (
              <StayCard
                key={sim.id}
                stay={sim}
                currency={currency}
                isFavorite={favorites.includes(sim.id)}
                onToggleFavorite={onToggleFavorite}
                onSelect={onSelectSimilarStay}
                columnIndex={idx}
                immediate
              />
            ))}
          </div>
        </section>
      </div>

      {/* Interior Photo Gallery Lightbox Modal */}
      {lightboxOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Property gallery"
          className="fixed inset-0 z-[90] flex items-center justify-center bg-[#1d1a1c]/85 p-4 backdrop-blur-sm sm:p-6"
          onClick={() => setLightboxOpen(false)}
        >
          <div
            className="relative max-h-[90vh] w-full max-w-[920px] overflow-y-auto rounded-[20px] bg-white p-5 text-[#1d1a1c] sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display-serif text-[22px] sm:text-[24px]">
                {stay.name} — Architecture &amp; Views
              </h3>
              <button
                type="button"
                aria-label="Close gallery"
                onClick={() => setLightboxOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[#1d1a1c]/15 hover:bg-[#fdf0e7]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {galleryPhotos.map((item, i) => (
                <figure
                  key={`${item.url}-${i}`}
                  className="overflow-hidden rounded-[12px] border border-[#1d1a1c]/10 bg-[#fdf0e7]/40"
                >
                  <div className="aspect-[16/10] overflow-hidden">
                    <img
                      src={item.url}
                      alt={item.caption}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <figcaption className="px-3 py-2 text-[11.5px] text-[#5c5156]">
                    {item.caption} · {item.attribution.author} ({item.attribution.license})
                  </figcaption>
                </figure>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-[13px] text-[#5c5156]">
              <span>Verified Egyptian architectural &amp; landscape photography</span>
              <span className="inline-flex items-center gap-1 font-medium text-[#1d1a1c]">
                <Check className="h-3.5 w-3.5 text-[#249c60]" /> Inspected by Kemet Travel
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
