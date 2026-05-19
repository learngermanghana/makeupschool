# Make Up & More School of Cosmetology.

A premium, conversion-focused beauty school website built with Next.js App Router, TypeScript, React, and Tailwind CSS. The project is designed for Vercel deployment and uses local static data plus Sedifex-powered registration checkout so admissions enquiries and payment references are saved in Sedifex.

## Features

- Elegant multi-page marketing site for a cosmetology school in Tema.
- Responsive design optimized for mobile, tablet, and desktop.
- SEO-friendly metadata for all core routes.
- Reusable WhatsApp CTA helpers for course, class, and product enquiries.
- Static local data files for courses, upcoming classes, gallery content, testimonials, and products.
- Registration form creates a Sedifex student registration and redirects the student/parent to secure Paystack checkout.
- Sitemap and robots support for better search indexing readiness.

## Project structure

```text
src/
  app/
  components/
  data/
  lib/
public/
  images/
  uploads/
    homepage/
    courses/
    products/
    gallery/
```

## Local setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the development server:
   ```bash
   npm run dev
   ```
3. Open [http://localhost:3000](http://localhost:3000).


## Registration payment + Sedifex student registration

The `/register` form now calls the website API route:

```txt
POST /api/payments/initialize
```

That route sends the registration details to Sedifex:

```txt
POST /api/student-registration-intake
```

Sedifex creates the student registration, initializes Paystack checkout, and returns a checkout URL. After payment, the student is returned to `/register` with the payment reference. Admissions can review the registration in Sedifex under **Student registration**.

Set these server-side environment variables in `.env.local` and in Vercel:

```bash
# Required: Sedifex store that receives student registrations
SEDIFEX_STORE_ID=your_store_id

# Required: registration amount in major units, e.g. 100 means GHS 100
SEDIFEX_REGISTRATION_AMOUNT_GHS=100

# Optional, defaults to GHS
SEDIFEX_REGISTRATION_CURRENCY=GHS

# Optional, defaults to https://www.sedifex.com
SEDIFEX_SITE_BASE_URL=https://www.sedifex.com

# Optional override if Sedifex registration endpoint changes
SEDIFEX_REGISTRATION_INTAKE_URL=https://www.sedifex.com/api/student-registration-intake

# Optional return URL after Paystack payment
SEDIFEX_REGISTRATION_RETURN_URL=https://www.make-upmore.com/register
```

Accepted store aliases for compatibility: `SEDFIEX_STORE_ID` and `INTEGRATION_STORE_ID`.

Legacy amount aliases still work:

```bash
REGISTRATION_FEE_GHS=100
REGISTRATION_FEE_KOBO=10000
```

Notes:
- The website no longer needs to write successful registrations to its own Firestore first.
- Sedifex is the source of truth for registration, payment reference, and admissions follow-up.
- Payment final confirmation should still be handled by Sedifex/Paystack verification or webhook processing. The browser return page only shows the student a helpful success message.

## Sedifex catalog/classes/blog integration environment variables

For live Sedifex-powered products/classes/blog, set these server-side env vars in Vercel:

```bash
SEDIFEX_STORE_ID=your-store-id
SEDIFEX_INTEGRATION_API_KEY=your-integration-key
```

Accepted aliases (for compatibility): `SEDIFEX_INTEGRATION_KEY`, `SEDFIEX_INTEGRATION_KEY`, `SEDFIEX_API_KEY`, `INTEGRATION_KEY`, `SEDFIEX_STORE_ID`, and `INTEGRATION_STORE_ID`.

## Build for production

```bash
npm run build
```

To run the production server locally after building:

```bash
npm run start
```

## Deploy to Vercel

1. Push the repository to GitHub, GitLab, or Bitbucket.
2. Import the project into Vercel.
3. Keep the default framework preset as **Next.js**.
4. Ensure the install command is `npm install` and the build command is `npm run build`.
5. Deploy.

## Updating content

Update these files to manage the main site content:

- Courses: `src/data/courses.ts`
- Upcoming classes: `src/data/upcoming-classes.ts`
- Products: `src/data/products.ts`
- Gallery items: `src/data/gallery.ts`
- Testimonials: `src/data/testimonials.ts`
- Business details and navigation: `src/data/site.ts`

## Uploading photos

All editable site photos now live in `public/uploads/` so it is easier to replace them without searching through the app.

- Homepage photos: `public/uploads/homepage/`
- Course photos: `public/uploads/courses/`
- Product photos: `public/uploads/products/`
- Gallery photos: `public/uploads/gallery/`

If you keep the same file names, you only need to replace the image file. If you want a new file name, update the matching data file as well. See `docs/photo-upload-guide.md` for the full workflow.

## Future integrations

The current implementation is intentionally static and simple to maintain. You can later add:

- More Sedifex payment modes for deposits or instalments.
- Firebase for extra local form storage if needed.
- A CMS if non-technical staff should update the site.

## Vercel deployment checklist

- [ ] Run `npm install`
- [ ] Run `npm run build`
- [ ] Confirm the production domain for metadata and sitemap URLs
- [ ] Replace placeholder gallery/product imagery with real branded assets
- [ ] Verify WhatsApp number, phone number, and Facebook link
- [ ] Add `SEDIFEX_STORE_ID` and `SEDIFEX_REGISTRATION_AMOUNT_GHS` in Vercel
- [ ] Review copy and testimonials before launch
