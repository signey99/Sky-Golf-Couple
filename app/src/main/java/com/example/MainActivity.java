package com.example;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;

public class MainActivity extends Activity {
    private static final int FILE_CHOOSER_RESULT_CODE = 1;
    private ValueCallback<Uri[]> uploadMessage;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        try {
            super.onCreate(savedInstanceState);

            Thread.setDefaultUncaughtExceptionHandler(new Thread.UncaughtExceptionHandler() {
                @Override
                public void uncaughtException(Thread t, final Throwable e) {
                    runOnUiThread(new Runnable() {
                        @Override
                        public void run() {
                            try {
                                android.widget.ScrollView scrollView = new android.widget.ScrollView(MainActivity.this);
                                android.widget.TextView textView = new android.widget.TextView(MainActivity.this);
                                textView.setTextSize(14);
                                textView.setPadding(32, 32, 32, 32);
                                textView.setTextColor(0xFFFF0000); // Red for error
                                java.io.StringWriter sw = new java.io.StringWriter();
                                e.printStackTrace(new java.io.PrintWriter(sw));
                                textView.setText("Uncaught exception in background:\n\n" + sw.toString());
                                scrollView.addView(textView);
                                setContentView(scrollView);
                            } catch (Exception ex) {
                                // ignore
                            }
                        }
                    });
                }
            });

            WebView webView = new WebView(this);
            webView.setLayoutParams(new FrameLayout.LayoutParams(
                    FrameLayout.LayoutParams.MATCH_PARENT,
                    FrameLayout.LayoutParams.MATCH_PARENT
            ));

            webView.setWebViewClient(new WebViewClient() {
                @Override
                public boolean shouldOverrideUrlLoading(WebView view, String url) {
                    view.loadUrl(url);
                    return true;
                }
            });

            webView.setWebChromeClient(new WebChromeClient() {
                @Override
                public void onPermissionRequest(PermissionRequest request) {
                    request.grant(request.getResources());
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
            });

            WebSettings settings = webView.getSettings();
            settings.setJavaScriptEnabled(true);
            settings.setDomStorageEnabled(true);
            settings.setDatabaseEnabled(true);
            settings.setAllowFileAccess(true);
            settings.setAllowContentAccess(true);
            settings.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);
            settings.setUseWideViewPort(true);
            settings.setLoadWithOverviewMode(true);

            // Load the live development URL of our React dev server with Hot Module Replacement
            webView.loadUrl("https://ais-dev-lpfbtwrkbpcoqp4k4aha5t-658932554772.us-east1.run.app");

            setContentView(webView);
        } catch (Throwable e) {
            android.widget.ScrollView scrollView = new android.widget.ScrollView(this);
            android.widget.TextView textView = new android.widget.TextView(this);
            textView.setTextSize(14);
            textView.setPadding(32, 32, 32, 32);
            textView.setTextColor(0xFFFF0000); // Red for error
            java.io.StringWriter sw = new java.io.StringWriter();
            e.printStackTrace(new java.io.PrintWriter(sw));
            textView.setText("App crash caught in onCreate:\n\n" + sw.toString());
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
}
