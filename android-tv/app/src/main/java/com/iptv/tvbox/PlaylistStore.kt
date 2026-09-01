package com.iptv.tvbox

import android.content.Context
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.util.concurrent.TimeUnit

class PlaylistStore(context: Context) {
    private val file = File(context.filesDir, "iptv-state.json")
    private val http = OkHttpClient.Builder()
        .connectTimeout(20, TimeUnit.SECONDS)
        .readTimeout(40, TimeUnit.SECONDS)
        .followRedirects(true)
        .followSslRedirects(true)
        .build()

    var playlists: MutableList<PlaylistRecord> = mutableListOf()
        private set
    var channels: MutableList<Channel> = mutableListOf()
        private set
    var lastChannelId: String? = null

    init {
        load()
    }

    fun grouped(query: String = ""): List<Pair<String, List<Channel>>> {
        val q = query.trim().lowercase()
        val filtered = if (q.isEmpty()) channels else channels.filter {
            it.name.lowercase().contains(q) || it.group.lowercase().contains(q)
        }
        return filtered.groupBy { it.group }
            .toSortedMap(compareBy { it })
            .map { it.key to it.value }
    }

    fun importUrl(id: String, name: String, url: String): Int {
        if (!SafeUri.isPlaylist(url)) error("只允许从 http/https 导入播放列表")
        val body = download(url)
        val parsed = M3uParser.parse(body, id)
        if (parsed.isEmpty()) error("没有解析到频道")
        playlists.removeAll { it.id == id }
        channels.removeAll { it.sourceId == id }
        playlists.add(0, PlaylistRecord(id, name, url, parsed.size))
        channels.addAll(parsed)
        if (lastChannelId == null) lastChannelId = parsed.first().id
        save()
        return parsed.size
    }

    fun importDefaults(): Int {
        var total = 0
        for (id in KnownPlaylists.defaultIds) {
            val known = KnownPlaylists.all.first { it.id == id }
            total += importUrl(known.id, known.name, known.url)
        }
        return total
    }

    fun setCurrent(id: String) {
        lastChannelId = id
        save()
    }

    fun current(): Channel? {
        return channels.firstOrNull { it.id == lastChannelId } ?: channels.firstOrNull()
    }

    private fun download(url: String): String {
        val request = Request.Builder()
            .url(url)
            .header("User-Agent", "VLC/3.0.20 LibVLC/3.0.20")
            .header("Accept", "*/*")
            .build()
        http.newCall(request).execute().use { response ->
            val body = response.body?.string().orEmpty()
            if (!response.isSuccessful) error("源站返回 ${response.code}")
            return body
        }
    }

    private fun load() {
        if (!file.exists()) return
        runCatching {
            val root = JSONObject(file.readText())
            lastChannelId = root.optString("lastChannelId").ifBlank { null }
            val plist = root.optJSONArray("playlists") ?: JSONArray()
            for (i in 0 until plist.length()) {
                val item = plist.getJSONObject(i)
                playlists += PlaylistRecord(
                    item.getString("id"),
                    item.getString("name"),
                    item.optString("url"),
                    item.optInt("channelCount"),
                )
            }
            val clist = root.optJSONArray("channels") ?: JSONArray()
            for (i in 0 until clist.length()) {
                val item = clist.getJSONObject(i)
                val url = item.getString("url")
                if (!SafeUri.isStream(url)) continue
                channels += Channel(
                    id = item.getString("id"),
                    name = item.getString("name"),
                    url = url,
                    group = item.optString("group", "未分组"),
                    logo = item.optString("logo").ifBlank { null }?.takeIf { SafeUri.isHttpImage(it) },
                    sourceId = item.optString("sourceId"),
                )
            }
        }
    }

    private fun save() {
        val root = JSONObject()
        root.put("lastChannelId", lastChannelId ?: "")
        val plist = JSONArray()
        playlists.forEach {
            plist.put(
                JSONObject()
                    .put("id", it.id)
                    .put("name", it.name)
                    .put("url", it.url)
                    .put("channelCount", it.channelCount),
            )
        }
        val clist = JSONArray()
        channels.forEach {
            clist.put(
                JSONObject()
                    .put("id", it.id)
                    .put("name", it.name)
                    .put("url", it.url)
                    .put("group", it.group)
                    .put("logo", it.logo ?: "")
                    .put("sourceId", it.sourceId),
            )
        }
        root.put("playlists", plist)
        root.put("channels", clist)
        file.writeText(root.toString())
    }
}
