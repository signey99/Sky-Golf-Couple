package com.example.data

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import kotlinx.coroutines.flow.Flow

@Dao
interface GolfDao {
    @Query("SELECT * FROM courses ORDER BY id DESC")
    fun getAllCourses(): Flow<List<CourseEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertCourse(course: CourseEntity): Long

    @Query("SELECT * FROM scores ORDER BY date DESC, id DESC")
    fun getAllScores(): Flow<List<ScoreEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertScore(score: ScoreEntity): Long
    
    @Update
    suspend fun updateScore(score: ScoreEntity)
}
