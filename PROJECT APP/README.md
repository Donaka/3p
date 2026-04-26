# 3P CHICKEN POPS Mobile Ordering App

This is a polished mobile-first ordering app for 3P CHICKEN POPS. Open `index.html` in a browser to try the app.

## What is included

- Android-style mobile storefront layout
- Real categories and products from `3P_menu (1).xlsx`
- Local backend API for menu management
- Admin dashboard at `/admin.html`
- Product search and category filtering
- Delivery and pickup mode switch
- Product cards with prices, badges, and illustrations
- Basket drawer with quantity controls
- Checkout-ready total calculation
- Customer checkout form
- WhatsApp order handoff
- Web app manifest for future installable PWA hosting

## Next build steps

1. Keep the products in `app.js` aligned with your latest menu spreadsheet.
2. Add customer login with phone number verification.
3. Add payment options such as cash on delivery, card, or local payment provider.
4. Add an admin dashboard for adding products, changing prices, and marking items out of stock.
5. Connect orders to WhatsApp, email, or a backend database.
6. Convert the prototype to Flutter, React Native, or native Android when you are ready for Play Store release.

## Product data location

Products and categories are stored in `data/menu.json`. You can manage them visually at `https://3p-production.up.railway.app/admin.html`.

The customer app reads the menu from `/api/menu`. Prices are displayed in DHS.

Each product can include an image URL from the admin dashboard. Use a public `https://` image link so every customer device can load the image.

## Syncing installed devices

Use `https://3p-production.up.railway.app` for customer devices. To synchronize all installed devices, install/open the app from that same public URL. Then every admin change is saved on the server and every installed app reads the same `/api/menu`.

## WhatsApp order number

The WhatsApp order number is set in `shopWhatsAppNumber` inside `app.js`. It must use the country code with no plus sign, for example `212688943959`.

## Customer phone login

Customer login now uses Firebase Web SDK phone authentication. Admin login still uses only `ADMIN_PASSWORD`.

In Firebase Console:

1. Enable **Authentication > Sign-in method > Phone**
2. Add your hosted domain in **Authentication > Settings > Authorized domains**
   - `3p-production.up.railway.app`
3. Make sure the web app config in `backend/frontend/firebase-config.js` matches your Firebase project

Important notes:

- reCAPTCHA must be allowed on the deployed domain or phone login can fail
- if the domain is missing from Firebase authorized domains, SMS login may not work
- the PWA/browser app uses Firebase Web SDK only, not Capacitor or Android native auth

## PWA / browser deployment

This project is intended to run as a hosted PWA/browser app.

- Customer app: `https://3p-production.up.railway.app`
- Admin dashboard: `https://3p-production.up.railway.app/admin.html`
- Google login uses the Firebase Web SDK only
- WhatsApp checkout opens from the browser/PWA
- The manifest and service worker keep the app installable on Android home screen and in standalone mode

There is no supported Capacitor or Android Studio build flow in the current production setup.

## Admin password

Set `ADMIN_PASSWORD` in your host environment variables. On Railway, add it in Variables, then redeploy. The admin dashboard will ask for this password before allowing menu changes.

The admin dashboard can manage up to 5 hero image URLs for the home screen carousel.

## Security and secrets

Do not commit Firebase Admin JSON keys to the repository.

Use Railway environment variables instead:

- `DATABASE_URL`
- `ADMIN_PASSWORD`
- `FIREBASE_SERVICE_ACCOUNT_JSON`

`FIREBASE_SERVICE_ACCOUNT_JSON` should contain the full Firebase Admin service account JSON as a single environment variable value. The backend now prefers environment variables first and only uses a local file if one is manually added for local development.
