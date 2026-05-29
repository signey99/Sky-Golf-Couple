package com.example.ui

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.gestures.detectTapGestures
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
import androidx.compose.ui.input.pointer.pointerInput
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
    onEditCourse: (
        id: Long,
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

    var clickedLat by remember { mutableStateOf(33.3541) }
    var clickedLng by remember { mutableStateOf(126.3712) }

    // Individual hole pars state (default is Par 4 for all 18 holes)
    val holePars = remember { mutableStateListOf(*Array(18) { 4 }) }
    var showParDialogForHole by remember { mutableStateOf<Int?>(null) } // hole number (1 to 18), or null
    var showRegisterFormDialog by remember { mutableStateOf(false) }
    var editingCourse by remember { mutableStateOf<CourseEntity?>(null) }

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
                    Card(
                        shape = RoundedCornerShape(8.dp),
                        colors = CardDefaults.cardColors(containerColor = Color(0xFFE8F5E9)),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(10.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = String.format(Locale.US, "📍 Simulated GPS - Lat: %.4f, Lng: %.4f", clickedLat, clickedLng),
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color(0xFF107C41)
                            )
                        }
                    }

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
                                clickedLat,
                                clickedLng,
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

    if (editingCourse != null) {
        val course = editingCourse!!
        EditCourseDialog(
            course = course,
            onDismiss = { editingCourse = null },
            onSave = { name, addr, par, ladyR, ladyS, blueR, blueS, lt, lg, parsJ ->
                onEditCourse(course.id, name, addr, par, ladyR, ladyS, blueR, blueS, lt, lg, parsJ)
                editingCourse = null
            }
        )
    }

    LazyColumn(
        modifier = modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            // Map GPS simulator card (always present)
            Card(
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(
                        text = "🗺️ Course Location / 골프장 지도 시뮬레이터",
                        fontWeight = FontWeight.Bold,
                        fontSize = 16.sp,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "지도 영역을 클릭하면 GPS 위치가 시뮬레이션 변경되며, 이 핀 주소를 기준으로 신규 골프장을 등록할 수 있습니다.",
                        fontSize = 11.sp,
                        color = Color.Gray,
                        lineHeight = 16.sp
                    )
                    Spacer(modifier = Modifier.height(12.dp))

                    // Simulated Map view with Grid/Dots patterns and Click gesture
                    BoxWithConstraints(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(144.dp)
                            .background(
                                color = Color(0xFFE8F5E9).copy(alpha = 0.4f),
                                shape = RoundedCornerShape(12.dp)
                            )
                            .border(
                                width = 1.dp,
                                color = Color(0xFF107C41).copy(alpha = 0.3f),
                                shape = RoundedCornerShape(12.dp)
                            )
                            .pointerInput(Unit) {
                                detectTapGestures { offset ->
                                    val xPercent = offset.x / size.width
                                    val yPercent = offset.y / size.height
                                    val simulatedLat = 33.3541 + yPercent * 0.1
                                    val simulatedLng = 126.3712 + xPercent * 0.1
                                    clickedLat = String.format(Locale.US, "%.4f", simulatedLat).toDoubleOrNull() ?: simulatedLat
                                    clickedLng = String.format(Locale.US, "%.4f", simulatedLng).toDoubleOrNull() ?: simulatedLng
                                }
                            },
                        contentAlignment = Alignment.Center
                    ) {
                        // Background pattern - draw grid dots
                        Canvas(modifier = Modifier.fillMaxSize()) {
                            val dotRadius = 1.5.dp.toPx()
                            val spacing = 16.dp.toPx()
                            var x = spacing / 2
                            while (x < size.width) {
                                var y = spacing / 2
                                while (y < size.height) {
                                    drawCircle(
                                        color = Color(0xFF107C41).copy(alpha = 0.2f),
                                        radius = dotRadius,
                                        center = androidx.compose.ui.geometry.Offset(x, y)
                                    )
                                    y += spacing
                                }
                                x += spacing
                            }
                        }

                        // Coordinates chip display
                        Card(
                            shape = RoundedCornerShape(50),
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                            elevation = CardDefaults.cardElevation(defaultElevation = 4.dp),
                            modifier = Modifier.padding(12.dp)
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 14.dp, vertical = 6.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(6.dp)
                            ) {
                                Text("📍", fontSize = 14.sp)
                                Text(
                                    text = String.format(Locale.US, "Lat: %.4f, Lng: %.4f", clickedLat, clickedLng),
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color(0xFF107C41)
                                )
                            }
                        }

                        // Guidance text at the bottom
                        Box(
                            modifier = Modifier
                                .fillMaxSize()
                                .padding(8.dp),
                            contentAlignment = Alignment.BottomCenter
                        ) {
                            Text(
                                text = "클릭하여 핀 위치 변경하기",
                                fontSize = 9.sp,
                                color = Color.Gray,
                                fontWeight = FontWeight.Bold,
                                letterSpacing = 1.sp
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    Button(
                        onClick = { showRegisterFormDialog = true },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF107C41))
                    ) {
                        Text("⛳ Add Golf Course / 골프장 등록하기", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = Color.White)
                    }
                }
            }
        }

        item {
            Text(
                text = "📍 REGISTERED COURSE PROFILES",
                fontSize = 12.sp,
                fontWeight = FontWeight.Bold,
                color = Color.Gray,
                modifier = Modifier.padding(top = 8.dp, bottom = 4.dp)
            )
        }

        items(courses) { course ->
            CourseCard(
                course = course,
                gameCount = scores.count { it.courseId == course.id },
                onEditClick = { editingCourse = course }
            )
        }
    }
}

@Composable
fun EditCourseDialog(
    course: CourseEntity,
    onDismiss: () -> Unit,
    onSave: (
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
    ) -> Unit
) {
    var name by remember { mutableStateOf(course.name) }
    var address by remember { mutableStateOf(course.address) }
    var ladyRating by remember { mutableStateOf(course.ladyRating) }
    var ladySlope by remember { mutableStateOf(course.ladySlope) }
    var blueRating by remember { mutableStateOf(course.blueRating) }
    var blueSlope by remember { mutableStateOf(course.blueSlope) }
    var lat by remember { mutableStateOf(course.lat) }
    var lng by remember { mutableStateOf(course.lng) }

    val initialPars = remember {
        val parsed = JsonUtils.parseHolePars(course.holeParsJson)
        val list = if (parsed.size == 18) parsed else List(18) { 4 }
        mutableStateListOf(*list.toTypedArray())
    }

    var showParDialogForHole by remember { mutableStateOf<Int?>(null) }
    val editScrollState = rememberScrollState()

    if (showParDialogForHole != null) {
        val holeIdx = showParDialogForHole!! - 1
        val currentPar = initialPars[holeIdx]
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
                                    initialPars[holeIdx] = parOption
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

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("✏️ Edit Golf Course Info", fontWeight = FontWeight.Bold, fontSize = 18.sp) },
        text = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .verticalScroll(editScrollState),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = { Text("Golf Course Name") },
                    modifier = Modifier.fillMaxWidth()
                )

                OutlinedTextField(
                    value = address,
                    onValueChange = { address = it },
                    label = { Text("Course Address") },
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
                                Text("${initialPars[index]}", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
                            }
                        }
                    }

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
                                Text("${initialPars[index]}", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
                            }
                        }
                    }
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("Calculated Total Par:", fontSize = 13.sp, color = Color.Gray)
                    Text("${initialPars.sum()}", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
                }

                Spacer(modifier = Modifier.height(4.dp))
                Text("Tee Box Difficulty Rating (Tee Info)", fontWeight = FontWeight.Bold, fontSize = 13.sp, color = MaterialTheme.colorScheme.primary)

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
                    if (name.isNotBlank()) {
                        val parsJson = JsonUtils.serializeHolePars(initialPars.toList())
                        onSave(
                            name,
                            address,
                            initialPars.sum(),
                            ladyRating,
                            ladySlope,
                            blueRating,
                            blueSlope,
                            lat,
                            lng,
                            parsJson
                        )
                    }
                }
            ) {
                Text("Save")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancel")
            }
        }
    )
}

@Composable
fun CourseCard(
    course: CourseEntity,
    gameCount: Int,
    onEditClick: () -> Unit
) {
    Card(
        shape = RoundedCornerShape(16.dp),
        modifier = Modifier.fillMaxWidth(),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = course.name,
                        fontWeight = FontWeight.Bold,
                        fontSize = 18.sp,
                        color = MaterialTheme.colorScheme.primary
                    )
                    Spacer(modifier = Modifier.height(6.dp))
                    Text(
                        text = "⛳ Total Par: ${course.totalPar}",
                        fontSize = 13.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "🎮 Total Games Played: $gameCount 회(games)",
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Normal,
                        color = Color.Gray
                    )
                }

                // Edit Button
                IconButton(
                    onClick = onEditClick,
                    modifier = Modifier
                        .size(40.dp)
                        .background(MaterialTheme.colorScheme.primaryContainer, RoundedCornerShape(8.dp))
                ) {
                    Text("✏️", fontSize = 16.sp)
                }
            }

            Spacer(modifier = Modifier.height(12.dp))
            HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))
            Spacer(modifier = Modifier.height(12.dp))

            // Lady & Blue Tee ratings & slopes
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Card(
                    modifier = Modifier.weight(1f),
                    colors = CardDefaults.cardColors(containerColor = Color(0xFFFFEAEF)),
                    shape = RoundedCornerShape(10.dp)
                ) {
                    Column(
                        modifier = Modifier.padding(10.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Text("👩 Lady Tee", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color(0xFFC2185B))
                        Spacer(modifier = Modifier.height(4.dp))
                        Text("Rating: ${course.ladyRating}", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Color(0xFFC2185B))
                        Text("Slope: ${course.ladySlope}", fontSize = 11.sp, color = Color(0xFFE91E63))
                    }
                }

                Card(
                    modifier = Modifier.weight(1f),
                    colors = CardDefaults.cardColors(containerColor = Color(0xFFE3F2FD)),
                    shape = RoundedCornerShape(10.dp)
                ) {
                    Column(
                        modifier = Modifier.padding(10.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Text("👨 Blue Tee", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color(0xFF1976D2))
                        Spacer(modifier = Modifier.height(4.dp))
                        Text("Rating: ${course.blueRating}", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Color(0xFF1976D2))
                        Text("Slope: ${course.blueSlope}", fontSize = 11.sp, color = Color(0xFF2196F3))
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
