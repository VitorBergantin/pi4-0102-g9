import { expect, it } from "vitest"
import { cn } from "@/lib/utils"

it("preserva classes condicionais e permite sobrescrever o espaçamento padrão", () => {
  const classes = cn("p-2 text-sm", { "bg-white": true, hidden: false }, "p-4").split(" ")

  expect(classes).toEqual(expect.arrayContaining(["p-4", "text-sm", "bg-white"]))
  expect(classes).not.toContain("p-2")
  expect(classes).not.toContain("hidden")
})
