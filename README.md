# Make Up & More School of Cosmetology.

A premium, conversion-focused beauty school website built with Next.js App Router, TypeScript, React, and Tailwind CSS. The project is designed for Vercel deployment and uses local static data plus Sedifex-powered registration checkout so admissions enquiries and payment references are saved in Sedifex.

## Features

- Elegant multi-page marketing site for a cosmetology school in Tema.
- Responsive design optimized for mobile, tablet, and desktop.
- SEO-friendly metadata for all core routes.
- Reusable WhatsApp CTA helpers for course, class, and product enquiries.
- Static local data files for courses, upcoming classes, gallery content, testimonials, and products.
- Registration form pulls the selected course price from Sedifex integration products/courses, creates a Sedifex student registration, and redirects the student/parent to secure Paystack checkout.
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

That route re-checks the selected course against Sedifex:

```txt
GET /v1IntegrationProducts?storeId=<storeId>
```

It finds the selected course/service by `courseId` or course name, uses the course price from Sedifex, then sends the registration details to Sedifex:

```txt
POST /api/student-registration-intake
```

Sedifex creates the student registration, initializes Paystack checkout using the course price, and returns a checkout URL. After payment, the student is returned to `/register` with the payment reference. Admissions can review the registration in Sedifex under **Student registration**.

Set these server-side environment variables in `.env.local` and in Vercel:

```bash
# Required: Sedifex store that receives student registrations and owns the courses/services
SEDIFEX_STORE_ID=your_store_id

# Required: used to read the selected course/service and its price from Sedifex
SEDIFEX_INTEGRATION_API_KEY=your_integration_key

# Optional, defaults to GHS if the course has no currency field
SEDIFEX_REGISTRATION_CURRENCY=GHS

# Optional, defaults to https://us-central1-sedifex-web.cloudfunctions.net
SEDIFEX_API_BASE_URL=https://us-central1-sedifex-web.cloudfunctions.net

# Optional, defaults to https://www.sedifex.com
SEDIFEX_SITE_BASE_URL=https://www.sedifex.com

# Optional override if Sedifex registration endpoint changes
SEDIFEX_REGISTRATION_INTAKE_URL=https://www.sedifex.com/api/student-registration-intake

# Optional return URL after Paystack payment
SEDIFEX_REGISTRATION_RETURN_URL=https://www.make-upmore.com/register
```

Accepted store aliases for compatibility: `SEDFIEX_STORE_ID` and `INTEGRATION_STORE_ID`.

Accepted key aliases for compatibility: `SEDIFEX_INTEGRATION_KEY`, `SEDFIEX_INTEGRATION_KEY`, `SEDFIEX_API_KEY`, and `INTEGRATION_KEY`.

Notes:
- Do not set a fixed registration amount unless you are using an older fallback branch. The live checkout amount is now pulled from the selected Sedifex course/service price.
- Each course/service used for registration must have a valid positive price in Sedifex.
- The website does not trust browser-sent prices. The server fetches Sedifex integration products again before creating checkout.
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
- [ ] Add `SEDIFEX_STORE_ID` and `SEDIFEX_INTEGRATION_API_KEY` in Vercel
- [ ] Confirm each course/service in Sedifex has a valid price
- [ ] Review copy and testimonials before launch
