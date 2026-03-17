package com.timscodes.music

import android.app.Service
import android.app.NotificationManager
import android.app.NotificationChannel
import android.app.PendingIntent
import android.content.Intent
import android.os.IBinder
import android.os.PowerManager
import androidx.core.app.NotificationCompat
import android.content.Context

class AudioService : Service() {

    private var wakeLock: PowerManager.WakeLock? = null
    private val NOTIFICATION_ID = 1001
    private val CHANNEL_ID = "audio_playback_channel"

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        
        // 获取WakeLock，防止设备进入睡眠状态
        val powerManager = getSystemService(Context.POWER_SERVICE) as PowerManager
        wakeLock = powerManager.newWakeLock(
            PowerManager.PARTIAL_WAKE_LOCK,
            "AudioService::audioPlayback"
        )
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ACTION_PLAY) {
            try {
                startForegroundPlayback(true)
                if (wakeLock?.isHeld == false) {
                    wakeLock?.acquire()
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        } else if (intent?.action == ACTION_SET_PAUSED) {
            try {
                // 暂停后保留通知，并切换按钮为“继续播放”
                updateNotification(false)
                if (wakeLock?.isHeld == true) {
                    wakeLock?.release()
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        } else if (intent?.action == ACTION_STOP) {
            stopPlayback()
        }
        return START_STICKY
    }

    private fun stopPlayback() {
        try {
            stopForeground(STOP_FOREGROUND_REMOVE)
        } catch (e: Exception) {
            e.printStackTrace()
        }
        try {
            if (wakeLock?.isHeld == true) {
                wakeLock?.release()
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
        stopSelf()
    }

    private fun startForegroundPlayback(isPlaying: Boolean) {
        // 确保通知频道已创建
        createNotificationChannel()

        val notification = buildNotification(isPlaying)

        try {
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                startForeground(NOTIFICATION_ID, notification, android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK)
            } else {
                startForeground(NOTIFICATION_ID, notification)
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun updateNotification(isPlaying: Boolean) {
        createNotificationChannel()
        val notification = buildNotification(isPlaying)
        try {
            val manager = getSystemService(NotificationManager::class.java)
            manager?.notify(NOTIFICATION_ID, notification)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun buildNotification(isPlaying: Boolean): android.app.Notification {
        // 创建点击通知时的意图 - 跳转到 MainActivity
        val notificationIntent = Intent(this, MainActivity::class.java)
        notificationIntent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            notificationIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        
        // 创建暂停按钮意图
        val pauseIntent = Intent(this, NotificationActionReceiver::class.java)
        pauseIntent.action = ACTION_PAUSE
        val pausePendingIntent = PendingIntent.getBroadcast(
            this,
            1,
            pauseIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        
        // 创建播放按钮意图
        val playIntent = Intent(this, NotificationActionReceiver::class.java)
        playIntent.action = ACTION_PLAY_RESUME
        val playPendingIntent = PendingIntent.getBroadcast(
            this,
            2,
            playIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        // 创建上一首按钮意图
        val prevIntent = Intent(this, NotificationActionReceiver::class.java)
        prevIntent.action = ACTION_PREV
        val prevPendingIntent = PendingIntent.getBroadcast(
            this,
            3,
            prevIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        // 创建下一首按钮意图
        val nextIntent = Intent(this, NotificationActionReceiver::class.java)
        nextIntent.action = ACTION_NEXT
        val nextPendingIntent = PendingIntent.getBroadcast(
            this,
            4,
            nextIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val actionIcon = if (isPlaying) android.R.drawable.ic_media_pause else android.R.drawable.ic_media_play
        val actionText = if (isPlaying) "暂停" else "继续播放"
        val actionIntent = if (isPlaying) pausePendingIntent else playPendingIntent

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(if (isPlaying) "音乐播放中..." else "音乐已暂停")
            //.setContentText("正在播放音乐...")
            .setContentText("")
            .setSmallIcon(android.R.drawable.ic_media_play)
            .setContentIntent(pendingIntent)  // 点击通知时的动作
            .addAction(android.R.drawable.ic_media_previous, "prev", prevPendingIntent)
            .addAction(actionIcon, actionText, actionIntent)
            .addAction(android.R.drawable.ic_media_next, "next", nextPendingIntent)
            .setOngoing(true)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setShowWhen(false)
            .setAutoCancel(false)
            .build()
    }

    private fun createNotificationChannel() {
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "音乐播放",
                NotificationManager.IMPORTANCE_LOW
            )
            channel.description = "音乐播放器通知"
            
            val manager = getSystemService(NotificationManager::class.java)
            manager?.createNotificationChannel(channel)
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onTaskRemoved(rootIntent: Intent?) {
        // 用户从最近任务中关闭应用时，强制停止播放并移除通知
        try {
            AudioModule.forceStopPlayback()
        } catch (e: Exception) {
            e.printStackTrace()
        }
        stopPlayback()
        super.onTaskRemoved(rootIntent)
    }

    override fun onDestroy() {
        super.onDestroy()
        try {
            if (wakeLock?.isHeld == true) {
                wakeLock?.release()
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
        try {
            stopForeground(STOP_FOREGROUND_REMOVE)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    companion object {
        const val ACTION_PLAY = "com.timscodes.music.ACTION_PLAY"
        const val ACTION_STOP = "com.timscodes.music.ACTION_STOP"
        const val ACTION_PAUSE = "com.timscodes.music.ACTION_PAUSE"
        const val ACTION_PLAY_RESUME = "com.timscodes.music.ACTION_PLAY_RESUME"
        const val ACTION_PREV = "com.timscodes.music.ACTION_PREV"
        const val ACTION_NEXT = "com.timscodes.music.ACTION_NEXT"
        const val ACTION_SET_PAUSED = "com.timscodes.music.ACTION_SET_PAUSED"
        
        // 静态方法用于强制停止所有播放
        fun stopAllPlayback(context: Context) {
            try {
                val serviceIntent = Intent(context, AudioService::class.java)
                serviceIntent.action = ACTION_STOP
                context.startService(serviceIntent)
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }
}
