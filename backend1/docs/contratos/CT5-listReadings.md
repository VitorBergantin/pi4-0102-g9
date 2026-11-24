# CT5 — listReadings

| Campo | Descrição |
|---|---|
| **Entregável** | E6 — Consulta das medições |
| **Situação** | Implementado |
| **Fronteira** | Frontend ↔ Supabase/PostgreSQL |
| **Quem consulta** | Frontend |
| **Origem dos dados** | Tabela `sensor_reading` |
| **Função utilizada** | `fetchReadings()`, em `lib/services/supabase.ts` |

## Entrada

| Campo | Descrição |
|---|---|
| `deviceId` | Dispositivo selecionado |
| `startDate` | Data inicial |
| `endDate` | Data final |
| `onlyCritical` | Filtrar apenas medições com CO₂ superior a 1.200 ppm |

## Saída

A consulta retorna medições contendo:

- `id`: identificador da medição.
- `deviceId`: dispositivo responsável pela leitura.
- `timestamp`: data e horário da medição.
- `co2`: concentração de CO₂.
- `temperature`: temperatura.
- `humidity`: umidade relativa.

Os registros são apresentados dos mais recentes para os mais antigos, com limite de 100 medições no Histórico.

## Erros e comportamento

| Situação | Resultado |
|---|---|
| Nenhuma medição encontrada | Retorna uma lista vazia |
| Data inválida ou intervalo incorreto | Exibe erro de consulta |
| Falha na consulta ao Supabase | Exibe mensagem de erro e opção de tentar novamente |

## Fluxo implementado

1. O usuário acessa o Histórico e seleciona os filtros.
2. O frontend executa a função `fetchReadings()`.
3. A consulta é realizada na tabela `sensor_reading` do Supabase/PostgreSQL.
4. O sistema retorna até 100 medições, após aplicar os filtros.
5. O frontend apresenta os resultados na tabela do Histórico.

## Evidências

- `components/history/HistoryTab.tsx`
- `lib/services/supabase.ts`
- `tests/frontend-fixes/history-filters.test.tsx`
- `tests/frontend-fixes/supabase-query.test.ts`

## Observação

A CT5 originalmente previa uma consulta por meio da API Java. Na implementação utilizada pelo frontend, a consulta ocorre diretamente no Supabase, sem utilizar essa API própria.
