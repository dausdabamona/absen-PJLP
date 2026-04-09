# Absen PJLP 2026 — Android App

WebView wrapper untuk aplikasi Absen PJLP Politeknik KP Sorong.
Backend tetap menggunakan Google Apps Script (GAS).

## Fitur App
- Install sebagai aplikasi Android (.apk)
- GPS geolocation untuk validasi lokasi absen
- Kamera + upload foto untuk jurnal harian
- Upload dokumen (PDF, Word, Excel)
- Pull-to-refresh
- Deteksi offline + halaman retry
- Splash screen
- Konfirmasi keluar (back button)

## Cara Build APK

### Prasyarat
1. Install **Android Studio** (gratis): https://developer.android.com/studio
2. Saat install, pastikan centang **Android SDK** dan **Android Virtual Device**

### Langkah Build

1. **Buka project** di Android Studio:
   - File > Open > pilih folder `AbsenPJLP`
   - Tunggu Gradle sync selesai (bisa 5-10 menit pertama kali)

2. **PENTING — Ganti URL GAS**:
   - Buka file `app/src/main/java/com/poltekkpsorong/absenpjlp/MainActivity.java`
   - Cari baris:
     ```java
     private static final String WEB_APP_URL =
         "https://script.google.com/macros/s/GANTI_DENGAN_DEPLOYMENT_ID_ANDA/exec";
     ```
   - Ganti dengan URL deployment GAS Anda yang sebenarnya

3. **Build APK**:
   - Menu: Build > Build Bundle(s) / APK(s) > Build APK(s)
   - Tunggu proses selesai
   - Klik "locate" di notifikasi bawah untuk menemukan file APK

4. **Kirim APK ke HP**:
   - Copy file `app-debug.apk` ke HP via USB/WhatsApp/Google Drive
   - Di HP: buka file APK > Install (izinkan "Install dari sumber tidak dikenal")

### Build APK Release (untuk distribusi)

1. Menu: Build > Generate Signed Bundle / APK
2. Pilih APK > Next
3. Create new keystore:
   - Key store path: pilih lokasi simpan
   - Password: buat password
   - Alias: `absenpjlp`
   - Validity: 25 years
   - Isi nama organisasi: Politeknik KP Sorong
4. Next > pilih `release` > Create
5. File APK release ada di `app/release/app-release.apk`

## Ganti Logo/Ikon

1. Siapkan logo PNG (1024x1024 px, latar transparan)
2. Di Android Studio: klik kanan folder `res` > New > Image Asset
3. Pilih file logo, atur padding
4. Finish — ikon otomatis di-generate untuk semua ukuran

## Struktur Project

```
AbsenPJLP/
├── app/
│   ├── src/main/
│   │   ├── java/.../
│   │   │   ├── MainActivity.java    ← WebView + GPS + kamera
│   │   │   └── SplashActivity.java  ← Splash screen
│   │   ├── res/
│   │   │   ├── layout/activity_main.xml
│   │   │   ├── values/colors.xml, themes.xml, strings.xml
│   │   │   ├── drawable/           ← ikon & splash
│   │   │   └── xml/file_paths.xml  ← untuk FileProvider
│   │   └── AndroidManifest.xml
│   └── build.gradle
├── build.gradle
├── settings.gradle
└── README.md
```
