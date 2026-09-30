import { 
  listenInventaris, 
  listenPenyewaan, 
  tambahBarang, 
  updateBarang, 
  hapusBarang, 
  buatTransaksiSewa, 
  selesaikanPenyewaan, 
  batalkanPenyewaan,
  SAMPLE_TEMPLATES,
  seedSampleInventaris,
  EVENT_PACKAGES
} from "./stockService.js";

// Domestic currency formatter
const formatRupiah = (val) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val || 0);

// Global state cache
let currentInventaris = [];
let currentPenyewaan = [];
let activeStockViewMode = "table"; // "table" | "cards"
let activeOrderViewMode = "kanban"; // "kanban" | "table"

// Navigation Elements
const navFrontpage = document.getElementById("nav-frontpage");
const navKatalog = document.getElementById("nav-katalog");
const navDashboard = document.getElementById("nav-dashboard");
const brandNav = document.getElementById("brand-nav");

const pageFrontpage = document.getElementById("page-frontpage");
const pageKatalog = document.getElementById("page-katalog");
const pageDashboard = document.getElementById("page-dashboard");

const mobileMenuToggle = document.getElementById("mobile-menu-toggle");
const navLinks = document.getElementById("nav-links");

const btnHeroKatalog = document.getElementById("btn-hero-katalog");
const btnHeroAdmin = document.getElementById("btn-hero-admin");
const mobileFabSewa = document.getElementById("mobile-fab-sewa");

// Stats Elements - Stock Admin
const elStatsTotalItems = document.getElementById("stat-total-items");
const elStatsTotalStok = document.getElementById("stat-total-stok");
const elStatsStokTersedia = document.getElementById("stat-stok-tersedia");
const elStatsStokTersewa = document.getElementById("stat-stok-tersewa");
const elStatsStokHabis = document.getElementById("stat-stok-habis");

// Stats Elements - Order Admin
const elStatOrderBerjalan = document.getElementById("stat-order-berjalan");
const elStatOrderSelesai = document.getElementById("stat-order-selesai");
const elStatOrderBatal = document.getElementById("stat-order-batal");
const elStatTotalOmset = document.getElementById("stat-total-omset");

const elInventarisTable = document.getElementById("inventaris-table-body");
const inventarisTableWrapper = document.getElementById("inventaris-table-wrapper");
const inventarisCardsContainer = document.getElementById("inventaris-cards-container");
const elSearchInput = document.getElementById("search-input");
const elFilterKategori = document.getElementById("filter-kategori");

// Public Catalog Elements
const publicSearchInput = document.getElementById("public-search-input");
const publicFilterKategori = document.getElementById("public-filter-kategori");

const elPenyewaanTable = document.getElementById("penyewaan-table-body");
const penyewaanTableWrapper = document.getElementById("penyewaan-table-wrapper");
const penyewaanKanbanContainer = document.getElementById("penyewaan-kanban-container");
const btnSeedSample = document.getElementById("btn-seed-sample");

// View Toggle Buttons
const btnViewStockTable = document.getElementById("btn-view-stock-table");
const btnViewStockCards = document.getElementById("btn-view-stock-cards");
const btnViewOrderKanban = document.getElementById("btn-view-order-kanban");
const btnViewOrderTable = document.getElementById("btn-view-order-table");

// Tab Navigation Elements
const tabStokBtn = document.getElementById("tab-stok-btn");
const tabOrdersBtn = document.getElementById("tab-orders-btn");
const tabStokView = document.getElementById("tab-stok-view");
const tabOrdersView = document.getElementById("tab-orders-view");
const badgeStokCount = document.getElementById("badge-stok-count");
const badgeOrdersCount = document.getElementById("badge-orders-count");
const elFilterStatusOrder = document.getElementById("filter-status-order");

// Modal Elements - Item
const modalItem = document.getElementById("modal-item");
const formItem = document.getElementById("form-item");
const modalItemTitle = document.getElementById("modal-item-title");
const inputTemplatePreset = document.getElementById("item-template-preset");
const inputItemId = document.getElementById("item-id");
const inputNamaBarang = document.getElementById("item-nama");
const inputKategori = document.getElementById("item-kategori");
const inputTotalStok = document.getElementById("item-stok");
const inputHargaSewa = document.getElementById("item-harga");
const inputDeskripsi = document.getElementById("item-deskripsi");
const btnTambahBarang = document.getElementById("btn-tambah-barang");
const btnCloseModalItem = document.getElementById("btn-close-modal-item");

// Modal Elements - Rental
const modalSewa = document.getElementById("modal-sewa");
const formSewa = document.getElementById("form-sewa");
const sewaPackagePreset = document.getElementById("sewa-package-preset");
const containerPackageScale = document.getElementById("container-package-scale");
const sewaPackageScale = document.getElementById("sewa-package-scale");
const sewaPackageDesc = document.getElementById("sewa-package-desc");
const inputPelanggan = document.getElementById("sewa-pelanggan");
const inputTelepon = document.getElementById("sewa-telepon");
const inputAlamat = document.getElementById("sewa-alamat");
const inputTglSewa = document.getElementById("sewa-tgl-mulai");
const inputTglKembali = document.getElementById("sewa-tgl-selesai");
const containerItemsSewa = document.getElementById("container-items-sewa");
const btnAddRowSewa = document.getElementById("btn-add-row-sewa");
const elTotalBiayaSewa = document.getElementById("sewa-total-biaya");
const btnBuatSewa = document.getElementById("btn-buat-sewa");
const btnCloseModalSewa = document.getElementById("btn-close-modal-sewa");

// Event Listeners Initialization
function initEventListeners() {
  // Page Navigation Listeners
  brandNav?.addEventListener("click", () => switchPageView("frontpage"));
  navFrontpage?.addEventListener("click", () => switchPageView("frontpage"));
  navKatalog?.addEventListener("click", () => switchPageView("katalog"));
  navDashboard?.addEventListener("click", () => switchPageView("dashboard"));
  btnHeroAdmin?.addEventListener("click", () => switchPageView("dashboard"));
  btnHeroKatalog?.addEventListener("click", () => switchPageView("katalog"));

  // Mobile Menu Toggle & FAB
  mobileMenuToggle?.addEventListener("click", () => navLinks?.classList.toggle("mobile-open"));
  mobileFabSewa?.addEventListener("click", () => openModalSewa());

  // Main Dashboard Tab Switcher
  tabStokBtn?.addEventListener("click", () => switchTab("stok"));
  tabOrdersBtn?.addEventListener("click", () => switchTab("orders"));

  // View Mode Toggles (Stock View)
  btnViewStockTable?.addEventListener("click", () => switchStockView("table"));
  btnViewStockCards?.addEventListener("click", () => switchStockView("cards"));

  // View Mode Toggles (Order View)
  btnViewOrderKanban?.addEventListener("click", () => switchOrderView("kanban"));
  btnViewOrderTable?.addEventListener("click", () => switchOrderView("table"));

  // Seed sample data handler
  btnSeedSample?.addEventListener("click", handleSeedSample);

  // Modal Item handlers
  btnTambahBarang?.addEventListener("click", () => openModalItem());
  btnCloseModalItem?.addEventListener("click", () => closeModalItem());
  inputTemplatePreset?.addEventListener("change", handleApplyPreset);
  formItem?.addEventListener("submit", handleSaveItem);

  // Modal Rental handlers
  btnBuatSewa?.addEventListener("click", () => openModalSewa());
  document.getElementById("btn-close-modal-sewa")?.addEventListener("click", () => closeModalSewa());
  document.getElementById("btn-sewa-cancel")?.addEventListener("click", () => closeModalSewa());
  document.getElementById("btn-sewa-confirm")?.addEventListener("click", () => {
    document.getElementById("btn-sewa-submit-hidden")?.click();
  });
  document.getElementById("btn-sewa-toggle-size")?.addEventListener("click", () => {
    const panel = document.getElementById("sewa-panel");
    const btn = document.getElementById("btn-sewa-toggle-size");
    if (panel) {
      panel.classList.toggle("fullscreen");
      btn.textContent = panel.classList.contains("fullscreen") ? "⊡ Compact" : "⛶ Fullscreen";
    }
  });
  btnAddRowSewa?.addEventListener("click", () => addRentalItemRow());
  sewaPackagePreset?.addEventListener("change", handleApplyEventPackage);
  sewaPackageScale?.addEventListener("change", handleApplyEventPackage);
  formSewa?.addEventListener("submit", handleSaveRental);

  // Filter & Search - Admin Stock
  elSearchInput?.addEventListener("input", () => {
    renderInventarisTable();
    renderStockCardsView();
  });
  elFilterKategori?.addEventListener("change", () => {
    renderInventarisTable();
    renderStockCardsView();
  });

  // Filter & Search - Public Catalog
  publicSearchInput?.addEventListener("input", renderPublicCatalog);
  publicFilterKategori?.addEventListener("change", renderPublicCatalog);

  // Filter & Search - Admin Orders
  elFilterStatusOrder?.addEventListener("change", () => {
    renderPenyewaanTable();
    renderOrderKanbanBoard();
  });

  // Auto calculate total price on date change
  inputTglSewa?.addEventListener("change", calculateRentalTotal);
  inputTglKembali?.addEventListener("change", calculateRentalTotal);

  // Close modals when clicking backdrop
  window.addEventListener("click", (e) => {
    if (e.target === modalItem) closeModalItem();
    if (e.target === modalSewa) closeModalSewa();
  });
}

function switchPageView(page) {
  navLinks?.classList.remove("mobile-open");
  
  navFrontpage?.classList.remove("active");
  navKatalog?.classList.remove("active");
  navDashboard?.classList.remove("active");

  pageFrontpage?.classList.remove("active");
  pageKatalog?.classList.remove("active");
  pageDashboard?.classList.remove("active");

  if (page === "frontpage") {
    navFrontpage?.classList.add("active");
    pageFrontpage?.classList.add("active");
  } else if (page === "katalog") {
    navKatalog?.classList.add("active");
    pageKatalog?.classList.add("active");
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } else if (page === "dashboard") {
    navDashboard?.classList.add("active");
    pageDashboard?.classList.add("active");
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

function switchTab(tabName) {
  if (tabName === "stok") {
    tabStokBtn?.classList.add("active");
    tabOrdersBtn?.classList.remove("active");
    tabStokView?.classList.add("active");
    tabOrdersView?.classList.remove("active");
  } else {
    tabOrdersBtn?.classList.add("active");
    tabStokBtn?.classList.remove("active");
    tabOrdersView?.classList.add("active");
    tabStokView?.classList.remove("active");
  }
}

function switchStockView(mode) {
  activeStockViewMode = mode;
  if (mode === "table") {
    btnViewStockTable?.classList.add("active");
    btnViewStockCards?.classList.remove("active");
    if (inventarisTableWrapper) inventarisTableWrapper.style.display = "block";
    if (inventarisCardsContainer) inventarisCardsContainer.style.display = "none";
  } else {
    btnViewStockCards?.classList.add("active");
    btnViewStockTable?.classList.remove("active");
    if (inventarisTableWrapper) inventarisTableWrapper.style.display = "none";
    if (inventarisCardsContainer) inventarisCardsContainer.style.display = "grid";
  }
}

function switchOrderView(mode) {
  activeOrderViewMode = mode;
  if (mode === "kanban") {
    btnViewOrderKanban?.classList.add("active");
    btnViewOrderTable?.classList.remove("active");
    if (penyewaanKanbanContainer) penyewaanKanbanContainer.style.display = "grid";
    if (penyewaanTableWrapper) penyewaanTableWrapper.style.display = "none";
  } else {
    btnViewOrderTable?.classList.add("active");
    btnViewOrderKanban?.classList.remove("active");
    if (penyewaanKanbanContainer) penyewaanKanbanContainer.style.display = "none";
    if (penyewaanTableWrapper) penyewaanTableWrapper.style.display = "block";
  }
}

// ----------------------------------------------------
// REALTIME DATA SUBSCRIBERS
// ----------------------------------------------------

function startRealtimeListeners() {
  // Listen Inventory
  listenInventaris((items) => {
    currentInventaris = items;
    updateCategoriesDropdown();
    renderStats();
    renderInventarisTable();
    renderStockCardsView();
    renderPublicCatalog();
  }, (err) => {
    console.error("Error listening to inventaris:", err);
  });

  // Listen Rentals
  listenPenyewaan((transaksi) => {
    currentPenyewaan = transaksi;
    renderStats();
    renderPenyewaanTable();
    renderOrderKanbanBoard();
  }, (err) => {
    console.error("Error listening to penyewaan:", err);
  });
}

// ----------------------------------------------------
// UI RENDERING & COMPUTATIONS
// ----------------------------------------------------

function renderStats() {
  // Stock Admin Statistics
  const totalItems = currentInventaris.length;
  const totalStok = currentInventaris.reduce((acc, i) => acc + (i.total_stok || 0), 0);
  const stokTersedia = currentInventaris.reduce((acc, i) => acc + (i.stok_tersedia || 0), 0);
  const stokTersewa = currentInventaris.reduce((acc, i) => acc + (i.stok_tersewa || 0), 0);
  const stokHabisCount = currentInventaris.filter(i => (i.stok_tersedia || 0) === 0).length;

  if (elStatsTotalItems) elStatsTotalItems.textContent = totalItems;
  if (elStatsTotalStok) elStatsTotalStok.textContent = totalStok;
  if (elStatsStokTersedia) elStatsStokTersedia.textContent = stokTersedia;
  if (elStatsStokTersewa) elStatsStokTersewa.textContent = stokTersewa;
  if (elStatsStokHabis) elStatsStokHabis.textContent = stokHabisCount;

  // Order Admin Statistics
  const orderBerjalan = currentPenyewaan.filter(p => p.status === "Berjalan").length;
  const orderSelesai = currentPenyewaan.filter(p => p.status === "Selesai").length;
  const orderBatal = currentPenyewaan.filter(p => p.status === "Dibatalkan").length;
  const totalOmset = currentPenyewaan
    .filter(p => p.status !== "Dibatalkan")
    .reduce((acc, p) => acc + (p.total_biaya || 0), 0);

  if (elStatOrderBerjalan) elStatOrderBerjalan.textContent = orderBerjalan;
  if (elStatOrderSelesai) elStatOrderSelesai.textContent = orderSelesai;
  if (elStatOrderBatal) elStatOrderBatal.textContent = orderBatal;
  if (elStatTotalOmset) elStatTotalOmset.textContent = formatRupiah(totalOmset);

  // Badges
  if (badgeStokCount) badgeStokCount.textContent = totalItems;
  if (badgeOrdersCount) badgeOrdersCount.textContent = orderBerjalan;
}

function updateCategoriesDropdown() {
  const categories = Array.from(new Set(currentInventaris.map(i => i.kategori || "Umum")));
  
  if (elFilterKategori) {
    const selectedVal = elFilterKategori.value;
    elFilterKategori.innerHTML = '<option value="">Semua Kategori</option>';
    categories.forEach(cat => {
      const opt = document.createElement("option");
      opt.value = cat;
      opt.textContent = cat;
      if (cat === selectedVal) opt.selected = true;
      elFilterKategori.appendChild(opt);
    });
  }

  if (publicFilterKategori) {
    const selectedVal = publicFilterKategori.value;
    publicFilterKategori.innerHTML = '<option value="">Semua Kategori</option>';
    categories.forEach(cat => {
      const opt = document.createElement("option");
      opt.value = cat;
      opt.textContent = cat;
      if (cat === selectedVal) opt.selected = true;
      publicFilterKategori.appendChild(opt);
    });
  }
}

function renderPublicCatalog() {
  const container = document.getElementById("public-catalog-container");
  if (!container) return;

  const searchText = (publicSearchInput?.value || "").toLowerCase();
  const selectedCat = publicFilterKategori?.value || "";

  const filtered = currentInventaris.filter(item => {
    const matchSearch = item.nama_barang.toLowerCase().includes(searchText) || (item.deskripsi || "").toLowerCase().includes(searchText);
    const matchCat = !selectedCat || item.kategori === selectedCat;
    return matchSearch && matchCat;
  });

  if (filtered.length === 0) {
    container.innerHTML = `<div class="text-muted" style="grid-column: 1 / -1; text-align: center; padding: 48px;">
      Tidak ada alat pesta yang cocok dengan pencarian. Klik <strong>'Seed Sample Data'</strong> di dashboard admin jika data masih kosong.
    </div>`;
    return;
  }

  container.innerHTML = filtered.map(item => {
    const isAvailable = item.stok_tersedia > 0;
    const badgeClass = isAvailable ? "badge-success" : "badge-danger";
    const statusText = isAvailable ? `Siap Sewa (${item.stok_tersedia} Unit)` : "Stok Kosong";

    return `
      <div class="catalog-card">
        <div>
          <div class="catalog-header">
            <span class="category-tag">${escapeHtml(item.kategori)}</span>
            <span class="badge ${badgeClass}">${statusText}</span>
          </div>
          <div class="catalog-title">${escapeHtml(item.nama_barang)}</div>
          <div class="catalog-desc">${escapeHtml(item.deskripsi || "Peralatan pesta siap pasang & kirim tepat waktu.")}</div>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 16px; border-top: 1px solid var(--border-color); padding-top: 12px;">
          <div class="catalog-price">${formatRupiah(item.harga_sewa)} <small style="font-size: 11px; color: var(--text-muted);">/hari</small></div>
          <button class="btn btn-secondary btn-order-direct" data-id="${item.id}" style="padding: 8px 14px; font-size: 12px;">Pesan Sekarang</button>
        </div>
      </div>
    `;
  }).join("");

  container.querySelectorAll(".btn-order-direct").forEach(btn => {
    btn.addEventListener("click", () => {
      switchPageView("dashboard");
      openModalSewa();
    });
  });
}

function getFilteredInventaris() {
  const queryText = (elSearchInput?.value || "").toLowerCase();
  const selectedCat = elFilterKategori?.value || "";

  return currentInventaris.filter(item => {
    const matchQuery = item.nama_barang.toLowerCase().includes(queryText) || (item.deskripsi || "").toLowerCase().includes(queryText);
    const matchCat = !selectedCat || item.kategori === selectedCat;
    return matchQuery && matchCat;
  });
}

function renderInventarisTable() {
  if (!elInventarisTable) return;
  const filtered = getFilteredInventaris();

  if (filtered.length === 0) {
    elInventarisTable.innerHTML = `<tr><td colspan="8" class="text-center text-muted">Tidak ada data inventaris.</td></tr>`;
    return;
  }

  elInventarisTable.innerHTML = filtered.map((item, index) => {
    const badgeClass = item.stok_tersedia === 0 ? "badge-danger" : (item.stok_tersedia < 5 ? "badge-warning" : "badge-success");
    return `
      <tr>
        <td data-label="#">${index + 1}</td>
        <td data-label="Nama Barang">
          <strong>${escapeHtml(item.nama_barang)}</strong>
          ${item.deskripsi ? `<br><small class="text-muted">${escapeHtml(item.deskripsi)}</small>` : ''}
        </td>
        <td data-label="Kategori"><span class="category-tag">${escapeHtml(item.kategori)}</span></td>
        <td data-label="Total Stok"><strong>${item.total_stok}</strong> unit</td>
        <td data-label="Siap Sewa"><span class="badge ${badgeClass}">${item.stok_tersedia} unit</span></td>
        <td data-label="Sedang Digunakan"><span class="badge badge-info">${item.stok_tersewa || 0} unit</span></td>
        <td data-label="Harga Sewa">${formatRupiah(item.harga_sewa)}/hari</td>
        <td data-label="Aksi">
          <button class="btn-action edit" data-id="${item.id}" title="Edit">✏️ Edit</button>
          <button class="btn-action delete" data-id="${item.id}" title="Hapus">🗑️ Hapus</button>
        </td>
      </tr>
    `;
  }).join("");

  elInventarisTable.querySelectorAll(".btn-action.edit").forEach(btn => {
    btn.addEventListener("click", () => {
      const item = currentInventaris.find(i => i.id === btn.dataset.id);
      if (item) openModalItem(item);
    });
  });

  elInventarisTable.querySelectorAll(".btn-action.delete").forEach(btn => {
    btn.addEventListener("click", () => handleDeleteItem(btn.dataset.id));
  });
}

function renderStockCardsView() {
  if (!inventarisCardsContainer) return;
  const filtered = getFilteredInventaris();

  if (filtered.length === 0) {
    inventarisCardsContainer.innerHTML = `<div class="text-muted text-center" style="grid-column: 1 / -1; padding: 32px;">Tidak ada data barang inventaris.</div>`;
    return;
  }

  inventarisCardsContainer.innerHTML = filtered.map(item => {
    const badgeClass = item.stok_tersedia === 0 ? "badge-danger" : (item.stok_tersedia < 5 ? "badge-warning" : "badge-success");
    return `
      <div class="stock-card-item">
        <div>
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
            <span class="category-tag">${escapeHtml(item.kategori)}</span>
            <span class="badge ${badgeClass}">${item.stok_tersedia} Unit Tersedia</span>
          </div>
          <div style="font-family: 'Outfit', sans-serif; font-size: 17px; font-weight: 700; margin-bottom: 6px;">${escapeHtml(item.nama_barang)}</div>
          <div style="font-size: 13px; color: var(--text-muted); margin-bottom: 14px;">${escapeHtml(item.deskripsi || "Kondisi baik & rutin dalam perawatan.")}</div>
        </div>
        <div>
          <div style="background: rgba(11, 15, 25, 0.6); padding: 10px 12px; border-radius: 8px; font-size: 12px; margin-bottom: 12px;">
            <div>Total Stok: <strong>${item.total_stok} unit</strong></div>
            <div>Sedang Tersewa: <strong style="color: var(--info);">${item.stok_tersewa || 0} unit</strong></div>
            <div style="color: var(--accent); font-family: 'Outfit', sans-serif; font-size: 15px; font-weight: 700; margin-top: 4px;">${formatRupiah(item.harga_sewa)} /hari</div>
          </div>
          <div style="display: flex; gap: 8px;">
            <button class="btn-action edit" data-id="${item.id}" style="flex: 1; text-align: center;">✏️ Edit</button>
            <button class="btn-action delete" data-id="${item.id}" style="flex: 1; text-align: center;">🗑️ Hapus</button>
          </div>
        </div>
      </div>
    `;
  }).join("");

  inventarisCardsContainer.querySelectorAll(".btn-action.edit").forEach(btn => {
    btn.addEventListener("click", () => {
      const item = currentInventaris.find(i => i.id === btn.dataset.id);
      if (item) openModalItem(item);
    });
  });

  inventarisCardsContainer.querySelectorAll(".btn-action.delete").forEach(btn => {
    btn.addEventListener("click", () => handleDeleteItem(btn.dataset.id));
  });
}

function renderPenyewaanTable() {
  if (!elPenyewaanTable) return;

  const selectedStatus = elFilterStatusOrder?.value || "";
  const filtered = currentPenyewaan.filter(tx => !selectedStatus || tx.status === selectedStatus);

  if (filtered.length === 0) {
    elPenyewaanTable.innerHTML = `<tr><td colspan="8" class="text-center text-muted">Tidak ada transaksi penyewaan${selectedStatus ? ` dengan status '${selectedStatus}'` : ''}.</td></tr>`;
    return;
  }

  elPenyewaanTable.innerHTML = filtered.map((tx, index) => {
    let statusBadge = "badge-info";
    if (tx.status === "Selesai") statusBadge = "badge-success";
    if (tx.status === "Dibatalkan") statusBadge = "badge-danger";

    const itemsSummary = (tx.items || []).map(i => `• ${escapeHtml(i.nama_barang)} (${i.jumlah} unit)`).join("<br>");

    return `
      <tr>
        <td data-label="#">${index + 1}</td>
        <td data-label="Pelanggan">
          <strong>${escapeHtml(tx.nama_pelanggan)}</strong><br>
          <small class="text-muted">📞 ${escapeHtml(tx.no_telepon)}</small>
        </td>
        <td data-label="Alamat"><small>${escapeHtml(tx.alamat_lokasi)}</small></td>
        <td data-label="Periode Sewa"><small>🗓️ ${tx.tanggal_sewa} s/d ${tx.tanggal_kembali}<br>(${tx.durasi_hari} hari)</small></td>
        <td data-label="Rincian Barang"><div class="item-summary-box">${itemsSummary}</div></td>
        <td data-label="Total Biaya"><strong>${formatRupiah(tx.total_biaya)}</strong></td>
        <td data-label="Status"><span class="badge ${statusBadge}">${tx.status}</span></td>
        <td data-label="Aksi">
          ${tx.status === "Berjalan" ? `
            <button class="btn-action complete" data-id="${tx.id}">✅ Selesai</button>
            <button class="btn-action cancel" data-id="${tx.id}">❌ Batal</button>
          ` : '<span class="text-muted">-</span>'}
        </td>
      </tr>
    `;
  }).join("");

  elPenyewaanTable.querySelectorAll(".btn-action.complete").forEach(btn => {
    btn.addEventListener("click", () => handleCompleteRental(btn.dataset.id));
  });

  elPenyewaanTable.querySelectorAll(".btn-action.cancel").forEach(btn => {
    btn.addEventListener("click", () => handleCancelRental(btn.dataset.id));
  });
}

// ----------------------------------------------------
// KANBAN BOARD RENDERING (ORDER STATUS FOCUS)
// ----------------------------------------------------

function renderOrderKanbanBoard() {
  if (!penyewaanKanbanContainer) return;

  const statuses = [
    { key: "Berjalan", title: "🚚 Order Berjalan (Aktif)", badgeClass: "badge-info" },
    { key: "Selesai", title: "✅ Order Selesai (Dikembalikan)", badgeClass: "badge-success" },
    { key: "Dibatalkan", title: "❌ Order Dibatalkan", badgeClass: "badge-danger" }
  ];

  const selectedStatus = elFilterStatusOrder?.value || "";

  penyewaanKanbanContainer.innerHTML = statuses
    .filter(s => !selectedStatus || s.key === selectedStatus)
    .map(col => {
      const ordersInCol = currentPenyewaan.filter(tx => tx.status === col.key);

      const cardsHtml = ordersInCol.length === 0 
        ? `<div class="text-muted text-center" style="padding: 32px; font-size: 13px;">Tidak ada order pada status ini.</div>`
        : ordersInCol.map(tx => {
            const itemsList = (tx.items || []).map(i => `• ${escapeHtml(i.nama_barang)} (<strong>${i.jumlah} unit</strong>)`).join("<br>");
            const cleanPhone = (tx.no_telepon || "").replace(/\D/g, '');
            const waLink = cleanPhone ? `https://wa.me/${cleanPhone.startsWith('0') ? '62' + cleanPhone.slice(1) : cleanPhone}` : null;

            return `
              <div class="kanban-card">
                <div class="kanban-card-header">
                  <div>
                    <div class="kanban-card-title">👤 ${escapeHtml(tx.nama_pelanggan)}</div>
                    ${waLink ? `<a href="${waLink}" target="_blank" style="color: var(--accent); font-size: 12px; text-decoration: none;">💬 Chat WhatsApp (${escapeHtml(tx.no_telepon)})</a>` : `<small class="text-muted">📞 ${escapeHtml(tx.no_telepon)}</small>`}
                  </div>
                  <span class="badge ${col.badgeClass}">${tx.status}</span>
                </div>
                <div class="kanban-card-body">
                  <div>📍 <strong>Lokasi:</strong> ${escapeHtml(tx.alamat_lokasi)}</div>
                  <div>🗓️ <strong>Periode:</strong> ${tx.tanggal_sewa} s/d ${tx.tanggal_kembali} (${tx.durasi_hari} hari)</div>
                  <div style="background: rgba(11, 15, 25, 0.5); padding: 8px 10px; border-radius: 8px; margin-top: 4px;">
                    <div style="font-weight: 600; font-size: 12px; margin-bottom: 4px; color: var(--text-muted);">PERLENGKAPAN DISEWA:</div>
                    ${itemsList}
                  </div>
                </div>
                <div class="kanban-card-footer">
                  <div style="font-family: 'Outfit', sans-serif; font-size: 16px; font-weight: 700; color: var(--accent);">${formatRupiah(tx.total_biaya)}</div>
                  <div>
                    ${tx.status === "Berjalan" ? `
                      <button class="btn-action complete" data-id="${tx.id}">✅ Selesai</button>
                      <button class="btn-action cancel" data-id="${tx.id}">❌ Batal</button>
                    ` : ''}
                  </div>
                </div>
              </div>
            `;
          }).join("");

      return `
        <div class="kanban-column">
          <div class="kanban-column-header">
            <span>${col.title}</span>
            <span class="badge ${col.badgeClass}">${ordersInCol.length} Order</span>
          </div>
          <div style="display: flex; flex-direction: column; gap: 12px; overflow-y: auto;">
            ${cardsHtml}
          </div>
        </div>
      `;
    }).join("");

  penyewaanKanbanContainer.querySelectorAll(".btn-action.complete").forEach(btn => {
    btn.addEventListener("click", () => handleCompleteRental(btn.dataset.id));
  });

  penyewaanKanbanContainer.querySelectorAll(".btn-action.cancel").forEach(btn => {
    btn.addEventListener("click", () => handleCancelRental(btn.dataset.id));
  });
}

// ----------------------------------------------------
// MODAL & HANDLERS - ITEM
// ----------------------------------------------------

function populatePresetDropdown() {
  if (!inputTemplatePreset) return;
  inputTemplatePreset.innerHTML = '<option value="">-- Manual / Tanpa Template --</option>';
  SAMPLE_TEMPLATES.forEach((tmpl, idx) => {
    const opt = document.createElement("option");
    opt.value = idx;
    opt.textContent = `[${tmpl.kategori}] ${tmpl.nama_barang}`;
    inputTemplatePreset.appendChild(opt);
  });
}

function openModalItem(item = null) {
  formItem.reset();
  populatePresetDropdown();

  if (item) {
    modalItemTitle.textContent = "Edit Barang Inventaris";
    inputItemId.value = item.id;
    inputNamaBarang.value = item.nama_barang;
    inputKategori.value = item.kategori;
    inputTotalStok.value = item.total_stok;
    inputHargaSewa.value = item.harga_sewa;
    inputDeskripsi.value = item.deskripsi || "";
  } else {
    modalItemTitle.textContent = "Tambah Barang Inventaris Baru";
    inputItemId.value = "";
  }
  modalItem.classList.add("active");
}

function handleApplyPreset(e) {
  const selectedIdx = e.target.value;
  if (selectedIdx === "") return;
  const tmpl = SAMPLE_TEMPLATES[selectedIdx];
  if (tmpl) {
    inputNamaBarang.value = tmpl.nama_barang;
    inputKategori.value = tmpl.kategori;
    inputTotalStok.value = tmpl.total_stok;
    inputHargaSewa.value = tmpl.harga_sewa;
    inputDeskripsi.value = tmpl.deskripsi;
  }
}

async function handleSeedSample() {
  if (confirm("Apakah Anda ingin memuat sample data inventaris alat pesta (Tenda, Kursi, Meja, AC, Panggung, Sound & Genset) ke Firestore?")) {
    try {
      btnSeedSample.disabled = true;
      btnSeedSample.textContent = "⏳ Memuat Sample Data...";
      await seedSampleInventaris();
      alert("Berhasil memuat sample data inventaris alat pesta!");
    } catch (err) {
      alert("Gagal memuat sample data: " + err.message);
    } finally {
      btnSeedSample.disabled = false;
      btnSeedSample.textContent = "🌱 Seed Sample Data";
    }
  }
}

function closeModalItem() {
  modalItem.classList.remove("active");
  formItem.reset();
}

async function handleSaveItem(e) {
  e.preventDefault();
  const id = inputItemId.value;
  const payload = {
    nama_barang: inputNamaBarang.value,
    kategori: inputKategori.value,
    total_stok: inputTotalStok.value,
    harga_sewa: inputHargaSewa.value,
    deskripsi: inputDeskripsi.value
  };

  try {
    if (id) {
      await updateBarang(id, payload);
      alert("Barang berhasil diperbarui.");
    } else {
      await tambahBarang(payload);
      alert("Barang berhasil ditambahkan.");
    }
    closeModalItem();
  } catch (err) {
    alert("Gagal menyimpan barang: " + err.message);
  }
}

async function handleDeleteItem(id) {
  const item = currentInventaris.find(i => i.id === id);
  if (!item) return;
  if (confirm(`Apakah Anda yakin ingin menghapus barang '${item.nama_barang}'?`)) {
    try {
      await hapusBarang(id);
      alert("Barang berhasil dihapus.");
    } catch (err) {
      alert("Gagal menghapus barang: " + err.message);
    }
  }
}

// ----------------------------------------------------
// MODAL & HANDLERS - RENTAL (WITH EVENT PACKAGE PRESETS)
// ----------------------------------------------------

function populatePackageDropdown() {
  if (!sewaPackagePreset) return;
  sewaPackagePreset.innerHTML = '<option value="">-- Manual (Pilih Barang Sendiri) --</option>';
  EVENT_PACKAGES.forEach((pkg, idx) => {
    const opt = document.createElement("option");
    opt.value = idx;
    opt.textContent = pkg.nama_paket;
    sewaPackagePreset.appendChild(opt);
  });
}

function openModalSewa() {
  formSewa.reset();
  populatePackageDropdown();
  containerItemsSewa.innerHTML = "";
  if (containerPackageScale) containerPackageScale.style.display = "none";

  // Reset package desc
  const descEmpty = document.getElementById("sewa-package-desc-empty");
  const descPkg = document.getElementById("sewa-package-desc");
  if (descEmpty) descEmpty.style.display = "block";
  if (descPkg) descPkg.textContent = "Pilih paket & skala untuk mengisi barang otomatis.";

  // Reset panel size
  const panel = document.getElementById("sewa-panel");
  const toggleBtn = document.getElementById("btn-sewa-toggle-size");
  if (panel) panel.classList.remove("fullscreen");
  if (toggleBtn) toggleBtn.textContent = "⛶ Fullscreen";

  // Set default dates (today to tomorrow)
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  inputTglSewa.value = today;
  inputTglKembali.value = tomorrow;

  // Add initial item row
  addRentalItemRow();
  calculateRentalTotal();
  modalSewa.classList.add("active");
}

function closeModalSewa() {
  modalSewa.classList.remove("active");
  formSewa.reset();
  containerItemsSewa.innerHTML = "";
}

function handleApplyEventPackage() {
  const pkgIdx = sewaPackagePreset?.value || "";
  if (pkgIdx === "") {
    if (containerPackageScale) containerPackageScale.style.display = "none";
    if (sewaPackageDesc) sewaPackageDesc.textContent = "Memilih paket acara akan otomatis mengisikan daftar barang & jumlah sesuai kapasitas audiensi event.";
    return;
  }

  const pkg = EVENT_PACKAGES[pkgIdx];
  if (!pkg) return;

  if (containerPackageScale) containerPackageScale.style.display = "grid";
  const descPkg = document.getElementById("sewa-package-desc");
  const descEmpty = document.getElementById("sewa-package-desc-empty");
  if (descPkg) descPkg.textContent = `📌 ${pkg.deskripsi}`;
  if (descEmpty) descEmpty.style.display = "none";

  containerItemsSewa.innerHTML = "";
  const scaleMultiplier = parseFloat(sewaPackageScale?.value || 1);

  let addedCount = 0;

  pkg.items.forEach(pkgItem => {
    // Find matching item in currentInventaris
    const matched = currentInventaris.find(inv => {
      const invName = inv.nama_barang.toLowerCase();
      return pkgItem.searchKeywords.some(kw => invName.includes(kw.toLowerCase()));
    });

    if (matched) {
      const targetQty = Math.max(1, Math.min(matched.stok_tersedia, Math.round(pkgItem.defaultQty * scaleMultiplier)));
      addRentalItemRow(matched.id, targetQty);
      addedCount++;
    }
  });

  if (addedCount === 0) {
    alert("Belum ada barang di inventaris yang cocok dengan paket ini. Silakan muat sample data inventaris terlebih dahulu.");
    addRentalItemRow();
  }

  calculateRentalTotal();
}

function addRentalItemRow(selectedItemId = "", defaultQty = 1) {
  const rowId = "row-" + Date.now() + "-" + Math.random().toString(36).substr(2, 4);
  const card = document.createElement("div");
  card.className = "item-sewa-card";
  card.id = rowId;

  const itemOptions = currentInventaris.map(i => `
    <option value="${i.id}" data-price="${i.harga_sewa}" data-available="${i.stok_tersedia}" ${i.id === selectedItemId ? 'selected' : ''}>
      ${escapeHtml(i.nama_barang)} — Tersedia: ${i.stok_tersedia} unit
    </option>
  `).join("");

  card.innerHTML = `
    <div style="min-width: 0;">
      <select class="item-sewa-select" required>
        <option value="" disabled ${!selectedItemId ? 'selected' : ''}>-- Pilih Barang --</option>
        ${itemOptions}
      </select>
      <div class="item-sewa-qty-row">
        <label style="font-size: 11px; color: var(--text-muted); font-weight: 600; white-space: nowrap;">Jumlah:</label>
        <input type="number" class="item-sewa-qty" min="1" value="${defaultQty}" placeholder="1" required>
        <span class="item-sewa-price-hint" id="hint-${rowId}">Pilih barang untuk melihat harga</span>
      </div>
    </div>
    <button type="button" class="btn-item-remove" title="Hapus item">×</button>
  `;

  containerItemsSewa.appendChild(card);

  const select = card.querySelector(".item-sewa-select");
  const qtyInput = card.querySelector(".item-sewa-qty");
  const btnRemove = card.querySelector(".btn-item-remove");
  const priceHint = card.querySelector(`#hint-${rowId}`);

  function updateHint() {
    const opt = select.options[select.selectedIndex];
    if (opt && opt.value) {
      const price = parseFloat(opt.dataset.price || 0);
      const avail = parseInt(opt.dataset.available || 0, 10);
      const qty = parseInt(qtyInput.value || 1, 10);
      if (priceHint) priceHint.textContent = `${formatRupiah(price)}/hari · Stok: ${avail} unit`;
    } else {
      if (priceHint) priceHint.textContent = "Pilih barang untuk melihat harga";
    }
    calculateRentalTotal();
  }

  select.addEventListener("change", updateHint);
  qtyInput.addEventListener("input", updateHint);
  btnRemove.addEventListener("click", () => {
    const allRows = containerItemsSewa.querySelectorAll(".item-sewa-card");
    if (allRows.length > 1) {
      card.remove();
      calculateRentalTotal();
    } else {
      alert("Minimal 1 barang harus dipilih.");
    }
  });

  // Trigger hint if pre-selected
  if (selectedItemId) updateHint();
}

function calculateRentalTotal() {
  if (!inputTglSewa.value || !inputTglKembali.value) {
    if (elTotalBiayaSewa) elTotalBiayaSewa.textContent = formatRupiah(0);
    return;
  }

  const start = new Date(inputTglSewa.value);
  const end = new Date(inputTglKembali.value);
  const diffTime = end - start;
  const durasi = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

  let total = 0;
  const cards = containerItemsSewa.querySelectorAll(".item-sewa-card");

  cards.forEach(card => {
    const select = card.querySelector(".item-sewa-select");
    const qtyInput = card.querySelector(".item-sewa-qty");
    if (!select || !qtyInput) return;
    const selectedOpt = select.options[select.selectedIndex];

    if (selectedOpt && selectedOpt.value) {
      const price = parseFloat(selectedOpt.dataset.price || 0);
      const qty = parseInt(qtyInput.value || 0, 10);
      total += price * qty * durasi;
    }
  });

  if (elTotalBiayaSewa) elTotalBiayaSewa.textContent = `${formatRupiah(total)} (${durasi} Hari)`;
}

async function handleSaveRental(e) {
  e.preventDefault();
  
  const items = [];
  const cards = containerItemsSewa.querySelectorAll(".item-sewa-card");

  let isValid = true;

  cards.forEach(card => {
    const select = card.querySelector(".item-sewa-select");
    const qtyInput = card.querySelector(".item-sewa-qty");
    if (!select || !qtyInput) return;
    const selectedOpt = select.options[select.selectedIndex];

    if (!selectedOpt || !selectedOpt.value) {
      isValid = false;
      return;
    }

    const available = parseInt(selectedOpt.dataset.available || 0, 10);
    const qty = parseInt(qtyInput.value || 0, 10);

    if (qty > available) {
      const namaBarang = selectedOpt.text.split('—')[0].trim();
      alert(`Stok '${namaBarang}' tidak cukup! Tersedia: ${available}, Diminta: ${qty}`);
      isValid = false;
      return;
    }

    items.push({
      itemId: selectedOpt.value,
      nama_barang: selectedOpt.text.split('—')[0].trim(),
      jumlah: qty,
      harga_sewa_per_hari: parseFloat(selectedOpt.dataset.price || 0)
    });
  });

  if (!isValid || items.length === 0) return;

  const payload = {
    nama_pelanggan: inputPelanggan.value,
    no_telepon: inputTelepon.value,
    alamat_lokasi: inputAlamat.value,
    tanggal_sewa: inputTglSewa.value,
    tanggal_kembali: inputTglKembali.value,
    items
  };

  try {
    await buatTransaksiSewa(payload);
    alert("Transaksi penyewaan berhasil dibuat & stok otomatis terpotong!");
    closeModalSewa();
  } catch (err) {
    alert("Gagal membuat penyewaan: " + err.message);
  }
}

async function handleCompleteRental(id) {
  if (confirm("Tandai transaksi ini sebagai Selesai? Stok barang akan dikembalikan ke inventaris.")) {
    try {
      await selesaikanPenyewaan(id);
      alert("Transaksi selesai. Stok telah dikembalikan.");
    } catch (err) {
      alert("Gagal menyelesaikan transaksi: " + err.message);
    }
  }
}

async function handleCancelRental(id) {
  if (confirm("Apakah Anda yakin ingin membatalkan transaksi ini? Stok barang akan dikembalikan.")) {
    try {
      await batalkanPenyewaan(id);
      alert("Transaksi dibatalkan. Stok telah dikembalikan.");
    } catch (err) {
      alert("Gagal membatalkan transaksi: " + err.message);
    }
  }
}

// Helper escape HTML
function escapeHtml(str) {
  return (str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// Start application
document.addEventListener("DOMContentLoaded", () => {
  initEventListeners();
  startRealtimeListeners();
});
