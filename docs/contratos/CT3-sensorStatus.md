# CT3 — sensorStatus

| Campo | Definição |
|---|---|
| Fronteira | MQTT |
| Publicador | ESP32-S3 ou broker (LWT) |
| Consumidor | Backend 1 Java e Frontend (exibição de conectividade MQTT) |
| Atende | E1, E3, E5 |
| Tópico | `co2nect/{deviceId}/status` |
| Filtro do assinante | `co2nect/+/status` |
| Payload | `1` = online; `0` = offline |
| Retained | Sim |

Na conexão MQTT, o ESP32 publica `1`. A sessão configura Last Will and Testament `0` (QoS 1, retained), emitido pelo broker após detectar desconexão inesperada. O status indica conectividade MQTT, **não** saúde ou validade da leitura do SCD30. A desconexão graciosa não emite automaticamente LWT; para desligamento controlado, seria necessário publicar `0` antes de desconectar.

O Frontend consome esse status diretamente do Broker para exibir conectividade. Esse status não representa um estado de alerta de CO₂ e não ativa nem desativa o alerta visual.
