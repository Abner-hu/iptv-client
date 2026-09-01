package com.iptv.tvbox

import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.View
import android.view.WindowInsets
import android.view.WindowInsetsController
import android.view.WindowManager
import android.widget.Button
import android.widget.EditText
import android.widget.ImageButton
import android.widget.LinearLayout
import android.widget.ProgressBar
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
    private lateinit var fullscreenButton: ImageButton
    private var fullscreen = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
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
        findViewById<Button>(R.id.importMore).setOnClickListener { showImportDialog() }
        findViewById<Button>(R.id.importMoreHeader).setOnClickListener { showImportDialog() }
        findViewById<Button>(R.id.importEmptyMore).setOnClickListener { showImportDialog() }
        findViewById<Button>(R.id.copyrightButton).setOnClickListener { showCopyright() }
        search.doAfterTextChanged { renderList() }

        render()
        store.current()?.let { play(it) }
        findViewById<Button>(R.id.importKnown).requestFocus()
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
    }

    private fun setFullscreen(on: Boolean) {
        fullscreen = on
        val vis = if (on) View.GONE else View.VISIBLE
        findViewById<View>(R.id.topBar).visibility = vis
        findViewById<View>(R.id.channelPane).visibility = vis
        findViewById<View>(R.id.searchInput).visibility = vis
        fullscreenButton.setImageResource(
            if (on) R.drawable.ic_fullscreen_exit else R.drawable.ic_fullscreen,
        )
        fullscreenButton.contentDescription = if (on) "退出全屏" else "全屏"
        applySystemBars(on)
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
        countBadge.text = "${store.channels.size} 频道"
        renderList()
    }

    private fun renderList() {
        adapter.submit(store.grouped(search.text?.toString().orEmpty()))
        adapter.selectedId = store.lastChannelId
    }

    private fun play(channel: Channel) {
        store.setCurrent(channel.id)
        adapter.selectedId = channel.id
        nowPlaying.text = channel.name
        status.text = channel.group
        progress.visibility = View.VISIBLE
        val exo = player ?: return
        exo.setMediaItem(MediaItem.fromUri(channel.url))
        exo.prepare()
        exo.play()
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

    private fun showImportDialog() {
        val names = KnownPlaylists.all.map { "${it.name}  ·  ${it.region}" }.toTypedArray()
        val checked = BooleanArray(names.size)
        KnownPlaylists.all.forEachIndexed { index, item ->
            checked[index] = store.playlists.any { it.id == item.id } || item.id in KnownPlaylists.defaultIds
        }
        AlertDialog.Builder(this, R.style.TvDialog)
            .setTitle("导入已知 M3U")
            .setMultiChoiceItems(names, checked) { _, which, isChecked ->
                checked[which] = isChecked
            }
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
            .show()
    }

    private fun busy(on: Boolean) {
        progress.visibility = if (on) View.VISIBLE else View.GONE
        findViewById<Button>(R.id.importKnown).isEnabled = !on
        findViewById<Button>(R.id.importMore).isEnabled = !on
        findViewById<Button>(R.id.importMoreHeader).isEnabled = !on
        findViewById<Button>(R.id.importEmptyMore).isEnabled = !on
    }

    override fun onStop() {
        super.onStop()
        player?.pause()
    }

    override fun onDestroy() {
        player?.release()
        player = null
        super.onDestroy()
    }
}
