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

## Customer Google login

Google login is for customers only. Admin login still uses only `ADMIN_PASSWORD`.

In Firebase Console, keep Authentication > Sign-in method > Google enabled, then open Project settings > General > Your apps > Web app and copy the Firebase config into `firebase-config.js`.

Also add your hosted domain in Firebase Authentication > Settings > Authorized domains:

- `3p-production.up.railway.app`

The customer app uses Firebase redirect login, which is the recommended flow for mobile browsers and Android WebView. When customers sign in, their name is filled into checkout and their Google email is included in the WhatsApp order.

## Android build with Capacitor

This project now includes Capacitor so you can package the existing web app as an Android app without rewriting it in Kotlin.

App details:

- App name: `3P Chicken Pops`
- Package id: `com.threep.chickenpops`
- Web source folder: `backend/frontend`
- Live app URL inside Android: `https://3p-production.up.railway.app`

Commands:

1. Install packages:
   - `npm install`
2. Sync web files and Capacitor config into Android:
   - `npx cap sync android`
3. Open the Android project in Android Studio:
   - `npx cap open android`

Android Studio steps:

1. Wait for Gradle sync to finish.
2. If Android Studio asks for missing SDK components, install **Android SDK Platform 36**.
3. Select build variant `debug` for a test APK.
4. Use `Build > Build Bundle(s) / APK(s) > Build APK(s)` for an APK.
5. Use `Build > Generate Signed Bundle / APK` for a Play Store AAB.

Permissions already included:

- `INTERNET`
- `ACCESS_FINE_LOCATION`
- `ACCESS_COARSE_LOCATION`
- `POST_NOTIFICATIONS`

Notes:

- The Android app keeps using the Railway backend and PostgreSQL through the live hosted app URL.
- Google login now uses native Firebase Authentication inside Capacitor Android when configured.
- Browser login still uses the Firebase web popup/redirect flow.
- WhatsApp checkout links are opened outside the app.

## Firebase Android setup

Before building the Android app, finish these Firebase steps:

1. Open **Firebase Console > Project settings > General**.
2. Add a new **Android app** with this package name:
   - `com.threep.chickenpops`
3. Add your **debug SHA-1 fingerprint** for local testing.
4. If you build a signed APK/AAB, also add your **release SHA-1 fingerprint**.
5. Download `google-services.json`.
6. Place it here:
   - `android/app/google-services.json`
7. In **Authentication > Sign-in method**, enable **Google**.

Without `android/app/google-services.json`, the Android build will not finish correctly.

## Native Android behavior

- Location permission is requested only when the customer chooses delivery location.
- If location is denied, the app shows:
  - `Veuillez autoriser la localisation pour calculer la livraison.`
- Push notification permission is requested after customer login or after the first saved order, not on startup.
- Native Android push tokens are sent to:
  - `POST /api/device-token`
- Native Android Google login uses:
  - `@capacitor-firebase/authentication`

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
