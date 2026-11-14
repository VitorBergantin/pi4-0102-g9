"use client"

import { useState } from "react"
import { Header } from "@/components/Header"
import { DashboardTab } from "@/components/dashboard/DashboardTab"
import { HistoryTab } from "@/components/history/HistoryTab"
import { Footer } from "@/components/Footer"

export default function Home() {
  const [activeTab, setActiveTab] = useState("dashboard")
  const [selectedDevice, setSelectedDevice] = useState("ESP32-DEV")

  return (
    <div className="min-h-screen bg-[#f3f7f6] dark:bg-background text-foreground flex flex-col">
      {/* Header limpo (sem indicador online no topo) */}
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Hero com Imagem da Terra */}
      <section className="relative w-full overflow-hidden pt-28 pb-14 sm:pb-16 flex flex-col justify-end">
        {/* Camada do Fundo */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            maskImage: "linear-gradient(to bottom, black 0%, black 70%, transparent 100%)",
            WebkitMaskImage: "linear-gradient(to bottom, black 0%, black 68%, transparent 100%)",
          }}
        >
          {/* Imagem de Fundo */}
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat scale-105"
            style={{ backgroundImage: "url('/earth-bg.jpg')" }}
          />

          {/* Degradê */}
          <div className="absolute inset-0 bg-linear-to-b from-slate-950/85 via-blue-950/75 to-slate-950/95" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-blue-600/30 via-transparent to-transparent" />
        </div>

        <div className="relative z-10 max-w-6xl w-full mx-auto px-4 sm:px-6 flex flex-col justify-end">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white drop-shadow-md">
            CO₂NNECT
          </h1>

          <p className="mt-2 text-sm sm:text-base text-slate-200 max-w-2xl font-normal leading-relaxed">
            Plataforma de telemetria inteligente e auditoria da qualidade do ar em tempo real.
          </p>
        </div>

        {/* Efeito esfumaçado para baixo */}
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-linear-to-b from-transparent to-[#f3f7f6] pointer-events-none dark:to-background" />
      </section>

      {/* Conteúdo Principal */}
      <main className="relative z-10 flex-1 -mt-2 px-4 sm:px-6 max-w-6xl w-full mx-auto pb-16">
        {activeTab === "dashboard" ? (
          <section>
            <DashboardTab
              selectedDevice={selectedDevice}
              onDeviceChange={setSelectedDevice}
            />
          </section>
        ) : (
          <section>
            <HistoryTab />
          </section>
        )}
      </main>

      <Footer />
    </div>
  )
}
