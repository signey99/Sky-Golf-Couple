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
}
