import { jsPDF } from "https://cdn.jsdelivr.net/npm/jspdf@2.5.2/+esm";

const PAGE_MARGIN = 14;
const formatRupiah = (amount) => new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0
}).format(Number(amount) || 0);

function addDocumentHeader(doc, title, subtitle) {
  const pageWidth = doc.internal.pageSize.getWidth();
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 34, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("TENDA RENTAL", PAGE_MARGIN, 10);
  doc.setFontSize(17);
  doc.text(title, PAGE_MARGIN, 20);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(subtitle, PAGE_MARGIN, 27);
  doc.setTextColor(30, 41, 59);
  return 43;
}

function addSectionTitle(doc, title, y) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(title, PAGE_MARGIN, y);
  doc.setDrawColor(203, 213, 225);
  doc.line(PAGE_MARGIN, y + 2, doc.internal.pageSize.getWidth() - PAGE_MARGIN, y + 2);
  return y + 8;
}

function addMetricCard(doc, x, y, width, label, value, accent) {
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(x, y, width, 22, 2, 2, "FD");
  doc.setFillColor(...accent);
  doc.rect(x, y, 2, 22, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(label, x + 5, y + 7);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text(String(value), x + 5, y + 16);
}

function drawTable(doc, columns, rows, startY) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const usableWidth = pageWidth - PAGE_MARGIN * 2;
  const widths = columns.map(column => usableWidth * column.width);
  const rowPadding = 2.5;
  let y = startY;

  const drawHeader = () => {
    doc.setFillColor(30, 41, 59);
    doc.rect(PAGE_MARGIN, y, usableWidth, 8, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    let x = PAGE_MARGIN + rowPadding;
    columns.forEach((column, index) => {
      doc.text(column.label, x, y + 5.4);
      x += widths[index];
    });
    y += 8;
  };

  drawHeader();
  rows.forEach((row, rowIndex) => {
    const cellLines = row.map((value, index) => doc.splitTextToSize(
      String(value ?? "-"),
      widths[index] - rowPadding * 2
    ));
    const lineCount = Math.max(1, ...cellLines.map(lines => lines.length));
    const rowHeight = Math.max(8, lineCount * 4 + rowPadding * 2);

    if (y + rowHeight > doc.internal.pageSize.getHeight() - PAGE_MARGIN) {
      doc.addPage();
      y = PAGE_MARGIN;
      drawHeader();
    }

    if (rowIndex % 2 === 0) {
      doc.setFillColor(241, 245, 249);
      doc.rect(PAGE_MARGIN, y, usableWidth, rowHeight, "F");
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);
    let x = PAGE_MARGIN + rowPadding;
    cellLines.forEach((lines, index) => {
      doc.text(lines, x, y + rowPadding + 3);
      x += widths[index];
    });
    y += rowHeight;
  });

  return y + 7;
}

function ensureSpace(doc, y, needed = 16) {
  if (y + needed <= doc.internal.pageSize.getHeight() - PAGE_MARGIN) return y;
  doc.addPage();
  return PAGE_MARGIN;
}

export function createAnnualReportPdf(report) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = addDocumentHeader(doc, `REKAP ORDER TAHUN ${report.year}`, "Ringkasan operasional dan keuangan tahunan");
  const gap = 5;
  const cardWidth = (doc.internal.pageSize.getWidth() - PAGE_MARGIN * 2 - gap) / 2;
  const metrics = [
    ["Jumlah Order", report.orderCount, [14, 165, 160]],
    ["Omset Aktif / Selesai", formatRupiah(report.revenue), [37, 99, 235]],
    ["Pembayaran Diterima", formatRupiah(report.collected), [22, 163, 74]],
    ["Piutang", formatRupiah(report.receivable), [234, 88, 12]]
  ];

  metrics.forEach((metric, index) => {
    const x = PAGE_MARGIN + (index % 2) * (cardWidth + gap);
    const cardY = y + Math.floor(index / 2) * 26;
    addMetricCard(doc, x, cardY, cardWidth, metric[0], metric[1], metric[2]);
  });
  y += 60;

  y = ensureSpace(doc, y);
  y = addSectionTitle(doc, "Kategori Event", y);
  y = drawTable(doc,
    [
      { label: "Kategori", width: 0.42 },
      { label: "Order", width: 0.16 },
      { label: "Batal", width: 0.16 },
      { label: "Omset", width: 0.26 }
    ],
    report.categories.map(category => [
      category.name,
      category.orders,
      category.cancelled,
      formatRupiah(category.revenue)
    ]),
    y
  );

  y = ensureSpace(doc, y);
  y = addSectionTitle(doc, "Inventaris Terpakai", y);
  drawTable(doc,
    [
      { label: "Barang", width: 0.52 },
      { label: "Jumlah Unit", width: 0.22 },
      { label: "Jumlah Order", width: 0.26 }
    ],
    report.inventory.map(item => [item.name, item.quantity, item.orders]),
    y
  );

  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page++) {
    doc.setPage(page);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(
      "Berdasarkan tanggal mulai sewa. Order dibatalkan tidak dihitung dalam omset dan pemakaian inventaris.",
      PAGE_MARGIN,
      doc.internal.pageSize.getHeight() - 8
    );
    doc.text(`Halaman ${page} / ${pageCount}`, doc.internal.pageSize.getWidth() - PAGE_MARGIN, doc.internal.pageSize.getHeight() - 8, { align: "right" });
  }
  return doc;
}

export function createDetailedReportPdf(report) {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "landscape" });
  let y = addDocumentHeader(
    doc,
    "LAPORAN DETAIL ORDER",
    `${report.label} | ${report.startDate} sampai ${report.endDate}`
  );
  const gap = 4;
  const cardColumns = 3;
  const cardWidth = (doc.internal.pageSize.getWidth() - PAGE_MARGIN * 2 - gap * (cardColumns - 1)) / cardColumns;
  const metrics = [
    ["Jumlah Order", report.orderCount, [14, 165, 160]],
    ["Order Dibatalkan", report.cancelledCount, [220, 38, 38]],
    ["Omset Aktif / Selesai", formatRupiah(report.revenue), [37, 99, 235]],
    ["Pembayaran Diterima", formatRupiah(report.collected), [22, 163, 74]],
    ["Piutang", formatRupiah(report.receivable), [234, 88, 12]]
  ];
  metrics.forEach((metric, index) => {
    const x = PAGE_MARGIN + (index % cardColumns) * (cardWidth + gap);
    const cardY = y + Math.floor(index / cardColumns) * 26;
    addMetricCard(doc, x, cardY, cardWidth, metric[0], metric[1], metric[2]);
  });
  y += 60;

  y = ensureSpace(doc, y);
  y = addSectionTitle(doc, "Rincian Order dan Keuangan", y);
  y = drawTable(doc,
    [
      { label: "Tanggal", width: 0.09 },
      { label: "Pelanggan / ID", width: 0.20 },
      { label: "Kategori / Lokasi", width: 0.20 },
      { label: "Status / Bayar", width: 0.14 },
      { label: "Nilai Order", width: 0.12 },
      { label: "DP + Pelunasan", width: 0.13 },
      { label: "Dibayar / Piutang", width: 0.12 }
    ],
    report.orders.map(order => [
      order.reportDate,
      `${order.nama_pelanggan || "-"}\n${order.id || "-"}`,
      `${order.kategori_event || "Belum dikategorikan"}\n${order.alamat_lokasi || "-"}`,
      `${order.status || "-"}\n${order.payment_status || "-"}`,
      formatRupiah(order.total),
      `${formatRupiah(order.dp)} + ${formatRupiah(order.finalPayment)}`,
      `${formatRupiah(order.collected)} / ${formatRupiah(order.receivable)}`
    ]),
    y
  );

  y = ensureSpace(doc, y);
  y = addSectionTitle(doc, "Inventaris per Order", y);
  y = drawTable(doc,
    [
      { label: "Tanggal", width: 0.09 },
      { label: "Order / Pelanggan", width: 0.20 },
      { label: "Barang / Kategori", width: 0.24 },
      { label: "Jumlah", width: 0.08 },
      { label: "Hari", width: 0.07 },
      { label: "Harga / Hari", width: 0.12 },
      { label: "Subtotal", width: 0.12 },
      { label: "Pemakaian", width: 0.08 }
    ],
    report.itemDetails.map(item => [
      item.reportDate,
      `${item.customer}\n${item.orderId}`,
      `${item.name}\n${item.category}`,
      `${item.quantity} unit`,
      item.duration,
      formatRupiah(item.unitPrice),
      formatRupiah(item.subtotal),
      item.countedAsUsage ? "Ya" : "Tidak"
    ]),
    y
  );

  y = ensureSpace(doc, y);
  y = addSectionTitle(doc, "Ringkasan Pemakaian Inventaris", y);
  drawTable(doc,
    [
      { label: "Barang", width: 0.36 },
      { label: "Kategori", width: 0.22 },
      { label: "Total Unit", width: 0.14 },
      { label: "Jumlah Order", width: 0.14 },
      { label: "Nilai Sewa", width: 0.14 }
    ],
    report.inventory.map(item => [item.name, item.category, item.quantity, item.orders, formatRupiah(item.subtotal)]),
    y
  );

  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page++) {
    doc.setPage(page);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(
      "Order dibatalkan tetap tercantum pada detail, tetapi tidak dihitung dalam omset, pembayaran, piutang, dan pemakaian.",
      PAGE_MARGIN,
      doc.internal.pageSize.getHeight() - 8
    );
    doc.text(`Halaman ${page} / ${pageCount}`, doc.internal.pageSize.getWidth() - PAGE_MARGIN, doc.internal.pageSize.getHeight() - 8, { align: "right" });
  }
  return doc;
}

export function createSpkPdf(spk, currentWorkers = []) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = addDocumentHeader(doc, "SURAT PERINTAH KERJA", "TendaRental - Dokumen operasional lapangan");
  const details = spk.detailOrder || {};
  const items = details.items || [];
  const assignedWorkers = spk.assignedWorkers?.length
    ? spk.assignedWorkers
    : (spk.workerIds || []).map(id => currentWorkers.find(worker => worker.id === id)).filter(Boolean);

  y = addSectionTitle(doc, "Informasi Acara", y);
  const lineHeight = 6;
  const detailsRows = [
    ["Pelanggan", spk.namaPelanggan || "-"],
    ["Telepon", details.telepon || "-"],
    ["Kategori Event", details.kategoriEvent || "-"],
    ["Lokasi", spk.alamatEvent || "-"],
    ["Tanggal Acara", spk.tanggalEvent || "-"],
    ["Periode Sewa", [details.tanggalSewa, details.tanggalKembali].filter(Boolean).join(" sampai ") || "-"],
    ["Status Order / SPK", `${details.statusOrder || "-"} / ${spk.status || "draft"}`],
    ["Referensi Order", spk.transaksiId || "-"]
  ];
  detailsRows.forEach(([label, value]) => {
    y = ensureSpace(doc, y, lineHeight);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text(`${label}:`, PAGE_MARGIN, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(15, 23, 42);
    const lines = doc.splitTextToSize(String(value), doc.internal.pageSize.getWidth() - PAGE_MARGIN * 2 - 40);
    doc.text(lines, PAGE_MARGIN + 40, y);
    y += Math.max(lineHeight, lines.length * 4.5);
  });

  y = ensureSpace(doc, y + 3);
  y = addSectionTitle(doc, "Inventaris / Properti yang Digunakan", y + 3);
  y = drawTable(doc,
    [
      { label: "Nama Barang", width: 0.48 },
      { label: "Kategori", width: 0.25 },
      { label: "Jumlah", width: 0.12 },
      { label: "Satuan", width: 0.15 }
    ],
    items.map(item => [item.nama_barang || "Barang", item.kategori || "-", item.jumlah ?? "-", "unit"]),
    y
  );
  if (!items.length) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text("Tidak ada rincian inventaris pada order ini.", PAGE_MARGIN, y - 3);
    y += 5;
  }

  y = ensureSpace(doc, y);
  y = addSectionTitle(doc, "Pekerja yang Ditugaskan", y);
  drawTable(doc,
    [
      { label: "Nama", width: 0.38 },
      { label: "Posisi", width: 0.32 },
      { label: "Telepon", width: 0.30 }
    ],
    assignedWorkers.map(worker => [worker.nama || "-", worker.posisi || "-", worker.telepon || "-"]),
    y
  );

  if (spk.catatan) {
    const noteY = ensureSpace(doc, y + 3, 18);
    addSectionTitle(doc, "Catatan / Instruksi", noteY + 3);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    const noteLines = doc.splitTextToSize(spk.catatan, doc.internal.pageSize.getWidth() - PAGE_MARGIN * 2);
    doc.text(noteLines, PAGE_MARGIN, noteY + 15);
    y = noteY + 15 + noteLines.length * 4.5;
  }

  const signatureY = ensureSpace(doc, Math.max(y + 6, doc.internal.pageSize.getHeight() - 44), 30);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text("Koordinator Lapangan", PAGE_MARGIN + 10, signatureY + 5);
  doc.text("Penanggung Jawab", doc.internal.pageSize.getWidth() - PAGE_MARGIN - 48, signatureY + 5);
  doc.setDrawColor(148, 163, 184);
  doc.line(PAGE_MARGIN + 10, signatureY + 23, PAGE_MARGIN + 60, signatureY + 23);
  doc.line(doc.internal.pageSize.getWidth() - PAGE_MARGIN - 48, signatureY + 23, doc.internal.pageSize.getWidth() - PAGE_MARGIN, signatureY + 23);
  return doc;
}

export async function shareOrDownloadPdf(doc, filename, title, text) {
  const file = new File([doc.output("blob")], filename, { type: "application/pdf" });
  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title, text });
      return "shared";
    } catch (error) {
      if (error.name === "AbortError") return "cancelled";
      throw error;
    }
  }

  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return "downloaded";
}