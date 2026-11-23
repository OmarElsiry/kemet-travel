import { useRef } from 'react';
import { EGYPT_DISTRICTS, type StayProperty } from '../data/egyptData';
import {
  getGridColumnCount,
  getNextGridIndex,
  getNextLinearIndex,
  type CurrencyCode,
} from '../utils/bookingLogic';
import { StayCard, StayCardSkeleton } from './StayCard';

interface RecommendedStaysSectionProps {
  stays: StayProperty[];
  totalCount: number;
  isLoading: boolean;
  selectedDistrict: string;
  onSelectDistrict: (districtKey: string) => void;
  showFilterBar: boolean;
  onToggleFilterBar: () => void;
  currency: CurrencyCode;
  favorites: string[];
  onToggleFavorite: (stayId: string) => void;
  onSelectStay: (stay: StayProperty, rect: DOMRect) => void;
  onResetFilters: () => void;
}

export function RecommendedStaysSection({
  stays,
  totalCount,
  isLoading,
  selectedDistrict,
  onSelectDistrict,
  showFilterBar,
  onToggleFilterBar,
  currency,
  favorites,
  onToggleFavorite,
  onSelectStay,
  onResetFilters,
}: RecommendedStaysSectionProps) {
  const filterButtonsRef = useRef<Array<HTMLButtonElement | null>>([]);
  const cardButtonsRef = useRef<Array<HTMLButtonElement | null>>([]);

  const isFiltered = stays.length !== totalCount || selectedDistrict !== 'all';
  const skeletonCount = selectedDistrict === 'all' ? totalCount : 4;

  const handleFilterKeyDown = (
    e: React.KeyboardEvent<HTMLButtonElement>,
    idx: number,
  ) => {
    const next = getNextLinearIndex(idx, e.key, EGYPT_DISTRICTS.length, true);
    if (next !== null) {
      e.preventDefault();
      filterButtonsRef.current[next]?.focus();
    }
  };

  const handleCardGridKeyDown = (
    e: React.KeyboardEvent<HTMLButtonElement>,
    idx: number,
  ) => {
    const columns = getGridColumnCount(
      typeof window !== 'undefined' ? window.innerWidth : 1440,
    );
    const next = getNextGridIndex(idx, e.key, stays.length, columns);
    if (next !== null) {
      e.preventDefault();
      cardButtonsRef.current[next]?.focus();
    }
  };

  return (
    <section
      id="stays-section"
      aria-labelledby="recommended-heading"
      className="relative z-[15] -mt-[6vh] scroll-mt-[92px] pb-16 sm:-mt-[17vh] sm:pb-24"
      style={{
        paddingLeft: 'clamp(16px, 9.5vw, 170px)',
        paddingRight: 'clamp(16px, 9.5vw, 170px)',
      }}
    >
      {/* Screen-reader live status announcement */}
      <div className="sr-only" aria-live="polite">
        {isLoading
          ? 'Loading Egypt stays'
          : `Showing ${stays.length} of ${totalCount} Egypt stays`}
      </div>

      {/* Header Row */}
      <div className="mb-7 flex items-center justify-between gap-3">
        <div className="flex flex-wrap items-baseline gap-2 sm:gap-3">
          <h2
            id="recommended-heading"
            className="font-display-serif font-normal text-[#1d1a1c]"
            style={{
              fontSize: 'clamp(22px, 2.45vw, 36px)',
              lineHeight: 1.15,
            }}
          >
            Recommended Places to Stay
          </h2>
          {isFiltered && !isLoading && (
            <span className="text-[13.5px] font-medium text-[#5c5156] tabular-nums">
              · {stays.length} of {totalCount}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => {
            if (isFiltered) {
              onResetFilters();
            } else {
              onToggleFilterBar();
            }
          }}
          aria-expanded={!isFiltered ? showFilterBar : undefined}
          className="whitespace-nowrap shrink-0 rounded-[20px] px-5 py-2 text-[13.5px] font-medium text-[#1d1a1c] transition-colors duration-250 hover:bg-[#1d1a1c] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d1a1c]"
          style={{
            border: '1.4px solid #1d1a1c',
          }}
        >
          {isFiltered ? 'Show All' : showFilterBar ? 'Hide Filters' : 'See All'}
        </button>
      </div>

      {/* Expandable Region Filter Strip */}
      {showFilterBar && (
        <div
          role="toolbar"
          aria-label="Filter stays by Egyptian region"
          className="animate-popover-drop mb-7 flex flex-wrap items-center gap-2 border-b border-[#1d1a1c]/10 pb-5"
        >
          {EGYPT_DISTRICTS.map((district, idx) => {
            const active = selectedDistrict === district.key;
            return (
              <button
                key={district.key}
                ref={(el) => {
                  filterButtonsRef.current[idx] = el;
                }}
                type="button"
                aria-pressed={active}
                onClick={() => onSelectDistrict(district.key)}
                onKeyDown={(e) => handleFilterKeyDown(e, idx)}
                className={`whitespace-nowrap rounded-[20px] px-3.5 py-1.5 text-[13px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d1a1c] ${
                  active
                    ? 'bg-[#1d1a1c] text-white'
                    : 'bg-white/65 text-[#5c5156] hover:bg-white hover:text-[#1d1a1c]'
                }`}
              >
                {district.label}
              </button>
            );
          })}
        </div>
      )}

      {/* 4x2 Card Grid (2 cols <= 1000px) with Skeleton Loading State */}
      {isLoading ? (
        <div
          data-testid="stays-skeleton-grid"
          aria-busy="true"
          aria-label="Loading recommended Egypt stays"
          className="grid grid-cols-1 min-[375px]:grid-cols-2 min-[1001px]:grid-cols-4"
          style={{
            gap: 'clamp(12px, 2.2vw, 30px)',
          }}
        >
          {Array.from({ length: skeletonCount }).map((_, idx) => (
            <StayCardSkeleton key={idx} index={idx} />
          ))}
        </div>
      ) : stays.length > 0 ? (
        <div
          role="region"
          aria-label="Recommended Egypt stays grid. Use arrow keys to move between properties and F to favorite."
          className="grid grid-cols-1 min-[375px]:grid-cols-2 min-[1001px]:grid-cols-4"
          style={{
            gap: 'clamp(12px, 2.2vw, 30px)',
          }}
        >
          {stays.map((stay, idx) => (
            <StayCard
              key={stay.id}
              stay={stay}
              currency={currency}
              isFavorite={favorites.includes(stay.id)}
              onToggleFavorite={onToggleFavorite}
              onSelect={onSelectStay}
              columnIndex={idx}
              immediate
              cardButtonRef={(el) => {
                cardButtonsRef.current[idx] = el;
              }}
              onGridKeyDown={(e) => handleCardGridKeyDown(e, idx)}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-[18px] bg-white/75 px-6 py-12 text-center">
          <p className="font-display-serif text-[24px] text-[#1d1a1c]">
            No retreats match that exact capacity in this region.
          </p>
          <p className="mt-2 text-[14.5px] text-[#5c5156]">
            Try clearing the destination or guest count filter to browse all eight Egyptian sanctuaries.
          </p>
          <button
            type="button"
            onClick={onResetFilters}
            className="mt-5 rounded-[20px] bg-[#1d1a1c] px-6 py-2.5 text-[13.5px] font-medium text-white transition-opacity hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d1a1c]"
          >
            Reset Filters
          </button>
        </div>
      )}
    </section>
  );
}
