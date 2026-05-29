package com.example.ui

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
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
    
    val defaultDate = remember { SimpleDateFormat("MM/dd/yyyy", Locale.getDefault()).format(Date()) }
    var date by remember { mutableStateOf(defaultDate) }

    val holes = remember { mutableStateListOf(*Array(18) { HoleScore(it + 1, 0, 0, 0, 0) }) }
    var activeHoleIndex by remember { mutableStateOf(0) }

    LazyColumn(
        modifier = modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // 1. Course Selection Section
        item {
            Card(
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(
                        "🏌️ Setup Golf Round",
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.padding(bottom = 12.dp)
                    )

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

                    Spacer(modifier = Modifier.height(12.dp))

                    OutlinedTextField(
                        value = date,
                        onValueChange = { date = it },
                        label = { Text("Play Date (MM/DD/YYYY)") },
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            }
        }

        // 2. Horizontally scrollable 1-18 hole selectors
        item {
            Column {
                Text(
                    text = "🎯 Select Hole to Record",
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onBackground,
                    modifier = Modifier.padding(start = 4.dp, bottom = 4.dp)
                )
                
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .horizontalScroll(rememberScrollState())
                        .padding(vertical = 4.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    (1..18).forEach { holeNum ->
                        val isSelected = activeHoleIndex == holeNum - 1
                        val holeScore = holes[holeNum - 1]
                        val isRecorded = (holeScore.iron + holeScore.putt > 0) || (holeScore.iron2 + holeScore.putt2 > 0)
                        
                        val itemColor = if (isSelected) {
                            MaterialTheme.colorScheme.primary
                        } else if (isRecorded) {
                            MaterialTheme.colorScheme.primaryContainer
                        } else {
                            MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.6f)
                        }
                        
                        val contentColor = if (isSelected) {
                            MaterialTheme.colorScheme.onPrimary
                        } else if (isRecorded) {
                            MaterialTheme.colorScheme.onPrimaryContainer
                        } else {
                            MaterialTheme.colorScheme.onSurfaceVariant
                        }

                        Box(
                            modifier = Modifier
                                .size(width = 56.dp, height = 40.dp)
                                .clip(RoundedCornerShape(12.dp))
                                .background(itemColor)
                                .clickable { activeHoleIndex = holeNum - 1 }
                                .border(
                                    width = if (isSelected) 0.dp else 1.dp,
                                    color = if (isRecorded) MaterialTheme.colorScheme.primary.copy(alpha = 0.3f) else Color.Transparent,
                                    shape = RoundedCornerShape(12.dp)
                                ),
                            contentAlignment = Alignment.Center
                        ) {
                            Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
                                Text(
                                    text = "${holeNum}H",
                                    fontSize = 12.sp,
                                    fontWeight = if (isSelected || isRecorded) FontWeight.Bold else FontWeight.Normal,
                                    color = contentColor
                                )
                                if (isRecorded) {
                                    val total = (holeScore.iron + holeScore.putt) + (holeScore.iron2 + holeScore.putt2)
                                    if (isSelected) {
                                        Box(
                                            modifier = Modifier
                                                .size(4.dp)
                                                .clip(CircleShape)
                                                .background(contentColor)
                                        )
                                    } else {
                                        Text(
                                            text = "${holeScore.iron + holeScore.putt}/${holeScore.iron2 + holeScore.putt2}",
                                            fontSize = 8.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = contentColor.copy(alpha = 0.8f)
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        // 3. Active Hole Stepper Card
        item {
            val holeScore = holes[activeHoleIndex]
            
            Card(
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                elevation = CardDefaults.cardElevation(defaultElevation = 3.dp),
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    // Title Header showing current active hole
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        TextButton(
                            onClick = { if (activeHoleIndex > 0) activeHoleIndex-- },
                            enabled = activeHoleIndex > 0
                        ) {
                            Text("◀ Prev")
                        }
                        
                        Text(
                            text = "⛳ HOLE ${activeHoleIndex + 1}",
                            fontSize = 20.sp,
                            fontWeight = FontWeight.ExtraBold,
                            color = MaterialTheme.colorScheme.primary
                        )
                        
                        TextButton(
                            onClick = { if (activeHoleIndex < 17) activeHoleIndex++ },
                            enabled = activeHoleIndex < 17
                        ) {
                            Text("Next ▶")
                        }
                    }

                    HorizontalDivider(
                        color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f),
                        modifier = Modifier.padding(vertical = 12.dp)
                    )

                    // Players Steppers Row
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceEvenly
                    ) {
                        // Player 1 Column
                        Column(
                            modifier = Modifier.weight(1f),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Text(
                                text = "👤 Player 1",
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.primary,
                                modifier = Modifier.padding(bottom = 12.dp)
                            )
                            
                            ScoreStepper(
                                title = "Stroke (기본타)",
                                value = holeScore.iron,
                                onValueChange = { newValue ->
                                    holes[activeHoleIndex] = holeScore.copy(iron = newValue)
                                },
                                color = MaterialTheme.colorScheme.primary,
                                containerColor = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.3f)
                            )

                            Spacer(modifier = Modifier.height(14.dp))

                            ScoreStepper(
                                title = "Putt (퍼팅)",
                                value = holeScore.putt,
                                onValueChange = { newValue ->
                                    holes[activeHoleIndex] = holeScore.copy(putt = newValue)
                                },
                                color = MaterialTheme.colorScheme.primary,
                                containerColor = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.3f)
                            )
                            
                            Spacer(modifier = Modifier.height(12.dp))
                            
                            val total1 = holeScore.iron + holeScore.putt
                            Text(
                                text = "Total: $total1",
                                fontSize = 15.sp,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.primary
                            )
                        }

                        // Divider between P1 and P2
                        Box(
                            modifier = Modifier
                                .width(1.dp)
                                .height(180.dp)
                                .align(Alignment.CenterVertically)
                                .background(MaterialTheme.colorScheme.outlineVariant)
                        )

                        // Player 2 Column
                        Column(
                            modifier = Modifier.weight(1f),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Text(
                                text = "👤 Player 2",
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.secondary,
                                modifier = Modifier.padding(bottom = 12.dp)
                            )
                            
                            ScoreStepper(
                                title = "Stroke (기본타)",
                                value = holeScore.iron2,
                                onValueChange = { newValue ->
                                    holes[activeHoleIndex] = holeScore.copy(iron2 = newValue)
                                },
                                color = MaterialTheme.colorScheme.secondary,
                                containerColor = MaterialTheme.colorScheme.secondaryContainer.copy(alpha = 0.3f)
                            )

                            Spacer(modifier = Modifier.height(14.dp))

                            ScoreStepper(
                                title = "Putt (퍼팅)",
                                value = holeScore.putt2,
                                onValueChange = { newValue ->
                                    holes[activeHoleIndex] = holeScore.copy(putt2 = newValue)
                                },
                                color = MaterialTheme.colorScheme.secondary,
                                containerColor = MaterialTheme.colorScheme.secondaryContainer.copy(alpha = 0.3f)
                            )

                            Spacer(modifier = Modifier.height(12.dp))
                            
                            val total2 = holeScore.iron2 + holeScore.putt2
                            Text(
                                text = "Total: $total2",
                                fontSize = 15.sp,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.secondary
                            )
                        }
                    }
                }
            }
        }

        // 4. Live Scorecard Summary Grid
        item {
            ScorecardSummaryGrid(
                holes = holes.toList(),
                activeHoleIndex = activeHoleIndex,
                onHoleSelect = { selectedIndex -> activeHoleIndex = selectedIndex }
            )
        }

        // 5. Large Live Grand Total and Submit Button Section
        item {
            val totalP1 = holes.sumOf { it.iron + it.putt }
            val totalP2 = holes.sumOf { it.iron2 + it.putt2 }
            
            Card(
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.25f)),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceAround,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text("Player 1 Total", fontSize = 12.sp, color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Bold)
                            Text("$totalP1", fontSize = 28.sp, fontWeight = FontWeight.ExtraBold, color = MaterialTheme.colorScheme.primary)
                        }
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text("Player 2 Total", fontSize = 12.sp, color = MaterialTheme.colorScheme.secondary, fontWeight = FontWeight.Bold)
                            Text("$totalP2", fontSize = 28.sp, fontWeight = FontWeight.ExtraBold, color = MaterialTheme.colorScheme.secondary)
                        }
                    }
                    
                    Spacer(modifier = Modifier.height(16.dp))

                    Button(
                        onClick = {
                            val holesJson = JsonUtils.holeScoreListAdapter.toJson(holes.toList())
                            if (isNewCourse && newCourseName.isNotBlank()) {
                                onAddCourseAndSave(newCourseName, date, holesJson)
                                // Reset
                                newCourseName = ""
                                isNewCourse = false
                                date = SimpleDateFormat("MM/dd/yyyy", Locale.getDefault()).format(Date())
                                holes.forEachIndexed { i, _ -> holes[i] = HoleScore(i+1, 0, 0, 0, 0) }
                                activeHoleIndex = 0
                            } else if (selectedCourseId != null) {
                                val cName = courses.find { it.id == selectedCourseId }?.name ?: ""
                                onSaveScore(selectedCourseId!!, cName, date, holesJson)
                                // Reset
                                selectedCourseId = null
                                date = SimpleDateFormat("MM/dd/yyyy", Locale.getDefault()).format(Date())
                                holes.forEachIndexed { i, _ -> holes[i] = HoleScore(i+1, 0, 0, 0, 0) }
                                activeHoleIndex = 0
                            }
                        },
                        enabled = (isNewCourse && newCourseName.isNotBlank()) || (!isNewCourse && selectedCourseId != null),
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.fillMaxWidth().height(50.dp)
                    ) {
                        Text("Save Round Record", fontSize = 16.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}

@Composable
fun ScoreStepper(
    title: String,
    value: Int,
    onValueChange: (Int) -> Unit,
    color: Color,
    containerColor: Color
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier.padding(horizontal = 4.dp)
    ) {
        Text(title, fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f), fontWeight = FontWeight.SemiBold)
        Spacer(modifier = Modifier.height(6.dp))
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.Center,
            modifier = Modifier
                .background(containerColor, RoundedCornerShape(24.dp))
                .border(1.dp, color.copy(alpha = 0.15f), RoundedCornerShape(24.dp))
                .padding(4.dp)
        ) {
            FilledIconButton(
                onClick = { if (value > 0) onValueChange(value - 1) },
                modifier = Modifier.size(36.dp),
                colors = IconButtonDefaults.filledIconButtonColors(
                    containerColor = Color.White,
                    contentColor = color
                )
            ) {
                Text("−", fontSize = 18.sp, fontWeight = FontWeight.Bold)
            }
            
            Text(
                text = value.toString(),
                fontSize = 16.sp,
                fontWeight = FontWeight.Bold,
                color = color,
                textAlign = TextAlign.Center,
                modifier = Modifier.width(36.dp)
            )
            
            FilledIconButton(
                onClick = { onValueChange(value + 1) },
                modifier = Modifier.size(36.dp),
                colors = IconButtonDefaults.filledIconButtonColors(
                    containerColor = Color.White,
                    contentColor = color
                )
            ) {
                Text("+", fontSize = 18.sp, fontWeight = FontWeight.Bold)
            }
        }
    }
}

@Composable
fun ScorecardSummaryGrid(
    holes: List<HoleScore>,
    activeHoleIndex: Int,
    onHoleSelect: (Int) -> Unit
) {
    Card(
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.4f)),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Text(
                "📊 18-Hole Live Matrix (Tap cell to navigate)",
                fontSize = 13.sp,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.primary,
                modifier = Modifier.padding(bottom = 12.dp, start = 4.dp)
            )
            
            // Front 9 List
            ScorecardHalfTable(
                title = "⛳ Front Nine (Holes 1 - 9)",
                holes = holes.subList(0, 9),
                startIndex = 0,
                activeHoleIndex = activeHoleIndex,
                onHoleSelect = onHoleSelect
            )
            
            Spacer(modifier = Modifier.height(12.dp))
            
            // Back 9 List
            ScorecardHalfTable(
                title = "⛳ Back Nine (Holes 10 - 18)",
                holes = holes.subList(9, 18),
                startIndex = 9,
                activeHoleIndex = activeHoleIndex,
                onHoleSelect = onHoleSelect
            )
        }
    }
}

@Composable
fun ScorecardHalfTable(
    title: String,
    holes: List<HoleScore>,
    startIndex: Int,
    activeHoleIndex: Int,
    onHoleSelect: (Int) -> Unit
) {
    Column {
        Text(
            text = title,
            fontSize = 10.sp,
            color = Color.Gray,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.padding(bottom = 6.dp, start = 4.dp)
        )
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .border(1.dp, MaterialTheme.colorScheme.outlineVariant, RoundedCornerShape(8.dp))
                .clip(RoundedCornerShape(8.dp))
        ) {
            // Label Header Column (H / P1 / P2)
            Column(
                modifier = Modifier
                    .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f))
                    .padding(vertical = 4.dp)
                    .width(42.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text("Hole", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = Color.Gray, modifier = Modifier.height(18.dp))
                HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant, thickness = 1.dp)
                Text("P1", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary, modifier = Modifier.height(18.dp))
                HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant, thickness = 1.dp)
                Text("P2", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.secondary, modifier = Modifier.height(18.dp))
            }
            
            // 9 columns of data
            holes.forEachIndexed { idx, holeScore ->
                val globalIdx = startIndex + idx
                val isSelected = activeHoleIndex == globalIdx
                
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .background(if (isSelected) MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.4f) else Color.Transparent)
                        .clickable { onHoleSelect(globalIdx) }
                ) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        modifier = Modifier.padding(vertical = 4.dp)
                    ) {
                        Text(
                            text = "${holeScore.hole}",
                            fontSize = 11.sp,
                            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                            color = if (isSelected) MaterialTheme.colorScheme.primary else Color.Gray,
                            modifier = Modifier.height(18.dp)
                        )
                        HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.6f), thickness = 1.dp)
                        
                        val p1Total = holeScore.iron + holeScore.putt
                        Text(
                            text = if (p1Total > 0) p1Total.toString() else "−",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.height(18.dp)
                        )
                        HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.6f), thickness = 1.dp)
                        
                        val p2Total = holeScore.iron2 + holeScore.putt2
                        Text(
                            text = if (p2Total > 0) p2Total.toString() else "−",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.secondary,
                            modifier = Modifier.height(18.dp)
                        )
                    }
                }
                
                if (idx < 8) {
                    Box(modifier = Modifier.width(1.dp).height(58.dp).background(MaterialTheme.colorScheme.outlineVariant))
                }
            }
        }
    }
}
