# Fluxo do E2 Registro das leituras

**Feito quando da Entrega 1:** Após uma leitura do sensor, o sistema armazena a data e os valores de CO₂, temperatura e umidade, que permanecem disponíveis para consulta posterior.

## Passos

1. O Coordenador Pedagógico mantém o ambiente sob monitoramento.
2. O Dispositivo IoT publica uma nova leitura válida no Broker MQTT por meio de CT1 `publishReading`.
3. O Broker MQTT encaminha a mesma leitura CT1 `publishReading` ao Backend assinante.
4. O Backend valida os campos da leitura antes da gravação.
5. O Backend grava a leitura na tabela `sensor_reading` utilizando CT2.
6. O Banco confirma a gravação e a medição fica disponível para consultas posteriores.

## Diagrama

```mermaid
sequenceDiagram
    actor Coordenador as Coordenador Pedagógico
    participant IoT as Dispositivo IoT
    participant Broker as Broker MQTT
    participant Backend
    participant Banco
    Coordenador->>IoT: Mantém o ambiente monitorado
    IoT->>Broker: CT1 publishReading
    Broker->>Backend: CT1 publishReading
    Backend->>Backend: Valida os campos da leitura
    Backend->>Banco: CT2 sensor_reading
    Banco-->>Backend: Gravação confirmada
```

**Contratos usados:** CT1 `publishReading`, CT2 `sensor_reading`

