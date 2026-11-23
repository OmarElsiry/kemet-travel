import { ChevronDown, Globe, Menu, ShieldCheck, User } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getNextLinearIndex, type CurrencyCode } from '../utils/bookingLogic';

export type DrawerTab = 'overview' | 'bookings' | 'account';

interface NavbarProps {
  isSolid: boolean;
  currency: CurrencyCode;
  onChangeCurrency: (c: CurrencyCode) => void;
  onReturnHome: () => void;
  onNavigateSection: (sectionId: string) => void;
  onOpenHostModal: () => void;
  onOpenContactModal: () => void;
  onOpenMenuDrawer: (tab?: DrawerTab) => void;
  onOpenAuthModal: () => void;
  onOpenSalesPortal: () => void;
  savedCount: number;
  bookingsCount: number;
}

export function Navbar({
  isSolid,
  currency,
  onChangeCurrency,
  onReturnHome,
  onNavigateSection,
  onOpenHostModal,
  onOpenContactModal,
  onOpenMenuDrawer,
  onOpenAuthModal,
  onOpenSalesPortal,
  savedCount,
  bookingsCount,
}: NavbarProps) {
  const { firebaseUser, profile, isAdmin } = useAuth();
  const [visitorsOpen, setVisitorsOpen] = useState(false);
  const [globeOpen, setGlobeOpen] = useState(false);

  const visitorsRef = useRef<HTMLDivElement>(null);
  const visitorsTriggerRef = useRef<HTMLButtonElement>(null);
  const visitorsItemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const pendingVisitorsFocusRef = useRef<number | null>(null);

  const globeRef = useRef<HTMLDivElement>(null);
  const globeTriggerRef = useRef<HTMLButtonElement>(null);
  const globeItemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const pendingGlobeFocusRef = useRef<number | null>(null);

  const navLinkRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const visitorsMenuCount = isAdmin ? 4 : 3;

  const focusRingClass = isSolid
    ? 'focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1d1a1c]'
    : 'focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white';

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (visitorsRef.current && !visitorsRef.current.contains(e.target as Node)) {
        setVisitorsOpen(false);
      }
      if (globeRef.current && !globeRef.current.contains(e.target as Node)) {
        setGlobeOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  useLayoutEffect(() => {
    if (visitorsOpen && pendingVisitorsFocusRef.current !== null) {
      const idx = pendingVisitorsFocusRef.current;
      pendingVisitorsFocusRef.current = null;
      visitorsItemRefs.current[idx]?.focus();
    }
  }, [visitorsOpen]);

  useLayoutEffect(() => {
    if (globeOpen && pendingGlobeFocusRef.current !== null) {
      const idx = pendingGlobeFocusRef.current;
      pendingGlobeFocusRef.current = null;
      globeItemRefs.current[idx]?.focus();
    }
  }, [globeOpen]);

  const focusVisitorsItem = (index: number) => {
    pendingVisitorsFocusRef.current = index;
  };

  const focusGlobeItem = (index: number) => {
    pendingGlobeFocusRef.current = index;
  };

  const handleVisitorsTriggerKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setGlobeOpen(false);
      setVisitorsOpen(true);
      focusVisitorsItem(0);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setGlobeOpen(false);
      setVisitorsOpen(true);
      focusVisitorsItem(visitorsMenuCount - 1);
    } else if (e.key === 'Escape' && visitorsOpen) {
      e.preventDefault();
      setVisitorsOpen(false);
    }
  };

  const handleVisitorsMenuKeyDown = (
    e: React.KeyboardEvent<HTMLButtonElement>,
    idx: number,
  ) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      setVisitorsOpen(false);
      visitorsTriggerRef.current?.focus();
      return;
    }
    if (e.key === 'Tab') {
      setVisitorsOpen(false);
      return;
    }
    const next = getNextLinearIndex(idx, e.key, visitorsMenuCount, true);
    if (next !== null && (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Home' || e.key === 'End')) {
      e.preventDefault();
      visitorsItemRefs.current[next]?.focus();
    }
  };

  const handleGlobeTriggerKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setVisitorsOpen(false);
      setGlobeOpen(true);
      focusGlobeItem(0);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setVisitorsOpen(false);
      setGlobeOpen(true);
      focusGlobeItem(1);
    } else if (e.key === 'Escape' && globeOpen) {
      e.preventDefault();
      setGlobeOpen(false);
    }
  };

  const handleGlobeMenuKeyDown = (
    e: React.KeyboardEvent<HTMLButtonElement>,
    idx: number,
  ) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      setGlobeOpen(false);
      globeTriggerRef.current?.focus();
      return;
    }
    if (e.key === 'Tab') {
      setGlobeOpen(false);
      return;
    }
    const next = getNextLinearIndex(idx, e.key, 2, true);
    if (next !== null && (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Home' || e.key === 'End')) {
      e.preventDefault();
      globeItemRefs.current[next]?.focus();
    }
  };

  const handleTopNavKeyDown = (
    e: React.KeyboardEvent<HTMLButtonElement>,
    idx: number,
  ) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'Home' && e.key !== 'End') {
      return;
    }
    const next = getNextLinearIndex(idx, e.key, 4, true);
    if (next !== null) {
      e.preventDefault();
      navLinkRefs.current[next]?.focus();
    }
  };

  const shortDisplayName = profile?.displayName?.split(' ')[0] || firebaseUser?.displayName?.split(' ')[0];

  return (
    <header
      className="fixed left-0 top-0 z-50 flex h-[74px] w-full items-center justify-between"
      style={{
        paddingLeft: 'clamp(16px, 9.5vw, 170px)',
        paddingRight: 'clamp(16px, 9.5vw, 170px)',
        backgroundColor: isSolid ? 'rgba(247, 217, 198, 0.96)' : 'transparent',
        backdropFilter: isSolid ? 'blur(14px)' : 'none',
        WebkitBackdropFilter: isSolid ? 'blur(14px)' : 'none',
        color: isSolid ? '#1d1a1c' : 'rgba(255, 255, 255, 0.94)',
        borderBottom: isSolid
          ? '1px solid rgba(29, 26, 28, 0.08)'
          : '1px solid rgba(255, 255, 255, 0.28)',
        transition:
          'background-color 0.5s cubic-bezier(.65,0,.35,1), color 0.5s cubic-bezier(.65,0,.35,1), border-color 0.5s cubic-bezier(.65,0,.35,1)',
      }}
    >
      {/* Left: Brand Logo + Divider + Visitors */}
      <div className="flex items-center">
        <button
          type="button"
          onClick={onReturnHome}
          className={`whitespace-nowrap shrink-0 rounded-[4px] text-[22px] font-light tracking-[-0.01em] transition-opacity hover:opacity-80 sm:text-[26px] ${focusRingClass}`}
        >
          Kemet Travel
        </button>

        <span
          aria-hidden="true"
          className="hidden sm:block"
          style={{
            width: '1px',
            height: '42px',
            marginLeft: '28px',
            marginRight: '28px',
            backgroundColor: 'currentColor',
            opacity: 0.45,
          }}
        />

        <div ref={visitorsRef} className="relative hidden sm:block">
          <button
            ref={visitorsTriggerRef}
            type="button"
            onClick={() => {
              setGlobeOpen(false);
              setVisitorsOpen((prev) => {
                const next = !prev;
                if (next) focusVisitorsItem(0);
                return next;
              });
            }}
            onKeyDown={handleVisitorsTriggerKeyDown}
            aria-haspopup="menu"
            aria-expanded={visitorsOpen}
            aria-controls="visitors-menu"
            className={`flex items-center gap-1.5 whitespace-nowrap shrink-0 rounded-[6px] px-1.5 py-1 text-[12.5px] font-normal tracking-[0.01em] opacity-90 transition-opacity hover:opacity-100 ${focusRingClass}`}
          >
            <span>Visitors</span>
            <ChevronDown className="h-3 w-3 opacity-80" strokeWidth={1.6} />
          </button>

          {visitorsOpen && (
            <div
              id="visitors-menu"
              role="menu"
              aria-label="Visitors quick menu"
              className="animate-popover-drop absolute left-0 top-[calc(100%+18px)] w-[230px] rounded-[16px] bg-white p-2 text-[#1d1a1c]"
              style={{ boxShadow: '0 18px 46px rgba(100, 60, 50, 0.18)' }}
            >
              <button
                ref={(el) => {
                  visitorsItemRefs.current[0] = el;
                }}
                type="button"
                role="menuitem"
                onClick={() => {
                  setVisitorsOpen(false);
                  onNavigateSection('stays-section');
                }}
                onKeyDown={(e) => handleVisitorsMenuKeyDown(e, 0)}
                className="flex w-full items-center justify-between rounded-[10px] px-3 py-2.5 text-left text-[13.5px] font-medium transition-colors hover:bg-[#fdf0e7] focus-visible:bg-[#fdf0e7] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#1d1a1c]"
              >
                <span>Curated Stays</span>
                <span className="text-[11.5px] text-[#8a7f83]">8 retreats</span>
              </button>
              <button
                ref={(el) => {
                  visitorsItemRefs.current[1] = el;
                }}
                type="button"
                role="menuitem"
                onClick={() => {
                  setVisitorsOpen(false);
                  onOpenMenuDrawer('overview');
                }}
                onKeyDown={(e) => handleVisitorsMenuKeyDown(e, 1)}
                className="flex w-full items-center justify-between rounded-[10px] px-3 py-2.5 text-left text-[13.5px] font-medium transition-colors hover:bg-[#fdf0e7] focus-visible:bg-[#fdf0e7] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#1d1a1c]"
              >
                <span>Saved Stays</span>
                <span className="text-[11.5px] text-[#8a7f83] tabular-nums">{savedCount}</span>
              </button>
              <button
                ref={(el) => {
                  visitorsItemRefs.current[2] = el;
                }}
                type="button"
                role="menuitem"
                onClick={() => {
                  setVisitorsOpen(false);
                  onOpenMenuDrawer('bookings');
                }}
                onKeyDown={(e) => handleVisitorsMenuKeyDown(e, 2)}
                className="flex w-full items-center justify-between rounded-[10px] px-3 py-2.5 text-left text-[13.5px] font-medium transition-colors hover:bg-[#fdf0e7] focus-visible:bg-[#fdf0e7] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#1d1a1c]"
              >
                <span>My Bookings</span>
                <span className="text-[11.5px] text-[#8a7f83] tabular-nums">{bookingsCount}</span>
              </button>
              {isAdmin && (
                <button
                  ref={(el) => {
                    visitorsItemRefs.current[3] = el;
                  }}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setVisitorsOpen(false);
                    onOpenSalesPortal();
                  }}
                  onKeyDown={(e) => handleVisitorsMenuKeyDown(e, 3)}
                  className="mt-1 flex w-full items-center justify-between rounded-[10px] border border-[#f39419]/30 bg-[#fdf0e7] px-3 py-2.5 text-left text-[13.5px] font-semibold text-[#1d1a1c] transition-colors hover:bg-[#f7d9c6] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#1d1a1c]"
                >
                  <span>Sales Desk</span>
                  <ShieldCheck className="h-4 w-4 text-[#f39419]" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Centre Nav Links (hidden below 1000px) */}
      <nav
        aria-label="Primary navigation"
        className="hidden items-center gap-[40px] min-[1001px]:flex"
      >
        <button
          ref={(el) => {
            navLinkRefs.current[0] = el;
          }}
          type="button"
          onClick={() => onNavigateSection('stays-section')}
          onKeyDown={(e) => handleTopNavKeyDown(e, 0)}
          className={`nav-wipe-link whitespace-nowrap shrink-0 rounded-[4px] text-[14.5px] font-normal ${focusRingClass}`}
        >
          Stays
        </button>
        <button
          ref={(el) => {
            navLinkRefs.current[1] = el;
          }}
          type="button"
          onClick={() => onNavigateSection('where-to-go-section')}
          onKeyDown={(e) => handleTopNavKeyDown(e, 1)}
          className={`nav-wipe-link whitespace-nowrap shrink-0 rounded-[4px] text-[14.5px] font-normal ${focusRingClass}`}
        >
          Where to go
        </button>
        <button
          ref={(el) => {
            navLinkRefs.current[2] = el;
          }}
          type="button"
          onClick={onOpenContactModal}
          onKeyDown={(e) => handleTopNavKeyDown(e, 2)}
          className={`nav-wipe-link whitespace-nowrap shrink-0 rounded-[4px] text-[14.5px] font-normal ${focusRingClass}`}
        >
          Contact Us
        </button>
      </nav>

      {/* Right side: Become a host + Account/Sales + Globe + Drawer */}
      <div className="flex shrink-0 items-center gap-2.5 sm:gap-4">
        <button
          ref={(el) => {
            navLinkRefs.current[3] = el;
          }}
          type="button"
          onClick={onOpenHostModal}
          onKeyDown={(e) => handleTopNavKeyDown(e, 3)}
          className={`nav-wipe-link hidden whitespace-nowrap shrink-0 rounded-[4px] text-[14px] font-normal min-[1001px]:inline-flex ${focusRingClass}`}
        >
          Become a host
        </button>

        {isAdmin && (
          <button
            type="button"
            onClick={onOpenSalesPortal}
            className={`hidden items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-[12px] font-semibold transition-opacity hover:opacity-90 sm:inline-flex ${focusRingClass}`}
            style={{
              backgroundColor: '#b85c00',
              color: '#ffffff',
            }}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Sales Desk</span>
          </button>
        )}

        {!firebaseUser && (
          <button
            type="button"
            onClick={onOpenAuthModal}
            className={`hidden whitespace-nowrap rounded-[8px] px-2.5 py-1 text-[13px] font-medium transition-opacity hover:opacity-80 sm:inline-flex ${focusRingClass}`}
            style={{ border: '1px solid currentColor' }}
          >
            Sign In
          </button>
        )}

        <div ref={globeRef} className="relative">
          <button
            ref={globeTriggerRef}
            type="button"
            aria-label={`Display currency (${currency})`}
            aria-haspopup="menu"
            aria-expanded={globeOpen}
            aria-controls="currency-menu"
            onClick={() => {
              setVisitorsOpen(false);
              setGlobeOpen((prev) => {
                const next = !prev;
                if (next) focusGlobeItem(0);
                return next;
              });
            }}
            onKeyDown={handleGlobeTriggerKeyDown}
            className={`flex h-9 items-center gap-1.5 rounded-full px-2 transition-opacity hover:opacity-75 ${focusRingClass}`}
          >
            <Globe className="h-[17px] w-[17px]" strokeWidth={1.5} />
            <span className="text-[11.5px] font-semibold tracking-[0.02em]">{currency}</span>
          </button>

          {globeOpen && (
            <div
              id="currency-menu"
              role="menu"
              aria-label="Display currency"
              className="animate-popover-drop absolute right-0 top-[calc(100%+16px)] w-[205px] rounded-[16px] bg-white p-2 text-[#1d1a1c]"
              style={{ boxShadow: '0 18px 46px rgba(100, 60, 50, 0.18)' }}
            >
              <div className="px-3 py-1.5 text-[11px] font-medium text-[#8a7f83]">
                Display currency
              </div>
              <button
                ref={(el) => {
                  globeItemRefs.current[0] = el;
                }}
                type="button"
                role="menuitemradio"
                aria-checked={currency === 'EGP'}
                onClick={() => {
                  onChangeCurrency('EGP');
                  setGlobeOpen(false);
                  globeTriggerRef.current?.focus();
                }}
                onKeyDown={(e) => handleGlobeMenuKeyDown(e, 0)}
                className={`flex w-full items-center justify-between rounded-[10px] px-3 py-2 text-[13.5px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#1d1a1c] ${
                  currency === 'EGP' ? 'bg-[#1d1a1c] text-white' : 'hover:bg-[#fdf0e7]'
                }`}
              >
                <span>Egypt (EGP)</span>
                <span className="font-semibold">EGP</span>
              </button>
              <button
                ref={(el) => {
                  globeItemRefs.current[1] = el;
                }}
                type="button"
                role="menuitemradio"
                aria-checked={currency === 'USD'}
                onClick={() => {
                  onChangeCurrency('USD');
                  setGlobeOpen(false);
                  globeTriggerRef.current?.focus();
                }}
                onKeyDown={(e) => handleGlobeMenuKeyDown(e, 1)}
                className={`mt-1 flex w-full items-center justify-between rounded-[10px] px-3 py-2 text-[13.5px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#1d1a1c] ${
                  currency === 'USD' ? 'bg-[#1d1a1c] text-white' : 'hover:bg-[#fdf0e7]'
                }`}
              >
                <span>International (USD)</span>
                <span className="font-semibold">$</span>
              </button>
            </div>
          )}
        </div>

        <button
          type="button"
          aria-label={
            firebaseUser
              ? `Open account and guest menu (${shortDisplayName || 'Signed in'})`
              : 'Open guest menu'
          }
          onClick={() => onOpenMenuDrawer(firebaseUser ? 'account' : 'overview')}
          className={`flex h-9 items-center gap-2 rounded-[9px] px-2.5 transition-opacity hover:opacity-80 ${focusRingClass}`}
          style={{
            border: '1.5px solid currentColor',
          }}
        >
          <Menu className="h-4 w-4" strokeWidth={1.75} />
          {shortDisplayName && (
            <span className="hidden max-w-[78px] truncate text-[12px] font-medium md:inline">
              {shortDisplayName}
            </span>
          )}
          <span
            className="flex h-[22px] w-[22px] items-center justify-center rounded-full"
            style={{
              backgroundColor: 'currentColor',
            }}
          >
            <User
              className="h-3 w-3"
              style={{
                color: isSolid ? '#f7d9c6' : '#3d3035',
              }}
              strokeWidth={2}
            />
          </span>
        </button>
      </div>
    </header>
  );
}
