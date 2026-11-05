/**
 * Online Crop Market — Django API client
 * Default API: http://127.0.0.1:8000/api
 */
const OcmApi = (() => {
  const BASE =
    localStorage.getItem("ocm-api-base") ||
    (window.location.port === "8000"
      ? `${window.location.origin}/api`
      : "http://127.0.0.1:8000/api");

  function getToken() {
    return localStorage.getItem("ocm-token");
  }

  function setSession(token, user) {
    if (token) localStorage.setItem("ocm-token", token);
    else localStorage.removeItem("ocm-token");
    if (user) localStorage.setItem("ocm-current-user", JSON.stringify(mapUser(user)));
    else localStorage.removeItem("ocm-current-user");
  }

  function mapUser(u) {
    return {
      id: u.id,
      email: u.email,
      fullname: u.fullname,
      type: u.role,
      role: u.role,
      phone: u.phone || "",
      farmName: u.farm_name || "",
      farm_name: u.farm_name || "",
      province: u.province || "",
      img: u.profile_image || "",
    };
  }

  function normalizeCrop(c) {
    return {
      id: c.id,
      name: c.name,
      category: c.category,
      price: Number(c.price),
      unit: c.unit,
      desc: c.desc || c.description || "",
      description: c.desc || c.description || "",
      img: c.img || c.image,
      image: c.img || c.image,
      badge: c.badge || "Fresh",
      organic: Boolean(c.organic),
      location: c.location || "Zambia",
      farmer: c.farmer,
      farmer_id: c.farmer_id,
      status: c.status || "active",
      stock: c.stock ?? 0,
    };
  }

  async function request(path, options = {}) {
    const headers = {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {}),
    };
    const token = getToken();
    if (token) headers.Authorization = `Token ${token}`;

    const res = await fetch(`${BASE}${path}`, {
      ...options,
      headers,
    });

    let data = null;
    const text = await res.text();
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = { detail: text };
      }
    }

    if (!res.ok) {
      const msg = data?.detail || data?.non_field_errors?.[0] || JSON.stringify(data) || res.statusText;
      throw new Error(typeof msg === "string" ? msg : "Request failed");
    }
    return data;
  }

  function unwrapList(data) {
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.results)) return data.results;
    return [];
  }

  return {
    BASE,
    enabled: false,

    async ping() {
      await request("/crops/?page=1");
      this.enabled = true;
      return true;
    },

    async getCrops(params = {}) {
      const qs = new URLSearchParams(params).toString();
      const data = await request(`/crops/${qs ? `?${qs}` : ""}`);
      return unwrapList(data).map(normalizeCrop);
    },

    async getMyCrops() {
      const data = await request("/crops/?mine=1&format=admin");
      return unwrapList(data).map((c) => ({
        ...normalizeCrop(c),
        status: c.status,
        stock: c.stock,
      }));
    },

    async createCrop(payload) {
      return request("/crops/?format=admin", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },

    async updateCrop(id, payload) {
      return request(`/crops/${id}/?format=admin`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
    },

    async deleteCrop(id) {
      return request(`/crops/${id}/`, { method: "DELETE" });
    },

    async register(form) {
      const data = await request("/auth/register/", {
        method: "POST",
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          confirm: form.confirm || form.password,
          fullname: form.fullname,
          phone: form.phone || "",
          role: form.type || form.role || "customer",
          farm_name: form.farmName || form.farm_name || "",
          province: form.province || "",
          profile_image: form.img || "",
        }),
      });
      setSession(data.token, data.user);
      return mapUser(data.user);
    },

    async login(email, password) {
      const data = await request("/auth/login/", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setSession(data.token, data.user);
      return mapUser(data.user);
    },

    async logout() {
      try {
        await request("/auth/logout/", { method: "POST" });
      } catch {
        /* ignore */
      }
      setSession(null, null);
    },

    async me() {
      const u = await request("/auth/me/");
      return mapUser(u);
    },

    async getCart() {
      return request("/cart/");
    },

    async addToCart(cropId, quantity = 1) {
      return request("/cart/add_item/", {
        method: "POST",
        body: JSON.stringify({ crop_id: cropId, quantity }),
      });
    },

    async updateCartItem(cropId, delta) {
      return request("/cart/update_item/", {
        method: "POST",
        body: JSON.stringify({ crop_id: cropId, delta }),
      });
    },

    async removeCartItem(cropId) {
      return request("/cart/remove_item/", {
        method: "POST",
        body: JSON.stringify({ crop_id: cropId }),
      });
    },

    async applyPromo(code) {
      return request("/cart/apply_promo/", {
        method: "POST",
        body: JSON.stringify({ code }),
      });
    },

    async checkout(payload = {}) {
      return request("/checkout/", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },

    async getOrders() {
      const data = await request("/orders/");
      return unwrapList(data);
    },

    async getFarmerAnalytics() {
      return request("/analytics/farmer/");
    },

    async getMessages() {
      const data = await request("/messages/");
      return unwrapList(data);
    },

    async sendMessage({ recipient, subject, body }) {
      return request("/messages/", {
        method: "POST",
        body: JSON.stringify({ recipient, subject, body }),
      });
    },

    async markMessageRead(id) {
      return request(`/messages/${id}/mark_read/`, { method: "POST" });
    },

    async requestPasswordReset(email) {
      const frontend_url =
        window.location.port === "8000"
          ? window.location.origin
          : localStorage.getItem("ocm-frontend-url") || "http://127.0.0.1:8000";
      return request("/auth/password-reset/", {
        method: "POST",
        body: JSON.stringify({ email, frontend_url }),
      });
    },

    async confirmPasswordReset(payload) {
      return request("/auth/password-reset/confirm/", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },

    mapUser,
    normalizeCrop,
  };
})();

window.OcmApi = OcmApi;
