package com.iptv.tvbox

data class Channel(
    val id: String,
    val name: String,
    val url: String,
    val group: String,
    val logo: String?,
    val sourceId: String,
)

data class PlaylistRecord(
    val id: String,
    val name: String,
    val url: String,
    val channelCount: Int,
)

data class KnownPlaylist(
    val id: String,
    val name: String,
    val region: String,
    val description: String,
    val url: String,
)

object KnownPlaylists {
    private const val BASE = "https://iptv-org.github.io/iptv"

    val all: List<KnownPlaylist> = listOf(
        KnownPlaylist("cn", "中国内地", "亚洲", "iptv-org 公开源", "$BASE/countries/cn.m3u"),
        KnownPlaylist("hk", "香港", "亚洲", "香港地区公开频道", "$BASE/countries/hk.m3u"),
        KnownPlaylist("tw", "台湾", "亚洲", "台湾地区公开频道", "$BASE/countries/tw.m3u"),
        KnownPlaylist("mo", "澳门", "亚洲", "澳门地区公开频道", "$BASE/countries/mo.m3u"),
        KnownPlaylist("sg", "新加坡", "亚洲", "新加坡公开频道", "$BASE/countries/sg.m3u"),
        KnownPlaylist("jp", "日本", "亚洲", "日本公开频道", "$BASE/countries/jp.m3u"),
        KnownPlaylist("kr", "韩国", "亚洲", "韩国公开频道", "$BASE/countries/kr.m3u"),
        KnownPlaylist("us", "美国", "北美", "美国公开频道", "$BASE/countries/us.m3u"),
        KnownPlaylist("ca", "加拿大", "北美", "加拿大公开频道", "$BASE/countries/ca.m3u"),
        KnownPlaylist("gb", "英国", "欧洲", "英国公开频道", "$BASE/countries/uk.m3u"),
        KnownPlaylist("ie", "爱尔兰", "欧洲", "爱尔兰公开频道", "$BASE/countries/ie.m3u"),
        KnownPlaylist("au", "澳大利亚", "大洋洲", "澳大利亚公开频道", "$BASE/countries/au.m3u"),
        KnownPlaylist("nz", "新西兰", "大洋洲", "新西兰公开频道", "$BASE/countries/nz.m3u"),
        KnownPlaylist("za", "南非", "非洲", "南非公开频道", "$BASE/countries/za.m3u"),
        KnownPlaylist("zho", "中文频道", "语言", "按语言汇总的中文公开源", "$BASE/languages/zho.m3u"),
        KnownPlaylist("eng", "英语频道", "语言", "按语言汇总的英语公开源，体量较大", "$BASE/languages/eng.m3u"),
        KnownPlaylist("news", "新闻", "分类", "全球新闻分类源", "$BASE/categories/news.m3u"),
        KnownPlaylist("sports", "体育", "分类", "全球体育分类源", "$BASE/categories/sports.m3u"),
        KnownPlaylist("documentary", "纪录片", "分类", "纪录片分类源", "$BASE/categories/documentary.m3u"),
        KnownPlaylist("movies", "电影", "分类", "电影分类源", "$BASE/categories/movies.m3u"),
    )

    val defaultIds = listOf("cn", "hk")
}
