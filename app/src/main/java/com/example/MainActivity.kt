package com.example

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.example.ui.CourseTab
import com.example.ui.GolfViewModel
import com.example.ui.HistoryTab
import com.example.ui.ScoreTab
import com.example.ui.theme.MyApplicationTheme
import com.example.utils.JsonUtils

class MainActivity : ComponentActivity() {
    private val viewModel: GolfViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            MyApplicationTheme {
                GolfApp(viewModel)
            }
        }
    }
}

enum class NavigationTab(val title: String, val iconText: String) {
    SCORE("Add Score", "📝"),
    COURSE("Course Info", "🗺️"),
    HISTORY("History & Photos", "📸")
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun GolfApp(viewModel: GolfViewModel) {
    var activeTab by remember { mutableStateOf(NavigationTab.SCORE) }
    
    val courses by viewModel.allCourses.collectAsStateWithLifecycle()
    val scores by viewModel.allScores.collectAsStateWithLifecycle()

    Scaffold(
        modifier = Modifier.fillMaxSize(),
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("⛳ Couple's Golf Diary", fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onPrimary)
                        Text("Recording & remembering moments on the field together", fontSize = 12.sp, color = MaterialTheme.colorScheme.onPrimary.copy(alpha = 0.8f))
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.primary)
            )
        },
        bottomBar = {
            NavigationBar(containerColor = MaterialTheme.colorScheme.surface) {
                NavigationTab.entries.forEach { tab ->
                    NavigationBarItem(
                        selected = activeTab == tab,
                        onClick = { activeTab = tab },
                        icon = { Text(tab.iconText, fontSize = 24.sp) },
                        label = { Text(tab.title, fontSize = 10.sp, fontWeight = if (activeTab == tab) FontWeight.Bold else FontWeight.Normal) },
                        colors = NavigationBarItemDefaults.colors(
                            selectedIconColor = MaterialTheme.colorScheme.primary,
                            selectedTextColor = MaterialTheme.colorScheme.primary,
                            unselectedIconColor = Color.Gray,
                            unselectedTextColor = Color.Gray,
                            indicatorColor = MaterialTheme.colorScheme.primaryContainer
                        )
                    )
                }
            }
        }
    ) { innerPadding ->
        Box(
            modifier = Modifier
                .padding(innerPadding)
                .fillMaxSize()
                .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f))
        ) {
            when (activeTab) {
                NavigationTab.SCORE -> ScoreTab(
                    courses = courses,
                    onSaveScore = { courseId, courseName, date, holesJson ->
                        viewModel.addScore(courseId, courseName, date, holesJson, "[]")
                    },
                    onAddCourseAndSave = { newCourseName, date, holesJson ->
                        viewModel.addCourse(
                            name = newCourseName,
                            address = "Unknown Address",
                            totalPar = 72,
                            ladyRating = 72.0,
                            ladySlope = 113,
                            blueRating = 72.0,
                            blueSlope = 113,
                            lat = 37.5665,
                            lng = 126.9780
                        ) { newCourseId ->
                            viewModel.addScore(newCourseId, newCourseName, date, holesJson, "[]")
                        }
                    }
                )
                NavigationTab.COURSE -> CourseTab(
                    courses = courses,
                    scores = scores,
                    onAddCourse = { name, address, totalPar, ladyRating, ladySlope, blueRating, blueSlope, lat, lng, holeParsJson ->
                        viewModel.addCourse(name, address, totalPar, ladyRating, ladySlope, blueRating, blueSlope, lat, lng, holeParsJson)
                    }
                )
                NavigationTab.HISTORY -> HistoryTab(
                    scores = scores,
                    onAddPhoto = { score, newPhotoUri ->
                        val currentPhotos = JsonUtils.parseStringList(score.photosJson).toMutableList()
                        currentPhotos.add(newPhotoUri)
                        val newPhotosJson = JsonUtils.stringListAdapter.toJson(currentPhotos)
                        viewModel.updateScorePhotos(score, newPhotosJson)
                    }
                )
            }
        }
    }
}
