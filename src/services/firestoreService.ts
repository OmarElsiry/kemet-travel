import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import {
  generateBookingReference,
  type BookingRecord,
  type BookingStatus,
  type CurrencyCode,
  type PropertyOverride,
  type StayReviewRecord,
} from '../utils/bookingLogic';

export interface UserProfileRecord {
  uid: string;
  email: string;
  displayName: string;
  phone: string;
  preferredCurrency: CurrencyCode;
  role: 'customer' | 'sales';
  createdAtIso: string;
  updatedAtIso: string;
}

function toDate(value: unknown, fallback = new Date()): Date {
  if (value instanceof Timestamp) return value.toDate();
  if (typeof value === 'string') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return fallback;
}

function toIsoString(value: unknown): string {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (typeof value === 'string') return value;
  return new Date().toISOString();
}

function sanitizeId(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 128);
}

export async function ensureUserProfileDoc(params: {
  uid: string;
  email: string;
  displayName: string;
}): Promise<UserProfileRecord | null> {
  const safeUid = sanitizeId(params.uid);
  const path = `users/${safeUid}`;
  try {
    const userRef = doc(db, 'users', safeUid);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      const data = snap.data();
      return {
        uid: String(data.uid || safeUid),
        email: String(data.email || params.email),
        displayName: String(data.displayName || params.displayName || 'Guest'),
        phone: String(data.phone || ''),
        preferredCurrency: data.preferredCurrency === 'USD' ? 'USD' : 'EGP',
        role: data.role === 'sales' ? 'sales' : 'customer',
        createdAtIso: toIsoString(data.createdAt),
        updatedAtIso: toIsoString(data.updatedAt),
      };
    }

    const cleanName = (params.displayName || params.email.split('@')[0] || 'Guest')
      .trim()
      .slice(0, 100);
    await setDoc(userRef, {
      uid: safeUid,
      email: params.email.trim().slice(0, 160),
      displayName: cleanName.length > 0 ? cleanName : 'Guest',
      phone: '',
      preferredCurrency: 'EGP',
      role: 'customer',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return {
      uid: safeUid,
      email: params.email.trim(),
      displayName: cleanName,
      phone: '',
      preferredCurrency: 'EGP',
      role: 'customer',
      createdAtIso: new Date().toISOString(),
      updatedAtIso: new Date().toISOString(),
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updateUserProfileFields(
  uid: string,
  updates: {
    displayName: string;
    phone: string;
    preferredCurrency: CurrencyCode;
  },
): Promise<void> {
  const safeUid = sanitizeId(uid);
  const path = `users/${safeUid}`;
  try {
    await updateDoc(doc(db, 'users', safeUid), {
      displayName: updates.displayName.trim().slice(0, 100),
      phone: updates.phone.trim().slice(0, 32),
      preferredCurrency: updates.preferredCurrency === 'USD' ? 'USD' : 'EGP',
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function checkIsSalesAdmin(uid: string): Promise<boolean> {
  const safeUid = sanitizeId(uid);
  try {
    const adminSnap = await getDoc(doc(db, 'admins', safeUid));
    return adminSnap.exists();
  } catch {
    return false;
  }
}

export function subscribeToPropertyOverrides(
  onUpdate: (overrides: Record<string, PropertyOverride>) => void,
  onError?: (err: unknown) => void,
): Unsubscribe {
  const path = 'properties';
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      const map: Record<string, PropertyOverride> = {};
      for (const docSnap of snapshot.docs) {
        const d = docSnap.data();
        if (
          typeof d.id === 'string' &&
          typeof d.priceEgp === 'number' &&
          typeof d.available === 'boolean' &&
          typeof d.maxGuests === 'number'
        ) {
          map[d.id] = {
            id: d.id,
            priceEgp: d.priceEgp,
            available: d.available,
            maxGuests: d.maxGuests,
            updatedAtIso: toIsoString(d.updatedAt),
          };
        }
      }
      onUpdate(map);
    },
    (error) => {
      if (onError) onError(error);
      else console.warn('Property overrides subscription error:', error);
    },
  );
}

export async function upsertPropertyOverride(override: {
  id: string;
  priceEgp: number;
  available: boolean;
  maxGuests: number;
}): Promise<void> {
  const propId = override.id.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 64);
  const path = `properties/${propId}`;
  try {
    await setDoc(doc(db, 'properties', propId), {
      id: propId,
      priceEgp: Math.max(500, Math.min(500000, Math.round(override.priceEgp))),
      available: Boolean(override.available),
      maxGuests: Math.max(1, Math.min(20, Math.round(override.maxGuests))),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

function mapDocToBooking(docData: Record<string, unknown>, id: string): BookingRecord {
  const statusVal = docData.status as BookingStatus;
  const allowedStatuses: BookingStatus[] = [
    'pending_confirmation',
    'contacted',
    'confirmed',
    'rejected',
    'cancelled',
  ];
  const status: BookingStatus = allowedStatuses.includes(statusVal)
    ? statusVal
    : 'pending_confirmation';

  return {
    id,
    reference: String(docData.reference || ''),
    userId: String(docData.userId || ''),
    customerName: String(docData.customerName || ''),
    customerEmail: String(docData.customerEmail || ''),
    customerPhone: String(docData.customerPhone || ''),
    customerNotes: String(docData.customerNotes || ''),
    stayId: String(docData.stayId || ''),
    stayName: String(docData.stayName || ''),
    area: String(docData.area || ''),
    photoUrl: String(docData.photoUrl || ''),
    checkIn: toDate(docData.checkInIso),
    checkOut: toDate(docData.checkOutIso),
    nights: Number(docData.nights || 1),
    guests: Number(docData.guests || 1),
    nightlyRateEgp: Number(docData.nightlyRateEgp || 0),
    totalEgp: Number(docData.totalEgp || 0),
    status,
    salesNotes: String(docData.salesNotes || ''),
    confirmationDetails: String(docData.confirmationDetails || ''),
    createdAtIso: toIsoString(docData.createdAt),
    updatedAtIso: toIsoString(docData.updatedAt),
  };
}

export async function submitBookingRequest(params: {
  userId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerNotes: string;
  stayId: string;
  stayName: string;
  area: string;
  photoUrl: string;
  checkIn: Date;
  checkOut: Date;
  nights: number;
  guests: number;
  nightlyRateEgp: number;
  totalEgp: number;
}): Promise<BookingRecord> {
  const nowMs = Date.now();
  const safeStayId = params.stayId.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 64);
  const bookingId = sanitizeId(`bk_${safeStayId}_${nowMs}_${Math.random().toString(36).slice(2, 6)}`);
  const reference = generateBookingReference(safeStayId, nowMs);
  const path = `bookings/${bookingId}`;

  const payload = {
    id: bookingId,
    reference,
    userId: sanitizeId(params.userId),
    customerName: params.customerName.trim().slice(0, 100),
    customerEmail: params.customerEmail.trim().slice(0, 160),
    customerPhone: params.customerPhone.trim().slice(0, 32),
    customerNotes: params.customerNotes.trim().slice(0, 600),
    stayId: safeStayId,
    stayName: params.stayName.trim().slice(0, 120),
    area: params.area.trim().slice(0, 120),
    photoUrl: params.photoUrl.trim().slice(0, 300),
    checkInIso: params.checkIn.toISOString(),
    checkOutIso: params.checkOut.toISOString(),
    nights: Math.max(1, Math.min(90, Math.round(params.nights))),
    guests: Math.max(1, Math.min(20, Math.round(params.guests))),
    nightlyRateEgp: Math.max(500, Math.min(500000, Math.round(params.nightlyRateEgp))),
    totalEgp: Math.max(500, Math.min(50000000, Math.round(params.totalEgp))),
    status: 'pending_confirmation' as const,
    salesNotes: '',
    confirmationDetails: '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, 'bookings', bookingId), payload);
    const nowIso = new Date(nowMs).toISOString();
    return {
      ...payload,
      checkIn: params.checkIn,
      checkOut: params.checkOut,
      createdAtIso: nowIso,
      updatedAtIso: nowIso,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export function subscribeToCustomerBookings(
  userId: string,
  onUpdate: (bookings: BookingRecord[]) => void,
  onError: (err: unknown) => void,
): Unsubscribe {
  const safeUid = sanitizeId(userId);
  const path = 'bookings';
  const q = query(
    collection(db, path),
    where('userId', '==', safeUid),
    orderBy('createdAt', 'desc'),
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const records = snapshot.docs.map((d) => mapDocToBooking(d.data(), d.id));
      onUpdate(records);
    },
    (error) => {
      onError(error);
    },
  );
}

export async function cancelCustomerBooking(bookingId: string): Promise<void> {
  const safeId = sanitizeId(bookingId);
  const path = `bookings/${safeId}`;
  try {
    await updateDoc(doc(db, 'bookings', safeId), {
      status: 'cancelled',
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export function subscribeToAllBookingsForSales(
  onUpdate: (bookings: BookingRecord[]) => void,
  onError: (err: unknown) => void,
): Unsubscribe {
  const path = 'bookings';
  const q = query(collection(db, path), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const records = snapshot.docs.map((d) => mapDocToBooking(d.data(), d.id));
      onUpdate(records);
    },
    (error) => {
      onError(error);
    },
  );
}

export async function updateBookingBySales(
  bookingId: string,
  updates: {
    status: BookingStatus;
    salesNotes: string;
    confirmationDetails: string;
  },
): Promise<void> {
  const safeId = sanitizeId(bookingId);
  const path = `bookings/${safeId}`;
  try {
    await updateDoc(doc(db, 'bookings', safeId), {
      status: updates.status,
      salesNotes: updates.salesNotes.trim().slice(0, 1000),
      confirmationDetails: updates.confirmationDetails.trim().slice(0, 1000),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export function subscribeToStayReviews(
  stayId: string,
  onUpdate: (reviews: StayReviewRecord[]) => void,
): Unsubscribe {
  const safeStayId = stayId.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 64);
  const q = query(
    collection(db, 'reviews'),
    where('stayId', '==', safeStayId),
    orderBy('createdAt', 'desc'),
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const items: StayReviewRecord[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          stayId: String(data.stayId || safeStayId),
          userId: String(data.userId || ''),
          authorName: String(data.authorName || 'Verified Guest'),
          rating: Number(data.rating || 5),
          comment: String(data.comment || ''),
          createdAtIso: toIsoString(data.createdAt),
        };
      });
      onUpdate(items);
    },
    (err) => {
      console.warn('Reviews listener warning:', err);
    },
  );
}

export async function submitStayReview(params: {
  stayId: string;
  userId: string;
  authorName: string;
  rating: number;
  comment: string;
}): Promise<void> {
  const safeStayId = params.stayId.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 64);
  const reviewId = sanitizeId(`rev_${safeStayId}_${Date.now()}`);
  const path = `reviews/${reviewId}`;
  try {
    await setDoc(doc(db, 'reviews', reviewId), {
      id: reviewId,
      stayId: safeStayId,
      userId: sanitizeId(params.userId),
      authorName: params.authorName.trim().slice(0, 80) || 'Verified Guest',
      rating: Math.max(1, Math.min(5, Math.round(params.rating))),
      comment: params.comment.trim().slice(0, 600),
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function submitConciergeInquiry(params: {
  type: 'host' | 'contact';
  name: string;
  email: string;
  phone: string;
  district: string;
  message: string;
}): Promise<string> {
  const inquiryId = sanitizeId(`inq_${params.type}_${Date.now()}`);
  const path = `inquiries/${inquiryId}`;
  try {
    await setDoc(doc(db, 'inquiries', inquiryId), {
      id: inquiryId,
      type: params.type,
      name: params.name.trim().slice(0, 100),
      email: params.email.trim().slice(0, 160),
      phone: params.phone.trim().slice(0, 32),
      district: params.district.trim().slice(0, 100),
      message: params.message.trim().slice(0, 1200),
      status: 'new',
      createdAt: serverTimestamp(),
    });
    return inquiryId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}
