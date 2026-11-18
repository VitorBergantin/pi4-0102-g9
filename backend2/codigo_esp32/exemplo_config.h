#pragma once
// Copie este arquivo para config.h e preencha os valores locais.
// Nunca publique config.h com senhas reais.
#define WIFI_SSID "SEU_WIFI"
#define WIFI_PASSWORD "SUA_SENHA"
#define MQTT_HOST "192.168.1.100"  // IP LAN do computador com Mosquitto
#define MQTT_PORT 1883
#define DEVICE_ID "ESP32-SALA-01"
// Se o broker exigir autenticação, adapte a chamada MQTT connect().