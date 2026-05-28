package com.example.data

import kotlinx.coroutines.flow.Flow

class GolfRepository(private val golfDao: GolfDao) {
    val allCourses: Flow<List<CourseEntity>> = golfDao.getAllCourses()
    val allScores: Flow<List<ScoreEntity>> = golfDao.getAllScores()

    suspend fun insertCourse(course: CourseEntity): Long {
        return golfDao.insertCourse(course)
    }

    suspend fun insertScore(score: ScoreEntity): Long {
        return golfDao.insertScore(score)
    }
    
    suspend fun updateScore(score: ScoreEntity) {
        golfDao.updateScore(score)
    }
}
