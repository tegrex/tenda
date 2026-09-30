import { showSuccess, showError, showWarning, showInfo } from "./toast.js";
import { createSpkPdf, shareOrDownloadPdf } from "./pdfReports.js?v=role-admin-20260930";
import { 
  listenPekerja, 
  tambahPekerja, 
  updatePekerja, 
  hapusPekerja,
  listenSPK,
  buatSPK,
  updateSPKStatus,
  hapusSPK,
  seedSamplePekerja,
  clearSamplePekerja,
  SAMPLE_PEKERJA
} from "./stockService.js?v=role-admin-20260930";

const formatRupiah = (val) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val || 0);

let currentPekerja = [];
let currentSPK = [];
let currentUserRole = "staff";
let unsubscribePekerja = null;
let unsubscribeSPK = null;

// DOM Elements - Workers
const tabelPekerja = document.getElementById("tabel-pekerja-body");
const formPekerja = document.getElementById("form-pekerja");
const btnTambahPekerja = document.getElementById("btn-tambah-pekerja");
const btnClosePekerja = document.getElementById("btn-close-pekerja");
const btnPekerjaBatal = document.getElementById("btn-pekerja-batal");
const modalPekerja = document.getElementById("modal-pekerja");
const badgePekerjaCount = document.getElementById("badge-pekerja-count");
const statTotalPekerja = document.getElementById("stat-total-pekerja");
const statPekerjaAktif = document.getElementById("stat-pekerja-aktif");
const searchPekerja = document.getElementById("search-pekerja");
const filterPekerjaPosisi = document.getElementById("filter-pekerja-posisi");
const btnSeedSamplePekerja = document.getElementById("btn-seed-sample-pekerja");
const btnClearSamplePekerja = document.getElementById("btn-clear-sample-pekerja");

// DOM Elements - SPK
const tabelSPK = document.getElementById("tabel-spk-body");
const btnBuatSPK = document.getElementById("btn-buat-spk");
const badgeSPKCount = document.getElementById("badge-spk-count");
const statSpkAktif = document.getElementById("stat-spk-aktif");
const filterSpkStatus = document.getElementById("filter-spk-status");
const modalSpk = document.getElementById("modal-spk");
const formSpk = document.getElementById("form-spk");
const btnCloseSpk = document.getElementById("btn-close-spk");
const btnBatalSpk = document.getElementById("btn-spk-batal");
const transaksiSpkSelect = document.getElementById("spk-transaksi");
const spkOrderPreview = document.getElementById("spk-order-preview");

export function initWorkersAndSPK(role = "staff", workerId = null) {
  unsubscribePekerja?.();
  unsubscribeSPK?.();
  currentUserRole = role;
  currentSPK = [];
  window.currentSPK = [];

  if (role !== "pekerja") {
    unsubscribePekerja = listenPekerja((items) => {
      currentPekerja = items;
      window.currentPekerja = items;
      window.dispatchEvent(new Event("workers-updated"));
      if (badgePekerjaCount) badgePekerjaCount.textContent = items.length;
      renderTabelPekerja();
    }, (error) => {
      console.error("Error listening to pekerja:", error);
      showError("Gagal memuat data pekerja. Periksa login dan izin Firestore untuk koleksi pekerja.");
    });
  } else {
    currentPekerja = [];
    window.currentPekerja = [];
  }

  // Listen to SPK data
  if (role === "pekerja" && !workerId) {
    showError("Akun pekerja belum tertaut ke profil pekerja. Hubungi Admin.");
    return;
  }
  unsubscribeSPK = listenSPK((items) => {
    currentSPK = items;
    window.currentSPK = items;
    if (badgeSPKCount) badgeSPKCount.textContent = items.length;
    renderTabelSPK();
  }, (error) => {
    console.error("Error listening to SPK:", error);
    showError("Gagal memuat data SPK. Periksa login dan izin Firestore untuk koleksi spk.");
  }, role === "pekerja" ? workerId : null);
}

export function stopWorkersAndSPK() {
  unsubscribePekerja?.();
  unsubscribeSPK?.();
  unsubscribePekerja = null;
  unsubscribeSPK = null;
}

export function setupWorkersEventListeners() {
  btnTambahPekerja?.addEventListener("click", openModalPekerja);
  btnClosePekerja?.addEventListener("click", closeModalPekerja);
  btnPekerjaBatal?.addEventListener("click", closeModalPekerja);
  formPekerja?.addEventListener("submit", handleSavePekerja);
  btnBuatSPK?.addEventListener("click", openModalSPK);
  btnCloseSpk?.addEventListener("click", closeModalSPK);
  btnBatalSpk?.addEventListener("click", closeModalSPK);
  formSpk?.addEventListener("submit", handleSaveSPK);
  transaksiSpkSelect?.addEventListener("change", updateSPKOrderPreview);
  btnSeedSamplePekerja?.addEventListener("click", handleSeedSamplePekerja);
  btnClearSamplePekerja?.addEventListener("click", handleClearSamplePekerja);
  searchPekerja?.addEventListener("input", renderTabelPekerja);
  filterPekerjaPosisi?.addEventListener("change", renderTabelPekerja);
  filterSpkStatus?.addEventListener("change", renderTabelSPK);

  modalPekerja?.addEventListener("click", (e) => {
    if (e.target === modalPekerja) closeModalPekerja();
  });

  modalSpk?.addEventListener("click", (e) => {
    if (e.target === modalSpk) closeModalSPK();
  });
}

function openModalPekerja(pekerja = null) {
  const title = pekerja ? "Edit Pekerja" : "Tambah Pekerja Baru";
  const modalTitle = modalPekerja?.querySelector(".modal-title");
  if (modalTitle) modalTitle.textContent = title;
  
  if (pekerja) {
    document.getElementById("pekerja-id").value = pekerja.id;
    document.getElementById("pekerja-nama").value = pekerja.nama;
    document.getElementById("pekerja-telepon").value = pekerja.telepon;
    document.getElementById("pekerja-posisi").value = pekerja.posisi;
    document.getElementById("pekerja-alamat").value = pekerja.alamat;
    document.getElementById("pekerja-status").value = pekerja.status;
  } else {
    formPekerja?.reset();
    document.getElementById("pekerja-id").value = "";
    document.getElementById("pekerja-status").value = "aktif";
  }
  
  modalPekerja?.classList.add("active");
}

function closeModalPekerja() {
  modalPekerja?.classList.remove("active");
  formPekerja?.reset();
}

function closeModalSPK() {
  modalSpk?.classList.remove("active");
  formSpk?.reset();
}

async function handleSeedSamplePekerja() {
  try {
    if (btnSeedSamplePekerja) {
      btnSeedSamplePekerja.disabled = true;
      btnSeedSamplePekerja.textContent = "⏳ Memuat sample...";
    }
    await seedSamplePekerja();
    showSuccess("Sample pekerja berhasil ditambahkan.");
  } catch (err) {
    showError("Gagal membuat sample pekerja: " + err.message);
  } finally {
    if (btnSeedSamplePekerja) {
      btnSeedSamplePekerja.disabled = false;
      btnSeedSamplePekerja.textContent = "🌱 Seed Sample Pekerja";
    }
  }
}

async function handleClearSamplePekerja() {
  try {
    if (!confirm("Hapus semua pekerja sample?")) return;
    await clearSamplePekerja();
    showSuccess("Sample pekerja berhasil dihapus.");
  } catch (err) {
    showError("Gagal menghapus sample pekerja: " + err.message);
  }
}

async function handleSavePekerja(e) {
  e.preventDefault();
  
  const id = document.getElementById("pekerja-id").value;
  const nama = document.getElementById("pekerja-nama").value;
  const telepon = document.getElementById("pekerja-telepon").value;
  const posisi = document.getElementById("pekerja-posisi").value;
  const alamat = document.getElementById("pekerja-alamat").value;
  const status = document.getElementById("pekerja-status").value;
  
  const data = { nama, telepon, posisi, alamat, status };
  
  try {
    if (id) {
      await updatePekerja(id, data);
      showSuccess("Pekerja berhasil diperbarui");
    } else {
      await tambahPekerja(data);
      showSuccess("Pekerja berhasil ditambahkan");
    }
    closeModalPekerja();
  } catch (err) {
    showError("Gagal menyimpan pekerja: " + err.message);
  }
}

function renderTabelPekerja() {
  if (!tabelPekerja) return;

  const search = (searchPekerja?.value || "").toLowerCase();
  const posisiFilter = filterPekerjaPosisi?.value || "";
  const filtered = currentPekerja.filter((p) => {
    const nameMatch = !search || p.nama?.toLowerCase().includes(search) || p.posisi?.toLowerCase().includes(search);
    const posisiMatch = !posisiFilter || p.posisi === posisiFilter;
    return nameMatch && posisiMatch;
  });

  if (filtered.length === 0) {
    tabelPekerja.innerHTML = '<tr><td colspan="7" class="text-center text-muted">Belum ada data pekerja yang cocok.</td></tr>';
    return;
  }

  tabelPekerja.innerHTML = filtered.map((p, idx) => `
    <tr>
      <td>${idx + 1}</td>
      <td><strong>${p.nama}</strong></td>
      <td>${p.posisi}</td>
      <td>${p.telepon}</td>
      <td>${p.alamat || '-'}</td>
      <td><span class="badge ${p.status === 'aktif' ? 'badge-success' : p.status === 'cuti' ? 'badge-warning' : 'badge-danger'}">${p.status || 'aktif'}</span></td>
      <td>
        <button class="btn-action edit" data-id="${p.id}">✏️</button>
          ${currentUserRole === "admin" ? `<button class="btn-action delete" data-id="${p.id}">🗑️</button>` : ""}
      </td>
    </tr>
  `).join("");

  tabelPekerja.querySelectorAll(".btn-action.edit").forEach(btn => {
    btn.addEventListener("click", () => {
      const p = currentPekerja.find(x => x.id === btn.dataset.id);
      if (p) openModalPekerja(p);
    });
  });

  tabelPekerja.querySelectorAll(".btn-action.delete").forEach(btn => {
    btn.addEventListener("click", async () => {
      if (confirm("Hapus pekerja ini?")) {
        try {
          await hapusPekerja(btn.dataset.id);
          showSuccess("Pekerja dihapus");
        } catch (err) {
          showError("Gagal menghapus: " + err.message);
        }
      }
    });
  });

  if (statTotalPekerja) statTotalPekerja.textContent = currentPekerja.length;
  if (statPekerjaAktif) statPekerjaAktif.textContent = currentPekerja.filter(p => p.status === 'aktif').length;
}

function renderTabelSPK() {
  if (!tabelSPK) return;

  const statusFilter = filterSpkStatus?.value || "";
  const filtered = currentSPK.filter(s => !statusFilter || s.status === statusFilter);

  if (filtered.length === 0) {
    tabelSPK.innerHTML = '<tr><td colspan="8" class="text-center text-muted">Belum ada SPK yang cocok.</td></tr>';
    return;
  }

  tabelSPK.innerHTML = filtered.map((s, idx) => {
    const workerCount = s.workerIds?.length || 0;
    const orderDetails = s.detailOrder || {};
    const itemCount = orderDetails.items?.length || s.itemIds?.length || 0;
    const statusClass = s.status === 'completed' ? 'badge-success' : s.status === 'ongoing' ? 'badge-info' : s.status === 'draft' ? 'badge-warning' : 'badge-danger';
    return `
      <tr>
        <td>${idx + 1}</td>
        <td>${escapeHtml(s.namaPelanggan || '-')}</td>
        <td>${escapeHtml(s.alamatEvent || '-')}</td>
        <td>${escapeHtml(s.tanggalEvent || '-')}</td>
        <td>${escapeHtml(orderDetails.kategoriEvent || '-')}<br><small>${itemCount} barang</small></td>
        <td><span class="badge badge-info">${workerCount} pekerja</span></td>
        <td><span class="badge ${statusClass}">${escapeHtml(s.status || 'draft')}</span></td>
        <td>
          <button class="btn-action print-spk" data-id="${s.id}" title="Bagikan atau unduh PDF SPK" aria-label="Bagikan atau unduh PDF SPK">PDF ↗</button>
          ${currentUserRole === "admin" ? `<button class="btn-action delete" data-id="${s.id}">🗑️</button>` : ""}
        </td>
      </tr>
    `;
  }).join("");

  tabelSPK.querySelectorAll(".print-spk").forEach(btn => {
    btn.addEventListener("click", () => printSPK(btn.dataset.id));
  });

  tabelSPK.querySelectorAll(".btn-action.delete").forEach(btn => {
    btn.addEventListener("click", async () => {
      if (confirm("Hapus SPK ini?")) {
        try {
          await hapusSPK(btn.dataset.id);
          showSuccess("SPK dihapus");
        } catch (err) {
          showError("Gagal menghapus: " + err.message);
        }
      }
    });
  });

  if (statSpkAktif) statSpkAktif.textContent = currentSPK.filter(s => s.status && s.status !== 'completed').length;
}

export function openModalSPK() {
  if (!modalSpk) return;

  formSpk?.reset();
  const transaksiSelect = document.getElementById("spk-transaksi");
  const workerSelect = document.getElementById("spk-worker-select");

  if (transaksiSelect) {
    transaksiSelect.innerHTML = '<option value="">-- Pilih transaksi --</option>';
    const txList = window.currentPenyewaan || [];
    txList.forEach((tx) => {
      const opt = document.createElement("option");
      opt.value = tx.id;
      opt.textContent = `${tx.nama_pelanggan} • ${tx.tanggal_sewa}`;
      transaksiSelect.appendChild(opt);
    });
  }

  if (workerSelect) {
    workerSelect.innerHTML = "";
    currentPekerja.forEach((worker) => {
      const opt = document.createElement("option");
      opt.value = worker.id;
      opt.textContent = `${worker.nama} (${worker.posisi})`;
      workerSelect.appendChild(opt);
    });
  }

  updateSPKOrderPreview();
  modalSpk.classList.add("active");
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

function updateSPKOrderPreview() {
  const selectedId = transaksiSpkSelect?.value;
  const tx = (window.currentPenyewaan || []).find(item => item.id === selectedId);
  if (!tx) {
    const customerInput = document.getElementById("spk-pelanggan");
    const addressInput = document.getElementById("spk-alamat");
    const dateInput = document.getElementById("spk-tanggal");
    if (customerInput) customerInput.value = "";
    if (addressInput) addressInput.value = "";
    if (dateInput) dateInput.value = "";
    if (spkOrderPreview) spkOrderPreview.textContent = "Pilih transaksi untuk melihat periode sewa dan inventaris yang digunakan.";
    return;
  }

  const customerInput = document.getElementById("spk-pelanggan");
  const addressInput = document.getElementById("spk-alamat");
  const dateInput = document.getElementById("spk-tanggal");
  if (customerInput) customerInput.value = tx.nama_pelanggan || "";
  if (addressInput) addressInput.value = tx.alamat_lokasi || "";
  if (dateInput) dateInput.value = tx.tanggal_sewa || "";

  const items = tx.items || [];
  if (spkOrderPreview) {
    const inventoryList = items.length
      ? `<ul style="margin:6px 0 0;padding-left:20px;">${items.map(item => `<li>${escapeHtml(item.nama_barang)} (${escapeHtml(item.kategori || "Umum")}) - ${Number(item.jumlah) || 0} unit</li>`).join("")}</ul>`
      : "<div>Order ini tidak memiliki rincian barang.</div>";
    spkOrderPreview.innerHTML = `
      <strong>${escapeHtml(tx.kategori_event || "Lainnya")} | Status: ${escapeHtml(tx.status || "-")}</strong>
      <div>Periode sewa: ${escapeHtml(tx.tanggal_sewa || "-")} sampai ${escapeHtml(tx.tanggal_kembali || "-")}</div>
      ${inventoryList}
    `;
  }
}

async function printSPK(spkId) {
  const spk = currentSPK.find(s => s.id === spkId);
  if (!spk) return;
  try {
    const linkedOrder = (window.currentPenyewaan || []).find(order => order.id === spk.transaksiId);
    const spkForPdf = {
      ...spk,
      detailOrder: spk.detailOrder || (linkedOrder ? {
        kategoriEvent: linkedOrder.kategori_event || "Lainnya",
        tanggalSewa: linkedOrder.tanggal_sewa || "",
        tanggalKembali: linkedOrder.tanggal_kembali || "",
        statusOrder: linkedOrder.status || "",
        telepon: linkedOrder.no_telepon || "",
        items: linkedOrder.items || []
      } : null)
    };
    const pdf = createSpkPdf(spkForPdf, currentPekerja);
    const result = await shareOrDownloadPdf(
      pdf,
      `SPK-${spk.id}.pdf`,
      `Surat Perintah Kerja - ${spk.namaPelanggan || "TendaRental"}`,
      `SPK untuk ${spk.namaPelanggan || "pelanggan"} pada ${spk.tanggalEvent || "tanggal acara"}.`
    );
    if (result === "shared") showSuccess("PDF SPK siap dibagikan.");
    if (result === "downloaded") showSuccess("PDF SPK berhasil diunduh.");
  } catch (error) {
    showError("Gagal membuat PDF SPK: " + error.message);
  }
}

async function handleSaveSPK(e) {
  e.preventDefault();
  const selectedTxId = document.getElementById("spk-transaksi")?.value || "";
  const selectedWorkerEls = document.getElementById("spk-worker-select")?.selectedOptions || [];
  const workerIds = Array.from(selectedWorkerEls).map(opt => opt.value);
  const namaPelanggan = document.getElementById("spk-pelanggan")?.value?.trim();
  const alamatEvent = document.getElementById("spk-alamat")?.value?.trim();
  const tanggalEvent = document.getElementById("spk-tanggal")?.value;
  const catatan = document.getElementById("spk-catatan")?.value?.trim() || "";

  if (!namaPelanggan || !alamatEvent || !tanggalEvent || workerIds.length === 0) {
    showWarning("Lengkapi semua field SPK dan pilih minimal satu pekerja.");
    return;
  }

  try {
    const tx = selectedTxId ? (window.currentPenyewaan || []).find(item => item.id === selectedTxId) : null;
    const itemIds = tx ? (tx.items || []).map(item => item.itemId).filter(Boolean) : [];
    const detailOrder = tx ? {
      kategoriEvent: tx.kategori_event || "Lainnya",
      tanggalSewa: tx.tanggal_sewa || "",
      tanggalKembali: tx.tanggal_kembali || "",
      statusOrder: tx.status || "",
      telepon: tx.no_telepon || "",
      items: (tx.items || []).map(item => ({
        itemId: item.itemId || "",
        nama_barang: item.nama_barang || "Barang",
        kategori: item.kategori || "Umum",
        jumlah: Number(item.jumlah) || 0
      }))
    } : null;
    const assignedWorkers = workerIds
      .map(id => currentPekerja.find(worker => worker.id === id))
      .filter(Boolean)
      .map(({ id, nama, posisi, telepon }) => ({ id, nama, posisi, telepon }));

    await buatSPK({
      transaksiId: selectedTxId,
      namaPelanggan,
      alamatEvent,
      tanggalEvent,
      itemIds,
      workerIds,
      detailOrder,
      assignedWorkers,
      catatan
    });

    showSuccess("SPK berhasil dibuat.");
    closeModalSPK();
  } catch (err) {
    showError("Gagal membuat SPK: " + err.message);
  }
}

export function printInvoice(transaksiId, transaksi) {
  if (!transaksi) {
    showError("Data transaksi tidak ditemukan.");
    return;
  }

  const html = `
    <html>
      <head>
        <title>Invoice - ${transaksi.nama_pelanggan}</title>
        <style>
          body { font-family: Arial; margin: 20px; }
          .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
          .company-name { font-size: 24px; font-weight: bold; }
          .invoice-details { display: flex; justify-content: space-between; margin: 20px 0; }
          .details-box { width: 45%; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
          th { background: #f0f0f0; font-weight: bold; }
          .total-row { background: #f9f9f9; font-weight: bold; }
          .footer { margin-top: 30px; border-top: 1px solid #ddd; padding-top: 20px; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-name">🎪 TendaRental</div>
          <p>Persewaan Alat Pesta Profesional</p>
        </div>
        
        <div class="invoice-details">
          <div class="details-box">
            <h4>INVOICE DETAIL:</h4>
            <p><strong>Invoice ID:</strong> ${transaksi.id}</p>
            <p><strong>Tanggal:</strong> ${new Date().toLocaleDateString('id-ID')}</p>
          </div>
          <div class="details-box">
            <h4>PELANGGAN:</h4>
            <p><strong>Nama:</strong> ${transaksi.nama_pelanggan}</p>
            <p><strong>Telepon:</strong> ${transaksi.no_telepon}</p>
            <p><strong>Alamat:</strong> ${transaksi.alamat_lokasi}</p>
          </div>
        </div>
        
        <table>
          <tr>
            <th>No</th>
            <th>Barang</th>
            <th>Qty</th>
            <th>Harga/Hari</th>
            <th>Hari</th>
            <th>Total</th>
          </tr>
          ${(transaksi.items || []).map((item, i) => `
            <tr>
              <td>${i + 1}</td>
              <td>${item.nama_barang}</td>
              <td>${item.jumlah}</td>
              <td>Rp ${item.harga_sewa_per_hari?.toLocaleString('id-ID')}</td>
              <td>${transaksi.durasi_hari}</td>
              <td>Rp ${(item.jumlah * item.harga_sewa_per_hari * transaksi.durasi_hari).toLocaleString('id-ID')}</td>
            </tr>
          `).join('')}
          <tr class="total-row">
            <td colspan="5">TOTAL:</td>
            <td>Rp ${transaksi.total_biaya?.toLocaleString('id-ID')}</td>
          </tr>
        </table>
        
        <div class="footer">
          <p><strong>Payment Status:</strong> ${transaksi.payment_status === 'lunas' ? '✅ Lunas' : '⏳ Pending'}</p>
          <p style="margin-top: 30px; text-align: right;">
            ___________________<br>
            Tanda Tangan Penerima
          </p>
        </div>
      </body>
    </html>
  `;
  
  const win = window.open('', '', 'width=900,height=600');
  if (!win) {
    showError("Browser memblokir popup invoice.");
    return;
  }
  win.document.write(html);
  win.document.close();
  win.print();
}
