package com.iptv.tvbox

object M3uParser {
    fun parse(text: String, sourceId: String): List<Channel> {
        val channels = mutableListOf<Channel>()
        var pendingName: String? = null
        var pendingGroup = "未分组"
        var pendingLogo: String? = null

        text.lineSequence().forEach { raw ->
            val line = raw.trim()
            if (line.isEmpty() || line == "#EXTM3U") return@forEach
            if (line.startsWith("#EXTINF:")) {
                val comma = line.lastIndexOf(',')
                val meta = if (comma >= 0) line.substring(0, comma) else line
                pendingName = (if (comma >= 0) line.substring(comma + 1) else "未命名频道").trim()
                    .ifEmpty { "未命名频道" }
                pendingGroup = attr(meta, "group-title")?.trim().orEmpty().ifEmpty { "未分组" }
                pendingLogo = attr(meta, "tvg-logo")
                return@forEach
            }
            if (line.startsWith("#")) return@forEach
            val name = pendingName
            if (name != null && (line.startsWith("http://") || line.startsWith("https://"))) {
                channels += Channel(
                    id = hash("$sourceId|$name|$line"),
                    name = name,
                    url = line,
                    group = pendingGroup,
                    logo = pendingLogo,
                    sourceId = sourceId,
                )
                pendingName = null
            }
        }
        return channels
    }

    private fun attr(source: String, key: String): String? {
        val quoted = Regex("$key=\"([^\"]*)\"", RegexOption.IGNORE_CASE).find(source)
        if (quoted != null) return quoted.groupValues[1]
        val bare = Regex("$key=([^,\\s]+)", RegexOption.IGNORE_CASE).find(source)
        return bare?.groupValues?.get(1)
    }

    private fun hash(input: String): String {
        var value = 0
        for (ch in input) {
            value = (value * 31 + ch.code)
        }
        return kotlin.math.abs(value).toString(36)
    }
}
