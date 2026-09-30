import { db } from "./firebase.js";
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  runTransaction, 
  serverTimestamp,
  query,
  orderBy,
  getDocs,
  where,
  writeBatch
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const INVENTARIS_COL = "inventaris";
const PENYEWAAN_COL = "penyewaan";
const PEKERJA_COL = "pekerja";
const SPK_COL = "spk";

/**
 * Mendengarkan data inventaris secara real-time
 */
export function listenInventaris(callback, onError) {
  const q = query(collection(db, INVENTARIS_COL), orderBy("nama_barang", "asc"));
  return onSnapshot(q, (snapshot) => {
    const items = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(items);
  }, onError);
}

/**
 * Mendengarkan data penyewaan secara real-time
 */
export function listenPenyewaan(callback, onError) {
  const q = query(collection(db, PENYEWAAN_COL), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snapshot) => {
    const transaksi = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(transaksi);
  }, onError);
}

/**
 * Menambah barang inventaris baru
 */
export async function tambahBarang({ nama_barang, kategori, total_stok, harga_sewa, deskripsi = "" }) {
  const total = parseInt(total_stok, 10);
  const harga = parseFloat(harga_sewa);
  const nama = String(nama_barang || "").trim();
  const kategoriBarang = String(kategori || "Umum").trim() || "Umum";
  
  if (!nama || !Number.isInteger(total) || total <= 0 || !Number.isFinite(harga) || harga < 0) {
    throw new Error("Data barang tidak valid.");
  }

  const normalizedName = nama.toLocaleLowerCase("id-ID");
  const normalizedCategory = kategoriBarang.toLocaleLowerCase("id-ID");
  const inventorySnapshot = await getDocs(collection(db, INVENTARIS_COL));
  const matchingItem = inventorySnapshot.docs.find((snapshot) => {
    const data = snapshot.data();
    return String(data.nama_barang || "").trim().toLocaleLowerCase("id-ID") === normalizedName &&
      String(data.kategori || "Umum").trim().toLocaleLowerCase("id-ID") === normalizedCategory;
  });

  if (matchingItem) {
    await runTransaction(db, async (transaction) => {
      const itemSnapshot = await transaction.get(matchingItem.ref);
      if (!itemSnapshot.exists()) {
        throw new Error("Barang yang akan ditambahkan stoknya tidak lagi tersedia.");
      }

      const data = itemSnapshot.data();
      const existingTotal = Number(data.total_stok) || 0;
      const rented = Number(data.stok_tersewa) || 0;
      const available = Number.isFinite(Number(data.stok_tersedia))
        ? Number(data.stok_tersedia)
        : Math.max(0, existingTotal - rented);

      transaction.update(matchingItem.ref, {
        total_stok: existingTotal + total,
        stok_tersedia: available + total,
        updatedAt: serverTimestamp()
      });
    });

    return { id: matchingItem.id, merged: true, quantityAdded: total };
  }

  const itemRef = await addDoc(collection(db, INVENTARIS_COL), {
    nama_barang: nama,
    kategori: kategoriBarang,
    total_stok: total,
    stok_tersedia: total,
    stok_tersewa: 0,
    harga_sewa: harga,
    deskripsi: deskripsi.trim(),
    updatedAt: serverTimestamp()
  });
  return { id: itemRef.id, merged: false, quantityAdded: total };
}

/**
 * Memperbarui data barang inventaris
 */
export async function updateBarang(id, { nama_barang, kategori, total_stok, harga_sewa, deskripsi = "" }) {
  const itemRef = doc(db, INVENTARIS_COL, id);
  const newTotal = parseInt(total_stok, 10);
  const harga = parseFloat(harga_sewa);

  return await runTransaction(db, async (transaction) => {
    const itemDoc = await transaction.get(itemRef);
    if (!itemDoc.exists()) {
      throw new Error("Barang tidak ditemukan.");
    }
    const data = itemDoc.data();
    const currentRented = data.stok_tersewa || 0;
    
    if (newTotal < currentRented) {
      throw new Error(`Total stok tidak boleh kurang dari jumlah yang sedang disewa (${currentRented} unit).`);
    }

    const newAvailable = newTotal - currentRented;

    transaction.update(itemRef, {
      nama_barang: nama_barang.trim(),
      kategori: kategori || "Umum",
      total_stok: newTotal,
      stok_tersedia: newAvailable,
      harga_sewa: harga,
      deskripsi: deskripsi.trim(),
      updatedAt: serverTimestamp()
    });
  });
}

/**
 * Menghapus barang dari inventaris (hanya jika tidak sedang disewa)
 */
export async function hapusBarang(id) {
  const itemRef = doc(db, INVENTARIS_COL, id);
  return await runTransaction(db, async (transaction) => {
    const itemDoc = await transaction.get(itemRef);
    if (!itemDoc.exists()) {
      throw new Error("Barang tidak ditemukan.");
    }
    const data = itemDoc.data();
    if (data.stok_tersewa > 0) {
      throw new Error(`Barang '${data.nama_barang}' tidak dapat dihapus karena masih disewa (${data.stok_tersewa} unit).`);
    }
    transaction.delete(itemRef);
  });
}

/**
 * Listen to workers data
 */
export function listenPekerja(callback, onError) {
  const q = query(collection(db, PEKERJA_COL), orderBy("nama", "asc"));
  return onSnapshot(q, (snapshot) => {
    const items = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(items);
  }, onError);
}

/**
 * Add new worker
 */
export async function tambahPekerja({ nama, telepon, posisi, alamat, status = "aktif" }) {
  return await addDoc(collection(db, PEKERJA_COL), {
    nama: nama.trim(),
    telepon: telepon.trim(),
    posisi: posisi.trim(),
    alamat: alamat.trim(),
    status: status,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

/**
 * Update worker
 */
export async function updatePekerja(id, { nama, telepon, posisi, alamat, status }) {
  const ref = doc(db, PEKERJA_COL, id);
  return await updateDoc(ref, {
    nama: nama.trim(),
    telepon: telepon.trim(),
    posisi: posisi.trim(),
    alamat: alamat.trim(),
    status: status,
    updatedAt: serverTimestamp()
  });
}

/**
 * Delete worker
 */
export async function hapusPekerja(id) {
  return await deleteDoc(doc(db, PEKERJA_COL, id));
}

/**
 * Listen to SPK data
 */
export function listenSPK(callback, onError, workerId = null) {
  const spkCollection = collection(db, SPK_COL);
  const q = workerId
    ? query(spkCollection, where("workerIds", "array-contains", workerId))
    : query(spkCollection, orderBy("createdAt", "desc"));
  return onSnapshot(q, (snapshot) => {
    const items = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    if (workerId) {
      items.sort((first, second) => {
        const firstCreated = first.createdAt?.toDate?.()?.getTime() || 0;
        const secondCreated = second.createdAt?.toDate?.()?.getTime() || 0;
        return secondCreated - firstCreated;
      });
    }
    callback(items);
  }, onError);
}

/**
 * Create SPK (Surat Perintah Kerja)
 */
export async function buatSPK({ 
  transaksiId, 
  namaPelanggan, 
  alamatEvent, 
  tanggalEvent, 
  itemIds = [], 
  workerIds = [],
  detailOrder = null,
  assignedWorkers = [],
  catatan = ""
}) {
  const spkRef = await addDoc(collection(db, SPK_COL), {
    transaksiId,
    namaPelanggan: namaPelanggan.trim(),
    alamatEvent: alamatEvent.trim(),
    tanggalEvent,
    itemIds,
    workerIds,
    detailOrder,
    assignedWorkers,
    status: "draft", // draft, assigned, ongoing, completed
    catatan: catatan.trim(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  
  // Update transaction with SPK reference
  if (transaksiId) {
    const txRef = doc(db, PENYEWAAN_COL, transaksiId);
    await updateDoc(txRef, {
      spk_id: spkRef.id,
      updatedAt: serverTimestamp()
    });
  }
  
  return spkRef.id;
}

/**
 * Update SPK status
 */
export async function updateSPKStatus(spkId, status) {
  const ref = doc(db, SPK_COL, spkId);
  return await updateDoc(ref, {
    status: status,
    updatedAt: serverTimestamp()
  });
}

/**
 * Delete SPK
 */
export async function hapusSPK(id) {
  return await deleteDoc(doc(db, SPK_COL, id));
}

/**
 * Membuat transaksi penyewaan baru dengan validasi atomic stok
 */
export async function buatTransaksiSewa({ nama_pelanggan, no_telepon, alamat_lokasi, tanggal_sewa, tanggal_kembali, kategori_event = "Lainnya", items }) {
  if (!nama_pelanggan || !tanggal_sewa || !tanggal_kembali || !items || items.length === 0) {
    throw new Error("Data transaksi tidak lengkap.");
  }

  // Hitung durasi sewa dalam hari
  const start = new Date(tanggal_sewa);
  const end = new Date(tanggal_kembali);
  const diffTime = Math.abs(end - start);
  const durasiHari = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

  return await runTransaction(db, async (transaction) => {
    // 1. Validasi stok semua item terlebih dahulu
    const itemDocs = [];
    let totalBiaya = 0;

    for (const item of items) {
      const itemRef = doc(db, INVENTARIS_COL, item.itemId);
      const itemSnapshot = await transaction.get(itemRef);

      if (!itemSnapshot.exists()) {
        throw new Error(`Barang dengan ID ${item.itemId} tidak ditemukan.`);
      }

      const itemData = itemSnapshot.data();
      const qty = parseInt(item.jumlah, 10);

      if (itemData.stok_tersedia < qty) {
        throw new Error(`Stok '${itemData.nama_barang}' tidak mencukupi. Tersedia: ${itemData.stok_tersedia}, Diminta: ${qty}`);
      }

      itemDocs.push({
        ref: itemRef,
        data: itemData,
        qty: qty
      });

      totalBiaya += qty * itemData.harga_sewa * durasiHari;
    }

    // 2. Potong stok_tersedia & tambah stok_tersewa secara atomic
    for (const { ref, data, qty } of itemDocs) {
      transaction.update(ref, {
        stok_tersedia: data.stok_tersedia - qty,
        stok_tersewa: (data.stok_tersewa || 0) + qty,
        updatedAt: serverTimestamp()
      });
    }

    // 3. Catat dokumen transaksi penyewaan baru
    const newRentalRef = doc(collection(db, PENYEWAAN_COL));
    transaction.set(newRentalRef, {
      nama_pelanggan: nama_pelanggan.trim(),
      no_telepon: no_telepon.trim(),
      alamat_lokasi: alamat_lokasi.trim(),
      tanggal_sewa,
      tanggal_kembali,
      kategori_event,
      durasi_hari: durasiHari,
      status: "Berjalan",
      items: itemDocs.map(({ ref, data, qty }) => ({
        itemId: ref.id,
        nama_barang: data.nama_barang,
        kategori: data.kategori || "Umum",
        jumlah: qty,
        harga_sewa_per_hari: Number(data.harga_sewa) || 0
      })),
      total_biaya: totalBiaya,
      // Payment tracking fields
      payment_status: "pending", // pending, dp_paid, partial, lunas
      dp_amount: 0,
      dp_paid: false,
      dp_date: null,
      lunas_amount: 0,
      lunas_paid: false,
      lunas_date: null,
      payment_method: "",
      payment_notes: "",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    return newRentalRef.id;
  });
}

/**
 * Mengubah status penyewaan menjadi "Selesai" (mengembalikan stok)
 */
export async function selesaikanPenyewaan(transaksiId) {
  const rentalRef = doc(db, PENYEWAAN_COL, transaksiId);

  return await runTransaction(db, async (transaction) => {
    // 1. Baca dokumen transaksi penyewaan terlebih dahulu
    const rentalSnapshot = await transaction.get(rentalRef);
    if (!rentalSnapshot.exists()) {
      throw new Error("Transaksi tidak ditemukan.");
    }

    const rentalData = rentalSnapshot.data();
    if (rentalData.status !== "Berjalan") {
      throw new Error(`Transaksi tidak dalam status 'Berjalan' (Status saat ini: ${rentalData.status}).`);
    }

    // 2. Lakukan SEMUA pembacaan (transaction.get) seluruh item terlebih dahulu sebelum penulisan
    const itemUpdates = [];
    for (const item of rentalData.items) {
      const itemRef = doc(db, INVENTARIS_COL, item.itemId);
      const itemSnapshot = await transaction.get(itemRef);

      if (itemSnapshot.exists()) {
        const itemData = itemSnapshot.data();
        const currentRented = itemData.stok_tersewa || 0;
        const currentAvail = itemData.stok_tersedia || 0;

        itemUpdates.push({
          ref: itemRef,
          newRented: Math.max(0, currentRented - item.jumlah),
          newAvail: Math.min(itemData.total_stok, currentAvail + item.jumlah)
        });
      }
    }

    // 3. Eksekusi SEMUA penulisan (transaction.update) setelah seluruh pembacaan selesai
    for (const update of itemUpdates) {
      transaction.update(update.ref, {
        stok_tersewa: update.newRented,
        stok_tersedia: update.newAvail,
        updatedAt: serverTimestamp()
      });
    }

    transaction.update(rentalRef, {
      status: "Selesai",
      updatedAt: serverTimestamp()
    });
  });
}

/**
 * Mengubah status penyewaan menjadi "Dibatalkan" (mengembalikan stok jika sebelumnya berjalan)
 */
export async function batalkanPenyewaan(transaksiId) {
  const rentalRef = doc(db, PENYEWAAN_COL, transaksiId);

  return await runTransaction(db, async (transaction) => {
    // 1. Baca dokumen transaksi penyewaan terlebih dahulu
    const rentalSnapshot = await transaction.get(rentalRef);
    if (!rentalSnapshot.exists()) {
      throw new Error("Transaksi tidak ditemukan.");
    }

    const rentalData = rentalSnapshot.data();
    if (rentalData.status === "Selesai" || rentalData.status === "Dibatalkan") {
      throw new Error(`Transaksi sudah berstatus ${rentalData.status}.`);
    }

    // 2. Lakukan SEMUA pembacaan (transaction.get) seluruh item terlebih dahulu sebelum penulisan
    const itemUpdates = [];
    if (rentalData.status === "Berjalan") {
      for (const item of rentalData.items) {
        const itemRef = doc(db, INVENTARIS_COL, item.itemId);
        const itemSnapshot = await transaction.get(itemRef);

        if (itemSnapshot.exists()) {
          const itemData = itemSnapshot.data();
          const currentRented = itemData.stok_tersewa || 0;
          const currentAvail = itemData.stok_tersedia || 0;

          itemUpdates.push({
            ref: itemRef,
            newRented: Math.max(0, currentRented - item.jumlah),
            newAvail: Math.min(itemData.total_stok, currentAvail + item.jumlah)
          });
        }
      }
    }

    // 3. Eksekusi SEMUA penulisan (transaction.update) setelah seluruh pembacaan selesai
    for (const update of itemUpdates) {
      transaction.update(update.ref, {
        stok_tersewa: update.newRented,
        stok_tersedia: update.newAvail,
        updatedAt: serverTimestamp()
      });
    }

    transaction.update(rentalRef, {
      status: "Dibatalkan",
      updatedAt: serverTimestamp()
    });
  });
}

export async function resetDemoOrders() {
  const [rentalsSnapshot, spkSnapshot, inventorySnapshot] = await Promise.all([
    getDocs(collection(db, PENYEWAAN_COL)),
    getDocs(collection(db, SPK_COL)),
    getDocs(collection(db, INVENTARIS_COL))
  ]);

  const operations = [
    ...inventorySnapshot.docs.map((snapshot) => ({
      type: "update",
      ref: snapshot.ref,
      data: {
        stok_tersedia: snapshot.data().total_stok || 0,
        stok_tersewa: 0,
        updatedAt: serverTimestamp()
      }
    })),
    ...rentalsSnapshot.docs.map((snapshot) => ({ type: "delete", ref: snapshot.ref })),
    ...spkSnapshot.docs.map((snapshot) => ({ type: "delete", ref: snapshot.ref }))
  ];

  const batchSize = 450;
  for (let start = 0; start < operations.length; start += batchSize) {
    const batch = writeBatch(db);
    for (const operation of operations.slice(start, start + batchSize)) {
      if (operation.type === "update") {
        batch.update(operation.ref, operation.data);
      } else {
        batch.delete(operation.ref);
      }
    }
    await batch.commit();
  }

  return {
    orders: rentalsSnapshot.size,
    spk: spkSnapshot.size,
    inventory: inventorySnapshot.size
  };
}

/**
 * Update pembayaran transaksi (DP atau Pelunasan)
 */
export async function updatePembayaran(transaksiId, { type, amount, method, notes }) {
  const rentalRef = doc(db, PENYEWAAN_COL, transaksiId);
  
  return await runTransaction(db, async (transaction) => {
    const rentalSnapshot = await transaction.get(rentalRef);
    if (!rentalSnapshot.exists()) {
      throw new Error("Transaksi tidak ditemukan.");
    }
    
    const data = rentalSnapshot.data();
    const now = new Date().toISOString().split('T')[0];
    
    let updateData = {
      updatedAt: serverTimestamp()
    };
    
    if (type === "dp") {
      // Update DP payment
      updateData.dp_amount = amount;
      updateData.dp_paid = true;
      updateData.dp_date = now;
      
      // Check if DP + remaining equals total (full payment)
      const remaining = data.total_biaya - amount;
      if (remaining <= 0) {
        updateData.payment_status = "lunas";
        updateData.lunas_amount = amount;
        updateData.lunas_paid = true;
        updateData.lunas_date = now;
      } else {
        updateData.payment_status = "dp_paid";
      }
    } else if (type === "lunas") {
      // Update remaining payment (lunas)
      updateData.lunas_amount = amount;
      updateData.lunas_paid = true;
      updateData.lunas_date = now;
      updateData.payment_status = "lunas";
    } else if (type === "partial") {
      // Partial payment (neither full DP nor lunas)
      const currentPaid = (data.dp_paid ? data.dp_amount : 0) + (data.lunas_paid ? data.lunas_amount : 0);
      const newTotal = currentPaid + amount;
      
      if (newTotal >= data.total_biaya) {
        updateData.payment_status = "lunas";
        updateData.lunas_amount = amount;
        updateData.lunas_paid = true;
        updateData.lunas_date = now;
      } else {
        updateData.payment_status = "partial";
        updateData.lunas_amount = (data.lunas_amount || 0) + amount;
        updateData.lunas_paid = true;
        updateData.lunas_date = now;
      }
    }
    
    if (method) updateData.payment_method = method;
    if (notes) updateData.payment_notes = notes;
    
    transaction.update(rentalRef, updateData);
    
    return true;
  });
}

/**
 * Daftar template preset barang inventaris sesuai best practice alat pesta
 */
export const SAMPLE_PEKERJA = [
  {
    nama: "Budi Santoso",
    telepon: "081234567890",
    posisi: "Koordinator",
    alamat: "Jl. Diponegoro No. 12, Bandung",
    status: "aktif"
  },
  {
    nama: "Riko Pratama",
    telepon: "082233445566",
    posisi: "Teknisi",
    alamat: "Jl. Merdeka 88, Bandung",
    status: "aktif"
  },
  {
    nama: "Indah Permata",
    telepon: "083344556677",
    posisi: "Admin Lapangan",
    alamat: "Jl. Cikutra No. 45, Bandung",
    status: "aktif"
  },
  {
    nama: "Gilang Ramadhan",
    telepon: "085566778899",
    posisi: "Operator",
    alamat: "Jl. Setiabudi No. 7, Bandung",
    status: "aktif"
  },
  {
    nama: "Asep Surya",
    telepon: "087788990011",
    posisi: "Logistik",
    alamat: "Jl. Cianjur No. 18, Bandung",
    status: "cuti"
  }
];

export async function seedSamplePekerja() {
  const q = query(collection(db, PEKERJA_COL), where("source", "==", "sample"));
  const snapshot = await getDocs(q);

  if (!snapshot.empty) return;

  for (const sample of SAMPLE_PEKERJA) {
    await addDoc(collection(db, PEKERJA_COL), {
      ...sample,
      source: "sample",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  }
}

export async function clearSamplePekerja() {
  const q = query(collection(db, PEKERJA_COL), where("source", "==", "sample"));
  const snapshot = await getDocs(q);

  for (const docSnap of snapshot.docs) {
    await deleteDoc(doc(db, PEKERJA_COL, docSnap.id));
  }
}

export const SAMPLE_TEMPLATES = [
  {
    nama_barang: "Tenda Roder VIP 10x20m",
    kategori: "Tenda",
    total_stok: 5,
    harga_sewa: 3500000,
    deskripsi: "Tenda bentang besar tanpa tiang tengah, termasuk plafon kain putih & penerangan LED dasar."
  },
  {
    nama_barang: "Tenda Sarnafil / Kerucut 3x3m",
    kategori: "Tenda",
    total_stok: 12,
    harga_sewa: 350000,
    deskripsi: "Tenda kerucut booth pameran/bazar heavy duty waterproof."
  },
  {
    nama_barang: "Tenda Dekorasi Plafon VIP (per m2)",
    kategori: "Tenda",
    total_stok: 50,
    harga_sewa: 45000,
    deskripsi: "Tenda semi-dekorasi plafon kain rumbai bertema elegan."
  },
  {
    nama_barang: "Kursi Futura + Cover Ketat & Pita",
    kategori: "Kursi",
    total_stok: 200,
    harga_sewa: 15000,
    deskripsi: "Kursi besi futura busa tebal + sarung kain stretch & pita warna opsional."
  },
  {
    nama_barang: "Kursi Tiffany Kayu VIP",
    kategori: "Kursi",
    total_stok: 80,
    harga_sewa: 35000,
    deskripsi: "Kursi kayu tiffany warna putih/gold cocok untuk wedding & gala dinner."
  },
  {
    nama_barang: "Meja Bulat / Round Table D180cm + Taplak",
    kategori: "Meja",
    total_stok: 20,
    harga_sewa: 120000,
    deskripsi: "Meja makan bulat kapasitas 8-10 orang termasuk taplak meja dan runner."
  },
  {
    nama_barang: "Meja Kotak 120x60cm + Skirting",
    kategori: "Meja",
    total_stok: 30,
    harga_sewa: 65000,
    deskripsi: "Meja penerima tamu / prasmanan dilengkapi kain poni skirting."
  },
  {
    nama_barang: "AC Portable 5 PK Heavy Duty",
    kategori: "Pendingin & Listrik",
    total_stok: 8,
    harga_sewa: 850000,
    deskripsi: "Pendingin udara outdoor 5 PK termasuk pipa fleksibel & penampung air."
  },
  {
    nama_barang: "Cooling Fan / Misty Fan (Kipas Embun)",
    kategori: "Pendingin & Listrik",
    total_stok: 15,
    harga_sewa: 250000,
    deskripsi: "Kipas angin air embun tangki 60 Liter untuk area semi-open."
  },
  {
    nama_barang: "Genset Silent 50 KVA (Include BBM 8 Jam)",
    kategori: "Pendingin & Listrik",
    total_stok: 3,
    harga_sewa: 2800000,
    deskripsi: "Genset silent super quiet + kabel power & operator teknisi 1 shift."
  },
  {
    nama_barang: "Panggung Modular Height 50cm (per m2)",
    kategori: "Panggung & Flooring",
    total_stok: 40,
    harga_sewa: 50000,
    deskripsi: "Modul panggung multiplex 18mm rangka besi kokoh + karpet hitam/merah."
  },
  {
    nama_barang: "Flooring Kayu + Karpet Red Velvet (per m2)",
    kategori: "Panggung & Flooring",
    total_stok: 100,
    harga_sewa: 35000,
    deskripsi: "Alas lantai kayu perataan tanah dilapisi karpet merah bersih."
  },
  {
    nama_barang: "Sound System Portable 1000W + 2 Mic Wireless",
    kategori: "Sound & Lighting",
    total_stok: 6,
    harga_sewa: 600000,
    deskripsi: "Paket speaker aktif 15 inch + mixer 6 ch + 2 microphone wireless UHF."
  },
  {
    nama_barang: "Lampu Par LED 54x3W RGBW (per unit)",
    kategori: "Sound & Lighting",
    total_stok: 24,
    harga_sewa: 100000,
    deskripsi: "Lampu sorot warna panggung / dekorasi dinding (uplighting)."
  }
];

/**
 * Memuat sample inventaris otomatis ke Firestore jika database kosong atau dipicu user
 */
export async function seedSampleInventaris() {
  for (const sample of SAMPLE_TEMPLATES) {
    await addDoc(collection(db, INVENTARIS_COL), {
      ...sample,
      stok_tersedia: sample.total_stok,
      stok_tersewa: 0,
      updatedAt: serverTimestamp()
    });
  }
}

/**
 * Riset Paket Sewa Acara Standar Usaha Persewaan Alat Pesta
 */
export const EVENT_PACKAGES = [
  {
    nama_paket: "💼 Paket Exclusive Meeting & Conference",
    kategori_event: "Meeting & Seminar",
    deskripsi: "Untuk rapat direksi, seminar VIP, & corporate meeting (Kursi Tiffany/Futura, Meja Kotak Skirting, AC 5 PK, Sound System)",
    items: [
      { searchKeywords: ["Kursi Tiffany Kayu VIP", "Kursi Futura"], defaultQty: 25 },
      { searchKeywords: ["Meja Kotak 120x60cm + Skirting"], defaultQty: 6 },
      { searchKeywords: ["AC Portable 5 PK Heavy Duty", "Cooling Fan"], defaultQty: 2 },
      { searchKeywords: ["Sound System Portable 1000W"], defaultQty: 1 }
    ]
  },
  {
    nama_paket: "🎓 Paket Acara Wisuda & Pelepasan (Graduation)",
    kategori_event: "Wisuda",
    deskripsi: "Untuk wisuda sekolah/kampus & wisuda outdoor (Panggung Modular, Flooring Karpet, Kursi Futura, Sound & Par LED)",
    items: [
      { searchKeywords: ["Panggung Modular Height 50cm"], defaultQty: 20 },
      { searchKeywords: ["Flooring Kayu + Karpet Red Velvet"], defaultQty: 40 },
      { searchKeywords: ["Kursi Futura + Cover Ketat & Pita"], defaultQty: 100 },
      { searchKeywords: ["Sound System Portable 1000W"], defaultQty: 2 },
      { searchKeywords: ["Lampu Par LED 54x3W RGBW"], defaultQty: 6 }
    ]
  },
  {
    nama_paket: "🏬 Paket Booth Event & Stand Pameran",
    kategori_event: "Pameran & Bazaar",
    deskripsi: "Khusus booth outdoor/indoor pameran, bazaar UMKM & registrasi (Tenda Sarnafil 3x3m, Meja Skirting, Kursi, Par LED)",
    items: [
      { searchKeywords: ["Tenda Sarnafil / Kerucut 3x3m"], defaultQty: 3 },
      { searchKeywords: ["Meja Kotak 120x60cm + Skirting"], defaultQty: 3 },
      { searchKeywords: ["Kursi Futura + Cover Ketat & Pita"], defaultQty: 9 },
      { searchKeywords: ["Lampu Par LED 54x3W RGBW"], defaultQty: 3 }
    ]
  },
  {
    nama_paket: "💍 Paket Pernikahan VIP (Wedding Package)",
    kategori_event: "Pernikahan",
    deskripsi: "Lengkap Tenda Plafon/Roder VIP, Kursi Tiffany/Futura, Meja Bulat, AC 5 PK, Flooring Karpet Velvet & Sound",
    items: [
      { searchKeywords: ["Tenda Roder VIP", "Tenda Dekorasi Plafon VIP"], defaultQty: 50 },
      { searchKeywords: ["Kursi Tiffany Kayu VIP", "Kursi Futura"], defaultQty: 80 },
      { searchKeywords: ["Meja Bulat / Round Table"], defaultQty: 8 },
      { searchKeywords: ["AC Portable 5 PK Heavy Duty"], defaultQty: 2 },
      { searchKeywords: ["Flooring Kayu + Karpet Red Velvet"], defaultQty: 50 },
      { searchKeywords: ["Sound System Portable 1000W"], defaultQty: 1 }
    ]
  },
  {
    nama_paket: "🎂 Paket Syukuran & Ulang Tahun (Intimate Party)",
    kategori_event: "Ulang Tahun & Syukuran",
    deskripsi: "Paket pesta ulang tahun / syukuran rumah (Tenda Kerucut, Kursi Futura, Misty Fan, Sound System)",
    items: [
      { searchKeywords: ["Tenda Sarnafil / Kerucut 3x3m", "Tenda Dekorasi"], defaultQty: 2 },
      { searchKeywords: ["Kursi Futura + Cover Ketat & Pita"], defaultQty: 40 },
      { searchKeywords: ["Meja Bulat / Round Table D180cm"], defaultQty: 3 },
      { searchKeywords: ["Cooling Fan / Misty Fan (Kipas Embun)"], defaultQty: 2 },
      { searchKeywords: ["Sound System Portable 1000W"], defaultQty: 1 }
    ]
  },
  {
    nama_paket: "🎸 Paket Konser & Festival Outdoor (Stage & Rigging)",
    kategori_event: "Konser & Festival",
    deskripsi: "Untuk festival & panggung besar (Tenda Roder VIP, Panggung Modular H50cm, Genset 50 KVA, Sound & Lighting)",
    items: [
      { searchKeywords: ["Tenda Roder VIP 10x20m"], defaultQty: 1 },
      { searchKeywords: ["Panggung Modular Height 50cm"], defaultQty: 30 },
      { searchKeywords: ["Genset Silent 50 KVA"], defaultQty: 1 },
      { searchKeywords: ["Sound System Portable 1000W"], defaultQty: 2 },
      { searchKeywords: ["Lampu Par LED 54x3W RGBW"], defaultQty: 12 }
    ]
  },
  {
    nama_paket: "🤝 Paket Gathering & Corporate",
    kategori_event: "Gathering / Corporate",
    deskripsi: "Paket fleksibel untuk gathering kantor, acara perusahaan, dan team building dengan tenda, tempat duduk, meja, serta perlengkapan audio.",
    items: [
      { searchKeywords: ["Tenda Roder VIP 10x20m", "Tenda Sarnafil / Kerucut 3x3m"], defaultQty: 1 },
      { searchKeywords: ["Kursi Futura + Cover Ketat & Pita", "Kursi Tiffany Kayu VIP"], defaultQty: 50 },
      { searchKeywords: ["Meja Kotak 120x60cm + Skirting"], defaultQty: 6 },
      { searchKeywords: ["Sound System Portable 1000W"], defaultQty: 1 },
      { searchKeywords: ["Cooling Fan / Misty Fan (Kipas Embun)", "AC Portable 5 PK Heavy Duty"], defaultQty: 2 }
    ]
  }
];



