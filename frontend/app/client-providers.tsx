"use client"

import dynamic from "next/dynamic"
import React from "react"

const Providers = dynamic(() => import("./providers").then((mod) => mod.Providers), {
  ssr: false,
})

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return <Providers>{children}</Providers>
}
