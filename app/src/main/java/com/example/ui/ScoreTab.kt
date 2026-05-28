package com.example.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.CourseEntity
import com.example.data.HoleScore
import com.example.utils.JsonUtils
import java.text.SimpleDateFormat
import java.util.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ScoreTab(
    courses: List<CourseEntity>,
    onSaveScore: (courseId: Long, courseName: String, date: String, holesJson: String) -> Unit,
    onAddCourseAndSave: (newCourseName: String, date: String, holesJson: String) -> Unit,
    modifier: Modifier = Modifier
) {
    var selectedCourseId by remember { mutableStateOf<Long?>(null) }
    var isNewCourse by remember { mutableStateOf(false) }
    var newCourseName by remember { mutableStateOf("") }
    
    val defaultDate = remember { SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date()) }
    var date by remember { mutableStateOf(defaultDate) }

    val holes = remember { mutableStateListOf(*Array(18) { HoleScore(it + 1, 0, 0) }) }

    LazyColumn(
        modifier = modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            Card(
                shape = RoundedCornerShape(12.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text("📝 오늘의 스코어 입력", fontSize = 18.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(bottom = 16.dp))

                    var expanded by remember { mutableStateOf(false) }
                    ExposedDropdownMenuBox(
                        expanded = expanded,
                        onExpandedChange = { expanded = !expanded }
                    ) {
                        OutlinedTextField(
                            value = if (isNewCourse) "+ 신규 골프장 직접 입력" else courses.find { it.id == selectedCourseId }?.name ?: "선택해주세요",
                            onValueChange = {},
                            readOnly = true,
                            label = { Text("골프장 선택") },
                            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expanded) },
                            modifier = Modifier.menuAnchor().fillMaxWidth(),
                            colors = ExposedDropdownMenuDefaults.outlinedTextFieldColors()
                        )
                        ExposedDropdownMenu(
                            expanded = expanded,
                            onDismissRequest = { expanded = false }
                        ) {
                            courses.forEach { course ->
                                DropdownMenuItem(
                                    text = { Text(course.name) },
                                    onClick = {
                                        selectedCourseId = course.id
                                        isNewCourse = false
                                        expanded = false
                                    }
                                )
                            }
                            DropdownMenuItem(
                                text = { Text("+ 신규 골프장 직접 입력") },
                                onClick = {
                                    isNewCourse = true
                                    selectedCourseId = null
                                    expanded = false
                                }
                            )
                        }
                    }

                    if (isNewCourse) {
                        Spacer(modifier = Modifier.height(8.dp))
                        OutlinedTextField(
                            value = newCourseName,
                            onValueChange = { newCourseName = it },
                            label = { Text("골프장 이름 입력") },
                            modifier = Modifier.fillMaxWidth()
                        )
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    OutlinedTextField(
                        value = date,
                        onValueChange = { date = it },
                        label = { Text("플레이 날짜 (YYYY-MM-DD)") },
                        modifier = Modifier.fillMaxWidth()
                    )

                    Spacer(modifier = Modifier.height(16.dp))

                    Text("18홀 점수 기록", fontWeight = FontWeight.Bold, modifier = Modifier.padding(bottom = 8.dp))

                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .border(1.dp, MaterialTheme.colorScheme.outlineVariant, RoundedCornerShape(8.dp))
                            .background(MaterialTheme.colorScheme.surfaceVariant, RoundedCornerShape(8.dp))
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .background(MaterialTheme.colorScheme.secondaryContainer, RoundedCornerShape(topStart = 8.dp, topEnd = 8.dp))
                                .padding(8.dp)
                        ) {
                            Text("홀", modifier = Modifier.weight(1f), textAlign = TextAlign.Center, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSecondaryContainer)
                            Text("아이언", modifier = Modifier.weight(1.5f), textAlign = TextAlign.Center, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSecondaryContainer)
                            Text("퍼팅", modifier = Modifier.weight(1.5f), textAlign = TextAlign.Center, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSecondaryContainer)
                            Text("합계", modifier = Modifier.weight(1f), textAlign = TextAlign.Center, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSecondaryContainer)
                        }

                        holes.forEachIndexed { index, holeScore ->
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(8.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text("${holeScore.hole}H", modifier = Modifier.weight(1f), textAlign = TextAlign.Center, fontWeight = FontWeight.Bold)
                                
                                OutlinedTextField(
                                    value = if(holeScore.iron == 0) "" else holeScore.iron.toString(),
                                    onValueChange = { holes[index] = holeScore.copy(iron = it.toIntOrNull() ?: 0) },
                                    modifier = Modifier.weight(1.5f).padding(horizontal = 4.dp).height(50.dp),
                                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                    textStyle = LocalTextStyle.current.copy(textAlign = TextAlign.Center)
                                )
                                
                                OutlinedTextField(
                                    value = if(holeScore.putt == 0) "" else holeScore.putt.toString(),
                                    onValueChange = { holes[index] = holeScore.copy(putt = it.toIntOrNull() ?: 0) },
                                    modifier = Modifier.weight(1.5f).padding(horizontal = 4.dp).height(50.dp),
                                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                    textStyle = LocalTextStyle.current.copy(textAlign = TextAlign.Center)
                                )
                                
                                val total = holeScore.iron + holeScore.putt
                                Text(if (total > 0) total.toString() else "-", modifier = Modifier.weight(1f), textAlign = TextAlign.Center, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
                            }
                            if (index < holes.size - 1) {
                                Divider(color = MaterialTheme.colorScheme.outlineVariant)
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(24.dp))

                    Button(
                        onClick = {
                            val holesJson = JsonUtils.holeScoreListAdapter.toJson(holes.toList())
                            if (isNewCourse && newCourseName.isNotBlank()) {
                                onAddCourseAndSave(newCourseName, date, holesJson)
                                // Reset
                                newCourseName = ""
                                isNewCourse = false
                                date = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date())
                                holes.forEachIndexed { i, _ -> holes[i] = HoleScore(i+1, 0, 0) }
                            } else if (selectedCourseId != null) {
                                val cName = courses.find { it.id == selectedCourseId }?.name ?: ""
                                onSaveScore(selectedCourseId!!, cName, date, holesJson)
                                // Reset
                                selectedCourseId = null
                                date = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date())
                                holes.forEachIndexed { i, _ -> holes[i] = HoleScore(i+1, 0, 0) }
                            }
                        },
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text("기록 저장하기", fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}
