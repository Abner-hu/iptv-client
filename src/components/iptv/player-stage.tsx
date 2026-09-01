"use client"

import { useEffect, useRef, useState } from "react"
import Hls from "hls.js"
import { Loader2, Maximize, Minimize, Volume2, VolumeX, WifiOff } from "lucide-react"

import { ChannelThumb } from "@/components/iptv/channel-thumb"
import { Button } from "@/components/ui/button"
import { proxiedStream } from "@/lib/iptv-fetch"
import { cn } from "@/lib/utils"
import type { Channel } from "@/lib/iptv-types"

type WebkitVideo = HTMLVideoElement & {
  webkitEnterFullscreen?: () => void
  webkitExitFullscreen?: () => void
  webkitDisplayingFullscreen?: boolean
}

type WebkitElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void
}

type WebkitDocument = Document & {
  webkitFullscreenElement?: Element | null
  webkitExitFullscreen?: () => Promise<void> | void
}

function rewrite(url: string) {
  if (url.includes("/api/proxy?url=")) return url
  return proxiedStream(url)
}

function nativeFullscreenElement() {
  const doc = document as WebkitDocument
  return document.fullscreenElement ?? doc.webkitFullscreenElement ?? null
}

async function requestNativeFullscreen(node: HTMLElement, video: HTMLVideoElement) {
  const ios = /iPhone|iPad|iPod/i.test(navigator.userAgent)
  const webkitVideo = video as WebkitVideo
  if (ios && typeof webkitVideo.webkitEnterFullscreen === "function") {
    webkitVideo.webkitEnterFullscreen()
    return true
  }
  const el = node as WebkitElement
  const request = el.requestFullscreen?.bind(el) ?? el.webkitRequestFullscreen?.bind(el)
  if (!request) return false
  try {
    await Promise.resolve(request())
    return true
  } catch {
    return false
  }
}

async function exitNativeFullscreen(video: HTMLVideoElement) {
  const webkitVideo = video as WebkitVideo
  if (webkitVideo.webkitDisplayingFullscreen && webkitVideo.webkitExitFullscreen) {
    webkitVideo.webkitExitFullscreen()
    return
  }
  const doc = document as WebkitDocument
  const exit = document.exitFullscreen?.bind(document) ?? doc.webkitExitFullscreen?.bind(document)
  if (exit) await Promise.resolve(exit())
}

function HlsPlayer({ channel }: { channel: Channel }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [buffering, setBuffering] = useState(true)
  const [muted, setMuted] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [nativeOn, setNativeOn] = useState(false)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    let hls: Hls | undefined
    let cancelled = false

    const fail = (message: string) => {
      if (!cancelled) setError(message)
    }

    if (Hls.isSupported()) {
      hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        maxBufferLength: 30,
        xhrSetup(xhr, url) {
          xhr.open("GET", rewrite(url), true)
        },
      })
      hls.loadSource(channel.url)
      hls.attachMedia(video)
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (cancelled) return
        setBuffering(false)
        void video.play().catch(() => fail("浏览器拦截了自动播放，请点击画面"))
      })
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (!data.fatal || cancelled) return
        fail(data.details || "此频道暂时无法播放")
      })
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = rewrite(channel.url)
      video.addEventListener(
        "loadedmetadata",
        () => {
          setBuffering(false)
          void video.play().catch(() => fail("请点击画面开始播放"))
        },
        { once: true },
      )
    } else {
      fail("当前浏览器不支持 HLS 直播")
    }

    const onWaiting = () => setBuffering(true)
    const onPlaying = () => {
      setBuffering(false)
      setError(null)
    }
    video.addEventListener("waiting", onWaiting)
    video.addEventListener("playing", onPlaying)

    return () => {
      cancelled = true
      video.removeEventListener("waiting", onWaiting)
      video.removeEventListener("playing", onPlaying)
      hls?.destroy()
      video.removeAttribute("src")
      video.load()
    }
  }, [channel])

  useEffect(() => {
    const onFs = () => setNativeOn(!!nativeFullscreenElement())
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setExpanded(false)
    }
    document.addEventListener("fullscreenchange", onFs)
    document.addEventListener("webkitfullscreenchange", onFs)
    window.addEventListener("keydown", onKey)
    const video = videoRef.current
    const onBegin = () => setNativeOn(true)
    const onEnd = () => setNativeOn(false)
    video?.addEventListener("webkitbeginfullscreen", onBegin)
    video?.addEventListener("webkitendfullscreen", onEnd)
    return () => {
      document.removeEventListener("fullscreenchange", onFs)
      document.removeEventListener("webkitfullscreenchange", onFs)
      window.removeEventListener("keydown", onKey)
      video?.removeEventListener("webkitbeginfullscreen", onBegin)
      video?.removeEventListener("webkitendfullscreen", onEnd)
    }
  }, [])

  const fullscreen = expanded || nativeOn

  async function toggleFullscreen() {
    const video = videoRef.current
    const stage = stageRef.current
    if (!video || !stage) return
    if (fullscreen) {
      await exitNativeFullscreen(video)
      setExpanded(false)
      return
    }
    const ok = await requestNativeFullscreen(stage, video)
    if (!ok) setExpanded(true)
  }

  return (
    <div
      ref={stageRef}
      className={cn(
        "player-stage relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl bg-black ring-1 ring-white/10",
        expanded && "fixed inset-0 z-50 rounded-none ring-0",
      )}
    >
      <video
        ref={videoRef}
        className="h-full min-h-48 w-full bg-black object-contain md:min-h-0"
        controls={false}
        autoPlay
        playsInline
        muted={muted}
        onClick={() => {
          const video = videoRef.current
          if (!video) return
          if (video.paused) void video.play()
          else video.pause()
        }}
        onDoubleClick={() => {
          void toggleFullscreen()
        }}
      />

      {buffering && !error && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/30">
          <Loader2 className="size-10 animate-spin text-white" />
        </div>
      )}

      {error && (
        <div className="absolute inset-x-0 bottom-16 mx-auto max-w-md rounded-xl bg-black/80 px-4 py-3 text-center text-sm text-white ring-1 ring-white/15">
          <p>无法播放「{channel.name}」</p>
          <p className="mt-1 text-xs text-white/70">
            {error}。公开源线路不稳定，可换一个频道或稍后再试。
          </p>
        </div>
      )}

      <div className="absolute inset-x-0 top-0 flex items-start justify-between bg-gradient-to-b from-black/70 to-transparent p-4">
        <div className="flex min-w-0 items-start gap-3">
          <ChannelThumb name={channel.name} logo={channel.logo} className="size-10 ring-1 ring-white/15" />
          <div className="min-w-0">
            <p className="text-xs tracking-[0.2em] text-red-400">LIVE</p>
            <h2 className="truncate text-lg font-medium text-white">{channel.name}</h2>
            <p className="truncate text-xs text-white/60">{channel.group}</p>
          </div>
        </div>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-white hover:bg-white/15 hover:text-white"
            onClick={() => setMuted((value) => !value)}
            aria-label={muted ? "取消静音" : "静音"}
          >
            {muted ? <VolumeX /> : <Volume2 />}
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="size-9 text-white hover:bg-white/15 hover:text-white md:size-8"
            aria-label={fullscreen ? "退出全屏" : "全屏"}
            onClick={() => {
              void toggleFullscreen()
            }}
          >
            {fullscreen ? <Minimize /> : <Maximize />}
          </Button>
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon-sm"
        className="absolute right-3 bottom-3 size-11 bg-black/55 text-white hover:bg-black/75 hover:text-white md:hidden"
        aria-label={fullscreen ? "退出全屏" : "全屏"}
        onClick={() => {
          void toggleFullscreen()
        }}
      >
        {fullscreen ? <Minimize /> : <Maximize />}
      </Button>
    </div>
  )
}

export function PlayerStage({ channel }: { channel: Channel | null }) {
  if (!channel) {
    return (
      <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center overflow-hidden rounded-2xl bg-black text-white/70 ring-1 ring-white/10">
        <WifiOff className="size-10" />
        <p className="mt-2 text-sm">选择一个频道开始播放</p>
      </div>
    )
  }
  return <HlsPlayer key={channel.id} channel={channel} />
}
