package com.iptv.tvbox

import java.net.URI

object SafeUri {
    private val playlistSchemes = setOf("http", "https")
    private val streamSchemes = setOf("http", "https", "rtsp", "rtsps", "rtmp", "rtmps")

    fun scheme(url: String): String? {
        return runCatching { URI(url.trim()).scheme?.lowercase() }.getOrNull()
    }

    fun isPlaylist(url: String): Boolean = scheme(url) in playlistSchemes

    fun isStream(url: String): Boolean = scheme(url) in streamSchemes

    fun isHttpImage(url: String): Boolean = scheme(url) in playlistSchemes
}
