import { 
  listenInventaris, 
  listenPenyewaan, 
  tambahBarang, 
  updateBarang, 
  hapusBarang, 
  buatTransaksiSewa, 
  selesaikanPenyewaan, 
  batalkanPenyewaan,
  resetDemoOrders,
  updatePembayaran,
  SAMPLE_TEMPLATES,
  seedSampleInventaris,
  EVENT_PACKAGES
} from "./stockService.js?v=demo-separation-20260930";
import { 
  subscribeToAuthState, 
  createManagedUser,
  logoutUser, 
  getCurrentUserData,
  getCurrentUserRole,
  hasPermission,
  listManagedUsers,
  updateManagedUserStatus
} from "./authService.js?v=demo-separation-20260930";
import { showSuccess, showError, showWarning, showInfo } from "./toast.js";
import { initWorkersAndSPK, stopWorkersAndSPK, setupWorkersEventListeners, printInvoice } from "./workersModule.js?v=demo-separation-20260930";
import { createAnnualReportPdf, createDetailedReportPdf, shareOrDownloadPdf } from "./pdfReports.js?v=demo-separation-20260930";
import { isDemoMode, pageHref } from "./demoMode.js?v=demo-separation-20260930";

// Domestic currency formatter
const formatRupiah = (val) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val || 0);

// Global state cache
let currentInventaris = [];
let currentPenyewaan = [];
let activeStockViewMode = "table"; // "table" | "cards"
let activeOrderViewMode = "kanban"; // "kanban" | "table"

// Table sorting state
let currentSortColumn = null;
let currentSortDirection = "asc"; // "asc" | "desc"
let columnFilters = {};

// Auth state
let currentUser = null;
let currentUserRole = null;
let currentUserProfile = null;
let managedUsers = [];

// Navigation Elements
const navFrontpage = document.getElementById("nav-frontpage");
const navKatalog = document.getElementById("nav-katalog");
const navDashboard = document.getElementById("nav-dashboard");
const brandNav = document.getElementById("brand-nav");

// Auth Elements
const btnLogin = document.getElementById("btn-login");
const btnLogout = document.getElementById("btn-logout");
const userMenuContainer = document.getElementById("user-menu-container");
const userDisplayName = document.getElementById("user-display-name");

const pageFrontpage = document.getElementById("page-frontpage");
const pageKatalog = document.getElementById("page-katalog");
const pageDashboard = document.getElementById("page-dashboard");
const demoEnvironmentBanner = document.getElementById("demo-environment-banner");

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
const btnResetOrderDemo = document.getElementById("btn-reset-order-demo");

// View Toggle Buttons
const btnViewStockTable = document.getElementById("btn-view-stock-table");
const btnViewStockCards = document.getElementById("btn-view-stock-cards");
const btnViewOrderKanban = document.getElementById("btn-view-order-kanban");
const btnViewOrderTable = document.getElementById("btn-view-order-table");

// Tab Navigation Elements
const tabStokBtn = document.getElementById("tab-stok-btn");
const tabOrdersBtn = document.getElementById("tab-orders-btn");
const tabPekerjaBtn = document.getElementById("tab-pekerja-btn");
const tabUsersBtn = document.getElementById("tab-users-btn");
const tabStokView = document.getElementById("tab-stok-view");
const tabOrdersView = document.getElementById("tab-orders-view");
const tabPekerjaView = document.getElementById("tab-pekerja-view");
const tabUsersView = document.getElementById("tab-users-view");
const workersListSection = document.getElementById("workers-list-section");
const workerManagementStats = document.getElementById("worker-management-stats");
const managedUserForm = document.getElementById("form-managed-user");
const managedUserRole = document.getElementById("managed-user-role");
const managedWorkerField = document.getElementById("managed-worker-field");
const managedWorkerId = document.getElementById("managed-worker-id");
const managedUsersBody = document.getElementById("managed-users-body");
const btnRefreshManagedUsers = document.getElementById("btn-refresh-managed-users");
const btnCreateManagedUser = document.getElementById("btn-create-managed-user");
const badgeStokCount = document.getElementById("badge-stok-count");
const badgeOrdersCount = document.getElementById("badge-orders-count");
const elFilterStatusOrder = document.getElementById("filter-status-order");
const annualReportYear = document.getElementById("annual-report-year");
const btnExportAnnualReport = document.getElementById("btn-export-annual-report");
const btnExportAnnualPdf = document.getElementById("btn-export-annual-pdf");
const detailPeriodMode = document.getElementById("detail-period-mode");
const detailReportMonth = document.getElementById("detail-report-month");
const detailCustomRange = document.getElementById("detail-custom-range");
const detailReportStart = document.getElementById("detail-report-start");
const detailReportEnd = document.getElementById("detail-report-end");
const btnExportDetailCsv = document.getElementById("btn-export-detail-csv");
const btnExportDetailPdf = document.getElementById("btn-export-detail-pdf");

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
const sewaKategoriEvent = document.getElementById("sewa-kategori-event");
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

// Modal Pembayaran Elements
const modalPembayaran = document.getElementById("modal-pembayaran");
const formPembayaran = document.getElementById("form-pembayaran");
const btnCloseModalPembayaran = document.getElementById("btn-close-modal-pembayaran");
const btnPembayaranBatal = document.getElementById("btn-pembayaran-batal");
const pembayaranTransaksiId = document.getElementById("pembayaran-transaksi-id");
const pembayaranType = document.getElementById("pembayaran-type");
const pembayaranJumlah = document.getElementById("pembayaran-jumlah");
const pembayaranMetode = document.getElementById("pembayaran-metode");
const pembayaranCatatan = document.getElementById("pembayaran-catatan");
const paymentTotalBiaya = document.getElementById("payment-total-biaya");
const paymentDpAmount = document.getElementById("payment-dp-amount");
const paymentSisa = document.getElementById("payment-sisa");

// Current payment transaction being processed
let currentPaymentTransaction = null;

// Event Listeners Initialization
function initEventListeners() {
  // Page Navigation Listeners
  brandNav?.addEventListener("click", () => {
    switchPageView("frontpage");
    closeMobileMenu();
  });
  navFrontpage?.addEventListener("click", () => {
    switchPageView("frontpage");
    closeMobileMenu();
  });
  navKatalog?.addEventListener("click", () => {
    switchPageView("katalog");
    closeMobileMenu();
  });
  navDashboard?.addEventListener("click", () => {
    if (!currentUser) {
      showWarning("Silakan login untuk mengakses dashboard admin.");
      return;
    }
    if (!checkPermission("create")) {
      showError("Anda tidak memiliki akses ke dashboard admin. Hanya admin dan staff yang diizinkan.");
      return;
    }
    switchPageView("dashboard");
    closeMobileMenu();
  });
  btnHeroAdmin?.addEventListener("click", () => {
    if (!currentUser) {
      window.location.href = pageHref("login.html");
      return;
    }
    if (!checkPermission("create")) {
      showError("Anda tidak memiliki akses ke dashboard admin. Hanya admin dan staff yang diizinkan.");
      return;
    }
    switchPageView("dashboard");
    closeMobileMenu();
  });
  btnHeroKatalog?.addEventListener("click", () => {
    switchPageView("katalog");
    closeMobileMenu();
  });

  // Auth Listeners
  btnLogin?.addEventListener("click", () => {
    window.location.href = pageHref("login.html");
  });
  btnLogout?.addEventListener("click", handleLogout);

  // Mobile Menu Toggle & FAB

  // Close mobile menu when clicking outside
  document.addEventListener("click", (e) => {
    if (navLinks && navLinks.classList.contains("mobile-open") && 
        !navLinks.contains(e.target) && 
        e.target !== mobileMenuToggle) {
      closeMobileMenu();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && navLinks?.classList.contains("mobile-open")) {
      closeMobileMenu();
      mobileMenuToggle?.focus();
    }
  });

  mobileMenuToggle?.addEventListener("click", () => {
    const isOpen = navLinks?.classList.toggle("mobile-open") || false;
    mobileMenuToggle.setAttribute("aria-expanded", String(isOpen));
    mobileMenuToggle.setAttribute("aria-label", isOpen ? "Tutup menu navigasi" : "Buka menu navigasi");
    mobileMenuToggle.textContent = isOpen ? "×" : "☰";
  });
  mobileFabSewa?.addEventListener("click", () => {
    if (!currentUser) {
      alert("Silakan login untuk membuat transaksi sewa.");
      window.location.href = pageHref("login.html");
      return;
    }
    openModalSewa();
  });

  // Main Dashboard Tab Switcher
  tabStokBtn?.addEventListener("click", () => {
    if (!currentUser) return;
    switchTab("stok");
  });
  tabOrdersBtn?.addEventListener("click", () => {
    if (!currentUser) return;
    switchTab("orders");
  });
  tabPekerjaBtn?.addEventListener("click", () => {
    if (!currentUser) return;
    switchTab("pekerja");
  });
  tabUsersBtn?.addEventListener("click", () => {
    if (!checkPermission("manage_users")) return;
    switchTab("users");
  });
  managedUserForm?.addEventListener("submit", handleCreateManagedUser);
  managedUserRole?.addEventListener("change", updateManagedWorkerOptions);
  btnRefreshManagedUsers?.addEventListener("click", loadManagedUsers);
  window.addEventListener("workers-updated", updateManagedWorkerOptions);

  // View Mode Toggles (Stock View)
  btnViewStockTable?.addEventListener("click", () => switchStockView("table"));
  btnViewStockCards?.addEventListener("click", () => switchStockView("cards"));

  // View Mode Toggles (Order View)
  btnViewOrderKanban?.addEventListener("click", () => switchOrderView("kanban"));
  btnViewOrderTable?.addEventListener("click", () => switchOrderView("table"));

  // Seed sample data handler
  btnSeedSample?.addEventListener("click", handleSeedSample);
  btnResetOrderDemo?.addEventListener("click", handleResetOrderDemo);
  annualReportYear?.addEventListener("change", renderAnnualReport);
  btnExportAnnualReport?.addEventListener("click", exportAnnualReport);
  btnExportAnnualPdf?.addEventListener("click", exportAnnualReportPdf);
  if (detailReportMonth && !detailReportMonth.value) detailReportMonth.value = currentMonthValue();
  if (detailReportStart && !detailReportStart.value) detailReportStart.value = currentMonthValue() + "-01";
  if (detailReportEnd && !detailReportEnd.value) detailReportEnd.value = currentMonthEndValue();
  detailPeriodMode?.addEventListener("change", () => {
    const custom = detailPeriodMode.value === "custom";
    if (detailCustomRange) detailCustomRange.style.display = custom ? "flex" : "none";
    if (detailReportMonth) detailReportMonth.style.display = custom ? "none" : "";
    renderDetailedReport();
  });
  detailReportMonth?.addEventListener("change", renderDetailedReport);
  detailReportStart?.addEventListener("change", renderDetailedReport);
  detailReportEnd?.addEventListener("change", renderDetailedReport);
  btnExportDetailCsv?.addEventListener("click", exportDetailedReportCsv);
  btnExportDetailPdf?.addEventListener("click", exportDetailedReportPdf);

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

  // Modal Pembayaran handlers
  btnCloseModalPembayaran?.addEventListener("click", () => closeModalPembayaran());
  btnPembayaranBatal?.addEventListener("click", () => closeModalPembayaran());
  formPembayaran?.addEventListener("submit", handleSavePembayaran);
  
  // Auto-calculate payment amount when type changes
  pembayaranType?.addEventListener("change", (e) => {
    if (currentPaymentTransaction) {
      updatePaymentAmountSuggestions(e.target.value);
    }
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
  document.querySelectorAll(".public-event-category").forEach(select => {
    select.addEventListener("change", renderPublicEventPackages);
  });
  renderPublicEventPackages();

  // Filter & Search - Admin Orders
  elFilterStatusOrder?.addEventListener("change", () => {
    renderPenyewaanTable();
    renderOrderKanbanBoard();
  });

  // Initialize table sorting and filtering
  initTableSortAndFilter();
}

// ----------------------------------------------------
// AUTHENTICATION FUNCTIONS
// ----------------------------------------------------

function initAuthState() {
  subscribeToAuthState(async (user) => {
    if (user) {
      currentUser = user;
      currentUserRole = await getCurrentUserRole();
      currentUserProfile = await getCurrentUserData();
      if (currentUserProfile?.status === "inactive") {
        showError("Akun Anda dinonaktifkan oleh Admin.");
        await logoutUser();
        return;
      }
      
      updateAuthUI(true);
      initWorkersAndSPK(currentUserRole, currentUserProfile?.workerId);
      if (currentUserRole === "pekerja") {
        currentPenyewaan = [];
        window.currentPenyewaan = [];
        switchTab("pekerja");
      } else {
        startRealtimeListeners();
      }
    } else {
      currentUser = null;
      currentUserRole = null;
      currentUserProfile = null;
      stopWorkersAndSPK();
      
      updateAuthUI(false);
    }
  });
}

function updateAuthUI(isLoggedIn) {
  if (isLoggedIn) {
    const isWorker = currentUserRole === "pekerja";
    if (btnLogin) btnLogin.style.display = "none";
    if (userMenuContainer) userMenuContainer.style.display = "flex";
    if (userDisplayName) userDisplayName.textContent = currentUser?.displayName || currentUser?.email?.split('@')[0] || "Admin";
    
    // Show/hide dashboard based on role (only admin and staff can access)
    if (navDashboard) {
      const canAccessDashboard = checkPermission("create") || isWorker;
      navDashboard.style.display = canAccessDashboard ? "flex" : "none";
      if (tabOrdersBtn) tabOrdersBtn.style.display = isWorker ? "none" : "";
      if (tabStokBtn) tabStokBtn.style.display = isWorker ? "none" : "";
      if (tabPekerjaBtn) tabPekerjaBtn.style.display = "";
      if (tabUsersBtn) tabUsersBtn.style.display = checkPermission("manage_users") ? "" : "none";
      if (workersListSection) workersListSection.style.display = isWorker ? "none" : "";
      if (workerManagementStats) workerManagementStats.style.display = isWorker ? "none" : "";
    }
    
    // Show admin buttons only if user has permission
    const canCreate = checkPermission("create");
    const canDelete = checkPermission("delete");
    
    if (btnTambahBarang) btnTambahBarang.style.display = canCreate ? "inline-flex" : "none";
    if (btnBuatSewa) btnBuatSewa.style.display = canCreate ? "inline-flex" : "none";
    if (btnSeedSample) btnSeedSample.style.display = canDelete ? "inline-flex" : "none";
    if (btnResetOrderDemo) btnResetOrderDemo.style.display = canDelete ? "inline-flex" : "none";
    [btnExportAnnualReport, btnExportAnnualPdf, btnExportDetailCsv, btnExportDetailPdf].forEach(button => {
      if (button) button.style.display = isWorker ? "none" : "inline-flex";
    });
    if (mobileFabSewa) mobileFabSewa.style.display = isWorker ? "none" : "";
    const canManageWorkers = checkPermission("create");
    ["btn-seed-sample-pekerja", "btn-tambah-pekerja", "btn-buat-spk"].forEach(id => {
      const button = document.getElementById(id);
      if (button) button.style.display = canManageWorkers ? "inline-flex" : "none";
    });
    const clearSampleWorkers = document.getElementById("btn-clear-sample-pekerja");
    if (clearSampleWorkers) clearSampleWorkers.style.display = canDelete ? "inline-flex" : "none";
  } else {
    if (btnLogin) btnLogin.style.display = "inline-flex";
    if (userMenuContainer) userMenuContainer.style.display = "none";
    if (navDashboard) navDashboard.style.display = "none";
    
    if (btnTambahBarang) btnTambahBarang.style.display = "none";
    if (btnBuatSewa) btnBuatSewa.style.display = "none";
    if (btnSeedSample) btnSeedSample.style.display = "none";
    if (btnResetOrderDemo) btnResetOrderDemo.style.display = "none";
    [btnExportAnnualReport, btnExportAnnualPdf, btnExportDetailCsv, btnExportDetailPdf].forEach(button => {
      if (button) button.style.display = "none";
    });
    if (mobileFabSewa) mobileFabSewa.style.display = "none";
    [tabOrdersBtn, tabStokBtn, tabPekerjaBtn, tabUsersBtn].forEach(button => {
      if (button) button.style.display = "none";
    });
    if (workersListSection) workersListSection.style.display = "";
    if (workerManagementStats) workerManagementStats.style.display = "";
    ["btn-seed-sample-pekerja", "btn-clear-sample-pekerja", "btn-tambah-pekerja", "btn-buat-spk"].forEach(id => {
      const button = document.getElementById(id);
      if (button) button.style.display = "none";
    });
  }
}

async function handleLogout() {
  if (confirm("Apakah Anda yakin ingin keluar?")) {
    try {
      await logoutUser();
      window.location.href = pageHref("index.html");
    } catch (err) {
      alert("Gagal logout: " + err.message);
    }
  }
}

function checkPermission(action) {
  if (!currentUserRole) return false;
  return hasPermission(currentUserRole, action);
}

function updateManagedWorkerOptions() {
  if (!managedWorkerField || !managedWorkerId || !managedUserRole) return;
  const needsWorker = managedUserRole.value === "pekerja";
  managedWorkerField.style.display = needsWorker ? "block" : "none";
  managedWorkerId.required = needsWorker;

  const selectedWorkerId = managedWorkerId.value;
  const availableWorkers = (window.currentPekerja || []).filter(worker => !worker.authUid);
  managedWorkerId.replaceChildren();

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = availableWorkers.length
    ? "Pilih pekerja yang belum memiliki akun"
    : "Belum ada profil pekerja yang bisa ditautkan";
  managedWorkerId.appendChild(placeholder);

  availableWorkers.forEach(worker => {
    const option = document.createElement("option");
    option.value = worker.id;
    option.textContent = `${worker.nama} (${worker.posisi || "Pekerja"})`;
    managedWorkerId.appendChild(option);
  });
  managedWorkerId.value = availableWorkers.some(worker => worker.id === selectedWorkerId) ? selectedWorkerId : "";
}

async function loadManagedUsers() {
  if (!checkPermission("manage_users") || !managedUsersBody) return;
  managedUsersBody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">Memuat daftar akun...</td></tr>';

  try {
    managedUsers = await listManagedUsers();
    const workerNames = new Map((window.currentPekerja || []).map(worker => [worker.id, worker.nama]));
    managedUsers.sort((first, second) => (first.nama || first.email || "").localeCompare(second.nama || second.email || ""));
    managedUsersBody.innerHTML = managedUsers.length
      ? managedUsers.map(user => {
          const roleLabel = user.role === "pekerja" ? "Pekerja" : user.role === "admin" ? "Admin" : "Staff";
          const status = user.status || "active";
          const isSelf = user.uid === currentUser?.uid;
          return `<tr>
            <td>${escapeHtml(user.nama || "-")}</td>
            <td>${escapeHtml(user.email || "-")}</td>
            <td>${roleLabel}</td>
            <td>${escapeHtml(workerNames.get(user.workerId) || "-")}</td>
            <td><span class="badge ${status === "active" ? "badge-success" : "badge-danger"}">${status === "active" ? "Aktif" : "Nonaktif"}</span></td>
            <td>${isSelf
              ? '<span class="text-muted">Akun Anda</span>'
              : `<button class="btn-action ${status === "active" ? "cancel" : "complete"} managed-user-status" data-uid="${escapeHtml(user.uid)}" title="${status === "active" ? "Nonaktifkan akun" : "Aktifkan akun"}" aria-label="${status === "active" ? "Nonaktifkan akun" : "Aktifkan akun"}">${status === "active" ? "⏸️" : "▶️"}</button>`}</td>
          </tr>`;
        }).join("")
      : '<tr><td colspan="6" class="text-center text-muted">Belum ada akun.</td></tr>';

    managedUsersBody.querySelectorAll(".managed-user-status").forEach(button => {
      button.addEventListener("click", () => handleManagedUserStatus(button.dataset.uid));
    });
    updateManagedWorkerOptions();
  } catch (error) {
    managedUsersBody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">Daftar akun gagal dimuat.</td></tr>';
    showError("Gagal memuat akun: " + error.message);
  }
}

async function handleCreateManagedUser(event) {
  event.preventDefault();
  if (!checkPermission("manage_users")) {
    showError("Hanya admin yang dapat membuat akun.");
    return;
  }

  const payload = {
    nama: document.getElementById("managed-user-name").value.trim(),
    email: document.getElementById("managed-user-email").value.trim(),
    password: document.getElementById("managed-user-password").value,
    role: managedUserRole.value,
    workerId: managedWorkerId.value
  };

  try {
    btnCreateManagedUser.disabled = true;
    btnCreateManagedUser.textContent = "⏳ Membuat akun...";
    const user = await createManagedUser(payload);
    showSuccess(`Akun ${user.email} berhasil dibuat dengan role ${user.role}.`);
    managedUserForm.reset();
    managedUserRole.value = "staff";
    updateManagedWorkerOptions();
    await loadManagedUsers();
  } catch (error) {
    showError("Gagal membuat akun: " + error.message);
  } finally {
    btnCreateManagedUser.disabled = false;
    btnCreateManagedUser.textContent = "➕ Buat Akun";
  }
}

async function handleManagedUserStatus(uid) {
  if (!checkPermission("manage_users")) return;
  const user = managedUsers.find(item => item.uid === uid);
  if (!user || uid === currentUser?.uid) return;

  const nextStatus = user.status === "active" ? "inactive" : "active";
  const actionLabel = nextStatus === "active" ? "mengaktifkan" : "menonaktifkan";
  if (!confirm(`Yakin ingin ${actionLabel} akun ${user.email}?`)) return;

  try {
    await updateManagedUserStatus(uid, nextStatus);
    showSuccess(`Akun ${user.email} sekarang ${nextStatus === "active" ? "aktif" : "nonaktif"}.`);
    await loadManagedUsers();
  } catch (error) {
    showError("Gagal mengubah status akun: " + error.message);
  }
}

// ----------------------------------------------------
// TABLE SORTING & FILTERING FUNCTIONS
// ----------------------------------------------------

function initTableSortAndFilter() {
  // Sort headers
  document.querySelectorAll(".sortable-header").forEach(header => {
    header.addEventListener("click", () => {
      const sortCol = header.dataset.sort;
      handleSort(sortCol);
    });
  });

  // Filter inputs
  document.querySelectorAll(".filter-input").forEach(input => {
    input.addEventListener("input", (e) => {
      const filterCol = e.target.dataset.filter;
      const value = e.target.value.trim();
      handleFilter(filterCol, value);
    });
  });

  // Filter select (kategori)
  document.querySelectorAll(".filter-select").forEach(select => {
    select.addEventListener("change", (e) => {
      const filterCol = e.target.dataset.filter;
      const value = e.target.value;
      handleFilter(filterCol, value);
    });
  });
}

function handleSort(column) {
  const colMap = {
    "#": "index",
    "nama": "nama_barang",
    "kategori": "kategori",
    "total_stok": "total_stok",
    "stok_tersedia": "stok_tersedia",
    "stok_tersewa": "stok_tersewa",
    "harga_sewa": "harga_sewa"
  };

  const sortKey = colMap[column];
  if (!sortKey) return;

  if (currentSortColumn === sortKey) {
    currentSortDirection = currentSortDirection === "asc" ? "desc" : "asc";
  } else {
    currentSortColumn = sortKey;
    currentSortDirection = "asc";
  }

  renderInventarisTable();
  renderStockCardsView();
}

function handleFilter(column, value) {
  const colMap = {
    "#": "index",
    "nama": "nama_barang",
    "kategori": "kategori",
    "total_stok": "total_stok",
    "stok_tersedia": "stok_tersedia",
    "stok_tersewa": "stok_tersewa",
    "harga_sewa": "harga_sewa"
  };

  const filterKey = colMap[column];
  if (!filterKey) return;

  if (value === "") {
    delete columnFilters[filterKey];
  } else {
    columnFilters[filterKey] = value;
  }

  renderInventarisTable();
  renderStockCardsView();
}

function updateSortHeaders() {
  document.querySelectorAll(".sortable-header").forEach(header => {
    const colMap = {
      "#": "index",
      "nama": "nama_barang",
      "kategori": "kategori",
      "total_stok": "total_stok",
      "stok_tersedia": "stok_tersedia",
      "stok_tersewa": "stok_tersewa",
      "harga_sewa": "harga_sewa"
    };

    const sortKey = colMap[header.dataset.sort];
    
    header.classList.remove("active", "asc", "desc");
    
    if (sortKey === currentSortColumn) {
      header.classList.add("active", currentSortDirection);
    }
  });
}

function updateCategoryFilterOptions() {
  const select = document.querySelector('.filter-select[data-filter="kategori"]');
  if (!select) return;

  const categories = Array.from(new Set(currentInventaris.map(i => i.kategori || "Umum")));
  const currentVal = select.value;
  
  select.innerHTML = '<option value="">Semua</option>';
  categories.forEach(cat => {
    const opt = document.createElement("option");
    opt.value = cat;
    opt.textContent = cat;
    if (cat === currentVal) opt.selected = true;
    select.appendChild(opt);
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
    // Check permission before allowing access to dashboard
    if (!currentUser) {
      showError("Silakan login untuk mengakses dashboard admin.");
      window.location.href = pageHref("login.html");
      return;
    }
    
    if (!checkPermission("create") && currentUserRole !== "pekerja") {
      showError("❌ Akses Ditolak: Anda tidak memiliki izin untuk mengakses dashboard admin.");
      navFrontpage?.classList.add("active");
      pageFrontpage?.classList.add("active");
      return;
    }
    
    navDashboard?.classList.add("active");
    pageDashboard?.classList.add("active");
    if (currentUserRole === "pekerja") switchTab("pekerja");
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

function switchTab(tabName) {
  tabOrdersBtn?.classList.remove("active");
  tabStokBtn?.classList.remove("active");
  tabPekerjaBtn?.classList.remove("active");
  tabUsersBtn?.classList.remove("active");

  tabOrdersView?.classList.remove("active");
  tabStokView?.classList.remove("active");
  tabPekerjaView?.classList.remove("active");
  tabUsersView?.classList.remove("active");

  if (tabName === "users" && checkPermission("manage_users")) {
    tabUsersBtn?.classList.add("active");
    tabUsersView?.classList.add("active");
    updateManagedWorkerOptions();
    loadManagedUsers();
  } else if (tabName === "stok" && checkPermission("create")) {
    tabStokBtn?.classList.add("active");
    tabStokView?.classList.add("active");
  } else if (tabName === "pekerja" && (checkPermission("create") || currentUserRole === "pekerja")) {
    tabPekerjaBtn?.classList.add("active");
    tabPekerjaView?.classList.add("active");
  } else if (tabName === "orders" && checkPermission("create")) {
    tabOrdersBtn?.classList.add("active");
    tabOrdersView?.classList.add("active");
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
    window.currentPenyewaan = transaksi;
    updateAnnualReportYears();
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

function getOrderReportYear(order) {
  const eventYear = Number(String(order.tanggal_sewa || "").slice(0, 4));
  if (Number.isInteger(eventYear) && eventYear > 0) return eventYear;

  const createdAt = order.createdAt?.toDate?.() || new Date(order.createdAt || NaN);
  return Number.isNaN(createdAt.getTime()) ? null : createdAt.getFullYear();
}

function updateAnnualReportYears() {
  if (!annualReportYear) return;

  const previousYear = annualReportYear.value;
  const years = new Set(currentPenyewaan.map(getOrderReportYear).filter(Boolean));
  years.add(new Date().getFullYear());
  if (previousYear) years.add(Number(previousYear));

  const sortedYears = [...years].sort((first, second) => second - first);
  annualReportYear.innerHTML = sortedYears
    .map(year => `<option value="${year}">${year}</option>`)
    .join("");
  annualReportYear.value = previousYear && years.has(Number(previousYear))
    ? previousYear
    : String(sortedYears[0]);
  renderAnnualReport();
  renderDetailedReport();
}

function buildAnnualReport(year) {
  const orders = currentPenyewaan.filter(order => getOrderReportYear(order) === year);
  const categories = new Map();
  const inventory = new Map();
  let revenue = 0;
  let collected = 0;
  let receivable = 0;

  for (const order of orders) {
    const categoryName = order.kategori_event || "Belum dikategorikan";
    const category = categories.get(categoryName) || {
      name: categoryName,
      orders: 0,
      cancelled: 0,
      revenue: 0
    };
    category.orders++;

    if (order.status === "Dibatalkan") {
      category.cancelled++;
    } else {
      const total = Math.max(0, Number(order.total_biaya) || 0);
      const dpPaid = order.dp_paid ? Math.max(0, Number(order.dp_amount) || 0) : 0;
      const finalPaid = order.lunas_paid ? Math.max(0, Number(order.lunas_amount) || 0) : 0;
      const paid = Math.min(total, dpPaid + finalPaid || (order.payment_status === "lunas" ? total : 0));
      category.revenue += total;
      revenue += total;
      collected += paid;
      receivable += Math.max(0, total - paid);

      for (const item of order.items || []) {
        const itemKey = item.itemId || item.nama_barang || "Barang tidak diketahui";
        const used = inventory.get(itemKey) || {
          name: item.nama_barang || item.itemId || "Barang tidak diketahui",
          quantity: 0,
          orderIds: new Set()
        };
        used.quantity += Math.max(0, Number(item.jumlah) || 0);
        used.orderIds.add(order.id);
        inventory.set(itemKey, used);
      }
    }

    categories.set(categoryName, category);
  }

  return {
    year,
    orderCount: orders.length,
    cancelledCount: orders.filter(order => order.status === "Dibatalkan").length,
    revenue,
    collected,
    receivable,
    categories: [...categories.values()].sort((first, second) => second.orders - first.orders),
    inventory: [...inventory.values()]
      .map(item => ({ ...item, orders: item.orderIds.size }))
      .sort((first, second) => second.quantity - first.quantity)
  };
}

function renderAnnualReport() {
  const year = Number(annualReportYear?.value);
  if (!year) return;

  const report = buildAnnualReport(year);
  document.getElementById("annual-order-count").textContent = report.orderCount;
  document.getElementById("annual-revenue").textContent = formatRupiah(report.revenue);
  document.getElementById("annual-collected").textContent = formatRupiah(report.collected);
  document.getElementById("annual-receivable").textContent = formatRupiah(report.receivable);

  const categoryBody = document.getElementById("annual-category-body");
  categoryBody.innerHTML = report.categories.length
    ? report.categories.map(category => `
        <tr>
          <td>${escapeHtml(category.name)}</td>
          <td>${category.orders}</td>
          <td>${category.cancelled}</td>
          <td>${formatRupiah(category.revenue)}</td>
        </tr>
      `).join("")
    : '<tr><td colspan="4" class="text-center text-muted">Tidak ada order pada tahun ini.</td></tr>';

  const inventoryBody = document.getElementById("annual-inventory-body");
  inventoryBody.innerHTML = report.inventory.length
    ? report.inventory.map(item => `
        <tr>
          <td>${escapeHtml(item.name)}</td>
          <td>${item.quantity}</td>
          <td>${item.orders}</td>
        </tr>
      `).join("")
    : '<tr><td colspan="3" class="text-center text-muted">Belum ada pemakaian inventaris.</td></tr>';
}

function currentMonthValue() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function currentMonthEndValue() {
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return `${currentMonthValue()}-${String(lastDay).padStart(2, "0")}`;
}

function getOrderReportDate(order) {
  const eventDate = String(order.tanggal_sewa || "");
  if (/^\d{4}-\d{2}-\d{2}$/.test(eventDate) && !Number.isNaN(new Date(`${eventDate}T00:00:00`).getTime())) {
    return eventDate;
  }

  const createdAt = order.createdAt?.toDate?.() || new Date(order.createdAt || NaN);
  if (Number.isNaN(createdAt.getTime())) return null;
  return `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, "0")}-${String(createdAt.getDate()).padStart(2, "0")}`;
}

function getOrderFinancials(order) {
  const total = Math.max(0, Number(order.total_biaya) || 0);
  const dp = order.dp_paid ? Math.max(0, Number(order.dp_amount) || 0) : 0;
  const finalPayment = order.lunas_paid ? Math.max(0, Number(order.lunas_amount) || 0) : 0;
  const recorded = Math.min(total, dp + finalPayment || (order.payment_status === "lunas" ? total : 0));
  const cancelled = order.status === "Dibatalkan";
  const collected = cancelled ? 0 : recorded;

  return {
    total,
    dp,
    finalPayment,
    recorded,
    revenue: cancelled ? 0 : total,
    collected,
    receivable: cancelled ? 0 : Math.max(0, total - collected)
  };
}

function getDetailedReportPeriod() {
  if (detailPeriodMode?.value !== "custom") {
    const month = detailReportMonth?.value || currentMonthValue();
    if (!/^\d{4}-\d{2}$/.test(month)) return null;
    const [year, monthNumber] = month.split("-").map(Number);
    const lastDay = new Date(year, monthNumber, 0).getDate();
    return {
      startDate: `${month}-01`,
      endDate: `${month}-${String(lastDay).padStart(2, "0")}`,
      label: new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(new Date(year, monthNumber - 1, 1))
    };
  }

  const startDate = detailReportStart?.value || "";
  const endDate = detailReportEnd?.value || "";
  if (!startDate || !endDate || startDate > endDate) return null;
  return { startDate, endDate, label: `${startDate} sampai ${endDate}` };
}

function buildDetailedReport(period) {
  const orders = currentPenyewaan
    .map(order => ({ ...order, reportDate: getOrderReportDate(order) }))
    .filter(order => order.reportDate && order.reportDate >= period.startDate && order.reportDate <= period.endDate)
    .sort((first, second) => second.reportDate.localeCompare(first.reportDate));
  const inventory = new Map();
  const itemDetails = [];
  let revenue = 0;
  let collected = 0;
  let receivable = 0;

  const detailedOrders = orders.map(order => {
    const financials = getOrderFinancials(order);
    const duration = Math.max(1, Number(order.durasi_hari) || 1);
    const items = (order.items || []).map(item => {
      const quantity = Math.max(0, Number(item.jumlah) || 0);
      const unitPrice = Math.max(0, Number(item.harga_sewa_per_hari) || 0);
      const subtotal = quantity * unitPrice * duration;
      const detail = {
        itemId: item.itemId || "",
        name: item.nama_barang || item.itemId || "Barang tidak diketahui",
        category: item.kategori || "Umum",
        quantity,
        unitPrice,
        duration,
        subtotal,
        countedAsUsage: order.status !== "Dibatalkan"
      };
      itemDetails.push({ ...detail, reportDate: order.reportDate, orderId: order.id, customer: order.nama_pelanggan || "-", status: order.status || "-" });

      if (detail.countedAsUsage) {
        const key = detail.itemId || detail.name;
        const used = inventory.get(key) || {
          name: detail.name,
          category: detail.category,
          quantity: 0,
          orderIds: new Set(),
          subtotal: 0
        };
        used.quantity += quantity;
        used.orderIds.add(order.id);
        used.subtotal += subtotal;
        inventory.set(key, used);
      }

      return detail;
    });

    revenue += financials.revenue;
    collected += financials.collected;
    receivable += financials.receivable;
    return { ...order, ...financials, duration, items };
  });

  return {
    ...period,
    orderCount: detailedOrders.length,
    cancelledCount: detailedOrders.filter(order => order.status === "Dibatalkan").length,
    revenue,
    collected,
    receivable,
    orders: detailedOrders,
    itemDetails,
    inventory: [...inventory.values()]
      .map(item => ({ ...item, orders: item.orderIds.size }))
      .sort((first, second) => second.quantity - first.quantity)
  };
}

function renderDetailedReport() {
  const periodLabel = document.getElementById("detail-report-period-label");
  const orderBody = document.getElementById("detail-order-body");
  const inventoryBody = document.getElementById("detail-inventory-body");
  if (!periodLabel || !orderBody || !inventoryBody) return;

  const period = getDetailedReportPeriod();
  if (!period) {
    periodLabel.textContent = "Periksa periode: tanggal awal dan akhir harus diisi, dan tanggal awal tidak boleh melewati tanggal akhir.";
    orderBody.innerHTML = '<tr><td colspan="9" class="text-center text-muted">Periode belum valid.</td></tr>';
    inventoryBody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Periode belum valid.</td></tr>';
    ["detail-order-count", "detail-cancelled-count"].forEach(id => {
      document.getElementById(id).textContent = "0";
    });
    ["detail-revenue", "detail-collected", "detail-receivable"].forEach(id => {
      document.getElementById(id).textContent = formatRupiah(0);
    });
    return;
  }

  const report = buildDetailedReport(period);
  periodLabel.textContent = `Periode ${period.label} (${period.startDate} s.d. ${period.endDate})`;
  document.getElementById("detail-order-count").textContent = report.orderCount;
  document.getElementById("detail-cancelled-count").textContent = report.cancelledCount;
  document.getElementById("detail-revenue").textContent = formatRupiah(report.revenue);
  document.getElementById("detail-collected").textContent = formatRupiah(report.collected);
  document.getElementById("detail-receivable").textContent = formatRupiah(report.receivable);

  orderBody.innerHTML = report.orders.length
    ? report.orders.map(order => {
        const itemList = order.items.length
          ? `<details><summary>${order.items.length} item</summary><ul style="min-width: 220px; padding-left: 18px;">${order.items.map(item => `<li>${escapeHtml(item.name)} (${escapeHtml(item.category)}) × ${item.quantity} unit; ${formatRupiah(item.unitPrice)}/hari × ${item.duration} hari = ${formatRupiah(item.subtotal)}</li>`).join("")}</ul></details>`
          : "-";
        return `<tr>
          <td>${escapeHtml(order.reportDate)}</td>
          <td><strong>${escapeHtml(order.nama_pelanggan || "-")}</strong><br><small>${escapeHtml(order.id || "-")} · ${escapeHtml(order.alamat_lokasi || "-")}</small></td>
          <td>${escapeHtml(order.kategori_event || "Belum dikategorikan")}</td>
          <td>${escapeHtml(order.status || "-")}<br><small>${escapeHtml(order.payment_status || "-")}</small></td>
          <td>${formatRupiah(order.total)}</td>
          <td>${formatRupiah(order.dp)} / ${formatRupiah(order.finalPayment)}</td>
          <td>${formatRupiah(order.collected)}</td>
          <td>${formatRupiah(order.receivable)}</td>
          <td>${itemList}</td>
        </tr>`;
      }).join("")
    : '<tr><td colspan="9" class="text-center text-muted">Tidak ada order pada periode ini.</td></tr>';

  inventoryBody.innerHTML = report.inventory.length
    ? report.inventory.map(item => `<tr>
        <td>${escapeHtml(item.name)}</td>
        <td>${escapeHtml(item.category)}</td>
        <td>${item.quantity}</td>
        <td>${item.orders}</td>
        <td>${formatRupiah(item.subtotal)}</td>
      </tr>`).join("")
    : '<tr><td colspan="5" class="text-center text-muted">Belum ada pemakaian inventaris pada periode ini.</td></tr>';
}

function csvEscape(value) {
  const text = String(value ?? "");
  const safeText = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safeText.replace(/"/g, '""')}"`;
}

function exportAnnualReport() {
  const year = Number(annualReportYear?.value);
  if (!year) return;

  const report = buildAnnualReport(year);
  const rows = [
    ["Rekap Order Tahunan", report.year],
    [],
    ["Ringkasan Keuangan"],
    ["Jumlah order", report.orderCount],
    ["Order dibatalkan", report.cancelledCount],
    ["Omset order aktif/selesai (Rp)", report.revenue],
    ["Pembayaran diterima (Rp)", report.collected],
    ["Piutang (Rp)", report.receivable],
    [],
    ["Kategori Event", "Jumlah Order", "Dibatalkan", "Omset (Rp)"],
    ...report.categories.map(category => [category.name, category.orders, category.cancelled, category.revenue]),
    [],
    ["Inventaris Terpakai", "Jumlah Unit", "Jumlah Order"],
    ...report.inventory.map(item => [item.name, item.quantity, item.orders])
  ];
  const csv = rows.map(row => row.map(csvEscape).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `rekap-order-${year}.csv`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

async function exportAnnualReportPdf() {
  const year = Number(annualReportYear?.value);
  if (!year) return;

  try {
    const report = buildAnnualReport(year);
    const pdf = createAnnualReportPdf(report);
    const result = await shareOrDownloadPdf(
      pdf,
      `rekap-order-${year}.pdf`,
      `Rekap Order Tahunan ${year}`,
      `Ringkasan order, kategori event, inventaris, dan keuangan tahun ${year}.`
    );
    if (result === "shared") showSuccess("PDF rekap berhasil dibagikan.");
    if (result === "downloaded") showSuccess("PDF rekap berhasil diunduh.");
  } catch (error) {
    showError("Gagal membuat PDF rekap: " + error.message);
  }
}

function exportDetailedReportCsv() {
  const period = getDetailedReportPeriod();
  if (!period) {
    showWarning("Pilih periode laporan yang valid terlebih dahulu.");
    return;
  }

  const report = buildDetailedReport(period);
  const orderRows = report.orders.map(order => [
    order.reportDate,
    order.id,
    order.nama_pelanggan,
    order.no_telepon,
    order.alamat_lokasi,
    order.kategori_event || "Belum dikategorikan",
    order.tanggal_sewa,
    order.tanggal_kembali,
    order.duration,
    order.status,
    order.payment_status,
    order.total,
    order.dp,
    order.finalPayment,
    order.collected,
    order.receivable,
    order.items.map(item => `${item.name} (${item.category}) x ${item.quantity} unit`).join("; ")
  ]);
  const itemRows = report.itemDetails.map(item => [
    item.reportDate,
    item.orderId,
    item.customer,
    item.status,
    item.itemId,
    item.name,
    item.category,
    item.quantity,
    item.duration,
    item.unitPrice,
    item.subtotal,
    item.countedAsUsage ? "Ya" : "Tidak"
  ]);
  const rows = [
    ["Laporan Detail Order", report.label],
    ["Dari", report.startDate, "Sampai", report.endDate],
    [],
    ["Ringkasan Keuangan"],
    ["Jumlah Order", report.orderCount],
    ["Order Dibatalkan", report.cancelledCount],
    ["Omset Aktif / Selesai (Rp)", report.revenue],
    ["Pembayaran Diterima (Rp)", report.collected],
    ["Piutang (Rp)", report.receivable],
    [],
    ["Rincian Order", "ID Order", "Pelanggan", "Telepon", "Lokasi", "Kategori Event", "Mulai Sewa", "Kembali", "Durasi Hari", "Status", "Status Pembayaran", "Nilai Order (Rp)", "DP (Rp)", "Pelunasan (Rp)", "Dibayar (Rp)", "Piutang (Rp)", "Ringkasan Barang"],
    ...orderRows,
    [],
    ["Inventaris per Order", "ID Order", "Pelanggan", "Status", "ID Barang", "Nama Barang", "Kategori", "Jumlah", "Durasi Hari", "Harga per Hari (Rp)", "Subtotal (Rp)", "Dihitung sebagai Pemakaian"],
    ...itemRows,
    [],
    ["Ringkasan Inventaris", "Kategori", "Total Unit", "Jumlah Order", "Nilai Sewa Barang (Rp)"],
    ...report.inventory.map(item => [item.name, item.category, item.quantity, item.orders, item.subtotal])
  ];
  const csv = rows.map(row => row.map(csvEscape).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `laporan-detail-${period.startDate}-${period.endDate}.csv`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

async function exportDetailedReportPdf() {
  const period = getDetailedReportPeriod();
  if (!period) {
    showWarning("Pilih periode laporan yang valid terlebih dahulu.");
    return;
  }

  try {
    const report = buildDetailedReport(period);
    const pdf = createDetailedReportPdf(report);
    const result = await shareOrDownloadPdf(
      pdf,
      `laporan-detail-${period.startDate}-${period.endDate}.pdf`,
      `Laporan Detail Order ${period.label}`,
      `Rincian order, finansial, dan inventaris untuk periode ${period.label}.`
    );
    if (result === "shared") showSuccess("PDF detail berhasil dibagikan.");
    if (result === "downloaded") showSuccess("PDF detail berhasil diunduh.");
  } catch (error) {
    showError("Gagal membuat PDF detail: " + error.message);
  }
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

function renderPublicEventPackages() {
  const categories = [...new Set(EVENT_PACKAGES.map(pkg => pkg.kategori_event))];
  const packageViews = [
    { selector: document.getElementById("public-event-category"), grid: document.getElementById("public-event-package-grid") },
    { selector: document.getElementById("public-event-category-catalog"), grid: document.getElementById("public-event-package-grid-catalog") }
  ];

  packageViews.forEach(({ selector, grid }) => {
    if (!selector || !grid) return;
    const selectedCategory = selector.value;
    selector.innerHTML = '<option value="">Semua Kategori Event</option>';
    categories.forEach(category => {
      const option = document.createElement("option");
      option.value = category;
      option.textContent = category;
      selector.appendChild(option);
    });
    selector.value = categories.includes(selectedCategory) ? selectedCategory : "";

    const filtered = EVENT_PACKAGES.filter(pkg => !selector.value || pkg.kategori_event === selector.value);
    grid.innerHTML = filtered.length
      ? filtered.map(pkg => `
          <article class="event-package-card">
            <span class="event-package-category">${escapeHtml(pkg.kategori_event)}</span>
            <h3>${escapeHtml(pkg.nama_paket)}</h3>
            <p>${escapeHtml(pkg.deskripsi)}</p>
            <ul class="event-package-items">
              ${pkg.items.map(item => `
                <li>
                  <span>${escapeHtml(item.searchKeywords?.[0] || "Perlengkapan event")}</span>
                  <strong>${Number(item.defaultQty) || 0} unit</strong>
                </li>
              `).join("")}
            </ul>
          </article>
        `).join("")
      : '<p class="text-muted">Belum ada paket untuk kategori ini.</p>';
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
  let filtered = getFilteredInventaris();

  // Apply column filters
  Object.entries(columnFilters).forEach(([col, value]) => {
    if (!value) return;
    filtered = filtered.filter(item => {
      const itemVal = item[col];
      if (col === "nama_barang") {
        return itemVal.toLowerCase().includes(value.toLowerCase());
      } else if (col === "kategori") {
        return itemVal.toLowerCase().includes(value.toLowerCase());
      } else {
        const numVal = parseFloat(value);
        return !isNaN(numVal) && itemVal >= numVal;
      }
    });
  });

  // Apply sorting
  if (currentSortColumn) {
    filtered.sort((a, b) => {
      let valA = a[currentSortColumn];
      let valB = b[currentSortColumn];

      if (currentSortColumn === "nama_barang" || currentSortColumn === "kategori") {
        valA = valA.toLowerCase();
        valB = valB.toLowerCase();
      } else {
        valA = parseFloat(valA) || 0;
        valB = parseFloat(valB) || 0;
      }

      if (valA < valB) return currentSortDirection === "asc" ? -1 : 1;
      if (valA > valB) return currentSortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }

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
          ${checkPermission("delete") ? `<button class="btn-action delete" data-id="${item.id}" title="Hapus">🗑️ Hapus</button>` : ""}
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

  updateSortHeaders();
  updateCategoryFilterOptions();
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
            ${checkPermission("delete") ? `<button class="btn-action delete" data-id="${item.id}" style="flex: 1; text-align: center;">🗑️ Hapus</button>` : ""}
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
    elPenyewaanTable.innerHTML = `<tr><td colspan="10" class="text-center text-muted">Tidak ada transaksi penyewaan${selectedStatus ? ` dengan status '${selectedStatus}'` : ''}.</td></tr>`;
    return;
  }

  elPenyewaanTable.innerHTML = filtered.map((tx, index) => {
    let statusBadge = "badge-info";
    if (tx.status === "Selesai") statusBadge = "badge-success";
    if (tx.status === "Dibatalkan") statusBadge = "badge-danger";

    // Payment status
    const paymentStatus = tx.payment_status || "pending";
    const paymentBadgeClass = paymentStatus === "lunas" ? "badge-success" : (paymentStatus === "dp_paid" ? "badge-info" : "badge-warning");
    const paymentLabel = paymentStatus === "lunas" ? "✅ Lunas" : (paymentStatus === "dp_paid" ? "💵 DP Paid" : "⏳ Pending");
    
    // Calculate paid amount
    const paidAmount = (tx.dp_paid ? tx.dp_amount : 0) + (tx.lunas_paid ? tx.lunas_amount : 0);
    const remainingAmount = tx.total_biaya - paidAmount;

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
        <td data-label="Pembayaran">
          <span class="payment-status ${paymentBadgeClass}">${paymentLabel}</span><br>
          <small class="text-muted">Lunas: ${formatRupiah(paidAmount)}</small>
        </td>
        <td data-label="Status"><span class="badge ${statusBadge}">${tx.status}</span></td>
        <td data-label="Aksi">
          ${tx.status === "Berjalan" && paymentStatus !== "lunas" ? `
            <button class="btn-payment" data-id="${tx.id}">💰 Bayar</button>
          ` : ''}
          <button class="btn-invoice" data-id="${tx.id}">🧾 Invoice</button>
          ${tx.status === "Berjalan" ? `
            <button class="btn-action complete" data-id="${tx.id}">✅</button>
            <button class="btn-action cancel" data-id="${tx.id}">❌</button>
          ` : ''}
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

  elPenyewaanTable.querySelectorAll(".btn-payment").forEach(btn => {
    btn.addEventListener("click", () => {
      const tx = currentPenyewaan.find(t => t.id === btn.dataset.id);
      if (tx) openModalPembayaran(tx);
    });
  });

  elPenyewaanTable.querySelectorAll(".btn-invoice").forEach(btn => {
    btn.addEventListener("click", () => {
      const tx = currentPenyewaan.find(t => t.id === btn.dataset.id);
      if (tx) printInvoice(tx.id, tx);
    });
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
                  <div style="display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end;">
                    <button class="btn-invoice" data-id="${tx.id}">🧾 Invoice</button>
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

  penyewaanKanbanContainer.querySelectorAll(".btn-invoice").forEach(btn => {
    btn.addEventListener("click", () => {
      const tx = currentPenyewaan.find(t => t.id === btn.dataset.id);
      if (tx) printInvoice(tx.id, tx);
    });
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
  const stockLabel = document.getElementById("item-stok-label");
  const stockHelp = document.getElementById("item-stok-help");

  if (item) {
    modalItemTitle.textContent = "Edit Barang Inventaris";
    if (stockLabel) stockLabel.textContent = "Total Stok Unit";
    if (stockHelp) stockHelp.textContent = "Masukkan total stok baru. Stok tidak dapat dikurangi melewati jumlah yang sedang disewa.";
    inputItemId.value = item.id;
    inputNamaBarang.value = item.nama_barang;
    inputKategori.value = item.kategori;
    inputTotalStok.value = item.total_stok;
    inputHargaSewa.value = item.harga_sewa;
    inputDeskripsi.value = item.deskripsi || "";
  } else {
    modalItemTitle.textContent = "Tambah Barang Inventaris Baru";
    if (stockLabel) stockLabel.textContent = "Jumlah Stok";
    if (stockHelp) stockHelp.textContent = "Jika nama dan kategori sama, jumlah ini ditambahkan ke stok barang yang sudah ada.";
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
  if (!checkPermission("create")) {
    showError("Anda tidak memiliki izin untuk menambahkan data.");
    return;
  }
  if (confirm("Apakah Anda ingin memuat sample data inventaris alat pesta (Tenda, Kursi, Meja, AC, Panggung, Sound & Genset) ke Firestore?")) {
    try {
      btnSeedSample.disabled = true;
      btnSeedSample.textContent = "⏳ Memuat Sample Data...";
      await seedSampleInventaris();
      showSuccess("Berhasil memuat sample data inventaris alat pesta!");
    } catch (err) {
      showError("Gagal memuat sample data: " + err.message);
    } finally {
      btnSeedSample.disabled = false;
      btnSeedSample.textContent = "🌱 Seed Sample Data";
    }
  }
}

async function handleResetOrderDemo() {
  if (!checkPermission("delete")) {
    showError("Hanya admin yang dapat mereset order demo.");
    return;
  }

  const confirmed = confirm(
    "Hapus semua order (berjalan, selesai, dan dibatalkan) beserta seluruh SPK? Stok akan dikembalikan ke total. Data inventaris dan pekerja tetap disimpan."
  );
  if (!confirmed) return;

  try {
    btnResetOrderDemo.disabled = true;
    btnResetOrderDemo.textContent = "⏳ Mereset Order...";
    const result = await resetDemoOrders();
    showSuccess(
      `Reset selesai: ${result.orders} order dan ${result.spk} SPK dihapus; stok ${result.inventory} barang dipulihkan.`
    );
  } catch (err) {
    showError("Gagal mereset order demo: " + err.message);
  } finally {
    btnResetOrderDemo.disabled = false;
    btnResetOrderDemo.textContent = "🗑️ Reset Order Demo";
  }
}

function closeModalItem() {
  modalItem.classList.remove("active");
  formItem.reset();
}

async function handleSaveItem(e) {
  e.preventDefault();
  
  if (!checkPermission("create")) {
    showError("Anda tidak memiliki izin untuk menambah/mengedit barang.");
    return;
  }

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
      showSuccess("Barang berhasil diperbarui.");
    } else {
      const result = await tambahBarang(payload);
      showSuccess(result.merged
        ? `Stok ${payload.nama_barang.trim()} berhasil ditambah ${result.quantityAdded} unit ke barang yang sudah ada.`
        : `Barang baru ${payload.nama_barang.trim()} berhasil ditambahkan.`);
    }
    closeModalItem();
  } catch (err) {
    showError("Gagal menyimpan barang: " + err.message);
  }
}

async function handleDeleteItem(id) {
  const item = currentInventaris.find(i => i.id === id);
  if (!item) return;
  
  if (!checkPermission("delete")) {
    showError("Anda tidak memiliki izin untuk menghapus barang.");
    return;
  }

  if (confirm(`Apakah Anda yakin ingin menghapus barang '${item.nama_barang}'?`)) {
    try {
      await hapusBarang(id);
      showSuccess("Barang berhasil dihapus.");
    } catch (err) {
      showError("Gagal menghapus barang: " + err.message);
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
    if (sewaKategoriEvent) sewaKategoriEvent.value = "Lainnya";
    return;
  }

  const pkg = EVENT_PACKAGES[pkgIdx];
  if (!pkg) return;
  if (sewaKategoriEvent) sewaKategoriEvent.value = pkg.kategori_event || "Lainnya";

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
  
  if (!checkPermission("create")) {
    showError("Anda tidak memiliki izin untuk membuat transaksi.");
    return;
  }
  
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
      showWarning(`Stok '${namaBarang}' tidak cukup! Tersedia: ${available}, Diminta: ${qty}`);
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

  if (!isValid || items.length === 0) {
    showError("Mohon lengkapi data transaksi dengan benar.");
    return;
  }

  const payload = {
    nama_pelanggan: inputPelanggan.value,
    no_telepon: inputTelepon.value,
    alamat_lokasi: inputAlamat.value,
    tanggal_sewa: inputTglSewa.value,
    tanggal_kembali: inputTglKembali.value,
    kategori_event: sewaKategoriEvent?.value || "Lainnya",
    items
  };

  try {
    await buatTransaksiSewa(payload);
    showSuccess("Transaksi penyewaan berhasil dibuat & stok otomatis terpotong!");
    closeModalSewa();
  } catch (err) {
    showError("Gagal membuat penyewaan: " + err.message);
  }
}

async function handleCompleteRental(id) {
  if (!checkPermission("update")) {
    showError("Anda tidak memiliki izin untuk menyelesaikan transaksi.");
    return;
  }

  if (confirm("Tandai transaksi ini sebagai Selesai? Stok barang akan dikembalikan ke inventaris.")) {
    try {
      await selesaikanPenyewaan(id);
      showSuccess("Transaksi selesai. Stok telah dikembalikan.");
    } catch (err) {
      showError("Gagal menyelesaikan transaksi: " + err.message);
    }
  }
}

async function handleCancelRental(id) {
  if (!checkPermission("update")) {
    showError("Anda tidak memiliki izin untuk membatalkan transaksi.");
    return;
  }

  if (confirm("Apakah Anda yakin ingin membatalkan transaksi ini? Stok barang akan dikembalikan.")) {
    try {
      await batalkanPenyewaan(id);
      showSuccess("Transaksi dibatalkan. Stok telah dikembalikan.");
    } catch (err) {
      showError("Gagal membatalkan transaksi: " + err.message);
    }
  }
}

// ----------------------------------------------------
// PAYMENT FUNCTIONS
// ----------------------------------------------------

function openModalPembayaran(transaksi) {
  currentPaymentTransaction = transaksi;
  
  if (pembayaranTransaksiId) pembayaranTransaksiId.value = transaksi.id;
  if (paymentTotalBiaya) paymentTotalBiaya.textContent = formatRupiah(transaksi.total_biaya);
  
  // Calculate DP (30%) and remaining
  const dpAmount = Math.round(transaksi.total_biaya * 0.3);
  const remaining = transaksi.total_biaya - (transaksi.dp_paid ? transaksi.dp_amount : 0);
  
  if (paymentDpAmount) paymentDpAmount.textContent = formatRupiah(dpAmount);
  if (paymentSisa) paymentSisa.textContent = formatRupiah(remaining);
  
  // Reset form
  if (pembayaranType) pembayaranType.value = "dp";
  if (pembayaranJumlah) pembayaranJumlah.value = dpAmount;
  if (pembayaranMetode) pembayaranMetode.value = "";
  if (pembayaranCatatan) pembayaranCatatan.value = "";
  
  updatePaymentAmountSuggestions("dp");
  
  modalPembayaran.classList.add("active");
}

function closeModalPembayaran() {
  modalPembayaran.classList.remove("active");
  currentPaymentTransaction = null;
}

function updatePaymentAmountSuggestions(type) {
  if (!currentPaymentTransaction) return;
  
  const total = currentPaymentTransaction.total_biaya;
  const dpPaid = currentPaymentTransaction.dp_paid ? currentPaymentTransaction.dp_amount : 0;
  const lunasPaid = currentPaymentTransaction.lunas_paid ? currentPaymentTransaction.lunas_amount : 0;
  const paidAmount = dpPaid + lunasPaid;
  const remaining = total - paidAmount;
  
  if (pembayaranJumlah) {
    switch (type) {
      case "dp":
        // Default DP is 30% of total
        pembayaranJumlah.value = Math.round(total * 0.3);
        break;
      case "lunas":
        // Pay remaining balance
        pembayaranJumlah.value = remaining > 0 ? remaining : total;
        break;
      case "partial":
        // Default to remaining amount
        pembayaranJumlah.value = remaining > 0 ? remaining : 0;
        break;
    }
  }
}

async function handleSavePembayaran(e) {
  e.preventDefault();
  
  const id = pembayaranTransaksiId?.value;
  const type = pembayaranType?.value;
  const amount = parseFloat(pembayaranJumlah?.value || 0);
  const method = pembayaranMetode?.value;
  const notes = pembayaranCatatan?.value;
  
  if (!id || amount <= 0) {
    showError("Mohon isi jumlah pembayaran yang valid.");
    return;
  }
  
  try {
    await updatePembayaran(id, { type, amount, method, notes });
    showSuccess("Pembayaran berhasil dicatat!");
    closeModalPembayaran();
    // Refresh the views
    renderPenyewaanTable();
    renderOrderKanbanBoard();
  } catch (err) {
    showError("Gagal menyimpan pembayaran: " + err.message);
  }
}

// Helper function to close mobile menu
function closeMobileMenu() {
  if (navLinks) {
    navLinks.classList.remove("mobile-open");
  }
  mobileMenuToggle?.setAttribute("aria-expanded", "false");
  mobileMenuToggle?.setAttribute("aria-label", "Buka menu navigasi");
  if (mobileMenuToggle) mobileMenuToggle.textContent = "☰";
}

// Helper escape HTML
function escapeHtml(str) {
  return (str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function startApplication() {
  if (demoEnvironmentBanner) demoEnvironmentBanner.hidden = !isDemoMode;
  initEventListeners();
  initAuthState();
  setupWorkersEventListeners();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startApplication, { once: true });
} else {
  startApplication();
}
