# CT4 — deviceCommand

| Campo | Descrição |
|---|---|
| **Entregável** | E5 — Mecanismos de alerta |
| **Situação** | Contrato original não implementado; alerta visual implementado |
| **Fronteira implementada** | MQTT entre broker e frontend |
| **Quem envia os dados** | ESP32-S3, por meio do broker MQTT |
| **Quem recebe** | Frontend (Dashboard) |
| **Tópico utilizado** | `co2nect/{deviceId}/telemetry` |

## Entrada

O frontend recebe medições MQTT contendo:

| Campo | Tipo |
|---|---|
| `deviceId` | Texto |
| `co2` | Número |
| `temperature` | Número |
| `humidity` | Número |
| `measuredAt` | Data e hora |

## Saída e comportamento

| Condição | Resultado |
|---|---|
| CO₂ superior a 1.200 ppm em uma nova medição válida | Exibe alerta visual no Dashboard |
| Nova medição válida com CO₂ igual ou inferior a 1.200 ppm | Desativa o alerta visual |
| Mensagem inválida ou medição antiga | Não altera indevidamente o estado atual do alerta |

## Observação

O contrato original previa comandos `turnOnAlarm` e `turnOffAlarm` enviados pelo backend Java ao ESP32-S3 para acionar um alarme físico. Esse fluxo não foi implementado.

Na versão entregue, o alerta funciona diretamente no frontend, a partir das medições MQTT. Não há envio de comandos de alarme ao dispositivo.

## Evidências

- `lib/services/mqtt.ts`
- `components/dashboard/DashboardActiveAlert.tsx`
- `tests/h06-5/mqtt-dashboard.test.tsx`
- `codigo_esp32/codigo_esp32.ino`
