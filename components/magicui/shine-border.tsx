"use client"

import React, { CSSProperties } from "react"

interface ShineBorderProps {
  className?: string
  duration?: number
  shineColor?: string | string[]
  borderWidth?: number
  style?: CSSProperties
}

export function ShineBorder({
  className = "",
  duration = 14,
  shineColor = ["#A07CFE", "#FE8FB5", "#FFBE7B"],
  borderWidth = 2,
  style,
}: ShineBorderProps) {
  const colors = Array.isArray(shineColor) ? shineColor : [shineColor]

  return (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes shine-border {
            0% {
              transform: translateX(-100%) rotate(0deg);
            }
            100% {
              transform: translateX(100%) rotate(0deg);
            }
          }
        `
      }} />
      <div
        className={`pointer-events-none absolute inset-0 overflow-hidden rounded-[26px] ${className}`}
        style={style}
      >
        <div
          className="absolute inset-0 h-full w-full"
          style={{
            background: `linear-gradient(90deg, transparent, ${colors.join(", ")}, transparent)`,
            animation: `shine-border ${duration}s ease-in-out infinite`,
          }}
        />
      </div>
    </>
  )
}

