# Kemet Travel — Welcome to Egypt

Curated Egyptian sanctuary & boutique stay booking platform localized across **Cairo (Zamalek), Giza Plateau, Luxor, Aswan, Elephantine Island, Siwa Oasis, El Gouna, and Dahab**, built with React 19, TypeScript, Vite, Tailwind CSS v4, Firebase Authentication, and Cloud Firestore.

🌐 **Live GitHub Pages URL**: [https://omarelsiry.github.io/kemet-travel/](https://omarelsiry.github.io/kemet-travel/)

## Key Features & Architecture

- **Editorial Egypt Frontend**: Preserves the sunset-peach palette (`#f7d9c6` → `#fbe7da` → `#fdf0e7`), `Gilda Display` + `Urbanist` typography, 100vh right-to-left misty wipe hero slider (`HeroSection.tsx`), concentric ring rail, floating `SearchBar.tsx`, shared-element photo-flight `PropertyDetailView.tsx`, and genuine Wikimedia Commons photography optimized into local WebP derivatives (`public/images/egypt/`).
- **Verified Egypt Localization & Pricing (`src/data/egyptData.ts`)**: Eight differentiated stays with governorate metadata, distinct EGP benchmarks (`3,800`–`18,500 EGP/night`, optional `USD` toggle), distinct specs, pricing transparency notes, and live attribution records (`SourcesAndAttributionModal`).
- **Real Authentication & Persistence (`src/context/AuthContext.tsx`, `src/services/firestoreService.ts`)**:
  - Firebase Authentication supporting Google Sign-In, Email/Password registration, email verification links, password reset emails, session persistence, and role checks (`isAdmin` via Firebase email claim or `/admins/{uid}` Firestore document).
  - Cloud Firestore stores customer profiles (`/users/{uid}`), booking requests (`/bookings/{bookingId}`), verified reviews (`/reviews/{reviewId}`), partner/concierge inquiries (`/inquiries/{inquiryId}`), and live sales overrides for inventory availability/pricing (`/properties/{propertyId}`).
- **Pending-Confirmation Sales Workflow**:
  - Submitting a stay request records `status: 'pending_confirmation'` in Firestore with a unique `KMT-*` reference, never falsely marking reservations confirmed upfront.
  - Displays the mandatory sales-team 24-hour review confirmation screen (`Your booking request has been received. It is currently pending confirmation...`).
  - Authorized sales operators (`omaromar01067@gmail.com` or seeded `/admins/{uid}`) access `SalesDashboardModal` (`/sales`) to search requests, advance statuses (`pending_confirmation` → `contacted` → `confirmed` / `rejected` / `cancelled`), add private/customer-facing sales notes, and update stay availability/rates.
- **Configurable Sales Contact Channels (`src/config/contactConfig.ts`)**: Supports optional `VITE_SALES_PHONE`, `VITE_SALES_WHATSAPP`, and `VITE_SALES_EMAIL` environment variables without fabricating company contact details.

## GitHub Pages Hosting & Deployment

This application is fully prepared for permanent hosting on **GitHub Pages** with automated CI/CD via GitHub Actions (`.github/workflows/deploy-pages.yml`).

### 1. Live GitHub Pages URL
Once published to your repository, your permanent live site will be accessible at:
```text
https://<your-github-username>.github.io/<your-repository-name>/
```

### 2. Setting Up Your GitHub Repository & Publishing
1. Create a new repository on GitHub (e.g., `kemet-travel`).
2. Push your local project code to the `main` branch:
   ```bash
   git init
   git remote add origin https://github.com/<your-github-username>/<your-repository-name>.git
   git branch -M main
   git add .
   git commit -m "Initial commit: Kemet Travel Sanctuary Platform"
   git push -u origin main
   ```
3. **Configure GitHub Pages Source**:
   - Go to your GitHub Repository **Settings** -> **Pages**.
   - Under **Build and deployment** -> **Source**, select **GitHub Actions**.
4. The automated GitHub Actions workflow (`.github/workflows/deploy-pages.yml`) will automatically trigger on push to `main`, typecheck with `npm run lint`, run test suites (`src/utils/bookingLogic.test.ts`), build the production bundle with correct subpath routing (`VITE_BASE_PATH`), and publish it live.

### 3. External Configuration Checklist

1. **Firebase Email/Password Auth**: Google Sign-In and email/password authentication are configured with Firebase project `atlantean-splice-pdrm3`. Ensure **Email/Password** sign-in is enabled in your Firebase Console (`Authentication -> Sign-in method`).
2. **Sales Contact Variables (Optional)**: Set GitHub Repository Variables (`VITE_SALES_PHONE`, `VITE_SALES_WHATSAPP`, `VITE_SALES_EMAIL`) under Repository **Settings** -> **Secrets and variables** -> **Actions** -> **Variables** to expose direct click-to-call, WhatsApp, and mailto channels.

## Local Development & Verification

```bash
npm ci
npm run dev
```

Verification suite:

```bash
npm run lint
npx eslint firestore.rules
npx tsx --test src/utils/bookingLogic.test.ts
npm run build
```
