export function resolveAssetUrl(relativePath: string): string {
  const clean = relativePath.replace(/^\/+/, '');
  const viteBase =
    typeof import.meta !== 'undefined' &&
    typeof (import.meta as unknown as { env?: { BASE_URL?: string } }).env?.BASE_URL === 'string'
      ? (import.meta as unknown as { env: { BASE_URL: string } }).env.BASE_URL
      : '/';

  if (viteBase === './' || viteBase === '') {
    return `./${clean}`;
  }
  const normalizedBase = viteBase.endsWith('/') ? viteBase : `${viteBase}/`;
  return `${normalizedBase}${clean}`;
}

export interface HeroSlide {
  id: number;
  photoUrl: string;
  photoAlt: string;
  photoPosition: string;
  titleLines: string[];
  titleSizeClass: string;
  titlePosition: {
    left: string;
    top: string;
    lineHeight: string;
  };
  captionHeading: string;
  captionDescription: string;
  thumbOrderIndex: number;
}

export interface RailThumbnail {
  id: string;
  label: string;
  slideIndex: number;
  imageUrl: string;
}

export interface ImageAttribution {
  subject: string;
  author: string;
  license: string;
  sourceUrl: string;
}

export type AmenityIconKey =
  | 'wifi'
  | 'concierge'
  | 'boat'
  | 'award'
  | 'pool'
  | 'breakfast'
  | 'ac'
  | 'desert'
  | 'reef';

export interface StayAmenity {
  iconKey: AmenityIconKey;
  label: string;
}

export interface StayProperty {
  id: string;
  name: string;
  area: string;
  governorate: string;
  districtKey: string;
  category: 'Villas' | 'Heritage Houses' | 'Eco-Lodges' | 'Boutique Suites';
  priceEgp: number;
  pricingBasisNote: string;
  rating: number;
  reviewCount: number;
  photo700: string;
  photo1400: string;
  imageAlt: string;
  imageAttribution: ImageAttribution;
  maxGuests: number;
  minNights: number;
  checkInWindow: string;
  bedrooms: number;
  bathrooms: number;
  sizeSqm: number;
  available: boolean;
  hostName: string;
  hostRole: string;
  description: string;
  amenities: StayAmenity[];
}

export interface DestinationHighlight {
  id: string;
  title: string;
  district: string;
  districtKey: string;
  summary: string;
  travelTime: string;
  imageUrl: string;
  imageAlt: string;
  slideIndex: number;
}

export const HERO_SLIDES: HeroSlide[] = [
  {
    id: 1,
    photoUrl: resolveAssetUrl('images/egypt/hero-giza.webp'),
    photoAlt: 'The Great Pyramids on the Giza Plateau under clear Egyptian desert sunlight',
    photoPosition: 'center 56%',
    titleLines: ['WELCOME TO EGYPT'],
    titleSizeClass: 'hero-title-single',
    titlePosition: {
      left: '2.6vw',
      top: 'calc(74px + 3.2vh)',
      lineHeight: '0.9',
    },
    captionHeading: 'Discover Egypt',
    captionDescription:
      "Discover Egypt's curated Nile residences, oasis eco-lodges, and Red Sea coastal retreats",
    thumbOrderIndex: 2,
  },
  {
    id: 2,
    photoUrl: resolveAssetUrl('images/egypt/hero-nile.webp'),
    photoAlt: 'Traditional wooden felucca sailboats gliding across the Nile at sunset in Upper Egypt',
    photoPosition: 'center 54%',
    titleLines: ['FIND PLACE TO STAY'],
    titleSizeClass: 'hero-title-single',
    titlePosition: {
      left: '2.6vw',
      top: 'calc(74px + 3.2vh)',
      lineHeight: '0.9',
    },
    captionHeading: 'Places to stay',
    captionDescription:
      'Nile waterfront suites, heritage residences, and serene desert villas curated for your journey',
    thumbOrderIndex: 1,
  },
  {
    id: 3,
    photoUrl: resolveAssetUrl('images/egypt/hero-luxor.webp'),
    photoAlt: 'Sunlit sandstone columns inside the main hypostyle courtyard of Luxor Temple',
    photoPosition: 'center 42%',
    titleLines: ['EXPLORE', 'EGYPT'],
    titleSizeClass: 'hero-title-double',
    titlePosition: {
      left: '7vw',
      top: 'calc(74px + 5vh)',
      lineHeight: '0.95',
    },
    captionHeading: 'Places to go',
    captionDescription:
      'Explore iconic temple colonnades, oasis dunes, and coral reefs from verified local sanctuaries',
    thumbOrderIndex: 0,
  },
];

export const RAIL_THUMBNAILS: RailThumbnail[] = [
  {
    id: 'thumb-luxor',
    label: 'Explore Luxor East Bank and temple trails',
    slideIndex: 2,
    imageUrl: resolveAssetUrl('images/egypt/rail-luxor.webp'),
  },
  {
    id: 'thumb-nile',
    label: 'Nile sunset felucca and riverside stays',
    slideIndex: 1,
    imageUrl: resolveAssetUrl('images/egypt/rail-nile.webp'),
  },
  {
    id: 'thumb-giza',
    label: 'Giza Plateau and historic Cairo views',
    slideIndex: 0,
    imageUrl: resolveAssetUrl('images/egypt/rail-giza.webp'),
  },
];

export interface InteriorPhotoItem {
  url: string;
  caption: string;
  attribution: ImageAttribution;
}

export const INTERIOR_GALLERY_ITEMS: InteriorPhotoItem[] = [
  {
    url: resolveAssetUrl('images/egypt/interior-courtyard.webp'),
    caption: 'Historic carved-wood courtyard & mashrabiya shade in Old Cairo',
    attribution: {
      subject: 'Bayt es-Suhaimi courtyard, Cairo',
      author: 'Francesco Gasparetti',
      license: 'CC BY 2.0',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Flickr_-_Gaspa_-_Cairo,_Bayt_es-Suhaimi.jpg',
    },
  },
  {
    url: resolveAssetUrl('images/egypt/interior-salon.webp'),
    caption: 'Heritage archways and reception lounge overlooking Mena gardens, Giza',
    attribution: {
      subject: 'Mena House heritage interior, Giza',
      author: 'Gerhard Haubold',
      license: 'CC BY-SA 3.0',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:2._Mena_House_Hotel_1_C.jpg',
    },
  },
  {
    url: resolveAssetUrl('images/egypt/interior-lagoon.webp'),
    caption: 'Sunlit limestone terrace and lagoon plunge pool along the Red Sea coast',
    attribution: {
      subject: 'El Gouna stone pool terrace',
      author: 'Marc Ryckaert',
      license: 'CC BY 3.0',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:El_Gouna_R21.jpg',
    },
  },
  {
    url: resolveAssetUrl('images/egypt/interior-pool.webp'),
    caption: 'Evening colonnade pool terrace under warm Sinai lantern light',
    attribution: {
      subject: 'Seawater colonnade pool, South Sinai',
      author: 'timparkinson',
      license: 'CC BY 2.0',
      sourceUrl:
        'https://commons.wikimedia.org/wiki/File:Seawater_pool_@_Baron_Resort,_Sharm_El_Sheikh,_Egypt_-_13007299213.jpg',
    },
  },
];

export const INTERIOR_THUMBNAILS: string[] = INTERIOR_GALLERY_ITEMS.slice(0, 3).map((i) => i.url);

export const STAY_PROPERTIES: StayProperty[] = [
  {
    id: 'zamalek-nile-pavilion',
    name: 'Zamalek Nile Pavilion',
    area: 'Zamalek, Cairo',
    governorate: 'Cairo Governorate',
    districtKey: 'zamalek-cairo',
    category: 'Boutique Suites',
    priceEgp: 9500,
    pricingBasisNote: 'Provisional market benchmark for Gezira Island riverfront 2BR heritage suites (Nov 2026)',
    rating: 4.9,
    reviewCount: 142,
    photo700: resolveAssetUrl('images/egypt/stay-zamalek-700.webp'),
    photo1400: resolveAssetUrl('images/egypt/stay-zamalek-1400.webp'),
    imageAlt: 'Riverfront residential promenade along the Nile in Zamalek, Cairo',
    imageAttribution: {
      subject: 'Nile waterfront in Zamalek, Cairo',
      author: 'Slyronit',
      license: 'CC BY-SA 4.0',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Nile_waterfront_in_Zamalek_01.jpg',
    },
    maxGuests: 4,
    minNights: 2,
    checkInWindow: '15:00 – 22:00 EET',
    bedrooms: 2,
    bathrooms: 2,
    sizeSqm: 145,
    available: true,
    hostName: 'Karim El-Masry',
    hostRole: 'Cairo Heritage Host',
    description:
      'Elevated above Gezira Island’s tree-lined Nile promenade, this restored townhouse suite balances high ceilings, hand-laid terrazzo floors, and direct views over evening felucca sails. Walk five minutes to Cairo Opera House gardens and artisan roasteries while returning to double-glazed river quiet.',
    amenities: [
      { iconKey: 'wifi', label: 'Fiber Wi-Fi (150 Mbps)' },
      { iconKey: 'concierge', label: '24/7 Airport Meet & Greet' },
      { iconKey: 'boat', label: 'Private River Dock Access' },
      { iconKey: 'breakfast', label: 'Artisanal Cairo Breakfast' },
      { iconKey: 'ac', label: 'Zoned Climate Control' },
      { iconKey: 'award', label: 'Inspected Heritage Tier' },
    ],
  },
  {
    id: 'giza-pyramid-residence',
    name: 'Al-Haram Heritage Villa',
    area: 'Giza Plateau, Giza',
    governorate: 'Giza Governorate',
    districtKey: 'giza-plateau',
    category: 'Villas',
    priceEgp: 14800,
    pricingBasisNote: 'Provisional market benchmark for full-service pyramid-district garden villas (Nov 2026)',
    rating: 4.8,
    reviewCount: 96,
    photo700: resolveAssetUrl('images/egypt/stay-giza-villa-700.webp'),
    photo1400: resolveAssetUrl('images/egypt/stay-giza-villa-1400.webp'),
    imageAlt: 'Classic pillared salon and carved wooden gallery inside historic Mena House grounds in Giza',
    imageAttribution: {
      subject: 'Historic pillared gallery at Mena House, Giza',
      author: 'Ovedc',
      license: 'CC BY-SA 4.0',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:By_ovedc_-_Mena_House_-_17.jpg',
    },
    maxGuests: 6,
    minNights: 2,
    checkInWindow: '14:00 – 23:00 EET',
    bedrooms: 3,
    bathrooms: 3,
    sizeSqm: 260,
    available: true,
    hostName: 'Nadia Mansour',
    hostRole: 'Giza Plateau Curator',
    description:
      'Set beside century-old palm gardens at the foot of the Giza Plateau, Al-Haram Heritage Villa frames vaulted marble colonnades and quiet garden terraces ten minutes from the Grand Egyptian Museum entrance. Designed for families and small groups seeking private dawn plateau access before crowds arrive.',
    amenities: [
      { iconKey: 'pool', label: 'Heated Garden Plunge' },
      { iconKey: 'concierge', label: 'Private Egyptologist Desk' },
      { iconKey: 'breakfast', label: 'Daily Terrace Breakfast' },
      { iconKey: 'wifi', label: 'High-Speed Mesh Wi-Fi' },
      { iconKey: 'ac', label: 'Dual-Zone Climate Control' },
      { iconKey: 'award', label: 'Verified Villa Standards' },
    ],
  },
  {
    id: 'luxor-winter-estate',
    name: 'Corniche Heritage Residence',
    area: 'East Bank, Luxor',
    governorate: 'Luxor Governorate',
    districtKey: 'luxor',
    category: 'Heritage Houses',
    priceEgp: 11200,
    pricingBasisNote: 'Provisional market benchmark for historic East Bank Upper Egypt suites (Nov 2026)',
    rating: 4.7,
    reviewCount: 184,
    photo700: resolveAssetUrl('images/egypt/stay-luxor-palace-700.webp'),
    photo1400: resolveAssetUrl('images/egypt/stay-luxor-palace-1400.webp'),
    imageAlt: 'Grand colonial facade and shaded veranda overlooking royal palm gardens on Luxor East Bank',
    imageAttribution: {
      subject: 'Old Winter Palace palm facade, Luxor',
      author: 'Marc Ryckaert',
      license: 'CC BY-SA 4.0',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Luxor_Winter_Palace_R01.jpg',
    },
    maxGuests: 5,
    minNights: 2,
    checkInWindow: '14:00 – 21:00 EET',
    bedrooms: 2,
    bathrooms: 2,
    sizeSqm: 190,
    available: true,
    hostName: 'Tarek Farouk',
    hostRole: 'Upper Egypt Specialist',
    description:
      'Surrounded by mature bougainvillea and royal date palms steps from Luxor Temple’s illuminated Avenue of Sphinxes, this residence offers deep louvered verandas and private motor-launch crossings to West Bank Valley of the Kings trails at sunrise.',
    amenities: [
      { iconKey: 'boat', label: 'West Bank Ferry Arrangement' },
      { iconKey: 'pool', label: 'Botanical Courtyard Pool' },
      { iconKey: 'breakfast', label: 'Upper Egypt Mint & Pantry' },
      { iconKey: 'concierge', label: 'Dawn Balloon Coordination' },
      { iconKey: 'wifi', label: 'Dedicated Workspace Wi-Fi' },
      { iconKey: 'ac', label: 'High-Ceiling Cooling' },
    ],
  },
  {
    id: 'aswan-cataract-wing',
    name: 'Granite Terrace Nile Suite',
    area: 'Nile Corniche, Aswan',
    governorate: 'Aswan Governorate',
    districtKey: 'aswan',
    category: 'Boutique Suites',
    priceEgp: 16400,
    pricingBasisNote: 'Provisional market benchmark for historic First Cataract granite-bluff river suites (Nov 2026)',
    rating: 4.9,
    reviewCount: 73,
    photo700: resolveAssetUrl('images/egypt/stay-aswan-cataract-700.webp'),
    photo1400: resolveAssetUrl('images/egypt/stay-aswan-cataract-1400.webp'),
    imageAlt: 'Warm rose-terracotta arches perched above dark Nile granite boulders in Aswan',
    imageAttribution: {
      subject: 'Sofitel Legend Old Cataract sandstone facade, Aswan',
      author: 'Ahmed Emad H',
      license: 'CC BY-SA 4.0',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Old_Cataract_Hotel_Aswan_%D9%81%D9%86%D8%AF%D9%82_%D9%83%D8%AA%D8%B1%D8%A7%D9%83%D8%AA.jpg',
    },
    maxGuests: 4,
    minNights: 2,
    checkInWindow: '15:00 – 22:00 EET',
    bedrooms: 2,
    bathrooms: 2,
    sizeSqm: 175,
    available: true,
    hostName: 'Salma Youssef',
    hostRole: 'Aswan River Concierge',
    description:
      'Perched atop smooth pink Aswan granite overlooking Elephantine Island and Kitchener’s Botanical Sanctuary, this quiet sandstone wing offers broad sunset loggias, hand-woven Egyptian cotton linens, and effortless departures to Philae Island Temple.',
    amenities: [
      { iconKey: 'boat', label: 'Private Felucca Charter' },
      { iconKey: 'concierge', label: 'Abu Simbel Flight Desk' },
      { iconKey: 'breakfast', label: 'Sunlit Loggia Breakfast' },
      { iconKey: 'pool', label: 'River-Horizon Terrace' },
      { iconKey: 'wifi', label: 'Private Suite Wi-Fi' },
      { iconKey: 'award', label: 'Heritage Architecture' },
    ],
  },
  {
    id: 'elephantine-nubian-house',
    name: 'Dar Elephantine Nubian House',
    area: 'Elephantine Island, Aswan',
    governorate: 'Aswan Governorate',
    districtKey: 'aswan',
    category: 'Heritage Houses',
    priceEgp: 5200,
    pricingBasisNote: 'Provisional market benchmark for boutique Nubian guesthouse retreats on Elephantine (Nov 2026)',
    rating: 4.6,
    reviewCount: 118,
    photo700: resolveAssetUrl('images/egypt/stay-nubian-house-700.webp'),
    photo1400: resolveAssetUrl('images/egypt/stay-nubian-house-1400.webp'),
    imageAlt: 'Colorful painted mudbrick Nubian homes lined beside palm trees on Elephantine Island',
    imageAttribution: {
      subject: 'Nubian village on Elephantine Island, Aswan',
      author: 'Rémih',
      license: 'CC BY-SA 3.0',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Nubian_village_Elephantine_Island.JPG',
    },
    maxGuests: 4,
    minNights: 1,
    checkInWindow: '13:00 – 21:00 EET',
    bedrooms: 2,
    bathrooms: 1,
    sizeSqm: 110,
    available: true,
    hostName: 'Bakri Hassan',
    hostRole: 'Nubian Community Host',
    description:
      'Set within a traffic-free Nubian hamlet on historic Elephantine Island, these barrel-vaulted earthen suites stay naturally cool under the southern sun. Guests wake to fresh flatbread, chilled hibiscus karkadeh, and rhythmic Nile water directly below the courtyard gate.',
    amenities: [
      { iconKey: 'boat', label: 'Complimentary Pier Crossing' },
      { iconKey: 'breakfast', label: 'Home-Baked Nubian Shamsi' },
      { iconKey: 'wifi', label: 'Island Fiber Connectivity' },
      { iconKey: 'concierge', label: 'Local Village Guide' },
      { iconKey: 'ac', label: 'Passive Vault Cooling + AC' },
      { iconKey: 'award', label: 'Community-Owned Stay' },
    ],
  },
  {
    id: 'siwa-shali-eco-lodge',
    name: 'Shali Salt & Palm Eco-Lodge',
    area: 'Shali Fortress, Siwa Oasis',
    governorate: 'Matrouh Governorate',
    districtKey: 'siwa-oasis',
    category: 'Eco-Lodges',
    priceEgp: 6800,
    pricingBasisNote: 'Provisional market benchmark for authentic karshif salt-brick Siwa eco-lodges (Nov 2026)',
    rating: 4.8,
    reviewCount: 64,
    photo700: resolveAssetUrl('images/egypt/stay-siwa-lodge-700.webp'),
    photo1400: resolveAssetUrl('images/egypt/stay-siwa-lodge-1400.webp'),
    imageAlt: 'Restored golden earthen walls of Shali Fortress beneath desert palm groves in Siwa Oasis',
    imageAttribution: {
      subject: 'Shali Fortress in Siwa Oasis',
      author: 'AmiraAdel93',
      license: 'CC BY-SA 4.0',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Shali_Fortress_in_Siwa_Oasis.jpg',
    },
    maxGuests: 3,
    minNights: 2,
    checkInWindow: '14:00 – 20:00 EET',
    bedrooms: 1,
    bathrooms: 1,
    sizeSqm: 92,
    available: true,
    hostName: 'Dawood Senussi',
    hostRole: 'Siwa Desert Steward',
    description:
      'Hand-built from local karshif salt-earth and reclaimed olive-wood beams beneath the ancient silhouette of Shali Citadel, this low-impact sanctuary trades fluorescent lights for beeswax lanterns, clear Saharan stargazing roofs, and warm natural salt-lake dips nearby.',
    amenities: [
      { iconKey: 'desert', label: 'Great Sand Sea 4x4 Access' },
      { iconKey: 'pool', label: 'Mineral Spring Courtyard' },
      { iconKey: 'breakfast', label: 'Siwan Olive & Date Table' },
      { iconKey: 'concierge', label: 'Salt Lake Transfers' },
      { iconKey: 'wifi', label: 'Lounge Star-Link Zone' },
      { iconKey: 'award', label: 'Kershef Eco-Craft' },
    ],
  },
  {
    id: 'el-gouna-lagoon-villa',
    name: 'Abu Tig Lagoon Pool Villa',
    area: 'El Gouna, Red Sea',
    governorate: 'Red Sea Governorate',
    districtKey: 'el-gouna',
    category: 'Villas',
    priceEgp: 18500,
    pricingBasisNote: 'Provisional market benchmark for 4BR private lagoon-front Red Sea villas (Nov 2026)',
    rating: 4.9,
    reviewCount: 109,
    photo700: resolveAssetUrl('images/egypt/stay-el-gouna-700.webp'),
    photo1400: resolveAssetUrl('images/egypt/stay-el-gouna-1400.webp'),
    imageAlt: 'Sun-warmed Nubian-domed coastal villas wrapping a clear turquoise El Gouna lagoon',
    imageAttribution: {
      subject: 'El Gouna coastal hill villas overlooking Red Sea lagoon',
      author: 'Marc Ryckaert',
      license: 'CC BY 4.0',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:El_Gouna_Hill_Villas_R10.jpg',
    },
    maxGuests: 8,
    minNights: 3,
    checkInWindow: '15:00 – 22:00 EET',
    bedrooms: 4,
    bathrooms: 4,
    sizeSqm: 340,
    available: true,
    hostName: 'Yasmine Adel',
    hostRole: 'Red Sea Villa Director',
    description:
      'Framing calm turquoise lagoons minutes from Abu Tig Marina, this coastal residence blends domed Nubian stonework with shaded poolside dining, private paddleboard moorings, and quick speedboat charters to vibrant Red Sea offshore reefs.',
    amenities: [
      { iconKey: 'pool', label: 'Heated Private Lagoon Pool' },
      { iconKey: 'boat', label: 'Private Jetty Mooring' },
      { iconKey: 'reef', label: 'Snorkel & Kite Locker' },
      { iconKey: 'wifi', label: 'Whole-Villa Mesh Wi-Fi' },
      { iconKey: 'ac', label: 'Central Cooling' },
      { iconKey: 'concierge', label: 'Hurghada Transfer (35 min)' },
    ],
  },
  {
    id: 'dahab-masbat-loft',
    name: 'Masbat Reef Seafront Loft',
    area: 'Masbat Bay, Dahab',
    governorate: 'South Sinai Governorate',
    districtKey: 'dahab',
    category: 'Boutique Suites',
    priceEgp: 3800,
    pricingBasisNote: 'Provisional market benchmark for waterfront boutique sea-view studios in Dahab (Nov 2026)',
    rating: 4.7,
    reviewCount: 151,
    photo700: resolveAssetUrl('images/egypt/stay-dahab-bay-700.webp'),
    photo1400: resolveAssetUrl('images/egypt/stay-dahab-bay-1400.webp'),
    imageAlt: 'Calm azure waters of Masbat Bay framed by Sinai granite mountains in Dahab',
    imageAttribution: {
      subject: 'Masbat Bay shoreline and Sinai peaks, Dahab',
      author: 'Jorge Láscar',
      license: 'CC BY 2.0',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Masbat_Bay,_Red_Sea_(13620745594).jpg',
    },
    maxGuests: 2,
    minNights: 2,
    checkInWindow: '14:00 – 22:00 EET',
    bedrooms: 1,
    bathrooms: 1,
    sizeSqm: 68,
    available: true,
    hostName: 'Omar Sherif',
    hostRole: 'South Sinai Dive Host',
    description:
      'Open your timber shutters directly onto the calm coral curve of Masbat Bay with Gulf of Aqaba mountain silhouettes on the horizon. Equipped with an ergonomic work desk, sunlit roof pergola, and freshwater dive-gear rinse basin thirty paces from Lighthouse Reef.',
    amenities: [
      { iconKey: 'reef', label: 'Shore-Entry Coral Reef' },
      { iconKey: 'wifi', label: 'Remote-Work Fiber Wi-Fi' },
      { iconKey: 'desert', label: 'Sinai Canyon Stargazing' },
      { iconKey: 'ac', label: 'Split Quiet Inverter AC' },
      { iconKey: 'breakfast', label: 'Bedouin Tea Terrace' },
      { iconKey: 'concierge', label: 'Dive Center Coordination' },
    ],
  },
];

export const DESTINATION_HIGHLIGHTS: DestinationHighlight[] = [
  {
    id: 'dest-giza',
    title: 'Giza Plateau & Grand Museum',
    district: 'Giza & West Cairo',
    districtKey: 'giza-plateau',
    summary:
      'Enter the 4,500-year-old plateau at sunrise for panoramic desert vistas across Khufu and Khafre before an afternoon walk through the Grand Egyptian Museum galleries.',
    travelTime: '25 min from Zamalek',
    imageUrl: resolveAssetUrl('images/egypt/dest-giza.webp'),
    imageAlt: 'Panoramic morning view across the desert pyramids of the Giza Plateau',
    slideIndex: 0,
  },
  {
    id: 'dest-aswan-nile',
    title: 'Aswan Cataract & Felucca Sails',
    district: 'Aswan & Elephantine Island',
    districtKey: 'aswan',
    summary:
      'Drift smoothly between pink granite boulders on a traditional lateen-rigged felucca at dusk toward painted Nubian riverbanks and peaceful island gardens.',
    travelTime: '10 min river crossing',
    imageUrl: resolveAssetUrl('images/egypt/dest-aswan-nile.webp'),
    imageAlt: 'Wooden felucca sails catching golden afternoon light on the Nile in Aswan',
    slideIndex: 1,
  },
  {
    id: 'dest-luxor-night',
    title: 'Luxor Temple & East Bank',
    district: 'Luxor Corniche',
    districtKey: 'luxor',
    summary:
      'Stroll beneath floodlit papyrus columns and obelisks along the Nile Corniche after dusk, connecting centuries of stone craftsmanship with vibrant Upper Egypt evenings.',
    travelTime: '8 min Corniche walk',
    imageUrl: resolveAssetUrl('images/egypt/dest-luxor-night.webp'),
    imageAlt: 'Illuminated granite obelisk and seated statues at Luxor Temple entrance by night',
    slideIndex: 2,
  },
];

export const EGYPT_DISTRICTS = [
  { key: 'all', label: 'All Egypt' },
  { key: 'zamalek-cairo', label: 'Zamalek, Cairo' },
  { key: 'giza-plateau', label: 'Giza Plateau' },
  { key: 'luxor', label: 'Luxor' },
  { key: 'aswan', label: 'Aswan' },
  { key: 'siwa-oasis', label: 'Siwa Oasis' },
  { key: 'el-gouna', label: 'El Gouna' },
  { key: 'dahab', label: 'Dahab' },
];
