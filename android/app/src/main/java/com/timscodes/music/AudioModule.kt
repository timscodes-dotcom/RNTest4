package com.timscodes.music

import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import android.media.MediaPlayer
import android.net.Uri
import android.os.Handler
import android.os.Looper
import android.os.Bundle
import android.media.session.MediaSession
import android.media.session.PlaybackState
import android.content.Intent
import java.io.File

class AudioModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    private var player: MediaPlayer? = null
    private var mediaSession: MediaSession? = null
    private val progressHandler = Handler(Looper.getMainLooper())
    private val progressIntervalMs = 1000L
    private var isDestroyed = false

    init {
        // 重置销毁标志，确保新实例可用
        isDestroyed = false
        
        // 注册此模块到 MediaButtonReceiver
        MediaButtonReceiver.setAudioModule(this)
        // 保存当前实例用于全局访问
        setCurrentInstance(this)
    }
    
    override fun onCatalystInstanceDestroy() {
        super.onCatalystInstanceDestroy()
        // Catalyst 实例销毁时清理资源
        try {
            // 停止服务和通知
            val serviceIntent = Intent(reactApplicationContext, AudioService::class.java)
            serviceIntent.action = AudioService.ACTION_STOP
            reactApplicationContext.startService(serviceIntent)
        } catch (e: Exception) {
            e.printStackTrace()
        }
        _internalRelease()
    }

    private val progressRunnable = object : Runnable {
        override fun run() {
            val currentPlayer = player ?: return
            try {
                if (currentPlayer.isPlaying) {
                    val params = Arguments.createMap().apply {
                        putDouble("position", currentPlayer.currentPosition.toDouble())
                        putDouble("duration", currentPlayer.duration.toDouble())
                    }
                    sendEvent("onProgress", params)
                    progressHandler.postDelayed(this, progressIntervalMs)
                }
            } catch (_: Exception) {
                stopProgressUpdates()
            }
        }
    }

    override fun getName(): String {
        return "AudioModule"
    }

    private fun ensureMediaSession() {
        if (mediaSession != null) return

        val session = MediaSession(reactApplicationContext, "RNAudioModule")
        session.setFlags(
            MediaSession.FLAG_HANDLES_MEDIA_BUTTONS or 
            MediaSession.FLAG_HANDLES_TRANSPORT_CONTROLS
        )
        
        session.setCallback(object : MediaSession.Callback() {
            override fun onPlay() {
                internalResume()
                sendEvent("onRemotePlay", null)
            }

            override fun onPause() {
                internalPause()
                sendEvent("onRemotePause", null)
            }

            override fun onStop() {
                internalStop()
                sendEvent("onRemoteStop", null)
            }

            override fun onSkipToNext() {
                sendEvent("onRemoteNext", null)
            }

            override fun onSkipToPrevious() {
                sendEvent("onRemotePrevious", null)
            }

            override fun onSeekTo(pos: Long) {
                player?.seekTo(pos.toInt())
                sendEvent("onRemoteSeek", Arguments.createMap().apply {
                    putDouble("position", pos.toDouble())
                })
            }
        })
        
        session.isActive = true
        mediaSession = session
        updatePlaybackState(PlaybackState.STATE_STOPPED)
    }

    private fun updatePlaybackState(state: Int) {
        val actions = PlaybackState.ACTION_PLAY or
                PlaybackState.ACTION_PAUSE or
                PlaybackState.ACTION_STOP or
                PlaybackState.ACTION_SEEK_TO or
                PlaybackState.ACTION_SKIP_TO_NEXT or
                PlaybackState.ACTION_SKIP_TO_PREVIOUS or
                PlaybackState.ACTION_PLAY_PAUSE

        val position = try {
            player?.currentPosition?.toLong() ?: 0L
        } catch (_: Exception) {
            0L
        }

        mediaSession?.setPlaybackState(
            PlaybackState.Builder()
                .setActions(actions)
                .setState(state, position, 1.0f)
                .build()
        )
    }

    internal fun internalPause() {
        player?.pause()
        stopProgressUpdates()
        updatePlaybackState(PlaybackState.STATE_PAUSED)

        // 通知服务：切换通知按钮为“继续播放”并释放唤醒锁
        val serviceIntent = Intent(reactApplicationContext, AudioService::class.java)
        serviceIntent.action = AudioService.ACTION_SET_PAUSED
        reactApplicationContext.startService(serviceIntent)

        // 暂停时保留通知栏与前台服务，便于用户从通知继续播放
        sendEvent("onPause", null)
    }

    internal fun internalResume() {
        // 恢复时启动前台服务
        val serviceIntent = Intent(reactApplicationContext, AudioService::class.java)
        serviceIntent.action = AudioService.ACTION_PLAY
        reactApplicationContext.startService(serviceIntent)
        
        player?.start()
        startProgressUpdates()
        updatePlaybackState(PlaybackState.STATE_PLAYING)
        sendEvent("onResume", null)
    }

    private fun internalStop() {
        try {
            player?.stop()
            player?.reset()
        } catch (e: Exception) {
            e.printStackTrace()
        }
        
        stopProgressUpdates()
        updatePlaybackState(PlaybackState.STATE_STOPPED)
        
        // 停止前台服务
        try {
            val serviceIntent = Intent(reactApplicationContext, AudioService::class.java)
            serviceIntent.action = AudioService.ACTION_STOP
            reactApplicationContext.startService(serviceIntent)
        } catch (e: Exception) {
            e.printStackTrace()
        }
        
        sendEvent("onStop", null)
    }

    @ReactMethod
    fun initPlayer() {
        // 重置销毁标志
        isDestroyed = false
        
        if (player == null) {
            player = MediaPlayer()
        }
        ensureMediaSession()
    }

    @ReactMethod
    fun play(url: String, promise: Promise) {
        // 重置销毁标志以支持重新启动
        isDestroyed = false
        
        var settled = false
        try {
            // 启动前台服务保持应用活跃
            val serviceIntent = Intent(reactApplicationContext, AudioService::class.java)
            serviceIntent.action = AudioService.ACTION_PLAY
            reactApplicationContext.startService(serviceIntent)
            
            ensureMediaSession()  // 确保 MediaSession 已初始化
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
                stopProgressUpdates()
                updatePlaybackState(PlaybackState.STATE_ERROR)
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
                startProgressUpdates()
                updatePlaybackState(PlaybackState.STATE_PLAYING)
                sendEvent("onPlay", Arguments.createMap().apply { putString("url", url) })
                if (!settled) {
                    settled = true
                    promise.resolve(true)
                }
            }
            currentPlayer.setOnCompletionListener {
                stopProgressUpdates()
                updatePlaybackState(PlaybackState.STATE_STOPPED)
                sendEvent("onComplete", null)
            }

            currentPlayer.setDataSource(reactApplicationContext, uri)
            currentPlayer.prepareAsync()
        } catch (e: Exception) {
            stopProgressUpdates()
            updatePlaybackState(PlaybackState.STATE_ERROR)
            if (!settled) {
                settled = true
                promise.reject("E_PLAY_INIT", e.message ?: "play failed", e)
            }
            sendEvent("onError", Arguments.createMap().apply { putString("message", e.message ?: "play failed") })
        }
    }

    @ReactMethod
    fun pause(promise: Promise) {
        ensureMediaSession()
        internalPause()
        promise.resolve(true)
    }

    @ReactMethod
    fun resume(promise: Promise) {
        try {
            // 重置销毁标志
            isDestroyed = false
            
            ensureMediaSession()
            
            // 如果 player 为 null，说明是新的或被销毁了，需要初始化
            if (player == null) {
                initPlayer()
            }
            
            val currentPlayer = player
            if (currentPlayer == null) {
                promise.reject("E_NO_PLAYER", "Player initialization failed")
                return
            }

            internalResume()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("E_RESUME", e.message ?: "resume failed", e)
            sendEvent("onError", Arguments.createMap().apply { putString("message", e.message ?: "resume failed") })
        }
    }

    @ReactMethod
    fun stop(promise: Promise) {
        internalStop()
        
        // 停止前台服务
        val serviceIntent = Intent(reactApplicationContext, AudioService::class.java)
        serviceIntent.action = AudioService.ACTION_STOP
        reactApplicationContext.startService(serviceIntent)
        
        promise.resolve(true)
    }

    @ReactMethod
    fun seekTo(ms: Int, promise: Promise) {
        player?.seekTo(ms)
        promise.resolve(true)
    }

    @ReactMethod
    fun release() {
        if (isDestroyed) return
        _internalRelease()
    }
    
    private fun _internalRelease() {
        // 注意：不设置 isDestroyed = true 以支持重启
        
        try {
            stopProgressUpdates()
        } catch (e: Exception) {
            e.printStackTrace()
        }
        
        try {
            player?.stop()
        } catch (e: Exception) {
            e.printStackTrace()
        }
        
        try {
            player?.release()
        } catch (e: Exception) {
            e.printStackTrace()
        }
        
        player = null
        
        try {
            mediaSession?.isActive = false
        } catch (e: Exception) {
            e.printStackTrace()
        }
        
        try {
            mediaSession?.release()
        } catch (e: Exception) {
            e.printStackTrace()
        }
        
        mediaSession = null
        
        // 停止前台服务
        try {
            val serviceIntent = Intent(reactApplicationContext, AudioService::class.java)
            serviceIntent.action = AudioService.ACTION_STOP
            reactApplicationContext.startService(serviceIntent)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
    
    // 公共方法用于外部强制停止播放
    fun forceStop() {
        _internalRelease()
    }

    internal fun handleMediaButton(action: String) {
        when (action) {
            "play" -> {
                if (player != null && !player!!.isPlaying) {
                    internalResume()
                }
            }
            "pause" -> {
                if (player != null && player!!.isPlaying) {
                    internalPause()
                }
            }
            "playPause" -> {
                if (player == null) {
                    return
                }
                if (player!!.isPlaying) {
                    internalPause()
                } else {
                    internalResume()
                }
            }
            "next" -> sendEvent("onRemoteNext", null)
            "previous" -> sendEvent("onRemotePrevious", null)
            "stop" -> internalStop()
        }
    }

    private fun startProgressUpdates() {
        progressHandler.removeCallbacks(progressRunnable)
        progressHandler.post(progressRunnable)
    }

    private fun stopProgressUpdates() {
        progressHandler.removeCallbacks(progressRunnable)
    }

    private fun sendEvent(eventName: String, params: WritableMap?) {
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, params)
    }

    companion object {
        private var currentInstance: AudioModule? = null

        fun setCurrentInstance(instance: AudioModule) {
            currentInstance = instance
        }

        fun forceStopPlayback() {
            try {
                currentInstance?.forceStop()
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }

        fun pausePlayback() {
            try {
                currentInstance?.internalPause()
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }

        fun resumePlayback() {
            try {
                currentInstance?.internalResume()
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }

        fun notifyPrevious() {
            try {
                currentInstance?.sendEvent("onRemotePrevious", null)
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }

        fun notifyNext() {
            try {
                currentInstance?.sendEvent("onRemoteNext", null)
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }
}
