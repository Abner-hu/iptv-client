package com.iptv.tvbox

import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.KeyEvent
import android.view.MotionEvent
import android.view.View
import android.view.WindowInsets
import android.view.WindowInsetsController
import android.view.WindowManager
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.SeekBar
import android.widget.TextView
import android.widget.Toast
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.widget.doAfterTextChanged
import androidx.media3.common.AudioAttributes
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import androidx.media3.datasource.DefaultHttpDataSource
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory
import androidx.media3.ui.PlayerView
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import java.util.concurrent.Executors

class MainActivity : AppCompatActivity() {
    companion object {
        private const val CHROME_IDLE_MS = 5000L
    }
    private val io = Executors.newSingleThreadExecutor()
    private val main = Handler(Looper.getMainLooper())
    private lateinit var store: PlaylistStore
    private lateinit var adapter: ChannelAdapter
    private var player: ExoPlayer? = null

    private lateinit var emptyState: LinearLayout
    private lateinit var content: View
    private lateinit var status: TextView
    private lateinit var nowPlaying: TextView
    private lateinit var progress: ProgressBar
    private lateinit var search: EditText
    private lateinit var countBadge: TextView
    private lateinit var fullscreenButton: Button
    private lateinit var volumeBar: SeekBar
    private lateinit var playerMeta: View
    private lateinit var playerControls: View
    private lateinit var showAllButton: Button
    private var fullscreen = false
    private var recentOnly = false
    private val hideChrome = Runnable {
        if (fullscreen) setChromeVisible(false)
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        sanitizeLaunchIntent()
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        setContentView(R.layout.activity_main)
        store = PlaylistStore(this)

        emptyState = findViewById(R.id.emptyState)
        content = findViewById(R.id.content)
        status = findViewById(R.id.statusText)
        nowPlaying = findViewById(R.id.nowPlaying)
        progress = findViewById(R.id.progress)
        search = findViewById(R.id.searchInput)
        countBadge = findViewById(R.id.countBadge)
        fullscreenButton = findViewById(R.id.fullscreenButton)
        fullscreenButton.setOnClickListener { setFullscreen(!fullscreen) }
        playerMeta = findViewById(R.id.playerMeta)
        playerControls = findViewById(R.id.playerControls)
        findViewById<Button>(R.id.prevChannel).setOnClickListener { skipChannel(-1) }
        findViewById<Button>(R.id.nextChannel).setOnClickListener { skipChannel(1) }
        volumeBar = findViewById(R.id.volumeBar)
        volumeBar.setOnSeekBarChangeListener(object : SeekBar.OnSeekBarChangeListener {
            override fun onProgressChanged(seekBar: SeekBar?, progress: Int, fromUser: Boolean) {
                player?.volume = progress / 100f
            }

            override fun onStartTrackingTouch(seekBar: SeekBar?) {
                bumpChrome()
            }

            override fun onStopTrackingTouch(seekBar: SeekBar?) {
                bumpChrome()
            }
        })

        onBackPressedDispatcher.addCallback(
            this,
            object : OnBackPressedCallback(true) {
                override fun handleOnBackPressed() {
                    if (fullscreen) {
                        setFullscreen(false)
                    } else {
                        isEnabled = false
                        onBackPressedDispatcher.onBackPressed()
                        isEnabled = true
                    }
                }
            },
        )

        adapter = ChannelAdapter { play(it) }
        findViewById<RecyclerView>(R.id.channelList).apply {
            layoutManager = LinearLayoutManager(this@MainActivity)
            adapter = this@MainActivity.adapter
            itemAnimator = null
        }

        setupPlayer()
        findViewById<Button>(R.id.importKnown).setOnClickListener { importDefaults() }
        findViewById<Button>(R.id.importEmptyMore).setOnClickListener { showImportDialog() }
        findViewById<Button>(R.id.settingsButton).setOnClickListener { showSettings() }
        findViewById<Button>(R.id.copyrightButton).setOnClickListener { showCopyright() }
        showAllButton = findViewById(R.id.importMore)
        showAllButton.setOnClickListener {
            recentOnly = false
            render()
        }
        search.doAfterTextChanged { renderList() }

        render()
        store.current()?.let { play(it) }
        findViewById<Button>(R.id.importKnown).requestFocus()
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        sanitizeLaunchIntent()
    }

    private fun sanitizeLaunchIntent() {
        val incoming = intent ?: return
        if (incoming.action != null && incoming.action != Intent.ACTION_MAIN) {
            setIntent(Intent(this, MainActivity::class.java).setAction(Intent.ACTION_MAIN))
        }
    }

    private fun setupPlayer() {
        val http = DefaultHttpDataSource.Factory()
            .setUserAgent("VLC/3.0.20 LibVLC/3.0.20")
            .setAllowCrossProtocolRedirects(true)
            .setConnectTimeoutMs(12_000)
            .setReadTimeoutMs(20_000)
        val exo = ExoPlayer.Builder(this)
            .setMediaSourceFactory(DefaultMediaSourceFactory(http))
            .build()
        exo.setAudioAttributes(
            AudioAttributes.Builder()
                .setUsage(C.USAGE_MEDIA)
                .setContentType(C.AUDIO_CONTENT_TYPE_MOVIE)
                .build(),
            true,
        )
        exo.playWhenReady = true
        exo.addListener(object : Player.Listener {
            override fun onPlayerError(error: PlaybackException) {
                status.text = "此频道暂时无法播放，请换一个。公开源线路不稳定。"
            }

            override fun onPlaybackStateChanged(playbackState: Int) {
                if (playbackState == Player.STATE_READY) {
                    status.text = "正在直播"
                    progress.visibility = View.GONE
                }
                if (playbackState == Player.STATE_BUFFERING) {
                    progress.visibility = View.VISIBLE
                }
            }
        })
        findViewById<PlayerView>(R.id.playerView).player = exo
        player = exo
        exo.volume = volumeBar.progress / 100f
    }

    private fun setFullscreen(on: Boolean) {
        fullscreen = on
        val vis = if (on) View.GONE else View.VISIBLE
        findViewById<View>(R.id.topBar).visibility = vis
        findViewById<View>(R.id.channelPane).visibility = vis
        findViewById<View>(R.id.searchInput).visibility = vis
        fullscreenButton.text = if (on) "退出全屏" else "全屏显示"
        applySystemBars(on)
        if (on) bumpChrome() else {
            main.removeCallbacks(hideChrome)
            setChromeVisible(true)
        }
    }

    private fun bumpChrome() {
        setChromeVisible(true)
        main.removeCallbacks(hideChrome)
        if (fullscreen) main.postDelayed(hideChrome, CHROME_IDLE_MS)
    }

    private fun setChromeVisible(on: Boolean) {
        val vis = if (on) View.VISIBLE else View.GONE
        playerMeta.visibility = vis
        playerControls.visibility = vis
    }

    private fun applySystemBars(on: Boolean) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            val controller = window.insetsController ?: return
            if (on) {
                controller.hide(WindowInsets.Type.systemBars())
                controller.systemBarsBehavior =
                    WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
            } else {
                controller.show(WindowInsets.Type.systemBars())
            }
        } else {
            @Suppress("DEPRECATION")
            window.decorView.systemUiVisibility = if (on) {
                (
                    View.SYSTEM_UI_FLAG_FULLSCREEN
                        or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                        or View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                        or View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                        or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                        or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                    )
            } else {
                View.SYSTEM_UI_FLAG_VISIBLE
            }
        }
    }

    private fun render() {
        val empty = store.channels.isEmpty()
        emptyState.visibility = if (empty) View.VISIBLE else View.GONE
        content.visibility = if (empty) View.GONE else View.VISIBLE
        if (empty) recentOnly = false
        countBadge.text = if (recentOnly) {
            "最近播放 · ${store.recentChannels().size}"
        } else {
            "${store.channels.size} 频道"
        }
        showAllButton.visibility = if (!empty && recentOnly) View.VISIBLE else View.GONE
        renderList()
    }

    private fun renderList() {
        adapter.submit(store.grouped(search.text?.toString().orEmpty(), recentOnly))
        adapter.selectedId = store.lastChannelId
    }

    private fun play(channel: Channel) {
        if (!SafeUri.isStream(channel.url)) {
            status.text = "频道地址不安全，已拒绝播放"
            progress.visibility = View.GONE
            return
        }
        store.setCurrent(channel.id)
        adapter.selectedId = channel.id
        nowPlaying.text = channel.name
        status.text = channel.group
        progress.visibility = View.VISIBLE
        val exo = player ?: return
        exo.setMediaItem(MediaItem.fromUri(channel.url))
        exo.prepare()
        exo.play()
        if (fullscreen) bumpChrome()
    }

    private fun skipChannel(delta: Int) {
        adapter.skip(store.lastChannelId, delta)?.let { play(it) }
    }

    private fun importDefaults() {
        busy(true)
        status.text = "正在导入公开源…"
        io.execute {
            runCatching { store.importDefaults() }
                .onSuccess { count ->
                    main.post {
                        busy(false)
                        render()
                        store.current()?.let { play(it) }
                        Toast.makeText(this, "已导入 $count 个频道", Toast.LENGTH_SHORT).show()
                        findViewById<RecyclerView>(R.id.channelList).requestFocus()
                    }
                }
                .onFailure { error ->
                    main.post {
                        busy(false)
                        findViewById<TextView>(R.id.emptyHint).text =
                            error.message ?: "导入失败，请检查网络"
                    }
                }
        }
    }

    private fun showCopyright() {
        AlertDialog.Builder(this, R.style.TvDialog)
            .setTitle("版权信息")
            .setMessage(
                "软件名称：IPTV Client\n" +
                    "版权所有人：Abner Hu\n" +
                    "Copyright © 2026 Abner Hu. All rights reserved.\n\n" +
                    "内置频道列表来自 iptv-org 等公开源，版权归各播出机构所有。本软件仅提供播放器与列表导入功能。",
            )
            .setPositiveButton("关闭", null)
            .show()
    }

    private fun showSettings() {
        val body = layoutInflater.inflate(R.layout.dialog_settings, null)
        val dialog = AlertDialog.Builder(this, R.style.TvDialog)
            .setTitle("设置")
            .setView(body)
            .setNegativeButton("关闭", null)
            .create()
        body.findViewById<Button>(R.id.settingsRecent).setOnClickListener {
            dialog.dismiss()
            showRecent()
        }
        body.findViewById<Button>(R.id.settingsImport).setOnClickListener {
            dialog.dismiss()
            showImportDialog()
        }
        body.findViewById<Button>(R.id.settingsClear).setOnClickListener {
            dialog.dismiss()
            confirmClear()
        }
        dialog.show()
        val width = (resources.displayMetrics.widthPixels * 0.5f).toInt().coerceIn(360, 640)
        dialog.window?.setLayout(width, WindowManager.LayoutParams.WRAP_CONTENT)
        body.findViewById<Button>(R.id.settingsRecent).requestFocus()
    }

    private fun showRecent() {
        val recents = store.recentChannels()
        if (recents.isEmpty()) {
            Toast.makeText(this, "还没有最近播放的频道，先播放一个。", Toast.LENGTH_SHORT).show()
            return
        }
        recentOnly = true
        render()
        Toast.makeText(this, "正在显示最近播放的 ${recents.size} 个频道", Toast.LENGTH_SHORT).show()
        findViewById<RecyclerView>(R.id.channelList).requestFocus()
    }

    private fun confirmClear() {
        AlertDialog.Builder(this, R.style.TvDialog)
            .setTitle("清除 M3U")
            .setMessage("将删除全部已导入的播放列表和频道，此操作无法恢复。")
            .setPositiveButton("清除") { _, _ ->
                player?.stop()
                player?.clearMediaItems()
                store.clearAll()
                recentOnly = false
                nowPlaying.text = "IPTV Client"
                status.text = "选择频道开始播放"
                render()
                Toast.makeText(this, "已清除全部 M3U", Toast.LENGTH_SHORT).show()
                findViewById<Button>(R.id.importKnown).requestFocus()
            }
            .setNegativeButton("取消", null)
            .show()
    }

    private fun showImportDialog() {
        val checked = BooleanArray(KnownPlaylists.all.size)
        KnownPlaylists.all.forEachIndexed { index, item ->
            checked[index] = store.playlists.any { it.id == item.id } || item.id in KnownPlaylists.defaultIds
        }
        val body = layoutInflater.inflate(R.layout.dialog_import, null)
        val list = body.findViewById<RecyclerView>(R.id.importList)
        list.layoutManager = LinearLayoutManager(this)
        list.itemAnimator = null
        list.adapter = ImportSourceAdapter(KnownPlaylists.all, checked)
        val dialog = AlertDialog.Builder(this, R.style.TvDialog)
            .setTitle("导入 M3U")
            .setView(body)
            .setPositiveButton("导入") { _, _ ->
                val selected = KnownPlaylists.all.filterIndexed { index, _ -> checked[index] }
                if (selected.isEmpty()) {
                    Toast.makeText(this, "请至少选择一个列表", Toast.LENGTH_SHORT).show()
                    return@setPositiveButton
                }
                busy(true)
                io.execute {
                    runCatching {
                        var total = 0
                        selected.forEach { total += store.importUrl(it.id, it.name, it.url) }
                        total
                    }.onSuccess { total ->
                        main.post {
                            busy(false)
                            render()
                            store.current()?.let { play(it) }
                            Toast.makeText(this, "已导入 $total 个频道", Toast.LENGTH_SHORT).show()
                        }
                    }.onFailure { error ->
                        main.post {
                            busy(false)
                            Toast.makeText(this, error.message ?: "导入失败", Toast.LENGTH_LONG).show()
                        }
                    }
                }
            }
            .setNegativeButton("取消", null)
            .create()
        dialog.show()
        val width = (resources.displayMetrics.widthPixels * 0.72f).toInt().coerceAtLeast(480)
        dialog.window?.setLayout(width, WindowManager.LayoutParams.WRAP_CONTENT)
        list.post {
            list.findViewHolderForAdapterPosition(0)?.itemView?.requestFocus()
        }
    }

    private fun busy(on: Boolean) {
        progress.visibility = if (on) View.VISIBLE else View.GONE
        findViewById<Button>(R.id.importKnown).isEnabled = !on
        findViewById<Button>(R.id.importEmptyMore).isEnabled = !on
        findViewById<Button>(R.id.settingsButton).isEnabled = !on
        showAllButton.isEnabled = !on
    }

    override fun dispatchTouchEvent(ev: MotionEvent): Boolean {
        if (fullscreen && ev.action == MotionEvent.ACTION_DOWN) bumpChrome()
        return super.dispatchTouchEvent(ev)
    }

    override fun dispatchKeyEvent(event: KeyEvent): Boolean {
        if (fullscreen && event.action == KeyEvent.ACTION_DOWN) bumpChrome()
        return super.dispatchKeyEvent(event)
    }

    override fun onStop() {
        super.onStop()
        player?.pause()
    }

    override fun onDestroy() {
        main.removeCallbacks(hideChrome)
        player?.release()
        player = null
        super.onDestroy()
    }
}
