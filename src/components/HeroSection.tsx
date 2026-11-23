import { useEffect, useRef, useState } from 'react';
import { HERO_SLIDES, RAIL_THUMBNAILS } from '../data/egyptData';
import { computeWipeVisualState, type WipeVisualState } from '../utils/bookingLogic';

interface HeroSectionProps {
  activeSlide: number;
  onSelectSlide: (slideIndex: number) => void;
  paused: boolean;
  children?: React.ReactNode;
}

const WIPE_DURATION_MS = 1250;
const AUTO_ADVANCE_MS = 5200;

export function HeroSection({
  activeSlide,
  onSelectSlide,
  paused,
  children,
}: HeroSectionProps) {
  const heroRef = useRef<HTMLElement>(null);
  const [prevSlide, setPrevSlide] = useState<number | null>(null);
  const [wipeState, setWipeState] = useState<WipeVisualState | null>(null);
  const [captionVisible, setCaptionVisible] = useState(false);
  const [introReady, setIntroReady] = useState(false);
  const [pointerOffset, setPointerOffset] = useState({ x: 0, y: 0 });
  const [scrollY, setScrollY] = useState(0);
  const [viewport, setViewport] = useState({
    w: typeof window !== 'undefined' ? window.innerWidth : 1440,
    h: typeof window !== 'undefined' ? window.innerHeight : 900,
  });

  const activeSlideRef = useRef(activeSlide);
  const wipeRafRef = useRef<number | null>(null);
  const captionTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const updateSize = () => {
      setViewport({ w: window.innerWidth, h: window.innerHeight });
    };
    const updateScroll = () => {
      setScrollY(window.scrollY);
    };
    updateSize();
    updateScroll();
    window.addEventListener('resize', updateSize, { passive: true });
    window.addEventListener('scroll', updateScroll, { passive: true });
    return () => {
      window.removeEventListener('resize', updateSize);
      window.removeEventListener('scroll', updateScroll);
    };
  }, []);

  useEffect(() => {
    const t1 = window.setTimeout(() => setIntroReady(true), 120);
    const t2 = window.setTimeout(() => setCaptionVisible(true), 680);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, []);

  useEffect(() => {
    const previous = activeSlideRef.current;
    if (previous === activeSlide) return;
    activeSlideRef.current = activeSlide;

    setPrevSlide(previous);
    setCaptionVisible(false);

    if (wipeRafRef.current) cancelAnimationFrame(wipeRafRef.current);
    if (captionTimerRef.current) window.clearTimeout(captionTimerRef.current);

    captionTimerRef.current = window.setTimeout(() => {
      setCaptionVisible(true);
    }, 650);

    const startTime = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - startTime) / WIPE_DURATION_MS);
      setWipeState(computeWipeVisualState(t));
      if (t < 1) {
        wipeRafRef.current = requestAnimationFrame(tick);
      } else {
        setWipeState(null);
        setPrevSlide(null);
      }
    };
    wipeRafRef.current = requestAnimationFrame(tick);

    return () => {
      if (wipeRafRef.current) cancelAnimationFrame(wipeRafRef.current);
      if (captionTimerRef.current) window.clearTimeout(captionTimerRef.current);
    };
  }, [activeSlide]);

  useEffect(() => {
    if (paused) return;
    const timer = window.setInterval(() => {
      onSelectSlide((activeSlideRef.current + 1) % HERO_SLIDES.length);
    }, AUTO_ADVANCE_MS);
    return () => window.clearInterval(timer);
  }, [paused, activeSlide, onSelectSlide]);

  const handlePointerMove = (e: React.PointerEvent<HTMLElement>) => {
    if (!heroRef.current) return;
    const rect = heroRef.current.getBoundingClientRect();
    const nx = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    const ny = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    setPointerOffset({ x: nx * 0.6, y: ny * 0.5 });
  };

  const vh = Math.max(660, viewport.h);
  const vw = viewport.w;
  const isMobile = vw <= 640;

  // Scroll choreography math
  const slideStackTranslateY = 0.42 * scrollY;
  const bottomCloudTranslateY = -0.38 * scrollY;
  const bottomCloudScale = 1 + (0.35 * scrollY) / vh;
  const topCloudOpacity = Math.min(1, Math.max(0, scrollY / (0.45 * vh)));
  const railTranslateY = 0.2 * scrollY;
  const railOpacity = Math.max(0, 1 - scrollY / (0.5 * vh));
  const searchSlotOpacity = Math.max(0, 1 - Math.max(0, scrollY - 0.38 * vh) / (0.14 * vh));

  // Rail concentric geometry (scaled safely on narrow mobile portrait)
  const activeSize = isMobile
    ? Math.min(94, Math.max(76, vw * 0.22))
    : Math.min(190, Math.max(96, vw * 0.113));
  const inactiveSize = isMobile
    ? Math.min(48, Math.max(40, vw * 0.11))
    : Math.min(92, Math.max(46, vw * 0.054));
  const gap = isMobile ? 8 : Math.max(8, vw * 0.009);
  const railCenterX = isMobile ? vw - Math.max(54, activeSize * 0.62) : vw * 0.855;
  let cursorY = 74 + vh * (isMobile ? 0.05 : 0.085);

  const railLayout = RAIL_THUMBNAILS.map((thumb) => {
    const isLit = thumb.slideIndex === activeSlide;
    const size = isLit ? activeSize : inactiveSize;
    const top = cursorY;
    const left = railCenterX - size / 2;
    const centerY = top + size / 2;
    cursorY += size + gap;
    return { thumb, isLit, size, top, left, centerY };
  });

  const litLayout = railLayout.find((r) => r.isLit) || railLayout[2];
  const innerRadius = activeSize / 2 + vw * 0.05;
  const outerRadius = activeSize / 2 + vw * 0.108;
  const connectorLength = Math.max(40, vw * 0.047);
  const connectorRightX = railCenterX - activeSize / 2 - vw * 0.008;
  const connectorLeftX = connectorRightX - connectorLength;
  const captionRightOffset = vw - connectorLeftX + Math.max(16, vw * 0.015);
  const barHeight = Math.max(84, vw * 0.065);

  const currentSlideData = HERO_SLIDES[activeSlide];

  return (
    <section
      ref={heroRef}
      onPointerMove={handlePointerMove}
      aria-label="Egypt destination showcase"
      className="relative h-screen min-h-[550px] w-full select-none bg-[#d8ab92] [@media(max-height:500px)]:min-h-[460px]"
      data-active-slide={activeSlide + 1}
    >
      {/* Clipped visual backdrop & rail wrapper at z-[5] (under #stays-section z-[15]) */}
      <div className="pointer-events-none absolute inset-0 z-[5] overflow-hidden">
        {/* Slide stack with scroll lag */}
        <div
          className="absolute inset-0"
          style={{
            transform: `translate3d(0, ${slideStackTranslateY}px, 0)`,
            willChange: 'transform',
          }}
        >
        {HERO_SLIDES.map((slide, idx) => {
          const isActive = idx === activeSlide;
          const isOutgoing = idx === prevSlide && wipeState !== null;
          if (!isActive && !isOutgoing) return null;

          const isWipingIn = isActive && wipeState !== null;
          const zIndex = isActive ? 3 : 2;

          let photoTransform = `translate3d(${pointerOffset.x}%, ${pointerOffset.y}%, 0)`;
          let maskStyle: string | undefined;

          if (isWipingIn && wipeState) {
            photoTransform = `scale(${wipeState.incomingScale}) translate3d(${wipeState.incomingShiftXPct}%, 0, 0)`;
            maskStyle = `linear-gradient(to left, #000 ${wipeState.opaqueStopPct}%, rgba(0,0,0,0.6) ${wipeState.midStopPct}%, transparent ${wipeState.transparentStopPct}%)`;
          } else if (isOutgoing && wipeState) {
            photoTransform = `scale(${wipeState.outgoingScale}) translate3d(${wipeState.outgoingShiftXPct}%, 0, 0)`;
          }

          return (
            <div
              key={slide.id}
              className="absolute inset-0 overflow-hidden"
              style={{
                zIndex,
                maskImage: maskStyle,
                WebkitMaskImage: maskStyle,
              }}
            >
              {/* Real verified Egyptian photograph layer */}
              <div
                className="absolute -inset-[3%] overflow-hidden"
                style={{
                  transform: photoTransform,
                  transition: isWipingIn || isOutgoing ? 'none' : 'transform 0.35s ease-out',
                  willChange: 'transform',
                }}
              >
                <img
                  src={slide.photoUrl}
                  alt={slide.photoAlt}
                  fetchPriority={idx === 0 ? 'high' : 'auto'}
                  decoding="async"
                  className={`h-full w-full object-cover ${isActive ? 'hero-ken-burns' : ''}`}
                  style={{ objectPosition: slide.photoPosition }}
                />
              </div>

              {/* Top warm desert tint behind navbar & display headline */}
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    'linear-gradient(180deg, rgba(64,46,52,0.48) 0%, rgba(72,54,60,0.14) 32%, transparent 56%)',
                }}
              />

              {/* Giant gradient title inside slide so it wipes together with photo */}
              <h1
                className="pointer-events-none absolute font-urbanist font-bold uppercase"
                style={{
                  left: isMobile ? '5vw' : slide.titlePosition.left,
                  top: isMobile ? 'calc(74px + 2.5vh)' : slide.titlePosition.top,
                  lineHeight: slide.titlePosition.lineHeight,
                  fontSize: isMobile
                    ? slide.titleLines.length > 1
                      ? 'clamp(36px, 12vw, 54px)'
                      : 'clamp(34px, 10.8vw, 48px)'
                    : slide.titleLines.length > 1
                      ? '9.6vw'
                      : '8.25vw',
                  maxWidth: isMobile ? '62vw' : 'none',
                  whiteSpace: isMobile ? 'normal' : 'nowrap',
                  letterSpacing: '-0.02em',
                }}
              >
                {slide.titleLines.map((line, lineIdx) => {
                  const words = line.split(' ');
                  return (
                    <span key={line} className="block">
                      {words.map((word, wordIdx) => {
                        const order = lineIdx * 3 + wordIdx;
                        return (
                          <span
                            key={`${word}-${wordIdx}`}
                            className="mr-[0.22em] inline-block overflow-hidden align-bottom last:mr-0"
                          >
                            <span
                              className={`hero-giant-word ${introReady ? 'animate-word-rise' : 'translate-y-[105%]'}`}
                              style={{
                                animationDelay: `${order * 90}ms`,
                              }}
                            >
                              {word}
                            </span>
                          </span>
                        );
                      })}
                    </span>
                  );
                })}
              </h1>
            </div>
          );
        })}

        {/* Moving vertical mist band along wipe edge */}
        {wipeState && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-[-10%] bottom-[-10%] z-[4]"
            style={{
              width: '34vw',
              left: `${wipeState.mistLeftPct}%`,
              opacity: wipeState.mistOpacity,
              background:
                'radial-gradient(ellipse at center, rgba(255,236,226,0.78) 0%, rgba(255,236,226,0.36) 45%, transparent 72%)',
              filter: 'blur(12px)',
            }}
          />
        )}
      </div>

      {/* Top atmospheric CSS mist layer (zero external AI cloud PNG) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-[-6%] right-[-6%] top-[-22%] z-[6] h-[68%] mix-blend-screen"
        style={{
          opacity: topCloudOpacity * 0.85,
          transform: `translate3d(0, ${-0.24 * scrollY}px, 0)`,
          background:
            'radial-gradient(ellipse 46% 52% at 24% 48%, rgba(255,244,238,0.82) 0%, rgba(255,234,222,0.35) 52%, transparent 78%), radial-gradient(ellipse 52% 48% at 72% 42%, rgba(255,240,232,0.78) 0%, rgba(253,225,209,0.28) 54%, transparent 80%)',
          filter: 'blur(26px)',
        }}
      />

      {/* Bottom volumetric drifting CSS mist bank */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-[-8%] left-[-6%] right-[-6%] z-[7] h-[68%]"
        style={{
          transform: `translate3d(0, ${bottomCloudTranslateY}px, 0) scale(${bottomCloudScale})`,
          transformOrigin: 'center bottom',
          willChange: 'transform',
        }}
      >
        <div
          className="cloud-drift-back absolute inset-0 mix-blend-screen"
          style={{
            opacity: 0.72,
            background:
              'radial-gradient(ellipse 42% 54% at 18% 72%, rgba(255,246,240,0.85) 0%, rgba(255,234,220,0.4) 55%, transparent 78%), radial-gradient(ellipse 48% 58% at 54% 78%, rgba(255,242,234,0.82) 0%, rgba(253,225,209,0.34) 52%, transparent 76%), radial-gradient(ellipse 44% 50% at 86% 74%, rgba(255,245,238,0.78) 0%, transparent 74%)',
            filter: 'blur(28px)',
          }}
        />
        <div
          className="cloud-drift-front absolute inset-0 mix-blend-screen"
          style={{
            opacity: 0.78,
            background:
              'radial-gradient(ellipse 50% 48% at 32% 82%, rgba(255,248,244,0.88) 0%, rgba(255,234,220,0.42) 48%, transparent 76%), radial-gradient(ellipse 46% 52% at 74% 84%, rgba(255,245,238,0.86) 0%, rgba(253,228,214,0.36) 50%, transparent 76%)',
            filter: 'blur(24px)',
          }}
        />
      </div>

      {/* Bottom sunset peach melt */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 left-0 right-0 z-[8] h-[54%]"
        style={{
          background:
            'linear-gradient(180deg, rgba(247,217,198,0) 0%, rgba(247,217,198,0.22) 32%, rgba(247,217,198,0.62) 62%, rgba(247,217,198,0.92) 84%, #f7d9c6 100%)',
        }}
      />

      {/* Right rail: concentric rings, connector, caption, round thumbnails */}
      <div
        className="pointer-events-none absolute inset-0 z-[12]"
        style={{
          opacity: railOpacity,
          transform: `translate3d(0, ${railTranslateY}px, 0)`,
        }}
      >
        {[innerRadius, outerRadius].map((radius, rIdx) => (
          <div
            key={rIdx}
            aria-hidden="true"
            className="pointer-events-none absolute rounded-full"
            style={{
              width: `${radius * 2}px`,
              height: `${radius * 2}px`,
              left: `${railCenterX - radius}px`,
              top: `${litLayout.centerY - radius}px`,
              border: '1.6px solid rgba(255, 255, 255, 0.5)',
              opacity: introReady ? 1 : 0,
              transition:
                'top 0.9s cubic-bezier(.65,0,.35,1), left 0.9s cubic-bezier(.65,0,.35,1), width 0.9s cubic-bezier(.65,0,.35,1), height 0.9s cubic-bezier(.65,0,.35,1), opacity 1s ease 0.35s',
            }}
          />
        ))}

        {!isMobile && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute h-[3px] rounded-full bg-white"
            style={{
              width: `${connectorLength}px`,
              left: `${connectorLeftX}px`,
              top: `${litLayout.centerY - 1.5}px`,
              transformOrigin: 'right center',
              transform: captionVisible ? 'scaleX(1)' : 'scaleX(0)',
              transition:
                'transform 0.55s cubic-bezier(.16,1,.3,1), top 0.9s cubic-bezier(.65,0,.35,1), left 0.9s cubic-bezier(.65,0,.35,1)',
            }}
          />
        )}

        {!isMobile && (
          <div
            className="pointer-events-none absolute flex items-center gap-4 rounded-2xl px-4 py-2 text-white"
            style={{
              right: `${captionRightOffset}px`,
              top: `${litLayout.centerY}px`,
              transform: 'translateY(-50%)',
              transition: 'top 0.9s cubic-bezier(.65,0,.35,1), opacity 0.45s ease',
              opacity: captionVisible ? 1 : 0,
              background:
                'radial-gradient(ellipse at 70% 50%, rgba(36, 20, 24, 0.44) 0%, rgba(36, 20, 24, 0) 78%)',
            }}
          >
            <div className="text-right">
              <div
                style={{
                  clipPath: captionVisible ? 'inset(0 0 0 0)' : 'inset(0 100% 0 0)',
                  transition: 'clip-path 0.9s cubic-bezier(.16,1,.3,1)',
                }}
              >
                <h2
                  className="font-urbanist font-light tracking-[-0.01em]"
                  style={{
                    fontSize: 'clamp(26px, 2.75vw, 40px)',
                    textShadow: '0 3px 16px rgba(24, 12, 16, 0.55)',
                  }}
                >
                  {currentSlideData.captionHeading}
                </h2>
                <p
                  className="ml-auto mt-1.5 max-w-[260px] font-normal leading-[1.45] text-white"
                  style={{
                    fontSize: 'clamp(12px, 1vw, 14.5px)',
                    textShadow: '0 2px 10px rgba(24, 12, 16, 0.65)',
                  }}
                >
                  {currentSlideData.captionDescription}
                </p>
              </div>
            </div>

            <div
              aria-hidden="true"
              className="w-[3px] shrink-0 rounded-full bg-white"
              style={{
                height: `${barHeight}px`,
                transformOrigin: 'top center',
                transform: captionVisible ? 'scaleY(1)' : 'scaleY(0)',
                transition: 'transform 0.6s cubic-bezier(.16,1,.3,1)',
              }}
            />
          </div>
        )}

        {railLayout.map(({ thumb, isLit, size, top, left }, idx) => (
          <button
            key={thumb.id}
            type="button"
            aria-label={thumb.label}
            aria-pressed={isLit}
            onClick={() => onSelectSlide(thumb.slideIndex)}
            className="group pointer-events-auto absolute rounded-full focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
            style={{
              top: `${top}px`,
              left: `${left}px`,
              width: `${size}px`,
              height: `${size}px`,
              transition:
                'top 0.9s cubic-bezier(.65,0,.35,1), left 0.9s cubic-bezier(.65,0,.35,1), width 0.9s cubic-bezier(.65,0,.35,1), height 0.9s cubic-bezier(.65,0,.35,1)',
              animation: `thumbScaleIn 0.85s cubic-bezier(.16,1,.3,1) ${220 + idx * 120}ms both`,
            }}
          >
            {isLit && (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -inset-[9px] rounded-full transition-opacity duration-500"
                style={{
                  border: '1.5px solid rgba(255, 255, 255, 0.55)',
                }}
              />
            )}
            <span
              className="block h-full w-full overflow-hidden rounded-full transition-transform duration-300 group-hover:scale-[1.07]"
              style={{
                border: '3px solid rgba(255, 255, 255, 0.92)',
                boxShadow: '0 10px 26px rgba(60, 30, 30, 0.28)',
              }}
            >
              <img
                src={thumb.imageUrl}
                alt={thumb.label}
                decoding="async"
                className="h-full w-full object-cover"
              />
            </span>
          </button>
        ))}
        </div>
      </div>

      {/* Search bar slot (stays at z-[25] above #stays-section z-[15], fades cleanly on scroll) */}
      <div
        className="relative z-[25] h-full w-full transition-opacity duration-200"
        style={{
          opacity: searchSlotOpacity,
          pointerEvents: searchSlotOpacity < 0.2 ? 'none' : 'auto',
        }}
      >
        {children}
      </div>
    </section>
  );
}
