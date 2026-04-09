/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  DIAGNOSTIK SHEET — Jalankan dari Script Editor              ║
 * ║  Menu: Run > diagnosisSheet                                  ║
 * ║                                                              ║
 * ║  Fungsi ini mengecek semua sheet dan melaporkan masalah.     ║
 * ║  Tambahkan kode ini ke Code.gs atau file .gs terpisah,       ║
 * ║  lalu jalankan fungsi diagnosisSheet() dari editor.          ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

function diagnosisSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var log = [];

  log.push('=== DIAGNOSTIK ABSEN PJLP ===');
  log.push('Waktu: ' + new Date().toLocaleString());
  log.push('');

  // 1. Cek semua sheet yang ada
  var allSheets = ss.getSheets();
  log.push('--- DAFTAR SEMUA SHEET ---');
  for (var s = 0; s < allSheets.length; s++) {
    var sh = allSheets[s];
    log.push((s+1) + '. "' + sh.getName() + '" — ' + sh.getLastRow() + ' baris, ' + sh.getLastColumn() + ' kolom');
  }
  log.push('');

  // 2. Cek sheet yang dibutuhkan CONFIG
  var requiredSheets = {
    'Data PJLP': { cols: ['NIK','Nama','Jabatan','Unit','PIN_Hash','Status Aktif','Sisa Cuti','Token','Token Expire'] },
    'Data Absen': { cols: ['Tanggal','NIK','Nama','Jabatan','Jam Masuk','Lat Masuk','Lng Masuk','Lokasi Masuk Valid','Jam Pulang','Lat Pulang','Lng Pulang','Lokasi Pulang Valid','Status','Jam Kerja','Keterangan'] },
    'Data Izin': { cols: ['Tgl Pengajuan','NIK','Nama','Jenis','Tgl Mulai','Tgl Selesai','Jumlah Hari','Alasan','Lampiran','Status Approval','Catatan'] },
    'Data Jurnal': { cols: ['ID','Tanggal','Waktu','NIK','Nama','Jabatan','Kegiatan','Kategori','Deskripsi','Foto URL','Foto Lat','Foto Lng','Foto Lokasi Valid','Dokumen URL','Nama File','Status Verifikasi','Catatan Admin','Thumbnail URL'] },
    'Log Aktivitas': { cols: ['Waktu','NIK','Aksi','Detail'] },
    'Rekap Bulanan': { cols: ['Bulan','Tahun','Nama','Jabatan','Hadir','Terlambat','Izin','Sakit','Cuti','Alfa','Total Hari Kerja','Persentase'] },
    'Laporan': { cols: ['Timestamp','Jenis','Periode','Status'] },
    'Data Keluaran': { cols: ['NIK','Nama','Jabatan','Nomor SPK','Item Keluaran'] },
  };

  log.push('--- CEK SHEET YANG DIBUTUHKAN ---');
  for (var name in requiredSheets) {
    var sheet = ss.getSheetByName(name);
    if (!sheet) {
      log.push('[GAGAL] Sheet "' + name + '" TIDAK DITEMUKAN!');
      continue;
    }

    var lastRow = sheet.getLastRow();
    var lastCol = sheet.getLastColumn();
    var expectedCols = requiredSheets[name].cols;

    log.push('[OK] Sheet "' + name + '" ditemukan — ' + lastRow + ' baris, ' + lastCol + ' kolom');

    // Cek jumlah kolom
    if (lastCol < expectedCols.length) {
      log.push('  [PERINGATAN] Kolom kurang! Punya ' + lastCol + ', butuh minimal ' + expectedCols.length);
    }

    // Cek header baris 1
    if (lastRow >= 1 && lastCol >= 1) {
      var headers = sheet.getRange(1, 1, 1, Math.min(lastCol, expectedCols.length + 2)).getValues()[0];
      log.push('  Header baris 1: ' + JSON.stringify(headers));

      // Cek apakah baris 1 adalah header atau langsung data
      var firstCell = String(headers[0]).trim();
      if (firstCell && /^\d{4}-\d{2}-\d{2}/.test(firstCell)) {
        log.push('  [MASALAH] Baris 1 sepertinya DATA, bukan HEADER! Kode akan melewatkan baris ini.');
      }
      if (firstCell && /^\d{16}$/.test(firstCell)) {
        log.push('  [MASALAH] Baris 1 sepertinya NIK (DATA), bukan HEADER!');
      }
    }

    // Cek sample data baris 2
    if (lastRow >= 2) {
      var sample = sheet.getRange(2, 1, 1, Math.min(lastCol, expectedCols.length)).getValues()[0];
      log.push('  Sample baris 2: ' + JSON.stringify(sample));

      // Cek NIK format
      if (name === 'Data Absen' || name === 'Data PJLP' || name === 'Data Jurnal' || name === 'Data Izin') {
        var nikColIndex = (name === 'Data Jurnal') ? 3 : (name === 'Data PJLP') ? 0 : 1;
        var nikVal = sample[nikColIndex];
        if (nikVal !== undefined && nikVal !== null && nikVal !== '') {
          var nikStr = String(nikVal);
          log.push('  NIK sample: "' + nikStr + '" (type: ' + typeof nikVal + ', length: ' + nikStr.length + ')');

          if (typeof nikVal === 'number') {
            log.push('  [PERINGATAN] NIK tersimpan sebagai NUMBER! Bisa kehilangan leading zeros atau jadi scientific notation.');
            log.push('  [SOLUSI] Format kolom NIK sebagai "Plain text" di Google Sheets.');
          }
          if (nikStr.indexOf('E') !== -1 || nikStr.indexOf('e') !== -1) {
            log.push('  [MASALAH] NIK dalam format scientific notation! Contoh: ' + nikStr);
          }
        }
      }

      // Cek tanggal format untuk Data Absen
      if (name === 'Data Absen') {
        var tglVal = sample[0];
        log.push('  Tanggal sample: "' + tglVal + '" (type: ' + typeof tglVal + ', isDate: ' + (tglVal instanceof Date) + ')');
        if (tglVal instanceof Date) {
          log.push('  Tanggal parsed: ' + Utilities.formatDate(tglVal, 'Asia/Jayapura', 'yyyy-MM-dd'));
        }
      }

      // Cek tanggal format untuk Data Jurnal
      if (name === 'Data Jurnal') {
        var tglVal = sample[1]; // kolom B = index 1
        log.push('  Tanggal sample: "' + tglVal + '" (type: ' + typeof tglVal + ', isDate: ' + (tglVal instanceof Date) + ')');
      }
    }

    log.push('');
  }

  // 3. Cek sheet dobel yang mungkin ada
  log.push('--- CEK SHEET DOBEL ---');
  var suspects = ['Absensi', 'absensi', 'Absen', 'Izin & Cuti', 'Izin', 'Cuti',
                  'Laporan Otomatis', 'Jurnal Harian', 'Jurnal', 'Data Absensi',
                  'data absen', 'data jurnal', 'data izin'];
  var foundDobel = [];
  for (var d = 0; d < suspects.length; d++) {
    var dobelSheet = ss.getSheetByName(suspects[d]);
    if (dobelSheet) {
      foundDobel.push('"' + suspects[d] + '" (' + dobelSheet.getLastRow() + ' baris)');
    }
  }
  if (foundDobel.length > 0) {
    log.push('[PERINGATAN] Sheet dobel ditemukan: ' + foundDobel.join(', '));
    log.push('Sheet ini TIDAK terhubung ke Code.gs dan datanya tidak akan tampil di aplikasi.');
    log.push('Pindahkan data ke sheet yang benar, lalu hapus sheet dobel.');
  } else {
    log.push('[OK] Tidak ada sheet dobel yang terdeteksi.');
  }
  log.push('');

  // 4. Cek CONFIG
  log.push('--- CEK CONFIG ---');
  log.push('FOLDER_JURNAL_ID: ' + (CONFIG.FOLDER_JURNAL_ID || '(KOSONG — upload jurnal akan gagal!)'));
  log.push('EMAIL_PPK: ' + (CONFIG.EMAIL_PPK || '(KOSONG — kirim laporan tidak akan bekerja)'));
  log.push('ADMIN_EMAILS: ' + JSON.stringify(CONFIG.ADMIN_EMAILS));
  log.push('ADMIN_PIN_HASH set: ' + (CONFIG.ADMIN_PIN_HASH ? 'Ya' : 'Tidak'));

  // Output
  var result = log.join('\n');
  Logger.log(result);

  try {
    SpreadsheetApp.getUi().alert(result);
  } catch (e) {
    // Jika dijalankan bukan dari editor
  }

  return result;
}


/**
 * SETUP HEADERS — Jalankan SEKALI untuk memastikan semua sheet punya header yang benar.
 * PENTING: Ini HANYA menambahkan header jika sheet kosong atau baris 1 belum ada header.
 * Data yang sudah ada TIDAK akan dihapus.
 */
function setupAllHeaders() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var log = [];

  var sheetsConfig = {
    'Data PJLP': ['NIK','Nama','Jabatan','Unit','PIN_Hash','Status Aktif','Sisa Cuti','Token','Token Expire'],
    'Data Absen': ['Tanggal','NIK','Nama','Jabatan','Jam Masuk','Lat Masuk','Lng Masuk','Lokasi Masuk Valid','Jam Pulang','Lat Pulang','Lng Pulang','Lokasi Pulang Valid','Status','Jam Kerja','Keterangan'],
    'Data Izin': ['Tgl Pengajuan','NIK','Nama','Jenis','Tgl Mulai','Tgl Selesai','Jumlah Hari','Alasan','Lampiran','Status Approval','Catatan'],
    'Data Jurnal': ['ID','Tanggal','Waktu','NIK','Nama','Jabatan','Kegiatan','Kategori','Deskripsi','Foto URL','Foto Lat','Foto Lng','Foto Lokasi Valid','Dokumen URL','Nama File','Status Verifikasi','Catatan Admin','Thumbnail URL'],
    'Log Aktivitas': ['Waktu','NIK','Aksi','Detail'],
    'Rekap Bulanan': ['Bulan','Tahun','Nama','Jabatan','Hadir','Terlambat','Izin','Sakit','Cuti','Alfa','Total Hari Kerja','Persentase'],
    'Laporan': ['Timestamp','Jenis','Periode','Status'],
    'Data Keluaran': ['NIK','Nama','Jabatan','Nomor SPK','Item Keluaran'],
  };

  for (var name in sheetsConfig) {
    var sheet = ss.getSheetByName(name);
    var headers = sheetsConfig[name];

    // Buat sheet jika belum ada
    if (!sheet) {
      sheet = ss.insertSheet(name);
      log.push('Sheet "' + name + '" dibuat.');
    }

    // Cek apakah baris 1 sudah ada header
    var lastRow = sheet.getLastRow();
    if (lastRow === 0) {
      // Sheet kosong — tambahkan header
      sheet.getRange(1, 1, 1, headers.length).setValues([headers])
        .setFontWeight('bold')
        .setBackground('#4472C4')
        .setFontColor('#FFFFFF');
      sheet.setFrozenRows(1);
      log.push('Header untuk "' + name + '" ditambahkan (' + headers.length + ' kolom).');
    } else {
      // Cek header existing
      var existing = sheet.getRange(1, 1, 1, Math.min(sheet.getLastColumn(), headers.length)).getValues()[0];
      var firstVal = String(existing[0]).trim();

      // Jika baris 1 terlihat seperti data (bukan header), sisipkan baris header di atas
      var isHeader = false;
      for (var h = 0; h < headers.length; h++) {
        if (String(existing[h]).trim().toLowerCase() === headers[h].toLowerCase()) {
          isHeader = true;
          break;
        }
      }

      if (!isHeader && firstVal && (/^\d/.test(firstVal) || /^\d{4}-/.test(firstVal))) {
        // Baris 1 adalah data, bukan header — sisipkan header
        sheet.insertRowBefore(1);
        sheet.getRange(1, 1, 1, headers.length).setValues([headers])
          .setFontWeight('bold')
          .setBackground('#4472C4')
          .setFontColor('#FFFFFF');
        sheet.setFrozenRows(1);
        log.push('[FIX] "' + name + '" — Header disisipkan (baris 1 berisi data, bukan header).');
      } else if (isHeader) {
        // Update header jika kolom kurang
        if (sheet.getLastColumn() < headers.length) {
          sheet.getRange(1, 1, 1, headers.length).setValues([headers])
            .setFontWeight('bold')
            .setBackground('#4472C4')
            .setFontColor('#FFFFFF');
          log.push('[FIX] "' + name + '" — Header dilengkapi (kolom kurang).');
        } else {
          log.push('[OK] "' + name + '" — Header sudah benar.');
        }
      } else {
        log.push('[OK] "' + name + '" — Header sudah ada.');
      }
    }

    // Format kolom NIK sebagai plain text (cegah scientific notation)
    if (name === 'Data PJLP' && lastRow > 1) {
      sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).setNumberFormat('@');
      log.push('  Kolom NIK "' + name + '" diformat sebagai plain text.');
    }
    if ((name === 'Data Absen' || name === 'Data Izin') && lastRow > 1) {
      sheet.getRange(2, 2, sheet.getLastRow() - 1, 1).setNumberFormat('@');
      log.push('  Kolom NIK "' + name + '" diformat sebagai plain text.');
    }
    if (name === 'Data Jurnal' && lastRow > 1) {
      sheet.getRange(2, 4, sheet.getLastRow() - 1, 1).setNumberFormat('@');
      log.push('  Kolom NIK "' + name + '" diformat sebagai plain text.');
    }
  }

  var result = 'SETUP HEADERS SELESAI\n\n' + log.join('\n');
  Logger.log(result);
  try {
    SpreadsheetApp.getUi().alert(result);
  } catch(e) {}
  return result;
}
