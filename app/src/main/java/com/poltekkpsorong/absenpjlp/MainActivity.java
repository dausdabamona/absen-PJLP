package com.poltekkpsorong.absenpjlp;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.AlertDialog;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Log;
import android.view.View;
import android.webkit.CookieManager;
import android.webkit.GeolocationPermissions;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;

import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.core.content.FileProvider;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;

import java.io.File;
import java.io.IOException;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Locale;

/**
 * MainActivity — WebView wrapper untuk Absen PJLP 2026
 * Politeknik Kelautan dan Perikanan Sorong
 *
 * Fitur:
 * - WebView dengan JavaScript enabled
 * - GPS geolocation untuk absensi
 * - Kamera + file upload untuk jurnal harian
 * - Pull-to-refresh
 * - Offline detection + halaman error
 * - Back button handling
 * - Loading progress bar
 */
public class MainActivity extends AppCompatActivity {

    private static final String TAG = "AbsenPJLP";

    // ╔══════════════════════════════════════════════════════════════╗
    // ║  GANTI URL INI DENGAN URL DEPLOYMENT GAS ANDA              ║
    // ╚══════════════════════════════════════════════════════════════╝
    private static final String WEB_APP_URL =
            "https://script.google.com/macros/s/AKfycbxbx7H1G-TNRSMYkubD758caApYS1-I7q7mrU29hUtvF51xrsK4Ae0stBtRSZ_fi6cTrQ/exec";

    private static final String ADMIN_URL = WEB_APP_URL + "?page=admin";

    // Permission request codes
    private static final int PERMISSION_REQUEST_ALL = 100;

    // UI Components
    private WebView webView;
    private ProgressBar progressBar;
    private SwipeRefreshLayout swipeRefresh;
    private LinearLayout offlineLayout;
    private LinearLayout loadingLayout;

    // File upload
    private ValueCallback<Uri[]> fileUploadCallback;
    private Uri cameraPhotoUri;

    // State
    private boolean isOffline = false;
    private String pendingUrl = null;

    // ==================== FILE CHOOSER LAUNCHER ====================
    private final ActivityResultLauncher<Intent> fileChooserLauncher =
            registerForActivityResult(new ActivityResultContracts.StartActivityForResult(), result -> {
                if (fileUploadCallback == null) return;

                Uri[] results = null;
                if (result.getResultCode() == RESULT_OK && result.getData() != null) {
                    // Dari file picker
                    String dataString = result.getData().getDataString();
                    if (dataString != null) {
                        results = new Uri[]{Uri.parse(dataString)};
                    }
                } else if (result.getResultCode() == RESULT_OK && cameraPhotoUri != null) {
                    // Dari kamera
                    results = new Uri[]{cameraPhotoUri};
                }

                fileUploadCallback.onReceiveValue(results);
                fileUploadCallback = null;
            });

    // ==================== LIFECYCLE ====================

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        // Bind views
        webView = findViewById(R.id.webView);
        progressBar = findViewById(R.id.progressBar);
        swipeRefresh = findViewById(R.id.swipeRefresh);
        offlineLayout = findViewById(R.id.offlineLayout);
        loadingLayout = findViewById(R.id.loadingLayout);

        Button btnRetry = findViewById(R.id.btnRetry);
        btnRetry.setOnClickListener(v -> retryConnection());

        // Setup komponen
        requestPermissions();
        setupWebView();
        setupSwipeRefresh();
        registerNetworkCallback();

        // Load halaman
        if (isNetworkAvailable()) {
            loadWebApp();
        } else {
            showOfflinePage();
        }
    }

    // ==================== PERMISSIONS ====================

    private void requestPermissions() {
        List<String> needed = new ArrayList<>();

        if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION)
                != PackageManager.PERMISSION_GRANTED) {
            needed.add(Manifest.permission.ACCESS_FINE_LOCATION);
        }
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA)
                != PackageManager.PERMISSION_GRANTED) {
            needed.add(Manifest.permission.CAMERA);
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.READ_MEDIA_IMAGES)
                    != PackageManager.PERMISSION_GRANTED) {
                needed.add(Manifest.permission.READ_MEDIA_IMAGES);
            }
        } else if (Build.VERSION.SDK_INT <= Build.VERSION_CODES.S_V2) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.READ_EXTERNAL_STORAGE)
                    != PackageManager.PERMISSION_GRANTED) {
                needed.add(Manifest.permission.READ_EXTERNAL_STORAGE);
            }
        }

        if (!needed.isEmpty()) {
            ActivityCompat.requestPermissions(this,
                    needed.toArray(new String[0]), PERMISSION_REQUEST_ALL);
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions,
                                           @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == PERMISSION_REQUEST_ALL) {
            for (int i = 0; i < permissions.length; i++) {
                if (grantResults[i] != PackageManager.PERMISSION_GRANTED) {
                    Log.w(TAG, "Izin ditolak: " + permissions[i]);
                }
            }
        }
    }

    // ==================== WEBVIEW SETUP ====================

    @SuppressLint("SetJavaScriptEnabled")
    private void setupWebView() {
        WebSettings settings = webView.getSettings();

        // JavaScript — WAJIB untuk GAS HtmlService
        settings.setJavaScriptEnabled(true);
        settings.setJavaScriptCanOpenWindowsAutomatically(true);

        // DOM Storage & Database — untuk localStorage di frontend
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);

        // Geolocation — untuk GPS absensi
        settings.setGeolocationEnabled(true);

        // File access — untuk upload foto/dokumen
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);

        // Cache — supaya halaman load lebih cepat
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);

        // Zoom
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);

        // Viewport
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);

        // Mixed content (HTTPS + HTTP)
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);

        // User agent — tambahkan identifier app
        String ua = settings.getUserAgentString();
        settings.setUserAgentString(ua + " AbsenPJLP/1.0");

        // Cookie — penting untuk session GAS
        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, true);

        // WebViewClient — handle loading, error, navigasi
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageStarted(WebView view, String url, Bitmap favicon) {
                progressBar.setVisibility(View.VISIBLE);
                loadingLayout.setVisibility(View.GONE);
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                progressBar.setVisibility(View.GONE);
                swipeRefresh.setRefreshing(false);
                offlineLayout.setVisibility(View.GONE);
                webView.setVisibility(View.VISIBLE);
                isOffline = false;
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                // Hanya tangani error untuk halaman utama, bukan sub-resource
                if (request.isForMainFrame()) {
                    Log.e(TAG, "WebView error: " + error.getDescription());
                    showOfflinePage();
                }
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();

                // Buka link eksternal di browser bawaan
                if (!url.contains("script.google.com") && !url.contains("accounts.google.com")) {
                    Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                    startActivity(intent);
                    return true;
                }
                return false;
            }
        });

        // WebChromeClient — handle GPS permission, file upload, progress
        webView.setWebChromeClient(new WebChromeClient() {

            @Override
            public void onProgressChanged(WebView view, int newProgress) {
                progressBar.setProgress(newProgress);
                if (newProgress >= 100) {
                    progressBar.setVisibility(View.GONE);
                }
            }

            // GPS permission dari web
            @Override
            public void onGeolocationPermissionsShowPrompt(String origin,
                                                           GeolocationPermissions.Callback callback) {
                if (ContextCompat.checkSelfPermission(MainActivity.this,
                        Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED) {
                    callback.invoke(origin, true, false);
                } else {
                    callback.invoke(origin, false, false);
                    requestPermissions();
                }
            }

            // File upload (foto jurnal, dokumen)
            @Override
            public boolean onShowFileChooser(WebView webView,
                                             ValueCallback<Uri[]> callback,
                                             FileChooserParams fileChooserParams) {
                if (fileUploadCallback != null) {
                    fileUploadCallback.onReceiveValue(null);
                }
                fileUploadCallback = callback;

                String[] acceptTypes = fileChooserParams.getAcceptTypes();
                boolean isImageRequest = false;
                if (acceptTypes != null) {
                    for (String type : acceptTypes) {
                        if (type != null && type.contains("image")) {
                            isImageRequest = true;
                            break;
                        }
                    }
                }

                if (isImageRequest) {
                    // Tampilkan pilihan: Kamera atau Galeri
                    showImageSourceChooser();
                } else {
                    // File picker biasa (untuk dokumen PDF, Word, dll)
                    openFilePicker(acceptTypes);
                }
                return true;
            }
        });
    }

    // ==================== FILE UPLOAD HELPERS ====================

    private void showImageSourceChooser() {
        new AlertDialog.Builder(this)
                .setTitle("Pilih Sumber Foto")
                .setItems(new String[]{"Kamera", "Galeri"}, (dialog, which) -> {
                    if (which == 0) {
                        openCamera();
                    } else {
                        openFilePicker(new String[]{"image/*"});
                    }
                })
                .setOnCancelListener(d -> {
                    if (fileUploadCallback != null) {
                        fileUploadCallback.onReceiveValue(null);
                        fileUploadCallback = null;
                    }
                })
                .show();
    }

    private void openCamera() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA)
                != PackageManager.PERMISSION_GRANTED) {
            if (fileUploadCallback != null) {
                fileUploadCallback.onReceiveValue(null);
                fileUploadCallback = null;
            }
            requestPermissions();
            return;
        }

        try {
            File photoFile = createImageFile();
            cameraPhotoUri = FileProvider.getUriForFile(this,
                    getPackageName() + ".fileprovider", photoFile);

            Intent cameraIntent = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
            cameraIntent.putExtra(MediaStore.EXTRA_OUTPUT, cameraPhotoUri);
            fileChooserLauncher.launch(cameraIntent);
        } catch (IOException e) {
            Log.e(TAG, "Gagal buat file foto: " + e.getMessage());
            if (fileUploadCallback != null) {
                fileUploadCallback.onReceiveValue(null);
                fileUploadCallback = null;
            }
        }
    }

    private File createImageFile() throws IOException {
        String timeStamp = new SimpleDateFormat("yyyyMMdd_HHmmss", Locale.getDefault()).format(new Date());
        String fileName = "JURNAL_" + timeStamp;
        File storageDir = getExternalCacheDir();
        return File.createTempFile(fileName, ".jpg", storageDir);
    }

    private void openFilePicker(String[] acceptTypes) {
        Intent intent = new Intent(Intent.ACTION_GET_CONTENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);

        if (acceptTypes != null && acceptTypes.length > 0 && acceptTypes[0] != null && !acceptTypes[0].isEmpty()) {
            intent.setType(acceptTypes[0]);
            if (acceptTypes.length > 1) {
                intent.putExtra(Intent.EXTRA_MIME_TYPES, acceptTypes);
            }
        } else {
            intent.setType("*/*");
        }

        fileChooserLauncher.launch(Intent.createChooser(intent, "Pilih File"));
    }

    // ==================== SWIPE REFRESH ====================

    private void setupSwipeRefresh() {
        swipeRefresh.setColorSchemeColors(
                ContextCompat.getColor(this, R.color.primary),
                ContextCompat.getColor(this, R.color.primary_dark)
        );
        swipeRefresh.setOnRefreshListener(() -> {
            if (isNetworkAvailable()) {
                webView.reload();
            } else {
                swipeRefresh.setRefreshing(false);
                showOfflinePage();
            }
        });
    }

    // ==================== NETWORK ====================

    private boolean isNetworkAvailable() {
        ConnectivityManager cm = getSystemService(ConnectivityManager.class);
        if (cm == null) return false;
        Network network = cm.getActiveNetwork();
        if (network == null) return false;
        NetworkCapabilities caps = cm.getNetworkCapabilities(network);
        return caps != null && caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET);
    }

    private void registerNetworkCallback() {
        ConnectivityManager cm = getSystemService(ConnectivityManager.class);
        if (cm == null) return;

        cm.registerDefaultNetworkCallback(new ConnectivityManager.NetworkCallback() {
            @Override
            public void onAvailable(@NonNull Network network) {
                runOnUiThread(() -> {
                    if (isOffline) {
                        retryConnection();
                    }
                });
            }

            @Override
            public void onLost(@NonNull Network network) {
                runOnUiThread(() -> {
                    // Tidak langsung tampilkan offline — mungkin switch jaringan
                    Log.w(TAG, "Koneksi terputus");
                });
            }
        });
    }

    // ==================== NAVIGATION ====================

    private void loadWebApp() {
        loadingLayout.setVisibility(View.VISIBLE);
        offlineLayout.setVisibility(View.GONE);
        webView.setVisibility(View.VISIBLE);
        webView.loadUrl(WEB_APP_URL);
    }

    private void showOfflinePage() {
        isOffline = true;
        webView.setVisibility(View.GONE);
        loadingLayout.setVisibility(View.GONE);
        offlineLayout.setVisibility(View.VISIBLE);
        swipeRefresh.setRefreshing(false);
    }

    private void retryConnection() {
        if (isNetworkAvailable()) {
            offlineLayout.setVisibility(View.GONE);
            loadWebApp();
        } else {
            // Tampilkan pesan tetap offline
            TextView offlineMsg = findViewById(R.id.offlineMessage);
            offlineMsg.setText("Masih tidak ada koneksi internet.\nPeriksa WiFi atau data seluler Anda.");
        }
    }

    // ==================== BACK BUTTON ====================

    @Override
    public void onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack();
        } else {
            // Konfirmasi keluar
            new AlertDialog.Builder(this)
                    .setTitle("Keluar Aplikasi")
                    .setMessage("Yakin ingin keluar dari Absen PJLP?")
                    .setPositiveButton("Keluar", (d, w) -> finish())
                    .setNegativeButton("Batal", null)
                    .show();
        }
    }

    // ==================== CLEANUP ====================

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.destroy();
        }
        super.onDestroy();
    }
}
