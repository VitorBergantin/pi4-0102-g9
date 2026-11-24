# CT6 — getAverage

## 1. Identificação

| Campo | Informação |
|---|---|
| Identificador | CT6 |
| Nome | getAverage |
| Entregável relacionado | E7 — Relatórios de medições |
| Funcionalidade | Cálculo e apresentação das médias das medições |
| Módulo responsável | Frontend |
| Componente responsável | `components/history/HistoryTab.tsx` |
| Origem dos dados | Supabase — tabela `sensor_reading` |
| Consulta utilizada | Função `fetchReadings`, em `lib/services/supabase.ts` |
| Situação | Implementado no frontend |
| Comunicação HTTP com backend Java para cálculo de médias | Não utilizada |

## 2. Objetivo

A funcionalidade relacionada à CT6 permite apresentar as médias de CO₂, temperatura e umidade das medições consultadas no Histórico do CO₂NNECT.

Os valores são calculados diretamente no frontend, utilizando os registros retornados pela consulta ao Supabase.

## 3. Dados utilizados

| Campo | Tipo | Descrição |
|---|---|---|
| `co2` | Número | Concentração de CO₂ em ppm |
| `temperature` | Número | Temperatura em °C |
| `humidity` | Número | Umidade relativa do ar em % |
| `deviceId` | Texto | Identificador do dispositivo |
| `timestamp` | Data e hora | Horário da medição |

Os dados são obtidos pela função `fetchReadings`, que consulta a tabela `sensor_reading` no Supabase e converte os registros para o formato utilizado pelo frontend.

## 4. Filtros aplicados

| Filtro | Comportamento |
|---|---|
| Dispositivo | Permite consultar todos os dispositivos ou selecionar um dispositivo específico |
| Data inicial | Considera medições a partir do início da data selecionada |
| Data final | Considera as medições anteriores ao início do dia seguinte |
| Apenas Críticas | Retorna somente medições com CO₂ superior a 1.200 ppm |
| Ordenação | Apresenta as medições mais recentes primeiro |
| Limite | Até 100 registros por consulta no Histórico |

Os filtros são aplicados no Supabase antes da ordenação e do limite de registros.

## 5. Cálculos realizados

| Indicador | Cálculo implementado |
|---|---|
| Média de CO₂ | Soma dos valores de CO₂ dividida pela quantidade de medições retornadas, arredondada para inteiro |
| Média de temperatura | Soma das temperaturas dividida pela quantidade de medições retornadas, apresentada com uma casa decimal |
| Média de umidade | Soma dos valores de umidade dividida pela quantidade de medições retornadas, arredondada para inteiro |
| Total de medições | Quantidade de registros retornados |
| Leituras críticas | Quantidade de registros com CO₂ superior a 1.200 ppm |

Quando não existem registros retornados, as médias e contagens calculadas assumem o valor zero.

## 6. Fluxo da implementação

1. O usuário acessa a tela de Histórico.
2. O usuário seleciona os filtros desejados.
3. O componente `HistoryTab.tsx` chama a função `fetchReadings`.
4. A função consulta a tabela `sensor_reading` no Supabase.
5. O Supabase retorna até 100 medições que atendem aos filtros.
6. O componente `HistoryTab.tsx` calcula as médias e contagens com base nos registros recebidos.
7. Os resultados são enviados ao componente `CriticalAlerts.tsx` para apresentação na interface.

## 7. Tratamento de consultas

| Situação | Comportamento implementado |
|---|---|
| Consulta com registros | Calcula as médias e contagens dos registros retornados |
| Consulta sem registros | Utiliza zero para médias e contagens |
| Falha na consulta ao Supabase | Exibe mensagem de erro |
| Nova tentativa | Disponibiliza botão para tentar consultar novamente |
| Alteração de filtros | Realiza nova consulta conforme os filtros selecionados |

## 8. Limitação da consulta

O Histórico trabalha com até 100 medições por consulta.

Portanto, as médias calculadas correspondem aos registros retornados após a aplicação dos filtros, não necessariamente à totalidade de medições armazenadas no banco para o período selecionado.

## 9. Observação sobre a implementação

O código atual não utiliza o endpoint Java `GET /api/readings/average` para calcular as médias.

Os cálculos são realizados diretamente no componente `HistoryTab.tsx`, sem uma função separada denominada `getAverage`.

O identificador CT6 foi preservado para manter a referência documental ao requisito E7.

## 10. Referências

**Cálculos das médias no frontend:**

https://github.com/antune-ss/pi4-0102-g9-frontend/blob/main/components/history/HistoryTab.tsx

**Consulta das medições no Supabase:**

https://github.com/antune-ss/pi4-0102-g9-frontend/blob/main/lib/services/supabase.ts

**Componente de apresentação dos indicadores:**

https://github.com/antune-ss/pi4-0102-g9-frontend/blob/main/components/history/CriticalAlerts.tsx
