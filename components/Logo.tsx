import React from "react"
import { cn } from "@/lib/utils"

interface LogoProps extends React.SVGProps<SVGSVGElement> {
  className?: string
  size?: number
}

// Componente da Logo do CO₂NNECT (Folha com fluxo de ar)
export function Logo({ className, size = 48, ...props }: LogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={cn("shrink-0", className)}
      {...props}
    >
      {/* Fundo escuro arredondado */}
      <rect width="64" height="64" rx="16" fill="#103f40" />

      {/* Linhas de vento / fluxo de ar */}
      <path
        d="M8 21 C12 18 16 18 20 21
           M6 31 C11 28 16 28 21 31
           M8 41 C12 38 16 38 20 41"
        fill="none"
        stroke="#d0ebe3"
        strokeWidth="2.8"
        strokeLinecap="round"
      />

      {/* Folha */}
      <path
        d="M27 49 C15 39 19 17 48 12
           C51 36 42 51 27 49Z"
        fill="#66c5aa"
      />

      {/* Nervura central da folha */}
      <path
        d="M25 48 C33 38 39 28 47 16"
        fill="none"
        stroke="#ffffff"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

export default Logo
