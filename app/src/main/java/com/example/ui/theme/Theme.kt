package com.example.ui.theme

import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.platform.LocalContext

import androidx.compose.ui.graphics.Color

private val DarkColorScheme =
  darkColorScheme(
    primary = Color(0xFFA8DFB9),
    secondary = Color(0xFFBACBC0),
    tertiary = Color(0xFF9CCCB0),
    background = Color(0xFF191C1A),
    surface = Color(0xFF222623)
  )

private val LightColorScheme =
  lightColorScheme(
    primary = Color(0xFF107C41),          // Beautiful Bright Emerald Golf Green
    onPrimary = Color(0xFFFFFFFF),
    primaryContainer = Color(0xFFD0ECD8), // Delightful soft green highlight
    onPrimaryContainer = Color(0xFF00220B),
    secondary = Color(0xFF3B6E46),
    onSecondary = Color(0xFFFFFFFF),
    background = Color(0xFFF6FBF7),       // Crisp light green-tinted background
    onBackground = Color(0xFF191C1A),
    surface = Color(0xFFFFFFFF),          // Pure White for Cards & Surface Fields
    onSurface = Color(0xFF191C1A),
    surfaceVariant = Color(0xFFEDF3EE),   // Soft grey-green borders/fields
    onSurfaceVariant = Color(0xFF404941),
    outline = Color(0xFF707971),
    outlineVariant = Color(0xFFBFC9BE)
  )

@Composable
fun MyApplicationTheme(
  darkTheme: Boolean = false,              // Default to false for bright clean theme
  dynamicColor: Boolean = false,           // Default to false to bypass system color override
  content: @Composable () -> Unit,
) {
  val colorScheme =
    when {
      dynamicColor && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S -> {
        val context = LocalContext.current
        if (darkTheme) dynamicDarkColorScheme(context) else dynamicLightColorScheme(context)
      }

      darkTheme -> DarkColorScheme
      else -> LightColorScheme
    }

  MaterialTheme(colorScheme = colorScheme, typography = Typography, content = content)
}
