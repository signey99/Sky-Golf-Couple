package com.example.utils

import com.example.data.HoleScore
import com.squareup.moshi.Moshi
import com.squareup.moshi.Types
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory

object JsonUtils {
    private val moshi = Moshi.Builder().add(KotlinJsonAdapterFactory()).build()

    private val holeScoreListType = Types.newParameterizedType(List::class.java, HoleScore::class.java)
    val holeScoreListAdapter = moshi.adapter<List<HoleScore>>(holeScoreListType)

    private val stringListType = Types.newParameterizedType(List::class.java, String::class.java)
    val stringListAdapter = moshi.adapter<List<String>>(stringListType)

    fun parseHoleScores(json: String): List<HoleScore> {
        return try {
            holeScoreListAdapter.fromJson(json) ?: emptyList()
        } catch (e: Exception) {
            emptyList()
        }
    }

    fun parseStringList(json: String): List<String> {
        return try {
            stringListAdapter.fromJson(json) ?: emptyList()
        } catch (e: Exception) {
            emptyList()
        }
    }

    fun parseHolePars(json: String?): List<Int> {
        if (json.isNullOrEmpty()) return List(18) { 4 }
        return try {
            json.split(",").map { it.toIntOrNull() ?: 4 }
        } catch (e: Exception) {
            List(18) { 4 }
        }
    }

    fun serializeHolePars(pars: List<Int>): String {
        return pars.joinToString(",")
    }
}
