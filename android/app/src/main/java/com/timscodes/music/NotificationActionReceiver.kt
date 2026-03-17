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
        }
    }
}
