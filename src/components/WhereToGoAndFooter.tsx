import { ArrowUpRight } from 'lucide-react';
import { SALES_CONTACT_CONFIG } from '../config/contactConfig';
import { DESTINATION_HIGHLIGHTS } from '../data/egyptData';

interface WhereToGoAndFooterProps {
  onSelectDistrictAndHero: (districtKey: string, slideIndex: number) => void;
  onNavigateSection: (sectionId: string) => void;
  onOpenHostModal: () => void;
  onOpenContactModal: () => void;
  onOpenSourcesModal: () => void;
}

export function WhereToGoAndFooter({
  onSelectDistrictAndHero,
  onNavigateSection,
  onOpenHostModal,
  onOpenContactModal,
  onOpenSourcesModal,
}: WhereToGoAndFooterProps) {
  return (
    <>
      <section
        id="where-to-go-section"
        aria-labelledby="where-to-go-heading"
        className="relative z-[10] scroll-mt-[92px] pt-6 pb-20"
        style={{
          paddingLeft: 'clamp(16px, 9.5vw, 170px)',
          paddingRight: 'clamp(16px, 9.5vw, 170px)',
        }}
      >
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-t border-[#1d1a1c]/10 pt-14">
          <div>
            <p className="text-[12.5px] font-medium uppercase tracking-[0.12em] text-[#8a7f83]">
              Egypt Regional Journeys
            </p>
            <h2
              id="where-to-go-heading"
              className="mt-1.5 font-display-serif font-normal text-[#1d1a1c]"
              style={{ fontSize: 'clamp(24px, 2.45vw, 36px)' }}
            >
              Where to Go Across Egypt
            </h2>
          </div>
          <p className="max-w-[380px] text-[14.5px] leading-relaxed text-[#5c5156]">
            Select an Egyptian itinerary to pair your stay with Giza’s plateaus, Nile feluccas, or
            Luxor’s illuminated temples.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {DESTINATION_HIGHLIGHTS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectDistrictAndHero(item.districtKey, item.slideIndex)}
              className="group flex flex-col overflow-hidden rounded-[16px] bg-white/78 p-4 text-left transition-all duration-300 hover:-translate-y-1 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d1a1c]"
              style={{
                boxShadow: '0 12px 30px rgba(110, 60, 50, 0.08)',
              }}
            >
              <div className="relative aspect-[16/10] w-full overflow-hidden rounded-[12px] bg-[#ead0be]">
                <img
                  src={item.imageUrl}
                  alt={item.imageAlt}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.06]"
                />
              </div>

              <div className="mt-4 flex items-start justify-between gap-3">
                <div>
                  <div className="text-[12px] font-medium text-[#8a7f83]">
                    {item.district} · {item.travelTime}
                  </div>
                  <h3 className="mt-1 font-display-serif text-[22px] text-[#1d1a1c]">
                    {item.title}
                  </h3>
                </div>
                <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#1d1a1c]/15 text-[#1d1a1c] transition-colors group-hover:bg-[#1d1a1c] group-hover:text-white">
                  <ArrowUpRight className="h-4 w-4" strokeWidth={1.6} />
                </span>
              </div>

              <p className="mt-2 text-[14px] leading-[1.55] text-[#5c5156]">
                {item.summary}
              </p>
            </button>
          ))}
        </div>
      </section>

      <footer
        className="border-t border-[#1d1a1c]/10 py-12"
        style={{
          paddingLeft: 'clamp(16px, 9.5vw, 170px)',
          paddingRight: 'clamp(16px, 9.5vw, 170px)',
        }}
      >
        <div className="flex flex-col justify-between gap-8 md:flex-row md:items-center">
          <div>
            <span className="font-urbanist text-[24px] font-light text-[#1d1a1c]">
              Kemet Travel
            </span>
            <p className="mt-1.5 text-[13px] text-[#5c5156]">
              Curated Nile residences, oasis eco-lodges &amp; Red Sea stays across Egypt.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-5 text-[14px] text-[#1d1a1c] sm:gap-7">
            <button
              type="button"
              onClick={() => onNavigateSection('stays-section')}
              className="nav-wipe-link"
            >
              Stays
            </button>
            <button
              type="button"
              onClick={() => onNavigateSection('where-to-go-section')}
              className="nav-wipe-link"
            >
              Where to go
            </button>
            <button
              type="button"
              onClick={onOpenHostModal}
              className="nav-wipe-link"
            >
              Become a host
            </button>
            <button
              type="button"
              onClick={onOpenContactModal}
              className="nav-wipe-link"
            >
              Contact Us
            </button>
            <button
              type="button"
              onClick={onOpenSourcesModal}
              className="nav-wipe-link"
            >
              Sources &amp; Licenses
            </button>
          </div>
        </div>

        <div className="mt-8 flex flex-col justify-between gap-2 border-t border-[#1d1a1c]/8 pt-6 text-[12.5px] text-[#8a7f83] sm:flex-row">
          <span>© 2026 Kemet Travel · {SALES_CONTACT_CONFIG.officeLocation}</span>
          <span>
            {SALES_CONTACT_CONFIG.email || 'Concierge & Sales Inquiry via Contact Form (24h SLA)'}
          </span>
        </div>
      </footer>
    </>
  );
}
