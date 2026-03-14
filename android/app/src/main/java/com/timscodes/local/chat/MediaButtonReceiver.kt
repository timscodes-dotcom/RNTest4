package com.timscodes.local.chat

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.view.KeyEvent

class MediaButtonReceiver : BroadcastReceiver() {
    companion object {
        private var audioModuleInstance: AudioModule? = null
        
        fun setAudioModule(instance: AudioModule) {
            audioModuleInstance = instance
        }
    }

    override fun onReceive(context: Context, intent: Intent) {
        val keyEvent = intent.getParcelableExtra<KeyEvent>(Intent.EXTRA_KEY_EVENT)
        if (intent.action == Intent.ACTION_MEDIA_BUTTON && keyEvent != null) {
            if (keyEvent.action == KeyEvent.ACTION_DOWN) {
                when (keyEvent.keyCode) {
                    KeyEvent.KEYCODE_MEDIA_PLAY -> {
                        audioModuleInstance?.handleMediaButton("play")
                    }
                    KeyEvent.KEYCODE_MEDIA_PAUSE -> {
                        audioModuleInstance?.handleMediaButton("pause")
                    }
                    KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE -> {
                        audioModuleInstance?.handleMediaButton("playPause")
                    }
                    KeyEvent.KEYCODE_MEDIA_NEXT -> {
                        audioModuleInstance?.handleMediaButton("next")
                    }
                    KeyEvent.KEYCODE_MEDIA_PREVIOUS -> {
                        audioModuleInstance?.handleMediaButton("previous")
                    }
                    KeyEvent.KEYCODE_MEDIA_STOP -> {
                        audioModuleInstance?.handleMediaButton("stop")
                    }
                }
            }
            abortBroadcast()
        }
    }
}
