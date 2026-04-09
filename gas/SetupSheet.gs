/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  SETUP SHEET — Absen PJLP v5 (Normalized)                   ║
 * ║  Jalankan setupAllSheets() SEKALI dari Script Editor         ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Fungsi ini membuat/memperbaiki semua sheet sesuai struktur
 * database normalized v5.
 */


/**
 * Setup semua sheet dengan header yang benar.
 * Aman dijalankan berkali-kali — tidak menghapus data.
 */
function setupAllSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var log = [];

  var sheetsConfig = {
    'Data PJLP': {
      headers: ['NIK', 'Nama', 'Jabatan', 'Unit', 'PIN_Hash', 'Status Aktif', 'Sisa Cuti', 'Token', 'Token Expire'],
      nikCol: 1, // 1-indexed, kolom A
      frozen: 1,
    },
    'Data Absen': {
      headers: ['ID_Absen', 'Tanggal', 'NIK', 'Jam Masuk', 'Lat Masuk', 'Lng Masuk', 'Lokasi Masuk Valid', 'Jam Pulang', 'Lat Pulang', 'Lng Pulang', 'Lokasi Pulang Valid', 'Status', 'Jam Kerja', 'Keterangan'],
      nikCol: 3,
      frozen: 1,
    },
    'Data Izin': {
      headers: ['ID_Izin', 'NIK', 'Jenis', 'Tgl Mulai', 'Tgl Selesai', 'Jumlah Hari', 'Alasan', 'Lampiran', 'Status Approval', 'Catatan', 'Created_At'],
      nikCol: 2,
      frozen: 1,
    },
    'Data Jurnal': {
      headers: ['ID_Jurnal', 'Tanggal', 'Waktu', 'NIK', 'Kegiatan', 'Kategori', 'Deskripsi', 'Foto URL', 'Foto Lat', 'Foto Lng', 'Foto Lokasi Valid', 'Dokumen URL', 'Nama File', 'Status Verifikasi', 'Catatan Admin', 'Thumbnail URL'],
      nikCol: 4,
      frozen: 1,
    },
    'Data Keluaran': {
      headers: ['ID_Keluaran', 'NIK', 'Nomor SPK', 'Item Keluaran'],
      nikCol: 2,
      frozen: 1,
    },
    'Log Aktivitas': {
      headers: ['Waktu', 'NIK', 'Aksi', 'Detail'],
      nikCol: null,
      frozen: 1,
    },
    'Rekap Bulanan': {
      headers: ['ID_Rekap', 'Bulan', 'Tahun', 'NIK', 'Hadir', 'Terlambat', 'Izin', 'Sakit', 'Cuti', 'Alfa', 'Total Hari Kerja', 'Persentase'],
      nikCol: 4,
      frozen: 1,
    },
    'Laporan': {
      headers: ['Timestamp', 'Jenis', 'Periode', 'Status'],
      nikCol: null,
      frozen: 1,
    },
  };

  for (var name in sheetsConfig) {
    var cfg = sheetsConfig[name];
    var sheet = ss.getSheetByName(name);

    // Buat sheet jika belum ada
    if (!sheet) {
      sheet = ss.insertSheet(name);
      log.push('[BUAT] Sheet "' + name + '" dibuat.');
    }

    var lastRow = sheet.getLastRow();
    var lastCol = sheet.getLastColumn();
    var headers = cfg.headers;

    if (lastRow === 0) {
      // Sheet kosong — tambahkan header
      sheet.getRange(1, 1, 1, headers.length).setValues([headers])
        .setFontWeight('bold')
        .setBackground('#4472C4')
        .setFontColor('#FFFFFF');
      sheet.setFrozenRows(cfg.frozen);
      log.push('[OK] Header "' + name + '" ditambahkan (' + headers.length + ' kolom).');
    } else {
      // Cek header existing
      var existingHeaders = sheet.getRange(1, 1, 1, Math.max(lastCol, 1)).getValues()[0];
      var firstHeader = String(existingHeaders[0]).trim();

      // Jika baris 1 seperti data (bukan header), sisipkan
      var looksLikeData = /^\d{4}-\d{2}/.test(firstHeader) || /^\d{16}$/.test(firstHeader) || /^(ABS|IZN|JRN|KEL|REK)-/.test(firstHeader);

      if (looksLikeData) {
        sheet.insertRowBefore(1);
        sheet.getRange(1, 1, 1, headers.length).setValues([headers])
          .setFontWeight('bold')
          .setBackground('#4472C4')
          .setFontColor('#FFFFFF');
        sheet.setFrozenRows(cfg.frozen);
        log.push('[FIX] "' + name + '" — Header disisipkan (baris 1 berisi data).');
      } else {
        // Update header jika kolom kurang
        sheet.getRange(1, 1, 1, headers.length).setValues([headers])
          .setFontWeight('bold')
          .setBackground('#4472C4')
          .setFontColor('#FFFFFF');
        sheet.setFrozenRows(cfg.frozen);
        log.push('[OK] "' + name + '" — Header diperbarui.');
      }
    }

    // Format kolom NIK sebagai plain text (cegah scientific notation)
    if (cfg.nikCol && sheet.getLastRow() > 1) {
      var numDataRows = sheet.getLastRow() - 1;
      sheet.getRange(2, cfg.nikCol, numDataRows, 1).setNumberFormat('@');
    }

    // Auto-resize kolom
    try {
      for (var c = 1; c <= headers.length; c++) {
        sheet.autoResizeColumn(c);
      }
    } catch (e) { /* ignore */ }
  }

  // Hapus sheet default 'Sheet1' jika masih ada dan kosong
  var sheet1 = ss.getSheetByName('Sheet1');
  if (sheet1 && sheet1.getLastRow() === 0) {
    try {
      ss.deleteSheet(sheet1);
      log.push('[HAPUS] Sheet "Sheet1" (kosong) dihapus.');
    } catch (e) { /* minimal 1 sheet harus ada */ }
  }

  var result = '=== SETUP SHEET v5 (NORMALIZED) ===\n\n' + log.join('\n') + '\n\nSelesai! ' + Object.keys(sheetsConfig).length + ' sheet dikonfigurasi.';
  Logger.log(result);

  try {
    SpreadsheetApp.getUi().alert(result);
  } catch (e) {}

  return result;
}


/**
 * Reset semua sheet — HAPUS SEMUA DATA, kembalikan ke kosong dengan header.
 * PERINGATAN: Ini menghapus semua data!
 */
function resetAllSheets() {
  var ui;
  try {
    ui = SpreadsheetApp.getUi();
    var response = ui.alert(
      'PERINGATAN!',
      'Ini akan MENGHAPUS SEMUA DATA di semua sheet dan memulai dari awal.\n\nApakah Anda yakin?',
      ui.ButtonSet.YES_NO
    );
    if (response !== ui.Button.YES) {
      ui.alert('Dibatalkan.');
      return;
    }
  } catch (e) {
    // Bukan dari editor — lanjutkan tanpa konfirmasi (hanya bisa dijalankan dari editor)
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetNames = [
    'Data Absen', 'Data Izin', 'Data Jurnal', 'Data Keluaran',
    'Log Aktivitas', 'Rekap Bulanan', 'Laporan',
  ];

  for (var i = 0; i < sheetNames.length; i++) {
    var sheet = ss.getSheetByName(sheetNames[i]);
    if (sheet && sheet.getLastRow() > 1) {
      sheet.deleteRows(2, sheet.getLastRow() - 1);
    }
  }

  // Jalankan setup ulang
  setupAllSheets();

  // Invalidate cache
  try {
    CacheService.getScriptCache().remove('pjlp_data_v4');
  } catch (e) {}

  var msg = 'Semua sheet telah direset dan header dikonfigurasi ulang.\nSheet "Data PJLP" TIDAK dihapus (data master tetap aman).';
  Logger.log(msg);
  try {
    SpreadsheetApp.getUi().alert(msg);
  } catch (e) {}
}


/**
 * Diagnostik — cek semua sheet dan laporkan masalah.
 */
function diagnosisSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var log = [];

  log.push('=== DIAGNOSTIK ABSEN PJLP v5 ===');
  log.push('Waktu: ' + new Date().toLocaleString());
  log.push('');

  // 1. Daftar semua sheet
  var allSheets = ss.getSheets();
  log.push('--- DAFTAR SHEET (' + allSheets.length + ') ---');
  for (var s = 0; s < allSheets.length; s++) {
    var sh = allSheets[s];
    log.push('  ' + (s + 1) + '. "' + sh.getName() + '" — ' + sh.getLastRow() + ' baris, ' + sh.getLastColumn() + ' kolom');
  }
  log.push('');

  // 2. Cek sheet yang dibutuhkan
  var required = ['Data PJLP', 'Data Absen', 'Data Izin', 'Data Jurnal',
                  'Data Keluaran', 'Log Aktivitas', 'Rekap Bulanan', 'Laporan'];

  log.push('--- CEK SHEET WAJIB ---');
  for (var r = 0; r < required.length; r++) {
    var name = required[r];
    var sheet = ss.getSheetByName(name);
    if (sheet) {
      log.push('  [OK] "' + name + '" — ' + sheet.getLastRow() + ' baris');
      if (sheet.getLastRow() >= 1) {
        var h = sheet.getRange(1, 1, 1, Math.min(sheet.getLastColumn(), 5)).getValues()[0];
        log.push('       Header: ' + JSON.stringify(h));
      }
      if (sheet.getLastRow() >= 2) {
        var sample = sheet.getRange(2, 1, 1, Math.min(sheet.getLastColumn(), 5)).getValues()[0];
        log.push('       Sample: ' + JSON.stringify(sample));
      }
    } else {
      log.push('  [GAGAL] "' + name + '" TIDAK DITEMUKAN!');
    }
  }
  log.push('');

  // 3. Cek sheet dobel
  var suspects = ['Absensi', 'Absen', 'Izin & Cuti', 'Izin', 'Laporan Otomatis',
                  'Jurnal Harian', 'Jurnal', 'Data Absensi', 'Sheet1'];
  log.push('--- CEK SHEET DOBEL ---');
  var foundDobel = false;
  for (var d = 0; d < suspects.length; d++) {
    var dobelSheet = ss.getSheetByName(suspects[d]);
    if (dobelSheet) {
      log.push('  [PERINGATAN] "' + suspects[d] + '" (' + dobelSheet.getLastRow() + ' baris) — TIDAK terhubung ke kode!');
      foundDobel = true;
    }
  }
  if (!foundDobel) log.push('  [OK] Tidak ada sheet dobel.');
  log.push('');

  // 4. Cek CONFIG
  log.push('--- CEK CONFIG ---');
  try {
    log.push('  FOLDER_JURNAL_ID: ' + (CONFIG.FOLDER_JURNAL_ID || '(KOSONG)'));
    log.push('  EMAIL_PPK: ' + (CONFIG.EMAIL_PPK || '(KOSONG)'));
    log.push('  ADMIN_PIN_HASH: ' + (CONFIG.ADMIN_PIN_HASH ? 'Sudah diisi' : '(KOSONG)'));
  } catch (e) {
    log.push('  Tidak bisa baca CONFIG: ' + e.message);
  }

  var result = log.join('\n');
  Logger.log(result);
  try {
    SpreadsheetApp.getUi().alert(result);
  } catch (e) {}
  return result;
}
