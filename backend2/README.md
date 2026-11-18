# CO2NNECT — Backend 2 | Firmware ESP32-S3

Firmware embarcado do sistema **CO2NNECT**, responsável por medir a concentração de dióxido de carbono (CO₂), temperatura e umidade relativa com o sensor **Sensirion SCD30**, exibir os resultados em um **OLED SSD1306** e transmitir telemetria por **Wi-Fi/MQTT** ao broker Mosquitto utilizado pelo Backend 1 (Java).

> **Escopo:** este repositório contém o firmware e a documentação do dispositivo. O broker, o banco PostgreSQL e o servidor Java pertencem ao Backend 1.

## Funcionalidades do firmware

- Aquisição periódica do SCD30 pelo barramento I²C.
- Exibição local das três grandezas no OLED 128×64.
- Publicação de medições JSON por MQTT a cada 5 segundos, desde que exista leitura recente e relógio sincronizado.
- Timestamp ISO-8601 UTC (`Z`), obtido por sincronização SNTP.
- Reconexão periódica ao Wi-Fi, broker MQTT e sensor, sem bloquear indefinidamente o laço principal.
- Publicação de estado `1` (online) e configuração MQTT Last Will and Testament `0` (offline).
- Descarte de leituras inválidas e indicação de indisponibilidade do sensor.
- Configuração local de credenciais fora do controle de versão.

## Hardware

| Componente | Função |
|---|---|
| ESP32-S3-WROOM-1 (placa de desenvolvimento) | Processamento e conexão Wi-Fi |
| Sensirion SCD30 | Medição de CO₂ (ppm), temperatura (°C) e umidade relativa (%) |
| OLED SSD1306 128×64 I²C | Visualização das medições e status |
| Fonte USB adequada à placa ESP32-S3 | Alimentação |
| Fios, conexões soldadas e caixa ventilada | Montagem física |

### Conexões I²C

| Sinal | ESP32-S3 | SCD30 | OLED |
|---|---|---|---|
| SDA | GPIO 8 | SDA | SDA |
| SCL | GPIO 9 | SCL | SCL |
| GND | GND | GND | GND |
| Alimentação | Conforme especificação dos módulos | VIN/VDD conforme breakout | VCC conforme módulo |

**Atenção:** o sensor SCD30 utiliza endereço I²C `0x61` e o OLED usualmente `0x3C`. Confirme as especificações elétricas da versão exata do SCD30 e do OLED antes de alimentar ambos; não suponha que todo breakout aceita 3,3 V ou 5 V. O barramento do ESP32-S3 deve operar em níveis de 3,3 V. Evite que o calor do ESP32 influencie a medição de temperatura do sensor.

## Estrutura

```text
.
├── codigo_esp32/
│   ├── codigo_esp32.ino
│   └── config.example.h
├── docs/
│   ├── contratos/
│   │   ├── CT1-publishReading.md
│   │   └── CT3-sensorStatus.md
│   ├── hardware/
│   │   └── MONTAGEM.md
│   └── testes/
│       └── CHECKLIST.md
├── .gitignore
└── README.md
```

## Preparação do Arduino IDE

1. Instale o pacote de placas **esp32 by Espressif Systems** no Gerenciador de Placas.
2. Selecione a placa ESP32-S3 compatível com o seu módulo e a porta serial correta.
3. Instale as bibliotecas **SparkFun SCD30 Arduino Library**, **PubSubClient**, **Adafruit GFX Library** e **Adafruit SSD1306** pelo Gerenciador de Bibliotecas.
4. Abra `codigo_esp32/codigo_esp32.ino` no Arduino IDE.
5. Copie `codigo_esp32/config.example.h` para `codigo_esp32/config.h` e preencha SSID, senha, IP do broker e identificador do dispositivo.
6. Verifique as conexões I²C, compile e grave o firmware na placa.
7. Abra o Monitor Serial em **115200 baud**.

**Rede:** `MQTT_HOST` deve ser o endereço acessível pelo ESP32 (por exemplo, IP local do computador que publica a porta 1883 do container Docker), não `localhost`. O ESP32 e o computador precisam de conectividade de rede entre si.

## Comunicação MQTT

| Finalidade | Tópico | Payload | Retained |
|---|---|---|---|
| Telemetria | `co2nect/{deviceId}/telemetry` | JSON | Não |
| Estado online | `co2nect/{deviceId}/status` | `1` | Sim |
| Estado offline (LWT) | `co2nect/{deviceId}/status` | `0` | Sim |

Exemplo de telemetria:

```json
{
  "deviceId": "ESP32-SALA-01",
  "co2": 850,
  "temperature": 24.50,
  "humidity": 45.20,
  "measuredAt": "2026-11-14T17:00:00Z"
}
```

Os valores acima são **exemplificativos**. O firmware publica as leituras reais do SCD30. O timestamp é o instante de publicação, não necessariamente o instante exato da amostragem, cuja leitura mais recente é mantida em memória. Telemetria é publicada com QoS 0 (limitação da API de publicação da biblioteca PubSubClient utilizada); o status LWT é configurado com QoS 1.

**Compatibilidade:** o Backend 1 utiliza por padrão os filtros `co2nect/+/telemetry` e `co2nect/+/status`, conforme seu `App.java`. A documentação de contrato CT1 neste pacote foi alinhada ao filtro efetivamente usado pelo Java.

## Operação e falhas

- Sem Wi-Fi: o dispositivo continua lendo o sensor e atualizando o OLED.
- Sem broker: o dispositivo tenta reconectar periodicamente e continua a operação local.
- Sem SCD30 ou sem amostras recentes: o OLED indica indisponibilidade e o firmware não publica valores antigos.
- Sem horário SNTP válido: não publica telemetria com horário inventado.
- Se a conexão MQTT cair abruptamente: o broker pode publicar o Last Will `0` no tópico de status, conforme a detecção de perda de conexão.

## Verificação

Consulte [`docs/testes/CHECKLIST.md`](docs/testes/CHECKLIST.md) para os testes de montagem, leitura, rede, MQTT e integração com Java/PostgreSQL. Consulte [`docs/hardware/MONTAGEM.md`](docs/hardware/MONTAGEM.md) para cuidados elétricos e mecânicos.

## Repositórios relacionados

- [Backend 1 — Java, broker e banco](https://github.com/antune-ss/pi4-0102-g9-backend-1)
- [Frontend — dashboard](https://github.com/antune-ss/pi4-0102-g9-frontend)

**Projeto Integrador IV — PUC-Campinas | CO2NNECT**
