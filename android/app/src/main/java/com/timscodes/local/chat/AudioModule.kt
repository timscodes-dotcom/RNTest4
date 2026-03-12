package com.timscodes.local.chat

import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import android.media.MediaPlayer
import android.net.Uri
import java.io.File

class AudioModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    private var player: MediaPlayer? = null

    override fun getName(): String {
        return "AudioModule"
    }

    @ReactMethod
    fun initPlayer() {
        if (player == null) {
            player = MediaPlayer()
        }
    }

    @ReactMethod
    fun play(url: String, promise: Promise) {
        var settled = false
        try {
            val currentPlayer = player ?: MediaPlayer().also { player = it }
            val uri = Uri.parse(url)

            if (uri.scheme == null || uri.scheme.equals("file", ignoreCase = true)) {
                val localPath = if (uri.scheme.equals("file", ignoreCase = true)) uri.path else url
                if (localPath.isNullOrBlank()) {
                    settled = true
                    promise.reject("E_INVALID_PATH", "Invalid audio file path")
                    return
                }
                if (!File(localPath).exists()) {
                    settled = true
                    promise.reject("E_FILE_NOT_FOUND", "Audio file does not exist: $localPath")
                    return
                }
            }

            currentPlayer.reset()
            currentPlayer.setOnErrorListener { _, what, extra ->
                if (!settled) {
                    settled = true
                    promise.reject("E_PLAYBACK", "MediaPlayer error: what=$what, extra=$extra")
                }
                sendEvent("onError", Arguments.createMap().apply {
                    putString("message", "MediaPlayer error: what=$what, extra=$extra")
                    putInt("what", what)
                    putInt("extra", extra)
                })
                true
            }
            currentPlayer.setOnPreparedListener {
                it.start()
                sendEvent("onPlay", Arguments.createMap().apply { putString("url", url) })
                if (!settled) {
                    settled = true
                    promise.resolve(true)
                }
            }
            currentPlayer.setOnCompletionListener {
                sendEvent("onComplete", null)
            }

            currentPlayer.setDataSource(reactApplicationContext, uri)
            currentPlayer.prepareAsync()
        } catch (e: Exception) {
            if (!settled) {
                settled = true
                promise.reject("E_PLAY_INIT", e.message ?: "play failed", e)
            }
            sendEvent("onError", Arguments.createMap().apply { putString("message", e.message ?: "play failed") })
        }
    }

    @ReactMethod
    fun pause(promise: Promise) {
        player?.pause()
        sendEvent("onPause", null)
        promise.resolve(true)
    }

    @ReactMethod
    fun stop(promise: Promise) {
        try {
            player?.stop()
            player?.reset()
        } catch (_: Exception) {
        }
        sendEvent("onStop", null)
        promise.resolve(true)
    }

    @ReactMethod
    fun seekTo(ms: Int, promise: Promise) {
        player?.seekTo(ms)
        promise.resolve(true)
    }

    @ReactMethod
    fun release() {
        player?.release()
        player = null
    }

    private fun sendEvent(eventName: String, params: WritableMap?) {
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, params)
    }
}
