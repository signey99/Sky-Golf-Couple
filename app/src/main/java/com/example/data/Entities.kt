package com.example.data

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "courses")
data class CourseEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val name: String,
    val address: String = "",
    val totalPar: Int = 72,
    val ladyRating: Double = 72.0,
    val ladySlope: Int = 113,
    val blueRating: Double = 72.0,
    val blueSlope: Int = 113,
    val lat: Double,
    val lng: Double,
    val holeParsJson: String = ""
)

@Entity(tableName = "scores")
data class ScoreEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val courseId: Long,
    val courseName: String,
    val date: String,
    val holesJson: String,
    val photosJson: String
)

@com.squareup.moshi.JsonClass(generateAdapter = true)
data class HoleScore(
    val hole: Int,
    var iron: Int = 0,
    var putt: Int = 0,
    var iron2: Int = 0,
    var putt2: Int = 0
)
