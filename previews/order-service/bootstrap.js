/* Isolated preview only. All API requests are answered locally; production sessions are untouched. */
(() => {
  const ROOT = "/assets/order-service-preview-v1";
  const NS = "kosmetichka-order-service-preview-v1:";
  const STATE = NS + "order";
  const storage = window.localStorage;
  const customer = { id: 900001, name: "Тестовый клиент", companyName: null, email: "preview@example.test", phone: "89990000000", address: "Пример адреса доставки", priceType: "retail", isActive: true, isApproved: true, hasCard: false, cardLinked: false, surveyAt: new Date().toISOString(), wholesaleAccess: null };
  const staff = { id: 900002, name: "Раяна", login: "preview-only", role: "admin", tokenRole: "admin", oneCGroup: null };
  const prefixStorage = {
    getItem(key) { return storage.getItem(NS + key); },
    setItem(key, value) { storage.setItem(NS + key, String(value)); },
    removeItem(key) { storage.removeItem(NS + key); },
    clear() { Object.keys(storage).filter(key => key.startsWith(NS)).forEach(key => storage.removeItem(key)); },
    key(index) { return Object.keys(storage).filter(key => key.startsWith(NS))[index]?.slice(NS.length) ?? null; },
    get length() { return Object.keys(storage).filter(key => key.startsWith(NS)).length; },
  };
  Object.defineProperty(window, "localStorage", { value: prefixStorage });
  Object.defineProperty(window, "sessionStorage", { value: prefixStorage });
  prefixStorage.setItem("kosmetichka-customer", JSON.stringify(customer));
  prefixStorage.setItem("kosmetichka-owner", String(customer.id));
  prefixStorage.setItem("team-auth", JSON.stringify({ state: { user: staff }, version: 0 }));
  const events = new Set();
  window.EventSource = class {
    constructor() { this.readyState = 1; events.add(this); queueMicrotask(() => this.onopen?.({})); }
    close() { this.readyState = 2; events.delete(this); }
    addEventListener(type, fn) { if (type === "message") this.onmessage = fn; }
    removeEventListener() {}
  };
  function emit() { events.forEach(event => event.onmessage?.({ data: JSON.stringify({ t: "order", id: 1248 }) })); }
  window.addEventListener("storage", event => { if (event.key === STATE) emit(); });
  Object.defineProperty(navigator, "serviceWorker", { value: { register: () => Promise.reject(new Error("Предпросмотр")), getRegistration: async () => undefined, addEventListener() {}, removeEventListener() {} } });
  Object.defineProperty(window, "Notification", { value: class { static permission = "denied"; static requestPermission() { return Promise.resolve("denied"); } } });
  navigator.sendBeacon = () => true;
  window.open = () => null;
  const originalOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url, ...args) {
    if (new URL(String(url), location.href).pathname.startsWith("/api/")) throw new Error("В предпросмотре загрузка файлов отключена");
    return originalOpen.call(this, method, url, ...args);
  };
  document.addEventListener("click", event => {
    const anchor = event.target.closest?.("a[href]");
    if (anchor && !new URL(anchor.href, location.href).pathname.startsWith(ROOT + "/")) event.preventDefault();
  }, true);
  const initial = () => {
    const now = new Date();
    return { status: "pending", phase: "queued", createdAt: now.toISOString(), expectedAt: new Date(now.getTime() + 3600000).toISOString(), messages: [{ id: 1, text: "Заказ №1248 получен 💜 Он в очереди на проверку. Менеджер проверит наличие и напишет вам здесь. Повторно оформлять заказ не нужно.", createdAt: now.toISOString(), isFromManager: true, userName: "Косметичка" }] };
  };
  function state() { try { const saved = JSON.parse(storage.getItem(STATE)); if (saved?.createdAt && Array.isArray(saved.messages)) return saved; } catch {} const next = initial(); storage.setItem(STATE, JSON.stringify(next)); return next; }
  function save(next) { storage.setItem(STATE, JSON.stringify(next)); queueMicrotask(emit); }
  function message(next, text, manager, userName) { next.messages.push({ id: next.messages.length + 1, text: text.slice(0, 4000), createdAt: new Date().toISOString(), isFromManager: manager, userName }); }
  const products = /* PRODUCTS */ [];
  function order() {
    const s = state();
    return { id: 1248, customerId: customer.id, status: s.status, statusLabel: s.status === "assembly" ? "Сборка" : "Ожидание", total: products.reduce((sum, p, i) => sum + p.price * (i === 0 ? 2 : 1), 0), comment: "Пример заказа для просмотра нового интерфейса", customerConfirmed: false, createdAt: s.createdAt, updatedAt: s.createdAt, deliveryType: "delivery", deliveryAddress: customer.address, editable: true, needsConfirm: false, discount: 0, bonusesApplied: 0, bonusesCollected: 0, oneCExportedAt: null, oneCNumber: null, oneCError: null, bitrixDealId: null, changesSnapshot: null, manager: null, pickerId: s.phase === "queued" ? null : staff.id, picker: s.phase === "queued" ? null : { id: staff.id, name: staff.name }, customer, items: products.map((p, i) => ({ id: i + 1, productId: p.id, productName: p.name, quantity: i === 0 ? 2 : 1, price: p.price, total: p.price * (i === 0 ? 2 : 1), barcode: null, variantName: null, imagePath: p.image, imageUrl: p.image, check: null, photos: [] })), removedItems: [], messages: [], statusLogs: [], canHoldForContact: false, serviceCarePreview: { phase: s.phase, managerName: s.phase === "queued" ? null : staff.name, expectedAt: s.expectedAt } };
  }
  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input, init = {}) => {
    const url = new URL(typeof input === "string" ? input : input.url, location.href);
    if (!url.pathname.startsWith("/api/")) return originalFetch(input, init);
    const method = (init.method || input.method || "GET").toUpperCase(), path = url.pathname;
    window.__previewApiCalls = (window.__previewApiCalls || 0) + 1;
    const response = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
    let body = {}; try { body = JSON.parse(init.body || "{}"); } catch {}
    if (method === "POST" && path === "/api/preview/order-service/1248/take") {
      const s = state(); if (s.phase === "queued") { s.phase = "checking"; message(s, "Менеджер Раяна взяла ваш заказ в работу. Сейчас проверяем наличие и итоговую сумму. Напишем вам после проверки.", true, "Косметичка"); save(s); }
      return response({ success: true });
    }
    if (method === "POST" && ["/api/admin/orders/1248/customer-messages", "/api/orders/1248/messages"].includes(path)) {
      const s = state(), fromManager = path.startsWith("/api/admin/"); if (typeof body.text !== "string" || !body.text.trim()) return response({ error: "Напишите сообщение" }, 400);
      message(s, body.text, fromManager, fromManager ? staff.name : customer.name); save(s); return response({ success: true, message: s.messages.at(-1) });
    }
    if (method !== "GET") return response({ error: "Это предпросмотр: здесь доступны взятие заказа в работу и переписка по примеру." }, 409);
    if (path === "/api/auth/me" || path === "/api/mobile/profile") return response({ customer });
    if (path === "/api/team/me") return response(staff);
    if (path === "/api/mobile/orders/1248") return response(order());
    if (path === "/api/team/orders/1248") return response({ order: order(), pickers: [staff], actions: [], allowedTransitions: [], canEditItems: false, statusLabels: { pending: "Ожидание", assembly: "Сборка", cancelled: "Отменён" } });
    if (path === "/api/orders/1248/messages") return response({ messages: state().messages });
    if (path === "/api/admin/orders/1248/customer-messages") return response({ messages: state().messages.map(m => ({ ...m, isFromPicker: m.isFromManager })) });
    if (path === "/api/mobile/orders/status") return response({ statuses: [{ id: 1248, status: state().status, needsConfirm: false }], count: 1 });
    if (path === "/api/mobile/orders" || path === "/api/team/orders") return response({ orders: [order()], page: 1, totalPages: 1, totalCount: 1, pageSize: 50, filters: {}, counts: { total: 1, sum: order().total, byStatus: [] }, todayCounts: { total: 1, byStatus: [] } });
    if (path.includes("notifications")) return response({ items: [], notifications: [], unread: 0 });
    if (path.includes("badges")) return response({ counts: {} });
    if (path.includes("review")) return response({ review: null });
    if (path.includes("catalog-meta")) return response({ categories: [], brands: [] });
    if (path.includes("cart")) return response({ items: [], comment: "" });
    if (path.includes("favorites")) return response({ ids: [], items: [] });
    if (path.includes("loyalty")) return response({ linked: false, configured: false, card: null });
    return response({ items: [], products: [], messages: [] });
  };
})();
