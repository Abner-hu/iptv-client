"use client"

import { useEffect, useRef, useState } from "react"
import Hls from "hls.js"
import { Loader2, WifiOff } from "lucide-react"

import { ChannelThumb } from "@/components/iptv/channel-thumb"
import { PlayerControls } from "@/components/iptv/player-controls"
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

function skipChannel(playlist: Channel[], currentId: string | undefined, delta: number) {
  if (playlist.length === 0) return null
  const index = playlist.findIndex((item) => item.id === currentId)
  const from = index >= 0 ? index : 0
  return playlist[(from + delta + playlist.length) % playlist.length]
}

function HlsPlayer({
  channel,
  volume,
  onVideoClick,
}: {
  channel: Channel
  volume: number
  onVideoClick?: (video: HTMLVideoElement) => boolean
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [buffering, setBuffering] = useState(true)

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
    const video = videoRef.current
    if (!video) return
    video.volume = volume
    video.muted = volume === 0
  }, [volume, channel])

  return (
    <>
      <video
        ref={videoRef}
        className="h-full min-h-48 w-full bg-black object-contain md:min-h-0"
        controls={false}
        autoPlay
        playsInline
        onClick={() => {
          const video = videoRef.current
          if (!video) return
          if (onVideoClick?.(video)) return
          if (video.paused) void video.play()
          else video.pause()
        }}
      />

      {buffering && !error && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/30">
          <Loader2 className="size-10 animate-spin text-white" />
        </div>
      )}

      {error && (
        <div className="absolute inset-x-0 bottom-4 mx-auto max-w-md rounded-xl bg-black/80 px-4 py-3 text-center text-sm text-white ring-1 ring-white/15">
          <p>无法播放「{channel.name}」</p>
          <p className="mt-1 text-xs text-white/70">
            {error}。公开源线路不稳定，可换一个频道或稍后再试。
          </p>
        </div>
      )}
    </>
  )
}

export function PlayerStage({
  channel,
  playlist,
  onSelect,
}: {
  channel: Channel | null
  playlist: Channel[]
  onSelect: (channel: Channel) => void
}) {
  const stageRef = useRef<HTMLDivElement>(null)
  const videoHostRef = useRef<HTMLDivElement>(null)
  const [volume, setVolume] = useState(1)
  const [expanded, setExpanded] = useState(false)
  const [nativeOn, setNativeOn] = useState(false)
  const [chromeVisible, setChromeVisible] = useState(true)
  const fullscreen = expanded || nativeOn
  const fullscreenRef = useRef(false)
  const idleTimer = useRef<number>(0)
  fullscreenRef.current = fullscreen

  function bumpChrome() {
    setChromeVisible(true)
    window.clearTimeout(idleTimer.current)
    if (!fullscreenRef.current) return
    idleTimer.current = window.setTimeout(() => {
      if (fullscreenRef.current) setChromeVisible(false)
    }, 5000)
  }

  useEffect(() => {
    const onFs = () => setNativeOn(!!nativeFullscreenElement())
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setExpanded(false)
      bumpChrome()
    }
    document.addEventListener("fullscreenchange", onFs)
    document.addEventListener("webkitfullscreenchange", onFs)
    window.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("fullscreenchange", onFs)
      document.removeEventListener("webkitfullscreenchange", onFs)
      window.removeEventListener("keydown", onKey)
    }
  }, [])

  useEffect(() => {
    if (!fullscreen) {
      window.clearTimeout(idleTimer.current)
      setChromeVisible(true)
      return
    }
    bumpChrome()
    const stage = stageRef.current
    if (!stage) return
    const onActivity = () => bumpChrome()
    stage.addEventListener("mousemove", onActivity)
    stage.addEventListener("pointerdown", onActivity)
    return () => {
      stage.removeEventListener("mousemove", onActivity)
      stage.removeEventListener("pointerdown", onActivity)
    }
  }, [fullscreen])

  async function toggleFullscreen() {
    const stage = stageRef.current
    const video = videoHostRef.current?.querySelector("video")
    if (!stage || !video) {
      setExpanded((value) => !value)
      return
    }
    if (fullscreen) {
      await exitNativeFullscreen(video)
      setExpanded(false)
      return
    }
    const ok = await requestNativeFullscreen(stage, video)
    if (!ok) setExpanded(true)
  }

  function skip(delta: number) {
    const next = skipChannel(playlist, channel?.id, delta)
    if (next) onSelect(next)
  }

  if (!channel) {
    return (
      <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center overflow-hidden rounded-2xl bg-black text-white/70 ring-1 ring-white/10">
        <WifiOff className="size-10" />
        <p className="mt-2 text-sm">选择一个频道开始播放</p>
      </div>
    )
  }

  return (
    <div
      ref={stageRef}
      className={cn(
        "player-stage flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl bg-black ring-1 ring-white/10",
        expanded && "fixed inset-0 z-50 rounded-none ring-0",
        fullscreen && !chromeVisible && "cursor-none",
      )}
    >
      <div ref={videoHostRef} className="relative min-h-0 flex-1 bg-black">
        <HlsPlayer
          key={channel.id}
          channel={channel}
          volume={volume}
          onVideoClick={() => {
            if (!fullscreen) return false
            if (!chromeVisible) {
              bumpChrome()
              return true
            }
            return false
          }}
        />
        <div
          className={cn(
            "pointer-events-none absolute inset-x-0 top-0 flex items-start bg-gradient-to-b from-black/70 to-transparent p-4 transition-opacity duration-300",
            fullscreen && !chromeVisible && "opacity-0",
          )}
        >
          <div className="flex min-w-0 items-start gap-3">
            <ChannelThumb name={channel.name} logo={channel.logo} className="size-10 ring-1 ring-white/15" />
            <div className="min-w-0">
              <p className="text-xs tracking-[0.2em] text-red-400">正在直播</p>
              <h2 className="truncate text-lg font-medium text-white">{channel.name}</h2>
              <p className="truncate text-xs text-white/60">{channel.group}</p>
            </div>
          </div>
        </div>
      </div>
      <div
        className={cn(
          "shrink-0",
          fullscreen && !chromeVisible && "hidden",
        )}
      >
        <PlayerControls
          canSkip={playlist.length > 1}
          volume={volume}
          fullscreen={fullscreen}
          onPrev={() => skip(-1)}
          onNext={() => skip(1)}
          onVolume={setVolume}
          onFullscreen={() => {
            void toggleFullscreen()
          }}
        />
      </div>
    </div>
  )
}
