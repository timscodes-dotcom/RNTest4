package com.timscodes.music

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class NotificationActionReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context?, intent: Intent?) {
        if (context == null || intent == null) return
        
        when (intent.action) {
            AudioService.ACTION_PAUSE -> {
                // 暂停播放
                try {
                    AudioModule.pausePlayback()
                } catch (e: Exception) {
                    e.printStackTrace()
                }
            }
            AudioService.ACTION_PLAY_RESUME -> {
                // 恢复播放
                try {
                    AudioModule.resumePlayback()
                } catch (e: Exception) {
                    e.printStackTrace()
                }
            }
            AudioService.ACTION_PREV -> {
                // 仅把上一首点击事件发给 JS
                try {
                    AudioModule.notifyPrevious()
                } catch (e: Exception) {
                    e.printStackTrace()
                }
            }
            AudioService.ACTION_NEXT -> {
                // 仅把下一首点击事件发给 JS
                try {
                    AudioModule.notifyNext()
                } catch (e: Exception) {
                    e.printStackTrace()
                }
            }
        }
    }
}
