plugins {
    id("com.android.application")
}

android {
    namespace = "com.example"
    compileSdk = 33

    defaultConfig {
        applicationId = "com.aistudio.skkygolf.webwrap"
        minSdk = 26
        targetSdk = 33
        versionCode = 1
        versionName = "1.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

dependencies {
    implementation("androidx.appcompat:appcompat:1.6.1")
}

tasks.register<Exec>("buildWebAssets") {
    inputs.dir(file("../web-app/src"))
    inputs.dir(file("../web-app/public"))
    inputs.file(file("../web-app/package.json"))
    inputs.file(file("../web-app/tailwind.config.js"))
    outputs.dir(file("../web-app/build"))

    workingDir = file("../web-app")
    val isWindows = org.gradle.internal.os.OperatingSystem.current().isWindows
    if (isWindows) {
        commandLine("cmd", "/c", "npm run build")
    } else {
        commandLine("npm", "run", "build")
    }
}

tasks.register<Copy>("copyWebAssets") {
    dependsOn("buildWebAssets")
    from(file("../web-app/build"))
    into(file("src/main/assets"))
}

tasks.getByName("preBuild").dependsOn("copyWebAssets")

