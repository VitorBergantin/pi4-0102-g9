# ADR 0001: adotar MQTT para transmitir as medições do dispositivo

**Status:** Aceito — decisão revisada.

**Contexto:** O CO₂NNECT utiliza um ESP32-S3 conectado ao sensor SCD30 para coletar medições de CO₂, temperatura e umidade relativa. Essas informações precisam ser transmitidas continuamente para processamento, armazenamento e visualização no Dashboard. Inicialmente, foi proposto utilizar WebSocket diretamente entre o dispositivo e o backend. Entretanto, durante o desenvolvimento, a arquitetura foi implementada com MQTT e um broker intermediário, permitindo distribuir as medições a diferentes consumidores.

**Decisão:** Utilizar MQTT no modelo Publish/Subscribe para a transmissão das medições do ESP32-S3. O dispositivo publica mensagens JSON no tópico `co2nect/{deviceId}/telemetry`, conforme o CT1, utilizando QoS 0 e sem retained. O broker distribui essas mensagens ao cliente MQTT Java do Backend 1 e ao frontend. O cliente Java encaminha as leituras ao servidor Java por socket TCP para persistência no PostgreSQL. O frontend utiliza MQTT sobre WebSocket para receber as atualizações. Dessa forma, WebSocket permanece na arquitetura como transporte MQTT do navegador, mas não como comunicação direta entre ESP32-S3 e servidor Java.

**Alternativas consideradas:**
- **WebSocket direto entre dispositivo e backend:** proposta inicial não adotada na implementação final, pois exigiria gerenciar diretamente a conexão entre o dispositivo e o servidor de aplicação.
- **Requisições HTTP por leitura:** alternativa possível, mas exigiria requisições independentes e um mecanismo adicional para distribuir as medições aos diferentes consumidores.
- **MQTT com broker intermediário:** alternativa adotada por permitir a organização das mensagens em tópicos e o consumo da mesma telemetria por diferentes componentes.

**Consequências:**
- **Positivas:** separa os publicadores dos consumidores, permite que backend e frontend recebam a mesma telemetria, organiza as mensagens por dispositivo e possibilita a reconexão dos clientes MQTT.
- **Negativas:** depende da disponibilidade do broker e da conexão de rede. Como o firmware publica com QoS 0 e não mantém fila persistente de reenvio, não há garantia de recuperação de medições perdidas. Também são necessárias configurações adequadas de segurança, autenticação e controle de acesso em ambientes não isolados.

A presente revisão registra a decisão arquitetural efetivamente implementada, preservando o histórico da proposta inicial de WebSocket direto.
