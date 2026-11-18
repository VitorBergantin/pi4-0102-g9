import React from "react"
import Logo from "@/components/Logo"
import { ExternalLink, Server, Cpu, Code2 } from "lucide-react"

// Ícone vetorial oficial do GitHub
function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg
      role="img"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className ?? "size-4"}
    >
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  )
}

const REPOSITORIES = [
  {
    title: "Frontend Web",
    description: "Next.js 16, React 19, TypeScript e Tailwind CSS",
    url: "https://github.com/antune-ss/pi4-0102-g9-frontend",
    icon: Code2,
    tag: "Interface",
  },
  {
    title: "Servidor Backend (Java)",
    description: "Servidor em Java para ingestão, regras e persistência",
    url: "https://github.com/antune-ss/pi4-0102-g9-backend-1",
    icon: Server,
    tag: "Backend 1",
  },
  {
    title: "Firmware ESP32",
    description: "Código embarcado em C++ para leitura dos sensores",
    url: "https://github.com/antune-ss/pi4-0102-g9-backend-2",
    icon: Cpu,
    tag: "Backend 2",
  },
]

export function Footer() {
  return (
    <footer className="w-full border-t border-border bg-white/70 dark:bg-card/70 backdrop-blur-md transition-colors">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12">
          {/* Coluna 1: Marca e Descrição */}
          <div className="md:col-span-5 space-y-4">
            <div className="flex items-center gap-2.5">
              <Logo size={34} className="shrink-0" />
              <span className="text-lg font-bold tracking-tight text-foreground">
                CO₂NNECT
              </span>
            </div>

            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-md">
              Sistema de telemetria e auditoria da qualidade do ar em ambientes internos,
              integrando sensores de CO₂, temperatura e umidade com transmissão via MQTT e banco de dados.
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] font-medium text-muted-foreground">
              <span className="rounded-md border border-border bg-muted/60 px-2.5 py-1">
                Projeto Integrador IV
              </span>
              <span className="rounded-md border border-border bg-muted/60 px-2.5 py-1">
                2º Semestre de 2026
              </span>
              <span className="rounded-md border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-2.5 py-1">
                Open Source
              </span>
            </div>
          </div>

          {/* Coluna 2: Links dos Repositórios */}
          <div className="md:col-span-7 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Repositórios do Projeto no GitHub
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {REPOSITORIES.map((repo) => {
                const IconComponent = repo.icon
                return (
                  <a
                    key={repo.title}
                    href={repo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative flex flex-col justify-between rounded-xl border border-border bg-card p-3.5 shadow-2xs transition-all hover:-translate-y-0.5 hover:border-emerald-500/50 hover:shadow-sm"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-2">
                        <span className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                          <IconComponent className="size-3.5" />
                        </span>
                        <ExternalLink className="size-3 text-muted-foreground group-hover:text-foreground transition-colors" />
                      </div>

                      <h5 className="text-xs font-bold text-foreground group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                        {repo.title}
                      </h5>

                      <p className="mt-1 text-[11px] text-muted-foreground line-clamp-2">
                        {repo.description}
                      </p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-border/60 flex items-center justify-between text-[10px] text-muted-foreground">
                      <span className="font-mono">{repo.tag}</span>
                      <span className="inline-flex items-center gap-1 group-hover:underline">
                        Ver código
                      </span>
                    </div>
                  </a>
                )
              })}
            </div>
          </div>
        </div>

        {/* Linha Inferior com Copyright e Link da Organização */}
        <div className="mt-10 pt-6 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <p>
            &copy; 2026 CO₂NNECT. Desenvolvido para o Projeto Integrador (PI-4).
          </p>
        </div>
      </div>
    </footer>
  )
}
