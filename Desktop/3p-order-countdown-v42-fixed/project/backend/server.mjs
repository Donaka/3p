import admin from "firebase-admin";
import { createReadStream, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const root = fileURLToPath(new URL(".", import.meta.url));
const port = Number(process.env.PORT || 5173);
const menuPath = process.env.MENU_DATA_PATH || join(root, "data", "menu.json");
const seedMenuPath = join(root, "data", "menu.seed.json");
const adminPassword = process.env.ADMIN_PASSWORD || "";
const databaseUrl = process.env.DATABASE_URL || "";

function firstExistingPath(...paths) {
  return paths.find(path => existsSync(path)) || paths[0];
}

const firebaseServiceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON || process.env.FIREBASE_ADMIN_SDK_JSON || "";
const serviceAccountPath = firstExistingPath(
  join(root, "data", "serviceAccountKey.json"),
  join(root, "serviceAccountKey.json")
);
if (firebaseServiceAccountJson.trim()) {
  try {
    const serviceAccount = JSON.parse(firebaseServiceAccountJson);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log("Firebase Admin initialized from environment");
  } catch (e) {
    console.error("Error initializing Firebase Admin from environment:", e);
  }
} else if (existsSync(serviceAccountPath)) {
  try {
    const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, "utf8"));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log("Firebase Admin initialized from local file");
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
function readTokens() {
  if (!existsSync(tokensPath)) writeFileSync(tokensPath, JSON.stringify({}, null, 2));
  return JSON.parse(readFileSync(tokensPath, "utf8"));
}
function saveToken(customerId, token) {
  const tokens = readTokens();
  tokens[customerId] = token;
  writeFileSync(tokensPath, JSON.stringify(tokens, null, 2));
}

function deleteToken(customerId) {
  const tokens = readTokens();
  delete tokens[customerId];
  writeFileSync(tokensPath, JSON.stringify(tokens, null, 2));
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
  heroImages: [],
  shopLatitude: 30.4017949,
  shopLongitude: -9.5510469,
  deliveryPricePerKm: 5,
  minimumDeliveryPrice: 0,
  minimumOrderAmount: 0,
  preparationTimeBase: 20,
  defaultDeliveryCountdownMinutes: 30,
  shopWhatsAppNumber: "212688943959",
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
            distance_km NUMERIC(10, 2) NOT NULL DEFAULT 0,
            delivery_zone_radius NUMERIC(10, 2),
            accepted_at TIMESTAMPTZ,
            estimated_delivery_minutes INTEGER,
            delivery_fee NUMERIC(10, 2) NOT NULL DEFAULT 0,
            subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0,
            discount NUMERIC(12, 2) NOT NULL DEFAULT 0,
            total NUMERIC(12, 2) NOT NULL DEFAULT 0,
            promo_code TEXT,
            whatsapp_message TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'accepted', 'preparing', 'delivered', 'cancelled')),
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
        await client.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS estimated_delivery_minutes INTEGER;`);
        await client.query(`
          CREATE TABLE IF NOT EXISTS settings (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            shop_latitude DOUBLE PRECISION NOT NULL DEFAULT 30.4017949,
            shop_longitude DOUBLE PRECISION NOT NULL DEFAULT -9.5510469,
            shop_whatsapp_number TEXT NOT NULL DEFAULT '212688943959',
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
          defaultSettings.shopLatitude,
          defaultSettings.shopLongitude,
          defaultSettings.shopWhatsAppNumber,
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

function normalizeSettings(settings = {}) {
  const rawHeroImages = Array.isArray(settings.heroImages)
    ? settings.heroImages
    : [settings.heroImageUrl || ""];
  return {
    heroImages: rawHeroImages.map(item => String(item || "").trim()).filter(Boolean).slice(0, 5),
    shopLatitude: Number(settings.shopLatitude) || fallbackSettings.shopLatitude,
    shopLongitude: Number(settings.shopLongitude) || fallbackSettings.shopLongitude,
    shopWhatsAppNumber: String(settings.shopWhatsAppNumber || fallbackSettings.shopWhatsAppNumber).replace(/[^\d]/g, "").trim() || fallbackSettings.shopWhatsAppNumber,
    deliveryPricePerKm: Math.max(0, Number(settings.deliveryPricePerKm) || fallbackSettings.deliveryPricePerKm),
    minimumDeliveryPrice: Math.max(0, Number(settings.minimumDeliveryPrice) || fallbackSettings.minimumDeliveryPrice),
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
  const total = parseMoney(payload.total, NaN);
  if (!customerPhone) throw new Error("Customer phone is required");
  if (!items.length) throw new Error("Cart items are required");
  if (!Number.isFinite(total) || total <= 0) throw new Error("Total is required");

  return {
    customerName: String(payload.customerName || "").trim(),
    customerPhone,
    customerEmail: trimOrNull(payload.customerEmail),
    firebaseUid: trimOrNull(payload.firebaseUid),
    mode: payload.mode === "pickup" ? "pickup" : "delivery",
    address: trimOrNull(payload.address),
    latitude: parseOptionalNumber(payload.latitude),
    longitude: parseOptionalNumber(payload.longitude),
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
    distanceKm: Number(row.distance_km || 0),
    deliveryZoneRadius: row.delivery_zone_radius === null ? null : Number(row.delivery_zone_radius),
    acceptedAt: row.accepted_at || null,
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

function getEstimatedTime(order, activeOrders = 0, preparationTimeBase = fallbackSettings.preparationTimeBase) {
  if (order.status === "delivered") return "Livree";
  if (order.status === "cancelled") return "Annulee";
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
  if (rawStatus === "delivered") {
    return {
      displayStatus: "delivered",
      countdownMinutesRemaining: 0,
      trackingProgress: 100,
      estimatedTime: "Commande livree ✅"
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
    estimatedTime: displayStatus === "delivered" ? "Commande livree ✅" : `Livraison estimee dans ${remaining} min`
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
    heroImages: Array.isArray(row?.hero_images_json) ? row.hero_images_json : [],
    shopLatitude: row?.shop_latitude,
    shopLongitude: row?.shop_longitude,
    shopWhatsAppNumber: row?.shop_whatsapp_number,
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
            id, shop_latitude, shop_longitude, shop_whatsapp_number, minimum_order_amount, preparation_time_base, default_delivery_countdown_minutes, delivery_zones_json, promo_codes_json, hero_images_json, is_store_open, closed_message, updated_at
          )
          VALUES (1, $1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9::jsonb, $10, $11, NOW())
          ON CONFLICT (id) DO UPDATE SET
            shop_latitude = EXCLUDED.shop_latitude,
            shop_longitude = EXCLUDED.shop_longitude,
            shop_whatsapp_number = EXCLUDED.shop_whatsapp_number,
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
          normalized.shopLatitude,
          normalized.shopLongitude,
          normalized.shopWhatsAppNumber,
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

      const orderResult = await client.query(`
        INSERT INTO orders (
          customer_name, customer_phone, customer_email, firebase_uid,
          mode, address, latitude, longitude, distance_km, delivery_zone_radius, accepted_at, estimated_delivery_minutes,
          delivery_fee, subtotal, discount, total, promo_code, whatsapp_message, status, customer_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NULL, NULL, $11, $12, $13, $14, $15, $16, 'new', $17)
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
        order.distanceKm,
        order.deliveryZoneRadius,
        order.deliveryFee,
        order.subtotal,
        order.discount,
        order.total,
        order.promoCode,
        order.whatsappMessage,
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

    if (filters.status) {
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
    return result.rows.map(row => applyOrderTracking(row, activeOrders, settings.preparationTimeBase));
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
    const allowedStatuses = new Set(["new", "accepted", "preparing", "delivered", "cancelled"]);
    if (!allowedStatuses.has(status)) {
      throw new Error("Invalid order status");
    }
    const [result, activeOrdersResult] = await Promise.all([
      dbPool.query(`
      UPDATE orders
      SET
        status = $2,
        accepted_at = CASE
          WHEN $2 = 'accepted' THEN NOW()
          WHEN $2 = 'new' THEN NULL
          ELSE accepted_at
        END,
        estimated_delivery_minutes = CASE
          WHEN $2 = 'accepted' THEN $3
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


const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml; charset=utf-8"
};

const staticRoutes = new Map([
  ["/", "index.html"],
  ["/index.html", "index.html"],
  ["/admin.html", "admin.html"],
  ["/styles.css", "styles.css"],
  ["/admin.css", "admin.css"],
  ["/app.js", "app.js"],
  ["/admin.js", "admin.js"],
  ["/firebase-config.js", "firebase-config.js"],
  ["/manifest.json", "manifest.json"],
  ["/sw.js", "sw.js"],
  ["/firebase-messaging-sw.js", "firebase-messaging-sw.js"],
  ["/logo-3p.png", "logo-3p.png"],
  ["/icon.svg", "icon.svg"]
]);

function sendJson(response, status, data) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  response.end(JSON.stringify(data, null, 2));
}

function redirect(response, location) {
  response.writeHead(302, {
    Location: location,
    "Cache-Control": "public, max-age=3600"
  });
  response.end();
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
  if (!upstream.ok) {
    throw new Error(`Image page returned ${upstream.status}`);
  }

  const contentType = upstream.headers.get("content-type") || "";
  if (contentType.startsWith("image/")) return upstream.url;

  const html = await upstream.text();
  const imageUrl = asAbsoluteUrl(getImageFromHtml(html), upstream.url || source);

  if (!imageUrl || !isHttpUrl(imageUrl)) {
    throw new Error("Could not resolve image URL");
  }

  return imageUrl;
}

async function proxyImage(response, imageUrl) {
  const upstream = await fetchWithBrowserHeaders(imageUrl);
  if (!upstream.ok) {
    throw new Error(`Image returned ${upstream.status}`);
  }

  const contentType = upstream.headers.get("content-type") || "image/jpeg";
  if (!contentType.startsWith("image/")) {
    throw new Error("Resolved URL is not an image");
  }

  response.writeHead(200, {
    "Content-Type": contentType,
    ...(upstream.headers.get("content-length")
      ? { "Content-Length": upstream.headers.get("content-length") }
      : {}),
    "Cache-Control": "public, max-age=604800, stale-while-revalidate=86400, immutable"
  });

  if (!upstream.body) {
    response.end();
    return;
  }

  for await (const chunk of upstream.body) {
    response.write(chunk);
  }
  response.end();
}

function isAdminAuthorized(request) {
  if (!adminPassword) return true;
  return String(request.headers["x-admin-password"] || "") === adminPassword;
}

async function readJsonBody(request) {
  const body = await readBody(request);
  return JSON.parse(body || "{}");
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
      name,
      category,
      price,
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
          structuredGroups.push({
            name: "Options",
            required: false,
            choices: legacyChoices
          });
        }
        return structuredGroups;
      })() : [],
      color: ["teal", "yellow", "red", "blue"].includes(product.color) ? product.color : "red",
      shape: ["bottle", "cup", "bread", "box", "plate", "tray", "fish", "fruit"].includes(product.shape) ? product.shape : "bread"
    };
  });

  const settings = normalizeSettings(menu.settings || {});

  return {
    settings,
    categories,
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

const frontendRoot = normalize(firstExistingPath(
  join(root, "frontend"),
  join(root, "..", "frontend")
));

function resolvePath(url) {
  const cleanUrl = decodeURIComponent(url.split("?")[0]);
  const staticFile = staticRoutes.get(cleanUrl);
  const requested = staticFile || cleanUrl.replace(/^\/+/, "");
  const filePath = normalize(join(frontendRoot, requested));
  return filePath.startsWith(frontendRoot) ? filePath : null;
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url || "/", `https://${request.headers.host || "3p-production.up.railway.app"}`);

  if (url.pathname === "/api/tokens" && request.method === "POST") {
    try {
      const { customerId, token } = await readJsonBody(request);
      if (customerId && token) {
        let tokens = {};
        if (existsSync(tokensPath)) {
          tokens = JSON.parse(readFileSync(tokensPath, "utf8"));
        }
        tokens[customerId] = token;
        writeFileSync(tokensPath, JSON.stringify(tokens, null, 2));
      }
      sendJson(response, 200, { success: true });
    } catch (e) {
      sendJson(response, 500, { error: e.message });
    }
    return;
  }

  if (url.pathname === "/api/device-token" && request.method === "POST") {
    try {
      ensureDatabaseAvailable();
      const { firebaseUid, phone, platform, token } = await readJsonBody(request);
      await upsertDeviceToken({ firebaseUid, phone, platform, token });
      sendJson(response, 200, { success: true });
    } catch (error) {
      const status = /DATABASE_URL/i.test(error.message) ? 503 : 400;
      sendJson(response, status, { error: error.message });
    }
    return;
  }

  if (url.pathname === "/api/notify" && request.method === "POST") {
    if (!isAdminAuthorized(request)) {
      sendJson(response, 401, { error: "Invalid admin password" });
      return;
    }
    try {
      const { customerId, title, message, imageUrl, linkedProductId, linkedCategoryId, ctaText, startsAt, endsAt, active } = await readJsonBody(request);
      if (!title || !message) {
        throw new Error("Missing title or message");
      }
      const savedNotification = await createNotificationRecord({
        title,
        message,
        imageUrl,
        linkedProductId,
        linkedCategoryId,
        ctaText,
        startsAt,
        endsAt,
        active,
        targetCustomerId: customerId === "ALL" ? "" : customerId
      });
      
      let tokens = {};
      if (existsSync(tokensPath)) {
        tokens = JSON.parse(readFileSync(tokensPath, "utf8"));
      }
      let databaseTokens = [];
      try {
        ensureDatabaseAvailable();
        const result = await dbPool.query(`
          SELECT token
          FROM device_tokens
          ORDER BY updated_at DESC
        `);
        databaseTokens = result.rows.map(row => String(row.token || "").trim()).filter(Boolean);
      } catch (error) {
        console.warn("Could not load device tokens from PostgreSQL:", error.message);
      }
      
      const messages = [];
      const notificationObj = { title, body: message };
      if (imageUrl) notificationObj.image = imageUrl;

      const androidObj = { 
        notification: { 
          sound: "default" 
        } 
      };
      if (imageUrl) androidObj.notification.imageUrl = imageUrl;
      const data = {
        notificationId: String(savedNotification.id),
        linkedProductId: savedNotification.linkedProductId || "",
        linkedCategoryId: savedNotification.linkedCategoryId || "",
        ctaText: savedNotification.ctaText || ""
      };

      if (customerId === "ALL") {
        [...new Set([...Object.values(tokens), ...databaseTokens])].forEach(token => {
          messages.push({ token, notification: notificationObj, android: androidObj, data });
        });
      } else if (customerId && tokens[customerId]) {
        messages.push({ token: tokens[customerId], notification: notificationObj, android: androidObj, data });
      } else {
        throw new Error("No tokens found for target customer: " + customerId);
      }

      if (messages.length === 0) {
        throw new Error("No users are currently subscribed to notifications (tokens list is empty). Please open the app and allow notifications first.");
      }
      if (!admin.messaging) {
        throw new Error("Firebase Admin is not initialized. Check serviceAccountKey.json.");
      }

      const batchResponse = await admin.messaging().sendEach(messages);
      sendJson(response, 200, { success: true, count: batchResponse.successCount, notification: savedNotification });
    } catch (e) {
      sendJson(response, 500, { error: e.message });
    }
    return;
  }

  if (url.pathname === "/api/notifications" && request.method === "GET") {
    try {
      const notifications = await listNotifications({
        customerId: String(url.searchParams.get("customerId") || "").trim()
      });
      sendJson(response, 200, { notifications });
      return;
    } catch (error) {
      const status = /DATABASE_URL/i.test(error.message) ? 503 : 500;
      sendJson(response, status, { error: error.message });
      return;
    }
  }

  if (url.pathname === "/api/menu") {
    try {
      if (request.method === "GET") {
        const menu = await loadMenuSafe();
        menu.settings = await loadSettingsSafe();
        sendJson(response, 200, menu);
        return;
      }

      if (request.method === "PUT") {
        if (!isAdminAuthorized(request)) {
          sendJson(response, 401, { error: "Invalid admin password" });
          return;
        }
        const incoming = await readJsonBody(request);
        const currentMenu = await loadMenuSafe();
        const menu = writeMenu({
          ...incoming,
          settings: currentMenu.settings
        });
        try {
          await saveMenuToDb(menu);
        } catch (snapshotError) {
          console.warn("Could not save menu snapshot to PostgreSQL:", snapshotError.message);
        }
        menu.settings = await loadSettingsSafe();
        sendJson(response, 200, menu);
        return;
      }

      sendJson(response, 405, { error: "Method not allowed" });
      return;
    } catch (error) {
      sendJson(response, 400, { error: error.message });
      return;
    }
  }

  if (url.pathname === "/api/settings") {
    try {
      if (request.method === "GET") {
        sendJson(response, 200, await loadSettingsFromDb());
        return;
      }
      if (request.method === "PUT") {
        if (!isAdminAuthorized(request)) {
          sendJson(response, 401, { error: "Invalid admin password" });
          return;
        }
        const settings = await updateSettingsInDb(await readJsonBody(request));
        sendJson(response, 200, settings);
        return;
      }
      sendJson(response, 405, { error: "Method not allowed" });
      return;
    } catch (error) {
      const status = /DATABASE_URL/i.test(error.message) ? 503 : 400;
      sendJson(response, status, { error: error.message });
      return;
    }
  }

  if (url.pathname === "/api/settings/debug" && request.method === "GET") {
    try {
      const debug = await loadSettingsDebug();
      sendJson(response, 200, debug);
      return;
    } catch (error) {
      sendJson(response, 200, {
        databaseConnected: false,
        settingsFromDb: null,
        updatedAt: null,
        error: error.message
      });
      return;
    }
  }

  if (url.pathname === "/api/orders" && request.method === "POST") {
    try {
      const settings = await loadSettingsSafe();
      if (!settings.isStoreOpen) {
        sendJson(response, 409, {
          error: "STORE_CLOSED",
          message: settings.closedMessage
        });
        return;
      }
      const order = normalizeOrderPayload(await readJsonBody(request));
      const saved = await createOrderRecord(order);
      sendJson(response, 201, saved);
      return;
    } catch (error) {
      const status = /DATABASE_URL/i.test(error.message) ? 503 : 400;
      sendJson(response, status, { error: error.message });
      return;
    }
  }

  if (url.pathname === "/api/orders" && request.method === "GET") {
    if (!isAdminAuthorized(request)) {
      sendJson(response, 401, { error: "Invalid admin password" });
      return;
    }
    try {
      const orders = await listOrders({
        search: String(url.searchParams.get("search") || "").trim(),
        status: String(url.searchParams.get("status") || "").trim(),
        mode: String(url.searchParams.get("mode") || "").trim()
      });
      sendJson(response, 200, { orders });
      return;
    } catch (error) {
      const status = /DATABASE_URL/i.test(error.message) ? 503 : 500;
      sendJson(response, status, { error: error.message });
      return;
    }
  }

  if (url.pathname === "/api/dashboard" && request.method === "GET") {
    if (!isAdminAuthorized(request)) {
      sendJson(response, 401, { error: "Invalid admin password" });
      return;
    }
    try {
      const stats = await getDashboardStats();
      sendJson(response, 200, stats);
      return;
    } catch (error) {
      const status = /DATABASE_URL/i.test(error.message) ? 503 : 500;
      sendJson(response, status, { error: error.message });
      return;
    }
  }

  const orderDetailMatch = url.pathname.match(/^\/api\/orders\/(\d+)$/);
  if (orderDetailMatch && request.method === "GET") {
    if (!isAdminAuthorized(request)) {
      sendJson(response, 401, { error: "Invalid admin password" });
      return;
    }
    try {
      const order = await getOrderById(Number(orderDetailMatch[1]));
      if (!order) {
        sendJson(response, 404, { error: "Order not found" });
        return;
      }
      sendJson(response, 200, order);
      return;
    } catch (error) {
      const status = /DATABASE_URL/i.test(error.message) ? 503 : 500;
      sendJson(response, status, { error: error.message });
      return;
    }
  }

  const orderStatusMatch = url.pathname.match(/^\/api\/orders\/(\d+)\/status$/);
  if (orderStatusMatch && request.method === "PATCH") {
    if (!isAdminAuthorized(request)) {
      sendJson(response, 401, { error: "Invalid admin password" });
      return;
    }
    try {
      const body = await readJsonBody(request);
      const order = await updateOrderStatus(Number(orderStatusMatch[1]), String(body.status || "").trim());
      if (!order) {
        sendJson(response, 404, { error: "Order not found" });
        return;
      }
      sendJson(response, 200, order);
      return;
    } catch (error) {
      const status = /DATABASE_URL/i.test(error.message) ? 503 : 400;
      sendJson(response, status, { error: error.message });
      return;
    }
  }

  if (url.pathname === "/api/customers" && request.method === "GET") {
    if (!isAdminAuthorized(request)) {
      sendJson(response, 401, { error: "Invalid admin password" });
      return;
    }
    try {
      const customers = await listCustomers(String(url.searchParams.get("search") || "").trim());
      sendJson(response, 200, { customers });
      return;
    } catch (error) {
      const status = /DATABASE_URL/i.test(error.message) ? 503 : 500;
      sendJson(response, status, { error: error.message });
      return;
    }
  }

  if (url.pathname === "/api/orders/customer" && request.method === "GET") {
    try {
      const orders = await listCustomerOrders({
        firebaseUid: String(url.searchParams.get("firebaseUid") || "").trim(),
        email: String(url.searchParams.get("email") || "").trim(),
        phone: String(url.searchParams.get("phone") || "").trim()
      });
      sendJson(response, 200, { orders });
      return;
    } catch (error) {
      sendJson(response, 400, { error: error.message });
      return;
    }
  }

  const customerOrderDetailMatch = url.pathname.match(/^\/api\/orders\/customer\/(\d+)$/);
  if (customerOrderDetailMatch && request.method === "GET") {
    try {
      const order = await getCustomerOrderById(Number(customerOrderDetailMatch[1]), {
        firebaseUid: String(url.searchParams.get("firebaseUid") || "").trim(),
        email: String(url.searchParams.get("email") || "").trim(),
        phone: String(url.searchParams.get("phone") || "").trim()
      });
      if (!order) {
        sendJson(response, 404, { error: "Order not found" });
        return;
      }
      sendJson(response, 200, order);
      return;
    } catch (error) {
      sendJson(response, 400, { error: error.message });
      return;
    }
  }

  if (url.pathname === "/api/image") {
    try {
      const source = url.searchParams.get("url") || "";
      if (!isHttpUrl(source)) {
        response.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
        response.end("Invalid image URL");
        return;
      }

      await proxyImage(response, await resolveImageUrl(source));
      return;
    } catch (error) {
      response.writeHead(502, { "Content-Type": "text/plain; charset=utf-8" });
      response.end(error.message);
      return;
    }
  }

  if (url.pathname === "/api/admin/check") {
    try {
      if (request.method !== "POST") {
        sendJson(response, 405, { error: "Method not allowed" });
        return;
      }

      const body = await readJsonBody(request);
      const password = String(body.password || "");
      if (adminPassword && password !== adminPassword) {
        sendJson(response, 401, { ok: false, error: "Invalid admin password" });
        return;
      }

      sendJson(response, 200, { ok: true });
      return;
    } catch (error) {
      sendJson(response, 400, { ok: false, error: error.message });
      return;
    }
  }

  if (url.pathname === "/api/health") {
    sendJson(response, 200, {
      ok: true,
      root,
      menuPath,
      databaseEnabled: hasDatabase,
      databaseReady: hasDatabase && !dbInitError,
      databaseError: dbInitError ? dbInitError.message : null,
      adminPasswordEnabled: Boolean(adminPassword),
      staticFiles: Object.fromEntries(
        [...staticRoutes.entries()].map(([route, file]) => [route, existsSync(join(frontendRoot, file))])
      )
    });
    return;
  }

  const filePath = resolvePath(request.url || "/");

  if (!filePath || !existsSync(filePath) || !statSync(filePath).isFile()) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }

  response.writeHead(200, {
    "Content-Type": types[extname(filePath)] || "application/octet-stream",
    "Cache-Control": "no-store"
  });
  createReadStream(filePath).pipe(response);
});

server.listen(port, () => {
  console.log(`3P backend running on port ${port}`);
  console.log(`Menu data file: ${menuPath}`);
  if (hasDatabase) {
    ensureDatabase()
      .then(() => console.log("PostgreSQL ready for orders and customers"))
      .catch(error => console.error("PostgreSQL init failed:", error.message));
  } else {
    console.warn("DATABASE_URL is missing. Orders/customers APIs will return a clear backend error.");
  }
});
