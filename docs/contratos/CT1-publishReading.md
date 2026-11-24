# CT1 — publishReading

| Campo | Definição |
|---|---|
| Fronteira | MQTT — comunicação entre dispositivo, broker e consumidores |
| Publicador | ESP32-S3 (Backend 2) |
| Consumidor | Cliente MQTT Java (Backend 1) e frontend Next.js, por assinatura do broker |
| Atende | E1, E2, E3 e E5 (alerta visual) |
| Tópico | `co2nect/{deviceId}/telemetry` |
| Filtro do assinante | `co2nect/+/telemetry` |
| Protocolo | MQTT sobre TCP na publicação do dispositivo; MQTT sobre WebSocket no frontend |
| Formato da mensagem | JSON codificado em UTF-8 |
| QoS de publicação | 0 (PubSubClient) |
| Retained | Não |
| Periodicidade | Tentativa de publicação a cada aproximadamente 5 segundos |
| Resposta de aplicação | Não há |

## Payload

| Campo | Tipo | Obrigatório | Exemplo |
|---|---|---|---|
| `deviceId` | string | Sim | `ESP32-SALA-01` |
| `co2` | inteiro | Sim | `850` |
| `temperature` | decimal | Sim | `24.5` |
| `humidity` | decimal | Sim | `45.2` |
| `measuredAt` | string ISO-8601 UTC | Sim | `2026-11-14T17:00:00Z` |

O timestamp `measuredAt` é gerado no momento da publicação, utilizando o relógio sincronizado por SNTP, e não necessariamente no instante exato da coleta física. O firmware publica somente quando existe conexão MQTT, leitura válida e recente do sensor e horário sincronizado.

Na implementação do dispositivo, não são publicadas leituras de CO₂ iguais a zero, temperaturas fora do intervalo de -40 °C a 100 °C ou valores de umidade fora de 0% a 100%. Leituras inválidas, antigas ou indisponíveis impedem a publicação.

O Backend 1 recebe o JSON por MQTT, converte a mensagem em um objeto `Leitura` e a encaminha ao servidor Java por socket TCP, para validação e persistência no PostgreSQL. O frontend recebe a telemetria diretamente do broker por MQTT sobre WebSocket.

O identificador `deviceId` do payload deve corresponder ao identificador do dispositivo presente no tópico MQTT. Mensagens inválidas devem ser rejeitadas pelos consumidores, sem serem interpretadas como medições válidas.

Como o firmware publica em QoS 0, sem retained e sem armazenamento persistente para reenvio, não há garantia de entrega ou recuperação de mensagens perdidas durante interrupções. Também não existe resposta MQTT de aplicação confirmando que a leitura foi armazenada no banco de dados.

**Observação de compatibilidade:** na versão examinada, o firmware e a persistência Java aceitam temperaturas até 100 °C, enquanto o consumidor MQTT do frontend rejeita temperaturas superiores a 90 °C. Essa divergência deve ser alinhada entre os módulos ou registrada como limitação conhecida até sua correção.
