// Firebase is loaded lazily so a slow/failed network never blocks the splash screen
let app = null, messaging = null, auth = null, getToken = null, onMessage = null;
(async () => {
  try {
    const fb = await import("./firebase-config.js");
    app = fb.app;
    messaging = fb.messaging;
    auth = fb.auth;
    getToken = fb.getToken;
    onMessage = fb.onMessage;
  } catch (e) {
    console.warn("Firebase config failed to load:", e);
  }
})();

let categories = [
  {
    "name": "All",
    "imageUrl": ""
  },
  {
    "name": "Crunchy",
    "imageUrl": ""
  },
  {
    "name": "Twisster & Wrap",
    "imageUrl": ""
  },
  {
    "name": "3P Bowl New",
    "imageUrl": ""
  },
  {
    "name": "Slider",
    "imageUrl": ""
  },
  {
    "name": "Menu Duplex",
    "imageUrl": ""
  },
  {
    "name": "Chicken Pops",
    "imageUrl": ""
  },
  {
    "name": "3P CRUSTY",
    "imageUrl": ""
  }
];

let products = [
  {
    "id": "p001",
    "name": "THE CRUNCH",
    "category": "Crunchy",
    "price": 24,
    "tag": "Crunchy",
    "desc": "Pain Buns BriochÃ© + 2 Crispy strips +Laitue + Cornichon + Cheddar + Sauce Maison + Sauce Au Choix",
    "imageUrl": "https://i.ibb.co/S41pnstJ/THE-CRUNCH.png",
    "color": "red",
    "shape": "bread"
  },
  {
    "id": "p002",
    "name": "THE MEGA CRUNCH",
    "category": "Crunchy",
    "price": 36,
    "tag": "Crunchy",
    "desc": "Pain Buns BriochÃ© + 4 Crispy Strips + Laitue +Cournichon +Cheddar +Sauce Maison + Sauce Au Choix",
    "imageUrl": "https://i.ibb.co/h1T6MvzQ/THE-MEGA-CRUNCH.png",
    "color": "red",
    "shape": "bread"
  },
  {
    "id": "p003",
    "name": "THE SMOKEY",
    "category": "Crunchy",
    "price": 55,
    "tag": "Crunchy",
    "desc": "Buns briochÃ©, Tendre crispy, double cheddar,Double jambon, sauce fumÃ©e Servi avec frites cheddar et onions crispy et boisson au choix",
    "imageUrl": "https://i.ibb.co/DDCYYH2W/Chat-GPT-Image-12-mars-2026-02-07-38.png",
    "color": "teal",
    "shape": "bread"
  },
  {
    "id": "p004",
    "name": "TWISTER STORM",
    "category": "Twisster & Wrap",
    "price": 32,
    "tag": "Wrap",
    "desc": "Tortilla + 3 Pieces Crispy + Laitue +Cheddar + Sauce Maison + Sauce Au Choix",
    "imageUrl": "https://i.ibb.co/JjYfM85v/TWISTER.png",
    "color": "blue",
    "shape": "tray"
  },
  {
    "id": "p005",
    "name": "WRAP'N ROLL",
    "category": "Twisster & Wrap",
    "price": 35,
    "tag": "Wrap",
    "desc": "Wrap BlÃ© Complet + 3Strips + Dinde FumÃ©e +Cheddar +Laitue +Sauce Maison",
    "imageUrl": "https://i.ibb.co/5WDQpLc7/WRAP-N-ROLL.png",
    "color": "yellow",
    "shape": "tray"
  },
  {
    "id": "p006",
    "name": "3P Bowl",
    "category": "3P Bowl New",
    "price": 58,
    "tag": "Bowl",
    "desc": "Sauce Maison , Base Au Choix , Sauce Cheesy , Viande Au Choix , Sauce De Base Au Choix , Ognion Crispy , Dinde FumÃ©e , Cournichons",
    "imageUrl": "https://i.ibb.co/bgKg53V8/Untitled-design-2026-04-09-T013453-061.png",
    "color": "teal",
    "shape": "plate"
  },
  {
    "id": "p007",
    "name": "SLIDER CLASSIQUE",
    "category": "Slider",
    "price": 40,
    "tag": "Slider",
    "desc": "",
    "imageUrl": "https://i.ibb.co/bVK56Ck/Untitled-design-43-1.png",
    "color": "yellow",
    "shape": "bread"
  },
  {
    "id": "p008",
    "name": "SLIDER BUFFALO HONEY",
    "category": "Slider",
    "price": 40,
    "tag": "Slider",
    "desc": "",
    "imageUrl": "https://i.ibb.co/dw0718ZC/honey-slider.png",
    "color": "red",
    "shape": "bread"
  },
  {
    "id": "p009",
    "name": "SLIDER HOT CHICKEN",
    "category": "Slider",
    "price": 40,
    "tag": "Slider",
    "desc": "",
    "imageUrl": "https://i.ibb.co/9911GvsB/hot-chicken.png",
    "color": "red",
    "shape": "bread"
  },
  {
    "id": "p010",
    "name": "SLIDER BBQ",
    "category": "Slider",
    "price": 40,
    "tag": "Slider",
    "desc": "",
    "imageUrl": "https://i.ibb.co/tPp0CG2X/bbq.png",
    "color": "teal",
    "shape": "bread"
  },
  {
    "id": "p011",
    "name": "DUPLEX CLASSIQUE",
    "category": "Menu Duplex",
    "price": 74,
    "tag": "Duplex",
    "desc": "Potato Buns Pain +2 Pieces Poulet Frit En Babeurre Sauce Maison + Cornichons + Potatos + Boisson Au Choix",
    "imageUrl": "https://i.ibb.co/wh0dHMCr/Untitled-design-71.png",
    "color": "teal",
    "shape": "box"
  },
  {
    "id": "p012",
    "name": "Duplex Buffalo Honey",
    "category": "Menu Duplex",
    "price": 74,
    "tag": "Duplex",
    "desc": "Potato Buns Pain +2 PiÃ©ces Poulet Frit En Babeurre Au Miel +Sauce Buffalo +Cheddar +Mayonnaise +Potatos + Boisson Au Choix",
    "imageUrl": "https://i.ibb.co/qYDJvtMy/Untitled-design-72.png",
    "color": "blue",
    "shape": "box"
  },
  {
    "id": "p013",
    "name": "DUPLEX Hot Chicke'n",
    "category": "Menu Duplex",
    "price": 74,
    "tag": "Duplex",
    "desc": "Potato Buns Pain + 2 PiÃ©ces Poulet Frit En Babeurre Au Huile De Piment +Sauce Maison +sriracha + Cournichons + Boisson Au Choix",
    "imageUrl": "https://i.ibb.co/WN2WN2w1/Untitled-design-70.png",
    "color": "red",
    "shape": "box"
  },
  {
    "id": "p014",
    "name": "Duplex BBQ",
    "category": "Menu Duplex",
    "price": 74,
    "tag": "Duplex",
    "desc": "Potato Buns Pain +2 Poulet Frit En Babeurre BBQ + Sauce Maison + Cornichons + Sauce separÃ© Au Choix +Potatos + Boisson Au Choix",
    "imageUrl": "https://i.ibb.co/v635mkZZ/Untitled-design-69.png",
    "color": "yellow",
    "shape": "box"
  },
  {
    "id": "p015",
    "name": "classique Chick'n pop's",
    "category": "Chicken Pops",
    "price": 39,
    "tag": "Pops",
    "desc": "",
    "imageUrl": "https://i.ibb.co/bR7gKqbV/Untitled-design-77.png",
    "color": "teal",
    "shape": "tray"
  },
  {
    "id": "p016",
    "name": "Sweet Chili Chick'n Pop's",
    "category": "Chicken Pops",
    "price": 39,
    "tag": "Pops",
    "desc": "",
    "imageUrl": "https://i.ibb.co/YB67ktWX/Untitled-design-75.png",
    "color": "blue",
    "shape": "tray"
  },
  {
    "id": "p017",
    "name": "Buffalo Honey Chick'n Pop's",
    "category": "Chicken Pops",
    "price": 39,
    "tag": "Pops",
    "desc": "",
    "imageUrl": "https://i.ibb.co/bM1QJLc7/Untitled-design-76.png",
    "color": "red",
    "shape": "tray"
  },
  {
    "id": "p018",
    "name": "Bbq Chick'n Pop's",
    "category": "Chicken Pops",
    "price": 39,
    "tag": "Pops",
    "desc": "",
    "imageUrl": "https://i.ibb.co/ynPZK1q9/Untitled-design-78.png",
    "color": "yellow",
    "shape": "tray"
  },
  {
    "id": "p019",
    "name": "3P CRUSTY",
    "category": "3P CRUSTY",
    "price": 45,
    "tag": "Crusty",
    "desc": "Riz basmati, filet de poulet crispy oignon crispy, persil, sauce fromagÃ©re crÃ©meuse, sauce maison",
    "imageUrl": "https://i.ibb.co/F4pBMbnF/3-P-CRUSTY.png",
    "color": "teal",
    "shape": "bread"
  }
];

const fallbackCategories = categories.map(category => ({ ...category }));
const fallbackProducts = products.map(product => ({ ...product }));

const state = {
  category: "All",
  query: "",
  mode: "delivery",
  location: null,
  promo: null,
  pendingProduct: null,
  currentView: "home",
  settings: {
    shopLatitude: 30.4017949,
    shopLongitude: -9.5510469,
    deliveryPricePerKm: 5,
    minimumDeliveryPrice: 0,
    deliveryZones: [],
    promoCodes: [],
    shopWhatsAppNumber,
    minimumOrderAmount: 0,
    preparationTimeBase: 20,
    isStoreOpen: true,
    closedMessage: "Nous sommes fermes actuellement. Merci de revenir pendant nos horaires d'ouverture."
  },
  customer: null,
  cart: new Map()
};

const categoryRoot = document.querySelector("#categories");
const productRoot = document.querySelector("#products");
const featuredProductsRoot = document.querySelector("#featuredProducts");
const screenRoot = document.querySelector("#screen");
const homeResultsMeta = document.querySelector("#homeResultsMeta");
const homeSectionHeading = document.querySelector("#homeSectionHeading");
const homeStoreBanner = document.querySelector("#homeStoreBanner");
const homeStoreBannerText = document.querySelector("#homeStoreBannerText");
const explorerStoreBanner = document.querySelector("#explorerStoreBanner");
const explorerStoreBannerText = document.querySelector("#explorerStoreBannerText");
const appViews = [...document.querySelectorAll(".app-view")];
const bottomNavButtons = [...document.querySelectorAll("[data-view-target]")];
const ordersList = document.querySelector("#ordersList");
const refreshOrdersButton = document.querySelector("#refreshOrdersButton");
const accountLoggedOutState = document.querySelector("#accountLoggedOutState");
const accountLoggedInState = document.querySelector("#accountLoggedInState");
const accountPageAvatar = document.querySelector("#accountPageAvatar");
const accountPageAvatarImage = document.querySelector("#accountPageAvatarImage");
const accountPageAvatarFallback = document.querySelector("#accountPageAvatarFallback");
const accountTabButton = document.querySelector("#accountTabButton");
const accountTabAvatarImage = document.querySelector("#accountTabAvatarImage");
const accountTabAvatarFallback = document.querySelector("#accountTabAvatarFallback");
const accountOrdersLink = document.querySelector("#accountOrdersLink");
const accountLanguageLink = document.querySelector("#accountLanguageLink");
const accountHelpLink = document.querySelector("#accountHelpLink");
const homeBrowseAction = document.querySelector("#homeBrowseAction");
const homeOrdersAction = document.querySelector("#homeOrdersAction");
const homeShowAll = document.querySelector("#homeShowAll");
const searchInput = document.querySelector("#searchInput");
const resultsMeta = document.querySelector("#resultsMeta");
const sectionHeading = document.querySelector("#sectionHeading");
const cartPanel = document.querySelector("#cartPanel");
const cartItems = document.querySelector("#cartItems");
const cartCount = document.querySelector("#cartCount");
const cartTotal = document.querySelector("#cartTotal");
const cartTitle = document.querySelector("#cartTitle");
const subtotalNode = document.querySelector("#subtotal");
const serviceFeeNode = document.querySelector("#serviceFee");
const serviceLabel = document.querySelector("#serviceLabel");
const promoSummary = document.querySelector("#promoSummary");
const promoLabel = document.querySelector("#promoLabel");
const promoDiscountNode = document.querySelector("#promoDiscount");
const totalNode = document.querySelector("#total");
const floatingCart = document.querySelector("#openCart");
const toast = document.querySelector("#toast");
const supportMenuButton = document.querySelector("#supportMenuButton");
const supportModal = document.querySelector("#supportModal");
const closeSupport = document.querySelector("#closeSupport");
const installBanner = document.querySelector("#installBanner");
const installAppButton = document.querySelector("#installAppButton");
const installDismissButton = document.querySelector("#installDismissButton");
const supportInstallButton = document.querySelector("#supportInstallButton");
const accountInstallButton = document.querySelector("#accountInstallButton");
const accountInstallButtonSignedIn = document.querySelector("#accountInstallButtonSignedIn");
const iosInstallHint = document.querySelector("#iosInstallHint");
const iosInstallHintSignedIn = document.querySelector("#iosInstallHintSignedIn");
const checkoutModal = document.querySelector("#checkoutModal");
const checkoutForm = document.querySelector("#checkoutForm");
const checkoutSuccess = document.querySelector("#checkoutSuccess");
const customerAddress = document.querySelector("#customerAddress");
const addressField = document.querySelector("#addressField");
const locationCapture = document.querySelector("#locationCapture");
const locationStatus = document.querySelector("#locationStatus");
const useLocationButton = document.querySelector("#useLocationButton");
const heroBackdrop = document.querySelector("#heroBackdrop");
const heroDots = document.querySelector("#heroDots");
const hoursStatusCard = document.querySelector("#hoursStatusCard");
const hoursStatus = document.querySelector("#hoursStatus");
const hoursStatusDetail = document.querySelector("#hoursStatusDetail");
const languageScreen = document.querySelector("#languageScreen");
const languageSelect = document.querySelector("#languageSelect");
const splashScreen = document.querySelector("#splashScreen");
const accountStatus = document.querySelector("#accountStatus");
const accountName = document.querySelector("#accountName");
const accountHelp = document.querySelector("#accountHelp");
const googleLogin = document.querySelector("#googleLogin");
const googleLogout = document.querySelector("#googleLogout");
const customerName = document.querySelector("#customerName");
const promoCodeInput = document.querySelector("#promoCode");
const applyPromoButton = document.querySelector("#applyPromo");
const promoStatus = document.querySelector("#promoStatus");
const successOrderNumber = document.querySelector("#successOrderNumber");
const successOrderTotal = document.querySelector("#successOrderTotal");
const successOrderMode = document.querySelector("#successOrderMode");
const successBackHome = document.querySelector("#successBackHome");
const successViewOrders = document.querySelector("#successViewOrders");
const optionsModal = document.querySelector("#optionsModal");
const closeOptions = document.querySelector("#closeOptions");
const optionsTitle = document.querySelector("#optionsTitle");
const optionsSubtitle = document.querySelector("#optionsSubtitle");
const optionsImage = document.querySelector("#optionsImage");
const optionsPrice = document.querySelector("#optionsPrice");
const optionsDescription = document.querySelector("#optionsDescription");
const optionsChoices = document.querySelector("#optionsChoices");
const optionsError = document.querySelector("#optionsError");
const addOptionProduct = document.querySelector("#addOptionProduct");
const optionsHeroFallback = document.querySelector("#optionsHeroFallback");
const notificationModal = document.querySelector("#notificationModal");
const notificationList = document.querySelector("#notificationList");
const closeNotificationsButton = document.querySelector("#closeNotifications");
const orderDetailsModal = document.querySelector("#orderDetailsModal");
const orderDetailsTitle = document.querySelector("#orderDetailsTitle");
const orderDetailsBody = document.querySelector("#orderDetailsBody");
const closeOrderDetails = document.querySelector("#closeOrderDetails");
const orderDetailsClose = document.querySelector("#orderDetailsClose");
const orderDetailsWhatsapp = document.querySelector("#orderDetailsWhatsapp");
const orderDetailsReorder = document.querySelector("#orderDetailsReorder");

let heroImages = [];
let heroIndex = 0;
let heroTimer = null;
let menuData = null;
let currentLanguage = readSavedLanguage();
let productImageObserver = null;
let previousCartCount = 0;
let lastChangedCartKey = "";
let heroParallaxFrame = null;
let remoteOrderHistory = null;
let firebaseAuth = null;
let firebaseSignInWithRedirect = null;
let firebaseSignInWithPopup = null;
let firebaseSignOut = null;
let firebaseProvider = null;
let isAndroidWebView = false;
let latestNotifications = [];
let selectedOrderDetails = null;
let webMessagingInitialized = false;
let nativePushListenersBound = false;
let nativePushPermissionPrompted = false;
let nativeAuthListenerBound = false;
let deferredInstallPrompt = null;
let splashFailsafeTimer = null;

const shopWhatsAppNumber = "212688943959";
const firebaseSdkVersion = "10.9.0";
const defaultShopSettings = {
  shopLatitude: 30.4017949,
  shopLongitude: -9.5510469,
  deliveryPricePerKm: 5,
  minimumDeliveryPrice: 0,
  deliveryZones: [],
  promoCodes: [],
  shopWhatsAppNumber,
  minimumOrderAmount: 0,
  preparationTimeBase: 20,
  isStoreOpen: true,
  closedMessage: "Nous sommes fermes actuellement. Merci de revenir pendant nos horaires d'ouverture."
};

const money = value => `${Number.isInteger(value) ? value : value.toFixed(2)} DHS`;

function toRadians(value) {
  return value * Math.PI / 180;
}

function getDistanceKm(from, to) {
  if (!from || !to?.latitude || !to?.longitude) return 0;
  const earthRadiusKm = 6371;
  const latDelta = toRadians(to.latitude - from.latitude);
  const lonDelta = toRadians(to.longitude - from.longitude);
  const startLat = toRadians(from.latitude);
  const endLat = toRadians(to.latitude);
  const haversine = Math.sin(latDelta / 2) ** 2
    + Math.cos(startLat) * Math.cos(endLat) * Math.sin(lonDelta / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function getSortedDeliveryZones() {
  return [...(state.settings.deliveryZones || [])]
    .map(zone => ({
      radius: Math.max(0, Number(zone.radius) || 0),
      price: Math.max(0, Number(zone.price) || 0)
    }))
    .filter(zone => zone.radius > 0)
    .sort((a, b) => a.radius - b.radius);
}

function getMatchingDeliveryZone(distanceKm) {
  return getSortedDeliveryZones().find(zone => distanceKm <= zone.radius) || null;
}

function findPromoCode(code) {
  const cleanCode = String(code || "").trim().toUpperCase();
  return (state.settings.promoCodes || []).find(promo => promo.code === cleanCode) || null;
}

function calculatePromoDiscount(promo, amount) {
  if (!promo || amount <= 0) return 0;
  const discount = promo.type === "fixed"
    ? Number(promo.value)
    : amount * (Number(promo.value) / 100);
  return Math.min(amount, Math.max(0, discount));
}

const translations = {
  en: {
    brandLabel: "3P CHICKEN POPS",
    orderForDelivery: "Order for delivery",
    heroEyebrow: "Hot chicken menu",
    heroTitle: "Crunchy meals, fast delivery.",
    viewMenu: "View menu",
    rating: "rating",
    open: "Open",
    closed: "Closed",
    today: "today",
    hours: "11AM - 3AM",
    searchPlaceholder: "Search menu, products, categories",
    delivery: "Delivery",
    deliveryZone: "Zone pricing",
    pickup: "Pickup",
    all: "All",
    popularProducts: "Popular products",
    productsAvailable: count => `${count} products available`,
    noProducts: "No products found. Try another category or search term.",
    yourBasket: "Your basket",
    item: "item",
    items: "items",
    emptyBasket: "Your basket is empty.",
    subtotal: "Subtotal",
    total: "Total",
    checkout: "Checkout",
    customerDetails: "Customer details",
    name: "Name",
    namePlaceholder: "Your full name",
    phone: "Phone",
    deliveryAddress: "Delivery address",
    addressPlaceholder: "Street, building, city",
    useExactLocation: "Use exact location",
    updateLocation: "Update location",
    detecting: "Detecting...",
    askingLocation: "Asking for GPS permission...",
    locationNotAdded: "Location not added yet.",
    locationAdded: accuracy => `Location added. Accuracy about ${accuracy}m.`,
    outsideAgadir: "Delivery is not available for your location.",
    shareAgadirLocation: "Share your GPS location to check delivery availability.",
    noDeliveryZones: "Delivery is currently disabled. No delivery zones are configured.",
    locationUnavailable: "Location not available",
    gpsUnavailable: "GPS is not available on this device.",
    locationDenied: "Location permission denied.",
    locationTryAgain: "Location unavailable. Try again outside or enable GPS.",
    locationTimeout: "Location request timed out.",
    couldNotDetect: "Could not detect location.",
    payment: "Payment",
    cashOnDelivery: "Cash on delivery",
    notes: "Notes",
    notesPlaceholder: "Delivery time, substitutions, special request",
    sendWhatsapp: "Send order on WhatsApp",
    viewBasket: "View basket",
    addProductsFirst: "Add products first",
    added: name => `${name} added`,
    openingWhatsapp: "Opening WhatsApp order",
    usingSavedMenu: "Using saved menu"
  },
  fr: {
    brandLabel: "3P CHICKEN POPS",
    orderForDelivery: "Commande en livraison",
    heroEyebrow: "Menu poulet chaud",
    heroTitle: "Repas croustillants, livraison rapide.",
    viewMenu: "Voir le menu",
    rating: "note",
    open: "Ouvert",
    closed: "Ferme",
    today: "aujourd'hui",
    hours: "11h - 3h",
    searchPlaceholder: "Rechercher menu, produits, categories",
    delivery: "Livraison",
    deliveryZone: "Tarifs par zone",
    pickup: "A emporter",
    all: "Tout",
    popularProducts: "Produits populaires",
    productsAvailable: count => `${count} produits disponibles`,
    noProducts: "Aucun produit trouve. Essayez une autre categorie.",
    yourBasket: "Votre panier",
    item: "article",
    items: "articles",
    emptyBasket: "Votre panier est vide.",
    subtotal: "Sous-total",
    total: "Total",
    checkout: "Commander",
    customerDetails: "Infos client",
    name: "Nom",
    namePlaceholder: "Votre nom complet",
    phone: "Telephone",
    deliveryAddress: "Adresse de livraison",
    addressPlaceholder: "Rue, immeuble, ville",
    useExactLocation: "Utiliser ma position",
    updateLocation: "Mettre a jour",
    detecting: "Detection...",
    askingLocation: "Demande d'autorisation GPS...",
    locationNotAdded: "Position non ajoutee.",
    locationAdded: accuracy => `Position ajoutee. Precision environ ${accuracy}m.`,
    outsideAgadir: "La livraison n'est pas disponible pour votre position.",
    shareAgadirLocation: "Partagez votre position GPS pour verifier la livraison.",
    noDeliveryZones: "La livraison est desactivee. Aucune zone n'est configuree.",
    locationUnavailable: "Position indisponible",
    gpsUnavailable: "GPS indisponible sur cet appareil.",
    locationDenied: "Permission de localisation refusee.",
    locationTryAgain: "Position indisponible. Activez le GPS.",
    locationTimeout: "La demande de position a expire.",
    couldNotDetect: "Impossible de detecter la position.",
    payment: "Paiement",
    cashOnDelivery: "Paiement a la livraison",
    notes: "Notes",
    notesPlaceholder: "Heure de livraison, demande speciale",
    sendWhatsapp: "Envoyer sur WhatsApp",
    viewBasket: "Voir panier",
    addProductsFirst: "Ajoutez des produits",
    added: name => `${name} ajoute`,
    openingWhatsapp: "Ouverture de WhatsApp",
    usingSavedMenu: "Menu sauvegarde utilise"
  },
  ar: {
    brandLabel: "3P CHICKEN POPS",
    orderForDelivery: "Ø·Ù„Ø¨ Ù„Ù„ØªÙˆØµÙŠÙ„",
    heroEyebrow: "Ù‚Ø§Ø¦Ù…Ø© Ø§Ù„Ø¯Ø¬Ø§Ø¬ Ø§Ù„Ø³Ø§Ø®Ù†",
    heroTitle: "ÙˆØ¬Ø¨Ø§Øª Ù…Ù‚Ø±Ù…Ø´Ø© ÙˆØªÙˆØµÙŠÙ„ Ø³Ø±ÙŠØ¹.",
    viewMenu: "Ø¹Ø±Ø¶ Ø§Ù„Ù‚Ø§Ø¦Ù…Ø©",
    rating: "ØªÙ‚ÙŠÙŠÙ…",
    open: "Ù…ÙØªÙˆØ­",
    today: "Ø§Ù„ÙŠÙˆÙ…",
    searchPlaceholder: "Ø§Ø¨Ø­Ø« ÙÙŠ Ø§Ù„Ù‚Ø§Ø¦Ù…Ø© ÙˆØ§Ù„Ù…Ù†ØªØ¬Ø§Øª",
    delivery: "ØªÙˆØµÙŠÙ„",
    pickup: "Ø§Ø³ØªÙ„Ø§Ù…",
    all: "Ø§Ù„ÙƒÙ„",
    popularProducts: "Ø§Ù„Ù…Ù†ØªØ¬Ø§Øª Ø§Ù„Ø´Ø§Ø¦Ø¹Ø©",
    productsAvailable: count => `${count} Ù…Ù†ØªØ¬ Ù…ØªÙˆÙØ±`,
    noProducts: "Ù„Ø§ ØªÙˆØ¬Ø¯ Ù…Ù†ØªØ¬Ø§Øª. Ø¬Ø±Ø¨ Ù‚Ø³Ù…Ø§ Ø§Ø®Ø±.",
    yourBasket: "Ø³Ù„ØªÙƒ",
    item: "Ù…Ù†ØªØ¬",
    items: "Ù…Ù†ØªØ¬Ø§Øª",
    emptyBasket: "Ø³Ù„ØªÙƒ ÙØ§Ø±ØºØ©.",
    subtotal: "Ø§Ù„Ù…Ø¬Ù…ÙˆØ¹ Ø§Ù„ÙØ±Ø¹ÙŠ",
    total: "Ø§Ù„Ù…Ø¬Ù…ÙˆØ¹",
    checkout: "Ø¥ØªÙ…Ø§Ù… Ø§Ù„Ø·Ù„Ø¨",
    customerDetails: "Ù…Ø¹Ù„ÙˆÙ…Ø§Øª Ø§Ù„Ø²Ø¨ÙˆÙ†",
    name: "Ø§Ù„Ø§Ø³Ù…",
    namePlaceholder: "Ø§Ù„Ø§Ø³Ù… Ø§Ù„ÙƒØ§Ù…Ù„",
    phone: "Ø§Ù„Ù‡Ø§ØªÙ",
    deliveryAddress: "Ø¹Ù†ÙˆØ§Ù† Ø§Ù„ØªÙˆØµÙŠÙ„",
    addressPlaceholder: "Ø§Ù„Ø´Ø§Ø±Ø¹ØŒ Ø§Ù„Ù…Ø¨Ù†Ù‰ØŒ Ø§Ù„Ù…Ø¯ÙŠÙ†Ø©",
    useExactLocation: "Ø§Ø³ØªØ®Ø¯Ù… Ù…ÙˆÙ‚Ø¹ÙŠ",
    updateLocation: "ØªØ­Ø¯ÙŠØ« Ø§Ù„Ù…ÙˆÙ‚Ø¹",
    detecting: "Ø¬Ø§Ø±ÙŠ Ø§Ù„ØªØ­Ø¯ÙŠØ¯...",
    askingLocation: "Ø·Ù„Ø¨ Ø¥Ø°Ù† GPS...",
    locationNotAdded: "Ù„Ù… ØªØªÙ… Ø¥Ø¶Ø§ÙØ© Ø§Ù„Ù…ÙˆÙ‚Ø¹.",
    locationAdded: accuracy => `ØªÙ…Øª Ø¥Ø¶Ø§ÙØ© Ø§Ù„Ù…ÙˆÙ‚Ø¹. Ø§Ù„Ø¯Ù‚Ø© Ø­ÙˆØ§Ù„ÙŠ ${accuracy}Ù….`,
    locationUnavailable: "Ø§Ù„Ù…ÙˆÙ‚Ø¹ ØºÙŠØ± Ù…ØªØ§Ø­",
    gpsUnavailable: "GPS ØºÙŠØ± Ù…ØªØ§Ø­ Ø¹Ù„Ù‰ Ù‡Ø°Ø§ Ø§Ù„Ø¬Ù‡Ø§Ø².",
    locationDenied: "ØªÙ… Ø±ÙØ¶ Ø¥Ø°Ù† Ø§Ù„Ù…ÙˆÙ‚Ø¹.",
    locationTryAgain: "Ø§Ù„Ù…ÙˆÙ‚Ø¹ ØºÙŠØ± Ù…ØªØ§Ø­. ÙØ¹Ù„ GPS.",
    locationTimeout: "Ø§Ù†ØªÙ‡Øª Ù…Ù‡Ù„Ø© Ø·Ù„Ø¨ Ø§Ù„Ù…ÙˆÙ‚Ø¹.",
    couldNotDetect: "ØªØ¹Ø°Ø± ØªØ­Ø¯ÙŠØ¯ Ø§Ù„Ù…ÙˆÙ‚Ø¹.",
    payment: "Ø§Ù„Ø¯ÙØ¹",
    cashOnDelivery: "Ø§Ù„Ø¯ÙØ¹ Ø¹Ù†Ø¯ Ø§Ù„Ø§Ø³ØªÙ„Ø§Ù…",
    notes: "Ù…Ù„Ø§Ø­Ø¸Ø§Øª",
    notesPlaceholder: "ÙˆÙ‚Øª Ø§Ù„ØªÙˆØµÙŠÙ„ Ø£Ùˆ Ø·Ù„Ø¨ Ø®Ø§Øµ",
    sendWhatsapp: "Ø¥Ø±Ø³Ø§Ù„ Ø¹Ø¨Ø± ÙˆØ§ØªØ³Ø§Ø¨",
    viewBasket: "Ø¹Ø±Ø¶ Ø§Ù„Ø³Ù„Ø©",
    addProductsFirst: "Ø£Ø¶Ù Ù…Ù†ØªØ¬Ø§Øª Ø£ÙˆÙ„Ø§",
    added: name => `ØªÙ…Øª Ø¥Ø¶Ø§ÙØ© ${name}`,
    openingWhatsapp: "ÙØªØ­ ÙˆØ§ØªØ³Ø§Ø¨",
    usingSavedMenu: "Ø§Ø³ØªØ®Ø¯Ø§Ù… Ø§Ù„Ù‚Ø§Ø¦Ù…Ø© Ø§Ù„Ù…Ø­ÙÙˆØ¸Ø©"
  }
};

Object.assign(translations.ar, {
  orderForDelivery: "\u0637\u0644\u0628 \u0644\u0644\u062a\u0648\u0635\u064a\u0644",
  rating: "\u062a\u0642\u064a\u064a\u0645",
  open: "\u0645\u0641\u062a\u0648\u062d",
  closed: "\u0645\u063a\u0644\u0642",
  today: "\u0627\u0644\u064a\u0648\u0645",
  hours: "11:00 - 03:00",
  searchPlaceholder: "\u0627\u0628\u062d\u062b \u0641\u064a \u0627\u0644\u0642\u0627\u0626\u0645\u0629",
  delivery: "\u062a\u0648\u0635\u064a\u0644",
  deliveryZone: "\u0623\u0643\u0627\u062f\u064a\u0631 \u0641\u0642\u0637",
  pickup: "\u0627\u0633\u062a\u0644\u0627\u0645",
  all: "\u0627\u0644\u0643\u0644",
  popularProducts: "\u0627\u0644\u0645\u0646\u062a\u062c\u0627\u062a \u0627\u0644\u0634\u0627\u0626\u0639\u0629",
  productsAvailable: count => `${count} \u0645\u0646\u062a\u062c \u0645\u062a\u0648\u0641\u0631`,
  noProducts: "\u0644\u0627 \u062a\u0648\u062c\u062f \u0645\u0646\u062a\u062c\u0627\u062a.",
  yourBasket: "\u0633\u0644\u062a\u0643",
  item: "\u0645\u0646\u062a\u062c",
  items: "\u0645\u0646\u062a\u062c\u0627\u062a",
  emptyBasket: "\u0633\u0644\u062a\u0643 \u0641\u0627\u0631\u063a\u0629.",
  subtotal: "\u0627\u0644\u0645\u062c\u0645\u0648\u0639 \u0627\u0644\u0641\u0631\u0639\u064a",
  total: "\u0627\u0644\u0645\u062c\u0645\u0648\u0639",
  checkout: "\u0625\u062a\u0645\u0627\u0645 \u0627\u0644\u0637\u0644\u0628",
  customerDetails: "\u0645\u0639\u0644\u0648\u0645\u0627\u062a \u0627\u0644\u0632\u0628\u0648\u0646",
  name: "\u0627\u0644\u0627\u0633\u0645",
  namePlaceholder: "\u0627\u0644\u0627\u0633\u0645 \u0627\u0644\u0643\u0627\u0645\u0644",
  phone: "\u0627\u0644\u0647\u0627\u062a\u0641",
  deliveryAddress: "\u0639\u0646\u0648\u0627\u0646 \u0627\u0644\u062a\u0648\u0635\u064a\u0644",
  addressPlaceholder: "\u0627\u0644\u0634\u0627\u0631\u0639\u060c \u0627\u0644\u0645\u0628\u0646\u0649\u060c \u0627\u0644\u0645\u062f\u064a\u0646\u0629",
  useExactLocation: "\u0627\u0633\u062a\u062e\u062f\u0645 \u0645\u0648\u0642\u0639\u064a",
  updateLocation: "\u062a\u062d\u062f\u064a\u062b \u0627\u0644\u0645\u0648\u0642\u0639",
  detecting: "\u062c\u0627\u0631\u064a \u0627\u0644\u062a\u062d\u062f\u064a\u062f...",
  askingLocation: "\u0637\u0644\u0628 \u0625\u0630\u0646 GPS...",
  locationNotAdded: "\u0644\u0645 \u062a\u062a\u0645 \u0625\u0636\u0627\u0641\u0629 \u0627\u0644\u0645\u0648\u0642\u0639.",
  locationAdded: accuracy => `\u062a\u0645\u062a \u0625\u0636\u0627\u0641\u0629 \u0627\u0644\u0645\u0648\u0642\u0639. \u0627\u0644\u062f\u0642\u0629 \u062d\u0648\u0627\u0644\u064a ${accuracy}\u0645.`,
  outsideAgadir: "\u0627\u0644\u062a\u0648\u0635\u064a\u0644 \u063a\u064a\u0631 \u0645\u062a\u0627\u062d \u0644\u0645\u0648\u0642\u0639\u0643.",
  shareAgadirLocation: "\u0634\u0627\u0631\u0643 \u0645\u0648\u0642\u0639 GPS \u0644\u0644\u062a\u062d\u0642\u0642 \u0645\u0646 \u0625\u0645\u0643\u0627\u0646\u064a\u0629 \u0627\u0644\u062a\u0648\u0635\u064a\u0644.",
  noDeliveryZones: "\u0627\u0644\u062a\u0648\u0635\u064a\u0644 \u0645\u0639\u0637\u0644 \u062d\u0627\u0644\u064a\u0627. \u0644\u0627 \u062a\u0648\u062c\u062f \u0645\u0646\u0627\u0637\u0642 \u062a\u0648\u0635\u064a\u0644.",
  locationUnavailable: "\u0627\u0644\u0645\u0648\u0642\u0639 \u063a\u064a\u0631 \u0645\u062a\u0627\u062d",
  gpsUnavailable: "GPS \u063a\u064a\u0631 \u0645\u062a\u0627\u062d \u0639\u0644\u0649 \u0647\u0630\u0627 \u0627\u0644\u062c\u0647\u0627\u0632.",
  locationDenied: "\u062a\u0645 \u0631\u0641\u0636 \u0625\u0630\u0646 \u0627\u0644\u0645\u0648\u0642\u0639.",
  locationTryAgain: "\u0627\u0644\u0645\u0648\u0642\u0639 \u063a\u064a\u0631 \u0645\u062a\u0627\u062d. \u0641\u0639\u0644 GPS.",
  locationTimeout: "\u0627\u0646\u062a\u0647\u062a \u0645\u0647\u0644\u0629 \u0637\u0644\u0628 \u0627\u0644\u0645\u0648\u0642\u0639.",
  couldNotDetect: "\u062a\u0639\u0630\u0631 \u062a\u062d\u062f\u064a\u062f \u0627\u0644\u0645\u0648\u0642\u0639.",
  payment: "\u0627\u0644\u062f\u0641\u0639",
  cashOnDelivery: "\u0627\u0644\u062f\u0641\u0639 \u0639\u0646\u062f \u0627\u0644\u0627\u0633\u062a\u0644\u0627\u0645",
  notes: "\u0645\u0644\u0627\u062d\u0638\u0627\u062a",
  notesPlaceholder: "\u0648\u0642\u062a \u0627\u0644\u062a\u0648\u0635\u064a\u0644 \u0623\u0648 \u0637\u0644\u0628 \u062e\u0627\u0635",
  sendWhatsapp: "\u0625\u0631\u0633\u0627\u0644 \u0639\u0628\u0631 \u0648\u0627\u062a\u0633\u0627\u0628",
  viewBasket: "\u0639\u0631\u0636 \u0627\u0644\u0633\u0644\u0629",
  addProductsFirst: "\u0623\u0636\u0641 \u0645\u0646\u062a\u062c\u0627\u062a \u0623\u0648\u0644\u0627",
  added: name => `\u062a\u0645\u062a \u0625\u0636\u0627\u0641\u0629 ${name}`,
  openingWhatsapp: "\u0641\u062a\u062d \u0648\u0627\u062a\u0633\u0627\u0628",
  usingSavedMenu: "\u0627\u0633\u062a\u062e\u062f\u0627\u0645 \u0627\u0644\u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u0645\u062d\u0641\u0648\u0638\u0629"
});


async function preloadImagesAndHideSplash() {
  const essentialImages = [
    "loading-logo-fire.png",
    "logo-3p.png",
    heroImages[heroIndex],
    ...products.slice(0, 4).map(product => getProductImageSources(product, "card").finalSrc)
  ].filter(Boolean).slice(0, 6);

  const preloadEssentialImages = Promise.all(
    essentialImages.map(url => new Promise(resolve => {
      const img = new Image();
      img.decoding = "async";
      img.onload = resolve;
      img.onerror = resolve;
      img.src = url.startsWith("data:") || url.startsWith("http") || url.endsWith(".png") || url.endsWith(".svg")
        ? url
        : imageSource(url);
    }))
  );

  await Promise.race([
    Promise.all([
      new Promise(resolve => setTimeout(resolve, 650)),
      preloadEssentialImages
    ]),
    new Promise(resolve => setTimeout(resolve, 1500))
  ]);

  hideSplashScreen();
}

function t(key, ...args) {
  const dictionary = translations[currentLanguage || "en"] || translations.en;
  const value = dictionary[key] ?? translations.en[key] ?? key;
  return typeof value === "function" ? value(...args) : value;
}

function readSavedLanguage() {
  try {
    return localStorage.getItem("language") || "";
  } catch {
    return "";
  }
}

function saveLanguage(language) {
  try {
    localStorage.setItem("language", language);
  } catch {
    // Some Android WebViews can block storage; language must never block ordering.
  }
}

function isShopOpen(date = new Date()) {
  const hour = date.getHours();
  return hour >= 11 || hour < 3;
}

function updateStoreHoursStatus() {
  const openNow = isShopOpen();
  if (hoursStatus) hoursStatus.textContent = openNow ? t("open") : t("closed");
  if (hoursStatusDetail) hoursStatusDetail.textContent = t("hours");
  hoursStatusCard?.classList.toggle("closed", !openNow);
}

function detectDeviceLanguage() {
  const languages = navigator.languages?.length ? navigator.languages : [navigator.language || ""];
  const match = languages
    .map(language => String(language).toLowerCase().split("-")[0])
    .find(language => translations[language]);
  return match || "en";
}

function applyLanguage(language) {
  currentLanguage = translations[language] ? language : "en";
  saveLanguage(currentLanguage);
  document.documentElement.lang = currentLanguage;
  document.documentElement.dir = currentLanguage === "ar" ? "rtl" : "ltr";
  if (languageSelect) languageSelect.value = currentLanguage;
  document.querySelectorAll("[data-i18n]").forEach(node => {
    node.textContent = t(node.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach(node => {
    node.placeholder = t(node.dataset.i18nPlaceholder);
  });
  updateStoreHoursStatus();
  languageScreen?.classList.add("hidden");
}

function hideSplashScreen() {
  if (splashFailsafeTimer) {
    clearTimeout(splashFailsafeTimer);
    splashFailsafeTimer = null;
  }
  if (!splashScreen || splashScreen.classList.contains("hide")) return;
  splashScreen?.classList.add("hide");
  setTimeout(() => splashScreen?.remove(), 900);
}

function armSplashFailsafe(delay = 4500) {
  if (splashFailsafeTimer) clearTimeout(splashFailsafeTimer);
  splashFailsafeTimer = setTimeout(() => {
    console.warn("Splash failsafe triggered");
    hideSplashScreen();
  }, delay);
}

function initLanguageChoice() {
  const lang = readSavedLanguage() || detectDeviceLanguage();
  applyLanguage(lang);
  languageScreen?.classList.add("hidden");
}

function hasFirebaseConfig() {
  const config = window.firebaseConfig || {};
  return ["apiKey", "authDomain", "projectId", "appId"].every(key => String(config[key] || "").trim());
}

function isNativePlatform() {
  return Boolean(window.Capacitor?.isNativePlatform?.());
}

function isNativeAndroidApp() {
  return isNativePlatform() && String(window.Capacitor?.getPlatform?.() || "").toLowerCase() === "android";
}

function getCapacitorPlugin(name) {
  return window.Capacitor?.Plugins?.[name] || null;
}

function isStandaloneDisplay() {
  return window.matchMedia?.("(display-mode: standalone)")?.matches
    || window.navigator.standalone === true;
}

function isInstallBannerDismissed() {
  try {
    return localStorage.getItem("installBannerDismissed") === "1";
  } catch {
    return false;
  }
}

function setInstallBannerDismissed(value) {
  try {
    if (value) localStorage.setItem("installBannerDismissed", "1");
    else localStorage.removeItem("installBannerDismissed");
  } catch {}
}

function updateInstallUi() {
  const canInstall = Boolean(deferredInstallPrompt) && !isStandaloneDisplay() && !isInstallBannerDismissed();
  installBanner?.classList.toggle("hidden", !canInstall);
  supportInstallButton?.classList.toggle("hidden", !Boolean(deferredInstallPrompt) || isStandaloneDisplay());
  accountInstallButton?.classList.toggle("hidden", !Boolean(deferredInstallPrompt) || isStandaloneDisplay());
  accountInstallButtonSignedIn?.classList.toggle("hidden", !Boolean(deferredInstallPrompt) || isStandaloneDisplay());
  const showIosHint = Boolean(!deferredInstallPrompt && !isStandaloneDisplay() && /iphone|ipad|ipod/i.test(navigator.userAgent || ""));
  iosInstallHint?.classList.toggle("hidden", !showIosHint);
  iosInstallHintSignedIn?.classList.toggle("hidden", !showIosHint);
}

async function triggerInstallPrompt() {
  if (!deferredInstallPrompt) {
    showToast("Ajoutez cette application depuis le menu du navigateur si l'installation n'apparait pas.");
    return;
  }
  const promptEvent = deferredInstallPrompt;
  deferredInstallPrompt = null;
  updateInstallUi();
  promptEvent.prompt();
  try {
    await promptEvent.userChoice;
  } catch {}
}

function detectAndroidWebView() {
  const userAgent = navigator.userAgent || "";
  return /Android/i.test(userAgent) && (/; wv\)/i.test(userAgent) || Boolean(window.AndroidBridge) || isNativePlatform());
}

function openExternalUrl(url) {
  if (!url) return;
  if (window.AndroidBridge?.openExternalBrowser) {
    window.AndroidBridge.openExternalBrowser(url);
    return;
  }
  if (window.Capacitor?.isNativePlatform?.()) {
    window.open(url, "_blank", "noopener,noreferrer");
    return;
  }
  window.open(url, "_blank", "noopener,noreferrer");
}

function openSupportModal() {
  supportModal?.classList.add("open");
  supportModal?.setAttribute("aria-hidden", "false");
}

function closeSupportModal() {
  supportModal?.classList.remove("open");
  supportModal?.setAttribute("aria-hidden", "true");
}

function resetCheckoutSuccess() {
  checkoutForm?.classList.remove("hidden");
  checkoutSuccess?.classList.add("hidden");
}

function showCheckoutSuccess(order) {
  if (!checkoutSuccess || !checkoutForm) return;
  successOrderNumber.textContent = `#${order.id}`;
  successOrderTotal.textContent = order.total;
  successOrderMode.textContent = order.mode === "delivery" ? "Livraison" : "Pickup";
  checkoutForm.classList.add("hidden");
  checkoutSuccess.classList.remove("hidden");
}

function getClosedStoreMessage() {
  return state.settings?.closedMessage || "Desole, nous sommes fermes actuellement. Vous pouvez consulter le menu et revenir plus tard.";
}

function isStoreClosed() {
  return state.settings?.isStoreOpen === false;
}

function updateStoreStatusUi() {
  const closed = isStoreClosed();
  if (homeStoreBanner) homeStoreBanner.classList.toggle("hidden", !closed);
  if (explorerStoreBanner) explorerStoreBanner.classList.toggle("hidden", !closed);
  if (homeStoreBannerText) homeStoreBannerText.textContent = getClosedStoreMessage();
  if (explorerStoreBannerText) explorerStoreBannerText.textContent = getClosedStoreMessage();
  const checkoutButton = document.querySelector("#checkoutButton");
  const cartDetails = getCartDetails();
  if (checkoutButton) checkoutButton.disabled = closed || cartDetails.total === 0 || !cartDetails.minimumOrderMet;
}

function ensureStoreOpen(showMessage = true) {
  if (!isStoreClosed()) return true;
  if (showMessage) {
    showToast("Desole, nous sommes fermes actuellement. Vous pouvez consulter le menu et revenir plus tard.");
  }
  return false;
}

function switchView(view) {
  state.currentView = view;
  appViews.forEach(node => node.classList.toggle("active", node.dataset.view === view));
  bottomNavButtons.forEach(button => button.classList.toggle("active", button.dataset.viewTarget === view));
  accountTabButton?.classList.toggle("hidden", view === "account");
  if (view === "orders") refreshOrderHistory();
  if (view === "account") closeSupportModal();
}

function updateAccountUi() {
  const customer = state.customer;
  const initials = (customer?.displayName || customer?.email || "Customer").trim().slice(0, 1).toUpperCase();

  accountStatus.textContent = customer ? "Connecte avec Google" : "Connectez-vous pour suivre vos commandes";
  accountName.textContent = customer?.displayName || "Customer account";
  accountHelp.textContent = customer?.email || "Google login is for customers only.";
  googleLogin.classList.toggle("hidden", Boolean(customer));
  googleLogout.classList.toggle("hidden", !customer);
  accountLoggedOutState?.classList.toggle("hidden", Boolean(customer));
  accountLoggedInState?.classList.toggle("hidden", !customer);
  accountPageAvatar?.classList.toggle("no-photo", !customer?.photoURL);
  accountTabButton?.classList.toggle("signed-in", Boolean(customer));
  accountTabButton?.classList.toggle("no-photo", !customer?.photoURL);
  if (accountPageAvatarImage) {
    accountPageAvatarImage.classList.remove("is-loaded");
    accountPageAvatarImage.src = customer?.photoURL || "";
  }
  if (accountTabAvatarImage) {
    accountTabAvatarImage.classList.remove("is-loaded");
    accountTabAvatarImage.src = customer?.photoURL || "";
  }
  if (accountPageAvatarFallback) accountPageAvatarFallback.textContent = initials;
  if (accountTabAvatarFallback) accountTabAvatarFallback.textContent = initials;
  if (customer?.displayName && !customerName.value) {
    customerName.value = customer.displayName;
  }
  refreshOrderHistory();
}

function normalizeCustomerProfile(user) {
  if (!user) return null;
  return {
    uid: user.uid || user.userId || user.id || "",
    displayName: user.displayName || user.name || user.display_name || "",
    email: user.email || "",
    photoURL: user.photoURL || user.photoUrl || user.photoURLString || user.picture || ""
  };
}

function getAuthErrorMessage(error, fallback = "Google login failed") {
  const code = String(error?.code || error?.errorCode || "").trim();
  const message = String(error?.message || error?.localizedMessage || "").trim();
  if (code && message) return `${code}: ${message}`;
  if (message) return message;
  if (code) return code;
  return fallback;
}

function setCustomerFromFirebase(user) {
  const previousUid = state.customer?.uid || "";
  state.customer = normalizeCustomerProfile(user);
  try {
    if (state.customer) localStorage.setItem("customerProfile", JSON.stringify(state.customer));
    else localStorage.removeItem("customerProfile");
  } catch {}
  updateAccountUi();
  if (state.customer?.uid && state.customer.uid !== previousUid) {
    requestPushPermission("login").catch(error => console.warn("Push permission request after login failed", error));
  }
}

function getCustomerId() {
  let id = localStorage.getItem("customerId");
  if (!id) {
    id = Math.random().toString(36).substring(2, 8).toUpperCase();
    localStorage.setItem("customerId", id);
  }
  return id;
}

function getSavedCustomerPhone() {
  return localStorage.getItem("lastCheckoutPhone") || "";
}

function setSavedCustomerPhone(phone) {
  const clean = String(phone || "").trim();
  if (clean) localStorage.setItem("lastCheckoutPhone", clean);
}

function localizeOrderStatus(status) {
  const map = {
    new: "Nouvelle",
    accepted: "Acceptee",
    preparing: "En preparation",
    out_for_delivery: "En livraison",
    delivered: "Livree",
    cancelled: "Annulee"
  };
  return map[status] || status || "Envoyee";
}

function getOrderHistoryKey() {
  return `orderHistory:${state.customer?.uid || getCustomerId()}`;
}

function getOrderHistory() {
  try {
    return JSON.parse(localStorage.getItem(getOrderHistoryKey()) || "[]");
  } catch {
    return [];
  }
}

function saveOrderToHistory(order) {
  const orders = getOrderHistory();
  orders.unshift(order);
  try {
    localStorage.setItem(getOrderHistoryKey(), JSON.stringify(orders.slice(0, 20)));
  } catch {}
}

function getDisplayedOrderHistory() {
  return Array.isArray(remoteOrderHistory) ? remoteOrderHistory : getOrderHistory();
}

function makeTimeline(statusValue, explicitProgress = null) {
  const steps = [
    { key: "new", label: "Nouvelle" },
    { key: "accepted", label: "Acceptee" },
    { key: "preparing", label: "En preparation" },
    { key: "out_for_delivery", label: "En livraison" },
    { key: "delivered", label: "Livree" }
  ];
  const normalized = String(statusValue || "").toLowerCase();
  const currentIndex = normalized.includes("cancel") ? -1 : Math.max(0, steps.findIndex(step => step.key === normalized));
  const progressPercent = explicitProgress === null || explicitProgress === undefined
    ? (currentIndex < 0 ? 0 : Math.min(100, (currentIndex / (steps.length - 1)) * 100))
    : explicitProgress;
  return { steps, currentIndex, progressPercent };
}

function refillCartFromOrder(order) {
  if (!order?.items?.length) return;
  order.items.forEach(item => {
    const product = products.find(candidate => candidate.id === item.productId) || products.find(candidate => candidate.name === item.productName);
    if (!product) return;
    const optionNames = Array.isArray(item.options) ? item.options.map(option => option.name || option).filter(Boolean) : [];
    const optionPrice = Array.isArray(item.options)
      ? item.options.reduce((sum, option) => sum + Number(option.price || 0), 0)
      : 0;
    const option = optionNames.length ? { name: optionNames.join(", "), price: optionPrice } : null;
    for (let index = 0; index < Number(item.quantity || 0); index += 1) {
      addProductToCart(product, option, null);
    }
  });
  switchView("explorer");
  showToast("Panier rempli a nouveau");
}

async function refreshOrderHistory() {
  const params = new URLSearchParams();
  if (state.customer?.uid) params.set("firebaseUid", state.customer.uid);
  if (state.customer?.email) params.set("email", state.customer.email);
  const savedPhone = getSavedCustomerPhone();
  if (savedPhone) params.set("phone", savedPhone);
  if (![...params.keys()].length) {
    remoteOrderHistory = null;
    renderOrderHistory();
    return;
  }

  try {
    const response = await fetch(`/api/orders/customer?${params.toString()}`, { cache: "no-store" });
    if (!response.ok) throw new Error("Could not load customer orders");
    const payload = await response.json();
    remoteOrderHistory = (payload.orders || []).map(order => ({
      id: order.id,
      createdAt: order.createdAt,
      dateLabel: new Date(order.createdAt).toLocaleString(),
      total: money(Number(order.total || 0)),
      totalValue: Number(order.total || 0),
      itemCount: Array.isArray(order.items) ? order.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0) : 0,
      mode: order.mode,
      status: localizeOrderStatus(order.status),
      rawStatus: order.status,
      customerName: order.customerName || "",
      customerPhone: order.customerPhone || "",
      customerEmail: order.customerEmail || "",
      address: order.address || "",
      deliveryFee: Number(order.deliveryFee || 0),
      discount: Number(order.discount || 0),
      subtotal: Number(order.subtotal || 0),
      estimatedTime: order.estimatedTime || "",
      countdownMinutesRemaining: order.countdownMinutesRemaining,
      trackingProgress: order.trackingProgress,
      whatsappMessage: order.whatsappMessage || "",
      items: order.items || []
    }));
  } catch {
    remoteOrderHistory = null;
  }
  renderOrderHistory();
}

function renderOrderHistoryLegacy() {
  if (!ordersList) return;
  const orders = getDisplayedOrderHistory();
  ordersList.innerHTML = orders.length ? orders.map(order => `
    <article class="order-history-card">
      <div class="order-history-top">
        <div>
          <p>${order.dateLabel}</p>
          <h3>${order.mode === "delivery" ? "Livraison" : "Pickup"} Â· ${order.total}</h3>
        </div>
        <span class="order-status-pill">${order.status}</span>
      </div>
      <div class="order-history-meta">
        <small>${order.itemCount} items</small>
        <small>#${order.id}</small>
      </div>
    </article>
  `).join("") : `<div class="empty-state">Aucune commande pour le moment</div>`;
}

function renderOrderHistory() {
  if (!ordersList) return;
  const orders = getDisplayedOrderHistory();
  ordersList.innerHTML = orders.length ? orders.map(order => {
    const timeline = makeTimeline(order.rawStatus || order.status, order.trackingProgress);
    return `
      <article class="order-history-card" data-order-card="${order.id}" tabindex="0" role="button" aria-label="Voir les details de la commande ${order.id}">
        <div class="order-history-top">
          <div>
            <p>${order.dateLabel}</p>
            <h3>${order.mode === "delivery" ? "Livraison" : "Pickup"} Â· ${order.total}</h3>
            ${order.estimatedTime ? `<small class="order-estimate">${order.estimatedTime}</small>` : ""}
          </div>
          <span class="order-status-pill">${order.status}</span>
        </div>
        <div class="order-timeline">
          <div class="order-timeline-bar"><span style="width:${timeline.progressPercent}%"></span></div>
          <div class="order-timeline-steps">
            ${timeline.steps.map((step, index) => `<span class="timeline-step ${timeline.currentIndex >= index ? "active" : ""} ${timeline.currentIndex === index ? "current" : ""}">${step.label}</span>`).join("")}
          </div>
        </div>
        <div class="order-history-meta">
          <small>${order.itemCount} items</small>
          <small>#${order.id}</small>
        </div>
        <div class="order-history-actions">
          <button class="admin-secondary order-details-button" type="button" data-open-order="${order.id}">Voir details</button>
          <button class="reorder-button" type="button" data-reorder="${order.id}">Commander a nouveau</button>
        </div>
      </article>
    `;
  }).join("") : `<div class="empty-state">Aucune commande pour le moment. Votre prochaine commande enregistree apparaitra ici.</div>`;
}

function formatOrderOptions(options = []) {
  if (!Array.isArray(options) || !options.length) return "Aucune option";
  return options.map(option => {
    if (typeof option === "string") return option;
    return option.price > 0 ? `${option.name} (+${money(option.price)})` : option.name;
  }).join(", ");
}

function closeOrderDetailsModal() {
  selectedOrderDetails = null;
  orderDetailsModal?.classList.remove("open");
  orderDetailsModal?.setAttribute("aria-hidden", "true");
}

function renderOrderDetails(order) {
  if (!orderDetailsBody || !orderDetailsTitle) return;
  const timeline = makeTimeline(order.rawStatus || order.status, order.trackingProgress);
  orderDetailsTitle.textContent = `Commande #${order.id}`;
  orderDetailsBody.innerHTML = `
    <div class="order-details-grid">
      <div class="order-detail-stat">
        <span>Date</span>
        <strong>${order.dateLabel || (order.createdAt ? new Date(order.createdAt).toLocaleString() : "-")}</strong>
      </div>
      <div class="order-detail-stat">
        <span>Mode</span>
        <strong>${order.mode === "delivery" ? "Livraison" : "Pickup"}</strong>
      </div>
      <div class="order-detail-stat">
        <span>Total</span>
        <strong>${order.total || money(order.totalValue || 0)}</strong>
      </div>
      <div class="order-detail-stat">
        <span>Estimation</span>
        <strong>${order.estimatedTime || "A confirmer"}</strong>
      </div>
    </div>
    <div class="order-timeline order-details-timeline">
      <div class="order-timeline-bar"><span style="width:${timeline.progressPercent}%"></span></div>
      <div class="order-timeline-steps">
        ${timeline.steps.map((step, index) => `<span class="timeline-step ${timeline.currentIndex >= index ? "active" : ""} ${timeline.currentIndex === index ? "current" : ""}">${step.label}</span>`).join("")}
      </div>
    </div>
    <div class="order-details-section">
      <h3>Client</h3>
      <p>${order.customerName || "Client"}</p>
      <small>${order.customerPhone || "Telephone non disponible"}${order.customerEmail ? ` · ${order.customerEmail}` : ""}</small>
    </div>
    <div class="order-details-section">
      <h3>Adresse</h3>
      <p>${order.address || (order.mode === "pickup" ? "Pickup from shop" : "Adresse non disponible")}</p>
      <small>Frais de livraison: ${money(order.deliveryFee || 0)}${order.discount ? ` · Reduction: ${money(order.discount)}` : ""}</small>
    </div>
    <div class="order-details-section">
      <h3>Articles</h3>
      <div class="order-details-items">
        ${(order.items || []).map(item => `
          <article class="order-details-item">
            <div>
              <strong>${item.productName}</strong>
              <small>${formatOrderOptions(item.options)}</small>
            </div>
            <div class="order-details-item-meta">
              <span>x${item.quantity}</span>
              <strong>${money(item.lineTotal || (item.unitPrice * item.quantity))}</strong>
            </div>
          </article>
        `).join("") || `<div class="empty-state">Aucun article</div>`}
      </div>
    </div>
    <div class="order-details-section">
      <h3>Message WhatsApp</h3>
      <p class="order-details-message">${order.whatsappMessage || "Message non disponible"}</p>
    </div>
  `;
}

async function openOrderDetails(orderId) {
  const params = new URLSearchParams();
  if (state.customer?.uid) params.set("firebaseUid", state.customer.uid);
  if (state.customer?.email) params.set("email", state.customer.email);
  const savedPhone = getSavedCustomerPhone();
  if (savedPhone) params.set("phone", savedPhone);
  const fallbackOrder = getDisplayedOrderHistory().find(order => String(order.id) === String(orderId));
  try {
    const response = await fetch(`/api/orders/customer/${orderId}?${params.toString()}`, { cache: "no-store" });
    if (!response.ok) throw new Error("Could not load order details");
    const order = await response.json();
    selectedOrderDetails = {
      id: order.id,
      createdAt: order.createdAt,
      dateLabel: new Date(order.createdAt).toLocaleString(),
      total: money(Number(order.total || 0)),
      totalValue: Number(order.total || 0),
      mode: order.mode,
      status: localizeOrderStatus(order.status),
      rawStatus: order.status,
      customerName: order.customerName || "",
      customerPhone: order.customerPhone || "",
      customerEmail: order.customerEmail || "",
      address: order.address || "",
      deliveryFee: Number(order.deliveryFee || 0),
      discount: Number(order.discount || 0),
      subtotal: Number(order.subtotal || 0),
      estimatedTime: order.estimatedTime || "",
      countdownMinutesRemaining: order.countdownMinutesRemaining,
      trackingProgress: order.trackingProgress,
      whatsappMessage: order.whatsappMessage || "",
      items: order.items || []
    };
  } catch {
    selectedOrderDetails = fallbackOrder || null;
  }
  if (!selectedOrderDetails) {
    showToast("Details de commande indisponibles");
    return;
  }
  renderOrderDetails(selectedOrderDetails);
  orderDetailsModal?.classList.add("open");
  orderDetailsModal?.setAttribute("aria-hidden", "false");
}

let pushMessaging = null;

async function syncDeviceToken(token) {
  if (!token) return;
  const payload = {
    firebaseUid: state.customer?.uid || "",
    phone: getSavedCustomerPhone(),
    platform: isNativeAndroidApp() ? "android" : "web",
    token
  };
  console.info("[push] device token", token);
  try {
    await fetch("/api/device-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
  } catch (error) {
    console.warn("Failed to sync native device token", error);
  }
  try {
    await fetch("/api/tokens", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerId: getCustomerId(), token })
    });
  } catch (error) {
    console.warn("Failed to sync legacy push token", error);
  }
}

function handleIncomingNotification(payload) {
  const normalized = normalizeNotificationPayload(payload);
  latestNotifications = [
    { ...normalized, read: false },
    ...(latestNotifications || []).filter(item => String(item.id) !== String(normalized.id))
  ].slice(0, 100);
  showToast("New Notification: " + (normalized.title || ""));
  updateNotificationBadge();
  renderNotifications();
}

function handleNotificationDeepLink(payload) {
  const normalized = normalizeNotificationPayload(payload);
  latestNotifications = [
    normalized,
    ...(latestNotifications || []).filter(item => String(item.id) !== String(normalized.id))
  ];
  handleNotificationAction(normalized.id);
}

function getReadNotificationIds() {
  try {
    return JSON.parse(localStorage.getItem("readNotifications") || "[]");
  } catch {
    return [];
  }
}

function setReadNotificationIds(ids) {
  try {
    localStorage.setItem("readNotifications", JSON.stringify([...new Set(ids)].slice(-300)));
  } catch {}
}

function normalizeNotificationPayload(payload) {
  const data = payload?.data || {};
  return {
    id: Number(payload?.id || data.notificationId || Date.now()),
    title: payload?.title || payload?.notification?.title || "Notification",
    message: payload?.message || payload?.body || payload?.notification?.body || "",
    imageUrl: payload?.imageUrl || payload?.image || payload?.notification?.image || "",
    linkedProductId: payload?.linkedProductId || data.linkedProductId || "",
    linkedCategoryId: payload?.linkedCategoryId || data.linkedCategoryId || "",
    ctaText: payload?.ctaText || data.ctaText || "",
    createdAt: payload?.createdAt || payload?.timestamp || Date.now(),
    active: payload?.active !== false,
    read: Boolean(payload?.read)
  };
}

async function fetchNotifications() {
  try {
    const params = new URLSearchParams();
    params.set("customerId", getCustomerId());
    const response = await fetch(`/api/notifications?${params.toString()}`, { cache: "no-store" });
    if (!response.ok) throw new Error("Could not load notifications");
    const payload = await response.json();
    const readIds = new Set(getReadNotificationIds().map(String));
    latestNotifications = (payload.notifications || []).map(notification => {
      const normalized = normalizeNotificationPayload(notification);
      normalized.read = readIds.has(String(normalized.id));
      return normalized;
    });
  } catch {
    latestNotifications = latestNotifications || [];
  }
  return latestNotifications;
}

function markNotificationsRead(ids = latestNotifications.map(notification => notification.id)) {
  const readIds = new Set(getReadNotificationIds().map(String));
  ids.forEach(id => readIds.add(String(id)));
  setReadNotificationIds([...readIds]);
  latestNotifications = latestNotifications.map(notification => ({
    ...notification,
    read: readIds.has(String(notification.id))
  }));
}

function renderNotifications() {
  if (!notificationList) return;
  const notifications = latestNotifications || [];
  if (!notifications.length) {
    notificationList.innerHTML = `<div class="empty-notifications">Aucune notification pour le moment. Les nouvelles offres apparaitront ici.</div>`;
    return;
  }

  notificationList.innerHTML = notifications.map(notification => `
    <button class="notification-item ${notification.read ? "" : "unread"} ${notification.linkedProductId || notification.linkedCategoryId ? "is-linked" : ""}" type="button" data-notification-id="${notification.id}">
      ${notification.imageUrl ? `<span class="notification-thumb"><img src="${imageSource(notification.imageUrl)}" alt=""></span>` : ""}
      <div class="notification-copy">
        <h3 class="notification-title">${notification.title}</h3>
        <p class="notification-body">${notification.message}</p>
        <div class="notification-meta">
          ${notification.ctaText ? `<strong class="notification-cta">${notification.ctaText}</strong>` : `<span class="notification-tag">${notification.linkedProductId ? "Voir le produit" : notification.linkedCategoryId ? "Voir la categorie" : "Info"}</span>`}
          <span class="notification-time">${new Date(notification.createdAt).toLocaleString()}</span>
        </div>
      </div>
    </button>
  `).join("");
}

function updateNotificationBadge() {
  const badge = document.getElementById("notificationBadge");
  if (!badge) return;
  const unreadCount = (latestNotifications || []).filter(notification => !notification.read).length;
  if (unreadCount > 0) {
    badge.textContent = unreadCount;
    badge.style.display = "flex";
  } else {
    badge.style.display = "none";
  }
}

function highlightProductCard(productId, { scroll = true } = {}) {
  const card = screenRoot?.querySelector(`[data-product="${CSS.escape(productId)}"]`);
  if (!card) return;
  card.classList.remove("is-highlighted");
  void card.offsetWidth;
  card.classList.add("is-highlighted");
  setTimeout(() => card.classList.remove("is-highlighted"), 1800);
  if (scroll) {
    card.scrollIntoView({ block: "center", behavior: "smooth" });
  }
}

function focusExplorerCategory(categoryName) {
  state.category = categories.some(category => category.name === categoryName) ? categoryName : "All";
  renderCategories();
  renderProducts();
}

function handleNotificationAction(notificationId) {
  const notification = latestNotifications.find(item => String(item.id) === String(notificationId));
  if (!notification) return;
  markNotificationsRead([notification.id]);
  updateNotificationBadge();
  if (!notification.linkedProductId && !notification.linkedCategoryId) {
    renderNotifications();
    return;
  }
  notificationModal?.classList.remove("open");
  notificationModal?.setAttribute("aria-hidden", "true");

  const openLinkedProduct = () => {
    if (!notification.linkedProductId) return;
    requestAnimationFrame(() => {
      openProductDetails(notification.linkedProductId, {
        preserveScroll: true,
        highlight: true,
        scrollHighlight: false
      });
    });
  };

  if (notification.linkedProductId) {
    const product = products.find(item => item.id === notification.linkedProductId);
    switchView("explorer");
    focusExplorerCategory(notification.linkedCategoryId || product?.category || "All");
    openLinkedProduct();
    return;
  }
  if (notification.linkedCategoryId) {
    switchView("explorer");
    focusExplorerCategory(notification.linkedCategoryId);
    showToast(notification.ctaText || notification.title);
  }
}

// Notification UI Listeners
document.getElementById("notificationButton")?.addEventListener("click", async () => {
  requestPushPermission(); // Ask permission when clicking the bell
  await fetchNotifications();
  renderNotifications();
  notificationModal?.classList.add("open");
  notificationModal?.setAttribute("aria-hidden", "false");
  markNotificationsRead();
  updateNotificationBadge();
});

closeNotificationsButton?.addEventListener("click", () => {
  notificationModal?.classList.remove("open");
  notificationModal?.setAttribute("aria-hidden", "true");
  renderNotifications();
});

notificationList?.addEventListener("click", event => {
  const button = event.target.closest("[data-notification-id]");
  if (!button) return;
  handleNotificationAction(button.dataset.notificationId);
});

// Call badge update on load
setTimeout(async () => {
  await fetchNotifications();
  updateNotificationBadge();
}, 1000);

async function initializeMessaging() {
  if (!("Notification" in window) || !messaging || Notification.permission !== "granted") return;
  if (!webMessagingInitialized) {
    const notifySound = new Audio("https://actions.google.com/sounds/v1/alarms/beep_short.ogg");
    onMessage(messaging, payload => {
      Promise.resolve().then(() => {
        notifySound.play().catch(error => console.warn("Audio play failed:", error));
        handleIncomingNotification(payload);
      });
    });
    webMessagingInitialized = true;
  }
  try {
    const token = await getToken(messaging);
    if (token) await syncDeviceToken(token);
  } catch (error) {
    console.warn("Failed to refresh token:", error);
  }
}

async function initializeNativePush() {
  const PushNotifications = getCapacitorPlugin("PushNotifications");
  if (!isNativeAndroidApp() || !PushNotifications) return false;
  if (!nativePushListenersBound) {
    PushNotifications.addListener("registration", event => {
      syncDeviceToken(event?.value || "").catch(error => console.warn("Could not sync push token", error));
    });
    PushNotifications.addListener("registrationError", error => {
      console.warn("Push registration error", error);
    });
    PushNotifications.addListener("pushNotificationReceived", notification => {
      handleIncomingNotification(notification);
    });
    PushNotifications.addListener("pushNotificationActionPerformed", action => {
      handleNotificationDeepLink(action?.notification || action);
    });
    nativePushListenersBound = true;
  }
  await PushNotifications.register();
  return true;
}

async function requestPushPermission(reason = "manual") {
  const PushNotifications = getCapacitorPlugin("PushNotifications");
  if (isNativeAndroidApp() && PushNotifications) {
    try {
      const status = await PushNotifications.checkPermissions();
      if (status.receive !== "granted") {
        if (nativePushPermissionPrompted && reason === "login") return;
        nativePushPermissionPrompted = true;
        const requested = await PushNotifications.requestPermissions();
        if (requested.receive !== "granted") {
          console.info("Push notifications permission denied");
          return;
        }
      }
      await initializeNativePush();
      return;
    } catch (error) {
      console.warn("Native push notification error:", error);
      return;
    }
  }
  if (!("Notification" in window) || !messaging) return;
  try {
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      await initializeMessaging();
    }
  } catch (error) {
    console.error("Push notification error:", error);
  }
}

async function initFirebaseAuth() {
  try {
    const savedProfile = JSON.parse(localStorage.getItem("customerProfile") || "null");
    if (savedProfile && !state.customer) state.customer = savedProfile;
  } catch {}
  updateAccountUi();
  isAndroidWebView = detectAndroidWebView();
  const nativeAuth = getCapacitorPlugin("FirebaseAuthentication");
  if (isNativeAndroidApp()) {
    console.info("Using native Android Google login");
  } else {
    console.info("Using web Google login");
  }
  if (isNativeAndroidApp() && nativeAuth) {
    googleLogin.textContent = "Continuer avec Google";
    accountStatus.textContent = "Connexion Google native";
    accountHelp.textContent = "Connectez-vous avec Google pour synchroniser vos commandes.";
    if (!nativeAuthListenerBound) {
      nativeAuth.addListener("authStateChange", event => {
        console.info("Native Android auth state changed", event?.user?.uid || "signed-out");
        setCustomerFromFirebase(event?.user || null);
      });
      nativeAuthListenerBound = true;
    }
    try {
      const currentUser = await nativeAuth.getCurrentUser();
      console.info("Native Android current user", currentUser?.user?.uid || "none");
      setCustomerFromFirebase(currentUser?.user || null);
    } catch (error) {
      console.warn("Native Firebase auth state unavailable", getAuthErrorMessage(error));
      accountHelp.textContent = `Connexion Android indisponible: ${getAuthErrorMessage(error, "etat inconnu")}`;
    }
    return;
  }
  if (isNativeAndroidApp() && !nativeAuth) {
    console.error("Native Android Google login plugin is not available");
    accountStatus.textContent = "Connexion Google indisponible";
    accountHelp.textContent = "Le plugin Google Android n'est pas charge dans cette version de l'application.";
    return;
  }

  if (!auth) return;
  try {
    const { GoogleAuthProvider, signInWithRedirect, signOut, onAuthStateChanged, getRedirectResult } = await import(`https://www.gstatic.com/firebasejs/${firebaseSdkVersion}/firebase-auth.js`);
    const { signInWithPopup } = await import(`https://www.gstatic.com/firebasejs/${firebaseSdkVersion}/firebase-auth.js`);
    firebaseAuth = auth;
    firebaseAuth.languageCode = currentLanguage;
    firebaseProvider = new GoogleAuthProvider();
    firebaseProvider.addScope("profile");
    firebaseProvider.addScope("email");
    firebaseSignInWithRedirect = signInWithRedirect;
    firebaseSignInWithPopup = signInWithPopup;
    firebaseSignOut = signOut;
    onAuthStateChanged(firebaseAuth, setCustomerFromFirebase);
    await getRedirectResult(firebaseAuth).catch(error => {
      console.warn("Firebase redirect login failed", getAuthErrorMessage(error));
      showToast(getAuthErrorMessage(error));
    });
    if (Notification.permission === "granted") {
      initializeMessaging().catch(error => console.warn("Web push init failed", error));
    }
  } catch (error) {
    console.warn("Firebase web auth bootstrap failed", getAuthErrorMessage(error, "Firebase config missing or invalid"));
    if (!hasFirebaseConfig()) {
      accountHelp.textContent = "Firebase config is missing for web Google login.";
    } else {
      accountHelp.textContent = `Connexion Google web indisponible: ${getAuthErrorMessage(error, "initialisation impossible")}`;
    }
  }
}

async function startGoogleLogin() {
  const nativeAuth = getCapacitorPlugin("FirebaseAuthentication");
  if (isNativeAndroidApp() && nativeAuth) {
    try {
      console.info("Using native Android Google login");
      const result = await nativeAuth.signInWithGoogle();
      setCustomerFromFirebase(result?.user || null);
      showToast("Google account connected");
      return;
    } catch (error) {
      const message = getAuthErrorMessage(error);
      console.error("Native Android Google login failed", message, error);
      accountHelp.textContent = `Echec de connexion Android: ${message}`;
      showToast(message);
      return;
    }
  }
  if (isAndroidWebView || window.AndroidBridge) {
    const url = `${window.location.origin}${window.location.pathname}?login=google`;
    if (window.AndroidBridge?.openExternalBrowser) {
      window.AndroidBridge.openExternalBrowser(url);
    } else {
      openExternalUrl(url);
    }
    accountHelp.textContent = "Sign in in the browser window. Google does not allow this login inside the APK WebView.";
    showToast("Opening secure browser");
    return;
  }

  if (!firebaseAuth || !firebaseProvider || !firebaseSignInWithRedirect) {
    showToast("Google login is not configured yet");
    return;
  }
  firebaseAuth.languageCode = currentLanguage;
  try {
    console.info("Using web Google login");
    if (firebaseSignInWithPopup && !/iPhone|iPad|iPod/i.test(navigator.userAgent || "")) {
      await firebaseSignInWithPopup(firebaseAuth, firebaseProvider);
      showToast("Google account connected");
      return;
    }
  } catch (error) {
    console.warn("Popup sign-in failed, falling back to redirect", getAuthErrorMessage(error));
  }
  await firebaseSignInWithRedirect(firebaseAuth, firebaseProvider);
}

async function logoutGoogleCustomer() {
  const nativeAuth = getCapacitorPlugin("FirebaseAuthentication");
  if (isNativeAndroidApp() && nativeAuth) {
    try {
      console.info("Using native Android Google logout");
      await nativeAuth.signOut();
    } catch (error) {
      console.warn("Native sign-out failed", getAuthErrorMessage(error));
    }
    setCustomerFromFirebase(null);
    showToast("Signed out");
    return;
  }
  if (!firebaseAuth || !firebaseSignOut) return;
  await firebaseSignOut(firebaseAuth);
  showToast("Signed out");
}

function categoryIcon(label) {
  const letter = label === "All" ? "S" : label.slice(0, 1);
  return `<span class="category-icon" aria-hidden="true">${letter}</span>`;
}

function imageSource(url) {
  if (!url) return "";
  return isDirectImageUrl(url)
    ? url
    : `/api/image?url=${encodeURIComponent(url)}`;
}

function getProductImageSources(product, context = "card") {
  const previewSource = product.previewImageUrl || product.blurImageUrl || product.thumbnailUrl || product.cardImageUrl || product.imageUrl || "";
  const thumbSource = product.thumbnailUrl || product.cardImageUrl || product.imageUrl || previewSource;
  const detailSource = product.detailImageUrl || product.largeImageUrl || product.imageUrl || thumbSource;
  const finalSource = context === "detail" ? detailSource : thumbSource;
  const previewUrl = imageSource(previewSource);
  const thumbUrl = imageSource(thumbSource);
  const detailUrl = imageSource(detailSource);

  return {
    previewSrc: previewUrl,
    finalSrc: imageSource(finalSource),
    srcset: thumbUrl && detailUrl && thumbUrl !== detailUrl
      ? `${thumbUrl} 160w, ${detailUrl} 640w`
      : "",
    sizes: context === "detail"
      ? "(min-width: 430px) 430px, 100vw"
      : "(max-width: 480px) 82px, 104px"
  };
}

function isDirectImageUrl(url) {
  try {
    const parsed = new URL(url);
    return /^https?:$/.test(parsed.protocol) && /\.(png|jpe?g|webp|gif|avif)(\?.*)?$/i.test(parsed.pathname + parsed.search);
  } catch {
    return false;
  }
}

function renderHero() {
  const fallback = "logo-3p.png";
  const activeImage = heroImages[heroIndex] ? imageSource(heroImages[heroIndex]) : fallback;
  heroBackdrop.style.backgroundImage = `url("${activeImage}")`;
  updateHeroParallax();
  heroDots.innerHTML = heroImages.length > 1
    ? heroImages.map((_, index) => `<span class="${index === heroIndex ? "active" : ""}"></span>`).join("")
    : "";
}

function setHeroImages(images) {
  heroImages = images.filter(Boolean).slice(0, 5);
  heroIndex = 0;
  clearInterval(heroTimer);
  renderHero();
  if (heroImages.length > 1) {
    heroTimer = setInterval(() => {
      heroIndex = (heroIndex + 1) % heroImages.length;
      renderHero();
    }, 4200);
  }
}

function updateHeroParallax() {
  if (!heroBackdrop || state.currentView !== "home") return;
  const offset = Math.min((screenRoot?.scrollTop || 0) * 0.08, 18);
  heroBackdrop.style.transform = `translateY(${offset}px) scale(1.06)`;
}

function categoryMedia(category) {
  if (!category.imageUrl) return categoryIcon(category.name);
  return `<span class="category-icon image-icon" aria-hidden="true"><img src="${imageSource(category.imageUrl)}" alt="" decoding="async"></span>`;
}

function productSvg(product) {
  const palettes = {
    teal: ["#271313", "#ef1010", "#8d0707"],
    yellow: ["#fff2ca", "#ffb000", "#755000"],
    red: ["#ffe3df", "#d84b3a", "#80271e"],
    blue: ["#e4efff", "#3777d6", "#173f7a"]
  };
  const [bg, main, dark] = palettes[product.color];
  const shapes = {
    bottle: `<rect x="31" y="12" width="18" height="12" rx="4" fill="${dark}"/><rect x="24" y="22" width="32" height="44" rx="9" fill="${main}"/><rect x="30" y="36" width="20" height="16" rx="5" fill="#fff" opacity=".86"/>`,
    cup: `<path d="M22 22h36l-5 42H27L22 22Z" fill="${main}"/><rect x="20" y="17" width="40" height="8" rx="4" fill="${dark}"/><circle cx="40" cy="43" r="10" fill="#fff" opacity=".78"/>`,
    bread: `<path d="M15 42c0-16 11-27 25-27s25 11 25 27v14c0 5-4 9-9 9H24c-5 0-9-4-9-9V42Z" fill="${main}"/><path d="M25 37c6-8 14-11 24-8" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".8"/>`,
    box: `<rect x="15" y="23" width="50" height="40" rx="8" fill="${main}"/><path d="M15 34h50" stroke="${dark}" stroke-width="5"/><circle cx="32" cy="48" r="7" fill="#fff" opacity=".76"/>`,
    plate: `<circle cx="40" cy="40" r="28" fill="${main}"/><circle cx="40" cy="40" r="18" fill="#fff" opacity=".75"/><path d="M29 40h22" stroke="${dark}" stroke-width="5" stroke-linecap="round"/>`,
    tray: `<rect x="14" y="25" width="52" height="34" rx="9" fill="${main}"/><path d="M24 43c8-10 19-11 32-3" stroke="#fff" stroke-width="6" stroke-linecap="round" opacity=".8"/>`,
    fish: `<path d="M18 41c12-17 30-17 43 0-13 17-31 17-43 0Z" fill="${main}"/><path d="M61 41l10-10v20L61 41Z" fill="${dark}"/><circle cx="31" cy="37" r="3" fill="#fff"/>`,
    fruit: `<circle cx="34" cy="42" r="19" fill="${main}"/><circle cx="48" cy="39" r="17" fill="${main}" opacity=".86"/><path d="M41 20c3-8 10-9 15-8-2 7-7 11-15 8Z" fill="${dark}"/>`
  };
  return `<svg viewBox="0 0 80 80" role="img" aria-label="${product.name} illustration"><rect width="80" height="80" rx="18" fill="${bg}"/>${shapes[product.shape]}</svg>`;
}

function productMedia(product, index = 0) {
  if (!product.imageUrl) return productSvg(product);
  const shouldPrioritize = index < 4;
  const sources = getProductImageSources(product, "card");
  const hasUpgradedSource = sources.previewSrc && sources.finalSrc && sources.previewSrc !== sources.finalSrc;
  const srcAttr = shouldPrioritize ? `src="${sources.previewSrc}"` : `data-src="${sources.previewSrc}"`;
  const srcSetAttr = sources.srcset && !hasUpgradedSource
    ? (shouldPrioritize ? `srcset="${sources.srcset}"` : `data-srcset="${sources.srcset}"`)
    : "";
  return `
    <span class="image-skeleton" aria-hidden="true"></span>
    <img class="product-photo is-preview" ${srcAttr} ${srcSetAttr} sizes="${sources.sizes}" alt="${product.name}" loading="${shouldPrioritize ? "eager" : "lazy"}" fetchpriority="${shouldPrioritize ? "high" : "auto"}" decoding="async" data-final-src="${sources.finalSrc}" data-final-srcset="${hasUpgradedSource ? sources.srcset : ""}" data-fallback='${productSvg(product).replaceAll("'", "&apos;")}'>
  `;
}

function markProductImageReady(img) {
  img.classList.add("is-loaded");
  img.classList.remove("is-preview");
  img.closest(".product-image")?.classList.remove("is-loading");
}

function showProductFallback(img) {
  const wrapper = img.closest(".product-image");
  if (!wrapper) return;
  wrapper.classList.remove("is-loading");
  const fallback = img.dataset.fallback || "";
  const skeleton = wrapper.querySelector(".image-skeleton");
  skeleton?.remove();
  if (fallback) {
    img.insertAdjacentHTML("afterend", fallback);
  }
  img.remove();
}

function bindProductImage(img) {
  if (!img || img.dataset.bound === "true") return;
  img.dataset.bound = "true";
  const handleLoad = () => {
    const finalSrc = img.dataset.finalSrc || "";
    const finalSrcSet = img.dataset.finalSrcset || "";
    const shouldUpgrade = finalSrc && finalSrc !== img.currentSrc && finalSrc !== img.src;
    if (shouldUpgrade && !img.dataset.upgraded) {
      img.dataset.upgraded = "true";
      if (finalSrcSet) img.srcset = finalSrcSet;
      img.src = finalSrc;
      return;
    }
    markProductImageReady(img);
  };
  img.addEventListener("load", handleLoad);
  img.addEventListener("error", () => showProductFallback(img), { once: true });
  if (img.complete && img.naturalWidth > 0) {
    handleLoad();
  }
}

function loadDeferredImage(img) {
  if (!img || img.dataset.loaded === "true") return;
  img.dataset.loaded = "true";
  if (img.dataset.srcset) img.srcset = img.dataset.srcset;
  if (img.dataset.src) img.src = img.dataset.src;
}

function hydrateProductImages() {
  const images = screenRoot.querySelectorAll(".product-photo");
  if (productImageObserver) {
    productImageObserver.disconnect();
  }

  images.forEach(img => {
    bindProductImage(img);
    if (!img.dataset.src) {
      return;
    }
    img.closest(".product-image")?.classList.add("is-loading");
  });

  const deferredImages = [...images].filter(img => Boolean(img.dataset.src));
  if (!deferredImages.length) return;

  if (!("IntersectionObserver" in window)) {
    deferredImages.forEach(loadDeferredImage);
    return;
  }

  productImageObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      loadDeferredImage(entry.target);
      productImageObserver?.unobserve(entry.target);
    });
  }, {
    root: screenRoot || null,
    rootMargin: "200px 0px",
    threshold: 0.01
  });

  deferredImages.forEach(img => productImageObserver.observe(img));
}

function renderCategories() {
  categoryRoot.innerHTML = categories.map((category, index) => `
    <button class="category-pill ${state.category === category.name ? "active" : ""}" data-category="${category.name}" style="--category-index:${index}">
      ${categoryMedia(category)}
      <span>${category.name}</span>
    </button>
  `).join("");
}

function cloneMenuItems(items) {
  return JSON.parse(JSON.stringify(items || []));
}

function getStableMenu(menu) {
  return {
    categories: menu.categories || [],
    products: menu.products || []
  };
}

async function loadSettings() {
  try {
    const response = await fetch("/api/settings", { cache: "no-store" });
    if (!response.ok) throw new Error("Settings backend unavailable");
    const settings = await response.json();
    state.settings = {
      ...defaultShopSettings,
      ...state.settings,
      ...(settings || {})
    };
    setHeroImages(settings?.heroImages || []);
    renderCart();
    updateStoreStatusUi();
  } catch {
    state.settings = {
      ...defaultShopSettings,
      ...state.settings
    };
    updateStoreStatusUi();
  }
}

async function loadMenu() {
  try {
    const [menuResponse] = await Promise.all([
      fetch("/api/menu", { cache: "no-store" }),
      loadSettings()
    ]);
    const response = menuResponse;
    if (!response.ok) throw new Error("Menu backend unavailable");
    const menu = await response.json();
    const stableMenu = getStableMenu(menu);
    categories = [{ name: "All", imageUrl: "" }, ...stableMenu.categories];
    products = stableMenu.products;
    renderCategories();
    renderProducts();
    renderCart();
  } catch (error) {
    showToast(t("usingSavedMenu"));
  } finally {
    preloadImagesAndHideSplash();
  }
}

function getFilteredProducts() {
  const query = state.query.trim().toLowerCase();
  return products.filter(product => {
    if (product.available === false) return false;
    const categoryMatch = state.category === "All" || product.category === state.category;
    const queryMatch = !query || [product.name, product.category, product.desc, product.tag].some(value => value.toLowerCase().includes(query));
    return categoryMatch && queryMatch;
  }).sort((a, b) => {
    const orderDelta = (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0);
    if (orderDelta) return orderDelta;
    const aHasBadge = a.badge ? 1 : 0;
    const bHasBadge = b.badge ? 1 : 0;
    return bHasBadge - aHasBadge;
  });
}

function renderProductCards(target, items, emptyMessage) {
  if (!target) return;
  target.classList.remove("is-refreshing");
  if (!items.length) {
    target.innerHTML = `<div class="empty-state">${emptyMessage}</div>`;
    return;
  }
  target.innerHTML = items.map((product, index) => `
    <article class="product-card" data-product="${product.id || product.name}" tabindex="0" role="button" aria-label="Open ${product.name}" style="--card-index:${index}">
      <div class="product-image ${index < 4 ? "" : "is-loading"}">
        ${product.badge ? `<span class="product-badge ${product.badge === "TOP SALE" ? "top-sale" : "new-badge"}">${product.badge}</span>` : ""}
        ${productMedia(product, index)}
      </div>
      <div class="product-info">
        <h3>${product.name}</h3>
        <p class="product-meta">${product.desc || product.category}</p>
        <div class="price-row">
          <span class="price">${money(product.price)}</span>
          <span class="tag">${product.tag}</span>
        </div>
      </div>
      <button class="add-button" data-add="${product.id || product.name}" aria-label="Add ${product.name}">+</button>
    </article>
  `).join("");
  requestAnimationFrame(() => target.classList.add("is-refreshing"));
  hydrateProductImages();
}

function renderProducts() {
  const filtered = getFilteredProducts();
  const featured = [...products]
    .filter(product => product.available !== false)
    .sort((a, b) => {
      const badgeDelta = Number(Boolean(b.badge)) - Number(Boolean(a.badge));
      if (badgeDelta) return badgeDelta;
      return (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0);
    })
    .slice(0, 4);
  resultsMeta.textContent = t("productsAvailable", filtered.length);
  sectionHeading.textContent = state.category === "All" ? t("popularProducts") : state.category;
  if (homeResultsMeta) homeResultsMeta.textContent = featured.length ? `${featured.length} featured picks` : "Fresh picks coming soon";
  if (homeSectionHeading) homeSectionHeading.textContent = "Popular products";
  renderProductCards(productRoot, filtered, t("noProducts"));
  renderProductCards(featuredProductsRoot, featured, t("noProducts"));
}

function getPendingSelection() {
  const product = state.pendingProduct;
  const selections = [];
  let totalOptionPrice = 0;
  let missingRequired = false;

  (product?.options || []).forEach((group, groupIndex) => {
    const inputs = optionsChoices.querySelectorAll(`input[name="group_${groupIndex}"]:checked`);
    if (group.required && inputs.length === 0) missingRequired = true;
    inputs.forEach(input => {
      const choice = group.choices[Number(input.value)];
      if (!choice) return;
      totalOptionPrice += Number(choice.price || 0);
      selections.push(choice.name);
    });
  });

  return {
    totalOptionPrice,
    selections,
    missingRequired
  };
}

function updateOptionsSubmitState() {
  const product = state.pendingProduct;
  if (!product) return;
  const { totalOptionPrice, missingRequired } = getPendingSelection();
  optionsPrice.textContent = money(Number(product.price || 0) + totalOptionPrice);
  addOptionProduct.textContent = `Add 1 for ${money(Number(product.price || 0) + totalOptionPrice)}`;
  addOptionProduct.disabled = missingRequired;
}

function getCartDetails() {
  const items = [...state.cart.entries()].map(([key, cartItem]) => {
    const product = products.find(item => item.id === cartItem.productId) || products.find(item => item.name === cartItem.productId);
    const optionPrice = Number(cartItem.optionPrice || 0);
    const unitPrice = Number(product?.price || 0) + optionPrice;
    return {
      ...product,
      key,
      quantity: cartItem.quantity,
      optionName: cartItem.optionName || "",
      optionPrice,
      unitPrice,
      lineTotal: unitPrice * cartItem.quantity
    };
  }).filter(item => item.name);
  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  const shopLocation = {
    latitude: Number(state.settings.shopLatitude) || defaultShopSettings.shopLatitude,
    longitude: Number(state.settings.shopLongitude) || defaultShopSettings.shopLongitude
  };
  const distanceKm = state.mode === "delivery" && state.location
    ? getDistanceKm(shopLocation, state.location)
    : 0;
  const matchedZone = state.mode === "delivery" && distanceKm > 0
    ? getMatchingDeliveryZone(distanceKm)
    : null;
  const fee = state.mode === "delivery" && subtotal > 0
    ? Number(matchedZone?.price || 0)
    : 0;
  const beforeDiscount = subtotal + fee;
  const promoDiscount = calculatePromoDiscount(state.promo, beforeDiscount);
  const total = beforeDiscount - promoDiscount;
  const minimumOrderAmount = Math.max(0, Number(state.settings.minimumOrderAmount) || 0);
  return {
    items,
    subtotal,
    fee,
    distanceKm,
    matchedZone,
    promoDiscount,
    minimumOrderAmount,
    minimumOrderMet: total >= minimumOrderAmount,
    total
  };
}

function renderCart() {
  const { items, subtotal, fee, distanceKm, matchedZone, promoDiscount, total, minimumOrderAmount, minimumOrderMet } = getCartDetails();
  const count = items.reduce((sum, item) => sum + item.quantity, 0);
  cartCount.textContent = count;
  cartTotal.textContent = money(total);
  cartTitle.textContent = `${count} ${count === 1 ? t("item") : t("items")}`;
  subtotalNode.textContent = money(subtotal);
  serviceFeeNode.textContent = state.mode === "delivery" && count > 0 && !matchedZone && distanceKm > 0 ? "--" : money(fee);
  serviceLabel.textContent = state.mode === "delivery" && distanceKm > 0
    ? `${t("delivery")} ${distanceKm.toFixed(1)} km`
    : state.mode === "delivery" ? `${t("delivery")} Â· ${t("deliveryZone")}` : t("pickup");
  if (state.mode === "delivery" && distanceKm > 0) {
    serviceLabel.textContent = matchedZone
      ? `${t("delivery")} ${distanceKm.toFixed(1)} km Â· ${matchedZone.radius} km zone`
      : `${t("delivery")} Â· ${t("outsideAgadir")}`;
  } else if (state.mode === "delivery" && !getSortedDeliveryZones().length) {
    serviceLabel.textContent = `${t("delivery")} Â· ${t("noDeliveryZones")}`;
  }
  promoSummary.classList.toggle("hidden", !state.promo || promoDiscount <= 0);
  promoLabel.textContent = state.promo ? `Promo ${state.promo.code}` : "Promo";
  promoDiscountNode.textContent = `-${money(promoDiscount)}`;
  totalNode.textContent = money(total);
  addressField.style.display = state.mode === "delivery" ? "grid" : "none";
  locationCapture.style.display = state.mode === "delivery" ? "grid" : "none";
  customerAddress.required = state.mode === "delivery";
  floatingCart.classList.toggle("visible", count > 0);
  const checkoutButton = document.querySelector("#checkoutButton");
  if (checkoutButton) {
    checkoutButton.disabled = isStoreClosed() || total === 0 || !minimumOrderMet;
    checkoutButton.textContent = minimumOrderAmount > 0 && !minimumOrderMet
      ? `Minimum ${money(minimumOrderAmount)}`
      : t("checkout");
  }
  if (count !== previousCartCount) {
    cartCount.classList.remove("is-popping");
    floatingCart.classList.remove("is-bumping");
    void cartCount.offsetWidth;
    cartCount.classList.add("is-popping");
    floatingCart.classList.add("is-bumping");
    previousCartCount = count;
  }

  cartItems.innerHTML = items.length ? items.map(item => `
    <div class="cart-row" data-cart-key="${item.key}">
      <div class="cart-line">
        <span class="cart-thumb">${item.name.slice(0, 1)}</span>
        <div>
          <p class="cart-name">${item.name}</p>
          <p class="cart-price">${item.optionName ? `${item.optionName} Â· ` : ""}${money(item.unitPrice)}</p>
        </div>
      </div>
      <div class="quantity">
        <button data-minus="${item.key}" aria-label="Remove one ${item.name}">-</button>
        <strong>${item.quantity}</strong>
        <button data-plus="${item.key}" aria-label="Add one ${item.name}">+</button>
      </div>
    </div>
  `).join("") : `<div class="empty-state">${t("emptyBasket")}</div>`;

  if (lastChangedCartKey) {
    const changedRow = [...cartItems.querySelectorAll("[data-cart-key]")].find(node => node.dataset.cartKey === lastChangedCartKey);
    const quantityValue = changedRow?.querySelector(".quantity strong");
    if (quantityValue) {
      quantityValue.classList.remove("is-bumping");
      void quantityValue.offsetWidth;
      quantityValue.classList.add("is-bumping");
    }
    lastChangedCartKey = "";
  }
}

function makeCartKey(product, option = null) {
  return `${product.id || product.name}::${option?.name || ""}`;
}

function setOptionsHeroState({ showFallback = false } = {}) {
  optionsHeroFallback?.classList.toggle("visible", showFallback);
  optionsImage?.classList.toggle("hidden", showFallback);
}

function openOptionsModal(product, { preserveScroll = false } = {}) {
  state.pendingProduct = product;
  const previousScrollTop = screenRoot?.scrollTop || 0;
  optionsSubtitle.textContent = product.category || "3P CHICKEN POPS";
  optionsTitle.textContent = product.name;
  optionsPrice.textContent = money(product.price || 0);
  optionsDescription.textContent = product.desc || product.category || "";
  const detailImage = getProductImageSources(product, "detail");
  optionsImage.classList.remove("is-loaded");
  optionsImage.classList.remove("hidden");
  setOptionsHeroState({ showFallback: !detailImage.previewSrc && !detailImage.finalSrc });
  optionsImage.src = detailImage.previewSrc || detailImage.finalSrc || "";
  optionsImage.srcset = detailImage.srcset || "";
  optionsImage.sizes = detailImage.sizes;
  optionsImage.alt = product.name;
  const handleDetailLoad = () => {
    if (detailImage.finalSrc && detailImage.finalSrc !== optionsImage.currentSrc && detailImage.finalSrc !== optionsImage.src) {
      optionsImage.src = detailImage.finalSrc;
      return;
    }
    optionsImage.classList.add("is-loaded");
    setOptionsHeroState({ showFallback: false });
  };
  optionsImage.onload = handleDetailLoad;
  optionsImage.onerror = () => {
    optionsImage.srcset = "";
    optionsImage.removeAttribute("src");
    setOptionsHeroState({ showFallback: true });
  };
  if (optionsImage.complete && optionsImage.naturalWidth > 0 && optionsImage.currentSrc) {
    handleDetailLoad();
  }
  optionsError.textContent = "";

  optionsChoices.innerHTML = (product.options || []).map((group, groupIndex) => `
    <div class="option-group">
      <div class="option-group-header">
        <h3>${group.name}</h3>
        <small>${group.required ? 'Choose 1 item <span class="requis-badge">Required</span>' : 'Optional'}</small>
      </div>
      <div class="option-group-items">
        ${(group.choices || []).map((choice, choiceIndex) => `
          <label class="option-choice">
            <input type="${group.required ? "radio" : "checkbox"}" name="group_${groupIndex}" value="${choiceIndex}">
            <span class="option-choice-copy">
              <strong>${choice.name}</strong>
              ${choice.price > 0 ? `<small>+${money(choice.price)}</small>` : ""}
            </span>
            <span class="option-control" aria-hidden="true"></span>
          </label>
        `).join("")}
      </div>
    </div>
  `).join("") || `<div class="option-group"><div class="option-group-header"><h3>Ready to order</h3><small>No extra choices for this item.</small></div></div>`;

  optionsModal.classList.add("open");
  optionsModal.setAttribute("aria-hidden", "false");
  if (preserveScroll && screenRoot) {
    requestAnimationFrame(() => {
      screenRoot.scrollTop = previousScrollTop;
    });
  }
  updateOptionsSubmitState();
}

function closeOptionsModal() {
  state.pendingProduct = null;
  optionsModal.classList.remove("open");
  optionsModal.setAttribute("aria-hidden", "true");
  optionsChoices.innerHTML = "";
  optionsError.textContent = "";
}

function addSelectedOptionProduct() {
  const product = state.pendingProduct;
  if (!product) return;
  const { totalOptionPrice, selections, missingRequired } = getPendingSelection();
  if (missingRequired) {
    optionsError.textContent = "Please choose every required option before adding this item.";
    return;
  }

  const optionObj = {
    name: selections.join(", "),
    price: totalOptionPrice
  };

  addProductToCart(product, optionObj.name ? optionObj : null, addOptionProduct);
  closeOptionsModal();
}

function addProductToCart(product, option = null, sourceElement = null) {
  const key = makeCartKey(product, option);
  const current = state.cart.get(key) || {
    productId: product.id || product.name,
    optionName: option?.name || "",
    optionPrice: Number(option?.price || 0),
    quantity: 0
  };
  current.quantity += 1;
  state.cart.set(key, current);
  lastChangedCartKey = key;
  renderCart();
  sourceElement?.classList.add("is-confirmed");
  setTimeout(() => sourceElement?.classList.remove("is-confirmed"), 520);
  showToast(t("added", product.name));
}

function addToCart(productId, sourceElement = null) {
  const product = products.find(item => item.id === productId) || products.find(item => item.name === productId);
  if (!product) return;
  sourceElement?.closest(".product-card")?.classList.add("is-pressed");
  setTimeout(() => sourceElement?.closest(".product-card")?.classList.remove("is-pressed"), 320);
  openOptionsModal(product);
}

function changeQuantity(key, delta) {
  const current = state.cart.get(key);
  if (!current) return;
  const next = current.quantity + delta;
  if (next <= 0) state.cart.delete(key);
  else state.cart.set(key, { ...current, quantity: next });
  lastChangedCartKey = key;
  renderCart();
}

function applyPromoCode() {
  const promo = findPromoCode(promoCodeInput.value);
  if (!promo) {
    state.promo = null;
    promoStatus.textContent = "Promo code not valid.";
    showToast("Promo code not valid");
    renderCart();
    return;
  }
  state.promo = promo;
  promoCodeInput.value = promo.code;
  promoStatus.textContent = promo.type === "fixed"
    ? `${money(promo.value)} discount applied.`
    : `${promo.value}% discount applied.`;
  showToast("Promo applied");
  renderCart();
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("visible");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("visible"), 1400);
}

function setLocationStatus(message) {
  locationStatus.textContent = message;
}

function getMapLink(location) {
  return `https://www.google.com/maps?q=${location.latitude},${location.longitude}`;
}

function fillAddressFromLocation(location) {
  const mapLink = getMapLink(location);
  customerAddress.value = `Exact GPS location: ${mapLink}`;
}

function applyCapturedLocation(position) {
  state.location = {
    latitude: Number(position.coords.latitude.toFixed(7)),
    longitude: Number(position.coords.longitude.toFixed(7)),
    accuracy: Math.round(position.coords.accuracy)
  };
  const mapLink = getMapLink(state.location);
  fillAddressFromLocation(state.location);
  if (!getMatchingDeliveryZone(getDistanceKm({
    latitude: Number(state.settings.shopLatitude) || defaultShopSettings.shopLatitude,
    longitude: Number(state.settings.shopLongitude) || defaultShopSettings.shopLongitude
  }, state.location))) {
    setLocationStatus(`${t("outsideAgadir")} ${mapLink}`);
    showToast(t("outsideAgadir"));
  } else {
    setLocationStatus(`${t("locationAdded", state.location.accuracy)} ${mapLink}`);
    showToast(t("locationAdded", state.location.accuracy));
  }
  useLocationButton.textContent = t("updateLocation");
  useLocationButton.disabled = false;
  renderCart();
}

async function captureLocation() {
  useLocationButton.disabled = true;
  useLocationButton.textContent = t("detecting");
  setLocationStatus(t("askingLocation"));
  try {
    const Geolocation = getCapacitorPlugin("Geolocation");
    if (isNativeAndroidApp() && Geolocation) {
      const permissions = await Geolocation.checkPermissions();
      let locationStatusValue = permissions.location || permissions.coarseLocation;
      if (locationStatusValue !== "granted") {
        const requested = await Geolocation.requestPermissions();
        locationStatusValue = requested.location || requested.coarseLocation;
      }
      if (locationStatusValue !== "granted") {
        const deniedMessage = "Veuillez autoriser la localisation pour calculer la livraison.";
        setLocationStatus(deniedMessage);
        useLocationButton.textContent = t("useExactLocation");
        useLocationButton.disabled = false;
        showToast(deniedMessage);
        return;
      }
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      });
      applyCapturedLocation(position);
      return;
    }

    if (!("geolocation" in navigator)) {
      setLocationStatus(t("gpsUnavailable"));
      showToast(t("locationUnavailable"));
      useLocationButton.textContent = t("useExactLocation");
      useLocationButton.disabled = false;
      return;
    }

    navigator.geolocation.getCurrentPosition(
      position => applyCapturedLocation(position),
      error => {
        const messages = {
          1: t("locationDenied"),
          2: t("locationTryAgain"),
          3: t("locationTimeout")
        };
        setLocationStatus(messages[error.code] || t("couldNotDetect"));
        useLocationButton.textContent = t("useExactLocation");
        useLocationButton.disabled = false;
        showToast(t("locationUnavailable"));
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      }
    );
  } catch (error) {
    console.warn("Location capture failed", error);
    setLocationStatus(t("couldNotDetect"));
    useLocationButton.textContent = t("useExactLocation");
    useLocationButton.disabled = false;
    showToast("Veuillez autoriser la localisation pour calculer la livraison.");
  }
}

function canDeliverToCurrentLocation(showMessage = false) {
  if (state.mode !== "delivery") return true;
  if (!getSortedDeliveryZones().length) {
    if (showMessage) {
      setLocationStatus(t("noDeliveryZones"));
      showToast(t("noDeliveryZones"));
    }
    return false;
  }
  if (!state.location) {
    if (showMessage) {
      setLocationStatus(t("shareAgadirLocation"));
      showToast(t("shareAgadirLocation"));
    }
    return false;
  }
  const shopLocation = {
    latitude: Number(state.settings.shopLatitude) || defaultShopSettings.shopLatitude,
    longitude: Number(state.settings.shopLongitude) || defaultShopSettings.shopLongitude
  };
  if (!getMatchingDeliveryZone(getDistanceKm(shopLocation, state.location))) {
    if (showMessage) {
      setLocationStatus(t("outsideAgadir"));
      showToast(t("outsideAgadir"));
    }
    return false;
  }
  return true;
}

function buildOrderPayload(formData, cartSummary, whatsappMessage) {
  return {
    customerName: String(formData.get("customerName") || "").trim(),
    customerPhone: String(formData.get("customerPhone") || "").trim(),
    customerEmail: state.customer?.email || "",
    firebaseUid: state.customer?.uid || "",
    mode: state.mode,
    address: state.mode === "delivery" ? String(formData.get("customerAddress") || "").trim() : "Pickup from shop",
    latitude: state.location?.latitude ?? null,
    longitude: state.location?.longitude ?? null,
    distanceKm: cartSummary.distanceKm || 0,
    deliveryZoneRadius: cartSummary.matchedZone?.radius ?? null,
    deliveryFee: cartSummary.fee || 0,
    subtotal: cartSummary.subtotal || 0,
    discount: cartSummary.promoDiscount || 0,
    total: cartSummary.total || 0,
    promoCode: state.promo?.code || "",
    whatsappMessage,
    items: cartSummary.items.map(item => ({
      productId: item.id || item.name,
      productName: item.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      options: item.optionName ? [{
        name: item.optionName,
        price: item.optionPrice || 0
      }] : [],
      lineTotal: item.lineTotal
    }))
  };
}

async function saveOrderBeforeWhatsapp(formData, cartSummary) {
  const whatsappMessage = buildOrderMessage(formData, { orderId: "__ORDER_ID__", cartSummary });
  const response = await fetch("/api/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(buildOrderPayload(formData, cartSummary, whatsappMessage))
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (payload.error === "STORE_CLOSED") {
      const error = new Error("STORE_CLOSED");
      error.closedMessage = payload.message || getClosedStoreMessage();
      throw error;
    }
    throw new Error(payload.error || "Order could not be saved. Please try again.");
  }
  return payload;
}

function buildOrderMessage(formData, { orderId = getCustomerId(), cartSummary = getCartDetails() } = {}) {
  const { items, subtotal, fee, distanceKm, matchedZone, promoDiscount, total } = cartSummary;
  const orderLines = items.map(item => {
    const option = item.optionName ? ` (${item.optionName}${item.optionPrice > 0 ? ` +${money(item.optionPrice)}` : ""})` : "";
    return `- ${item.quantity} x ${item.name}${option} = ${money(item.lineTotal)}`;
  }).join("\n");
  const address = state.mode === "delivery" ? formData.get("customerAddress") : "Pickup from shop";
  const locationLine = state.mode === "delivery" && state.location
    ? getMapLink(state.location)
    : "Not shared";
  const notes = formData.get("orderNotes") || "No notes";

  return [
    "New shop order",
    "",
    `Customer: ${formData.get("customerName")}`,
    `Google account: ${state.customer?.email || "Not signed in"}`,
    `Phone: ${formData.get("customerPhone")}`,
    `Mode: ${state.mode}`,
    `Address: ${address}`,
    `Exact location: ${locationLine}`,
    `Delivery zone: ${state.mode === "delivery" ? (matchedZone ? `${matchedZone.radius} km / ${matchedZone.price} DHS` : "Outside delivery zones") : "Pickup"}`,
    `Distance from shop: ${state.mode === "delivery" && distanceKm > 0 ? `${distanceKm.toFixed(2)} km` : "Not calculated"}`,
    `Payment: ${formData.get("paymentMethod")}`,
    "",
    "Items:",
    orderLines,
    "",
    `Subtotal: ${money(subtotal)}`,
    `${state.mode === "delivery" ? "Delivery" : "Pickup"}: ${money(fee)}`,
    `Promo: ${state.promo ? `${state.promo.code} (-${money(promoDiscount)})` : "None"}`,
    `Total: ${money(total)}`,
    "",
    `Notes: ${notes}`
  ].join("\n") + `\n\n*Order ID: #${orderId}*`;
}

categoryRoot.addEventListener("click", event => {
  const button = event.target.closest("[data-category]");
  if (!button) return;
  state.category = button.dataset.category;
  renderCategories();
  renderProducts();
});

function handleProductCardClick(event) {
  const root = event.currentTarget;
  if (!(root instanceof Element)) return;
  const target = event.target;
  if (!(target instanceof Element)) return;
  const button = target.closest("[data-add]");
  if (button && root.contains(button)) {
    addToCart(button.dataset.add, button);
    return;
  }
  const card = target.closest("[data-product]");
  if (card && root.contains(card)) openProductDetails(card.dataset.product);
}

function handleProductCardKeydown(event) {
  const root = event.currentTarget;
  if (!(root instanceof Element)) return;
  const target = event.target;
  if (!(target instanceof Element)) return;
  const card = target.closest("[data-product]");
  if (!card || !root.contains(card)) return;
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    openProductDetails(card.dataset.product);
  }
}

productRoot?.addEventListener("click", handleProductCardClick);
featuredProductsRoot?.addEventListener("click", handleProductCardClick);

productRoot?.addEventListener("keydown", handleProductCardKeydown);
featuredProductsRoot?.addEventListener("keydown", handleProductCardKeydown);

bottomNavButtons.forEach(button => {
  button.addEventListener("click", () => switchView(button.dataset.viewTarget));
});

accountTabButton?.addEventListener("click", () => switchView("account"));
accountOrdersLink?.addEventListener("click", () => switchView("orders"));
accountLanguageLink?.addEventListener("click", () => {
  const next = currentLanguage === "fr" ? "en" : currentLanguage === "en" ? "ar" : "fr";
  applyLanguage(next);
  showToast(`Langue: ${next.toUpperCase()}`);
});
accountHelpLink?.addEventListener("click", openSupportModal);
homeBrowseAction?.addEventListener("click", () => switchView("explorer"));
homeOrdersAction?.addEventListener("click", () => switchView("orders"));
homeShowAll?.addEventListener("click", () => switchView("explorer"));
accountPageAvatarImage?.addEventListener("load", () => accountPageAvatarImage.classList.add("is-loaded"));
accountPageAvatarImage?.addEventListener("error", () => {
  accountPageAvatarImage.classList.remove("is-loaded");
  accountPageAvatar?.classList.add("no-photo");
});
accountTabAvatarImage?.addEventListener("load", () => accountTabAvatarImage.classList.add("is-loaded"));
accountTabAvatarImage?.addEventListener("error", () => {
  accountTabAvatarImage.classList.remove("is-loaded");
  accountTabButton?.classList.add("no-photo");
});
screenRoot?.addEventListener("scroll", () => {
  if (heroParallaxFrame) cancelAnimationFrame(heroParallaxFrame);
  heroParallaxFrame = requestAnimationFrame(updateHeroParallax);
}, { passive: true });

function openProductDetails(productId, { preserveScroll = false, highlight = false, scrollHighlight = true } = {}) {
  const product = products.find(item => item.id === productId) || products.find(item => item.name === productId);
  if (!product) return;
  if (highlight) {
    highlightProductCard(product.id || product.name, { scroll: scrollHighlight });
  }
  openOptionsModal(product, { preserveScroll });
}

cartItems.addEventListener("click", event => {
  const minus = event.target.closest("[data-minus]");
  const plus = event.target.closest("[data-plus]");
  if (minus) changeQuantity(minus.dataset.minus, -1);
  if (plus) changeQuantity(plus.dataset.plus, 1);
});

searchInput.addEventListener("input", event => {
  state.query = event.target.value;
  renderProducts();
});

document.querySelector("#clearFilters")?.addEventListener("click", () => {
  state.query = "";
  state.category = "All";
  searchInput.value = "";
  renderCategories();
  renderProducts();
});

document.querySelector("#showAll")?.addEventListener("click", () => {
  state.category = "All";
  renderCategories();
  renderProducts();
});

document.querySelector("#viewDeals")?.addEventListener("click", () => {
  state.category = "All";
  renderCategories();
  renderProducts();
});


supportMenuButton?.addEventListener("click", openSupportModal);
closeSupport?.addEventListener("click", closeSupportModal);
supportModal?.addEventListener("click", event => {
  if (event.target === supportModal) closeSupportModal();
});
installAppButton?.addEventListener("click", triggerInstallPrompt);
supportInstallButton?.addEventListener("click", triggerInstallPrompt);
accountInstallButton?.addEventListener("click", triggerInstallPrompt);
accountInstallButtonSignedIn?.addEventListener("click", triggerInstallPrompt);
installDismissButton?.addEventListener("click", () => {
  setInstallBannerDismissed(true);
  updateInstallUi();
});
googleLogin?.addEventListener("click", startGoogleLogin);
googleLogout?.addEventListener("click", logoutGoogleCustomer);
closeOptions?.addEventListener("click", closeOptionsModal);
optionsModal?.addEventListener("click", event => {
  if (event.target === optionsModal) closeOptionsModal();
});
addOptionProduct?.addEventListener("click", addSelectedOptionProduct);
optionsChoices?.addEventListener("change", () => {
  optionsError.textContent = "";
  updateOptionsSubmitState();
});

document.querySelectorAll(".tab").forEach(tab => {
  tab.addEventListener("click", () => {
    state.mode = tab.dataset.mode;
    document.querySelectorAll(".tab").forEach(item => item.classList.toggle("active", item === tab));
    renderCart();
  });
});

floatingCart.addEventListener("click", () => cartPanel.classList.add("open"));
document.querySelector("#closeCart")?.addEventListener("click", () => cartPanel.classList.remove("open"));
useLocationButton.addEventListener("click", captureLocation);
applyPromoButton?.addEventListener("click", applyPromoCode);
promoCodeInput?.addEventListener("input", () => {
  if (!promoCodeInput.value.trim()) {
    state.promo = null;
    promoStatus.textContent = "Enter a promo code if you have one.";
    renderCart();
  }
});
document.querySelector("#checkoutButton")?.addEventListener("click", () => {
  if (!ensureStoreOpen(true)) return;
  const { total, minimumOrderAmount, minimumOrderMet } = getCartDetails();
  if (total === 0) {
    showToast(t("addProductsFirst"));
    return;
  }
  if (!minimumOrderMet) {
    showToast(`Minimum de commande: ${money(minimumOrderAmount)}`);
    return;
  }
  if (!canDeliverToCurrentLocation(true)) return;
  resetCheckoutSuccess();
  checkoutModal.classList.add("open");
  checkoutModal.setAttribute("aria-hidden", "false");
});

document.querySelector("#closeCheckout")?.addEventListener("click", () => {
  resetCheckoutSuccess();
  checkoutModal.classList.remove("open");
  checkoutModal.setAttribute("aria-hidden", "true");
});

checkoutModal.addEventListener("click", event => {
  if (event.target === checkoutModal) {
    resetCheckoutSuccess();
    checkoutModal.classList.remove("open");
    checkoutModal.setAttribute("aria-hidden", "true");
  }
});

checkoutForm.addEventListener("submit", async event => {
  event.preventDefault();
  if (!ensureStoreOpen(true)) return;
  if (!canDeliverToCurrentLocation(true)) return;
  const formData = new FormData(checkoutForm);
  const cartSummary = getCartDetails();
  if (!cartSummary.minimumOrderMet) {
    showToast(`Minimum de commande: ${money(cartSummary.minimumOrderAmount)}`);
    return;
  }
  const submitButton = checkoutForm.querySelector('button[type="submit"]');
  submitButton?.setAttribute("disabled", "true");
  const originalLabel = submitButton?.textContent || "";
  if (submitButton) submitButton.textContent = "Saving order...";

  try {
    const saved = await saveOrderBeforeWhatsapp(formData, cartSummary);
    const savedOrderId = saved?.order?.id || getCustomerId();
    const message = buildOrderMessage(formData, { orderId: savedOrderId, cartSummary });
    setSavedCustomerPhone(formData.get("customerPhone"));
    const orderHistoryEntry = {
      id: savedOrderId,
      dateLabel: new Date().toLocaleString(),
      total: money(cartSummary.total),
      itemCount: cartSummary.items.reduce((sum, item) => sum + item.quantity, 0),
      mode: state.mode,
      status: localizeOrderStatus(saved?.order?.status || "new"),
      customerName: formData.get("customerName")
    };
    saveOrderToHistory({
      ...orderHistoryEntry
    });
    renderOrderHistory();
    const whatsappNumber = String(state.settings.shopWhatsAppNumber || defaultShopSettings.shopWhatsAppNumber || shopWhatsAppNumber).replace(/[^\d]/g, "");
    const url = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
    openExternalUrl(url);
    state.cart.clear();
    state.promo = null;
    promoCodeInput.value = "";
    promoStatus.textContent = "Enter a promo code if you have one.";
    renderCart();
    showCheckoutSuccess(orderHistoryEntry);
    refreshOrderHistory();
    requestPushPermission("order").catch(error => console.warn("Push permission request after order failed", error));
    showToast(t("openingWhatsapp"));
  } catch (error) {
    console.error(error);
    const message = error?.message === "STORE_CLOSED"
      ? (error.closedMessage || getClosedStoreMessage())
      : "Impossible dâ€™enregistrer la commande. Veuillez rÃ©essayer.";
    showToast(message);
  } finally {
    submitButton?.removeAttribute("disabled");
    if (submitButton) submitButton.textContent = originalLabel || t("sendWhatsapp");
  }
});

successBackHome?.addEventListener("click", () => {
  resetCheckoutSuccess();
  checkoutModal.classList.remove("open");
  checkoutModal.setAttribute("aria-hidden", "true");
  switchView("home");
});

successViewOrders?.addEventListener("click", () => {
  resetCheckoutSuccess();
  checkoutModal.classList.remove("open");
  checkoutModal.setAttribute("aria-hidden", "true");
  switchView("orders");
  renderOrderHistory();
});

refreshOrdersButton?.addEventListener("click", () => {
  refreshOrderHistory();
  showToast("Commandes actualisees");
});

ordersList?.addEventListener("click", event => {
  const reorderButton = event.target.closest("[data-reorder]");
  if (reorderButton) {
    const order = getDisplayedOrderHistory().find(item => String(item.id) === String(reorderButton.dataset.reorder));
    refillCartFromOrder(order);
    return;
  }
  const detailsButton = event.target.closest("[data-open-order]");
  if (detailsButton) {
    openOrderDetails(detailsButton.dataset.openOrder);
    return;
  }
  const card = event.target.closest("[data-order-card]");
  if (card) {
    openOrderDetails(card.dataset.orderCard);
  }
});

ordersList?.addEventListener("keydown", event => {
  const card = event.target.closest("[data-order-card]");
  if (!card) return;
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    openOrderDetails(card.dataset.orderCard);
  }
});

closeOrderDetails?.addEventListener("click", closeOrderDetailsModal);
orderDetailsClose?.addEventListener("click", closeOrderDetailsModal);
orderDetailsModal?.addEventListener("click", event => {
  if (event.target === orderDetailsModal) closeOrderDetailsModal();
});
orderDetailsReorder?.addEventListener("click", () => {
  if (!selectedOrderDetails) return;
  refillCartFromOrder(selectedOrderDetails);
  closeOrderDetailsModal();
});
orderDetailsWhatsapp?.addEventListener("click", () => {
  if (!selectedOrderDetails) return;
  const whatsappNumber = String(state.settings.shopWhatsAppNumber || defaultShopSettings.shopWhatsAppNumber || shopWhatsAppNumber).replace(/[^\d]/g, "");
  openExternalUrl(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(`Bonjour, j'ai une question sur la commande #${selectedOrderDetails.id}.`)}`);
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}

window.addEventListener("beforeinstallprompt", event => {
  event.preventDefault();
  deferredInstallPrompt = event;
  setInstallBannerDismissed(false);
  updateInstallUi();
});

window.addEventListener("appinstalled", () => {
  deferredInstallPrompt = null;
  setInstallBannerDismissed(true);
  updateInstallUi();
  showToast("Application installee");
});

window.addEventListener("error", event => {
  console.error("Startup error:", event.error || event.message || event);
  hideSplashScreen();
});

window.addEventListener("unhandledrejection", event => {
  console.error("Unhandled startup rejection:", event.reason || event);
  hideSplashScreen();
});


splashScreen?.addEventListener("animationend", event => {
  if (event.target === splashScreen && event.animationName === "splashOut") {
    hideSplashScreen();
  }
});

armSplashFailsafe();

async function bootstrapApp() {
  try {
    initLanguageChoice();
    switchView("home");
    renderCategories();
    renderProducts();
    renderCart();
    renderOrderHistory();
    updateStoreHoursStatus();
    setInterval(updateStoreHoursStatus, 60000);
    setInterval(() => {
      if (state.currentView === "orders") {
        refreshOrderHistory();
      }
    }, 10000);
    updateInstallUi();
    initFirebaseAuth();
    await loadMenu();
  } catch (error) {
    console.error("Bootstrap failed:", error);
    hideSplashScreen();
  }
}

bootstrapApp();
