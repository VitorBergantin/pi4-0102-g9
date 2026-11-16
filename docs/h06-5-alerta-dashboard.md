# H06.5 — Alerta do dashboard por telemetria MQTT

Esta implementação usa **classificação local** das medições MQTT existentes.
Não interpreta um campo oficial de alerta CT7 `novaMedicao`, não cria tópicos
e não abre outra conexão. Um contrato oficial poderá substituir o adaptador
`createTelemetryAlertUpdate` futuramente.

## Regra e ordenação

- `lib/air-quality.ts` centraliza CO₂ crítico: **acima de 1.200 ppm**.
- O banner e os cards compartilham essa regra; 1.200 ppm é inativo.
- `handleNewReading` valida a medição e atualiza o estado por dispositivo.
- A revisão interna é `Date.parse(timestamp)`, originada de `measuredAt`.
  Não é um contador nem a hora de chegada.
- Uma revisão igual ou anterior não substitui o alerta. O primeiro estado
  aceito vence empates; a revisão inativa é preservada.
- Leituras antigas podem continuar no gráfico, ordenado por timestamp.
  Duplicatas do mesmo dispositivo e instante no buffer não são inseridas.
- Telemetria sem `measuredAt` válido é descartada, em vez de receber horário
  artificial. Métricas ausentes, não numéricas ou fora das faixas são rejeitadas.
- Sem telemetria aceita, o estado é desconhecido. O histórico Supabase não
  inicializa este alerta. Estados opcionais permitem testes isolados, mas
  estados produzidos pela telemetria têm precedência para cada dispositivo.

## Troca de dispositivo, aba e reconexão

A seleção exibe apenas o alerta do dispositivo atual, mantendo os demais
estados em memória enquanto `DashboardTab` está montado.

Uma reconexão do cliente MQTT na mesma montagem mantém os estados e as revisões.
O serviço existente reassina os tópicos ao conectar. Não há snapshot nem replay:
durante a interrupção, o último estado conhecido pode estar desatualizado.
Somente uma medição posterior aceita confirma uma mudança.

Na página atual, sair para Histórico desmonta o dashboard e encerra a conexão.
Ao retornar, os estados recomeçam desconhecidos e uma nova conexão aguarda
telemetria. Recarregar a página também reinicia os estados. Não há persistência
nem garantia de recuperar medições perdidas. O timestamp depende do relógio do
dispositivo; timestamps empatados ou relógios incorretos não permitem inferir
uma ordem melhor sem suporte adicional do produtor.

## Demonstração reproduzível

Execute:

```sh
corepack pnpm test tests/h06-5/mqtt-dashboard.test.tsx --reporter=verbose
```

O teste `DEMONSTRAÇÃO` envia mensagens no evento `message` de um transporte
controlado, usando o **serviço MQTT, parser, callback e componentes reais**.
Somente o transporte, Supabase e a renderização dos gráficos estão isolados;
não é uma validação de broker ou ESP32 físico.

| Dispositivo | measuredAt | co2 | Resultado esperado |
|---|---|---:|---|
| A | 2026-11-16T12:00:00Z | 1400 | Banner aparece |
| A | 2026-11-16T12:01:00Z | 1500 | Banner permanece e atualiza o valor |
| A | 2026-11-16T12:02:00Z | 1200 | Banner desaparece |

Os payloads incluem `deviceId`, `measuredAt`, `co2`, `temperature: 24` e
`humidity: 50` no tópico já existente `co2nect/A/telemetry`. A aplicação normal
executa o mesmo caminho quando recebe mensagens pelo broker configurado.
Outros testes cobrem mensagens inválidas, duplicatas, eventos antigos, seleção,
reconexão, remontagem e preservação dos indicadores e dados dos gráficos.

## Validação desta implementação

- 79 testes passaram em quatro arquivos. Os 46 testes da etapa interna foram
  mantidos; o teste que antes exigia ausência de banner com 1.800 ppm teve essa
  expectativa atualizada para a decisão de classificação local.
- `corepack pnpm exec tsc --noEmit --incremental false` passou.
- ESLint dos arquivos novos, de `mqtt.ts` e de `MetricsCards.tsx` passou.
- `corepack pnpm lint` ainda encontra um erro e quatro avisos preexistentes.
  O erro `react-hooks/set-state-in-effect` vem da seleção automática de
  dispositivo em `DashboardTab`; foi reproduzido analisando o arquivo da main
  via stdin, sem trocar de branch ou alterar seu conteúdo.
- `corepack pnpm build` compila e passa no TypeScript, mas falha ao
  pré-renderizar `/`: `supabaseUrl is required`. Neste ambiente estão ausentes
  `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`. O serviço Supabase
  e o layout permanecem iguais aos da main. Não foram criadas credenciais ou
  alterados arquivos de ambiente para contornar essa falha.
- Os testes não substituem uma verificação com broker e dispositivo físicos,
  nem uma inspeção visual em navegador/leitor de tela.

## Compatibilidade com a H04.3 pendente

A sobreposição está em `DashboardTab.tsx` e `lib/services/mqtt.ts`. Ao combinar
as alterações, preservar a consulta periódica, correção de status e deduplicação
entre MQTT/Supabase da H04.3, junto com a atualização de alertas do H06.5.
Não restaurar o fallback que usa a hora de chegada para `measuredAt` ausente.
A deduplicação local do H06.5 é por dispositivo/instante no buffer MQTT e evita
que timestamps empatados produzam conflito entre o card e o banner; não
implementa a deduplicação entre fontes do outro ticket.
