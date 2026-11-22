# Fluxo do E1 Leitura da qualidade do ar

**Feito quando da Entrega 1:** O sensor realiza a leitura de CO₂, temperatura e umidade, e os valores válidos são enviados ao sistema para processamento.

## Passos

1. O Coordenador Pedagógico mantém o Dispositivo IoT ligado no ambiente monitorado.
2. O Dispositivo IoT publica CT3 `sensorStatus` ao conectar ao Broker; o Broker encaminha o status ao Backend assinante. Esse status informa conectividade MQTT, não a validade da leitura do sensor.
3. O Dispositivo IoT solicita ao sensor SCD30 as leituras de CO₂, temperatura e umidade por I2C.
4. O Dispositivo IoT verifica se os valores são válidos e recentes e monta a mensagem com a identificação do dispositivo (`deviceId`) e o instante da medição (`measuredAt`).
5. O Dispositivo IoT publica a mensagem CT1 `publishReading` no Broker MQTT.
6. O Broker MQTT encaminha a mesma mensagem CT1 `publishReading` ao Backend assinante.
7. O Backend recebe os dados e valida os campos antes do processamento.
8. Em caso de desconexão inesperada, o Broker publica CT3 `sensorStatus` offline pelo Last Will and Testament (LWT), encaminhado ao Backend assinante.

## Diagrama

```mermaid
sequenceDiagram
    actor Coordenador as Coordenador Pedagógico
    participant IoT as Dispositivo IoT
    participant Broker as Broker MQTT
    participant Backend
    Coordenador->>IoT: Mantém o dispositivo ligado no ambiente
    IoT->>Broker: CT3 sensorStatus ao conectar
    Broker->>Backend: CT3 sensorStatus
    IoT->>IoT: Lê o SCD30 e monta a mensagem
    IoT->>Broker: CT1 publishReading
    Broker->>Backend: CT1 publishReading
    Backend->>Backend: Valida os campos recebidos
    opt Desconexão inesperada detectada pelo Broker
        Broker->>Backend: CT3 sensorStatus offline via LWT
    end
```

**Contratos usados:** CT1 `publishReading`, CT3 `sensorStatus`.

