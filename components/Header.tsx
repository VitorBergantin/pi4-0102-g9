"use client"

import Logo from "@/components/Logo"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface HeaderProps {
  activeTab: string
  onTabChange: (tab: string) => void
}

export function Header({ activeTab, onTabChange }: HeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex justify-center px-4 pt-4 sm:pt-6 pointer-events-none">
      <nav
        aria-label="Menu principal"
        className="pointer-events-auto mx-auto flex w-full max-w-2xl items-center justify-between rounded-full border border-white/60 bg-white/95 px-4 sm:px-5 py-2 shadow-lg shadow-slate-900/10 backdrop-blur-md transition-all dark:bg-card/90 dark:border-border"
      >
        {/* Esquerda: Logo + Nome */}
        <div className="flex flex-1 items-center gap-2.5">
          <Logo size={32} className="h-7 w-7 sm:h-8 sm:w-8 shrink-0" />
          <span className="text-sm sm:text-base font-bold tracking-tight text-slate-800 dark:text-foreground whitespace-nowrap">
            CO₂NNECT
          </span>
        </div>

        {/* Centro: As abas de navegação (sempre no centro exato) */}
        <div className="flex-none">
          <Tabs value={activeTab} onValueChange={onTabChange}>
            <TabsList className="bg-slate-100/90 dark:bg-muted/60 rounded-full p-1 h-auto border border-slate-200/70">
              <TabsTrigger
                value="dashboard"
                className="rounded-full px-3.5 py-1 text-xs sm:px-4 sm:py-1.5 font-semibold transition-all data-active:bg-linear-to-r data-active:from-emerald-600 data-active:to-teal-600 data-active:text-white data-active:shadow-sm text-slate-600 hover:text-slate-900 dark:text-muted-foreground dark:hover:text-foreground"
              >
                Dashboard
              </TabsTrigger>

              <TabsTrigger
                value="history"
                className="rounded-full px-3.5 py-1 text-xs sm:px-4 sm:py-1.5 font-semibold transition-all data-active:bg-linear-to-r data-active:from-blue-600 data-active:to-teal-600 data-active:text-white data-active:shadow-sm text-slate-600 hover:text-slate-900 dark:text-muted-foreground dark:hover:text-foreground"
              >
                Histórico
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Direita: Espaçador para manter a simetria exata com o lado esquerdo (sem indicador) */}
        <div className="flex flex-1 items-center justify-end" aria-hidden="true" />
      </nav>
    </header>
  )
}
