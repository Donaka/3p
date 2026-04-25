let menu = { categories: [], products: [], settings: {} };
let adminPassword = sessionStorage.getItem("adminPassword") || "";
let zoneIdCounter = 0;
let zoneMap = null;
let zoneMarker = null;
let zoneLayers = [];
let zoneDraftCounter = 0;
let orders = [];
let customers = [];
let dashboardStats = null;
let selectedOrderId = null;
let ordersLoaded = false;
let customersLoaded = false;

const sectionMeta = {
  dashboard: { title: "Dashboard", eyebrow: "Backoffice dashboard" },
  orders: { title: "Orders", eyebrow: "WhatsApp checkout log" },
  customers: { title: "Customers", eyebrow: "Buyer history" },
  "menu-management": { title: "Menu Management", eyebrow: "Catalog workspace" },
  categories: { title: "Categories", eyebrow: "Catalog organization" },
  products: { title: "Products", eyebrow: "Menu editor" },
  "hero-images": { title: "Hero Images", eyebrow: "Homepage media" },
  "delivery-zones": { title: "Delivery Zones", eyebrow: "Radius pricing map" },
  "promo-codes": { title: "Promo Codes", eyebrow: "Checkout offers" },
  settings: { title: "Settings", eyebrow: "Store configuration" }
};

const zonePalette = [
  { stroke: "#ff4d4d" },
  { stroke: "#ff8b3d" },
  { stroke: "#ffc14d" },
  { stroke: "#ffffff" }
];

const adminLogin = document.querySelector("#adminLogin");
const adminLoginForm = document.querySelector("#adminLoginForm");
const adminPasswordInput = document.querySelector("#adminPassword");
const adminToast = document.querySelector("#adminToast");
const pageTitle = document.querySelector("#pageTitle");
const pageEyebrow = document.querySelector("#pageEyebrow");
const saveStatus = document.querySelector("#saveStatus");
const settingsForm = document.querySelector("#settingsForm");
const heroImageInputs = [...document.querySelectorAll(".hero-image-url")];
const heroPreviewImages = [...document.querySelectorAll(".hero-preview-image")];
const shopLatitude = document.querySelector("#shopLatitude");
const shopLongitude = document.querySelector("#shopLongitude");
const promoCodesInput = document.querySelector("#promoCodes");
const storeStatus = document.querySelector("#storeStatus");
const closedMessageInput = document.querySelector("#closedMessage");
const addZoneButton = document.querySelector("#addZone");
const zoneList = document.querySelector("#zoneList");
const zoneHelp = document.querySelector("#zoneHelp");
const zoneSummary = document.querySelector("#zoneSummary");
const categoryForm = document.querySelector("#categoryForm");
const categoryOriginalName = document.querySelector("#categoryOriginalName");
const categoryName = document.querySelector("#categoryName");
const categoryImageUrl = document.querySelector("#categoryImageUrl");
const categorySortOrder = document.querySelector("#categorySortOrder");
const categorySubmitButton = document.querySelector("#categorySubmitButton");
const cancelCategoryEdit = document.querySelector("#cancelCategoryEdit");
const categorySearch = document.querySelector("#categorySearch");
const categoryList = document.querySelector("#categoryList");
const categoryCount = document.querySelector("#categoryCount");
const categoryListTitle = document.querySelector("#categoryListTitle");
const productCount = document.querySelector("#productCount");
const productList = document.querySelector("#productList");
const productForm = document.querySelector("#productForm");
const productId = document.querySelector("#productId");
const productName = document.querySelector("#productName");
const productCategory = document.querySelector("#productCategory");
const productPrice = document.querySelector("#productPrice");
const productTag = document.querySelector("#productTag");
const productBadge = document.querySelector("#productBadge");
const productDesc = document.querySelector("#productDesc");
const productImageUrl = document.querySelector("#productImageUrl");
const productOptions = document.querySelector("#productOptions");
const productColor = document.querySelector("#productColor");
const productShape = document.querySelector("#productShape");
const productSortOrder = document.querySelector("#productSortOrder");
const productAvailable = document.querySelector("#productAvailable");
const productSearch = document.querySelector("#productSearch");
const productCategoryFilter = document.querySelector("#productCategoryFilter");
const newProductButton = document.querySelector("#newProduct");
const cancelEditButton = document.querySelector("#cancelEdit");
const navButtons = [...document.querySelectorAll("[data-nav-target]")];
const sidebarLinks = navButtons.filter(button => button.classList.contains("sidebar-link"));
const views = [...document.querySelectorAll(".admin-view")];

const dashboardCategoryCount = document.querySelector("#dashboardCategoryCount");
const dashboardProductCount = document.querySelector("#dashboardProductCount");
const dashboardHeroCount = document.querySelector("#dashboardHeroCount");
const dashboardZoneCount = document.querySelector("#dashboardZoneCount");
const dashboardOrderCount = document.querySelector("#dashboardOrderCount");
const dashboardCustomerCount = document.querySelector("#dashboardCustomerCount");
const dashboardTodayOrders = document.querySelector("#dashboardTodayOrders");
const dashboardTodayRevenue = document.querySelector("#dashboardTodayRevenue");
const dashboardPendingOrders = document.querySelector("#dashboardPendingOrders");
const dashboardRepeatCustomers = document.querySelector("#dashboardRepeatCustomers");
const dashboardBestSelling = document.querySelector("#dashboardBestSelling");
const summaryCategories = document.querySelector("#summaryCategories");
const summaryProducts = document.querySelector("#summaryProducts");
const summaryPromos = document.querySelector("#summaryPromos");
const summaryZones = document.querySelector("#summaryZones");
const ordersList = document.querySelector("#ordersList");
const orderSearch = document.querySelector("#orderSearch");
const orderStatusFilter = document.querySelector("#orderStatusFilter");
const orderModeFilter = document.querySelector("#orderModeFilter");
const exportOrdersCsv = document.querySelector("#exportOrdersCsv");
const orderDetail = document.querySelector("#orderDetail");
const orderDetailEmpty = document.querySelector("#orderDetailEmpty");
const orderDetailTitle = document.querySelector("#orderDetailTitle");
const orderStatusSelect = document.querySelector("#orderStatusSelect");
const detailCustomerName = document.querySelector("#detailCustomerName");
const detailCustomerPhone = document.querySelector("#detailCustomerPhone");
const detailCustomerEmail = document.querySelector("#detailCustomerEmail");
const detailOrderTotal = document.querySelector("#detailOrderTotal");
const detailOrderMode = document.querySelector("#detailOrderMode");
const detailOrderDate = document.querySelector("#detailOrderDate");
const orderItemsList = document.querySelector("#orderItemsList");
const detailAddress = document.querySelector("#detailAddress");
const detailLocation = document.querySelector("#detailLocation");
const detailDistance = document.querySelector("#detailDistance");
const detailZone = document.querySelector("#detailZone");
const detailFee = document.querySelector("#detailFee");
const detailPromo = document.querySelector("#detailPromo");
const detailWhatsappMessage = document.querySelector("#detailWhatsappMessage");
const customersList = document.querySelector("#customersList");
const customerSearchInput = document.querySelector("#customerSearch");
const exportCustomersCsv = document.querySelector("#exportCustomersCsv");
const exportProductsCsv = document.querySelector("#exportProductsCsv");
const customerTotalCount = document.querySelector("#customerTotalCount");
const customerOrderTotal = document.querySelector("#customerOrderTotal");
const customerSpendTotal = document.querySelector("#customerSpendTotal");

const pushTarget = document.querySelector("#pushTarget");
const customerIdGroup = document.querySelector("#customerIdGroup");
const pushCustomerId = document.querySelector("#pushCustomerId");
const pushTemplate = document.querySelector("#pushTemplate");
const pushTitle = document.querySelector("#pushTitle");
const pushBody = document.querySelector("#pushBody");
const pushImageUrl = document.querySelector("#pushImageUrl");
const pushLinkedProduct = document.querySelector("#pushLinkedProduct");
const pushLinkedCategory = document.querySelector("#pushLinkedCategory");
const pushCtaText = document.querySelector("#pushCtaText");
const pushStartAt = document.querySelector("#pushStartAt");
const pushEndAt = document.querySelector("#pushEndAt");
const pushActive = document.querySelector("#pushActive");
const sendPushBtn = document.querySelector("#sendPushBtn");
const shopWhatsAppNumber = document.querySelector("#shopWhatsAppNumber");
const minimumOrderAmount = document.querySelector("#minimumOrderAmount");
const preparationTimeBase = document.querySelector("#preparationTimeBase");
const defaultDeliveryCountdownMinutes = document.querySelector("#defaultDeliveryCountdownMinutes");

let currentSection = "dashboard";

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[character]));
}

function formatNumber(value) {
  const number = Number(value) || 0;
  return Number.isInteger(number) ? String(number) : number.toFixed(1).replace(/\.0$/, "");
}

function getZoneValue(rawValue, fallback = 0) {
  if (rawValue === "" || rawValue === null || rawValue === undefined) return fallback;
  const parsed = Number(rawValue);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : fallback;
}

function setSaveStatus(text, tone = "synced") {
  if (!saveStatus) return;
  saveStatus.textContent = text;
  saveStatus.className = `save-status is-${tone}`;
}

function markSettingsDirty() {
  setSaveStatus("Settings changed", "dirty");
}

function showToast(message) {
  adminToast.textContent = message;
  adminToast.classList.add("visible");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => adminToast.classList.remove("visible"), 1800);
}

function imageSource(url) {
  if (!url) return "";
  return /^https?:\/\/.*\.(png|jpe?g|webp|gif|avif)(\?.*)?$/i.test(url)
    ? url
    : `/api/image?url=${encodeURIComponent(url)}`;
}

function formatMoney(value) {
  return `${formatNumber(value)} DHS`;
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString();
}

async function adminFetchJson(url, options = {}) {
  const headers = {
    ...(options.headers || {}),
    "X-Admin-Password": adminPassword
  };
  const response = await fetch(url, { ...options, headers });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || "Request failed");
  }
  return payload;
}

function toCsv(rows) {
  return rows.map(row => row.map(value => {
    const text = String(value ?? "");
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, "\"\"")}"` : text;
  }).join(",")).join("\n");
}

function downloadCsv(filename, rows) {
  const blob = new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function normalizeDeliveryZones(zones) {
  return (Array.isArray(zones) ? zones : [])
    .map(zone => ({
      id: String(zone.id || `zone-${Date.now()}-${zoneIdCounter++}`),
      radius: Math.max(0, Number(zone.radius) || 0),
      price: Math.max(0, Number(zone.price) || 0)
    }))
    .filter(zone => zone.radius > 0 && zone.price >= 0)
    .sort((a, b) => a.radius - b.radius);
}

function sortCategories(categories) {
  return [...categories].sort((a, b) => {
    const orderDelta = (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0);
    if (orderDelta) return orderDelta;
    return String(a.name || "").localeCompare(String(b.name || ""));
  });
}

function sortProducts(products) {
  return [...products].sort((a, b) => {
    const orderDelta = (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0);
    if (orderDelta) return orderDelta;
    return String(a.name || "").localeCompare(String(b.name || ""));
  });
}

function normalizeOrderIndexes(collection) {
  return collection.map((item, index) => ({ ...item, sortOrder: index }));
}

function ensureSettings() {
  menu.settings = menu.settings || {};
  menu.settings.heroImages = Array.isArray(menu.settings.heroImages) ? menu.settings.heroImages : [];
  menu.settings.promoCodes = Array.isArray(menu.settings.promoCodes) ? menu.settings.promoCodes : [];
  menu.settings.deliveryZones = normalizeDeliveryZones(menu.settings.deliveryZones);
}

function getShopLocation() {
  return {
    latitude: Number(shopLatitude.value) || Number(menu.settings?.shopLatitude) || 30.4017949,
    longitude: Number(shopLongitude.value) || Number(menu.settings?.shopLongitude) || -9.5510469
  };
}

function updateHeroPreviews() {
  heroPreviewImages.forEach((image, index) => {
    const url = heroImageInputs[index]?.value?.trim();
    if (url) {
      image.src = imageSource(url);
      image.classList.add("has-image");
    } else {
      image.removeAttribute("src");
      image.classList.remove("has-image");
    }
  });
}

function initZoneMap() {
  if (zoneMap || !window.L) return;

  zoneMap = L.map("zoneMap", {
    zoomControl: true,
    attributionControl: false
  }).setView([30.4017949, -9.5510469], 13);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19
  }).addTo(zoneMap);

  zoneMarker = L.circleMarker([30.4017949, -9.5510469], {
    radius: 8,
    color: "#ffffff",
    weight: 2,
    fillColor: "#ff0000",
    fillOpacity: 1
  }).addTo(zoneMap);
}

function getZonesForPreview() {
  ensureSettings();
  return (menu.settings?.deliveryZones || [])
    .map(zone => ({
      ...zone,
      radius: getZoneValue(zone.radius, 0),
      price: getZoneValue(zone.price, 0)
    }))
    .filter(zone => zone.radius > 0);
}

function renderZoneMap(zones = getZonesForPreview()) {
  if (!zoneMap || !window.L) return;

  const shop = getShopLocation();
  zoneMarker?.setLatLng([shop.latitude, shop.longitude]);
  zoneLayers.forEach(layer => layer.remove());
  zoneLayers = [];
  zones.forEach((zone, index) => {
    const palette = zonePalette[index % zonePalette.length];
    const circle = L.circle([shop.latitude, shop.longitude], {
      radius: zone.radius * 1000,
      color: palette.stroke,
      weight: 2,
      fillColor: palette.stroke,
      fillOpacity: 0.12 + Math.min(index * 0.04, 0.14)
    }).addTo(zoneMap);
    circle.bindTooltip(`${formatNumber(zone.radius)} km / ${formatNumber(zone.price)} DHS`);
    zoneLayers.push(circle);
  });

  if (zones.length) {
    const group = L.featureGroup([zoneMarker, ...zoneLayers]);
    zoneMap.fitBounds(group.getBounds().pad(0.16), { animate: false });
  } else {
    zoneMap.setView([shop.latitude, shop.longitude], 13, { animate: false });
  }

  if (zoneHelp) {
    zoneHelp.textContent = zones.length
      ? "Outside the last zone radius, delivery is unavailable."
      : "Add a delivery zone to enable delivery pricing.";
  }

  if (zoneSummary) {
    zoneSummary.textContent = zones.length
      ? `Outside max radius ${formatNumber(zones[zones.length - 1].radius)} km = delivery unavailable`
      : "Outside max radius = delivery unavailable";
  }

  if (currentSection === "delivery-zones") {
    window.requestAnimationFrame(() => zoneMap.invalidateSize(false));
  }
}

function renderZoneList() {
  ensureSettings();
  const zones = menu.settings.deliveryZones || [];
  zoneList.innerHTML = zones.length ? zones.map((zone, index) => {
    const palette = zonePalette[index % zonePalette.length];
    const minRadius = index === 0 ? 0 : zones[index - 1].radius;
    return `
      <div class="zone-row" data-zone-id="${escapeHtml(zone.id)}">
        <div class="zone-row-head">
          <div class="zone-inline-meta">
            <span class="zone-swatch" style="background:${palette.stroke}"></span>
            <div>
              <strong class="zone-title">Zone ${index + 1}: ${formatNumber(minRadius)} to ${formatNumber(zone.radius)} km / ${formatNumber(zone.price)} DHS</strong>
              <span class="zone-summary-text">First matching zone price will be used for checkout.</span>
            </div>
          </div>
          <button class="zone-delete" type="button" data-delete-zone="${escapeHtml(zone.id)}" aria-label="Delete zone">x</button>
        </div>
        <div class="zone-row-fields">
          <label class="zone-field">
            <span>Radius (km)</span>
            <input type="number" min="0.1" step="0.1" value="${escapeHtml(formatNumber(zone.radius))}" data-zone-radius="${escapeHtml(zone.id)}">
          </label>
          <label class="zone-field">
            <span>Price (DHS)</span>
            <input type="number" min="0" step="0.5" value="${escapeHtml(formatNumber(zone.price))}" data-zone-price="${escapeHtml(zone.id)}">
          </label>
        </div>
      </div>
    `;
  }).join("") : `<div class="zone-empty">No delivery zones yet.</div>`;

  renderZoneMap();
}

function renderDashboardCounts() {
  const categoryTotal = menu.categories.length;
  const productTotal = menu.products.length;
  const heroTotal = (menu.settings?.heroImages || []).filter(Boolean).length;
  const zoneTotal = (menu.settings?.deliveryZones || []).length;
  const promoTotal = (menu.settings?.promoCodes || []).length;
  const orderTotal = orders.length;
  const customerTotal = customers.length;

  categoryCount.textContent = `${categoryTotal} ${categoryTotal === 1 ? "category" : "categories"}`;
  categoryListTitle.textContent = categoryCount.textContent;
  productCount.textContent = `${productTotal} ${productTotal === 1 ? "product" : "products"}`;
  dashboardCategoryCount.textContent = String(categoryTotal);
  dashboardProductCount.textContent = String(productTotal);
  dashboardHeroCount.textContent = String(heroTotal);
  dashboardZoneCount.textContent = String(zoneTotal);
  if (dashboardOrderCount) dashboardOrderCount.textContent = String(orderTotal);
  if (dashboardCustomerCount) dashboardCustomerCount.textContent = String(customerTotal);
  if (dashboardTodayOrders) dashboardTodayOrders.textContent = String(dashboardStats?.todayOrders || 0);
  if (dashboardTodayRevenue) dashboardTodayRevenue.textContent = formatMoney(dashboardStats?.todayRevenue || 0);
  if (dashboardPendingOrders) dashboardPendingOrders.textContent = String(dashboardStats?.pendingOrders || 0);
  if (dashboardRepeatCustomers) dashboardRepeatCustomers.textContent = String(dashboardStats?.repeatCustomers || 0);
  summaryCategories.textContent = String(categoryTotal);
  summaryProducts.textContent = String(productTotal);
  summaryPromos.textContent = String(promoTotal);
  summaryZones.textContent = String(zoneTotal);
  if (dashboardBestSelling) {
    const bestSelling = dashboardStats?.bestSellingProducts || [];
    dashboardBestSelling.innerHTML = bestSelling.length
      ? bestSelling.map(item => `
        <div class="dashboard-list-row">
          <div>
            <strong>${escapeHtml(item.productName || "Product")}</strong>
            <span>${escapeHtml(item.available === false ? "Unavailable in app" : "Visible in app")}</span>
          </div>
          <strong>${formatNumber(item.quantity || 0)}</strong>
        </div>
      `).join("")
      : `<div class="zone-empty">No sales data yet.</div>`;
  }
}

function renderCategoryOptions() {
  const categoryOptions = sortCategories(menu.categories).map(category => `
    <option value="${escapeHtml(category.name)}">${escapeHtml(category.name)}</option>
  `).join("");
  productCategory.innerHTML = categoryOptions;
  productCategoryFilter.innerHTML = `<option value="">All categories</option>${categoryOptions}`;
}

function renderCategoryList() {
  const query = categorySearch.value.trim().toLowerCase();
  const categories = sortCategories(menu.categories).filter(category => category.name.toLowerCase().includes(query));

  categoryList.innerHTML = categories.length ? categories.map((category, index) => {
    const productTotal = menu.products.filter(product => product.category === category.name).length;
    return `
      <div class="admin-row">
        <div class="admin-product-summary">
          <div class="admin-thumb">
            ${category.imageUrl
              ? `<img src="${imageSource(category.imageUrl)}" alt="${escapeHtml(category.name)}">`
              : escapeHtml(category.name.slice(0, 1).toUpperCase())}
          </div>
          <div>
            <h3>${escapeHtml(category.name)}</h3>
            <p>${productTotal} products${category.imageUrl ? " · Image linked" : " · No image"}</p>
          </div>
        </div>
        <div class="row-actions">
          <button type="button" data-move-category="${escapeHtml(category.name)}" data-direction="-1" ${index === 0 ? "disabled" : ""}>↑</button>
          <button type="button" data-move-category="${escapeHtml(category.name)}" data-direction="1" ${index === categories.length - 1 ? "disabled" : ""}>↓</button>
          <button type="button" data-edit-category="${escapeHtml(category.name)}">Edit</button>
          <button type="button" class="danger-action" data-delete-category="${escapeHtml(category.name)}">Delete</button>
        </div>
      </div>
    `;
  }).join("") : `<div class="zone-empty">No categories match this search.</div>`;
}

function renderProductList() {
  const query = productSearch.value.trim().toLowerCase();
  const categoryFilter = productCategoryFilter.value;
  const products = sortProducts(menu.products).filter(product => {
    const matchesQuery = !query || [
      product.name,
      product.category,
      product.tag,
      product.badge
    ].some(value => String(value || "").toLowerCase().includes(query));
    const matchesCategory = !categoryFilter || product.category === categoryFilter;
    return matchesQuery && matchesCategory;
  });

  productList.innerHTML = products.length ? products.map((product, index) => `
    <div class="admin-row">
      <div class="admin-product-summary">
        <div class="admin-thumb">
          ${product.imageUrl
            ? `<img src="${imageSource(product.imageUrl)}" alt="${escapeHtml(product.name)}">`
            : escapeHtml(product.name.slice(0, 1).toUpperCase())}
        </div>
        <div>
          <h3>${escapeHtml(product.name)}</h3>
          <small>${product.available === false ? "Unavailable in customer app" : "Live in customer app"} · Display order ${Number(product.sortOrder) || 0}</small>
          <p>${escapeHtml(product.category)} · ${formatNumber(product.price)} DHS · ${escapeHtml(product.tag || "No tag")}${product.badge ? ` · ${escapeHtml(product.badge)}` : ""}${product.options?.length ? ` · ${product.options.length} option groups` : ""}</p>
        </div>
      </div>
      <div class="row-actions">
        <button type="button" data-move-product="${escapeHtml(product.id)}" data-direction="-1" ${index === 0 ? "disabled" : ""}>↑</button>
        <button type="button" data-move-product="${escapeHtml(product.id)}" data-direction="1" ${index === products.length - 1 ? "disabled" : ""}>↓</button>
        <button type="button" data-edit-product="${escapeHtml(product.id)}">Edit</button>
        <button type="button" class="danger-action" data-delete-product="${escapeHtml(product.id)}">Delete</button>
      </div>
    </div>
  `).join("") : `<div class="zone-empty">No products match this filter.</div>`;
}

function renderSettingsForm() {
  const heroImages = menu.settings?.heroImages || [];
  heroImageInputs.forEach((input, index) => {
    input.value = heroImages[index] || "";
  });
  shopLatitude.value = menu.settings?.shopLatitude || "";
  shopLongitude.value = menu.settings?.shopLongitude || "";
  if (shopWhatsAppNumber) shopWhatsAppNumber.value = menu.settings?.shopWhatsAppNumber || "212688943959";
  if (minimumOrderAmount) minimumOrderAmount.value = menu.settings?.minimumOrderAmount ?? 0;
  if (preparationTimeBase) preparationTimeBase.value = menu.settings?.preparationTimeBase ?? 20;
  if (defaultDeliveryCountdownMinutes) defaultDeliveryCountdownMinutes.value = menu.settings?.defaultDeliveryCountdownMinutes ?? 30;
  if (storeStatus) storeStatus.value = menu.settings?.isStoreOpen === false ? "closed" : "open";
  if (closedMessageInput) closedMessageInput.value = menu.settings?.closedMessage || "";
  promoCodesInput.value = (menu.settings?.promoCodes || [])
    .map(promo => `${promo.code}, ${promo.type}, ${promo.value}`)
    .join("\n");
  updateHeroPreviews();
}

function renderOrders() {
  if (!ordersList) return;
  const search = orderSearch?.value.trim().toLowerCase() || "";
  const status = orderStatusFilter?.value || "";
  const mode = orderModeFilter?.value || "";
  const filtered = orders.filter(order => {
    const matchesSearch = !search || [
      order.id,
      order.customerName,
      order.customerPhone
    ].some(value => String(value || "").toLowerCase().includes(search));
    const matchesStatus = !status || order.status === status;
    const matchesMode = !mode || order.mode === mode;
    return matchesSearch && matchesStatus && matchesMode;
  });

  ordersList.innerHTML = filtered.length ? filtered.map(order => `
    <button class="order-row ${selectedOrderId === order.id ? "active" : ""}" type="button" data-order-id="${order.id}">
      <div class="order-row-main">
        <strong>#${order.id}</strong>
        <span>${escapeHtml(order.customerName || "Customer")}</span>
        <small>${escapeHtml(order.customerPhone || "-")}</small>
      </div>
      <div class="order-row-meta">
        <span>${formatMoney(order.total)}</span>
        <small>${order.mode === "delivery" ? "Delivery" : "Pickup"} · ${formatDate(order.createdAt)}</small>
      </div>
      <span class="status-pill status-${escapeHtml(order.status)}">${escapeHtml(order.status)}</span>
    </button>
  `).join("") : `<div class="zone-empty">No orders match these filters.</div>`;
}

function renderOrderDetail(order) {
  if (!orderDetail || !orderDetailEmpty) return;
  if (!order) {
    selectedOrderId = null;
    orderDetail.classList.add("hidden");
    orderDetailEmpty.classList.remove("hidden");
    orderDetailTitle.textContent = "Select an order";
    orderStatusSelect.value = "new";
    orderStatusSelect.disabled = true;
    return;
  }

  selectedOrderId = order.id;
  orderDetail.classList.remove("hidden");
  orderDetailEmpty.classList.add("hidden");
  orderDetailTitle.textContent = `Order #${order.id}`;
  orderStatusSelect.disabled = false;
  orderStatusSelect.value = order.status;
  detailCustomerName.textContent = order.customerName || "Customer";
  detailCustomerPhone.textContent = order.customerPhone || "-";
  detailCustomerEmail.textContent = order.customerEmail || order.customer?.email || "-";
  detailOrderTotal.textContent = formatMoney(order.total);
  detailOrderMode.textContent = order.mode === "delivery" ? "Delivery" : "Pickup";
  detailOrderDate.textContent = formatDate(order.createdAt);
  orderItemsList.innerHTML = (order.items || []).length ? order.items.map(item => `
    <div class="detail-item">
      <div>
        <strong>${escapeHtml(item.productName)}</strong>
        <span>${item.options?.length ? escapeHtml(item.options.map(option => option.name || option).join(", ")) : "No options"}</span>
      </div>
      <div class="detail-item-meta">
        <span>${item.quantity} x ${formatMoney(item.unitPrice)}</span>
        <strong>${formatMoney(item.lineTotal)}</strong>
      </div>
    </div>
  `).join("") : `<div class="zone-empty">No items on this order.</div>`;
  detailAddress.textContent = order.address || (order.mode === "pickup" ? "Pickup from shop" : "-");
  detailLocation.textContent = order.latitude && order.longitude ? `${order.latitude}, ${order.longitude}` : "Not shared";
  detailDistance.textContent = order.distanceKm ? `${formatNumber(order.distanceKm)} km` : "-";
  detailZone.textContent = order.deliveryZoneRadius ? `${formatNumber(order.deliveryZoneRadius)} km` : (order.mode === "pickup" ? "Pickup" : "-");
  detailFee.textContent = formatMoney(order.deliveryFee || 0);
  detailPromo.textContent = order.promoCode ? `${order.promoCode} (-${formatMoney(order.discount || 0)})` : "None";
  detailWhatsappMessage.textContent = order.whatsappMessage || "-";
  renderOrders();
}

function renderCustomers() {
  if (!customersList) return;
  const search = customerSearchInput?.value.trim().toLowerCase() || "";
  const filtered = customers.filter(customer => !search || [
    customer.name,
    customer.phone,
    customer.email
  ].some(value => String(value || "").toLowerCase().includes(search)));

  customersList.innerHTML = filtered.length ? filtered.map(customer => `
    <div class="customer-row">
      <div class="customer-row-main">
        <strong>${escapeHtml(customer.name || "Customer")}</strong>
        <span>${escapeHtml(customer.phone || "-")}</span>
        <small>${escapeHtml(customer.email || "No email")}</small>
      </div>
      <div class="customer-row-metrics">
        <span>${customer.totalOrders} orders</span>
        <strong>${formatMoney(customer.totalSpent)}</strong>
        <small>${customer.lastOrderAt ? formatDate(customer.lastOrderAt) : "No orders yet"}</small>
      </div>
    </div>
  `).join("") : `<div class="zone-empty">No customers found.</div>`;

  if (customerTotalCount) customerTotalCount.textContent = String(customers.length);
  if (customerOrderTotal) customerOrderTotal.textContent = String(customers.reduce((sum, customer) => sum + (Number(customer.totalOrders) || 0), 0));
  if (customerSpendTotal) customerSpendTotal.textContent = formatMoney(customers.reduce((sum, customer) => sum + (Number(customer.totalSpent) || 0), 0));
}

async function loadOrders(force = false) {
  if (ordersLoaded && !force) {
    renderOrders();
    return;
  }
  const query = new URLSearchParams();
  if (orderSearch?.value.trim()) query.set("search", orderSearch.value.trim());
  if (orderStatusFilter?.value) query.set("status", orderStatusFilter.value);
  if (orderModeFilter?.value) query.set("mode", orderModeFilter.value);

  const payload = await adminFetchJson(`/api/orders${query.toString() ? `?${query.toString()}` : ""}`);
  orders = payload.orders || [];
  ordersLoaded = true;
  renderDashboardCounts();
  renderOrders();
  if (selectedOrderId) {
    const current = orders.find(order => order.id === selectedOrderId);
    if (!current) renderOrderDetail(null);
  }
}

async function loadOrderDetail(orderId) {
  const order = await adminFetchJson(`/api/orders/${orderId}`);
  renderOrderDetail(order);
}

async function loadCustomers(force = false) {
  if (customersLoaded && !force && !customerSearchInput?.value.trim()) {
    renderCustomers();
    return;
  }
  const query = new URLSearchParams();
  if (customerSearchInput?.value.trim()) query.set("search", customerSearchInput.value.trim());
  const payload = await adminFetchJson(`/api/customers${query.toString() ? `?${query.toString()}` : ""}`);
  customers = payload.customers || [];
  customersLoaded = true;
  renderDashboardCounts();
  renderCustomers();
}

async function loadDashboardStats() {
  try {
    dashboardStats = await adminFetchJson("/api/dashboard", { cache: "no-store" });
  } catch (error) {
    dashboardStats = null;
    console.warn("Could not load dashboard stats", error);
  }
  renderDashboardCounts();
}

function render() {
  ensureSettings();
  renderDashboardCounts();
  renderCategoryOptions();
  renderNotificationOptions();
  renderSettingsForm();
  renderCategoryList();
  renderProductList();
  renderZoneList();
  renderOrders();
  renderCustomers();
}

function navigateTo(section) {
  currentSection = sectionMeta[section] ? section : "dashboard";
  sidebarLinks.forEach(button => button.classList.toggle("active", button.dataset.navTarget === currentSection));
  views.forEach(view => view.classList.toggle("active", view.dataset.section === currentSection));
  pageTitle.textContent = sectionMeta[currentSection].title;
  pageEyebrow.textContent = sectionMeta[currentSection].eyebrow;

  if (currentSection === "delivery-zones" && zoneMap) {
    setTimeout(() => zoneMap.invalidateSize(false), 120);
  }
  if (currentSection === "orders") {
    loadOrders().catch(error => showToast(error.message));
  }
  if (currentSection === "customers") {
    loadCustomers().catch(error => showToast(error.message));
  }
}

async function loadMenu() {
  const response = await fetch("/api/menu", { cache: "no-store" });
  if (!response.ok) throw new Error("Could not load menu");
  const payload = await response.json();
  menu = {
    ...payload,
    settings: menu.settings || {}
  };
  menu.categories = sortCategories(menu.categories || []);
  menu.products = sortProducts(menu.products || []);
  renderDashboardCounts();
  renderCategoryOptions();
  renderNotificationOptions();
  renderCategoryList();
  renderProductList();
}

function renderNotificationOptions() {
  if (pushLinkedProduct) {
    pushLinkedProduct.innerHTML = [
      `<option value="">No product link</option>`,
      ...menu.products.map(product => `<option value="${escapeHtml(product.id)}">${escapeHtml(product.name)} · ${escapeHtml(product.category)}</option>`)
    ].join("");
  }
  if (pushLinkedCategory) {
    pushLinkedCategory.innerHTML = [
      `<option value="">No category link</option>`,
      ...menu.categories.map(category => `<option value="${escapeHtml(category.name)}">${escapeHtml(category.name)}</option>`)
    ].join("");
  }
}

async function saveMenu(message = "Saved") {
  setSaveStatus("Saving changes...", "saving");
  const response = await fetch("/api/menu", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "X-Admin-Password": adminPassword
    },
    body: JSON.stringify({
      categories: menu.categories,
      products: menu.products
    })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Could not save menu" }));
    setSaveStatus(error.error || "Save failed", "error");
    throw new Error(error.error);
  }

  const payload = await response.json();
  menu = {
    ...menu,
    categories: payload.categories || [],
    products: payload.products || [],
    settings: menu.settings || {}
  };
  render();
  loadDashboardStats().catch(() => {});
  setSaveStatus("All changes synced", "synced");
  showToast(message);
}

async function loadSettings() {
  try {
    const payload = await adminFetchJson("/api/settings", { cache: "no-store" });
    menu.settings = payload;
    renderSettingsForm();
    renderZoneList();
    renderDashboardCounts();
  } catch (error) {
    setSaveStatus(error.message, "error");
    showToast(error.message);
    throw error;
  }
}

async function saveSettings(message = "Settings saved") {
  setSaveStatus("Saving changes...", "saving");
  try {
    const settings = await adminFetchJson("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(menu.settings || {})
    });
    menu.settings = settings;
    renderSettingsForm();
    renderZoneList();
    renderDashboardCounts();
    loadDashboardStats().catch(() => {});
    setSaveStatus("All changes synced", "synced");
    showToast(message);
  } catch (error) {
    setSaveStatus(error.message, "error");
    showToast(error.message);
    throw error;
  }
}

async function verifyPassword(password) {
  const response = await fetch("/api/admin/check", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password })
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Invalid admin password" }));
    throw new Error(error.error || "Invalid admin password");
  }
  return response.json();
}

async function unlockAdmin(password) {
  await verifyPassword(password);
  adminPassword = password;
  sessionStorage.setItem("adminPassword", password);
  adminLogin.classList.add("hidden");
  initZoneMap();
  await Promise.all([
    loadMenu(),
    loadSettings(),
    loadDashboardStats(),
    loadOrders().catch(error => {
      showToast(error.message);
      return null;
    }),
    loadCustomers().catch(error => {
      showToast(error.message);
      return null;
    })
  ]);
}

function resetCategoryForm() {
  categoryForm.reset();
  categoryOriginalName.value = "";
  if (categorySortOrder) categorySortOrder.value = "";
  categorySubmitButton.textContent = "Add category";
}

function resetProductForm() {
  productForm.reset();
  productId.value = "";
  productOptions.value = "";
  productColor.value = "red";
  productShape.value = "bread";
  productBadge.value = "";
  if (productSortOrder) productSortOrder.value = "";
  if (productAvailable) productAvailable.checked = true;
  if (menu.categories[0]) productCategory.value = menu.categories[0].name;
}

function editCategory(name) {
  const category = menu.categories.find(item => item.name === name);
  if (!category) return;
  categoryOriginalName.value = category.name;
  categoryName.value = category.name;
  categoryImageUrl.value = category.imageUrl || "";
  if (categorySortOrder) categorySortOrder.value = Number(category.sortOrder) || 0;
  categorySubmitButton.textContent = "Update category";
  navigateTo("categories");
  categoryName.focus();
}

function editProduct(id) {
  const product = menu.products.find(item => item.id === id);
  if (!product) return;
  productId.value = product.id;
  productName.value = product.name;
  productCategory.value = product.category;
  productPrice.value = product.price;
  productTag.value = product.tag || "";
  productBadge.value = product.badge || "";
  productDesc.value = product.desc || "";
  productImageUrl.value = product.imageUrl || "";
  productOptions.value = (product.options || []).map(group => {
    const header = `[${group.name}]${group.required ? " *" : ""}`;
    const choices = (group.choices || []).map(choice => `${choice.name}, ${choice.price}`).join("\n");
    return `${header}\n${choices}`;
  }).join("\n\n");
  productColor.value = product.color || "red";
  productShape.value = product.shape || "bread";
  if (productSortOrder) productSortOrder.value = Number(product.sortOrder) || 0;
  if (productAvailable) productAvailable.checked = product.available !== false;
  navigateTo("products");
  productName.focus();
}

function parsePromoCodes(value) {
  return value.split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const [code = "", type = "percent", amount = "0"] = line.split(",").map(part => part.trim());
      return {
        code: code.toUpperCase(),
        type: type.toLowerCase() === "fixed" ? "fixed" : "percent",
        value: Math.max(0, Number(amount) || 0)
      };
    })
    .filter(promo => promo.code && promo.value > 0);
}

function parseProductOptions(value) {
  const groups = [];
  let currentGroup = { name: "Options", required: false, choices: [] };

  value.split(/\r?\n/).forEach(line => {
    const trimmed = line.trim();
    if (!trimmed) return;

    if (trimmed.startsWith("[")) {
      if (currentGroup.choices.length > 0) groups.push(currentGroup);
      const isRequired = trimmed.endsWith("*");
      const nameMatch = trimmed.match(/\[(.*?)\]/);
      currentGroup = {
        name: nameMatch ? nameMatch[1].trim() : "Options",
        required: isRequired,
        choices: []
      };
      return;
    }

    const [optionName = "", optionPrice = "0"] = trimmed.split(",").map(part => part.trim());
    if (optionName) {
      currentGroup.choices.push({
        name: optionName,
        price: Math.max(0, Number(optionPrice) || 0)
      });
    }
  });

  if (currentGroup.choices.length > 0) groups.push(currentGroup);
  return groups;
}

function updateZone(zoneId, field, value) {
  ensureSettings();
  const zone = menu.settings.deliveryZones.find(item => item.id === zoneId);
  if (!zone) return;
  zone[field] = value;
  renderZoneMap();
  markSettingsDirty();
}

function commitZoneEdits() {
  ensureSettings();
  menu.settings.deliveryZones = normalizeDeliveryZones(menu.settings.deliveryZones.map(zone => ({
    ...zone,
    radius: getZoneValue(zone.radius, 0),
    price: getZoneValue(zone.price, 0)
  })));
  renderZoneList();
  markSettingsDirty();
}

navButtons.forEach(button => {
  button.addEventListener("click", () => navigateTo(button.dataset.navTarget));
});

heroImageInputs.forEach(input => {
  input.addEventListener("input", () => {
    updateHeroPreviews();
    markSettingsDirty();
  });
});

heroPreviewImages.forEach(image => {
  image.addEventListener("error", () => {
    image.removeAttribute("src");
    image.classList.remove("has-image");
  });
});

[shopLatitude, shopLongitude, promoCodesInput, storeStatus, closedMessageInput].forEach(field => {
  field?.addEventListener("input", () => {
    renderZoneMap();
    markSettingsDirty();
  });
  field?.addEventListener("change", () => {
    renderZoneMap();
    markSettingsDirty();
  });
});
[shopWhatsAppNumber, minimumOrderAmount, preparationTimeBase, defaultDeliveryCountdownMinutes].forEach(field => {
  field?.addEventListener("input", markSettingsDirty);
  field?.addEventListener("change", markSettingsDirty);
});

categorySearch?.addEventListener("input", renderCategoryList);
productSearch?.addEventListener("input", renderProductList);
productCategoryFilter?.addEventListener("change", renderProductList);
orderSearch?.addEventListener("input", () => {
  ordersLoaded = false;
  loadOrders(true).catch(error => showToast(error.message));
});
orderStatusFilter?.addEventListener("change", () => {
  ordersLoaded = false;
  loadOrders(true).catch(error => showToast(error.message));
});
orderModeFilter?.addEventListener("change", () => {
  ordersLoaded = false;
  loadOrders(true).catch(error => showToast(error.message));
});
customerSearchInput?.addEventListener("input", () => {
  customersLoaded = false;
  loadCustomers(true).catch(error => showToast(error.message));
});

categoryForm.addEventListener("submit", async event => {
  event.preventDefault();

  const nextName = categoryName.value.trim();
  const nextImageUrl = categoryImageUrl.value.trim();
  const oldName = categoryOriginalName.value.trim();
  if (!nextName) return;

  const duplicate = menu.categories.some(category =>
    category.name.toLowerCase() === nextName.toLowerCase() && category.name !== oldName
  );
  if (duplicate) {
    showToast("Category already exists");
    return;
  }

  if (oldName) {
    menu.categories = menu.categories.map(category =>
      category.name === oldName
        ? {
            ...category,
            name: nextName,
            imageUrl: nextImageUrl,
            sortOrder: Math.max(0, Number(categorySortOrder?.value) || Number(category.sortOrder) || 0)
          }
        : category
    );
    menu.products = menu.products.map(product =>
      product.category === oldName ? { ...product, category: nextName } : product
    );
    resetCategoryForm();
    await saveMenu("Category updated");
    return;
  }

  menu.categories.push({
    name: nextName,
    imageUrl: nextImageUrl,
    sortOrder: Math.max(0, Number(categorySortOrder?.value) || menu.categories.length)
  });
  menu.categories = sortCategories(menu.categories);
  resetCategoryForm();
  await saveMenu("Category added");
});

cancelCategoryEdit?.addEventListener("click", resetCategoryForm);

settingsForm.addEventListener("submit", async event => {
  event.preventDefault();
  ensureSettings();
  menu.settings = {
    ...(menu.settings || {}),
    heroImages: heroImageInputs.map(input => input.value.trim()).filter(Boolean).slice(0, 5),
    shopLatitude: Number(shopLatitude.value) || 0,
    shopLongitude: Number(shopLongitude.value) || 0,
    deliveryZones: normalizeDeliveryZones(menu.settings.deliveryZones.map(zone => ({
      ...zone,
      radius: getZoneValue(zone.radius, 0),
      price: getZoneValue(zone.price, 0)
    }))),
    promoCodes: parsePromoCodes(promoCodesInput.value),
    shopWhatsAppNumber: shopWhatsAppNumber?.value.trim() || "212688943959",
    minimumOrderAmount: Math.max(0, Number(minimumOrderAmount?.value) || 0),
    preparationTimeBase: Math.max(5, Number(preparationTimeBase?.value) || 20),
    defaultDeliveryCountdownMinutes: Math.max(5, Number(defaultDeliveryCountdownMinutes?.value) || 30),
    isStoreOpen: storeStatus?.value !== "closed",
    closedMessage: closedMessageInput?.value.trim() || "Nous sommes fermes actuellement. Merci de revenir pendant nos horaires d'ouverture."
  };
  await saveSettings("Settings saved");
});

zoneList?.addEventListener("input", event => {
  const radiusInput = event.target.closest("[data-zone-radius]");
  const priceInput = event.target.closest("[data-zone-price]");
  if (radiusInput) updateZone(radiusInput.dataset.zoneRadius, "radius", radiusInput.value);
  if (priceInput) updateZone(priceInput.dataset.zonePrice, "price", priceInput.value);
});

zoneList?.addEventListener("blur", event => {
  if (event.target.matches("[data-zone-radius], [data-zone-price]")) {
    commitZoneEdits();
  }
}, true);

zoneList?.addEventListener("click", event => {
  const deleteButton = event.target.closest("[data-delete-zone]");
  if (!deleteButton) return;
  ensureSettings();
  menu.settings.deliveryZones = menu.settings.deliveryZones.filter(zone => zone.id !== deleteButton.dataset.deleteZone);
  renderZoneList();
  markSettingsDirty();
});

ordersList?.addEventListener("click", event => {
  const button = event.target.closest("[data-order-id]");
  if (!button) return;
  loadOrderDetail(button.dataset.orderId).catch(error => showToast(error.message));
});

orderStatusSelect?.addEventListener("change", async () => {
  if (!selectedOrderId) return;
  try {
    const order = await adminFetchJson(`/api/orders/${selectedOrderId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: orderStatusSelect.value })
    });
    orders = orders.map(item => item.id === order.id ? { ...item, ...order } : item);
    renderOrders();
    await loadOrderDetail(order.id);
    showToast(`Order #${order.id} updated`);
  } catch (error) {
    showToast(error.message);
  }
});

exportOrdersCsv?.addEventListener("click", () => {
  const rows = [
    ["Order ID", "Created At", "Customer Name", "Phone", "Email", "Mode", "Status", "Subtotal", "Delivery Fee", "Discount", "Total", "Promo Code"]
  ];
  orders.forEach(order => {
    rows.push([
      order.id,
      order.createdAt,
      order.customerName,
      order.customerPhone,
      order.customerEmail || "",
      order.mode,
      order.status,
      order.subtotal,
      order.deliveryFee,
      order.discount,
      order.total,
      order.promoCode || ""
    ]);
  });
  downloadCsv("3p-orders.csv", rows);
});

exportCustomersCsv?.addEventListener("click", () => {
  const rows = [
    ["Customer ID", "Name", "Phone", "Email", "Firebase UID", "Total Orders", "Total Spent", "Last Order At"]
  ];
  customers.forEach(customer => {
    rows.push([
      customer.id,
      customer.name || "",
      customer.phone || "",
      customer.email || "",
      customer.firebaseUid || "",
      customer.totalOrders,
      customer.totalSpent,
      customer.lastOrderAt || ""
    ]);
  });
  downloadCsv("3p-customers.csv", rows);
});

exportProductsCsv?.addEventListener("click", () => {
  const rows = [
    ["Product ID", "Name", "Category", "Price", "Available", "Sort Order", "Tag", "Badge", "Image URL"]
  ];
  sortProducts(menu.products).forEach(product => {
    rows.push([
      product.id,
      product.name,
      product.category,
      product.price,
      product.available === false ? "No" : "Yes",
      product.sortOrder ?? 0,
      product.tag || "",
      product.badge || "",
      product.imageUrl || ""
    ]);
  });
  downloadCsv("3p-products.csv", rows);
});

addZoneButton?.addEventListener("click", () => {
  ensureSettings();
  menu.settings.deliveryZones.push({
    id: `zone-${Date.now()}-${zoneDraftCounter++}`,
    radius: 3,
    price: 10
  });
  menu.settings.deliveryZones = normalizeDeliveryZones(menu.settings.deliveryZones);
  renderZoneList();
  markSettingsDirty();
});

categoryList.addEventListener("click", async event => {
  const editButton = event.target.closest("[data-edit-category]");
  const deleteButton = event.target.closest("[data-delete-category]");
  const moveButton = event.target.closest("[data-move-category]");

  if (moveButton) {
    const ordered = sortCategories(menu.categories);
    const currentIndex = ordered.findIndex(category => category.name === moveButton.dataset.moveCategory);
    const targetIndex = currentIndex + Number(moveButton.dataset.direction);
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= ordered.length) return;
    [ordered[currentIndex], ordered[targetIndex]] = [ordered[targetIndex], ordered[currentIndex]];
    menu.categories = normalizeOrderIndexes(ordered);
    await saveMenu("Category order updated");
    return;
  }

  if (editButton) {
    editCategory(editButton.dataset.editCategory);
    return;
  }

  if (deleteButton) {
    const name = deleteButton.dataset.deleteCategory;
    const used = menu.products.some(product => product.category === name);
    const message = used
      ? `Delete "${name}" and all products inside it?`
      : `Delete "${name}"?`;
    if (!window.confirm(message)) return;
    menu.categories = menu.categories.filter(category => category.name !== name);
    menu.products = menu.products.filter(product => product.category !== name);
    resetCategoryForm();
    await saveMenu("Category deleted");
  }
});

productForm.addEventListener("submit", async event => {
  event.preventDefault();
  if (!menu.categories.length) {
    showToast("Add a category first");
    return;
  }

  const product = {
    id: productId.value || `p${Date.now()}`,
    name: productName.value.trim(),
    category: productCategory.value,
    price: Number(productPrice.value),
    tag: productTag.value.trim(),
    badge: productBadge.value,
    desc: productDesc.value.trim(),
    imageUrl: productImageUrl.value.trim(),
    options: parseProductOptions(productOptions.value),
    color: productColor.value,
    shape: productShape.value,
    available: productAvailable?.checked !== false,
    sortOrder: Math.max(0, Number(productSortOrder?.value) || menu.products.length)
  };

  if (!product.name || Number.isNaN(product.price)) return;

  const index = menu.products.findIndex(item => item.id === product.id);
  if (index >= 0) menu.products[index] = product;
  else menu.products.push(product);
  menu.products = sortProducts(menu.products);

  resetProductForm();
  await saveMenu(index >= 0 ? "Product updated" : "Product added");
});

productList.addEventListener("click", async event => {
  const editButton = event.target.closest("[data-edit-product]");
  const deleteButton = event.target.closest("[data-delete-product]");
  const moveButton = event.target.closest("[data-move-product]");

  if (moveButton) {
    const ordered = sortProducts(menu.products);
    const currentIndex = ordered.findIndex(product => product.id === moveButton.dataset.moveProduct);
    const targetIndex = currentIndex + Number(moveButton.dataset.direction);
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= ordered.length) return;
    [ordered[currentIndex], ordered[targetIndex]] = [ordered[targetIndex], ordered[currentIndex]];
    menu.products = normalizeOrderIndexes(ordered);
    await saveMenu("Product order updated");
    return;
  }

  if (editButton) {
    editProduct(editButton.dataset.editProduct);
    return;
  }

  if (deleteButton) {
    const id = deleteButton.dataset.deleteProduct;
    const product = menu.products.find(item => item.id === id);
    if (!product || !window.confirm(`Delete "${product.name}"?`)) return;
    menu.products = menu.products.filter(item => item.id !== id);
    await saveMenu("Product deleted");
  }
});

newProductButton?.addEventListener("click", () => {
  resetProductForm();
  navigateTo("products");
});

cancelEditButton?.addEventListener("click", resetProductForm);

adminLoginForm.addEventListener("submit", async event => {
  event.preventDefault();
  try {
    await unlockAdmin(adminPasswordInput.value);
    setSaveStatus("All changes synced", "synced");
    showToast("Admin unlocked");
  } catch (error) {
    sessionStorage.removeItem("adminPassword");
    adminPassword = "";
    adminPasswordInput.value = "";
    adminPasswordInput.focus();
    setSaveStatus("Waiting for login", "error");
    showToast(error.message);
  }
});

if (adminPassword) {
  unlockAdmin(adminPassword).catch(() => {
    sessionStorage.removeItem("adminPassword");
    adminPassword = "";
    adminLogin.classList.remove("hidden");
  });
}

pushTarget?.addEventListener("change", () => {
  customerIdGroup.classList.toggle("hidden", pushTarget.value !== "SPECIFIC");
});

pushTemplate?.addEventListener("change", () => {
  switch (pushTemplate.value) {
    case "accepted":
      pushTitle.value = "Order Accepted";
      pushBody.value = "Your order has been accepted and is being prepared!";
      pushTarget.value = "SPECIFIC";
      customerIdGroup.classList.remove("hidden");
      break;
    case "driver":
      pushTitle.value = "Driver is Coming";
      pushBody.value = "Your driver is on the way! Get ready.";
      pushTarget.value = "SPECIFIC";
      customerIdGroup.classList.remove("hidden");
      break;
    case "promo":
      pushTitle.value = "Promo Today";
      pushBody.value = "Don't miss out on our special discount today!";
      pushTarget.value = "ALL";
      customerIdGroup.classList.add("hidden");
      break;
    default:
      pushTitle.value = "";
      pushBody.value = "";
  }
});

sendPushBtn?.addEventListener("click", async () => {
  const target = pushTarget.value;
  const customerId = pushCustomerId.value.trim().replace(/^#/, "");
  const title = pushTitle.value.trim();
  const message = pushBody.value.trim();
  const imageUrl = pushImageUrl.value.trim();
  const linkedProductId = pushLinkedProduct?.value || "";
  const linkedCategoryId = pushLinkedCategory?.value || "";
  const ctaText = pushCtaText?.value.trim() || "";
  const active = Boolean(pushActive?.checked);

  if (!title || !message) {
    showToast("Title and message are required.");
    return;
  }

  if (target === "SPECIFIC" && !customerId) {
    showToast("Please enter a Customer Order ID.");
    return;
  }

  const confirmMessage = target === "ALL"
    ? "Send this notification to all customers?"
    : `Send notification to customer #${customerId}?`;

  if (!window.confirm(confirmMessage)) return;

  sendPushBtn.disabled = true;
  sendPushBtn.textContent = "Sending...";

  try {
    const response = await fetch("/api/notify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Admin-Password": adminPassword
      },
      body: JSON.stringify({
        customerId: target === "ALL" ? "ALL" : customerId,
        title,
        message,
        imageUrl,
        linkedProductId,
        linkedCategoryId,
        ctaText,
        startsAt: pushStartAt?.value ? new Date(pushStartAt.value).toISOString() : "",
        endsAt: pushEndAt?.value ? new Date(pushEndAt.value).toISOString() : "",
        active
      })
    });

    const result = await response.json();
    if (response.ok && result.success) {
      showToast(target === "ALL" ? `Sent to ${result.count} devices!` : "Notification sent!");
      pushTemplate.value = "custom";
      pushTitle.value = "";
      pushBody.value = "";
      pushCustomerId.value = "";
      pushImageUrl.value = "";
      if (pushLinkedProduct) pushLinkedProduct.value = "";
      if (pushLinkedCategory) pushLinkedCategory.value = "";
      if (pushCtaText) pushCtaText.value = "";
      if (pushStartAt) pushStartAt.value = "";
      if (pushEndAt) pushEndAt.value = "";
      if (pushActive) pushActive.checked = true;
    } else {
      showToast(`Failed: ${result.error || "Unknown error"}`);
    }
  } catch (error) {
    console.error(error);
    showToast("Error sending notification.");
  } finally {
    sendPushBtn.disabled = false;
    sendPushBtn.textContent = "Send Notification";
  }
});

navigateTo(currentSection);
