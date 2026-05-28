package com.example.ui

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.example.data.AppDatabase
import com.example.data.CourseEntity
import com.example.data.GolfRepository
import com.example.data.ScoreEntity
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

class GolfViewModel(application: Application) : AndroidViewModel(application) {
    private val repository: GolfRepository

    val allCourses: StateFlow<List<CourseEntity>>
    val allScores: StateFlow<List<ScoreEntity>>

    init {
        val golfDao = AppDatabase.getDatabase(application).golfDao()
        repository = GolfRepository(golfDao)

        allCourses = repository.allCourses.stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5000),
            initialValue = emptyList()
        )

        allScores = repository.allScores.stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5000),
            initialValue = emptyList()
        )
    }

    fun addCourse(
        name: String,
        address: String,
        totalPar: Int,
        ladyRating: Double,
        ladySlope: Int,
        blueRating: Double,
        blueSlope: Int,
        lat: Double,
        lng: Double,
        holeParsJson: String = "",
        onComplete: ((Long) -> Unit)? = null
    ) {
        viewModelScope.launch {
            val id = repository.insertCourse(
                CourseEntity(
                    name = name,
                    address = address,
                    totalPar = totalPar,
                    ladyRating = ladyRating,
                    ladySlope = ladySlope,
                    blueRating = blueRating,
                    blueSlope = blueSlope,
                    lat = lat,
                    lng = lng,
                    holeParsJson = holeParsJson
                )
            )
            onComplete?.invoke(id)
        }
    }

    fun addScore(courseId: Long, courseName: String, date: String, holesJson: String, photosJson: String) {
        viewModelScope.launch {
            repository.insertScore(ScoreEntity(
                courseId = courseId,
                courseName = courseName,
                date = date,
                holesJson = holesJson,
                photosJson = photosJson
            ))
        }
    }
    
    fun updateScorePhotos(score: ScoreEntity, newPhotosJson: String) {
        viewModelScope.launch {
            repository.updateScore(score.copy(photosJson = newPhotosJson))
        }
    }
}
