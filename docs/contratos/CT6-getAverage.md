# CT6 — getAverage

| Campo | Descrição |
|---|---|
| **Entregável** | E7 — Relatórios de medições |
| **Situação** | Implementado no frontend |
| **Origem dos dados** | Supabase — tabela `sensor_reading` |
| **Responsável pelo cálculo** | Frontend (`HistoryTab.tsx`) |
| **Consulta utilizada** | `fetchReadings()`, em `lib/services/supabase.ts` |
| **API Java própria** | Não utilizada |

## Entrada

O usuário pode aplicar os seguintes filtros no Histórico:

| Campo | Descrição |
|---|---|
| `deviceId` | Dispositivo selecionado |
| `startDate` | Data inicial |
| `endDate` | Data final |
| `onlyCritical` | Consultar somente leituras com CO₂ superior a 1.200 ppm |

A consulta retorna até 100 medições, após aplicar os filtros.

## Saída e comportamento

| Indicador | Resultado |
|---|---|
| Média de CO₂ | Média das concentrações retornadas, arredondada para inteiro |
| Média de temperatura | Média das temperaturas, com uma casa decimal |
| Média de umidade | Média das umidades, arredondada para inteiro |
| Total de medições | Quantidade de registros retornados |
| Leituras críticas | Quantidade de registros com CO₂ superior a 1.200 ppm |
| Sem medições | Médias e contagens exibidas como zero |
| Erro na consulta | Mensagem de falha e opção de tentar novamente |

## Fluxo implementado

1. O usuário seleciona os filtros na tela de Histórico.
2. O frontend consulta a tabela `sensor_reading` no Supabase.
3. O Supabase retorna até 100 medições que atendem aos filtros.
4. O frontend calcula as médias e contagens.
5. Os resultados são apresentados nos indicadores do Histórico.

## Observação

A CT6 originalmente previa o endpoint Java `GET /api/readings/average`, mas esse endpoint não foi implementado.

Na versão entregue, as médias são calculadas diretamente no frontend, utilizando os registros obtidos do Supabase. Portanto, não existe uma chamada à API Java para realizar esse cálculo.

As médias consideram somente as medições retornadas pela consulta, respeitando o limite de 100 registros.

## Evidências

- `components/history/HistoryTab.tsx`
- `components/history/CriticalAlerts.tsx`
- `lib/services/supabase.ts`
