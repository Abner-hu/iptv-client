export type KnownPlaylist = {
  id: string
  name: string
  region: string
  description: string
  url: string
  recommended?: boolean
}

const BASE = "https://iptv-org.github.io/iptv"

export const KNOWN_PLAYLISTS: KnownPlaylist[] = [
  {
    id: "cn",
    name: "中国内地",
    region: "亚洲",
    description: "iptv-org 公开源，含卫视、新闻、地方台等",
    url: `${BASE}/countries/cn.m3u`,
    recommended: true,
  },
  {
    id: "hk",
    name: "香港",
    region: "亚洲",
    description: "香港地区公开频道",
    url: `${BASE}/countries/hk.m3u`,
    recommended: true,
  },
  {
    id: "tw",
    name: "台湾",
    region: "亚洲",
    description: "台湾地区公开频道",
    url: `${BASE}/countries/tw.m3u`,
  },
  {
    id: "mo",
    name: "澳门",
    region: "亚洲",
    description: "澳门地区公开频道",
    url: `${BASE}/countries/mo.m3u`,
  },
  {
    id: "sg",
    name: "新加坡",
    region: "亚洲",
    description: "新加坡公开频道",
    url: `${BASE}/countries/sg.m3u`,
  },
  {
    id: "jp",
    name: "日本",
    region: "亚洲",
    description: "日本公开频道",
    url: `${BASE}/countries/jp.m3u`,
  },
  {
    id: "kr",
    name: "韩国",
    region: "亚洲",
    description: "韩国公开频道",
    url: `${BASE}/countries/kr.m3u`,
  },
  {
    id: "us",
    name: "美国",
    region: "北美",
    description: "美国公开频道",
    url: `${BASE}/countries/us.m3u`,
  },
  {
    id: "gb",
    name: "英国",
    region: "欧洲",
    description: "英国公开频道",
    url: `${BASE}/countries/uk.m3u`,
  },
  {
    id: "zho",
    name: "中文频道",
    region: "语言",
    description: "按语言汇总的中文公开源",
    url: `${BASE}/languages/zho.m3u`,
    recommended: true,
  },
  {
    id: "news",
    name: "新闻",
    region: "分类",
    description: "全球新闻分类源",
    url: `${BASE}/categories/news.m3u`,
  },
  {
    id: "sports",
    name: "体育",
    region: "分类",
    description: "全球体育分类源",
    url: `${BASE}/categories/sports.m3u`,
  },
  {
    id: "documentary",
    name: "纪录片",
    region: "分类",
    description: "纪录片分类源",
    url: `${BASE}/categories/documentary.m3u`,
  },
  {
    id: "movies",
    name: "电影",
    region: "分类",
    description: "电影分类源",
    url: `${BASE}/categories/movies.m3u`,
  },
]

export const DEFAULT_IMPORT_IDS = ["cn", "hk"] as const
