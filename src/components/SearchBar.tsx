import { Calendar, ChevronLeft, ChevronRight, MapPin, Minus, Plus, Send, Users } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { EGYPT_DISTRICTS } from '../data/egyptData';
import {
  applyDateSelection,
  buildCalendarMonth,
  formatGuestSummary,
  formatMonthYear,
  formatShortDate,
  getNextGridIndex,
  getNextLinearIndex,
  type DateRange,
  type GuestCounts,
} from '../utils/bookingLogic';

type ActiveField = 'destination' | 'checkIn' | 'checkOut' | 'visitors';
type OpenPopover = 'destination' | 'calendar' | 'visitors' | null;

interface SearchBarProps {
  selectedDistrict: string;
  onSelectDistrict: (districtKey: string) => void;
  dateRange: DateRange;
  onChangeDateRange: (range: DateRange) => void;
  guests: GuestCounts;
  onChangeGuests: (guests: GuestCounts) => void;
  onSubmitSearch: () => void;
}

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

export function SearchBar({
  selectedDistrict,
  onSelectDistrict,
  dateRange,
  onChangeDateRange,
  guests,
  onChangeGuests,
  onSubmitSearch,
}: SearchBarProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const fieldButtonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const districtButtonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const calendarDayRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const visitorsFirstControlRef = useRef<HTMLButtonElement | null>(null);
  const pendingPopoverFocusRef = useRef<OpenPopover>(null);

  const [activeField, setActiveField] = useState<ActiveField>('checkIn');
  const [hoveredField, setHoveredField] = useState<ActiveField | null>(null);
  const [openPopover, setOpenPopover] = useState<OpenPopover>(null);
  const [calendarFocus, setCalendarFocus] = useState<'checkIn' | 'checkOut'>('checkIn');
  const [viewMonth, setViewMonth] = useState({ year: 2026, month: 11 });

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpenPopover(null);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const currentDistrictLabel =
    selectedDistrict === 'all'
      ? 'Choose region'
      : EGYPT_DISTRICTS.find((d) => d.key === selectedDistrict)?.label || 'Choose region';

  const cells = buildCalendarMonth(
    viewMonth.year,
    viewMonth.month,
    dateRange,
    calendarFocus,
    new Date(2026, 10, 1),
  );

  useLayoutEffect(() => {
    if (!openPopover || pendingPopoverFocusRef.current !== openPopover) return;
    pendingPopoverFocusRef.current = null;
    if (openPopover === 'destination') {
      const activeIdx = Math.max(
        0,
        EGYPT_DISTRICTS.findIndex((d) => d.key === selectedDistrict),
      );
      districtButtonRefs.current[activeIdx]?.focus();
    } else if (openPopover === 'calendar') {
      const enabledIdx = cells.findIndex(
        (c) => c.isCurrentMonth && !c.isDisabled && (c.isCheckIn || c.isCheckOut),
      );
      if (enabledIdx >= 0) {
        calendarDayRefs.current[enabledIdx]?.focus();
        return;
      }
      const firstEnabled = cells.findIndex((c) => c.isCurrentMonth && !c.isDisabled);
      if (firstEnabled >= 0) {
        calendarDayRefs.current[firstEnabled]?.focus();
      }
    } else if (openPopover === 'visitors') {
      visitorsFirstControlRef.current?.focus();
    }
  }, [openPopover, selectedDistrict, cells]);

  const closePopoverAndRestoreFocus = (popover: OpenPopover) => {
    setOpenPopover(null);
    if (popover === 'destination') {
      fieldButtonRefs.current[0]?.focus();
    } else if (popover === 'calendar') {
      const idx = activeField === 'checkOut' ? 2 : 1;
      fieldButtonRefs.current[idx]?.focus();
    } else if (popover === 'visitors') {
      fieldButtonRefs.current[3]?.focus();
    }
  };

  const focusFirstAvailableCalendarDay = () => {
    pendingPopoverFocusRef.current = 'calendar';
  };

  const handleDayClick = (date: Date) => {
    const { nextRange, completedCheckout } = applyDateSelection(
      dateRange,
      date,
      calendarFocus,
    );
    onChangeDateRange(nextRange);

    if (completedCheckout) {
      setActiveField('visitors');
      pendingPopoverFocusRef.current = 'visitors';
      setOpenPopover('visitors');
    } else {
      setCalendarFocus('checkOut');
      setActiveField('checkOut');
    }
  };

  const shiftMonth = (delta: number) => {
    setViewMonth((prev) => {
      const next = new Date(prev.year, prev.month + delta, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });
  };

  const handleToolbarKeyDown = (
    e: React.KeyboardEvent<HTMLButtonElement>,
    idx: number,
  ) => {
    if (e.key === 'Escape' && openPopover) {
      e.preventDefault();
      closePopoverAndRestoreFocus(openPopover);
      return;
    }

    if (e.key === 'ArrowDown') {
      if (idx === 0) {
        e.preventDefault();
        setActiveField('destination');
        pendingPopoverFocusRef.current = 'destination';
        setOpenPopover('destination');
        return;
      }
      if (idx === 1 || idx === 2) {
        e.preventDefault();
        const mode = idx === 2 && dateRange.checkIn ? 'checkOut' : 'checkIn';
        setActiveField(idx === 2 ? 'checkOut' : 'checkIn');
        setCalendarFocus(mode);
        pendingPopoverFocusRef.current = 'calendar';
        setOpenPopover('calendar');
        return;
      }
      if (idx === 3) {
        e.preventDefault();
        setActiveField('visitors');
        pendingPopoverFocusRef.current = 'visitors';
        setOpenPopover('visitors');
        return;
      }
    }

    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'Home' || e.key === 'End') {
      const next = getNextLinearIndex(idx, e.key, 5, true);
      if (next !== null) {
        e.preventDefault();
        fieldButtonRefs.current[next]?.focus();
      }
    }
  };

  const handleDistrictGridKeyDown = (
    e: React.KeyboardEvent<HTMLButtonElement>,
    idx: number,
  ) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      closePopoverAndRestoreFocus('destination');
      return;
    }
    const next = getNextGridIndex(idx, e.key, EGYPT_DISTRICTS.length, 2);
    if (next !== null) {
      e.preventDefault();
      districtButtonRefs.current[next]?.focus();
    }
  };

  const findNextEnabledCellIndex = (startIdx: number, step: number): number | null => {
    let cursor = startIdx + step;
    while (cursor >= 0 && cursor < cells.length) {
      const cell = cells[cursor];
      if (cell.isCurrentMonth && !cell.isDisabled) {
        return cursor;
      }
      cursor += step;
    }
    return null;
  };

  const handleCalendarDayKeyDown = (
    e: React.KeyboardEvent<HTMLButtonElement>,
    idx: number,
  ) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      closePopoverAndRestoreFocus('calendar');
      return;
    }
    if (e.key === 'PageUp') {
      e.preventDefault();
      shiftMonth(-1);
      window.requestAnimationFrame(() => {
        const firstEnabled = calendarDayRefs.current.find((btn) => btn && !btn.disabled);
        firstEnabled?.focus();
      });
      return;
    }
    if (e.key === 'PageDown') {
      e.preventDefault();
      shiftMonth(1);
      window.requestAnimationFrame(() => {
        const firstEnabled = calendarDayRefs.current.find((btn) => btn && !btn.disabled);
        firstEnabled?.focus();
      });
      return;
    }

    let targetIdx: number | null = null;
    if (e.key === 'ArrowRight') {
      targetIdx = findNextEnabledCellIndex(idx, 1);
    } else if (e.key === 'ArrowLeft') {
      targetIdx = findNextEnabledCellIndex(idx, -1);
    } else if (e.key === 'ArrowDown') {
      targetIdx = findNextEnabledCellIndex(idx, 7);
    } else if (e.key === 'ArrowUp') {
      targetIdx = findNextEnabledCellIndex(idx, -7);
    } else if (e.key === 'Home') {
      const rowStart = Math.floor(idx / 7) * 7;
      for (let i = rowStart; i < rowStart + 7 && i < cells.length; i++) {
        if (cells[i].isCurrentMonth && !cells[i].isDisabled) {
          targetIdx = i;
          break;
        }
      }
    } else if (e.key === 'End') {
      const rowEnd = Math.min(cells.length - 1, Math.floor(idx / 7) * 7 + 6);
      for (let i = rowEnd; i >= Math.floor(idx / 7) * 7; i--) {
        if (cells[i].isCurrentMonth && !cells[i].isDisabled) {
          targetIdx = i;
          break;
        }
      }
    }

    if (targetIdx !== null) {
      e.preventDefault();
      calendarDayRefs.current[targetIdx]?.focus();
    }
  };

  const handlePopoverKeyDown = (
    e: React.KeyboardEvent<HTMLDivElement>,
    popover: OpenPopover,
  ) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      closePopoverAndRestoreFocus(popover);
    }
  };

  const isRaised = (field: ActiveField) =>
    activeField === field || hoveredField === field;

  return (
    <div
      ref={containerRef}
      role="search"
      aria-label="Search Egypt stays"
      className="animate-search-intro absolute left-1/2 z-[25] w-[min(900px,calc(100%-24px))] bottom-[18vh] sm:w-[min(900px,calc(100%-40px))] sm:bottom-[calc(20vh+2px)] [@media(max-height:500px)]:bottom-6"
    >
      {/* Main white bar */}
      <div
        className="relative grid grid-cols-2 items-center gap-1 rounded-[24px] p-2 sm:flex sm:h-[90px] sm:gap-1 sm:rounded-[26px] sm:px-3 sm:py-2.5"
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.94)',
          boxShadow: '0 18px 60px rgba(120, 70, 60, 0.16)',
        }}
      >
        {/* 1. Egypt / Destination */}
        <button
          ref={(el) => {
            fieldButtonRefs.current[0] = el;
          }}
          type="button"
          aria-haspopup="dialog"
          aria-expanded={openPopover === 'destination'}
          onMouseEnter={() => setHoveredField('destination')}
          onMouseLeave={() => setHoveredField(null)}
          onKeyDown={(e) => handleToolbarKeyDown(e, 0)}
          onClick={() => {
            setActiveField('destination');
            setOpenPopover((p) => (p === 'destination' ? null : 'destination'));
          }}
          className="flex h-[62px] items-center gap-2 rounded-[14px] px-2.5 text-left transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d1a1c] sm:h-[72px] sm:flex-[1.35] sm:gap-3 sm:px-4"
          style={{
            backgroundColor: isRaised('destination') ? '#ffffff' : 'transparent',
            boxShadow: isRaised('destination')
              ? '0 8px 24px rgba(120, 80, 70, 0.14)'
              : 'none',
          }}
        >
          <MapPin className="h-4 w-4 shrink-0 text-[#5c5156]" strokeWidth={1.6} />
          <div className="min-w-0">
            <div className="truncate font-urbanist text-[16px] font-medium leading-tight text-[#1d1a1c] sm:text-[21px]">
              Egypt
            </div>
            <div className="truncate text-[11px] font-normal text-[#8a7f83] sm:text-[13px]">
              {currentDistrictLabel}
            </div>
          </div>
        </button>

        {/* 2. Check in */}
        <button
          ref={(el) => {
            fieldButtonRefs.current[1] = el;
          }}
          type="button"
          aria-haspopup="dialog"
          aria-expanded={openPopover === 'calendar' && calendarFocus === 'checkIn'}
          onMouseEnter={() => setHoveredField('checkIn')}
          onMouseLeave={() => setHoveredField(null)}
          onKeyDown={(e) => handleToolbarKeyDown(e, 1)}
          onClick={() => {
            setActiveField('checkIn');
            setCalendarFocus('checkIn');
            setOpenPopover('calendar');
          }}
          className="flex h-[62px] items-center gap-2 rounded-[14px] px-2.5 text-left transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d1a1c] sm:h-[72px] sm:flex-1 sm:gap-3 sm:px-4"
          style={{
            backgroundColor: isRaised('checkIn') ? '#ffffff' : 'transparent',
            boxShadow: isRaised('checkIn')
              ? '0 8px 24px rgba(120, 80, 70, 0.14)'
              : 'none',
          }}
        >
          <Calendar className="h-4 w-4 shrink-0 text-[#5c5156]" strokeWidth={1.6} />
          <div className="min-w-0">
            <div className="truncate font-urbanist text-[16px] font-medium leading-tight text-[#1d1a1c] sm:text-[21px]">
              Check in
            </div>
            <div className="truncate text-[11.5px] font-normal text-[#8a7f83] sm:text-[13px]">
              {formatShortDate(dateRange.checkIn, 'Add date')}
            </div>
          </div>
        </button>

        {/* 3. Check out */}
        <button
          ref={(el) => {
            fieldButtonRefs.current[2] = el;
          }}
          type="button"
          aria-haspopup="dialog"
          aria-expanded={openPopover === 'calendar' && calendarFocus === 'checkOut'}
          onMouseEnter={() => setHoveredField('checkOut')}
          onMouseLeave={() => setHoveredField(null)}
          onKeyDown={(e) => handleToolbarKeyDown(e, 2)}
          onClick={() => {
            setActiveField('checkOut');
            setCalendarFocus(dateRange.checkIn ? 'checkOut' : 'checkIn');
            setOpenPopover('calendar');
          }}
          className="flex h-[62px] items-center gap-2 rounded-[14px] px-2.5 text-left transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d1a1c] sm:h-[72px] sm:flex-1 sm:gap-3 sm:px-4"
          style={{
            backgroundColor: isRaised('checkOut') ? '#ffffff' : 'transparent',
            boxShadow: isRaised('checkOut')
              ? '0 8px 24px rgba(120, 80, 70, 0.14)'
              : 'none',
          }}
        >
          <Calendar className="h-4 w-4 shrink-0 text-[#5c5156]" strokeWidth={1.6} />
          <div className="min-w-0">
            <div className="truncate font-urbanist text-[16px] font-medium leading-tight text-[#1d1a1c] sm:text-[21px]">
              Check out
            </div>
            <div className="truncate text-[11.5px] font-normal text-[#8a7f83] sm:text-[13px]">
              {formatShortDate(dateRange.checkOut, 'Add date')}
            </div>
          </div>
        </button>

        {/* 4. Visitors */}
        <button
          ref={(el) => {
            fieldButtonRefs.current[3] = el;
          }}
          type="button"
          aria-haspopup="dialog"
          aria-expanded={openPopover === 'visitors'}
          onMouseEnter={() => setHoveredField('visitors')}
          onMouseLeave={() => setHoveredField(null)}
          onKeyDown={(e) => handleToolbarKeyDown(e, 3)}
          onClick={() => {
            setActiveField('visitors');
            setOpenPopover((p) => (p === 'visitors' ? null : 'visitors'));
          }}
          className="flex h-[62px] items-center gap-2 rounded-[14px] px-2.5 text-left transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d1a1c] sm:h-[72px] sm:flex-1 sm:gap-3 sm:px-4"
          style={{
            backgroundColor: isRaised('visitors') ? '#ffffff' : 'transparent',
            boxShadow: isRaised('visitors')
              ? '0 8px 24px rgba(120, 80, 70, 0.14)'
              : 'none',
          }}
        >
          <Users className="h-4 w-4 shrink-0 text-[#5c5156]" strokeWidth={1.6} />
          <div className="min-w-0">
            <div className="truncate font-urbanist text-[16px] font-medium leading-tight text-[#1d1a1c] sm:text-[21px]">
              Visitors
            </div>
            <div className="truncate text-[11.5px] font-normal text-[#8a7f83] sm:text-[13px]">
              {formatGuestSummary(guests)}
            </div>
          </div>
        </button>

        {/* Send button */}
        <button
          ref={(el) => {
            fieldButtonRefs.current[4] = el;
          }}
          type="button"
          aria-label="Search Egypt stays"
          onKeyDown={(e) => handleToolbarKeyDown(e, 4)}
          onClick={() => {
            setOpenPopover(null);
            onSubmitSearch();
          }}
          className="col-span-2 mt-1 flex h-11 w-full shrink-0 items-center justify-center rounded-[11px] bg-[#1d1a1c] text-white transition-transform duration-200 hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d1a1c] sm:col-span-1 sm:mt-0 sm:ml-2 sm:mr-2 sm:h-[40px] sm:w-[40px] sm:hover:scale-110 sm:hover:-rotate-8"
        >
          <Send className="h-4 w-4" strokeWidth={1.8} />
        </button>
      </div>

      {/* Egypt Destinations Popover */}
      {openPopover === 'destination' && (
        <div
          role="dialog"
          aria-label="Choose Egypt destination"
          onKeyDown={(e) => handlePopoverKeyDown(e, 'destination')}
          className="animate-popover-drop absolute left-0 top-[calc(100%+10px)] z-30 w-[min(310px,calc(100vw-24px))] rounded-[18px] bg-white p-4 text-[#1d1a1c]"
          style={{ boxShadow: '0 22px 54px rgba(90, 50, 45, 0.22)' }}
        >
          <div className="mb-2.5 text-[12px] font-semibold uppercase tracking-[0.06em] text-[#8a7f83]">
            Egypt Destinations
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {EGYPT_DISTRICTS.map((dist, idx) => {
              const active = selectedDistrict === dist.key;
              return (
                <button
                  key={dist.key}
                  ref={(el) => {
                    districtButtonRefs.current[idx] = el;
                  }}
                  type="button"
                  aria-pressed={active}
                  onKeyDown={(e) => handleDistrictGridKeyDown(e, idx)}
                  onClick={() => {
                    onSelectDistrict(dist.key);
                    setActiveField('checkIn');
                    setCalendarFocus('checkIn');
                    setOpenPopover('calendar');
                    focusFirstAvailableCalendarDay();
                  }}
                  className={`rounded-[10px] px-3 py-2 text-left text-[13px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#1d1a1c] ${
                    active
                      ? 'bg-[#1d1a1c] text-white'
                      : 'text-[#1d1a1c] hover:bg-[#fbe7da]'
                  }`}
                >
                  {dist.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Calendar Popover */}
      {openPopover === 'calendar' && (
        <div
          role="dialog"
          aria-label="Choose check-in and check-out dates"
          onKeyDown={(e) => handlePopoverKeyDown(e, 'calendar')}
          className="animate-popover-drop absolute left-1/2 top-[calc(100%+10px)] z-30 w-[min(300px,calc(100vw-24px))] -translate-x-1/2 rounded-[18px] bg-white p-3.5 text-[#1d1a1c] sm:left-[48%] sm:p-4"
          style={{ boxShadow: '0 24px 64px rgba(90, 50, 45, 0.24)' }}
        >
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              aria-label="Previous month"
              onClick={() => shiftMonth(-1)}
              className="flex h-8 w-8 items-center justify-center rounded-full text-[#5c5156] transition-colors hover:bg-[#fbe7da] hover:text-[#1d1a1c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d1a1c]"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="font-urbanist text-[15px] font-semibold text-[#1d1a1c]">
              {formatMonthYear(viewMonth.year, viewMonth.month)}
            </div>
            <button
              type="button"
              aria-label="Next month"
              onClick={() => shiftMonth(1)}
              className="flex h-8 w-8 items-center justify-center rounded-full text-[#5c5156] transition-colors hover:bg-[#fbe7da] hover:text-[#1d1a1c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d1a1c]"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="mb-1 grid grid-cols-7 text-center text-[11px] font-medium text-[#8a7f83]">
            {WEEKDAYS.map((d) => (
              <div key={d} className="h-[22px] leading-[22px]">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-y-0.5">
            {cells.map((cell, idx) => {
              const isEndpoint = cell.isCheckIn || cell.isCheckOut;
              return (
                <button
                  key={`${cell.date.toISOString()}-${idx}`}
                  ref={(el) => {
                    calendarDayRefs.current[idx] = el;
                  }}
                  type="button"
                  disabled={cell.isDisabled}
                  onClick={() => handleDayClick(cell.date)}
                  onKeyDown={(e) => handleCalendarDayKeyDown(e, idx)}
                  aria-label={cell.date.toDateString()}
                  aria-pressed={isEndpoint}
                  className={`flex h-[30px] w-full items-center justify-center text-[13px] font-medium tabular-nums transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#1d1a1c] ${
                    !cell.isCurrentMonth
                      ? 'pointer-events-none opacity-0'
                      : isEndpoint
                        ? 'rounded-[9px] bg-[#1d1a1c] text-white'
                        : cell.isInRange
                          ? 'bg-[#fbe7da] text-[#1d1a1c]'
                          : cell.isDisabled
                            ? 'cursor-not-allowed text-[#8a7f83]/45'
                            : 'rounded-[9px] text-[#1d1a1c] hover:bg-[#f7d9c6]'
                  }`}
                >
                  {cell.dayNumber}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Visitors Popover */}
      {openPopover === 'visitors' && (
        <div
          role="dialog"
          aria-label="Select guests"
          onKeyDown={(e) => handlePopoverKeyDown(e, 'visitors')}
          className="animate-popover-drop absolute right-0 top-[calc(100%+10px)] z-30 w-[min(290px,calc(100vw-24px))] rounded-[18px] bg-white p-5 text-[#1d1a1c] sm:right-12"
          style={{ boxShadow: '0 24px 64px rgba(90, 50, 45, 0.24)' }}
        >
          <div className="flex items-center justify-between py-2">
            <div>
              <div className="text-[15px] font-semibold text-[#1d1a1c]">Adults</div>
              <div className="text-[12.5px] text-[#8a7f83]">Ages 13 or above</div>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                aria-label="Decrease adults"
                disabled={guests.adults <= 1}
                onClick={() =>
                  onChangeGuests({
                    ...guests,
                    adults: Math.max(1, guests.adults - 1),
                  })
                }
                className="flex h-8 w-8 items-center justify-center rounded-full border border-[#1d1a1c]/20 text-[#1d1a1c] transition-colors hover:border-[#1d1a1c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d1a1c] disabled:opacity-35"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="w-5 text-center text-[15px] font-semibold tabular-nums">
                {guests.adults}
              </span>
              <button
                ref={visitorsFirstControlRef}
                type="button"
                aria-label="Increase adults"
                onClick={() =>
                  onChangeGuests({
                    ...guests,
                    adults: Math.min(8, guests.adults + 1),
                  })
                }
                className="flex h-8 w-8 items-center justify-center rounded-full border border-[#1d1a1c]/20 text-[#1d1a1c] transition-colors hover:border-[#1d1a1c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d1a1c]"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="my-2 h-[1px] bg-[#1d1a1c]/8" />

          <div className="flex items-center justify-between py-2">
            <div>
              <div className="text-[15px] font-semibold text-[#1d1a1c]">Children</div>
              <div className="text-[12.5px] text-[#8a7f83]">Ages 2–12</div>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                aria-label="Decrease children"
                disabled={guests.children <= 0}
                onClick={() =>
                  onChangeGuests({
                    ...guests,
                    children: Math.max(0, guests.children - 1),
                  })
                }
                className="flex h-8 w-8 items-center justify-center rounded-full border border-[#1d1a1c]/20 text-[#1d1a1c] transition-colors hover:border-[#1d1a1c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d1a1c] disabled:opacity-35"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="w-5 text-center text-[15px] font-semibold tabular-nums">
                {guests.children}
              </span>
              <button
                type="button"
                aria-label="Increase children"
                onClick={() =>
                  onChangeGuests({
                    ...guests,
                    children: Math.min(6, guests.children + 1),
                  })
                }
                className="flex h-8 w-8 items-center justify-center rounded-full border border-[#1d1a1c]/20 text-[#1d1a1c] transition-colors hover:border-[#1d1a1c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d1a1c]"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="mt-3 flex justify-end border-t border-[#1d1a1c]/8 pt-3">
            <button
              type="button"
              onClick={() => {
                setOpenPopover(null);
                fieldButtonRefs.current[4]?.focus();
              }}
              className="rounded-[10px] bg-[#1d1a1c] px-4 py-1.5 text-[13px] font-medium text-white transition-opacity hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d1a1c]"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
