package com.example.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
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
import java.util.Locale

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
        lng: Double,
        holeParsJson: String
    ) -> Unit,
    modifier: Modifier = Modifier
) {
    var newCourseName by remember { mutableStateOf("") }
    var address by remember { mutableStateOf("") }
    
    var ladyRating by remember { mutableStateOf(72.0) }
    var ladySlope by remember { mutableStateOf(113) }
    var blueRating by remember { mutableStateOf(72.0) }
    var blueSlope by remember { mutableStateOf(113) }

    // Individual hole pars state (default is Par 4 for all 18 holes)
    val holePars = remember { mutableStateListOf(*Array(18) { 4 }) }
    var showParDialogForHole by remember { mutableStateOf<Int?>(null) } // hole number (1 to 18), or null
    var showRegisterFormDialog by remember { mutableStateOf(false) }

    // Popup Par Select Dialog
    if (showParDialogForHole != null) {
        val holeIdx = showParDialogForHole!! - 1
        val currentPar = holePars[holeIdx]
        AlertDialog(
            onDismissRequest = { showParDialogForHole = null },
            title = { Text("Select Par for Hole $showParDialogForHole", fontWeight = FontWeight.Bold) },
            text = {
                Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth()) {
                    Text("Select standard strokes (Par 3, 4, or 5) for this hole:", fontSize = 14.sp, color = Color.Gray, modifier = Modifier.padding(bottom = 16.dp))
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                        modifier = Modifier.padding(vertical = 8.dp)
                    ) {
                        listOf(3, 4, 5).forEach { parOption ->
                            Button(
                                onClick = {
                                    holePars[holeIdx] = parOption
                                    showParDialogForHole = null
                                },
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = if (currentPar == parOption) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.secondaryContainer,
                                    contentColor = if (currentPar == parOption) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSecondaryContainer
                                ),
                                shape = RoundedCornerShape(12.dp),
                                modifier = Modifier.size(64.dp)
                              ) {
                                Text(parOption.toString(), fontSize = 20.sp, fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }
            },
            confirmButton = {
                TextButton(onClick = { showParDialogForHole = null }) {
                    Text("Cancel")
                }
            }
        )
    }

    if (showRegisterFormDialog) {
        val registerScrollState = rememberScrollState()
        AlertDialog(
            onDismissRequest = { showRegisterFormDialog = false },
            title = { Text("⛳ Enter Golf Course Info", fontWeight = FontWeight.Bold, fontSize = 18.sp) },
            text = {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .verticalScroll(registerScrollState),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    OutlinedTextField(
                        value = newCourseName,
                        onValueChange = { newCourseName = it },
                        label = { Text("Golf Course Name") },
                        placeholder = { Text("e.g. Nine Bridges CC") },
                        modifier = Modifier.fillMaxWidth()
                    )

                    OutlinedTextField(
                        value = address,
                        onValueChange = { address = it },
                        label = { Text("Course Address") },
                        placeholder = { Text("e.g. Heillip-ro, Jeju-si") },
                        modifier = Modifier.fillMaxWidth()
                    )

                    // Individual Hole Par Selector UI
                    Text(
                        text = "⛳ Default Par per Hole (Tap to Edit)",
                        fontWeight = FontWeight.Bold,
                        fontSize = 13.sp,
                        color = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.padding(top = 8.dp)
                    )

                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f), RoundedCornerShape(8.dp))
                            .padding(8.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        // First row (Hole 1 to 9)
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            (0..8).forEach { index ->
                                Column(
                                    modifier = Modifier
                                        .weight(1f)
                                        .background(MaterialTheme.colorScheme.surface, RoundedCornerShape(6.dp))
                                        .border(1.dp, MaterialTheme.colorScheme.outlineVariant, RoundedCornerShape(6.dp))
                                        .clickable { showParDialogForHole = index + 1 }
                                        .padding(vertical = 6.dp),
                                    horizontalAlignment = Alignment.CenterHorizontally
                                ) {
                                    Text("H${index + 1}", fontSize = 10.sp, color = Color.Gray)
                                    Text("${holePars[index]}", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
                                }
                            }
                        }

                        // Second row (Hole 10 to 18)
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            (9..17).forEach { index ->
                                Column(
                                    modifier = Modifier
                                        .weight(1f)
                                        .background(MaterialTheme.colorScheme.surface, RoundedCornerShape(6.dp))
                                        .border(1.dp, MaterialTheme.colorScheme.outlineVariant, RoundedCornerShape(6.dp))
                                        .clickable { showParDialogForHole = index + 1 }
                                        .padding(vertical = 6.dp),
                                    horizontalAlignment = Alignment.CenterHorizontally
                                ) {
                                    Text("H${index + 1}", fontSize = 10.sp, color = Color.Gray)
                                    Text("${holePars[index]}", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
                                }
                            }
                        }
                    }

                    // Dynamic calculated Total Par read-only message
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("Calculated Total Par:", fontSize = 13.sp, color = Color.Gray)
                        Text("${holePars.sum()}", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
                    }

                    Spacer(modifier = Modifier.height(4.dp))
                    Text("Tee Box Difficulty Rating (Tee Info)", fontWeight = FontWeight.Bold, fontSize = 13.sp, color = MaterialTheme.colorScheme.primary)

                    // Lady Tee Form with Steppers
                    RatingAdjuster(
                        label = "Lady Rating",
                        value = ladyRating,
                        onValueChange = { ladyRating = it }
                    )
                    SlopeAdjuster(
                        label = "Lady Slope",
                        value = ladySlope,
                        onValueChange = { ladySlope = it }
                    )

                    Spacer(modifier = Modifier.height(4.dp))

                    // Blue Tee Form with Steppers
                    RatingAdjuster(
                        label = "Blue Rating",
                        value = blueRating,
                        onValueChange = { blueRating = it }
                    )
                    SlopeAdjuster(
                        label = "Blue Slope",
                        value = blueSlope,
                        onValueChange = { blueSlope = it }
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        if (newCourseName.isNotBlank()) {
                            val parsJson = JsonUtils.serializeHolePars(holePars.toList())
                            onAddCourse(
                                newCourseName,
                                address,
                                holePars.sum(),
                                ladyRating,
                                ladySlope,
                                blueRating,
                                blueSlope,
                                33.3541,
                                126.3712,
                                parsJson
                            )
                            // Reset fields
                            newCourseName = ""
                            address = ""
                            ladyRating = 72.0
                            ladySlope = 113
                            blueRating = 72.0
                            blueSlope = 113
                            holePars.indices.forEach { holePars[it] = 4 }
                            showRegisterFormDialog = false
                        }
                    }
                ) {
                    Text("Register")
                }
            },
            dismissButton = {
                TextButton(onClick = { showRegisterFormDialog = false }) {
                    Text("Cancel")
                }
            }
        )
    }

    LazyColumn(
        modifier = modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(24.dp)
    ) {
        item {
            Button(
                onClick = { showRegisterFormDialog = true },
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)
            ) {
                Text("⛳ Add Golf Course", fontSize = 15.sp, fontWeight = FontWeight.Bold)
            }
        }

        item {
            Text("⛳ Registered Courses", fontSize = 16.sp, fontWeight = FontWeight.Bold)
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

            // Visual representations of course pars
            Spacer(modifier = Modifier.height(12.dp))
            val holePars = JsonUtils.parseHolePars(course.holeParsJson)
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f), RoundedCornerShape(8.dp))
                    .padding(8.dp)
            ) {
                Text("⛳ Detailed Hole Pars", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.secondary)
                Spacer(modifier = Modifier.height(6.dp))
                
                // Row 1: Holes 1 to 9
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(2.dp)
                ) {
                    (0..8).forEach { index ->
                        Column(
                            modifier = Modifier
                                .weight(1f)
                                .background(MaterialTheme.colorScheme.surface, RoundedCornerShape(4.dp))
                                .padding(vertical = 4.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Text("${index + 1}", fontSize = 8.sp, color = Color.Gray)
                            Text("${holePars[index]}", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
                        }
                    }
                }
                
                Spacer(modifier = Modifier.height(4.dp))
                
                // Row 2: Holes 10 to 18
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(2.dp)
                ) {
                    (9..17).forEach { index ->
                        Column(
                            modifier = Modifier
                                .weight(1f)
                                .background(MaterialTheme.colorScheme.surface, RoundedCornerShape(4.dp))
                                .padding(vertical = 4.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Text("${index + 1}", fontSize = 8.sp, color = Color.Gray)
                            Text("${holePars[index]}", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
                        }
                    }
                }
            }

            HorizontalDivider(modifier = Modifier.padding(vertical = 12.dp))

            Text("🎮 Play History (${scores.size} games)", fontSize = 12.sp, fontWeight = FontWeight.Bold)
            if (scores.isEmpty()) {
                Text("No games played on this course yet.", fontSize = 12.sp, color = Color.Gray, modifier = Modifier.padding(top = 4.dp))
            } else {
                scores.forEach { score ->
                    val holes = JsonUtils.parseHoleScores(score.holesJson)
                    // Display total stats for couples or single scorecard
                    val totalStrokes1 = holes.sumOf { it.iron + it.putt }
                    val totalPutts1 = holes.sumOf { it.putt }
                    val totalStrokes2 = holes.sumOf { it.iron2 + it.putt2 }
                    val totalPutts2 = holes.sumOf { it.putt2 }
                    
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(top = 4.dp)
                            .background(MaterialTheme.colorScheme.surfaceVariant, RoundedCornerShape(4.dp))
                            .padding(8.dp)
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text("📅 ${score.date}", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                        Spacer(modifier = Modifier.height(2.dp))
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text("👤 Player 1: ${totalStrokes1} Strokes (Putts: ${totalPutts1})", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            if (totalStrokes2 > 0) {
                                Text("👤 Player 2: ${totalStrokes2} Strokes (Putts: ${totalPutts2})", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun RatingAdjuster(
    label: String,
    value: Double,
    onValueChange: (Double) -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        shape = RoundedCornerShape(8.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f)),
        modifier = modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 8.dp, vertical = 6.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(label, fontSize = 11.sp, color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Bold)
                Text(
                    text = String.format(Locale.US, "%.1f", value),
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurface
                )
            }
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                // Down Arrow Button (decrements by 0.1)
                FilledIconButton(
                    onClick = { onValueChange((value - 0.1).coerceAtLeast(1.0)) },
                    modifier = Modifier.size(36.dp),
                    colors = IconButtonDefaults.filledIconButtonColors(
                        containerColor = MaterialTheme.colorScheme.secondaryContainer,
                        contentColor = MaterialTheme.colorScheme.onSecondaryContainer
                    )
                ) {
                    Text("▼", fontSize = 14.sp, fontWeight = FontWeight.Bold)
                }
                
                // Up Arrow Button (increments by 0.1)
                FilledIconButton(
                    onClick = { onValueChange((value + 0.1).coerceAtMost(150.0)) },
                    modifier = Modifier.size(36.dp),
                    colors = IconButtonDefaults.filledIconButtonColors(
                        containerColor = MaterialTheme.colorScheme.primaryContainer,
                        contentColor = MaterialTheme.colorScheme.onPrimaryContainer
                    )
                ) {
                    Text("▲", fontSize = 14.sp, fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}

@Composable
fun SlopeAdjuster(
    label: String,
    value: Int,
    onValueChange: (Int) -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        shape = RoundedCornerShape(8.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f)),
        modifier = modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 8.dp, vertical = 6.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(label, fontSize = 11.sp, color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Bold)
                Text(
                    text = value.toString(),
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurface
                )
            }
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                // Down Arrow Button (decrements by 1)
                FilledIconButton(
                    onClick = { onValueChange((value - 1).coerceAtLeast(1)) },
                    modifier = Modifier.size(36.dp),
                    colors = IconButtonDefaults.filledIconButtonColors(
                        containerColor = MaterialTheme.colorScheme.secondaryContainer,
                        contentColor = MaterialTheme.colorScheme.onSecondaryContainer
                    )
                ) {
                    Text("▼", fontSize = 14.sp, fontWeight = FontWeight.Bold)
                }
                
                // Up Arrow Button (increments by 1)
                FilledIconButton(
                    onClick = { onValueChange((value + 1).coerceAtMost(300)) },
                    modifier = Modifier.size(36.dp),
                    colors = IconButtonDefaults.filledIconButtonColors(
                        containerColor = MaterialTheme.colorScheme.primaryContainer,
                        contentColor = MaterialTheme.colorScheme.onPrimaryContainer
                    )
                ) {
                    Text("▲", fontSize = 14.sp, fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}
