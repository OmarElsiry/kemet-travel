import { Heart, MapPin, Star } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { StayProperty } from '../data/egyptData';
import { formatPrice, type CurrencyCode } from '../utils/bookingLogic';

interface StayCardProps {
  stay: StayProperty;
  currency: CurrencyCode;
  isFavorite: boolean;
  onToggleFavorite: (stayId: string) => void;
  onSelect: (stay: StayProperty, rect: DOMRect) => void;
  columnIndex: number;
  immediate?: boolean;
  cardButtonRef?: (el: HTMLButtonElement | null) => void;
  onGridKeyDown?: (e: React.KeyboardEvent<HTMLButtonElement>) => void;
}

export function StayCardSkeleton({ index = 0 }: { index?: number }) {
  const delayMs = (index % 4) * 70;
  return (
    <div
      data-testid="stay-card-skeleton"
      aria-hidden="true"
      className="relative aspect-[203/268] w-full overflow-hidden rounded-[12px] bg-[#ead0be]/85"
      style={{
        boxShadow: '0 12px 30px rgba(110, 60, 50, 0.1)',
        animationDelay: `${delayMs}ms`,
      }}
    >
      <div className="skeleton-shimmer absolute inset-0" />
      <div className="absolute left-3 top-3 h-[22px] w-[86px] rounded-[6px] bg-white/70" />
      <div className="absolute right-3 top-3 h-[30px] w-[30px] rounded-full bg-white/75" />
      <div className="absolute bottom-3.5 left-3.5 right-3.5 space-y-2">
        <div className="h-4 w-4/5 rounded-[5px] bg-white/65" />
        <div className="h-3 w-3/5 rounded-[5px] bg-white/50" />
        <div className="h-3 w-2/5 rounded-[5px] bg-white/45" />
      </div>
    </div>
  );
}

export function StayCard({
  stay,
  currency,
  isFavorite,
  onToggleFavorite,
  onSelect,
  columnIndex,
  immediate = false,
  cardButtonRef,
  onGridKeyDown,
}: StayCardProps) {
  const cardRef = useRef<HTMLElement>(null);
  const [inView, setInView] = useState(immediate);
  const [heartAnimating, setHeartAnimating] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    if (immediate) {
      setInView(true);
      return;
    }
    const el = cardRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [immediate]);

  const handleOpen = () => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    onSelect(stay, rect);
  };

  const handleHeart = () => {
    setHeartAnimating(true);
    onToggleFavorite(stay.id);
    window.setTimeout(() => setHeartAnimating(false), 380);
  };

  const handleCardKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'f' || e.key === 'F') {
      e.preventDefault();
      handleHeart();
      return;
    }
    onGridKeyDown?.(e);
  };

  const staggerMs = (columnIndex % 4) * 90;

  return (
    <article
      ref={cardRef}
      data-testid={`stay-card-${stay.id}`}
      className="group relative aspect-[203/268] w-full overflow-hidden rounded-[12px] bg-[#ead0be] transition-all duration-500 hover:-translate-y-[6px] focus-within:-translate-y-[4px]"
      style={{
        boxShadow: '0 12px 30px rgba(110, 60, 50, 0.16)',
        opacity: inView ? 1 : 0,
        transform: inView ? undefined : 'translateY(40px)',
        transition: `opacity 0.7s cubic-bezier(.16,1,.3,1) ${staggerMs}ms, transform 0.7s cubic-bezier(.16,1,.3,1) ${staggerMs}ms, box-shadow 0.45s cubic-bezier(.16,1,.3,1)`,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 22px 44px rgba(100, 50, 42, 0.24)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = '0 12px 30px rgba(110, 60, 50, 0.16)';
      }}
    >
      {/* Full-card clickable button */}
      <button
        ref={cardButtonRef}
        type="button"
        onClick={handleOpen}
        onKeyDown={handleCardKeyDown}
        aria-keyshortcuts="f"
        aria-label={`View ${stay.name} in ${stay.area}, ${formatPrice(stay.priceEgp, currency)} per night`}
        className="relative block h-full w-full rounded-[12px] text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d1a1c]"
      >
        {imgFailed ? (
          <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-[#e2b99f] to-[#b57c63] p-4 text-center text-white">
            <span className="font-display-serif text-[20px]">{stay.name}</span>
            <span className="mt-1 text-[12px] opacity-85">{stay.area}</span>
          </div>
        ) : (
          <img
            src={stay.photo700}
            alt={stay.imageAlt}
            loading="lazy"
            decoding="async"
            onError={() => setImgFailed(true)}
            className="h-full w-full object-cover transition-transform duration-[1200ms] ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-[1.07]"
          />
        )}

        {/* Bottom darkening gradient */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg, rgba(20,14,16,0.08) 0%, rgba(20,14,16,0) 40%, rgba(20,14,16,0.82) 100%)',
          }}
        />

        {/* Top-left price tag */}
        <div
          className="absolute left-2.5 top-2.5 max-w-[calc(100%-56px)] truncate rounded-[6px] px-2 py-1 text-[10.5px] font-semibold leading-none text-[#1d1a1c] tabular-nums sm:left-3 sm:top-3 sm:px-2.5 sm:text-[11.5px]"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.88)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
          }}
        >
          {formatPrice(stay.priceEgp, currency)}
          <span className="font-normal text-[#1d1a1c]/65">/night</span>
        </div>

        {!stay.available && (
          <div className="absolute left-3 top-10 rounded-[5px] bg-[#1d1a1c]/85 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.04em] text-white">
            On Hold
          </div>
        )}

        {/* Bottom-left metadata */}
        <div className="absolute bottom-3 left-3 right-3 text-white sm:bottom-3.5 sm:left-3.5 sm:right-3.5">
          <h3 className="truncate font-urbanist text-[13.5px] font-semibold leading-snug sm:text-[15.5px]">
            {stay.name}
          </h3>
          <div className="mt-1 flex items-center gap-1 text-[11px] text-white/90 sm:text-[12px]">
            <MapPin className="h-3 w-3 shrink-0" strokeWidth={1.8} />
            <span className="truncate">{stay.area}</span>
          </div>
          <div className="mt-1.5 flex items-center gap-1.5">
            <div className="flex items-center gap-0.5" aria-hidden="true">
              {Array.from({ length: 5 }).map((_, starIdx) => (
                <Star
                  key={starIdx}
                  className="h-2.5 w-2.5 fill-[#f7c325] text-[#f7c325] sm:h-3 sm:w-3"
                />
              ))}
            </div>
            <span className="text-[11px] font-medium text-white/95 tabular-nums sm:text-[12px]">
              {stay.rating.toFixed(1)}
            </span>
            <span className="text-[10.5px] text-white/75 tabular-nums">
              ({stay.reviewCount})
            </span>
          </div>
        </div>
      </button>

      {/* Top-right 30px white heart button */}
      <button
        type="button"
        onClick={handleHeart}
        aria-label={isFavorite ? `Remove ${stay.name} from favorites` : `Save ${stay.name} to favorites`}
        aria-pressed={isFavorite}
        className={`absolute right-2.5 top-2.5 z-10 flex h-[30px] w-[30px] items-center justify-center rounded-full bg-white text-[#1d1a1c] shadow-sm transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d1a1c] sm:right-3 sm:top-3 ${
          heartAnimating ? 'animate-heart-pop' : ''
        }`}
      >
        <Heart
          className="h-3.5 w-3.5 transition-colors"
          style={{
            color: isFavorite ? '#ff4d5e' : '#1d1a1c',
            fill: isFavorite ? '#ff4d5e' : 'transparent',
          }}
          strokeWidth={1.9}
        />
      </button>
    </article>
  );
}
