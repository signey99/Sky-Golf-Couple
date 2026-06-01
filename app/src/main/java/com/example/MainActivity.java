package com.example;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.CookieManager;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import androidx.appcompat.app.AppCompatActivity;
import androidx.activity.OnBackPressedCallback;

public class MainActivity extends AppCompatActivity {
    private static final int FILE_CHOOSER_RESULT_CODE = 1;
    private ValueCallback<Uri[]> uploadMessage;
    private WebView webView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        try {
            // Pre-create WebView cache directories to prevent Chromium opendir errors on startup
            ensureCacheDirs();

            // Set up a container
            FrameLayout container = new FrameLayout(this);
            container.setLayoutParams(new FrameLayout.LayoutParams(
                    FrameLayout.LayoutParams.MATCH_PARENT,
                    FrameLayout.LayoutParams.MATCH_PARENT
            ));

            // Setup WebView
            webView = new WebView(this);
            webView.setLayoutParams(new FrameLayout.LayoutParams(
                    FrameLayout.LayoutParams.MATCH_PARENT,
                    FrameLayout.LayoutParams.MATCH_PARENT
            ));

            // Enable JavaScript and storage capabilities
            WebSettings settings = webView.getSettings();
            settings.setJavaScriptEnabled(true);
            settings.setDomStorageEnabled(true);
            settings.setDatabaseEnabled(true);
            settings.setAllowFileAccess(true);
            settings.setAllowContentAccess(true);
            settings.setAllowFileAccessFromFileURLs(true);
            settings.setAllowUniversalAccessFromFileURLs(true);
            
            // Support modern rendering/viewports
            settings.setUseWideViewPort(true);
            settings.setLoadWithOverviewMode(true);
            settings.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);
            
            // CRITICAL: Handle security cookies and cross-site cookies needed by development and OAuth servers
            CookieManager cookieManager = CookieManager.getInstance();
            cookieManager.setAcceptCookie(true);
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.LOLLIPOP) {
                cookieManager.setAcceptThirdPartyCookies(webView, true);
            }

            // Web client handling
            webView.setWebViewClient(new WebViewClient() {
                @Override
                public boolean shouldOverrideUrlLoading(WebView view, String url) {
                    // Return false so WebView handles the navigation itself.
                    // This preserves session-state, POST request bodies, and cookie handshakes correctly!
                    return false;
                }

                @Override
                public void onPageStarted(WebView view, String url, android.graphics.Bitmap favicon) {
                    super.onPageStarted(view, url, favicon);
                    if (!isFinishing() && !isDestroyed()) {
                        ensureCacheDirs();
                    }
                }

                @Override
                public void onPageFinished(WebView view, String url) {
                    super.onPageFinished(view, url);
                    if (!isFinishing() && !isDestroyed()) {
                        ensureCacheDirs();
                    }
                    // Also run a delayed check to make sure any lazily initialized background tasks
                    // find the directories ready!
                    view.postDelayed(new Runnable() {
                        @Override
                        public void run() {
                            if (!isFinishing() && !isDestroyed()) {
                                ensureCacheDirs();
                            }
                        }
                    }, 1000);
                }
            });

            // Chrome client for file upload, audio/geolocation permissions, and console logs
            webView.setWebChromeClient(new WebChromeClient() {
                @Override
                public void onPermissionRequest(PermissionRequest request) {
                    try {
                        request.grant(request.getResources());
                    } catch (Throwable t) {
                        t.printStackTrace();
                    }
                }

                @Override
                public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> filePathCallback, FileChooserParams fileChooserParams) {
                    if (uploadMessage != null) {
                        uploadMessage.onReceiveValue(null);
                    }
                    uploadMessage = filePathCallback;

                    Intent intent = fileChooserParams.createIntent();
                    try {
                        startActivityForResult(intent, FILE_CHOOSER_RESULT_CODE);
                    } catch (Exception e) {
                        uploadMessage = null;
                        return false;
                    }
                    return true;
                }

                @Override
                public boolean onConsoleMessage(android.webkit.ConsoleMessage consoleMessage) {
                    android.util.Log.d("WebViewJS", consoleMessage.message() + " -- From line "
                            + consoleMessage.lineNumber() + " of "
                            + consoleMessage.sourceId());
                    return true;
                }
            });

            // Register modern back presses callback
            getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
                @Override
                public void handleOnBackPressed() {
                    if (webView != null && webView.canGoBack()) {
                        webView.goBack();
                    } else {
                        setEnabled(false);
                        getOnBackPressedDispatcher().onBackPressed();
                    }
                }
            });

            // Load the locally bundled React application from assets (100% offline & local)
            webView.loadUrl("file:///android_asset/index.html");

            container.addView(webView);
            setContentView(container);

        } catch (Throwable e) {
            // Fallback screen in case WebView fails to initialize
            android.widget.ScrollView scrollView = new android.widget.ScrollView(this);
            android.widget.TextView textView = new android.widget.TextView(this);
            textView.setTextSize(14);
            textView.setPadding(32, 32, 32, 32);
            textView.setTextColor(0xFFFF0000); // Red
            java.io.StringWriter sw = new java.io.StringWriter();
            e.printStackTrace(new java.io.PrintWriter(sw));
            textView.setText("WebView initialization failed:\n\n" + sw.toString());
            scrollView.addView(textView);
            setContentView(scrollView);
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == FILE_CHOOSER_RESULT_CODE) {
            if (uploadMessage == null) return;
            Uri[] result = null;
            try {
                result = WebChromeClient.FileChooserParams.parseResult(resultCode, data);
            } catch (Exception e) {
                // fallback
            }
            uploadMessage.onReceiveValue(result);
            uploadMessage = null;
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (webView != null) {
            webView.onResume();
        }
    }

    @Override
    protected void onPause() {
        super.onPause();
        if (webView != null) {
            webView.onPause();
        }
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            try {
                webView.stopLoading();
                webView.clearHistory();
                webView.loadUrl("about:blank");
            } catch (Throwable ignored) {}
            android.view.ViewParent parent = webView.getParent();
            if (parent instanceof android.view.ViewGroup) {
                ((android.view.ViewGroup) parent).removeView(webView);
            }
            try {
                webView.destroy();
            } catch (Throwable ignored) {}
            webView = null;
        }
        super.onDestroy();
    }

    /**
     * Pre-creates WebView caching directories to prevent harmless but annoying 
     * Chromium simple_file_enumerator E/chromium logging warnings on startup and run.
     */
    private void ensureCacheDirs() {
        try {
            java.io.File cacheDir = getCacheDir();
            if (cacheDir != null) {
                // Ensure HTTP Cache directories and add a persistent dummy file
                java.io.File httpJs = new java.io.File(cacheDir, "WebView/Default/HTTP Cache/Code Cache/js");
                java.io.File httpWasm = new java.io.File(cacheDir, "WebView/Default/HTTP Cache/Code Cache/wasm");
                
                httpJs.mkdirs();
                httpWasm.mkdirs();
                
                try {
                    new java.io.File(httpJs, ".keep").createNewFile();
                    new java.io.File(httpWasm, ".keep").createNewFile();
                } catch (Exception ignored) {}

                // Ensure standard Code Cache directories and add a persistent dummy file
                java.io.File codeJs = new java.io.File(cacheDir, "WebView/Default/Code Cache/js");
                java.io.File codeWasm = new java.io.File(cacheDir, "WebView/Default/Code Cache/wasm");
                
                codeJs.mkdirs();
                codeWasm.mkdirs();
                
                try {
                    new java.io.File(codeJs, ".keep").createNewFile();
                    new java.io.File(codeWasm, ".keep").createNewFile();
                } catch (Exception ignored) {}
            }
        } catch (Throwable t) {
            t.printStackTrace();
        }
    }
}
