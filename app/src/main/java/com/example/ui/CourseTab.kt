package com.example.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.CourseEntity
import com.example.data.ScoreEntity
import com.example.utils.JsonUtils

@Composable
fun CourseTab(
    courses: List<CourseEntity>,
    scores: List<ScoreEntity>,
    onAddCourse: (
        name: String,
        address: String,
        totalPar: Int,
        ladyRating: Double,
        ladySlope: Int,
        blueRating: Double,
        blueSlope: Int,
        lat: Double,
        lng: Double
    ) -> Unit,
    modifier: Modifier = Modifier
) {
    var newCourseName by remember { mutableStateOf("") }
    var address by remember { mutableStateOf("") }
    var totalPar by remember { mutableStateOf("72") }
    
    var ladyRating by remember { mutableStateOf("") }
    var ladySlope by remember { mutableStateOf("") }
    var blueRating by remember { mutableStateOf("") }
    var blueSlope by remember { mutableStateOf("") }

    var lat by remember { mutableStateOf("33.3541") }
    var lng by remember { mutableStateOf("126.3712") }

    // Mock map coordinates
    var clickedLat by remember { mutableStateOf("33.3541") }
    var clickedLng by remember { mutableStateOf("126.3712") }

    LazyColumn(
        modifier = modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(24.dp)
    ) {
        item {
            Card(
                shape = RoundedCornerShape(12.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text("🗺️ Course Location & Registration", fontSize = 18.sp, fontWeight = FontWeight.Bold)
                    Text("Click on the map area to simulate entering custom GPS coordinates.", fontSize = 12.sp, color = Color.Gray, modifier = Modifier.padding(bottom = 12.dp))

                    // Mock Map
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(130.dp)
                            .background(MaterialTheme.colorScheme.secondaryContainer, RoundedCornerShape(8.dp))
                            .clickable {
                                // Simulate click resulting in updated coordinates
                                val randomOffsetLat = (Math.random() * 0.1)
                                val randomOffsetLng = (Math.random() * 0.1)
                                clickedLat = "%.4f".format(33.3541 + randomOffsetLat)
                                clickedLng = "%.4f".format(126.3712 + randomOffsetLng)
                                lat = clickedLat
                                lng = clickedLng
                            },
                        contentAlignment = Alignment.Center
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text("\uD83D\uDCCD Lat: $clickedLat, Lng: $clickedLng", 
                                fontSize = 12.sp, 
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.onSecondaryContainer,
                                modifier = Modifier.background(MaterialTheme.colorScheme.surface, RoundedCornerShape(16.dp)).padding(horizontal = 8.dp, vertical = 4.dp))
                            Text("Click here to simulate changing location pin", fontSize = 10.sp, color = MaterialTheme.colorScheme.onSecondaryContainer.copy(alpha=0.7f), modifier = Modifier.padding(top=8.dp))
                        }
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    OutlinedTextField(
                        value = newCourseName,
                        onValueChange = { newCourseName = it },
                        label = { Text("Golf Course Name") },
                        placeholder = { Text("e.g. Nine Bridges CC") },
                        modifier = Modifier.fillMaxWidth()
                    )

                    Spacer(modifier = Modifier.height(8.dp))

                    OutlinedTextField(
                        value = address,
                        onValueChange = { address = it },
                        label = { Text("Course Address") },
                        placeholder = { Text("e.g. Jeju Andeok-myeon, South Korea") },
                        modifier = Modifier.fillMaxWidth()
                    )

                    Spacer(modifier = Modifier.height(8.dp))

                    OutlinedTextField(
                        value = totalPar,
                        onValueChange = { totalPar = it },
                        label = { Text("Total Course Par") },
                        placeholder = { Text("e.g. 72") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        modifier = Modifier.fillMaxWidth()
                    )

                    Spacer(modifier = Modifier.height(16.dp))

                    Text("Tee Information", fontWeight = FontWeight.Bold, fontSize = 14.sp, color = MaterialTheme.colorScheme.primary)
                    Spacer(modifier = Modifier.height(8.dp))

                    // Lady Tee Form
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        OutlinedTextField(
                            value = ladyRating,
                            onValueChange = { ladyRating = it },
                            label = { Text("Lady Course Rating") },
                            placeholder = { Text("e.g. 72.1") },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            modifier = Modifier.weight(1f)
                        )
                        OutlinedTextField(
                            value = ladySlope,
                            onValueChange = { ladySlope = it },
                            label = { Text("Lady Tee Slope") },
                            placeholder = { Text("e.g. 113") },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            modifier = Modifier.weight(1f)
                        )
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    // Blue Tee Form
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        OutlinedTextField(
                            value = blueRating,
                            onValueChange = { blueRating = it },
                            label = { Text("Blue Course Rating") },
                            placeholder = { Text("e.g. 73.5") },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            modifier = Modifier.weight(1f)
                        )
                        OutlinedTextField(
                            value = blueSlope,
                            onValueChange = { blueSlope = it },
                            label = { Text("Blue Tee Slope") },
                            placeholder = { Text("e.g. 120") },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            modifier = Modifier.weight(1f)
                        )
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    Button(
                        onClick = {
                            if (newCourseName.isNotBlank()) {
                                onAddCourse(
                                    newCourseName,
                                    address,
                                    totalPar.toIntOrNull() ?: 72,
                                    ladyRating.toDoubleOrNull() ?: 72.0,
                                    ladySlope.toIntOrNull() ?: 113,
                                    blueRating.toDoubleOrNull() ?: 72.0,
                                    blueSlope.toIntOrNull() ?: 113,
                                    lat.toDoubleOrNull() ?: 33.3541,
                                    lng.toDoubleOrNull() ?: 126.3712
                                )
                                // Reset fields
                                newCourseName = ""
                                address = ""
                                totalPar = "72"
                                ladyRating = ""
                                ladySlope = ""
                                blueRating = ""
                                blueSlope = ""
                            }
                        },
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text("Register Course", fontWeight = FontWeight.Bold)
                    }
                }
            }
        }

        item {
            Text("⛳ Registered Courses & Results", fontSize = 16.sp, fontWeight = FontWeight.Bold)
        }

        items(courses) { course ->
            CourseCard(course = course, scores = scores.filter { it.courseId == course.id })
        }
    }
}

@Composable
fun CourseCard(course: CourseEntity, scores: List<ScoreEntity>) {
    Card(
        shape = RoundedCornerShape(12.dp),
        modifier = Modifier.fillMaxWidth(),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(course.name, fontWeight = FontWeight.Bold, fontSize = 18.sp, color = MaterialTheme.colorScheme.primary)
                    if (course.address.isNotBlank()) {
                        Text("Address: ${course.address}", fontSize = 12.sp, color = Color.Gray, modifier = Modifier.padding(top = 2.dp))
                    }
                    Text("GPS Pin: ${course.lat}, ${course.lng}", fontSize = 11.sp, color = Color.Gray)
                    Text("Total Par: ${course.totalPar}", fontSize = 12.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(top = 4.dp))
                }
                
                // Lady & Blue Tee info display
                Column(horizontalAlignment = Alignment.End) {
                    Box(
                        modifier = Modifier
                            .background(Color(0xFFFFEAEF), RoundedCornerShape(4.dp))
                            .padding(horizontal = 6.dp, vertical = 2.dp)
                    ) {
                        Text("Lady CR: ${course.ladyRating} (S: ${course.ladySlope})", fontSize = 10.sp, fontWeight = FontWeight.SemiBold, color = Color(0xFFC2185B))
                    }
                    Spacer(modifier = Modifier.height(4.dp))
                    Box(
                        modifier = Modifier
                            .background(Color(0xFFE3F2FD), RoundedCornerShape(4.dp))
                            .padding(horizontal = 6.dp, vertical = 2.dp)
                    ) {
                        Text("Blue CR: ${course.blueRating} (S: ${course.blueSlope})", fontSize = 10.sp, fontWeight = FontWeight.SemiBold, color = Color(0xFF1976D2))
                    }
                }
            }

            Divider(modifier = Modifier.padding(vertical = 12.dp))

            Text("🎮 Play History (${scores.size} games)", fontSize = 12.sp, fontWeight = FontWeight.Bold)
            if (scores.isEmpty()) {
                Text("No games played on this course yet.", fontSize = 12.sp, color = Color.Gray, modifier = Modifier.padding(top = 4.dp))
            } else {
                scores.forEach { score ->
                    val holes = JsonUtils.holeScoreListAdapter.fromJson(score.holesJson) ?: emptyList()
                    val totalStrokes = holes.sumOf { it.iron + it.putt }
                    val totalPutts = holes.sumOf { it.putt }
                    
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(top = 4.dp)
                            .background(MaterialTheme.colorScheme.surfaceVariant, RoundedCornerShape(4.dp))
                            .padding(8.dp),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text(score.date, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Text("${totalStrokes} Strokes (Putts: ${totalPutts})", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}
