# Checklist de validação — Backend 2

Utilizar para os testes do hardware

- [ ] Firmware compila na versão instalada do Arduino-ESP32 e bibliotecas listadas.
- [ ] Monitor Serial inicia em 115200 baud.
- [ ] SCD30 é detectado no endereço 0x61 e produz amostras reais.
- [ ] OLED responde no endereço 0x3C e exibe CO₂, temperatura e umidade.
- [ ] Wi-Fi conecta e o broker é acessível pelo IP configurado.
- [ ] MQTT recebe `co2nect/ESP32-SALA-01/telemetry` com JSON válido.
- [ ] Timestamp termina em `Z` e é aceito pelo Java.
- [ ] MQTT recebe status retido `1` após conexão.
- [ ] Desconexão inesperada gera status LWT `0` após timeout do broker.
- [ ] Ao desligar Wi-Fi, OLED continua atualizando as leituras.
- [ ] Ao desconectar SCD30, não há publicação de leituras obsoletas.
- [ ] Após reconectar o sensor, o firmware volta a obter leituras.
- [ ] Backend 1 persiste medições reais no PostgreSQL.
- [ ] Frontend exibe os dados provenientes do dispositivo físico.

## Inspeção MQTT pelo computador

Com Mosquitto CLI instalado e broker acessível:

```bash
mosquitto_sub -h IP_DO_BROKER -p 1883 -t 'co2nect/#' -v
```

Não use `localhost` como host no firmware do ESP32: esse endereço aponta para o próprio microcontrolador.
