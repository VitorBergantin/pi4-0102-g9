# CT1 — publishReading

| Campo | Definição |
|---|---|
| Fronteira | MQTT |
| Publicador | ESP32-S3 (Backend 2) |
| Consumidor | Backend Java (Backend 1) e Frontend (consome a telemetria MQTT diretamente do Broker) |
| Atende | E1, E2, E3, E5 |
| Tópico | `co2nect/{deviceId}/telemetry` |
| Filtro do assinante | `co2nect/+/telemetry` |
| QoS de publicação | 0 (PubSubClient) |
| Retained | Não |

## Payload

| Campo | Tipo | Obrigatório | Exemplo |
|---|---|---|---|
| `deviceId` | string | Sim | `ESP32-SALA-01` |
| `co2` | inteiro | Sim | `850` |
| `temperature` | decimal | Sim | `24.5` |
| `humidity` | decimal | Sim | `45.2` |
| `measuredAt` | string ISO-8601 UTC | Sim | `2026-11-14T17:00:00Z` |

O timestamp é gerado na publicação com relógio SNTP sincronizado. Valores inválidos ou ausência de dados recentes impedem o envio. Mensagens inválidas devem ser rejeitadas pelo Backend 1. Não há resposta MQTT de aplicação.
