import admin from "firebase-admin";
import fs, { createReadStream, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path, { dirname, extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import express from "express";
import cors from "cors";

const root = fileURLToPath(new URL(".", import.meta.url));
const __dirname = root;
const port = Number(process.env.PORT || 5173);
const menuPath = process.env.MENU_DATA_PATH || join(root, "data", "menu.json");
const seedMenuPath = join(root, "data", "menu.seed.json");
const adminPassword = process.env.ADMIN_PASSWORD || "";
const databaseUrl = process.env.DATABASE_URL || "";

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

function firstExistingPath(...paths) {
  return paths.find(path => existsSync(path)) || paths[0];
}

const firebaseServiceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON || process.env.FIREBASE_ADMIN_SDK_JSON || "";
const serviceAccountPath = firstExistingPath(
  join(root, "data", "serviceAccountKey.json"),
  join(root, "serviceAccountKey.json")
);
let adminInitialized = false;
if (firebaseServiceAccountJson.trim()) {
  try {
    const serviceAccount = JSON.parse(firebaseServiceAccountJson);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    adminInitialized = true;
    console.log("Firebase Admin initialized from environment SUCCESS");
  } catch (e) {
    console.error("Error initializing Firebase Admin from environment:", e);
  }
} else if (existsSync(serviceAccountPath)) {
  try {
    const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, "utf8"));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    adminInitialized = true;
    console.log("Firebase Admin initialized from local file SUCCESS");
  } catch (e) {
    console.error("Error initializing Firebase Admin:", e);
  }
} else {
  console.log("No Firebase Admin service account found in env or local file, push notifications disabled.");
}


const tokensPath = firstExistingPath(
  join(root, "data", "tokens.json"),
  join(root, "tokens.json")
);
const usersPath = firstExistingPath(
  join(root, "data", "users.json"),
  join(root, "users.json")
);
function readTokens() {
  if (!existsSync(tokensPath)) writeFileSync(tokensPath, JSON.stringify({}, null, 2));
  return JSON.parse(readFileSync(tokensPath, "utf8"));
}
function saveToken(customerId, tokenData) {
  const tokens = readTokens();
  // Support both old format (string token) and new format (object)
  const newToken = typeof tokenData === "string" ? { token: tokenData } : tokenData;
  
  tokens[customerId] = {
    ...(tokens[customerId] && typeof tokens[customerId] === "object" ? tokens[customerId] : {}),
    ...newToken,
    updatedAt: new Date().toISOString()
  };
  
  writeFileSync(tokensPath, JSON.stringify(tokens, null, 2));
}


function deleteToken(customerId) {
  const tokens = readTokens();
  delete tokens[customerId];
  writeFileSync(tokensPath, JSON.stringify(tokens, null, 2));
}

function ensureJsonFile(path, fallbackValue) {
  const dir = dirname(path);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  if (!existsSync(path)) writeFileSync(path, JSON.stringify(fallbackValue, null, 2));
}

function readUsers() {
  ensureJsonFile(usersPath, []);
  try {
    const parsed = JSON.parse(readFileSync(usersPath, "utf8"));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveUsers(users) {
  ensureJsonFile(usersPath, []);
  writeFileSync(usersPath, JSON.stringify(users, null, 2));
}

const { Pool } = pg;
const hasDatabase = Boolean(databaseUrl.trim());
const dbPool = hasDatabase ? new Pool({
  connectionString: databaseUrl,
  ssl: databaseUrl.includes("localhost") || databaseUrl.includes("127.0.0.1")
    ? false
    : { rejectUnauthorized: false }
}) : null;
let dbInitPromise = null;
let dbInitError = hasDatabase ? null : new Error("DATABASE_URL is missing. PostgreSQL is required for orders and customers.");
const fallbackSettings = {
  storeName: "3P CHICKEN POPS",
  heroImages: [],
  shopLatitude: 30.4017949,
  shopLongitude: -9.5510469,
  shopAddress: "3P Chicken Pops, Agadir, Maroc",
  shopPhone: "212688943959",
  shopWhatsAppNumber: "212688943959",
  deliveryPricePerKm: 5,
  minimumDeliveryPrice: 10,
  baseDeliveryDistanceKm: 1,
  extraKmPrice: 5,
  maxDeliveryKm: 20,
  minimumOrderAmount: 0,
  preparationTimeBase: 20,
  defaultDeliveryCountdownMinutes: 30,
  deliveryZones: [],
  promoCodes: [],
  isStoreOpen: true,
  closedMessage: "Nous sommes fermes actuellement. Merci de revenir pendant nos horaires d'ouverture."
};

async function ensureDatabase() {
  if (!dbPool) throw dbInitError;
  if (!dbInitPromise) {
    dbInitPromise = (async () => {
      const client = await dbPool.connect();
      try {
        const connectionCheck = await client.query("SELECT NOW() AS connected_at");
        console.log(`PostgreSQL connected (${connectionCheck.rows[0]?.connected_at || "unknown time"})`);
        await client.query(`
          CREATE TABLE IF NOT EXISTS customers (
            id BIGSERIAL PRIMARY KEY,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            name TEXT NOT NULL DEFAULT '',
            phone TEXT,
            email TEXT,
            firebase_uid TEXT,
            total_orders INTEGER NOT NULL DEFAULT 0,
            total_spent NUMERIC(12, 2) NOT NULL DEFAULT 0,
            last_order_at TIMESTAMPTZ
          );
        `);
        await client.query(`
          CREATE UNIQUE INDEX IF NOT EXISTS customers_phone_unique
          ON customers(phone)
          WHERE phone IS NOT NULL AND phone <> '';
        `);
        await client.query(`
          CREATE UNIQUE INDEX IF NOT EXISTS customers_email_unique
          ON customers(email)
          WHERE email IS NOT NULL AND email <> '';
        `);
        await client.query(`
          CREATE UNIQUE INDEX IF NOT EXISTS customers_firebase_uid_unique
          ON customers(firebase_uid)
          WHERE firebase_uid IS NOT NULL AND firebase_uid <> '';
        `);
        await client.query(`
          CREATE TABLE IF NOT EXISTS orders (
            id BIGSERIAL PRIMARY KEY,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            customer_name TEXT NOT NULL DEFAULT '',
            customer_phone TEXT NOT NULL,
            customer_email TEXT,
            firebase_uid TEXT,
            mode TEXT NOT NULL CHECK (mode IN ('delivery', 'pickup')),
            address TEXT,
            latitude DOUBLE PRECISION,
            longitude DOUBLE PRECISION,
            location_accuracy DOUBLE PRECISION,
            location_timestamp TIMESTAMPTZ,
            distance_km NUMERIC(10, 2) NOT NULL DEFAULT 0,
            delivery_zone_radius NUMERIC(10, 2),
            accepted_at TIMESTAMPTZ,
            ready_at TIMESTAMPTZ,
            estimated_delivery_minutes INTEGER,
            delivery_fee NUMERIC(10, 2) NOT NULL DEFAULT 0,
            subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0,
            discount NUMERIC(12, 2) NOT NULL DEFAULT 0,
            total NUMERIC(12, 2) NOT NULL DEFAULT 0,
            promo_code TEXT,
            whatsapp_message TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'accepted', 'preparing', 'ready', 'delivered', 'cancelled')),
            customer_id BIGINT REFERENCES customers(id) ON DELETE SET NULL
          );
        `);
        await client.query(`
          CREATE INDEX IF NOT EXISTS orders_created_at_idx ON orders(created_at DESC);
        `);
        await client.query(`
          CREATE INDEX IF NOT EXISTS orders_status_idx ON orders(status);
        `);
        await client.query(`
          CREATE INDEX IF NOT EXISTS orders_phone_idx ON orders(customer_phone);
        `);
        await client.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ;`);
        await client.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS ready_at TIMESTAMPTZ;`);
        await client.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS accepted_until TIMESTAMPTZ;`);
        await client.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS preparing_until TIMESTAMPTZ;`);
        await client.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS estimated_delivery_minutes INTEGER;`);
        await client.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS location_accuracy DOUBLE PRECISION;`);
        await client.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS location_timestamp TIMESTAMPTZ;`);
        await client.query(`ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;`);
        await client.query(`
          ALTER TABLE orders
          ADD CONSTRAINT orders_status_check
          CHECK (status IN ('new', 'accepted', 'preparing', 'ready', 'delivered', 'cancelled'))
        `);
        await client.query(`
          CREATE TABLE IF NOT EXISTS settings (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            store_name TEXT NOT NULL DEFAULT '3P CHICKEN POPS',
            shop_address TEXT NOT NULL DEFAULT '',
            shop_phone TEXT NOT NULL DEFAULT '',
            shop_latitude DOUBLE PRECISION NOT NULL DEFAULT 30.4017949,
            shop_longitude DOUBLE PRECISION NOT NULL DEFAULT -9.5510469,
            shop_whatsapp_number TEXT NOT NULL DEFAULT '212688943959',
            minimum_delivery_price NUMERIC(10, 2) NOT NULL DEFAULT 10,
            base_delivery_distance_km NUMERIC(10, 2) NOT NULL DEFAULT 1,
            extra_km_price NUMERIC(10, 2) NOT NULL DEFAULT 5,
            max_delivery_km NUMERIC(10, 2),
            minimum_order_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
            preparation_time_base INTEGER NOT NULL DEFAULT 20,
            default_delivery_countdown_minutes INTEGER NOT NULL DEFAULT 30,
            delivery_zones_json JSONB NOT NULL DEFAULT '[]'::jsonb,
            promo_codes_json JSONB NOT NULL DEFAULT '[]'::jsonb,
            hero_images_json JSONB NOT NULL DEFAULT '[]'::jsonb,
            is_store_open BOOLEAN NOT NULL DEFAULT TRUE,
            closed_message TEXT NOT NULL DEFAULT 'Nous sommes fermes actuellement. Merci de revenir pendant nos horaires d''ouverture.',
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          );
        `);
        await client.query(`ALTER TABLE settings ADD COLUMN IF NOT EXISTS store_name TEXT NOT NULL DEFAULT '3P CHICKEN POPS';`);
        await client.query(`ALTER TABLE settings ADD COLUMN IF NOT EXISTS shop_address TEXT NOT NULL DEFAULT '';`);
        await client.query(`ALTER TABLE settings ADD COLUMN IF NOT EXISTS shop_phone TEXT NOT NULL DEFAULT '';`);
        await client.query(`ALTER TABLE settings ADD COLUMN IF NOT EXISTS minimum_delivery_price NUMERIC(10, 2) NOT NULL DEFAULT 10;`);
        await client.query(`ALTER TABLE settings ADD COLUMN IF NOT EXISTS base_delivery_distance_km NUMERIC(10, 2) NOT NULL DEFAULT 1;`);
        await client.query(`ALTER TABLE settings ADD COLUMN IF NOT EXISTS extra_km_price NUMERIC(10, 2) NOT NULL DEFAULT 5;`);
        await client.query(`ALTER TABLE settings ADD COLUMN IF NOT EXISTS max_delivery_km NUMERIC(10, 2);`);
        await client.query(`ALTER TABLE settings ADD COLUMN IF NOT EXISTS shop_whatsapp_number TEXT NOT NULL DEFAULT '212688943959';`);
        await client.query(`ALTER TABLE settings ADD COLUMN IF NOT EXISTS minimum_order_amount NUMERIC(10, 2) NOT NULL DEFAULT 0;`);
        await client.query(`ALTER TABLE settings ADD COLUMN IF NOT EXISTS preparation_time_base INTEGER NOT NULL DEFAULT 20;`);
        await client.query(`ALTER TABLE settings ADD COLUMN IF NOT EXISTS default_delivery_countdown_minutes INTEGER NOT NULL DEFAULT 30;`);
        await client.query(`ALTER TABLE settings ADD COLUMN IF NOT EXISTS is_store_open BOOLEAN NOT NULL DEFAULT TRUE;`);
        await client.query(`ALTER TABLE settings ADD COLUMN IF NOT EXISTS closed_message TEXT NOT NULL DEFAULT 'Nous sommes fermes actuellement. Merci de revenir pendant nos horaires d''ouverture.';`);
        const defaultSettings = getFallbackSettings();
        await client.query(`
          INSERT INTO settings (
            id, shop_latitude, shop_longitude, shop_whatsapp_number, minimum_order_amount, preparation_time_base, default_delivery_countdown_minutes, delivery_zones_json, promo_codes_json, hero_images_json, is_store_open, closed_message, updated_at
          )
          VALUES (1, $1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9::jsonb, $10, $11, NOW())
          ON CONFLICT (id) DO NOTHING
        `, [
          defaultSettings.storeName,
          defaultSettings.shopAddress,
          defaultSettings.shopPhone,
          defaultSettings.shopLatitude,
          defaultSettings.shopLongitude,
          defaultSettings.shopWhatsAppNumber,
          defaultSettings.minimumDeliveryPrice,
          defaultSettings.baseDeliveryDistanceKm,
          defaultSettings.extraKmPrice,
          defaultSettings.maxDeliveryKm,
          defaultSettings.minimumOrderAmount,
          defaultSettings.preparationTimeBase,
          defaultSettings.defaultDeliveryCountdownMinutes,
          JSON.stringify(defaultSettings.deliveryZones),
          JSON.stringify(defaultSettings.promoCodes),
          JSON.stringify(defaultSettings.heroImages),
          defaultSettings.isStoreOpen,
          defaultSettings.closedMessage
        ]);
        await client.query(`
          CREATE TABLE IF NOT EXISTS menu_snapshots (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            categories_json JSONB NOT NULL DEFAULT '[]'::jsonb,
            products_json JSONB NOT NULL DEFAULT '[]'::jsonb,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          );
        `);
        const seedMenu = readMenu();
        await client.query(`
          INSERT INTO menu_snapshots (id, categories_json, products_json, updated_at)
          VALUES (1, $1::jsonb, $2::jsonb, NOW())
          ON CONFLICT (id) DO NOTHING
        `, [
          JSON.stringify(seedMenu.categories || []),
          JSON.stringify(seedMenu.products || [])
        ]);
        await client.query(`
          CREATE TABLE IF NOT EXISTS order_items (
            id BIGSERIAL PRIMARY KEY,
            order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
            product_id TEXT,
            product_name TEXT NOT NULL,
            quantity INTEGER NOT NULL,
            unit_price NUMERIC(12, 2) NOT NULL,
            options_json JSONB NOT NULL DEFAULT '[]'::jsonb,
            line_total NUMERIC(12, 2) NOT NULL
          );
        `);
        await client.query(`
          CREATE INDEX IF NOT EXISTS order_items_order_id_idx ON order_items(order_id);
        `);
        await client.query(`
          CREATE TABLE IF NOT EXISTS notifications (
            id BIGSERIAL PRIMARY KEY,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            title TEXT NOT NULL,
            message TEXT NOT NULL,
            image_url TEXT,
            target_customer_id TEXT,
            linked_product_id TEXT,
            linked_category_id TEXT,
            cta_text TEXT,
            starts_at TIMESTAMPTZ,
            ends_at TIMESTAMPTZ,
            active BOOLEAN NOT NULL DEFAULT TRUE
          );
        `);
        await client.query(`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS target_customer_id TEXT;`);
        await client.query(`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS linked_product_id TEXT;`);
        await client.query(`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS linked_category_id TEXT;`);
        await client.query(`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS cta_text TEXT;`);
        await client.query(`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS starts_at TIMESTAMPTZ;`);
        await client.query(`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS ends_at TIMESTAMPTZ;`);
        await client.query(`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE;`);
        await client.query(`
          CREATE INDEX IF NOT EXISTS notifications_created_at_idx ON notifications(created_at DESC);
        `);
        await client.query(`
          CREATE TABLE IF NOT EXISTS device_tokens (
            id BIGSERIAL PRIMARY KEY,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            firebase_uid TEXT,
            phone TEXT,
            platform TEXT NOT NULL DEFAULT 'android',
            token TEXT NOT NULL UNIQUE
          );
        `);
        await client.query(`
          CREATE INDEX IF NOT EXISTS device_tokens_firebase_uid_idx ON device_tokens(firebase_uid);
        `);
        await client.query(`
          CREATE INDEX IF NOT EXISTS device_tokens_phone_idx ON device_tokens(phone);
        `);
        console.log("PostgreSQL schema ready: settings, menu_snapshots, orders, order_items, customers, notifications, device_tokens");
      } finally {
        client.release();
      }
    })().catch(error => {
      dbInitError = error;
      dbInitPromise = null;
      throw error;
    });
  }
  return dbInitPromise;
}

function ensureDatabaseAvailable() {
  if (!dbPool) {
    throw new Error("DATABASE_URL is missing. Set Railway PostgreSQL DATABASE_URL to enable orders and customers.");
  }
}

function parseMoney(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, number) : fallback;
}

function parseOptionalNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function trimOrNull(value) {
  const trimmed = String(value ?? "").trim();
  return trimmed || null;
}

function normalizePhone(value) {
  return String(value ?? "").replace(/[^\d]/g, "").trim();
}

function normalizeSettings(settings = {}) {
  const rawHeroImages = Array.isArray(settings.heroImages)
    ? settings.heroImages
    : [settings.heroImageUrl || ""];
  return {
    storeName: String(settings.storeName || fallbackSettings.storeName).trim(),
    shopAddress: String(settings.shopAddress || "").trim(),
    shopPhone: String(settings.shopPhone || "").trim(),
    heroImages: rawHeroImages.map(item => String(item || "").trim()).filter(Boolean).slice(0, 5),
    shopLatitude: Number(settings.shopLatitude) || fallbackSettings.shopLatitude,
    shopLongitude: Number(settings.shopLongitude) || fallbackSettings.shopLongitude,
    shopWhatsAppNumber: String(settings.shopWhatsAppNumber || fallbackSettings.shopWhatsAppNumber).replace(/[^\d]/g, "").trim() || fallbackSettings.shopWhatsAppNumber,
    deliveryPricePerKm: Math.max(0, Number(settings.deliveryPricePerKm) || fallbackSettings.deliveryPricePerKm),
    minimumDeliveryPrice: Math.max(0, Number(settings.minimumDeliveryPrice) ?? fallbackSettings.minimumDeliveryPrice),
    baseDeliveryDistanceKm: Math.max(0, Number(settings.baseDeliveryDistanceKm) ?? fallbackSettings.baseDeliveryDistanceKm),
    extraKmPrice: Math.max(0, Number(settings.extraKmPrice) ?? fallbackSettings.extraKmPrice),
    maxDeliveryKm: parseOptionalNumber(settings.maxDeliveryKm),
    minimumOrderAmount: Math.max(0, Number(settings.minimumOrderAmount) || fallbackSettings.minimumOrderAmount),
    preparationTimeBase: Math.max(5, Math.round(Number(settings.preparationTimeBase) || fallbackSettings.preparationTimeBase)),
    defaultDeliveryCountdownMinutes: Math.max(5, Math.round(Number(settings.defaultDeliveryCountdownMinutes) || fallbackSettings.defaultDeliveryCountdownMinutes)),
    deliveryZones: Array.isArray(settings.deliveryZones)
      ? settings.deliveryZones
        .map(zone => ({
          id: String(zone.id || `zone-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
          radius: Math.max(0, Number(zone.radius) || 0),
          price: Math.max(0, Number(zone.price) || 0)
        }))
        .filter(zone => zone.radius > 0)
        .sort((a, b) => a.radius - b.radius)
      : [],
    promoCodes: Array.isArray(settings.promoCodes)
      ? settings.promoCodes.map(promo => ({
        code: String(promo.code || "").trim().toUpperCase(),
        type: promo.type === "fixed" ? "fixed" : "percent",
        value: Math.max(0, Number(promo.value) || 0)
      })).filter(promo => promo.code && promo.value > 0).slice(0, 20)
      : [],
    isStoreOpen: settings.isStoreOpen !== false,
    closedMessage: String(settings.closedMessage || fallbackSettings.closedMessage).trim() || fallbackSettings.closedMessage
  };
}

function getFallbackSettings() {
  return normalizeSettings(fallbackSettings);
}

function normalizeOrderPayload(payload) {
  const items = Array.isArray(payload.items) ? payload.items.map(item => ({
    productId: trimOrNull(item.productId),
    productName: String(item.productName || "").trim(),
    quantity: Math.max(1, Number(item.quantity) || 0),
    unitPrice: parseMoney(item.unitPrice),
    options: Array.isArray(item.options) ? item.options : [],
    lineTotal: parseMoney(item.lineTotal)
  })).filter(item => item.productName && item.quantity > 0) : [];

  const customerPhone = String(payload.customerPhone || "").trim();
  const firebaseUid = trimOrNull(payload.firebaseUid);
  const latitude = parseOptionalNumber(payload.latitude);
  const longitude = parseOptionalNumber(payload.longitude);
  const locationAccuracy = parseOptionalNumber(payload.locationAccuracy);
  const locationTimestamp = trimOrNull(payload.locationTimestamp);
  const total = parseMoney(payload.total, NaN);
  if (!customerPhone) throw new Error("Customer phone is required");
  if (!firebaseUid) throw new Error("Authenticated user is required");
  if (!items.length) throw new Error("Cart items are required");
  if (!Number.isFinite(total) || total <= 0) throw new Error("Total is required");

  return {
    customerName: String(payload.customerName || "").trim(),
    customerPhone,
    customerEmail: trimOrNull(payload.customerEmail),
    firebaseUid,
    mode: payload.mode === "pickup" ? "pickup" : "delivery",
    address: trimOrNull(payload.address),
    latitude,
    longitude,
    locationAccuracy,
    locationTimestamp,
    distanceKm: parseMoney(payload.distanceKm),
    deliveryZoneRadius: parseOptionalNumber(payload.deliveryZoneRadius),
    deliveryFee: parseMoney(payload.deliveryFee),
    subtotal: parseMoney(payload.subtotal),
    discount: parseMoney(payload.discount),
    total,
    promoCode: trimOrNull(payload.promoCode),
    whatsappMessage: String(payload.whatsappMessage || "").trim(),
    items
  };
}

function mapOrderRow(row) {
  return {
    id: Number(row.id),
    createdAt: row.created_at,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    customerEmail: row.customer_email,
    firebaseUid: row.firebase_uid,
    mode: row.mode,
    address: row.address,
    latitude: row.latitude === null ? null : Number(row.latitude),
    longitude: row.longitude === null ? null : Number(row.longitude),
    locationAccuracy: row.location_accuracy === null ? null : Number(row.location_accuracy),
    locationTimestamp: row.location_timestamp || null,
    distanceKm: Number(row.distance_km || 0),
    deliveryZoneRadius: row.delivery_zone_radius === null ? null : Number(row.delivery_zone_radius),
    acceptedAt: row.accepted_at || null,
    readyAt: row.ready_at || null,
    estimatedDeliveryMinutes: row.estimated_delivery_minutes === null || row.estimated_delivery_minutes === undefined ? null : Number(row.estimated_delivery_minutes),
    deliveryFee: Number(row.delivery_fee || 0),
    subtotal: Number(row.subtotal || 0),
    discount: Number(row.discount || 0),
    total: Number(row.total || 0),
    promoCode: row.promo_code,
    whatsappMessage: row.whatsapp_message,
    status: row.status,
    customerId: row.customer_id === null ? null : Number(row.customer_id),
    estimatedTime: row.estimated_time || null
  };
}

function mapOrderItemRow(row) {
  return {
    id: Number(row.id),
    orderId: Number(row.order_id),
    productId: row.product_id,
    productName: row.product_name,
    quantity: Number(row.quantity),
    unitPrice: Number(row.unit_price || 0),
    options: Array.isArray(row.options_json) ? row.options_json : [],
    lineTotal: Number(row.line_total || 0)
  };
}

function mapCustomerRow(row) {
  return {
    id: Number(row.id),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    name: row.name,
    phone: row.phone,
    email: row.email,
    firebaseUid: row.firebase_uid,
    totalOrders: Number(row.total_orders || 0),
    totalSpent: Number(row.total_spent || 0),
    lastOrderAt: row.last_order_at
  };
}

function mapCustomerSession(row) {
  const phone = String(row?.phone || "").trim();
  const fallbackName = phone ? `Client ${phone.slice(-4)}` : "Client 3P";
  return {
    uid: phone ? `phone:${phone}` : `customer:${row?.id || ""}`,
    displayName: String(row?.name || "").trim() || fallbackName,
    email: "",
    photoURL: "",
    phone,
    provider: "phone-local"
  };
}

function mapNotificationRow(row) {
  return {
    id: Number(row.id),
    createdAt: row.created_at,
    title: row.title,
    message: row.message,
    imageUrl: row.image_url || "",
    active: row.active !== false,
    targetCustomerId: row.target_customer_id || "",
    linkedProductId: row.linked_product_id || "",
    linkedCategoryId: row.linked_category_id || "",
    ctaText: row.cta_text || "",
    startsAt: row.starts_at || null,
    endsAt: row.ends_at || null
  };
}

function mapDeviceTokenRow(row) {
  return {
    id: Number(row.id),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    firebaseUid: row.firebase_uid,
    phone: row.phone,
    platform: row.platform,
    token: row.token
  };
}

function getEstimatedTime(order, activeOrders = 0, preparationTimeBase = fallbackSettings.preparationTimeBase) {
  if (order.status === "delivered") return "Livree";
  if (order.status === "cancelled") return "Annulee";
  if (order.mode === "pickup") return "Pr?te dans 25 min";
  const distanceMinutes = Math.max(0, Math.round((Number(order.distanceKm || order.distance_km || 0)) * 3));
  const queueMinutes = Math.max(0, activeOrders) * 4;
  const estimateMin = Math.max(15, Number(preparationTimeBase || fallbackSettings.preparationTimeBase) + distanceMinutes + queueMinutes);
  const estimateMax = estimateMin + 10;
  return `${estimateMin}-${estimateMax} min`;
}

function computeLiveTracking(row, fallbackEstimate = null) {
  const rawStatus = String(row.status || "");
  if (rawStatus === "cancelled") {
    return {
      displayStatus: "cancelled",
      countdownMinutesRemaining: null,
      trackingProgress: 0,
      estimatedTime: "Annulee"
    };
  }

  if (row.mode === "pickup") {
    const now = Date.now();
    const createdAt = new Date(row.created_at).getTime();
    const acceptedUntil = row.accepted_until
      ? new Date(row.accepted_until).getTime()
      : createdAt + 5 * 60 * 1000;
    const preparingUntil = row.preparing_until
      ? new Date(row.preparing_until).getTime()
      : acceptedUntil + 20 * 60 * 1000;

    let displayStatus = rawStatus === "ready" || rawStatus === "delivered" ? "ready" : "accepted";
    let countdownMinutesRemaining = 0;
    let trackingProgress = 0;
    let estimatedTime = "";

    if (displayStatus === "ready") {
      countdownMinutesRemaining = 0;
      trackingProgress = 100;
      estimatedTime = "Commande pr?te";
    } else if (now < acceptedUntil) {
      displayStatus = "accepted";
      countdownMinutesRemaining = Math.max(0, Math.ceil((acceptedUntil - now) / 60000));
      trackingProgress = Math.min(33, Math.max(0, Math.round(((now - createdAt) / (acceptedUntil - createdAt)) * 33)));
      estimatedTime = `Accept?e ? ${countdownMinutesRemaining} min restantes`;
    } else if (now < preparingUntil) {
      displayStatus = "preparing";
      countdownMinutesRemaining = Math.max(0, Math.ceil((preparingUntil - now) / 60000));
      trackingProgress = 34 + Math.min(65, Math.max(0, Math.round(((now - acceptedUntil) / (preparingUntil - acceptedUntil)) * 66)));
      estimatedTime = `En pr?paration ? ${countdownMinutesRemaining} min restantes`;
    } else {
      displayStatus = "ready";
      countdownMinutesRemaining = 0;
      trackingProgress = 100;
      estimatedTime = "Commande pr?te";
    }

    return {
      displayStatus,
      countdownMinutesRemaining,
      trackingProgress,
      estimatedTime
    };
  }

  if (rawStatus === "delivered") {
    return {
      displayStatus: "delivered",
      countdownMinutesRemaining: 0,
      trackingProgress: 100,
      estimatedTime: "Commande livree ?"
    };
  }

  const acceptedAt = row.accepted_at ? new Date(row.accepted_at) : null;
  const estimatedDeliveryMinutes = Number(row.estimated_delivery_minutes || 0);
  if (!acceptedAt || Number.isNaN(acceptedAt.getTime()) || estimatedDeliveryMinutes <= 0 || row.mode !== "delivery" || !["accepted", "preparing"].includes(rawStatus)) {
    return {
      displayStatus: rawStatus,
      countdownMinutesRemaining: null,
      trackingProgress: rawStatus === "new" ? 0 : rawStatus === "accepted" ? 33 : rawStatus === "preparing" ? 66 : 0,
      estimatedTime: fallbackEstimate
    };
  }

  const elapsedMinutes = Math.max(0, Math.floor((Date.now() - acceptedAt.getTime()) / 60000));
  const remaining = Math.max(0, estimatedDeliveryMinutes - elapsedMinutes);
  let displayStatus = "accepted";
  if (remaining <= 0) displayStatus = "delivered";
  else if (remaining <= 5) displayStatus = "out_for_delivery";
  else if (remaining <= 20) displayStatus = "preparing";
  const progress = displayStatus === "delivered"
    ? 100
    : Math.min(99, Math.max(0, Math.round(((estimatedDeliveryMinutes - remaining) / estimatedDeliveryMinutes) * 100)));
  return {
    displayStatus,
    countdownMinutesRemaining: remaining,
    trackingProgress: progress,
    estimatedTime: displayStatus === "delivered" ? "Commande livree ?" : `Livraison estimee dans ${remaining} min`
  };
}

function applyOrderTracking(row, activeOrders = 0, preparationTimeBase = fallbackSettings.preparationTimeBase) {

  const baseOrder = mapOrderRow(row);
  const fallbackEstimate = getEstimatedTime(row, activeOrders, preparationTimeBase);
  const tracking = computeLiveTracking(row, fallbackEstimate);
  return {
    ...baseOrder,
    status: tracking.displayStatus,
    rawStatus: baseOrder.status,
    countdownMinutesRemaining: tracking.countdownMinutesRemaining,
    trackingProgress: tracking.trackingProgress,
    estimatedTime: tracking.estimatedTime
  };
}

async function withDatabase(handler) {
  ensureDatabaseAvailable();
  await ensureDatabase();
  return handler();
}

async function loadSettingsRowDirect() {
  const result = await dbPool.query(`
    SELECT *
    FROM settings
    WHERE id = 1
    LIMIT 1
  `);
  return result.rows[0] ? mapSettingsRow(result.rows[0]) : getFallbackSettings();
}

function mapSettingsRow(row) {
  return normalizeSettings({
    storeName: row?.store_name,
    shopAddress: row?.shop_address,
    shopPhone: row?.shop_phone,
    heroImages: Array.isArray(row?.hero_images_json) ? row.hero_images_json : [],
    shopLatitude: row?.shop_latitude,
    shopLongitude: row?.shop_longitude,
    shopWhatsAppNumber: row?.shop_whatsapp_number,
    minimumDeliveryPrice: row?.minimum_delivery_price,
    baseDeliveryDistanceKm: row?.base_delivery_distance_km,
    extraKmPrice: row?.extra_km_price,
    maxDeliveryKm: row?.max_delivery_km,
    minimumOrderAmount: row?.minimum_order_amount,
    preparationTimeBase: row?.preparation_time_base,
    defaultDeliveryCountdownMinutes: row?.default_delivery_countdown_minutes,
    deliveryZones: Array.isArray(row?.delivery_zones_json) ? row.delivery_zones_json : [],
    promoCodes: Array.isArray(row?.promo_codes_json) ? row.promo_codes_json : [],
    isStoreOpen: row?.is_store_open,
    closedMessage: row?.closed_message
  });
}

async function loadSettingsFromDb() {
  return withDatabase(async () => {
    const result = await dbPool.query(`
      SELECT *
      FROM settings
      WHERE id = 1
      LIMIT 1
    `);
    if (!result.rows.length) {
      const defaults = getFallbackSettings();
      await updateSettingsInDb(defaults);
      return defaults;
    }
    const settings = await loadSettingsRowDirect();
    console.log("Settings loaded from PostgreSQL", {
      updatedAt: result.rows[0]?.updated_at,
      isStoreOpen: settings.isStoreOpen,
      zoneCount: settings.deliveryZones.length
    });
    return settings;
  });
}

async function loadSettingsDebug() {
  return withDatabase(async () => {
    const result = await dbPool.query(`
      SELECT *
      FROM settings
      WHERE id = 1
      LIMIT 1
    `);
    const row = result.rows[0] || null;
    return {
      databaseConnected: true,
      settingsFromDb: row ? mapSettingsRow(row) : null,
      updatedAt: row?.updated_at || null
    };
  });
}

async function updateSettingsInDb(settings) {
  return withDatabase(async () => {
    const normalized = normalizeSettings(settings);
        const result = await dbPool.query(`
          INSERT INTO settings (
            id, store_name, shop_address, shop_phone, shop_latitude, shop_longitude, shop_whatsapp_number,
            minimum_delivery_price, base_delivery_distance_km, extra_km_price, max_delivery_km,
            minimum_order_amount, preparation_time_base, default_delivery_countdown_minutes,
            delivery_zones_json, promo_codes_json, hero_images_json, is_store_open, closed_message, updated_at
          )
          VALUES (1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14::jsonb, $15::jsonb, $16::jsonb, $17, $18, NOW())
          ON CONFLICT (id) DO UPDATE SET
            store_name = EXCLUDED.store_name,
            shop_address = EXCLUDED.shop_address,
            shop_phone = EXCLUDED.shop_phone,
            shop_latitude = EXCLUDED.shop_latitude,
            shop_longitude = EXCLUDED.shop_longitude,
            shop_whatsapp_number = EXCLUDED.shop_whatsapp_number,
            minimum_delivery_price = EXCLUDED.minimum_delivery_price,
            base_delivery_distance_km = EXCLUDED.base_delivery_distance_km,
            extra_km_price = EXCLUDED.extra_km_price,
            max_delivery_km = EXCLUDED.max_delivery_km,
            minimum_order_amount = EXCLUDED.minimum_order_amount,
            preparation_time_base = EXCLUDED.preparation_time_base,
            default_delivery_countdown_minutes = EXCLUDED.default_delivery_countdown_minutes,
            delivery_zones_json = EXCLUDED.delivery_zones_json,
            promo_codes_json = EXCLUDED.promo_codes_json,
            hero_images_json = EXCLUDED.hero_images_json,
            is_store_open = EXCLUDED.is_store_open,
            closed_message = EXCLUDED.closed_message,
            updated_at = NOW()
          RETURNING *
        `, [
          normalized.storeName,
          normalized.shopAddress,
          normalized.shopPhone,
          normalized.shopLatitude,
          normalized.shopLongitude,
          normalized.shopWhatsAppNumber,
          normalized.minimumDeliveryPrice,
          normalized.baseDeliveryDistanceKm,
          normalized.extraKmPrice,
          normalized.maxDeliveryKm,
          normalized.minimumOrderAmount,
          normalized.preparationTimeBase,
          normalized.defaultDeliveryCountdownMinutes,
          JSON.stringify(normalized.deliveryZones),
          JSON.stringify(normalized.promoCodes),
          JSON.stringify(normalized.heroImages),
          normalized.isStoreOpen,
          normalized.closedMessage
        ]);
    console.log("Settings saved to PostgreSQL", {
      updatedAt: result.rows[0]?.updated_at,
      isStoreOpen: normalized.isStoreOpen,
      zoneCount: normalized.deliveryZones.length
    });
    return mapSettingsRow(result.rows[0]);
  });
}

async function loadSettingsSafe() {
  try {
    return await loadSettingsFromDb();
  } catch {
    return getFallbackSettings();
  }
}

async function loadMenuFromDb() {
  return withDatabase(async () => {
    const result = await dbPool.query(`
      SELECT categories_json, products_json, updated_at
      FROM menu_snapshots
      WHERE id = 1
      LIMIT 1
    `);
    const row = result.rows[0];
    if (!row) {
      const seedMenu = readMenu();
      return normalizeMenu(seedMenu);
    }
    const normalized = normalizeMenu({
      categories: row.categories_json || [],
      products: row.products_json || []
    });
    console.log("Menu snapshot loaded from PostgreSQL", {
      updatedAt: row.updated_at,
      categoryCount: normalized.categories.length,
      productCount: normalized.products.length
    });
    return normalized;
  });
}

async function saveMenuToDb(menu) {
  return withDatabase(async () => {
    const normalized = normalizeMenu(menu);
    await dbPool.query(`
      INSERT INTO menu_snapshots (id, categories_json, products_json, updated_at)
      VALUES (1, $1::jsonb, $2::jsonb, NOW())
      ON CONFLICT (id) DO UPDATE SET
        categories_json = EXCLUDED.categories_json,
        products_json = EXCLUDED.products_json,
        updated_at = NOW()
    `, [
      JSON.stringify(normalized.categories || []),
      JSON.stringify(normalized.products || [])
    ]);
    console.log("Menu snapshot saved to PostgreSQL", {
      categoryCount: normalized.categories.length,
      productCount: normalized.products.length
    });
    return normalized;
  });
}

async function loadMenuSafe() {
  try {
    return await loadMenuFromDb();
  } catch {
    return readMenu();
  }
}

async function findExistingCustomer(client, order) {
  const clauses = [];
  const values = [];
  if (order.customerPhone) {
    values.push(order.customerPhone);
    clauses.push(`phone = $${values.length}`);
  }
  if (order.customerEmail) {
    values.push(order.customerEmail);
    clauses.push(`email = $${values.length}`);
  }
  if (order.firebaseUid) {
    values.push(order.firebaseUid);
    clauses.push(`firebase_uid = $${values.length}`);
  }
  if (!clauses.length) return null;
  const result = await client.query(`
    SELECT *
    FROM customers
    WHERE ${clauses.join(" OR ")}
    ORDER BY updated_at DESC
    LIMIT 1
  `, values);
  return result.rows[0] || null;
}

async function upsertCustomer(client, order) {
  const existing = await findExistingCustomer(client, order);
  if (existing) {
    const result = await client.query(`
      UPDATE customers
      SET
        name = COALESCE(NULLIF($2, ''), name),
        phone = COALESCE($3, phone),
        email = COALESCE($4, email),
        firebase_uid = COALESCE($5, firebase_uid),
        total_orders = total_orders + 1,
        total_spent = total_spent + $6,
        last_order_at = NOW(),
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [
      existing.id,
      order.customerName,
      order.customerPhone,
      order.customerEmail,
      order.firebaseUid,
      order.total
    ]);
    return result.rows[0];
  }

  const result = await client.query(`
    INSERT INTO customers (
      name, phone, email, firebase_uid, total_orders, total_spent, last_order_at
    )
    VALUES ($1, $2, $3, $4, 1, $5, NOW())
    RETURNING *
  `, [
    order.customerName || "",
    order.customerPhone,
    order.customerEmail,
    order.firebaseUid,
    order.total
  ]);
  return result.rows[0];
}

async function authenticateCustomerByPhone({ phone = "", name = "" } = {}) {
  return withDatabase(async () => {
    const normalizedPhone = normalizePhone(phone);
    const normalizedName = String(name || "").trim();
    if (!normalizedPhone) {
      throw new Error("Phone number is required");
    }

    const existingResult = await dbPool.query(`
      SELECT *
      FROM customers
      WHERE phone = $1
      LIMIT 1
    `, [normalizedPhone]);

    let customer = existingResult.rows[0] || null;
    if (customer) {
      if (normalizedName && normalizedName !== customer.name) {
        const updatedResult = await dbPool.query(`
          UPDATE customers
          SET
            name = COALESCE(NULLIF($2, ''), name),
            updated_at = NOW()
          WHERE id = $1
          RETURNING *
        `, [customer.id, normalizedName]);
        customer = updatedResult.rows[0] || customer;
      }
    } else {
      if (!normalizedName) {
        throw new Error("Name is required for first login");
      }
      const insertedResult = await dbPool.query(`
        INSERT INTO customers (
          name, phone, total_orders, total_spent, updated_at
        )
        VALUES ($1, $2, 0, 0, NOW())
        RETURNING *
      `, [normalizedName, normalizedPhone]);
      customer = insertedResult.rows[0];
    }

    return {
      customer: mapCustomerRow(customer),
      session: mapCustomerSession(customer)
    };
  });
}

async function upsertAuthenticatedUser({ firebaseUid = "", phone = "", location = null, lastLoginAt = "" } = {}) {
  const normalizedPhone = normalizePhone(phone);
  const normalizedUid = trimOrNull(firebaseUid);
  if (!normalizedUid) throw new Error("firebaseUid is required");
  if (!normalizedPhone) throw new Error("phone is required");
  const safeLocation = location && Number.isFinite(Number(location.lat)) && Number.isFinite(Number(location.lng))
    ? {
        lat: Number(location.lat),
        lng: Number(location.lng)
      }
    : null;
  const record = {
    firebaseUid: normalizedUid,
    phone: normalizedPhone,
    location: safeLocation,
    lastLoginAt: trimOrNull(lastLoginAt) || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  if (dbPool) {
    try {
      await ensureDatabase();
      await dbPool.query(`
        INSERT INTO customers (phone, firebase_uid, updated_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (phone) DO UPDATE SET
          firebase_uid = COALESCE(EXCLUDED.firebase_uid, customers.firebase_uid),
          updated_at = NOW()
      `, [normalizedPhone, normalizedUid]);
    } catch (error) {
      console.warn("Could not sync authenticated user into PostgreSQL customers:", error.message);
    }
  }

  const users = readUsers();
  const existingIndex = users.findIndex(user => user.firebaseUid === normalizedUid || user.phone === normalizedPhone);
  if (existingIndex >= 0) {
    users[existingIndex] = {
      ...users[existingIndex],
      ...record
    };
  } else {
    users.push(record);
  }
  saveUsers(users);
  return record;
}

async function createOrderRecord(order) {
  return withDatabase(async () => {
    const client = await dbPool.connect();
    try {
      await client.query("BEGIN");
      const settings = await loadSettingsRowDirect();
      const customer = await upsertCustomer(client, order);
      const activeOrdersResult = await client.query(`
        SELECT COUNT(*)::int AS active_count
        FROM orders
        WHERE status IN ('new', 'accepted', 'preparing')
      `);
      const activeOrders = Number(activeOrdersResult.rows[0]?.active_count || 0);
      const distanceMinutes = Math.max(0, Math.round((Number(order.distanceKm || 0)) * 3));
      const queueMinutes = activeOrders * 4;
      const estimateMin = Math.max(15, Number(settings.preparationTimeBase || fallbackSettings.preparationTimeBase) + distanceMinutes + queueMinutes);
      const estimateMax = estimateMin + 10;
      const estimatedTime = `${estimateMin}-${estimateMax} min`;
      const pickupReadyAt = order.mode === "pickup"
        ? new Date(Date.now() + 25 * 60 * 1000).toISOString()
        : null;
      const acceptedUntil = order.mode === "pickup"
        ? new Date(Date.now() + 5 * 60 * 1000).toISOString()
        : null;
      const preparingUntil = order.mode === "pickup"
        ? new Date(Date.now() + 25 * 60 * 1000).toISOString()
        : null;
      const initialStatus = order.mode === "pickup" ? "accepted" : "new";

      const orderResult = await client.query(`
        INSERT INTO orders (
          customer_name, customer_phone, customer_email, firebase_uid,
          mode, address, latitude, longitude, location_accuracy, location_timestamp, distance_km, delivery_zone_radius, accepted_at, ready_at,
          accepted_until, preparing_until, estimated_delivery_minutes,
          delivery_fee, subtotal, discount, total, promo_code, whatsapp_message, status, customer_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NULL, $13, $14, $15, NULL, $16, $17, $18, $19, $20, $21, $22, $23)
        RETURNING *
      `, [
        order.customerName || "",
        order.customerPhone,
        order.customerEmail,
        order.firebaseUid,
        order.mode,
        order.address,
        order.latitude,
        order.longitude,
        order.locationAccuracy,
        order.locationTimestamp,
        order.distanceKm,
        order.deliveryZoneRadius,
        pickupReadyAt,
        acceptedUntil,
        preparingUntil,
        order.deliveryFee,
        order.subtotal,
        order.discount,
        order.total,
        order.promoCode,
        order.whatsappMessage,
        initialStatus,
        customer.id
      ]);
      let savedOrder = orderResult.rows[0];
      savedOrder.estimated_time = estimatedTime;
      const finalWhatsappMessage = String(order.whatsappMessage || "").replaceAll("__ORDER_ID__", String(savedOrder.id));
      if (finalWhatsappMessage !== savedOrder.whatsapp_message) {
        const updatedOrderResult = await client.query(`
          UPDATE orders
          SET whatsapp_message = $2
          WHERE id = $1
          RETURNING *
        `, [savedOrder.id, finalWhatsappMessage]);
        savedOrder = updatedOrderResult.rows[0];
      }

      for (const item of order.items) {
        await client.query(`
          INSERT INTO order_items (
            order_id, product_id, product_name, quantity, unit_price, options_json, line_total
          )
          VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)
        `, [
          savedOrder.id,
          item.productId,
          item.productName,
          item.quantity,
          item.unitPrice,
          JSON.stringify(item.options || []),
          item.lineTotal
        ]);
      }

      await client.query("COMMIT");
      return { order: applyOrderTracking(savedOrder, activeOrders, settings.preparationTimeBase), customer: mapCustomerRow(customer) };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  });
}

async function listOrders(filters = {}) {
  return withDatabase(async () => {
    const settings = await loadSettingsRowDirect();
    const values = [];
    const conditions = [];

    const filterByComputedStatus = filters.status === "ready";
    if (filters.status && !filterByComputedStatus) {
      values.push(filters.status);
      conditions.push(`o.status = $${values.length}`);
    }
    if (filters.mode) {
      values.push(filters.mode);
      conditions.push(`o.mode = $${values.length}`);
    }
    if (filters.search) {
      values.push(`%${filters.search.toLowerCase()}%`);
      conditions.push(`(
        LOWER(o.customer_name) LIKE $${values.length}
        OR LOWER(o.customer_phone) LIKE $${values.length}
        OR CAST(o.id AS TEXT) LIKE $${values.length}
      )`);
    }

    const [result, activeOrdersResult] = await Promise.all([
      dbPool.query(`
      SELECT o.*
      FROM orders o
      ${conditions.length ? `WHERE ${conditions.join(" AND ")}` : ""}
      ORDER BY o.created_at DESC
      LIMIT 300
    `, values),
      dbPool.query(`
        SELECT COUNT(*)::int AS active_count
        FROM orders
        WHERE status IN ('new', 'accepted', 'preparing')
      `)
    ]);

    const activeOrders = Number(activeOrdersResult.rows[0]?.active_count || 0);
    const trackedOrders = result.rows.map(row => applyOrderTracking(row, activeOrders, settings.preparationTimeBase));
    return filterByComputedStatus ? trackedOrders.filter(order => order.status === filters.status) : trackedOrders;
  });
}

async function getOrderById(orderId) {
  return withDatabase(async () => {
    const settings = await loadSettingsRowDirect();
    const [orderResult, activeOrdersResult] = await Promise.all([
      dbPool.query(`
      SELECT o.*, c.id AS customer_db_id, c.name AS customer_db_name, c.phone AS customer_db_phone,
             c.email AS customer_db_email, c.firebase_uid AS customer_db_firebase_uid,
             c.total_orders AS customer_total_orders, c.total_spent AS customer_total_spent,
             c.last_order_at AS customer_last_order_at
      FROM orders o
      LEFT JOIN customers c ON c.id = o.customer_id
      WHERE o.id = $1
      LIMIT 1
    `, [orderId]),
      dbPool.query(`
        SELECT COUNT(*)::int AS active_count
        FROM orders
        WHERE status IN ('new', 'accepted', 'preparing')
      `)
    ]);

    if (!orderResult.rows.length) return null;

    const itemsResult = await dbPool.query(`
      SELECT *
      FROM order_items
      WHERE order_id = $1
      ORDER BY id ASC
    `, [orderId]);

    const row = orderResult.rows[0];
    return {
      ...applyOrderTracking(row, Number(activeOrdersResult.rows[0]?.active_count || 0), settings.preparationTimeBase),
      items: itemsResult.rows.map(mapOrderItemRow),
      customer: row.customer_db_id ? {
        id: Number(row.customer_db_id),
        name: row.customer_db_name,
        phone: row.customer_db_phone,
        email: row.customer_db_email,
        firebaseUid: row.customer_db_firebase_uid,
        totalOrders: Number(row.customer_total_orders || 0),
        totalSpent: Number(row.customer_total_spent || 0),
        lastOrderAt: row.customer_last_order_at
      } : null
    };
  });
}

async function updateOrderStatus(orderId, status) {
  return withDatabase(async () => {
    const settings = await loadSettingsRowDirect();
    const allowedStatuses = new Set(["new", "accepted", "preparing", "ready", "delivered", "cancelled"]);
    if (!allowedStatuses.has(status)) {
      throw new Error("Invalid order status");
    }
    const [result, activeOrdersResult] = await Promise.all([
      dbPool.query(`
      UPDATE orders
      SET
        status = $2,
        accepted_at = CASE
          WHEN $2 = 'accepted' AND mode = 'delivery' THEN NOW()
          WHEN $2 = 'new' THEN NULL
          ELSE accepted_at
        END,
        ready_at = CASE
          WHEN $2 = 'ready' AND mode = 'pickup' THEN NOW()
          WHEN $2 IN ('accepted', 'preparing', 'cancelled') AND mode = 'pickup' THEN NULL
          WHEN $2 IN ('new', 'delivered', 'cancelled') THEN NULL
          ELSE ready_at
        END,
        accepted_until = CASE
          WHEN $2 = 'accepted' AND mode = 'pickup' THEN NOW() + INTERVAL '5 minutes'
          WHEN $2 = 'preparing' AND mode = 'pickup' THEN NOW()
          WHEN $2 IN ('ready', 'cancelled') AND mode = 'pickup' THEN accepted_until
          ELSE accepted_until
        END,
        preparing_until = CASE
          WHEN $2 = 'accepted' AND mode = 'pickup' THEN NOW() + INTERVAL '25 minutes'
          WHEN $2 = 'preparing' AND mode = 'pickup' THEN NOW() + INTERVAL '20 minutes'
          WHEN $2 = 'ready' AND mode = 'pickup' THEN NOW()
          WHEN $2 = 'cancelled' AND mode = 'pickup' THEN preparing_until
          ELSE preparing_until
        END,
        estimated_delivery_minutes = CASE
          WHEN $2 = 'accepted' AND mode = 'delivery' THEN $3
          WHEN $2 = 'new' THEN NULL
          ELSE estimated_delivery_minutes
        END
      WHERE id = $1
      RETURNING *
    `, [orderId, status, settings.defaultDeliveryCountdownMinutes]),
      dbPool.query(`
        SELECT COUNT(*)::int AS active_count
        FROM orders
        WHERE status IN ('new', 'accepted', 'preparing')
      `)
    ]);
    return result.rows[0]
      ? applyOrderTracking(result.rows[0], Number(activeOrdersResult.rows[0]?.active_count || 0), settings.preparationTimeBase)
      : null;
  });
}

async function listCustomers(search = "") {
  return withDatabase(async () => {
    const values = [];
    const where = [];
    if (search) {
      values.push(`%${search.toLowerCase()}%`);
      where.push(`(
        LOWER(COALESCE(name, '')) LIKE $${values.length}
        OR LOWER(COALESCE(phone, '')) LIKE $${values.length}
        OR LOWER(COALESCE(email, '')) LIKE $${values.length}
      )`);
    }
    const result = await dbPool.query(`
      SELECT *
      FROM customers
      ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY last_order_at DESC NULLS LAST, updated_at DESC
      LIMIT 300
    `, values);
    return result.rows.map(mapCustomerRow);
  });
}

async function listCustomerOrders({ firebaseUid = "", email = "", phone = "" } = {}) {
  return withDatabase(async () => {
    const settings = await loadSettingsRowDirect();
    const values = [];
    const conditions = [];
    if (firebaseUid) {
      values.push(firebaseUid);
      conditions.push(`o.firebase_uid = $${values.length}`);
    }
    if (email) {
      values.push(email.toLowerCase());
      conditions.push(`LOWER(COALESCE(o.customer_email, '')) = $${values.length}`);
    }
    if (phone) {
      values.push(phone);
      conditions.push(`o.customer_phone = $${values.length}`);
    }
    if (!conditions.length) {
      throw new Error("Customer identifier is required");
    }

    const [ordersResult, activeOrdersResult] = await Promise.all([
      dbPool.query(`
      SELECT o.*
      FROM orders o
      WHERE ${conditions.join(" OR ")}
      ORDER BY o.created_at DESC
      LIMIT 50
    `, values),
      dbPool.query(`
        SELECT COUNT(*)::int AS active_count
        FROM orders
        WHERE status IN ('new', 'accepted', 'preparing')
      `)
    ]);

    const orderIds = ordersResult.rows.map(row => row.id);
    let itemsByOrder = new Map();
    if (orderIds.length) {
      const itemsResult = await dbPool.query(`
        SELECT *
        FROM order_items
        WHERE order_id = ANY($1::bigint[])
        ORDER BY id ASC
      `, [orderIds]);
      itemsByOrder = itemsResult.rows.reduce((map, row) => {
        const current = map.get(Number(row.order_id)) || [];
        current.push(mapOrderItemRow(row));
        map.set(Number(row.order_id), current);
        return map;
      }, new Map());
    }

    const activeOrders = Number(activeOrdersResult.rows[0]?.active_count || 0);
    return ordersResult.rows.map(row => ({
      ...applyOrderTracking(row, activeOrders, settings.preparationTimeBase),
      items: itemsByOrder.get(Number(row.id)) || []
    }));
  });
}

async function getCustomerOrderById(orderId, { firebaseUid = "", email = "", phone = "" } = {}) {
  return withDatabase(async () => {
    const settings = await loadSettingsRowDirect();
    const values = [orderId];
    const conditions = ["o.id = $1"];
    const identityClauses = [];
    if (firebaseUid) {
      values.push(firebaseUid);
      identityClauses.push(`o.firebase_uid = $${values.length}`);
    }
    if (email) {
      values.push(email.toLowerCase());
      identityClauses.push(`LOWER(COALESCE(o.customer_email, '')) = $${values.length}`);
    }
    if (phone) {
      values.push(phone);
      identityClauses.push(`o.customer_phone = $${values.length}`);
    }
    if (!identityClauses.length) {
      throw new Error("Customer identifier is required");
    }
    conditions.push(`(${identityClauses.join(" OR ")})`);

    const [orderResult, activeOrdersResult] = await Promise.all([
      dbPool.query(`
        SELECT o.*
        FROM orders o
        WHERE ${conditions.join(" AND ")}
        LIMIT 1
      `, values),
      dbPool.query(`
        SELECT COUNT(*)::int AS active_count
        FROM orders
        WHERE status IN ('new', 'accepted', 'preparing')
      `)
    ]);

    if (!orderResult.rows.length) return null;
    const row = orderResult.rows[0];
    const itemsResult = await dbPool.query(`
      SELECT *
      FROM order_items
      WHERE order_id = $1
      ORDER BY id ASC
    `, [orderId]);
    return {
      ...applyOrderTracking(row, Number(activeOrdersResult.rows[0]?.active_count || 0), settings.preparationTimeBase),
      items: itemsResult.rows.map(mapOrderItemRow)
    };
  });
}

function enrichNotification(notification) {
  const menu = readMenu();
  const linkedProduct = notification.linkedProductId
    ? menu.products.find(product => String(product.id) === String(notification.linkedProductId)) || null
    : null;
  const linkedCategory = notification.linkedCategoryId
    ? menu.categories.find(category => String(category.name) === String(notification.linkedCategoryId))
      || menu.categories.find(category => String(category.id || category.name) === String(notification.linkedCategoryId))
      || null
    : null;
  return {
    ...notification,
    linkedProduct: linkedProduct ? {
      id: linkedProduct.id,
      name: linkedProduct.name,
      category: linkedProduct.category,
      imageUrl: linkedProduct.imageUrl || ""
    } : null,
    linkedCategory: linkedCategory ? {
      id: linkedCategory.id || linkedCategory.name,
      name: linkedCategory.name,
      imageUrl: linkedCategory.imageUrl || ""
    } : null
  };
}

async function createNotificationRecord(notification) {
  return withDatabase(async () => {
    const result = await dbPool.query(`
      INSERT INTO notifications (
        title, message, image_url, target_customer_id, linked_product_id, linked_category_id, cta_text, starts_at, ends_at, active
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [
      String(notification.title || "").trim(),
      String(notification.message || "").trim(),
      trimOrNull(notification.imageUrl),
      trimOrNull(notification.targetCustomerId),
      trimOrNull(notification.linkedProductId),
      trimOrNull(notification.linkedCategoryId),
      trimOrNull(notification.ctaText),
      trimOrNull(notification.startsAt),
      trimOrNull(notification.endsAt),
      notification.active !== false
    ]);
    return enrichNotification(mapNotificationRow(result.rows[0]));
  });
}

async function listNotifications({ customerId = "" } = {}) {
  return withDatabase(async () => {
    const values = [];
    const filters = [
      "active = TRUE",
      "(starts_at IS NULL OR starts_at <= NOW())",
      "(ends_at IS NULL OR ends_at >= NOW())"
    ];
    if (customerId) {
      values.push(customerId);
      filters.push(`(target_customer_id IS NULL OR target_customer_id = '' OR target_customer_id = $${values.length})`);
    } else {
      filters.push(`(target_customer_id IS NULL OR target_customer_id = '')`);
    }
    const result = await dbPool.query(`
      SELECT *
      FROM notifications
      WHERE ${filters.join(" AND ")}
      ORDER BY created_at DESC
      LIMIT 100
    `, values);
    return result.rows.map(row => enrichNotification(mapNotificationRow(row)));
  });
}

async function listDeviceTokens() {
  return withDatabase(async () => {
    const result = await dbPool.query(`
      SELECT *
      FROM device_tokens
      ORDER BY updated_at DESC
      LIMIT 1000
    `);
    return result.rows.map(mapDeviceTokenRow);
  });
}

async function upsertDeviceToken({ firebaseUid = "", phone = "", platform = "android", token = "" } = {}) {
  return withDatabase(async () => {
    const cleanToken = String(token || "").trim();
    if (!cleanToken) throw new Error("Device token is required");
    const result = await dbPool.query(`
      INSERT INTO device_tokens (firebase_uid, phone, platform, token, updated_at)
      VALUES ($1, $2, $3, $4, NOW())
      ON CONFLICT (token)
      DO UPDATE SET
        firebase_uid = EXCLUDED.firebase_uid,
        phone = EXCLUDED.phone,
        platform = EXCLUDED.platform,
        updated_at = NOW()
      RETURNING *
    `, [
      trimOrNull(firebaseUid),
      trimOrNull(phone),
      String(platform || "android").trim() || "android",
      cleanToken
    ]);
    return result.rows[0];
  });
}

async function getDashboardStats() {
  return withDatabase(async () => {
    const menu = await loadMenuSafe();
    const [todayResult, pendingResult, repeatResult, bestSellingResult] = await Promise.all([
      dbPool.query(`
        SELECT
          COUNT(*)::int AS today_orders,
          COALESCE(SUM(total), 0)::numeric AS today_revenue
        FROM orders
        WHERE created_at::date = CURRENT_DATE
      `),
      dbPool.query(`
        SELECT COUNT(*)::int AS pending_orders
        FROM orders
        WHERE status IN ('new', 'accepted', 'preparing')
      `),
      dbPool.query(`
        SELECT COUNT(*)::int AS repeat_customers
        FROM customers
        WHERE total_orders > 1
      `),
      dbPool.query(`
        SELECT
          oi.product_id,
          oi.product_name,
          SUM(oi.quantity)::int AS quantity
        FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        GROUP BY oi.product_id, oi.product_name
        ORDER BY quantity DESC, oi.product_name ASC
        LIMIT 5
      `)
    ]);

    return {
      todayOrders: Number(todayResult.rows[0]?.today_orders || 0),
      todayRevenue: Number(todayResult.rows[0]?.today_revenue || 0),
      pendingOrders: Number(pendingResult.rows[0]?.pending_orders || 0),
      repeatCustomers: Number(repeatResult.rows[0]?.repeat_customers || 0),
      bestSellingProducts: bestSellingResult.rows.map(row => ({
        productId: row.product_id || "",
        productName: row.product_name || "",
        quantity: Number(row.quantity || 0),
        available: menu.products.some(product => String(product.id) === String(row.product_id) && product.available !== false)
      }))
    };
  });
}

function getImageFromHtml(html) {
  const patterns = [
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
    /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i,
    /<link[^>]+rel=["']image_src["'][^>]+href=["']([^"']+)["']/i,
    /<link[^>]+href=["']([^"']+)["'][^>]+rel=["']image_src["']/i,
    /"display_url"\s*:\s*"([^"]+)"/i,
    /"image"\s*:\s*\{\s*"@type"\s*:\s*"ImageObject"\s*,\s*"url"\s*:\s*"([^"]+)"/i
  ];
  const match = patterns.map(pattern => html.match(pattern)).find(Boolean);
  return match?.[1]?.replaceAll("\\/", "/").replaceAll("&amp;", "&") || "";
}

function isImageUrl(value) {
  try {
    const url = new URL(value);
    return /^https?:$/.test(url.protocol) && /\.(png|jpe?g|webp|gif|avif)(\?.*)?$/i.test(url.pathname + url.search);
  } catch {
    return false;
  }
}

function isHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function asAbsoluteUrl(value, baseUrl) {
  try {
    return new URL(value, baseUrl).toString();
  } catch {
    return value;
  }
}

async function fetchWithBrowserHeaders(url) {
  return fetch(url, {
    headers: {
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9,fr;q=0.8,ar;q=0.7",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36"
    }
  });
}

async function resolveImageUrl(source) {
  if (isImageUrl(source)) return source;
  const upstream = await fetchWithBrowserHeaders(source);
  if (!upstream.ok) throw new Error(`Image page returned ${upstream.status}`);
  const contentType = upstream.headers.get("content-type") || "";
  if (contentType.startsWith("image/")) return upstream.url;
  const html = await upstream.text();
  const imageUrl = asAbsoluteUrl(getImageFromHtml(html), upstream.url || source);
  if (!imageUrl || !isHttpUrl(imageUrl)) throw new Error("Could not resolve image URL");
  return imageUrl;
}

async function proxyImage(response, imageUrl) {
  const upstream = await fetchWithBrowserHeaders(imageUrl);
  if (!upstream.ok) throw new Error(`Image returned ${upstream.status}`);
  const contentType = upstream.headers.get("content-type") || "image/jpeg";
  if (!contentType.startsWith("image/")) throw new Error("Resolved URL is not an image");
  response.writeHead(200, {
    "Content-Type": contentType,
    ...(upstream.headers.get("content-length") ? { "Content-Length": upstream.headers.get("content-length") } : {}),
    "Cache-Control": "public, max-age=604800, stale-while-revalidate=86400, immutable"
  });
  if (!upstream.body) { response.end(); return; }
  for await (const chunk of upstream.body) { response.write(chunk); }
  response.end();
}

function isAdminAuthorized(request) {
  if (!adminPassword) return true;
  return String(request.headers["x-admin-password"] || "") === adminPassword;
}

function readMenu() {
  if (!existsSync(menuPath)) {
    writeMenu(readSeedMenu() || { categories: [], products: [] });
  }
  return restoreSeedMenuIfStale(JSON.parse(readFileSync(menuPath, "utf8")));
}

function readSeedMenu() {
  if (!existsSync(seedMenuPath)) return null;
  return JSON.parse(readFileSync(seedMenuPath, "utf8"));
}

function isStaleMenu(menu) {
  const products = Array.isArray(menu.products) ? menu.products : [];
  const categories = Array.isArray(menu.categories) ? menu.categories : [];
  const directImages = products.filter(product => isImageUrl(product.imageUrl || "")).length;
  return products.length < 19
    || !products.some(product => String(product.name || "").trim().toUpperCase() === "3P CRUSTY")
    || !categories.some(category => String(category.name || category || "").trim().toUpperCase() === "3P CRUSTY")
    || directImages < 10;
}

function restoreSeedMenuIfStale(menu) {
  const seed = readSeedMenu();
  if (!seed || !isStaleMenu(menu)) return normalizeMenu(menu);
  return writeMenu(seed);
}

function normalizeMenu(menu) {
  if (!Array.isArray(menu.categories) || !Array.isArray(menu.products)) {
    throw new Error("Menu must include categories and products arrays");
  }
  const categoryMap = new Map();
  menu.categories.forEach(item => {
    const name = typeof item === "string" ? item : item?.name;
    const imageUrl = typeof item === "string" ? "" : item?.imageUrl;
    const sortOrder = typeof item === "string" ? categoryMap.size : Number(item?.sortOrder);
    const cleanName = String(name || "").trim();
    if (cleanName && !categoryMap.has(cleanName)) {
      categoryMap.set(cleanName, {
        name: cleanName,
        imageUrl: String(imageUrl || "").trim(),
        sortOrder: Number.isFinite(sortOrder) ? sortOrder : categoryMap.size
      });
    }
  });
  const categories = [...categoryMap.values()].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
  const categorySet = new Set(categories.map(category => category.name));
  const products = menu.products.map((product, index) => {
    const name = String(product.name || "").trim();
    const category = String(product.category || "").trim();
    const price = Number(product.price);
    if (!name) throw new Error(`Product ${index + 1} is missing a name`);
    if (!categorySet.has(category)) throw new Error(`Product "${name}" has an invalid category`);
    if (!Number.isFinite(price) || price < 0) throw new Error(`Product "${name}" has an invalid price`);
    return {
      id: String(product.id || `p${Date.now()}${index}`),
      name, category, price,
      tag: String(product.tag || "").trim(),
      badge: ["", "NEW", "TOP SALE"].includes(product.badge) ? product.badge : "",
      available: product.available !== false,
      desc: String(product.desc || "").trim(),
      imageUrl: String(product.imageUrl || "").trim(),
      sortOrder: Number.isFinite(Number(product.sortOrder)) ? Number(product.sortOrder) : index,
      options: Array.isArray(product.options) ? (() => {
        const legacyChoices = [];
        const structuredGroups = [];
        product.options.forEach(opt => {
          if (Array.isArray(opt.choices)) {
            structuredGroups.push({
              name: String(opt.name || "Options").trim(),
              required: Boolean(opt.required),
              choices: opt.choices.map(c => ({
                name: String(c.name || "").trim(),
                price: Math.max(0, Number(c.price) || 0)
              })).filter(c => c.name)
            });
          } else if (opt.name) {
            legacyChoices.push({
              name: String(opt.name).trim(),
              price: Math.max(0, Number(opt.price) || 0)
            });
          }
        });
        if (legacyChoices.length > 0) {
          structuredGroups.push({ name: "Options", required: false, choices: legacyChoices });
        }
        return structuredGroups;
      })() : [],
      color: ["teal", "yellow", "red", "blue"].includes(product.color) ? product.color : "red",
      shape: ["bottle", "cup", "bread", "box", "plate", "tray", "fish", "fruit"].includes(product.shape) ? product.shape : "bread"
    };
  });
  const settings = normalizeSettings(menu.settings || {});
  return {
    settings, categories,
    products: products.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
  };
}

function writeMenu(menu) {
  const seed = readSeedMenu();
  const normalized = normalizeMenu(seed && isStaleMenu(menu) ? seed : menu);
  mkdirSync(dirname(menuPath), { recursive: true });
  writeFileSync(menuPath, `${JSON.stringify(normalized, null, 2)}\n`, "utf8");
  return normalized;
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", chunk => {
      body += chunk;
      if (body.length > 1_000_000) {
        request.destroy();
        reject(new Error("Request body is too large"));
      }
    });
    request.on("end", () => resolve(body));
    request.on("error", reject);
  });
}

// 1. Static file serving (FROM ROOT as requested)
app.use(express.static(__dirname));

// 2. DEBUG ENDPOINT
app.get("/debug-files", (req, res) => {
  res.json({
    cwd: process.cwd(),
    __dirname,
    files: fs.readdirSync(__dirname),
    adminExists: fs.existsSync(path.join(__dirname, "admin.html"))
  });
});

// 3. ADMIN ROUTES (Explicit with fallback)
app.get(["/admin", "/admin.html"], (req, res) => {
  const filePath = path.join(__dirname, "admin.html");
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({
      error: "admin.html not found",
      path: filePath,
      files: fs.readdirSync(__dirname)
    });
  }
  res.sendFile(filePath);
});

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    root,
    menuPath,
    databaseEnabled: hasDatabase,
    databaseReady: hasDatabase && !dbInitError,
    databaseError: dbInitError ? dbInitError.message : null,
    adminPasswordEnabled: Boolean(adminPassword)
  });
});

app.post("/api/admin/check", asyncHandler(async (req, res) => {
  const password = String(req.body.password || "");
  if (adminPassword && password !== adminPassword) {
    return res.status(401).json({ ok: false, error: "Invalid admin password" });
  }
  res.json({ ok: true });
}));

app.get("/api/dashboard", asyncHandler(async (req, res) => {
  if (!isAdminAuthorized(req)) return res.status(401).json({ error: "Unauthorized" });
  const stats = await getDashboardStats();
  res.json(stats);
}));

app.get("/api/device-tokens", asyncHandler(async (req, res) => {
  if (!isAdminAuthorized(req)) return res.status(401).json({ error: "Unauthorized" });
  const tokens = await listDeviceTokens();
  res.json({ tokens });
}));

app.get("/api/menu", asyncHandler(async (req, res) => {
  const menu = await loadMenuSafe();
  menu.settings = await loadSettingsSafe();
  res.json(menu);
}));

app.get("/api/settings", asyncHandler(async (req, res) => {
  const settings = await loadSettingsSafe();
  res.json(settings);
}));

app.put("/api/settings", asyncHandler(async (req, res) => {
  if (!isAdminAuthorized(req)) return res.status(401).json({ error: "Unauthorized" });
  const settings = await updateSettingsInDb(req.body);
  res.json(settings);
}));

app.get("/api/orders", asyncHandler(async (req, res) => {
  if (!isAdminAuthorized(req)) return res.status(401).json({ error: "Unauthorized" });
  const orders = await listOrders({
    status: req.query.status,
    search: req.query.search
  });
  res.json({ orders });
}));

app.get("/api/orders/:id", asyncHandler(async (req, res) => {
  if (!isAdminAuthorized(req)) return res.status(401).json({ error: "Unauthorized" });
  const order = await getOrderById(Number(req.params.id));
  if (!order) return res.status(404).json({ error: "Not found" });
  res.json(order);
}));

app.all("/api/orders/:id/status", asyncHandler(async (req, res) => {
  if (req.method !== "PATCH" && req.method !== "PUT") return res.status(405).end();
  if (!isAdminAuthorized(req)) return res.status(401).json({ error: "Unauthorized" });
  const order = await updateOrderStatus(Number(req.params.id), String(req.body.status || "").trim());
  res.json(order);
}));

app.post("/api/notify", asyncHandler(async (req, res) => {
  if (!isAdminAuthorized(req)) return res.status(401).json({ error: "Unauthorized" });
  // Notification logic...
  // (I'll keep it simple for now, assuming existing functions are used)
  const result = await handleNotifyRequest(req.body); 
  res.json(result);
}));

app.post("/api/device-token", asyncHandler(async (req, res) => {
  const { firebaseUid, phone, platform, token } = req.body;
  await upsertDeviceToken({ firebaseUid, phone, platform, token });
  res.json({ success: true });
}));

app.get("/api/notifications", asyncHandler(async (req, res) => {
  const notifications = await listNotifications({
    customerId: String(req.query.customerId || "").trim()
  });
  res.json({ notifications });
}));

app.post("/api/orders", asyncHandler(async (req, res) => {
  const settings = await loadSettingsSafe();
  if (!settings.isStoreOpen) {
    return res.status(409).json({
      error: "STORE_CLOSED",
      message: settings.closedMessage
    });
  }
  const order = normalizeOrderPayload(req.body);
  const saved = await createOrderRecord(order);
  res.status(201).json(saved);
}));

app.get("/api/orders/customer", asyncHandler(async (req, res) => {
  const orders = await listCustomerOrders({
    firebaseUid: req.query.firebaseUid,
    email: req.query.email,
    phone: req.query.phone
  });
  res.json({ orders });
}));

app.get("/api/orders/customer/:id", asyncHandler(async (req, res) => {
  const order = await getCustomerOrderById(Number(req.params.id), {
    firebaseUid: req.query.firebaseUid,
    email: req.query.email,
    phone: req.query.phone
  });
  if (!order) return res.status(404).json({ error: "Not found" });
  res.json(order);
}));

app.post("/api/customer-auth", asyncHandler(async (req, res) => {
  const result = await authenticateCustomerByPhone({
    phone: req.body.phone,
    name: req.body.name
  });
  res.json(result);
}));

app.post("/api/users/upsert", asyncHandler(async (req, res) => {
  const user = await upsertAuthenticatedUser(req.body);
  res.json({ user });
}));

app.get("/api/image", asyncHandler(async (req, res) => {
  const source = req.query.url || "";
  if (!isHttpUrl(source)) return res.status(400).send("Invalid image URL");
  await proxyImage(res, await resolveImageUrl(source));
}));

// Admin Menu CRUD
app.post("/api/menu/product", asyncHandler(async (req, res) => {
  if (!isAdminAuthorized(req)) return res.status(401).json({ error: "Unauthorized" });
  const menu = await loadMenuSafe();
  const newProduct = { id: `p${Date.now()}`, ...req.body, available: req.body.available !== false };
  menu.products.push(newProduct);
  const saved = writeMenu(menu);
  await saveMenuToDb(saved);
  res.status(201).json(newProduct);
}));

app.put("/api/menu/product/:id", asyncHandler(async (req, res) => {
  if (!isAdminAuthorized(req)) return res.status(401).json({ error: "Unauthorized" });
  const menu = await loadMenuSafe();
  const index = menu.products.findIndex(p => String(p.id) === String(req.params.id));
  if (index === -1) return res.status(404).json({ error: "Not found" });
  menu.products[index] = { ...menu.products[index], ...req.body };
  const saved = writeMenu(menu);
  await saveMenuToDb(saved);
  res.json(menu.products[index]);
}));

app.delete("/api/menu/product/:id", asyncHandler(async (req, res) => {
  if (!isAdminAuthorized(req)) return res.status(401).json({ error: "Unauthorized" });
  const menu = await loadMenuSafe();
  menu.products = menu.products.filter(p => String(p.id) !== String(req.params.id));
  const saved = writeMenu(menu);
  await saveMenuToDb(saved);
  res.json({ success: true });
}));

app.post("/api/menu/category", asyncHandler(async (req, res) => {
  if (!isAdminAuthorized(req)) return res.status(401).json({ error: "Unauthorized" });
  const menu = await loadMenuSafe();
  menu.categories.push(req.body);
  const saved = writeMenu(menu);
  await saveMenuToDb(saved);
  res.status(201).json(req.body);
}));

app.put("/api/menu/category/:name", asyncHandler(async (req, res) => {
  if (!isAdminAuthorized(req)) return res.status(401).json({ error: "Unauthorized" });
  const categoryName = decodeURIComponent(req.params.name);
  const menu = await loadMenuSafe();
  const index = menu.categories.findIndex(c => (c.name || c) === categoryName);
  if (index === -1) return res.status(404).json({ error: "Not found" });
  menu.categories[index] = { ...(typeof menu.categories[index] === "object" ? menu.categories[index] : { name: menu.categories[index] }), ...req.body };
  const saved = writeMenu(menu);
  await saveMenuToDb(saved);
  res.json(menu.categories[index]);
}));

app.delete("/api/menu/category/:name", asyncHandler(async (req, res) => {
  if (!isAdminAuthorized(req)) return res.status(401).json({ error: "Unauthorized" });
  const categoryName = decodeURIComponent(req.params.name);
  const menu = await loadMenuSafe();
  menu.categories = menu.categories.filter(c => (c.name || c) !== categoryName);
  const saved = writeMenu(menu);
  await saveMenuToDb(saved);
  res.json({ success: true });
}));

app.get("/api/customers", asyncHandler(async (req, res) => {
  if (!isAdminAuthorized(req)) return res.status(401).json({ error: "Unauthorized" });
  const customers = await listCustomers(req.query.search);
  res.json({ customers });
}));

// Fallback for any other API or static files
app.use((req, res) => {
  res.status(404).send("Not found");
});

app.listen(port, () => {
  console.log(`3P backend running on port ${port} (Express)`);
  if (hasDatabase) {
    ensureDatabase()
      .then(() => console.log("PostgreSQL ready"))
      .catch(error => console.error("PostgreSQL init failed:", error.message));
  }
});

// Helper for notify (since we are refactoring)
async function handleNotifyRequest(payload) {
  const { customerId, phone, firebaseUid, title, message, imageUrl, linkedProductId, linkedCategoryId } = payload;
  if (!adminInitialized) throw new Error("Firebase Admin not configured");
  if (!title || !message) throw new Error("Missing title or message");
  
  const savedNotification = await createNotificationRecord({
    title, message, imageUrl, linkedProductId, linkedCategoryId,
    targetCustomerId: customerId === "ALL" ? "" : (customerId || "")
  });
  
  let targetTokens = new Set();
  if (dbPool) {
    const result = await dbPool.query("SELECT token, firebase_uid, phone FROM device_tokens");
    for (const row of result.rows) {
      let match = (customerId === "ALL");
      if (!match && firebaseUid && row.firebase_uid === firebaseUid) match = true;
      if (!match && phone && normalizePhone(row.phone) === normalizePhone(phone)) match = true;
      if (match && row.token) targetTokens.add(row.token);
    }
  }

  if (targetTokens.size === 0) throw new Error("No devices found");

  const messages = Array.from(targetTokens).map(token => ({
    token,
    notification: { title, body: message },
    android: { notification: { sound: "default", imageUrl } },
    data: { notificationId: String(savedNotification.id) }
  }));

  const batchResponse = await admin.messaging().sendEach(messages);
  return { 
    success: true, 
    count: batchResponse.successCount, 
    failureCount: batchResponse.failureCount 
  };
}
