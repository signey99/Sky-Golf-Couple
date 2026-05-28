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
    onAddCourse: (name: String, lat: Double, lng: Double, handicap: Double, slope: Int) -> Unit,
    modifier: Modifier = Modifier
) {
    var newCourseName by remember { mutableStateOf("") }
    var lat by remember { mutableStateOf("33.450701") }
    var lng by remember { mutableStateOf("126.570667") }
    var handicap by remember { mutableStateOf("") }
    var slope by remember { mutableStateOf("") }

    // Mock map coordinates
    var clickedLat by remember { mutableStateOf("33.4507") }
    var clickedLng by remember { mutableStateOf("126.5707") }

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
                    Text("🗺️ 골프장 위치 및 코스 등록", fontSize = 18.sp, fontWeight = FontWeight.Bold)
                    Text("지도의 영역을 클릭하여 위경도를 모의로 입력할 수 있습니다.", fontSize = 12.sp, color = Color.Gray, modifier = Modifier.padding(bottom = 12.dp))

                    // Mock Map
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(150.dp)
                            .background(MaterialTheme.colorScheme.secondaryContainer, RoundedCornerShape(8.dp))
                            .clickable {
                                // Simulate click resulting in updated coordinates
                                val randomOffsetLat = (Math.random() * 0.1).toFloat()
                                val randomOffsetLng = (Math.random() * 0.1).toFloat()
                                clickedLat = "%.4f".format(33.45f + randomOffsetLat)
                                clickedLng = "%.4f".format(126.57f + randomOffsetLng)
                                lat = clickedLat
                                lng = clickedLng
                            },
                        contentAlignment = Alignment.Center
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text("\uD83D\uDCCD 위도: $clickedLat, 경도: $clickedLng", 
                                fontSize = 12.sp, 
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.onSecondaryContainer,
                                modifier = Modifier.background(MaterialTheme.colorScheme.surface, RoundedCornerShape(16.dp)).padding(horizontal = 8.dp, vertical = 4.dp))
                            Text("지도를 클릭하면 해당 위치가 입력됩니다.", fontSize = 10.sp, color = MaterialTheme.colorScheme.onSecondaryContainer.copy(alpha=0.7f), modifier = Modifier.padding(top=8.dp))
                        }
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    OutlinedTextField(
                        value = newCourseName,
                        onValueChange = { newCourseName = it },
                        label = { Text("골프장 이름") },
                        placeholder = { Text("예: 나인브릿지 CC") },
                        modifier = Modifier.fillMaxWidth()
                    )

                    Spacer(modifier = Modifier.height(8.dp))

                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        OutlinedTextField(
                            value = handicap,
                            onValueChange = { handicap = it },
                            label = { Text("총 코스 레이팅(핸디)") },
                            placeholder = { Text("예: 72.0") },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            modifier = Modifier.weight(1f)
                        )
                        OutlinedTextField(
                            value = slope,
                            onValueChange = { slope = it },
                            label = { Text("슬로프(Slope)") },
                            placeholder = { Text("예: 113") },
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
                                    lat.toDoubleOrNull() ?: 33.45,
                                    lng.toDoubleOrNull() ?: 126.57,
                                    handicap.toDoubleOrNull() ?: 72.0,
                                    slope.toIntOrNull() ?: 113
                                )
                                newCourseName = ""
                                handicap = ""
                                slope = ""
                            }
                        },
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text("코스 등록", fontWeight = FontWeight.Bold)
                    }
                }
            }
        }

        item {
            Text("⛳ 등록된 코스 리스트 & 나의 경기 결과", fontSize = 16.sp, fontWeight = FontWeight.Bold)
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
                Column {
                    Text(course.name, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                    Text("위치: ${course.lat}, ${course.lng}", fontSize = 10.sp, color = Color.Gray)
                }
                Column(horizontalAlignment = Alignment.End, modifier = Modifier.background(MaterialTheme.colorScheme.secondaryContainer, RoundedCornerShape(4.dp)).padding(horizontal = 8.dp, vertical = 2.dp)) {
                    Text("HC: ${course.handicap}", fontWeight = FontWeight.Bold, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSecondaryContainer)
                    Text("Slope: ${course.slope}", fontSize = 10.sp, color = MaterialTheme.colorScheme.onSecondaryContainer)
                }
            }

            Divider(modifier = Modifier.padding(vertical = 8.dp))

            Text("🎮 이 골프장에서의 경기 역사 (${scores.size}회)", fontSize = 12.sp, fontWeight = FontWeight.Bold)
            if (scores.isEmpty()) {
                Text("아직 해당 골프장의 플레이 기록이 없습니다.", fontSize = 12.sp, color = Color.Gray, modifier = Modifier.padding(top = 4.dp))
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
                        Text("총 ${totalStrokes}타 (퍼팅 ${totalPutts}개)", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}
