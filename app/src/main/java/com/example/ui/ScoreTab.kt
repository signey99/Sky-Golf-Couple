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

    val holes = remember { mutableStateListOf(*Array(18) { HoleScore(it + 1, 0, 0, 0, 0) }) }

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
                    Text("📝 Enter Today's Score", fontSize = 18.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(bottom = 16.dp))

                    var expanded by remember { mutableStateOf(false) }
                    ExposedDropdownMenuBox(
                        expanded = expanded,
                        onExpandedChange = { expanded = !expanded }
                    ) {
                        OutlinedTextField(
                            value = if (isNewCourse) "+ Add New Golf Course" else courses.find { it.id == selectedCourseId }?.name ?: "Select a Golf Course",
                            onValueChange = {},
                            readOnly = true,
                            label = { Text("Golf Course") },
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
                                text = { Text("+ Add New Golf Course") },
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
                            label = { Text("Enter Golf Course Name") },
                            modifier = Modifier.fillMaxWidth()
                        )
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    OutlinedTextField(
                        value = date,
                        onValueChange = { date = it },
                        label = { Text("Play Date (YYYY-MM-DD)") },
                        modifier = Modifier.fillMaxWidth()
                    )

                    Spacer(modifier = Modifier.height(16.dp))

                    Text("18-Hole Scores (Couple Play)", fontWeight = FontWeight.Bold, modifier = Modifier.padding(bottom = 8.dp))

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
                                .padding(vertical = 6.dp, horizontal = 8.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text("Hole", modifier = Modifier.weight(0.8f), textAlign = TextAlign.Center, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSecondaryContainer, fontSize = 11.sp)
                            
                            // Player 1 Header Group
                            Row(modifier = Modifier.weight(3f), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text("P1 Strk", modifier = Modifier.weight(1.2f), textAlign = TextAlign.Center, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSecondaryContainer, fontSize = 11.sp)
                                Text("P1 Putt", modifier = Modifier.weight(1.2f), textAlign = TextAlign.Center, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSecondaryContainer, fontSize = 11.sp)
                                Text("P1 Tot", modifier = Modifier.weight(0.8f), textAlign = TextAlign.Center, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSecondaryContainer, fontSize = 11.sp)
                            }
                            
                            Box(modifier = Modifier.width(1.dp).height(12.dp).background(MaterialTheme.colorScheme.onSecondaryContainer.copy(alpha = 0.3f)))

                            // Player 2 Header Group
                            Row(modifier = Modifier.weight(3f), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text("P2 Strk", modifier = Modifier.weight(1.2f), textAlign = TextAlign.Center, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSecondaryContainer, fontSize = 11.sp)
                                Text("P2 Putt", modifier = Modifier.weight(1.2f), textAlign = TextAlign.Center, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSecondaryContainer, fontSize = 11.sp)
                                Text("P2 Tot", modifier = Modifier.weight(0.8f), textAlign = TextAlign.Center, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSecondaryContainer, fontSize = 11.sp)
                            }
                        }

                        holes.forEachIndexed { index, holeScore ->
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 6.dp, horizontal = 4.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text("${holeScore.hole}H", modifier = Modifier.weight(0.8f), textAlign = TextAlign.Center, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                                
                                // Player 1 score input fields
                                Row(
                                    modifier = Modifier.weight(3f),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(2.dp)
                                ) {
                                    OutlinedTextField(
                                        value = if(holeScore.iron == 0) "" else holeScore.iron.toString(),
                                        onValueChange = { newValue -> holes[index] = holeScore.copy(iron = newValue.toIntOrNull() ?: 0) },
                                        modifier = Modifier.weight(1.2f).height(46.dp),
                                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                        textStyle = LocalTextStyle.current.copy(textAlign = TextAlign.Center, fontSize = 12.sp)
                                    )
                                    OutlinedTextField(
                                        value = if(holeScore.putt == 0) "" else holeScore.putt.toString(),
                                        onValueChange = { newValue -> holes[index] = holeScore.copy(putt = newValue.toIntOrNull() ?: 0) },
                                        modifier = Modifier.weight(1.2f).height(46.dp),
                                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                        textStyle = LocalTextStyle.current.copy(textAlign = TextAlign.Center, fontSize = 12.sp)
                                    )
                                    val totalP1 = holeScore.iron + holeScore.putt
                                    Text(
                                        text = if (totalP1 > 0) totalP1.toString() else "-",
                                        modifier = Modifier.weight(0.8f),
                                        textAlign = TextAlign.Center,
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 12.sp,
                                        color = MaterialTheme.colorScheme.primary
                                    )
                                }
                                
                                Box(modifier = Modifier.width(1.dp).height(24.dp).background(MaterialTheme.colorScheme.outlineVariant))

                                // Player 2 score input fields
                                Row(
                                    modifier = Modifier.weight(3f),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(2.dp)
                                ) {
                                    OutlinedTextField(
                                        value = if(holeScore.iron2 == 0) "" else holeScore.iron2.toString(),
                                        onValueChange = { newValue -> holes[index] = holeScore.copy(iron2 = newValue.toIntOrNull() ?: 0) },
                                        modifier = Modifier.weight(1.2f).height(46.dp),
                                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                        textStyle = LocalTextStyle.current.copy(textAlign = TextAlign.Center, fontSize = 12.sp)
                                    )
                                    OutlinedTextField(
                                        value = if(holeScore.putt2 == 0) "" else holeScore.putt2.toString(),
                                        onValueChange = { newValue -> holes[index] = holeScore.copy(putt2 = newValue.toIntOrNull() ?: 0) },
                                        modifier = Modifier.weight(1.2f).height(46.dp),
                                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                        textStyle = LocalTextStyle.current.copy(textAlign = TextAlign.Center, fontSize = 12.sp)
                                    )
                                    val totalP2 = holeScore.iron2 + holeScore.putt2
                                    Text(
                                        text = if (totalP2 > 0) totalP2.toString() else "-",
                                        modifier = Modifier.weight(0.8f),
                                        textAlign = TextAlign.Center,
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 12.sp,
                                        color = MaterialTheme.colorScheme.secondary
                                    )
                                }
                            }
                            if (index < holes.size - 1) {
                                HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
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
                                holes.forEachIndexed { i, _ -> holes[i] = HoleScore(i+1, 0, 0, 0, 0) }
                            } else if (selectedCourseId != null) {
                                val cName = courses.find { it.id == selectedCourseId }?.name ?: ""
                                onSaveScore(selectedCourseId!!, cName, date, holesJson)
                                // Reset
                                selectedCourseId = null
                                date = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date())
                                holes.forEachIndexed { i, _ -> holes[i] = HoleScore(i+1, 0, 0, 0, 0) }
                            }
                        },
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text("Save Record", fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}
