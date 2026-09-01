"use client"

import { useEffect, useState } from "react"

import { proxiedStream } from "@/lib/iptv-fetch"
import { cn } from "@/lib/utils"

const DEFAULT_THUMB = "/channel-default.svg"

function thumbSrc(logo?: string) {
  const value = logo?.trim()
  if (!value) return null
  try {
    const url = new URL(value)
    if (url.protocol !== "http:" && url.protocol !== "https:") return null
    return proxiedStream(value)
  } catch {
    return null
  }
}

export function ChannelThumb({
  name,
  logo,
  className,
}: {
  name: string
  logo?: string
  className?: string
}) {
  const remote = thumbSrc(logo)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setFailed(false)
  }, [logo])

  const src = remote && !failed ? remote : DEFAULT_THUMB

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      title={name}
      className={cn(
        "size-9 shrink-0 rounded-md bg-black/70 object-contain p-0.5",
        className,
      )}
      onError={() => {
        if (!failed) setFailed(true)
      }}
    />
  )
}
