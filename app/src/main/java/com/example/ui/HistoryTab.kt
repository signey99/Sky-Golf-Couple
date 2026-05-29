package com.example.ui

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.example.data.ScoreEntity
import com.example.utils.JsonUtils

@Composable
fun HistoryTab(
    scores: List<ScoreEntity>,
    onAddPhoto: (ScoreEntity, String) -> Unit,
    modifier: Modifier = Modifier
) {
    var selectedScoreForDetail by remember { mutableStateOf<ScoreEntity?>(null) }

    if (scores.isEmpty()) {
        Box(modifier = modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text("No game history has been recorded yet.", color = Color.Gray, fontWeight = FontWeight.Bold)
                Spacer(modifier = Modifier.height(8.dp))
                Text("Record your first round in the 1st tab!", color = Color.Gray, fontSize = 12.sp)
            }
        }
    } else {
        Box(modifier = modifier.fillMaxSize()) {
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                item {
                    Text(
                        text = "📸 Our Golf Memories",
                        fontSize = 20.sp,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onBackground,
                        modifier = Modifier.padding(bottom = 8.dp)
                    )
                }
                items(scores) { score ->
                    HistoryCard(
                        score = score,
                        onClick = { selectedScoreForDetail = score }
                    )
                }
            }

            // Detail scorecard & photo popup
            if (selectedScoreForDetail != null) {
                // Find latest score state with latest photos
                val latestScore = scores.find { it.id == selectedScoreForDetail?.id } ?: selectedScoreForDetail!!
                HistoryDetailDialog(
                    score = latestScore,
                    onDismiss = { selectedScoreForDetail = null },
                    onAddPhoto = onAddPhoto
                )
            }
        }
    }
}

@Composable
fun HistoryCard(
    score: ScoreEntity,
    onClick: () -> Unit
) {
    val holes = JsonUtils.parseHoleScores(score.holesJson)
    val totalstrokes1 = holes.sumOf { it.iron + it.putt }
    val totalstrokes2 = holes.sumOf { it.iron2 + it.putt2 }

    Card(
        shape = RoundedCornerShape(16.dp),
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() },
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
                        text = score.courseName,
                        fontWeight = FontWeight.Bold,
                        fontSize = 16.sp,
                        color = MaterialTheme.colorScheme.primary
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "📅 경기 날짜: ${score.date}",
                        fontSize = 13.sp,
                        color = Color.Gray
                    )
                }

                // Simplified player scores
                Column(horizontalAlignment = Alignment.End) {
                    Text(
                        text = "P1: ${totalstrokes1}타",
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.primary
                    )
                    if (totalstrokes2 > 0) {
                        Text(
                            text = "P2: ${totalstrokes2}타",
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.secondary
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun HistoryDetailDialog(
    score: ScoreEntity,
    onDismiss: () -> Unit,
    onAddPhoto: (ScoreEntity, String) -> Unit
) {
    val holes = JsonUtils.parseHoleScores(score.holesJson)
    val photos = JsonUtils.parseStringList(score.photosJson)

    val photoLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        uri?.let {
            onAddPhoto(score, it.toString())
        }
    }

    val totalStrokes1 = holes.sumOf { it.iron + it.putt }
    val totalPutts1 = holes.sumOf { it.putt }
    val totalStrokes2 = holes.sumOf { it.iron2 + it.putt2 }
    val totalPutts2 = holes.sumOf { it.putt2 }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = score.courseName,
                        fontWeight = FontWeight.Bold,
                        fontSize = 18.sp,
                        color = MaterialTheme.colorScheme.primary
                    )
                    Text(
                        text = "📅 ${score.date} 라운딩 정보",
                        fontSize = 12.sp,
                        color = Color.Gray
                    )
                }
                IconButton(onClick = onDismiss) {
                    Icon(imageVector = Icons.Default.Close, contentDescription = "Close")
                }
            }
        },
        text = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                // Section 1: Photos Upload / List
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "📷 라운딩 사진 및 추억",
                            fontWeight = FontWeight.Bold,
                            fontSize = 14.sp,
                            color = MaterialTheme.colorScheme.primary
                        )
                        Button(
                            onClick = { photoLauncher.launch("image/*") },
                            contentPadding = PaddingValues(horizontal = 8.dp, vertical = 4.dp),
                            modifier = Modifier.height(32.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primaryContainer, contentColor = MaterialTheme.colorScheme.onPrimaryContainer)
                        ) {
                            Icon(Icons.Default.Add, contentDescription = "Add photo", modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("사진 업로드", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                        }
                    }

                    if (photos.isEmpty()) {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(80.dp)
                                .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f), RoundedCornerShape(8.dp))
                                .border(1.dp, MaterialTheme.colorScheme.outlineVariant, RoundedCornerShape(8.dp)),
                            contentAlignment = Alignment.Center
                        ) {
                            Text("등록된 사진이 없습니다. 첫 사진을 등록해보세요!", fontSize = 11.sp, color = Color.Gray)
                        }
                    } else {
                        // Horizontal scroll of photos
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            photos.forEach { photoUrl ->
                                AsyncImage(
                                    model = photoUrl,
                                    contentDescription = "Golf Photo",
                                    contentScale = ContentScale.Crop,
                                    modifier = Modifier
                                        .size(90.dp)
                                        .clip(RoundedCornerShape(8.dp))
                                        .border(1.dp, MaterialTheme.colorScheme.outlineVariant, RoundedCornerShape(8.dp))
                                )
                            }
                        }
                    }
                }

                HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))

                // Section 2: Summary Scorecard Ring
                Card(
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.3f)),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(12.dp),
                        verticalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Text("🏆 최종 스코어 결과", fontWeight = FontWeight.Bold, fontSize = 13.sp, color = MaterialTheme.colorScheme.primary)
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text("👤 Player 1: ${totalStrokes1}타 (퍼팅: ${totalPutts1}회)", fontSize = 12.sp, color = MaterialTheme.colorScheme.onPrimaryContainer)
                            if (totalStrokes2 > 0) {
                                Text("👤 Player 2: ${totalStrokes2}타 (퍼팅: ${totalPutts2}회)", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onPrimaryContainer)
                            }
                        }
                    }
                }

                // Section 3: Detailed 18-hole score table
                Text(
                    text = "📊 홀별 상세 스코어카드",
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.sp,
                    color = MaterialTheme.colorScheme.primary
                )

                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .border(1.dp, MaterialTheme.colorScheme.outlineVariant, RoundedCornerShape(8.dp))
                        .clip(RoundedCornerShape(8.dp))
                ) {
                    // Table Header
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(MaterialTheme.colorScheme.primaryContainer),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("홀", modifier = Modifier.weight(0.8f).padding(6.dp), fontSize = 11.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onPrimaryContainer)
                        Text("Player 1 (퍼팅)", modifier = Modifier.weight(2f).padding(6.dp), fontSize = 11.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onPrimaryContainer)
                        Text("Player 2 (퍼팅)", modifier = Modifier.weight(2f).padding(6.dp), fontSize = 11.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onPrimaryContainer)
                    }

                    holes.forEachIndexed { idx, holeScore ->
                        val p1Strokes = holeScore.iron + holeScore.putt
                        val p2Strokes = holeScore.iron2 + holeScore.putt2
                        val isEven = idx % 2 == 0
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .background(if (isEven) MaterialTheme.colorScheme.surface else MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f)),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text("H${holeScore.hole}", modifier = Modifier.weight(0.8f).padding(6.dp), fontSize = 12.sp, fontWeight = FontWeight.Bold)
                            Text("${p1Strokes}타 (${holeScore.putt})", modifier = Modifier.weight(2f).padding(6.dp), fontSize = 12.sp)
                            Text(
                                text = if (p2Strokes > 0) "${p2Strokes}타 (${holeScore.putt2})" else "-",
                                modifier = Modifier.weight(2f).padding(6.dp),
                                fontSize = 12.sp
                            )
                        }
                    }
                }
            }
        },
        confirmButton = {
            Button(onClick = onDismiss) {
                Text("닫기")
            }
        }
    )
}
