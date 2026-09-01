"use client"

import { useEffect, useRef, useState } from "react"
import Hls from "hls.js"
import { Loader2, Maximize, Volume2, VolumeX, WifiOff } from "lucide-react"

import { Button } from "@/components/ui/button"
import { proxiedStream } from "@/lib/iptv-fetch"
import type { Channel } from "@/lib/iptv-types"

function rewrite(url: string) {
  if (url.includes("/api/proxy?url=")) return url
  return proxiedStream(url)
}

function HlsPlayer({ channel }: { channel: Channel }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [buffering, setBuffering] = useState(true)
  const [muted, setMuted] = useState(false)

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

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl bg-black ring-1 ring-white/10">
      <video
        ref={videoRef}
        className="h-full w-full bg-black object-contain"
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
          const node = videoRef.current?.parentElement
          if (!node) return
          if (document.fullscreenElement) void document.exitFullscreen()
          else void node.requestFullscreen()
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
        <div>
          <p className="text-xs tracking-[0.2em] text-red-400">LIVE</p>
          <h2 className="text-lg font-medium text-white">{channel.name}</h2>
          <p className="text-xs text-white/60">{channel.group}</p>
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
            className="text-white hover:bg-white/15 hover:text-white"
            aria-label="全屏"
            onClick={() => {
              const node = videoRef.current?.parentElement
              if (!node) return
              if (document.fullscreenElement) void document.exitFullscreen()
              else void node.requestFullscreen()
            }}
          >
            <Maximize />
          </Button>
        </div>
      </div>
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
