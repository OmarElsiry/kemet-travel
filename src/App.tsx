import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { WifiOff, X } from 'lucide-react';
import { CustomCursor } from './components/CustomCursor';
import { HeroSection } from './components/HeroSection';
import { Navbar, type DrawerTab } from './components/Navbar';
import { PropertyDetailView } from './components/PropertyDetailView';
import { RecommendedStaysSection } from './components/RecommendedStaysSection';
import { SearchBar } from './components/SearchBar';
import {
  GuestMenuDrawer,
  HostAndContactModal,
  SourcesAndAttributionModal,
} from './components/SecondaryModals';
import { WhereToGoAndFooter } from './components/WhereToGoAndFooter';
import { useAuth } from './context/AuthContext';
import { STAY_PROPERTIES, type StayProperty } from './data/egyptData';
import {
  cancelCustomerBooking,
  subscribeToCustomerBookings,
  subscribeToPropertyOverrides,
} from './services/firestoreService';
import {
  applyPropertyOverrides,
  filterStays,
  isActiveBookingStatus,
  summarizeBookings,
  type BookingRecord,
  type CurrencyCode,
  type DateRange,
  type GuestCounts,
  type PropertyOverride,
} from './utils/bookingLogic';

const AuthModal = lazy(() =>
  import('./components/AuthModal').then((m) => ({ default: m.AuthModal })),
);
const SalesDashboardModal = lazy(() =>
  import('./components/SalesDashboardModal').then((m) => ({ default: m.SalesDashboardModal })),
);

function parseRoutePath(pathname: string): {
  kind: 'home' | 'stay' | 'account' | 'bookings' | 'sales' | 'where-to-go' | 'not-found';
  stayId?: string;
} {
  const base = (import.meta.env.BASE_URL || '/').replace(/\/+$/, '');
  let rel = pathname;
  if (base && base !== '.' && pathname.startsWith(base)) {
    rel = pathname.slice(base.length);
  }
  const clean = rel.replace(/^\/+|\/+$/g, '');
  if (clean === '' || clean === 'index.html') return { kind: 'home' };
  if (clean.startsWith('stays/')) {
    return { kind: 'stay', stayId: clean.slice('stays/'.length) };
  }
  if (clean === 'account') return { kind: 'account' };
  if (clean === 'bookings') return { kind: 'bookings' };
  if (clean === 'sales') return { kind: 'sales' };
  if (clean === 'where-to-go') return { kind: 'where-to-go' };
  return { kind: 'not-found' };
}

function buildRouteUrl(subPath: string): string {
  const base = import.meta.env.BASE_URL || '/';
  const normalized = base.endsWith('/') ? base : `${base}/`;
  return `${normalized}${subPath.replace(/^\/+/, '')}`;
}

export default function App() {
  const { firebaseUser, profile, isOnline } = useAuth();

  const [activeSlide, setActiveSlide] = useState(0);
  const [scrollSolid, setScrollSolid] = useState(false);
  const [currency, setCurrency] = useState<CurrencyCode>('EGP');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRange>({
    checkIn: null,
    checkOut: null,
  });
  const [guests, setGuests] = useState<GuestCounts>({ adults: 0, children: 0 });
  const [showFilterBar, setShowFilterBar] = useState(false);
  const [isStaysLoading, setIsStaysLoading] = useState(true);

  const [propertyOverrides, setPropertyOverrides] = useState<Record<string, PropertyOverride>>({});
  const allStays = useMemo(
    () => applyPropertyOverrides(STAY_PROPERTIES, propertyOverrides),
    [propertyOverrides],
  );

  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const raw = window.localStorage.getItem('kemet_favorites');
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  });

  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);

  const [selectedStay, setSelectedStay] = useState<{
    stay: StayProperty;
    rect: DOMRect | null;
  } | null>(null);

  const [menuDrawerOpen, setMenuDrawerOpen] = useState(false);
  const [menuDrawerTab, setMenuDrawerTab] = useState<DrawerTab>('overview');
  const [modalMode, setModalMode] = useState<'host' | 'contact' | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authContextBanner, setAuthContextBanner] = useState<string | null>(null);
  const [salesPortalOpen, setSalesPortalOpen] = useState(false);
  const [sourcesModalOpen, setSourcesModalOpen] = useState(false);
  const [unknownRouteNotice, setUnknownRouteNotice] = useState<string | null>(null);

  const totalGuests = guests.adults + guests.children;
  const isFirstFilterMount = useRef(true);

  // Sync preferred currency from authenticated user profile
  useEffect(() => {
    if (profile?.preferredCurrency) {
      setCurrency(profile.preferredCurrency);
    }
  }, [profile?.preferredCurrency]);

  // Public real-time subscription to sales property overrides (rates, availability, capacity)
  useEffect(() => {
    const unsub = subscribeToPropertyOverrides(setPropertyOverrides);
    return () => unsub();
  }, []);

  // Authenticated customer bookings real-time subscription
  useEffect(() => {
    if (!firebaseUser || !firebaseUser.emailVerified) {
      setBookings([]);
      setBookingsLoading(false);
      return;
    }
    setBookingsLoading(true);
    const unsub = subscribeToCustomerBookings(
      firebaseUser.uid,
      (records) => {
        setBookings(records);
        setBookingsLoading(false);
      },
      (err) => {
        console.warn('Customer bookings subscription error:', err);
        setBookingsLoading(false);
      },
    );
    return () => unsub();
  }, [firebaseUser]);

  // Initial route + browser back/forward navigation sync
  const applyLocationRoute = useCallback(
    (pathname: string) => {
      const parsed = parseRoutePath(pathname);
      if (parsed.kind === 'home') {
        setSelectedStay(null);
        setMenuDrawerOpen(false);
        setSalesPortalOpen(false);
        setUnknownRouteNotice(null);
        return;
      }
      if (parsed.kind === 'stay' && parsed.stayId) {
        const matched = allStays.find((s) => s.id === parsed.stayId);
        if (matched) {
          setSelectedStay({ stay: matched, rect: null });
          setUnknownRouteNotice(null);
        } else {
          setSelectedStay(null);
          setUnknownRouteNotice(`Property "${parsed.stayId}" was not found in our Egypt collection.`);
        }
        return;
      }
      if (parsed.kind === 'account') {
        setSelectedStay(null);
        setMenuDrawerTab('account');
        setMenuDrawerOpen(true);
        setUnknownRouteNotice(null);
        return;
      }
      if (parsed.kind === 'bookings') {
        setSelectedStay(null);
        setMenuDrawerTab('bookings');
        setMenuDrawerOpen(true);
        setUnknownRouteNotice(null);
        return;
      }
      if (parsed.kind === 'sales') {
        setSelectedStay(null);
        setSalesPortalOpen(true);
        setUnknownRouteNotice(null);
        return;
      }
      if (parsed.kind === 'where-to-go') {
        setSelectedStay(null);
        setUnknownRouteNotice(null);
        window.requestAnimationFrame(() => {
          document.getElementById('where-to-go-section')?.scrollIntoView({ behavior: 'smooth' });
        });
        return;
      }
      setSelectedStay(null);
      setUnknownRouteNotice(`Page "${pathname}" does not exist. Showing Egypt home collection.`);
    },
    [allStays],
  );

  useEffect(() => {
    applyLocationRoute(window.location.pathname);
    const onPopState = () => {
      applyLocationRoute(window.location.pathname);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [applyLocationRoute]);

  // Keep open selectedStay synchronized with live price/availability overrides
  useEffect(() => {
    setSelectedStay((prev) => {
      if (!prev) return null;
      const fresh = allStays.find((s) => s.id === prev.stay.id);
      return fresh ? { ...prev, stay: fresh } : prev;
    });
  }, [allStays]);

  // Initial load skeleton state for Recommended Stays grid
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setIsStaysLoading(false);
    }, 260);
    return () => window.clearTimeout(timer);
  }, []);

  // Filter transition skeleton state
  useEffect(() => {
    if (isFirstFilterMount.current) {
      isFirstFilterMount.current = false;
      return;
    }
    setIsStaysLoading(true);
    const timer = window.setTimeout(() => {
      setIsStaysLoading(false);
    }, 220);
    return () => window.clearTimeout(timer);
  }, [selectedDistrict, totalGuests]);

  useEffect(() => {
    const onScroll = () => {
      setScrollSolid(window.scrollY > window.innerHeight * 0.22);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem('kemet_favorites', JSON.stringify(favorites));
    } catch {
      // Ignore storage quota errors
    }
  }, [favorites]);

  const handleToggleFavorite = useCallback((stayId: string) => {
    setFavorites((prev) =>
      prev.includes(stayId) ? prev.filter((id) => id !== stayId) : [...prev, stayId],
    );
  }, []);

  const handleReturnHome = useCallback(() => {
    setSelectedStay(null);
    setUnknownRouteNotice(null);
    if (window.location.pathname !== buildRouteUrl('')) {
      window.history.pushState(null, '', buildRouteUrl(''));
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleNavigateSection = useCallback((sectionId: string) => {
    setSelectedStay(null);
    if (window.location.pathname !== buildRouteUrl('')) {
      window.history.pushState(null, '', buildRouteUrl(''));
    }
    window.requestAnimationFrame(() => {
      const el = document.getElementById(sectionId);
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, []);

  const handleSelectStay = useCallback((stay: StayProperty, rect: DOMRect | null) => {
    setSelectedStay({ stay, rect });
    setUnknownRouteNotice(null);
    const targetUrl = buildRouteUrl(`stays/${stay.id}`);
    if (window.location.pathname !== targetUrl) {
      window.history.pushState({ stayId: stay.id }, '', targetUrl);
    }
  }, []);

  const handleCloseDetail = useCallback(() => {
    setSelectedStay(null);
    const homeUrl = buildRouteUrl('');
    if (window.location.pathname !== homeUrl) {
      window.history.pushState(null, '', homeUrl);
    }
  }, []);

  const handleBookingCreated = useCallback((booking: BookingRecord) => {
    setBookings((prev) => [booking, ...prev.filter((b) => b.id !== booking.id)]);
  }, []);

  const handleCancelBooking = useCallback(async (bookingId: string) => {
    await cancelCustomerBooking(bookingId);
  }, []);

  const handleOpenMenuDrawer = useCallback((tab: DrawerTab = 'overview') => {
    setMenuDrawerTab(tab);
    setMenuDrawerOpen(true);
  }, []);

  const handleRequireAuth = useCallback((bannerMessage: string) => {
    setAuthContextBanner(bannerMessage);
    setAuthModalOpen(true);
  }, []);

  const filteredStays = filterStays(allStays, selectedDistrict, totalGuests);
  const bookingsSummary = summarizeBookings(bookings);

  const handleResetFilters = useCallback(() => {
    setSelectedDistrict('all');
    setGuests({ adults: 0, children: 0 });
    setShowFilterBar(false);
  }, []);

  const activeBookingForSelectedStay = selectedStay
    ? bookings.find((b) => b.stayId === selectedStay.stay.id && isActiveBookingStatus(b.status)) ||
      null
    : null;

  return (
    <div className="relative min-h-screen w-full">
      <CustomCursor />

      <Navbar
        isSolid={scrollSolid || selectedStay !== null}
        currency={currency}
        onChangeCurrency={setCurrency}
        onReturnHome={handleReturnHome}
        onNavigateSection={handleNavigateSection}
        onOpenHostModal={() => setModalMode('host')}
        onOpenContactModal={() => setModalMode('contact')}
        onOpenMenuDrawer={handleOpenMenuDrawer}
        onOpenAuthModal={() => {
          setAuthContextBanner(null);
          setAuthModalOpen(true);
        }}
        onOpenSalesPortal={() => setSalesPortalOpen(true)}
        savedCount={favorites.length}
        bookingsCount={bookingsSummary.activeCount}
      />

      {!isOnline && (
        <div
          role="status"
          className="fixed bottom-4 left-4 z-[90] flex items-center gap-2 rounded-full bg-[#1d1a1c] px-4 py-2 text-[12.5px] font-medium text-white shadow-lg"
        >
          <WifiOff className="h-3.5 w-3.5 text-[#f39419]" />
          <span>Offline mode — reconnect to submit bookings or sync account updates.</span>
        </div>
      )}

      {unknownRouteNotice && (
        <div
          role="alert"
          className="fixed left-1/2 top-[84px] z-[60] flex w-[min(560px,calc(100%-32px))] -translate-x-1/2 items-center justify-between gap-3 rounded-[14px] border border-[#1d1a1c]/15 bg-white px-4 py-3 text-[13.5px] text-[#1d1a1c] shadow-xl"
        >
          <span>{unknownRouteNotice}</span>
          <button
            type="button"
            aria-label="Dismiss route notice"
            onClick={() => {
              setUnknownRouteNotice(null);
              window.history.replaceState(null, '', buildRouteUrl(''));
            }}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full hover:bg-[#fdf0e7]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <main>
        <HeroSection
          activeSlide={activeSlide}
          onSelectSlide={setActiveSlide}
          paused={
            selectedStay !== null ||
            menuDrawerOpen ||
            modalMode !== null ||
            authModalOpen ||
            salesPortalOpen
          }
        >
          <SearchBar
            selectedDistrict={selectedDistrict}
            onSelectDistrict={setSelectedDistrict}
            dateRange={dateRange}
            onChangeDateRange={setDateRange}
            guests={guests}
            onChangeGuests={setGuests}
            onSubmitSearch={() => handleNavigateSection('stays-section')}
          />
        </HeroSection>

        <RecommendedStaysSection
          stays={filteredStays}
          totalCount={allStays.length}
          isLoading={isStaysLoading}
          selectedDistrict={selectedDistrict}
          onSelectDistrict={setSelectedDistrict}
          showFilterBar={showFilterBar}
          onToggleFilterBar={() => setShowFilterBar((v) => !v)}
          currency={currency}
          favorites={favorites}
          onToggleFavorite={handleToggleFavorite}
          onSelectStay={handleSelectStay}
          onResetFilters={handleResetFilters}
        />

        <WhereToGoAndFooter
          onSelectDistrictAndHero={(districtKey, slideIndex) => {
            setActiveSlide(slideIndex);
            setSelectedDistrict(districtKey);
            setShowFilterBar(true);
            handleNavigateSection('stays-section');
          }}
          onNavigateSection={handleNavigateSection}
          onOpenHostModal={() => setModalMode('host')}
          onOpenContactModal={() => setModalMode('contact')}
          onOpenSourcesModal={() => setSourcesModalOpen(true)}
        />
      </main>

      {selectedStay && (
        <PropertyDetailView
          stay={selectedStay.stay}
          allStays={allStays}
          originRect={selectedStay.rect}
          currency={currency}
          dateRange={dateRange}
          onChangeDateRange={setDateRange}
          guests={guests.adults + guests.children === 0 ? { adults: 2, children: 0 } : guests}
          onChangeGuests={setGuests}
          favorites={favorites}
          onToggleFavorite={handleToggleFavorite}
          existingBooking={activeBookingForSelectedStay}
          onBookingCreated={handleBookingCreated}
          onOpenMyBookings={() => {
            handleCloseDetail();
            handleOpenMenuDrawer('bookings');
          }}
          onRequireAuth={handleRequireAuth}
          onSelectSimilarStay={handleSelectStay}
          onCloseHome={handleCloseDetail}
        />
      )}

      <GuestMenuDrawer
        open={menuDrawerOpen}
        activeTab={menuDrawerTab}
        onChangeTab={setMenuDrawerTab}
        onClose={() => setMenuDrawerOpen(false)}
        stays={allStays}
        favorites={favorites}
        bookings={bookings}
        bookingsLoading={bookingsLoading}
        currency={currency}
        onChangeCurrency={setCurrency}
        onSelectStay={(stay) => handleSelectStay(stay, null)}
        onCancelBooking={handleCancelBooking}
        onNavigateSection={handleNavigateSection}
        onOpenHostModal={() => setModalMode('host')}
        onOpenContactModal={() => setModalMode('contact')}
        onOpenAuthModal={() => {
          setAuthContextBanner(null);
          setAuthModalOpen(true);
        }}
        onOpenSalesPortal={() => setSalesPortalOpen(true)}
      />

      <HostAndContactModal
        mode={modalMode}
        onClose={() => setModalMode(null)}
        onRequireAuth={handleRequireAuth}
      />

      <SourcesAndAttributionModal
        open={sourcesModalOpen}
        onClose={() => setSourcesModalOpen(false)}
      />

      <Suspense fallback={null}>
        {authModalOpen && (
          <AuthModal
            open={authModalOpen}
            contextBanner={authContextBanner}
            onClose={() => {
              setAuthModalOpen(false);
              setAuthContextBanner(null);
            }}
          />
        )}
        {salesPortalOpen && (
          <SalesDashboardModal
            open={salesPortalOpen}
            stays={allStays}
            currency={currency}
            onClose={() => {
              setSalesPortalOpen(false);
              if (window.location.pathname.includes('/sales')) {
                window.history.pushState(null, '', buildRouteUrl(''));
              }
            }}
          />
        )}
      </Suspense>
    </div>
  );
}
