/* =============================================
   ONLINE CROP MARKET - Main JavaScript
   ============================================= */

// ── Data: Crops ──
const CROPS = [
  {
    id: 1, name: "Sweet Maize", category: "grains", price: 45, unit: "per 50kg bag",
    farmer: "John Banda", location: "Lusaka Province",
    desc: "Sun-dried, freshly harvested maize from the fertile soils of Lusaka Province. High starch, perfect for milling.",
    badge: "Fresh", organic: false,
    img: "https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=600&q=80"
  },
  {
    id: 2, name: "Ripe Tomatoes", category: "vegetables", price: 30, unit: "per 20kg crate",
    farmer: "Grace Mwale", location: "Copperbelt Province",
    desc: "Plump, vine-ripened tomatoes, carefully selected for freshness. Ideal for sauces, salads, and cooking.",
    badge: "Organic", organic: true,
    img: "images/tomatoes.png"
  },
  {
    id: 3, name: "Irish Potatoes", category: "tubers", price: 55, unit: "per 50kg bag",
    farmer: "Moses Zulu", location: "Northern Province",
    desc: "Premium Irish potatoes from cool highland farms. Smooth skin, creamy flesh — great for any recipe.",
    badge: "Fresh", organic: false,
    img: "https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=600&q=80"
  },
  {
    id: 4, name: "Basmati Rice", category: "grains", price: 120, unit: "per 25kg bag",
    farmer: "Fatuma Phiri", location: "Western Province",
    desc: "Aromatic, long-grain rice grown in fertile river valleys. Fluffy texture and exquisite aroma.",
    badge: "Premium", organic: false,
    img: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600&q=80"
  },
  {
    id: 5, name: "Kidney Beans", category: "legumes", price: 80, unit: "per 25kg bag",
    farmer: "Peter Tembo", location: "Eastern Province",
    desc: "Nutrient-rich kidney beans, sun-dried and hand-sorted. High protein, great for traditional stews.",
    badge: "Organic", organic: true,
    img: "https://images.pexels.com/photos/4197928/pexels-photo-4197928.jpeg?auto=compress&cs=tinysrgb&w=600"
  },
  {
    id: 6, name: "Groundnuts", category: "legumes", price: 65, unit: "per 25kg bag",
    farmer: "Mary Nkosi", location: "Central Province",
    desc: "Raw, unsalted groundnuts grown in well-drained sandy loam soils. Perfect for peanut butter and relishes.",
    badge: "Fresh", organic: false,
    img: "https://images.unsplash.com/photo-1599599810769-bcde5a160d32?w=600&q=80"
  },
  {
    id: 7, name: "Red Onions", category: "vegetables", price: 25, unit: "per 10kg bag",
    farmer: "James Lungu", location: "Southern Province",
    desc: "Pungent, firm red onions. Adds bold flavour to any dish. Naturally grown without pesticides.",
    badge: "Organic", organic: true,
    img: "https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=600&q=80"
  },
  {
    id: 8, name: "Green Cabbage", category: "vegetables", price: 20, unit: "per head",
    farmer: "Rose Chileshe", location: "Lusaka Province",
    desc: "Tightly-packed, crisp cabbage heads. Freshly harvested and naturally grown on smallholder farms.",
    badge: "Fresh", organic: false,
    img: "https://images.unsplash.com/photo-1594282486552-05b4d80fbb9f?w=600&q=80"
  }
];

function normalizeMarketplaceCrop(c) {
  return {
    id: c.id,
    name: c.name,
    category: (c.category || "grains").toLowerCase(),
    price: Number(c.price) || 0,
    unit: c.unit || "per unit",
    farmer: c.farmer || "Verified Farmer",
    location: c.location || "Zambia",
    desc: c.desc || c.description || "",
    badge: c.badge || "Fresh",
    organic: Boolean(c.organic),
    img: c.img || c.image || "https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=600&q=80"
  };
}

function getAllFarmerListings() {
  const listings = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith("ocm-crops-")) continue;
    let crops;
    try {
      crops = JSON.parse(localStorage.getItem(key) || "[]");
    } catch {
      continue;
    }
    if (!Array.isArray(crops)) continue;
    crops.forEach(c => {
      if (c.status && c.status !== "active") return;
      listings.push(normalizeMarketplaceCrop(c));
    });
  }
  return listings;
}

function getMarketplaceCrops() {
  if (OCM_USE_API && apiCatalog && apiCatalog.length) return apiCatalog;
  const seen = new Set();
  const merged = [];
  const add = (crop) => {
    const normalized = normalizeMarketplaceCrop(crop);
    const key = String(normalized.id);
    if (seen.has(key)) return;
    seen.add(key);
    merged.push(normalized);
  };
  CROPS.forEach(add);
  getAllFarmerListings().forEach(add);
  return merged;
}

function findCropById(id) {
  return getMarketplaceCrops().find(c => String(c.id) === String(id));
}

let apiCatalog = null;
let OCM_USE_API = false;

async function bootstrapApi() {
  if (typeof OcmApi === "undefined") return;
  try {
    await OcmApi.ping();
    OCM_USE_API = true;
    apiCatalog = await OcmApi.getCrops();
    if (localStorage.getItem("ocm-token")) {
      try {
        const user = await OcmApi.me();
        localStorage.setItem("ocm-current-user", JSON.stringify(user));
      } catch {
        localStorage.removeItem("ocm-token");
      }
    }
  } catch (err) {
    OCM_USE_API = false;
    console.info("Django API unavailable — using browser demo storage.", err.message);
  }
}

async function refreshApiCatalog() {
  if (!OCM_USE_API) return;
  apiCatalog = await OcmApi.getCrops();
}

function getFeaturedCrops(limit = 4) {
  return [...getMarketplaceCrops()]
    .sort((a, b) => Number(b.id) - Number(a.id))
    .slice(0, limit);
}

// ── Data: Farmers ──
const FARMERS = [
  { name: "John Banda", location: "Lusaka Province", crops: 12, img: "https://images.unsplash.com/photo-1605000797499-95a51c5269ae?w=400&q=80", rating: 4.8 },
  { name: "Grace Mwale", location: "Copperbelt", crops: 8, img: "https://images.pexels.com/photos/6164287/pexels-photo-6164287.jpeg?auto=compress&cs=tinysrgb&w=400", rating: 4.9 },
  { name: "Moses Zulu", location: "Northern Province", crops: 15, img: "https://images.pexels.com/photos/2889443/pexels-photo-2889443.jpeg?auto=compress&cs=tinysrgb&w=400", rating: 4.7 },
  { name: "Fatuma Phiri", location: "Western Province", crops: 6, img: "https://images.unsplash.com/photo-1595435742656-5272d0b3fa82?w=400&q=80", rating: 5.0 }
];

// ── Data: Testimonials ──
const TESTIMONIALS = [
  { text: "Online Crop Market has completely transformed how I sell my produce. I no longer have to travel to town — buyers come to me. My income has doubled this season!", name: "John Banda", role: "Maize Farmer, Lusaka", rating: 5, img: "https://images.unsplash.com/photo-1605000797499-95a51c5269ae?w=200&q=80" },
  { text: "As a mother feeding a family of six, I love how easy it is to order fresh vegetables delivered to my door. Quality is always excellent and prices are fair.", name: "Namukolo Mwanza", role: "Customer, Kitwe", rating: 5, img: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=200&q=80" },
  { text: "I run a small restaurant and Online Crop Market has become my primary supplier. The produce is always fresh and I can compare multiple farmers to get the best deals.", name: "Samuel Phiri", role: "Restaurant Owner, Ndola", rating: 5, img: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80" }
];

// ── Utility Functions ──
function $(sel, ctx = document) { return ctx.querySelector(sel); }
function $$(sel, ctx = document) { return [...ctx.querySelectorAll(sel)]; }
function qs(sel) { return document.querySelector(sel); }

function showToast(message, type = "success") {
  const container = document.getElementById("toast-container") || createToastContainer();
  const toast = document.createElement("div");
  const icons = {
    success: '<i class="fa-solid fa-circle-check"></i>',
    error: '<i class="fa-solid fa-circle-xmark"></i>',
    info: '<i class="fa-solid fa-circle-info"></i>'
  };
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span class="toast-icon">${icons[type] || icons.success}</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => { toast.classList.add("removing"); setTimeout(() => toast.remove(), 300); }, 3000);
}

function createToastContainer() {
  const div = document.createElement("div");
  div.id = "toast-container";
  document.body.appendChild(div);
  return div;
}

// ── Dark Mode ──
function initTheme() {
  const saved = localStorage.getItem("ocm-theme") || "light";
  document.documentElement.setAttribute("data-theme", saved);
  updateThemeToggleIcons(saved);
}

function toggleTheme() {
  const curr = document.documentElement.getAttribute("data-theme");
  const next = curr === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("ocm-theme", next);
  updateThemeToggleIcons(next);
}

function updateThemeToggleIcons(theme) {
  const icon = theme === "dark" ? "fa-sun" : "fa-moon";
  $$(".theme-toggle").forEach(btn => {
    btn.innerHTML = `<i class="fa-solid ${icon}" aria-hidden="true"></i>`;
  });
}

// ── Cart ──
function getCart() { return JSON.parse(localStorage.getItem("ocm-cart") || "[]"); }
function saveCart(cart) { localStorage.setItem("ocm-cart", JSON.stringify(cart)); updateCartBadge(); }

async function addToCart(cropId) {
  const crop = findCropById(cropId);
  if (!crop) return;
  if (OCM_USE_API && localStorage.getItem("ocm-token")) {
    try {
      await OcmApi.addToCart(cropId, 1);
      await syncCartBadgeFromApi();
      showToast(`${crop.name} added to cart`);
      return;
    } catch (err) {
      showToast(err.message || "Could not add to cart.", "error");
      return;
    }
  }
  const cart = getCart();
  const existing = cart.find(i => i.id === cropId);
  if (existing) { existing.qty += 1; }
  else { cart.push({ ...crop, qty: 1 }); }
  saveCart(cart);
  showToast(`${crop.name} added to cart`);
}

function removeFromCart(cropId) {
  let cart = getCart().filter(i => i.id !== cropId);
  saveCart(cart);
}

function updateQty(cropId, delta) {
  const cart = getCart();
  const item = cart.find(i => i.id === cropId);
  if (!item) return;
  item.qty = Math.max(1, item.qty + delta);
  saveCart(cart);
}

function getCartTotal() {
  return getCart().reduce((sum, i) => sum + i.price * i.qty, 0);
}

function getDeliveryFee(subtotal = getCartTotal()) {
  return subtotal > 0 ? 25 : 0;
}

function getPromoDiscount(subtotal = getCartTotal()) {
  if (subtotal <= 0) return 0;
  const promo = localStorage.getItem("ocm-promo");
  if (promo === "FRESH10") return Math.round(subtotal * 0.1);
  return 0;
}

function getPlatformFee(subtotal = getCartTotal()) {
  const afterPromo = Math.max(0, subtotal - getPromoDiscount(subtotal));
  return afterPromo > 0 ? Math.round(afterPromo * 0.05) : 0;
}

function getOrderTotal(subtotal = getCartTotal()) {
  const discount = getPromoDiscount(subtotal);
  const afterPromo = Math.max(0, subtotal - discount);
  return afterPromo + getDeliveryFee(afterPromo) + getPlatformFee(subtotal);
}

function getCartCount() {
  return getCart().reduce((sum, i) => sum + i.qty, 0);
}

function updateCartBadge() {
  const count = getCartCount();
  $$(".cart-badge").forEach(el => { el.textContent = count; el.style.display = count > 0 ? "grid" : "none"; });
}

// ── Navbar scroll ──
function initNavbar() {
  const nav = document.getElementById("navbar");
  if (!nav) return;
  const onScroll = () => { nav.classList.toggle("scrolled", window.scrollY > 40); };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
}

// ── Mobile Menu ──
function initMobileMenu() {
  const hamburger = document.querySelector(".hamburger");
  const menu = document.querySelector(".mobile-menu");
  if (!hamburger || !menu) return;
  hamburger.addEventListener("click", () => menu.classList.toggle("open"));
  menu.querySelectorAll("a").forEach(a => a.addEventListener("click", () => menu.classList.remove("open")));
}

// ── FAQ Accordion ──
function initFAQ() {
  $$(".faq-item").forEach(item => {
    const q = item.querySelector(".faq-q");
    if (!q) return;
    q.addEventListener("click", () => {
      const wasOpen = item.classList.contains("open");
      $$(".faq-item.open").forEach(o => o.classList.remove("open"));
      if (!wasOpen) item.classList.add("open");
    });
  });
}

// ── Fade-in on scroll ──
function initFadeIn() {
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add("visible"); io.unobserve(e.target); } });
  }, { threshold: 0.1 });
  $$(".fade-in").forEach(el => io.observe(el));
}

// ── Products Grid (used on products.html and index.html) ──
function renderProducts(container, crops, limit = null) {
  if (!container) return;
  const list = limit ? crops.slice(0, limit) : crops;
  container.innerHTML = list.map(c => `
    <div class="product-card fade-in" data-category="${c.category}" data-crop-id="${c.id}">
      <div class="product-img-wrap">
        <img src="${c.img}" alt="${c.name}" loading="lazy">
        <span class="product-badge ${c.organic ? 'organic' : ''}">${c.badge}</span>
        <button class="wishlist-btn" onclick="this.classList.toggle('active'); showToast('Wishlist updated','info')" title="Wishlist"><i class="fa-regular fa-heart"></i></button>
      </div>
      <div class="product-info">
        <div class="product-farmer"><i class="fa-solid fa-wheat-awn"></i> ${c.farmer} · ${c.location}</div>
        <div class="product-name">${c.name}</div>
        <div class="product-desc">${c.desc}</div>
        <div class="product-footer">
          <div class="product-price">ZMW ${c.price} <span>/ ${c.unit}</span></div>
          <button class="add-cart-btn" onclick="addToCart(${c.id})"><i class="fa-solid fa-cart-plus"></i> Add</button>
        </div>
      </div>
    </div>
  `).join("");
  initFadeIn();
}

// ── Filter & Search (products page) ──
function initProductFilters() {
  const grid = document.getElementById("products-grid");
  if (!grid) return;

  let activeCategory = "all";
  let searchQuery = "";

  const params = new URLSearchParams(window.location.search);
  if (params.get("organic") === "1") activeCategory = "organic";
  else if (params.get("category")) activeCategory = params.get("category").toLowerCase();

  function filterAndRender() {
    let filtered = getMarketplaceCrops();
    if (activeCategory === "organic") {
      filtered = filtered.filter(c => c.organic);
    } else if (activeCategory !== "all") {
      filtered = filtered.filter(c => c.category === activeCategory);
    }
    if (searchQuery) filtered = filtered.filter(c =>
      c.name.toLowerCase().includes(searchQuery) ||
      c.desc.toLowerCase().includes(searchQuery) ||
      c.farmer.toLowerCase().includes(searchQuery)
    );
    renderProducts(grid, filtered);
    const countEl = document.getElementById("result-count");
    if (countEl) {
      countEl.textContent = `${filtered.length} crop${filtered.length === 1 ? "" : "s"} found`;
    }
  }

  $$(".filter-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      $$(".filter-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      activeCategory = btn.dataset.filter;
      filterAndRender();
    });
  });

  const searchInput = document.getElementById("crop-search");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      searchQuery = e.target.value.toLowerCase();
      filterAndRender();
    });
  }

  if (activeCategory !== "all") {
    $$(".filter-btn").forEach(b => {
      b.classList.toggle("active", b.dataset.filter === activeCategory);
    });
  }

  filterAndRender();
}

// ── Testimonials Render ──
function renderTestimonials(container) {
  if (!container) return;
  container.innerHTML = TESTIMONIALS.map(t => `
    <div class="testi-card fade-in">
      <div class="testi-stars">${Array(t.rating).fill('<i class="fa-solid fa-star"></i>').join("")}</div>
      <p class="testi-text">"${t.text}"</p>
      <div class="testi-author">
        <img src="${t.img}" alt="${t.name}" loading="lazy">
        <div>
          <div class="name">${t.name}</div>
          <div class="role">${t.role}</div>
        </div>
      </div>
    </div>
  `).join("");
}

// ── Featured Farmers Render ──
function renderFeaturedFarmers(container) {
  if (!container) return;
  container.innerHTML = FARMERS.map(f => `
    <div class="farmer-card fade-in">
      <div class="farmer-card-img">
        <img src="${f.img}" alt="${f.name}" loading="lazy">
      </div>
      <div class="farmer-card-info">
        <div class="fname">${f.name}</div>
        <div class="floc"><i class="fa-solid fa-location-dot"></i> ${f.location}</div>
        <div class="fstat"><i class="fa-solid fa-star"></i> ${f.rating} · ${f.crops} crop listings</div>
      </div>
    </div>
  `).join("");
}

// ── Newsletter ──
function initNewsletter() {
  const form = document.querySelector(".newsletter-form");
  if (!form) return;
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = form.querySelector("input").value;
    if (!email) return;
    showToast("You're subscribed! Welcome to our farming community.");
    form.reset();
  });
}

function initContactForm() {
  const form = document.querySelector(".contact-form");
  if (!form || form.dataset.bound) return;
  form.dataset.bound = "1";
  const sendBtn = form.querySelector("button");
  if (sendBtn) {
    sendBtn.addEventListener("click", () => {
      showToast("Message sent! We will respond within 24 hours.");
      form.querySelectorAll("input, textarea").forEach(el => { el.value = ""; });
    });
  }
}

function initForgotPassword() {
  const link = document.querySelector(".forgot-password-link");
  if (!link || link.dataset.bound) return;
  link.dataset.bound = "1";
  link.addEventListener("click", async (e) => {
    e.preventDefault();
    const email = document.querySelector("#login-form [name=email]")?.value?.trim();
    if (!email || !email.includes("@")) {
      showToast("Enter your email above, then request a reset link.", "error");
      return;
    }
    if (typeof OcmApi === "undefined" || !OCM_USE_API) {
      showToast("Start the Django server to send password reset emails.", "error");
      return;
    }
    try {
      const res = await OcmApi.requestPasswordReset(email);
      showToast(res.detail || "Check your email for reset instructions.", "info");
      if (res.reset_link) {
        console.info("Password reset link (DEBUG):", res.reset_link);
        showToast("Dev mode: reset link printed in the browser console.", "info");
      }
    } catch (err) {
      showToast(err.message || "Could not send reset email.", "error");
    }
  });
}

function initResetPasswordPage() {
  const form = document.getElementById("reset-password-form");
  if (!form || form.dataset.bound) return;
  form.dataset.bound = "1";
  const params = new URLSearchParams(window.location.search);
  const uid = params.get("uid");
  const token = params.get("token");
  if (!uid || !token) {
    showToast("Invalid or missing reset link.", "error");
    return;
  }
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const password = form.querySelector("[name=password]").value;
    const confirm = form.querySelector("[name=confirm]").value;
    if (!OCM_USE_API) {
      showToast("Start the Django server to reset your password.", "error");
      return;
    }
    try {
      await OcmApi.confirmPasswordReset({ uid, token, password, confirm });
      showToast("Password updated. Sign in with your new password.");
      setTimeout(() => { window.location.href = "login.html"; }, 1400);
    } catch (err) {
      showToast(err.message || "Reset failed.", "error");
    }
  });
}

function initPromoCode() {
  const applyBtn = document.getElementById("promo-apply-btn");
  const input = document.getElementById("promo-code-input");
  if (!applyBtn || !input || applyBtn.dataset.bound) return;
  applyBtn.dataset.bound = "1";
  applyBtn.addEventListener("click", async () => {
    const code = input.value.trim().toUpperCase();
    if (OCM_USE_API && localStorage.getItem("ocm-token")) {
      try {
        await OcmApi.applyPromo(code);
        showToast(code === "FRESH10" ? "Promo applied: 10% off your order." : "Promo cleared.");
        await renderCartPage();
      } catch (err) {
        showToast(err.message || "Invalid promo code.", "error");
      }
      return;
    }
    if (code === "FRESH10") {
      localStorage.setItem("ocm-promo", "FRESH10");
      showToast("Promo applied: 10% off your order.");
      renderCartPage();
    } else {
      localStorage.removeItem("ocm-promo");
      showToast("Invalid promo code.", "error");
    }
  });
}

function initModalOverlays() {
  $$(".modal-overlay").forEach(overlay => {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) overlay.classList.remove("open");
    });
  });
}

function initDashboardPlaceholders() {
  $$(".sidebar-link[data-soon]").forEach(link => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      showToast(`${link.dataset.soon} — coming in a future update.`, "info");
    });
  });
}

// ── Auth Forms ──
function setAccountType(type) {
  const btns = $$(".account-type-btn");
  const target = btns.find(b => b.dataset.type === type);
  if (!target) return;
  btns.forEach(b => b.classList.remove("active"));
  target.classList.add("active");
  const farmerFields = document.getElementById("farmer-fields");
  if (farmerFields) {
    farmerFields.style.display = type === "farmer" ? "block" : "none";
  }
}

function initAccountTypeToggle() {
  $$(".account-type-btn").forEach(btn => {
    btn.addEventListener("click", () => setAccountType(btn.dataset.type));
  });
  const queryType = new URLSearchParams(window.location.search).get("type");
  if (queryType === "farmer" || queryType === "customer") {
    setAccountType(queryType);
  }
}

function initAuthNav() {
  const user = getCurrentUser();
  if (!user) return;
  const updateLink = (link) => {
    const role = user.type || user.role;
    if (role === "farmer") {
      link.textContent = "Dashboard";
      link.href = "farmer-dashboard.html";
    } else {
      link.textContent = user.fullname?.split(" ")[0] || "Account";
      link.href = "orders.html";
    }
  };
  $$(".nav-actions a.btn-primary.btn-sm").forEach(link => {
    if (!link.getAttribute("href")?.includes("login.html")) return;
    updateLink(link);
  });
  $$(".mobile-menu a[href='login.html']").forEach(updateLink);
}

function initPasswordToggle() {
  $$(".eye-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const input = btn.previousElementSibling;
      if (!input) return;
      const isText = input.type === "text";
      input.type = isText ? "password" : "text";
      btn.innerHTML = isText
        ? '<i class="fa-solid fa-eye" aria-hidden="true"></i>'
        : '<i class="fa-solid fa-eye-slash" aria-hidden="true"></i>';
    });
  });
}

function initProfileUpload() {
  $$(".upload-circle").forEach(wrap => {
    const input = wrap.querySelector("input");
    const img = wrap.querySelector("img");
    if (!input || !img) return;
    input.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        img.src = ev.target.result;
        wrap.classList.add("has-img");
      };
      reader.readAsDataURL(file);
    });
  });
}

function validateLoginForm(form) {
  const email = form.querySelector("[name=email]")?.value?.trim();
  const pass  = form.querySelector("[name=password]")?.value;
  if (!email || !email.includes("@")) { showToast("Please enter a valid email.", "error"); return false; }
  if (!pass || pass.length < 6) { showToast("Password must be at least 6 characters.", "error"); return false; }
  return true;
}

function validateRegisterForm(form) {
  const name  = form.querySelector("[name=fullname]")?.value?.trim();
  const email = form.querySelector("[name=email]")?.value?.trim();
  const pass  = form.querySelector("[name=password]")?.value;
  const conf  = form.querySelector("[name=confirm]")?.value;
  if (!name)  { showToast("Please enter your full name.", "error"); return false; }
  if (!email || !email.includes("@")) { showToast("Please enter a valid email.", "error"); return false; }
  if (!pass || pass.length < 6) { showToast("Password must be at least 6 characters.", "error"); return false; }
  if (pass !== conf) { showToast("Passwords do not match.", "error"); return false; }
  return true;
}

function saveUser(data) {
  const users = JSON.parse(localStorage.getItem("ocm-users") || "[]");
  if (users.find(u => u.email === data.email)) {
    showToast("Email already registered.", "error"); return false;
  }
  users.push(data);
  localStorage.setItem("ocm-users", JSON.stringify(users));
  localStorage.setItem("ocm-current-user", JSON.stringify(data));
  return true;
}

function loginUser(email, password) {
  const users = JSON.parse(localStorage.getItem("ocm-users") || "[]");
  // Demo users
  const demoUsers = [
    { email: "farmer@demo.com", password: "123456", fullname: "John Banda", type: "farmer", img: "https://images.unsplash.com/photo-1605000797499-95a51c5269ae?w=200&q=80" },
    { email: "buyer@demo.com",  password: "123456", fullname: "Namukolo Mwanza", type: "customer", img: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=200&q=80" }
  ];
  const allUsers = [...demoUsers, ...users];
  const user = allUsers.find(u => u.email === email && u.password === password);
  if (!user) { showToast("Invalid email or password.", "error"); return false; }
  localStorage.setItem("ocm-current-user", JSON.stringify(user));
  return user;
}

function getCurrentUser() {
  return JSON.parse(localStorage.getItem("ocm-current-user") || "null");
}

async function logout() {
  if (OCM_USE_API && localStorage.getItem("ocm-token")) {
    await OcmApi.logout();
  } else {
    localStorage.removeItem("ocm-current-user");
  }
  window.location.href = "index.html";
}

// ── Cart Page Render ──
async function syncCartBadgeFromApi() {
  if (!OCM_USE_API || !localStorage.getItem("ocm-token")) return;
  try {
    const cart = await OcmApi.getCart();
    const count = (cart.items || []).reduce((s, i) => s + i.quantity, 0);
    $$(".cart-badge").forEach(el => { el.textContent = count; el.style.display = count > 0 ? "grid" : "none"; });
  } catch { /* ignore */ }
}

async function renderCartPage() {
  const cartItemsEl = document.getElementById("cart-items");
  const cartOrderPanel = document.getElementById("cart-order-panel");
  const cartContinueEl = document.getElementById("cart-continue-shopping");
  const checkoutLink = document.getElementById("cart-checkout-link");
  const emptyEl = document.getElementById("empty-cart");
  if (!cartItemsEl) return;

  if (OCM_USE_API && localStorage.getItem("ocm-token")) {
    try {
      const cartData = await OcmApi.getCart();
      const summary = cartData.summary || {};
      const items = cartData.items || [];
      if (!items.length) {
        if (emptyEl) emptyEl.style.display = "block";
        cartItemsEl.style.display = "none";
        if (cartOrderPanel) cartOrderPanel.style.display = "none";
        if (cartContinueEl) cartContinueEl.style.display = "none";
        return;
      }
      if (emptyEl) emptyEl.style.display = "none";
      cartItemsEl.style.display = "block";
      if (cartOrderPanel) cartOrderPanel.style.display = "block";
      if (cartContinueEl) cartContinueEl.style.display = "block";
      cartItemsEl.innerHTML = items.map(({ crop, quantity }) => `
        <div class="cart-item" id="cart-item-${crop.id}">
          <img src="${crop.img}" alt="${crop.name}" class="cart-item-img">
          <div class="cart-item-info">
            <div class="cart-item-name">${crop.name}</div>
            <div class="cart-item-price">ZMW ${crop.price} ${crop.unit}</div>
            <div style="font-size:.78rem;color:var(--text-light);margin-top:2px"><i class="fa-solid fa-wheat-awn"></i> ${crop.farmer}</div>
          </div>
          <div class="qty-controls">
            <button class="qty-btn" onclick="updateQtyAndRefresh(${crop.id}, -1)" aria-label="Decrease quantity"><i class="fa-solid fa-minus"></i></button>
            <span class="qty-num">${quantity}</span>
            <button class="qty-btn" onclick="updateQtyAndRefresh(${crop.id}, 1)" aria-label="Increase quantity"><i class="fa-solid fa-plus"></i></button>
          </div>
          <div style="font-weight:700;color:var(--green-700);min-width:80px;text-align:right">
            ZMW ${(Number(crop.price) * quantity).toLocaleString()}
          </div>
          <button class="remove-btn" onclick="removeAndRefresh(${crop.id})" aria-label="Remove item"><i class="fa-solid fa-trash-can"></i></button>
        </div>
      `).join("");
      $$(".cart-subtotal").forEach(el => el.textContent = `ZMW ${Number(summary.subtotal).toLocaleString()}`);
      $$(".cart-delivery").forEach(el => el.textContent = Number(summary.delivery_fee) > 0 ? `ZMW ${summary.delivery_fee}` : "Free");
      $$(".cart-fee").forEach(el => el.textContent = Number(summary.platform_fee) > 0 ? `ZMW ${summary.platform_fee}` : "—");
      $$(".cart-total").forEach(el => el.textContent = `ZMW ${Number(summary.total).toLocaleString()}`);
      $$(".cart-discount").forEach(el => {
        const line = el.closest(".summary-line");
        const discount = Number(summary.discount || 0);
        if (discount > 0) {
          el.textContent = `- ZMW ${discount.toLocaleString()}`;
          line?.classList.remove("hidden-line");
        } else {
          el.textContent = "—";
          line?.classList.add("hidden-line");
        }
      });
      await syncCartBadgeFromApi();
      return;
    } catch (err) {
      showToast(err.message || "Could not load cart.", "error");
    }
  }

  const cart = getCart();

  if (cart.length === 0) {
    if (emptyEl) emptyEl.style.display = "block";
    if (cartItemsEl) cartItemsEl.style.display = "none";
    if (cartOrderPanel) cartOrderPanel.style.display = "none";
    if (cartContinueEl) cartContinueEl.style.display = "none";
    return;
  }

  if (emptyEl) emptyEl.style.display = "none";
  if (cartItemsEl) cartItemsEl.style.display = "block";
  if (cartOrderPanel) cartOrderPanel.style.display = "block";
  if (cartContinueEl) cartContinueEl.style.display = "block";

  cartItemsEl.innerHTML = cart.map(item => `
    <div class="cart-item" id="cart-item-${item.id}">
      <img src="${item.img}" alt="${item.name}" class="cart-item-img">
      <div class="cart-item-info">
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-price">ZMW ${item.price} ${item.unit}</div>
        <div style="font-size:.78rem;color:var(--text-light);margin-top:2px"><i class="fa-solid fa-wheat-awn"></i> ${item.farmer}</div>
      </div>
      <div class="qty-controls">
        <button class="qty-btn" onclick="updateQtyAndRefresh(${item.id}, -1)" aria-label="Decrease quantity"><i class="fa-solid fa-minus"></i></button>
        <span class="qty-num">${item.qty}</span>
        <button class="qty-btn" onclick="updateQtyAndRefresh(${item.id}, 1)" aria-label="Increase quantity"><i class="fa-solid fa-plus"></i></button>
      </div>
      <div style="font-weight:700;color:var(--green-700);min-width:80px;text-align:right">
        ZMW ${(item.price * item.qty).toLocaleString()}
      </div>
      <button class="remove-btn" onclick="removeAndRefresh(${item.id})" aria-label="Remove item"><i class="fa-solid fa-trash-can"></i></button>
    </div>
  `).join("");

  const subtotal = getCartTotal();
  const discount = getPromoDiscount(subtotal);
  const afterPromo = Math.max(0, subtotal - discount);
  const delivery = getDeliveryFee(afterPromo);
  const fee = getPlatformFee(subtotal);
  const total = getOrderTotal(subtotal);

  $$(".cart-subtotal").forEach(el => el.textContent = `ZMW ${subtotal.toLocaleString()}`);
  $$(".cart-discount").forEach(el => {
    const line = el.closest(".summary-line");
    if (discount > 0) {
      el.textContent = `- ZMW ${discount.toLocaleString()}`;
      line?.classList.remove("hidden-line");
    } else {
      el.textContent = "—";
      line?.classList.add("hidden-line");
    }
  });
  $$(".cart-delivery").forEach(el => el.textContent = delivery > 0 ? `ZMW ${delivery}` : "Free");
  $$(".cart-fee").forEach(el => el.textContent = fee > 0 ? `ZMW ${fee.toLocaleString()}` : "—");
  $$(".cart-total").forEach(el => el.textContent = `ZMW ${total.toLocaleString()}`);
  if (checkoutLink) {
    checkoutLink.classList.remove("disabled");
    checkoutLink.removeAttribute("aria-disabled");
  }
}

async function initCheckoutPage() {
  if (OCM_USE_API && !localStorage.getItem("ocm-token")) {
    showToast("Sign in to checkout with your account.", "info");
    setTimeout(() => { window.location.href = "login.html?next=checkout.html"; }, 900);
    return;
  }
  if (OCM_USE_API && localStorage.getItem("ocm-token")) {
    try {
      const cart = await OcmApi.getCart();
      if (!(cart.items || []).length) {
        showToast("Your cart is empty. Add crops before checkout.", "info");
        setTimeout(() => { window.location.href = "cart.html"; }, 800);
      }
    } catch (err) {
      showToast(err.message || "Could not load cart.", "error");
    }
    return;
  }
  if (getCart().length === 0) {
    showToast("Your cart is empty. Add crops before checkout.", "info");
    setTimeout(() => { window.location.href = "cart.html"; }, 800);
  }
}

async function updateQtyAndRefresh(id, delta) {
  if (OCM_USE_API && localStorage.getItem("ocm-token")) {
    await OcmApi.updateCartItem(id, delta);
    await renderCartPage();
    return;
  }
  updateQty(id, delta);
  renderCartPage();
}
async function removeAndRefresh(id) {
  if (OCM_USE_API && localStorage.getItem("ocm-token")) {
    await OcmApi.removeCartItem(id);
    await renderCartPage();
    showToast("Item removed from cart.", "info");
    return;
  }
  removeFromCart(id);
  renderCartPage();
  showToast("Item removed from cart.", "info");
}

// ── Checkout Page ──
async function renderOrderSummary() {
  const container = document.getElementById("order-items");
  if (!container) return;

  if (OCM_USE_API && localStorage.getItem("ocm-token")) {
    try {
      const cartData = await OcmApi.getCart();
      const summary = cartData.summary || {};
      const items = cartData.items || [];
      container.innerHTML = items.map(({ crop, quantity }) => `
        <div class="order-item">
          <img src="${crop.img}" alt="${crop.name}">
          <div class="order-item-info">
            <div class="oname">${crop.name}</div>
            <div class="oqty">x${quantity} · ${crop.unit}</div>
          </div>
          <div class="order-item-price">ZMW ${(Number(crop.price) * quantity).toLocaleString()}</div>
        </div>
      `).join("");
      $$(".order-subtotal").forEach(el => el.textContent = `ZMW ${Number(summary.subtotal).toLocaleString()}`);
      $$(".order-discount").forEach(el => {
        const line = el.closest(".summary-line");
        const discount = Number(summary.discount || 0);
        if (discount > 0) {
          el.textContent = `- ZMW ${discount.toLocaleString()}`;
          line?.classList.remove("hidden-line");
        } else {
          el.textContent = "—";
          line?.classList.add("hidden-line");
        }
      });
      $$(".order-delivery").forEach(el => el.textContent = Number(summary.delivery_fee) > 0 ? `ZMW ${summary.delivery_fee}` : "Free");
      $$(".order-fee").forEach(el => el.textContent = Number(summary.platform_fee) > 0 ? `ZMW ${summary.platform_fee}` : "—");
      $$(".order-total").forEach(el => el.textContent = `ZMW ${Number(summary.total).toLocaleString()}`);
    } catch (err) {
      showToast(err.message || "Could not load order summary.", "error");
    }
    return;
  }

  const cart = getCart();
  const subtotal = getCartTotal();
  container.innerHTML = cart.map(item => `
    <div class="order-item">
      <img src="${item.img}" alt="${item.name}">
      <div class="order-item-info">
        <div class="oname">${item.name}</div>
        <div class="oqty">x${item.qty} · ${item.unit}</div>
      </div>
      <div class="order-item-price">ZMW ${(item.price * item.qty).toLocaleString()}</div>
    </div>
  `).join("");
  const discount = getPromoDiscount(subtotal);
  const afterPromo = Math.max(0, subtotal - discount);
  const delivery = getDeliveryFee(afterPromo);
  const fee = getPlatformFee(subtotal);
  const total = getOrderTotal(subtotal);
  $$(".order-subtotal").forEach(el => el.textContent = `ZMW ${subtotal.toLocaleString()}`);
  $$(".order-discount").forEach(el => {
    const line = el.closest(".summary-line");
    if (discount > 0) {
      el.textContent = `- ZMW ${discount.toLocaleString()}`;
      line?.classList.remove("hidden-line");
    } else {
      el.textContent = "—";
      line?.classList.add("hidden-line");
    }
  });
  $$(".order-delivery").forEach(el => el.textContent = delivery > 0 ? `ZMW ${delivery}` : "Free");
  $$(".order-fee").forEach(el => el.textContent = fee > 0 ? `ZMW ${fee.toLocaleString()}` : "—");
  $$(".order-total").forEach(el => el.textContent = `ZMW ${total.toLocaleString()}`);
}

function openProductDetail(id) {
  const crop = findCropById(id);
  const modal = document.getElementById("detail-modal");
  if (!crop || !modal) return;
  const titleEl = document.getElementById("detail-modal-title");
  const contentEl = document.getElementById("detail-modal-content");
  if (titleEl) titleEl.textContent = crop.name;
  if (contentEl) {
    contentEl.innerHTML = `
      <img src="${crop.img}" alt="${crop.name}">
      <div class="detail-info">
        <h2>${crop.name}</h2>
        <div class="detail-price">ZMW ${crop.price} <span style="font-size:.8rem;font-weight:400;color:var(--text-light)">/${crop.unit}</span></div>
        <p class="detail-desc">${crop.desc}</p>
        <div class="detail-meta">
          <span><i class="fa-solid fa-wheat-awn" aria-hidden="true"></i> <strong>Farmer:</strong> ${crop.farmer}</span>
          <span><i class="fa-solid fa-location-dot" aria-hidden="true"></i> <strong>Location:</strong> ${crop.location}</span>
          <span><i class="fa-solid fa-tag" aria-hidden="true"></i> <strong>Category:</strong> ${crop.category}</span>
          <span><i class="fa-solid fa-circle-check" aria-hidden="true"></i> <strong>Availability:</strong> In Stock</span>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:8px">
          <button type="button" class="btn btn-primary" onclick="addToCart(${crop.id}); document.getElementById('detail-modal').classList.remove('open')">
            <i class="fa-solid fa-cart-plus" aria-hidden="true"></i> Add to Cart
          </button>
          ${crop.farmer_id && OCM_USE_API ? `
          <button type="button" class="btn btn-outline" onclick="openMessageFarmerModal(${crop.id})">
            <i class="fa-solid fa-comments" aria-hidden="true"></i> Message farmer
          </button>` : ""}
        </div>
      </div>
    `;
  }
  modal.classList.add("open");
}

function openMessageFarmerModal(cropId) {
  const crop = findCropById(cropId);
  const modal = document.getElementById("message-farmer-modal");
  if (!crop || !modal || !crop.farmer_id) return;
  modal.dataset.cropId = cropId;
  modal.dataset.farmerId = crop.farmer_id;
  const subj = modal.querySelector("[name=msg-subject]");
  const body = modal.querySelector("[name=msg-body]");
  if (subj) subj.value = `Inquiry: ${crop.name}`;
  if (body) body.value = "";
  modal.classList.add("open");
}

function initMessageFarmerModal() {
  const modal = document.getElementById("message-farmer-modal");
  const form = document.getElementById("message-farmer-form");
  if (!form || form.dataset.bound) return;
  form.dataset.bound = "1";
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!localStorage.getItem("ocm-token")) {
      showToast("Sign in to message a farmer.", "info");
      setTimeout(() => { window.location.href = "login.html"; }, 900);
      return;
    }
    const recipient = Number(modal?.dataset.farmerId);
    const subject = form.querySelector("[name=msg-subject]").value.trim();
    const body = form.querySelector("[name=msg-body]").value.trim();
    if (!recipient || !subject || !body) {
      showToast("Please complete the message.", "error");
      return;
    }
    try {
      await OcmApi.sendMessage({ recipient, subject, body });
      modal?.classList.remove("open");
      showToast("Message sent to the farmer.");
    } catch (err) {
      showToast(err.message || "Could not send message.", "error");
    }
  });
}

function initProductDetailButtons() {
  const grid = document.getElementById("products-grid");
  if (!grid) return;
  const patchCards = () => {
    grid.querySelectorAll(".product-card").forEach(card => {
      const cropId = Number(card.dataset.cropId);
      if (!cropId) return;
      const footer = card.querySelector(".product-footer");
      if (!footer || footer.dataset.patched) return;
      footer.dataset.patched = "1";
      const detailBtn = document.createElement("button");
      detailBtn.type = "button";
      detailBtn.className = "btn btn-outline btn-sm";
      detailBtn.style.marginRight = "8px";
      detailBtn.setAttribute("aria-label", `View details for ${card.querySelector(".product-name")?.textContent || "crop"}`);
      detailBtn.innerHTML = '<i class="fa-solid fa-eye" aria-hidden="true"></i>';
      detailBtn.addEventListener("click", () => openProductDetail(cropId));
      footer.insertBefore(detailBtn, footer.firstChild);
    });
  };
  new MutationObserver(patchCards).observe(grid, { childList: true });
  patchCards();
}

function initPaymentTabs() {
  $$(".payment-tab").forEach(tab => {
    tab.addEventListener("click", () => {
      $$(".payment-tab").forEach(t => t.classList.remove("active"));
      $$(".payment-form").forEach(f => f.classList.remove("active"));
      tab.classList.add("active");
      const form = document.getElementById(`form-${tab.dataset.method}`);
      if (form) form.classList.add("active");
    });
  });
}

async function placeOrder() {
  if (OCM_USE_API && localStorage.getItem("ocm-token")) {
    try {
      const order = await OcmApi.checkout({});
      document.getElementById("order-id").textContent = order.order_number;
      document.getElementById("success-modal").classList.add("open");
      await syncCartBadgeFromApi();
      return;
    } catch (err) {
      showToast(err.message || "Checkout failed.", "error");
      return;
    }
  }
  const orderId = "OCM-" + Math.floor(Math.random() * 900000 + 100000);
  document.getElementById("order-id").textContent = orderId;
  document.getElementById("success-modal").classList.add("open");
  localStorage.removeItem("ocm-cart");
  localStorage.removeItem("ocm-promo");
  updateCartBadge();
}

// ── Dashboard ──
function initDashboard() {
  const user = getCurrentUser();
  if (!user) { window.location.href = "login.html"; return; }
  const role = user.type || user.role;
  if (role !== "farmer") { showToast("Access restricted to farmers.", "error"); setTimeout(() => window.location.href = "index.html", 1500); return; }

  // Set user info
  $$(".dash-user-name").forEach(el => el.textContent = user.fullname || "Farmer");
  $$(".dash-user-img").forEach(img => { if (user.img) img.src = user.img; });

  loadCropsTable();
  loadFarmerOrders();
  loadFarmerAnalytics();
  loadFarmerMessages();
  initFarmerMessageReplyForm();
  initCropModal();
}

async function loadFarmerAnalytics() {
  const barsEl = document.getElementById("analytics-monthly-bars");
  const topEl = document.getElementById("analytics-top-crops");
  if (!barsEl || !topEl) return;

  if (!OCM_USE_API || !localStorage.getItem("ocm-token")) {
    barsEl.innerHTML = `<p style="font-size:.85rem;color:var(--text-light)">Start Django and sign in to load sales analytics.</p>`;
    topEl.innerHTML = "";
    return;
  }

  try {
    const data = await OcmApi.getFarmerAnalytics();
    const monthly = data.monthly || [];
    const maxRev = Math.max(...monthly.map((m) => m.revenue), 1);
    if (!monthly.length) {
      barsEl.innerHTML = `<p style="font-size:.85rem;color:var(--text-light)">No sales yet — orders will appear here.</p>`;
    } else {
      barsEl.innerHTML = monthly.map((m) => {
        const h = Math.round((m.revenue / maxRev) * 120) || 4;
        return `
          <div class="analytics-bar-col">
            <div class="analytics-bar-val">ZMW ${Math.round(m.revenue).toLocaleString()}</div>
            <div class="analytics-bar" style="height:${h}px" title="ZMW ${m.revenue}"></div>
            <div class="analytics-bar-label">${m.label || m.month}</div>
          </div>
        `;
      }).join("");
    }

    const top = data.top_crops || [];
    if (!top.length) {
      topEl.innerHTML = `<p style="font-size:.85rem;color:var(--text-light)">Top crops will show after your first sale.</p>`;
    } else {
      topEl.innerHTML = top.map((row) => `
        <div class="analytics-top-row">
          <span>${row.name}</span>
          <span style="font-weight:700;color:var(--green-700)">ZMW ${Math.round(row.revenue).toLocaleString()}</span>
        </div>
      `).join("");
    }
  } catch (err) {
    barsEl.innerHTML = `<p style="font-size:.85rem;color:var(--text-light)">Could not load analytics.</p>`;
    showToast(err.message || "Could not load analytics.", "error");
  }
}

async function loadFarmerMessages() {
  const list = document.getElementById("farmer-messages-list");
  if (!list) return;

  if (!OCM_USE_API || !localStorage.getItem("ocm-token")) {
    list.innerHTML = `<p style="padding:16px 24px;color:var(--text-light);font-size:.88rem">Start Django and sign in to view buyer messages.</p>`;
    return;
  }

  try {
    const user = getCurrentUser();
    const uid = Number(user?.id);
    const messages = await OcmApi.getMessages();
    const inbox = messages.filter((m) => Number(m.recipient) === uid);
    const unread = inbox.filter((m) => !m.is_read).length;
    const badge = document.getElementById("sidebar-msg-count");
    if (badge) {
      badge.textContent = String(unread);
      badge.style.display = unread > 0 ? "inline-grid" : "none";
    }

    if (!inbox.length) {
      list.innerHTML = `<p style="color:var(--text-light);font-size:.88rem">No messages yet. Buyers can contact you from crop details on the shop page.</p>`;
      return;
    }

    list.innerHTML = inbox.slice(0, 30).map((msg) => {
      const date = new Date(msg.created_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
      const unreadClass = !msg.is_read ? " unread" : "";
      return `
        <article class="message-card${unreadClass}" data-msg-id="${msg.id}">
          <div class="message-card-head">
            <strong>${msg.sender_name}</strong>
            <span class="message-card-meta">${date}</span>
          </div>
          <div style="font-weight:600;font-size:.85rem;margin-bottom:6px">${msg.subject}</div>
          <div class="message-card-body">${msg.body}</div>
          <div style="margin-top:12px;display:flex;gap:8px">
            <button type="button" class="btn btn-outline btn-sm farmer-reply-btn" data-sender="${msg.sender}" data-subject="${msg.subject.replace(/"/g, "&quot;")}">Reply</button>
          </div>
        </article>
      `;
    }).join("");

    list.querySelectorAll(".farmer-reply-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const form = document.getElementById("farmer-reply-form");
        if (!form) return;
        form.style.display = "block";
        form.querySelector("[name=recipient-id]").value = btn.dataset.sender;
        form.querySelector("[name=reply-subject]").value = `Re: ${btn.dataset.subject}`;
        form.querySelector("[name=reply-body]").focus();
      });
    });

    inbox.filter((m) => !m.is_read).forEach((m) => {
      OcmApi.markMessageRead(m.id).catch(() => {});
    });
  } catch (err) {
    list.innerHTML = `<p style="color:var(--text-light)">Could not load messages.</p>`;
    showToast(err.message || "Could not load messages.", "error");
  }
}

function initFarmerMessageReplyForm() {
  const form = document.getElementById("farmer-reply-form");
  const cancel = document.getElementById("cancel-reply-btn");
  if (!form || form.dataset.bound) return;
  form.dataset.bound = "1";
  cancel?.addEventListener("click", () => {
    form.style.display = "none";
    form.reset();
  });
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!OCM_USE_API) return;
    const recipient = Number(form.querySelector("[name=recipient-id]").value);
    const subject = form.querySelector("[name=reply-subject]").value.trim();
    const body = form.querySelector("[name=reply-body]").value.trim();
    try {
      await OcmApi.sendMessage({ recipient, subject, body });
      form.style.display = "none";
      form.reset();
      showToast("Reply sent.");
      await loadFarmerMessages();
    } catch (err) {
      showToast(err.message || "Could not send reply.", "error");
    }
  });
}

async function loadFarmerOrders() {
  const tbody = document.getElementById("farmer-orders-tbody");
  if (!tbody) return;

  if (!OCM_USE_API || !localStorage.getItem("ocm-token")) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:32px;color:var(--text-light)">Start the Django server and sign in to load live orders.</td></tr>`;
    return;
  }

  try {
    const orders = await OcmApi.getOrders();
    const user = getCurrentUser();
    const sellerLabel = user?.farmName || user?.fullname || "";
    const now = new Date();
    let monthCount = 0;
    let earnings = 0;

    orders.forEach((order) => {
      const created = new Date(order.created_at);
      const myLines = (order.items || []).filter((it) => it.farmer_name === sellerLabel);
      if (!myLines.length) return;
      if (created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear()) {
        monthCount += 1;
      }
      myLines.forEach((it) => { earnings += Number(it.line_total); });
    });

    const ordersMonthEl = document.getElementById("stat-orders-month");
    const salesEl = document.getElementById("stat-sales");
    if (ordersMonthEl) ordersMonthEl.textContent = String(monthCount);
    if (salesEl) salesEl.textContent = `ZMW ${earnings.toLocaleString()}`;

    const salesOrders = orders.filter((order) =>
      (order.items || []).some((it) => it.farmer_name === sellerLabel)
    );

    if (!salesOrders.length) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:32px;color:var(--text-light)">No orders yet — buyers will see your crops on the marketplace.</td></tr>`;
      return;
    }

    tbody.innerHTML = salesOrders.slice(0, 20).map((order) => {
      const myLines = (order.items || []).filter((it) => it.farmer_name === sellerLabel);
      const itemsSummary = myLines.map((it) => `${it.crop_name} ×${it.quantity}`).join(", ");
      const myTotal = myLines.reduce((s, it) => s + Number(it.line_total), 0);
      const date = new Date(order.created_at).toLocaleDateString(undefined, { dateStyle: "medium" });
      return `
        <tr>
          <td><strong>${order.order_number}</strong></td>
          <td>${itemsSummary}</td>
          <td>ZMW ${myTotal.toLocaleString()}</td>
          <td><span class="status-badge ${order.status}">${order.status}</span></td>
          <td>${date}</td>
        </tr>
      `;
    }).join("");
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:32px;color:var(--text-light)">Could not load orders.</td></tr>`;
    showToast(err.message || "Could not load orders.", "error");
  }
}

async function mergeGuestCartAfterLogin() {
  if (!OCM_USE_API || !localStorage.getItem("ocm-token")) return;
  const local = getCart();
  if (!local.length) return;
  for (const item of local) {
    try {
      await OcmApi.addToCart(item.id, item.qty || 1);
    } catch {
      /* skip unavailable items */
    }
  }
  localStorage.removeItem("ocm-cart");
  const promo = localStorage.getItem("ocm-promo");
  if (promo) {
    try { await OcmApi.applyPromo(promo); } catch { /* ignore */ }
    localStorage.removeItem("ocm-promo");
  }
  await syncCartBadgeFromApi();
}

async function renderCustomerOrdersPage() {
  const list = document.getElementById("customer-orders-list");
  if (!list) return;
  const user = getCurrentUser();
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  if (user.type === "farmer" || user.role === "farmer") {
    window.location.href = "farmer-dashboard.html#orders-section";
    return;
  }
  if (!OCM_USE_API || !localStorage.getItem("ocm-token")) {
    list.innerHTML = `<p class="section-sub">Start the Django API (<code>python manage.py runserver</code>) and sign in to view order history.</p>`;
    return;
  }
  try {
    const orders = await OcmApi.getOrders();
    if (!orders.length) {
      list.innerHTML = `<p class="section-sub">You have not placed any orders yet. <a href="products.html">Browse crops</a>.</p>`;
      return;
    }
    list.innerHTML = orders.map((order) => {
      const items = (order.items || []).map((it) =>
        `<li>${it.crop_name} ×${it.quantity} — ZMW ${Number(it.line_total).toLocaleString()}</li>`
      ).join("");
      const date = new Date(order.created_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
      return `
        <article class="dash-card" style="padding:24px;margin-bottom:16px">
          <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:12px">
            <div><strong>${order.order_number}</strong><div style="font-size:.85rem;color:var(--text-light)">${date}</div></div>
            <div style="font-weight:700;color:var(--green-700)">ZMW ${Number(order.total).toLocaleString()}</div>
          </div>
          <ul style="margin:0;padding-left:18px;font-size:.9rem">${items}</ul>
        </article>
      `;
    }).join("");
  } catch (err) {
    list.innerHTML = `<p class="section-sub">Could not load orders.</p>`;
    showToast(err.message || "Could not load orders.", "error");
  }
}

// Farmer's crops stored in localStorage
function getFarmerCrops() {
  const user = getCurrentUser();
  const key = `ocm-crops-${user?.email || "demo"}`;
  const stored = JSON.parse(localStorage.getItem(key) || "null");
  if (stored) return stored;
  const defaults = CROPS.slice(0, 4).map(c => ({
    ...c,
    status: "active",
    stock: Math.floor(Math.random() * 50 + 10)
  }));
  localStorage.setItem(key, JSON.stringify(defaults));
  return defaults;
}

function saveFarmerCrops(crops) {
  const user = getCurrentUser();
  const key = `ocm-crops-${user?.email || "demo"}`;
  localStorage.setItem(key, JSON.stringify(crops));
}

async function loadCropsTable() {
  const tbody = document.getElementById("crops-tbody");
  if (!tbody) return;
  let crops = getFarmerCrops();
  if (OCM_USE_API && localStorage.getItem("ocm-token")) {
    try {
      crops = await OcmApi.getMyCrops();
    } catch (err) {
      showToast(err.message || "Could not load your crops.", "error");
    }
  }

  // Update stats
  const totalEl = document.getElementById("stat-total-crops");
  const activeEl = document.getElementById("stat-active");
  const salesEl  = document.getElementById("stat-sales");
  if (totalEl) totalEl.textContent = crops.length;
  if (activeEl) activeEl.textContent = crops.filter(c=>c.status==="active").length;
  if (salesEl && !(OCM_USE_API && localStorage.getItem("ocm-token"))) {
    salesEl.textContent = `ZMW ${(crops.reduce((s, c) => s + Number(c.price), 0) * 3).toLocaleString()}`;
  }
  const sidebarCount = document.getElementById("sidebar-crop-count");
  if (sidebarCount) sidebarCount.textContent = crops.length;

  tbody.innerHTML = crops.map(crop => `
    <tr>
      <td>
        <div class="crop-name-cell">
          <img src="${crop.img}" alt="${crop.name}" class="crop-thumb">
          ${crop.name}
        </div>
      </td>
      <td>${crop.category}</td>
      <td>ZMW ${crop.price} <small style="color:var(--text-light)">/${crop.unit}</small></td>
      <td>${crop.stock || "—"} units</td>
      <td><span class="status-badge ${crop.status || 'active'}">${crop.status || "active"}</span></td>
      <td>
        <div class="action-btns">
          <button class="action-btn edit" onclick="editCrop(${crop.id})" title="Edit"><i class="fa-solid fa-pen"></i></button>
          <button class="action-btn delete" onclick="deleteCrop(${crop.id})" title="Delete"><i class="fa-solid fa-trash-can"></i></button>
        </div>
      </td>
    </tr>
  `).join("");
}

async function deleteCrop(id) {
  if (!confirm("Delete this crop listing?")) return;
  if (OCM_USE_API && localStorage.getItem("ocm-token")) {
    try {
      await OcmApi.deleteCrop(id);
      await refreshApiCatalog();
      await loadCropsTable();
      showToast("Crop deleted.", "info");
    } catch (err) {
      showToast(err.message || "Could not delete crop.", "error");
    }
    return;
  }
  const crops = getFarmerCrops().filter(c => c.id !== id);
  saveFarmerCrops(crops);
  loadCropsTable();
  showToast("Crop deleted.", "info");
}

async function editCrop(id) {
  let crop;
  if (OCM_USE_API && localStorage.getItem("ocm-token")) {
    crop = (await OcmApi.getMyCrops()).find(c => String(c.id) === String(id));
  } else {
    crop = getFarmerCrops().find(c => c.id === id);
  }
  if (!crop) return;
  openCropModal(crop);
}

function openCropModal(crop = null) {
  const modal = document.getElementById("crop-modal");
  const title = document.getElementById("modal-title");
  const form  = document.getElementById("crop-form");
  if (!modal || !form) return;
  title.textContent = crop ? "Edit Crop" : "Add New Crop";
  form.querySelector("[name=crop-id]").value    = crop?.id || "";
  form.querySelector("[name=crop-name]").value  = crop?.name || "";
  form.querySelector("[name=crop-price]").value = crop?.price || "";
  form.querySelector("[name=crop-unit]").value  = crop?.unit || "";
  form.querySelector("[name=crop-cat]").value   = crop?.category || "";
  form.querySelector("[name=crop-stock]").value = crop?.stock || "";
  form.querySelector("[name=crop-desc]").value  = crop?.desc || "";
  modal.classList.add("open");
}

function initCropModal() {
  const modal  = document.getElementById("crop-modal");
  const form   = document.getElementById("crop-form");
  const addBtn = document.getElementById("add-crop-btn");
  const closeBtn = document.getElementById("modal-close");
  if (!modal) return;

  if (addBtn) addBtn.addEventListener("click", () => openCropModal());
  if (closeBtn) closeBtn.addEventListener("click", () => modal.classList.remove("open"));
  modal.addEventListener("click", (e) => { if (e.target === modal) modal.classList.remove("open"); });

  // Crop image preview
  const imgInput = document.getElementById("crop-img-input");
  const previewImg = document.getElementById("crop-img-preview");
  const uploadWrap = document.getElementById("crop-img-upload");
  if (imgInput && previewImg) {
    imgInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        previewImg.src = ev.target.result;
        uploadWrap?.classList.add("has-img");
      };
      reader.readAsDataURL(file);
    });
  }

  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const id   = form.querySelector("[name=crop-id]").value;
      const name = form.querySelector("[name=crop-name]").value.trim();
      const price= parseFloat(form.querySelector("[name=crop-price]").value);
      const unit = form.querySelector("[name=crop-unit]").value.trim();
      const cat  = form.querySelector("[name=crop-cat]").value;
      const stock= parseInt(form.querySelector("[name=crop-stock]").value) || 0;
      const desc = form.querySelector("[name=crop-desc]").value.trim();
      const imgEl= form.querySelector("[name=crop-img-url]");
      const imgUrl = (imgEl?.value?.trim()) || previewImg?.src || "https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=600&q=80";
      if (!name || !price || !unit) { showToast("Please fill in all required fields.", "error"); return; }

      if (OCM_USE_API && localStorage.getItem("ocm-token")) {
        const payload = {
          name,
          price,
          unit,
          category: cat,
          stock,
          description: desc,
          image: imgUrl,
          badge: "Fresh",
          organic: false,
          status: "active",
        };
        try {
          if (id) await OcmApi.updateCrop(id, payload);
          else await OcmApi.createCrop(payload);
          await refreshApiCatalog();
          modal.classList.remove("open");
          await loadCropsTable();
          showToast(id ? "Crop updated successfully" : "New crop added to your store");
        } catch (err) {
          showToast(err.message || "Could not save crop.", "error");
        }
        return;
      }

      const crops = getFarmerCrops();
      if (id) {
        const idx = crops.findIndex(c => c.id == id);
        if (idx > -1) { crops[idx] = { ...crops[idx], name, price, unit, category: cat, stock, desc, img: imgUrl }; }
      } else {
        const newId = Date.now();
        const user = getCurrentUser();
        crops.push({
          id: newId, name, price, unit, category: cat, stock, desc, img: imgUrl,
          badge: "Fresh", organic: false, status: "active",
          farmer: user?.farmName || user?.fullname || "Farmer",
          location: user?.province || "Zambia"
        });
      }
      saveFarmerCrops(crops);
      modal.classList.remove("open");
      loadCropsTable();
      showToast(id ? "Crop updated successfully" : "New crop added to your store");
    });
  }
}

// ── Sidebar Toggle (mobile) ──
function initSidebarToggle() {
  const btn = document.getElementById("sidebar-toggle");
  const sidebar = document.querySelector(".sidebar");
  if (!btn || !sidebar) return;
  btn.addEventListener("click", () => sidebar.classList.toggle("open"));
}

// ── Counter Animation ──
function animateCounters() {
  $$(".counter").forEach(el => {
    const target = parseInt(el.dataset.target);
    const suffix = el.dataset.suffix || "";
    let count = 0;
    const step = Math.ceil(target / 60);
    const timer = setInterval(() => {
      count = Math.min(count + step, target);
      el.textContent = count.toLocaleString() + suffix;
      if (count >= target) clearInterval(timer);
    }, 20);
  });
}

// ── Run on DOM ready ──
document.addEventListener("DOMContentLoaded", async () => {
  await bootstrapApi();
  initTheme();
  initNavbar();
  initMobileMenu();
  initFAQ();
  initFadeIn();
  initNewsletter();
  initContactForm();
  if (OCM_USE_API && localStorage.getItem("ocm-token")) await syncCartBadgeFromApi();
  else updateCartBadge();
  initAuthNav();

  // Theme toggle click
  $$(".theme-toggle").forEach(btn => btn.addEventListener("click", toggleTheme));

  // Cart button nav
  $$(".cart-btn").forEach(btn => btn.addEventListener("click", () => window.location.href = "cart.html"));

  // Page-specific init
  const page = document.body.dataset.page;
  if (page === "home") {
    renderProducts(document.getElementById("featured-products"), getFeaturedCrops(4));
    renderTestimonials(document.getElementById("testimonials-grid"));
    renderFeaturedFarmers(document.getElementById("farmers-grid"));
    // Animate hero stats
    setTimeout(() => {
      const io = new IntersectionObserver((entries) => {
        entries.forEach(e => { if (e.isIntersecting) { animateCounters(); io.disconnect(); } });
      });
      const statsEl = document.querySelector(".hero-stats");
      if (statsEl) io.observe(statsEl);
    }, 500);
  }
  if (page === "products") { initProductFilters(); initProductDetailButtons(); initMessageFarmerModal(); }
  if (page === "reset")    { initPasswordToggle(); initResetPasswordPage(); }
  if (page === "cart")     { renderCartPage(); initPromoCode(); }
  if (page === "checkout") { await initCheckoutPage(); await renderOrderSummary(); initPaymentTabs(); }
  if (page === "login")    { initPasswordToggle(); initLoginPage(); initForgotPassword(); }
  if (page === "register") { initPasswordToggle(); initProfileUpload(); initAccountTypeToggle(); initRegisterPage(); }
  if (page === "dashboard"){ initDashboard(); initSidebarToggle(); initDashboardPlaceholders(); initFadeIn(); }
  if (page === "orders")   { renderCustomerOrdersPage(); }

  initModalOverlays();

  // Smooth scroll for anchor links
  $$('a[href^="#"]').forEach(a => {
    a.addEventListener("click", (e) => {
      const target = document.getElementById(a.getAttribute("href").slice(1));
      if (target) { e.preventDefault(); target.scrollIntoView({ behavior: "smooth" }); }
    });
  });
});

// ── Login Page ──
function initLoginPage() {
  const form = document.getElementById("login-form");
  if (!form) return;
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!validateLoginForm(form)) return;
    const email = form.querySelector("[name=email]").value;
    const pass  = form.querySelector("[name=password]").value;
    let user = null;
    if (OCM_USE_API) {
      try {
        user = await OcmApi.login(email, pass);
      } catch (err) {
        showToast(err.message || "Invalid email or password.", "error");
        return;
      }
    } else {
      user = loginUser(email, pass);
    }
    if (user) {
      await mergeGuestCartAfterLogin();
      showToast(`Welcome back, ${user.fullname}!`);
      setTimeout(() => {
        const next = new URLSearchParams(window.location.search).get("next");
        if (next) { window.location.href = next; return; }
        const role = user.type || user.role;
        if (role === "farmer") window.location.href = "farmer-dashboard.html";
        else window.location.href = "products.html";
      }, 1200);
    }
  });
  // Demo login buttons
  $$(".demo-login").forEach(btn => {
    btn.addEventListener("click", () => {
      form.querySelector("[name=email]").value    = btn.dataset.email;
      form.querySelector("[name=password]").value = "123456";
      showToast("Demo credentials filled. Click Sign In.", "info");
    });
  });
}

// ── Register Page ──
function initRegisterPage() {
  const form = document.getElementById("register-form");
  if (!form) return;
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!validateRegisterForm(form)) return;
    const type = document.querySelector(".account-type-btn.active")?.dataset?.type || "customer";
    const profileImgEl = document.querySelector(".upload-circle img");
    const data = {
      fullname: form.querySelector("[name=fullname]").value.trim(),
      email:    form.querySelector("[name=email]").value.trim(),
      password: form.querySelector("[name=password]").value,
      confirm:  form.querySelector("[name=confirm]").value,
      phone:    form.querySelector("[name=phone]")?.value?.trim() || "",
      type,
      farmName: form.querySelector("[name=farm-name]")?.value?.trim() || "",
      province: form.querySelector("[name=province]")?.value?.trim() || "",
      img: profileImgEl?.src || "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=200&q=80"
    };
    if (OCM_USE_API) {
      try {
        await OcmApi.register(data);
        await refreshApiCatalog();
        showToast("Account created successfully");
        setTimeout(() => {
          if (type === "farmer") window.location.href = "farmer-dashboard.html";
          else window.location.href = "products.html";
        }, 1200);
      } catch (err) {
        showToast(err.message || "Registration failed.", "error");
      }
      return;
    }
    if (!saveUser(data)) return;
    showToast("Account created successfully");
    setTimeout(() => {
      if (type === "farmer") window.location.href = "farmer-dashboard.html";
      else window.location.href = "products.html";
    }, 1200);
  });
}

// Expose globals needed by inline handlers
window.addToCart = addToCart;
window.updateQtyAndRefresh = updateQtyAndRefresh;
window.removeAndRefresh = removeAndRefresh;
window.placeOrder = placeOrder;
window.openMessageFarmerModal = openMessageFarmerModal;
window.openCropModal = openCropModal;
window.editCrop = editCrop;
window.deleteCrop = deleteCrop;
window.logout = logout;
window.showToast = showToast;
window.openProductDetail = openProductDetail;
