package com.example.data

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "courses")
data class CourseEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val name: String,
    val lat: Double,
    val lng: Double,
    val handicap: Double,
    val slope: Int
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
data class HoleScore(val hole: Int, var iron: Int, var putt: Int)
