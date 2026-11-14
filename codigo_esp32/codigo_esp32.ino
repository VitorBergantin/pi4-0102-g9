/*
 * CO2NNECT - Backend 2 | ESP32-S3 + Sensirion SCD30 + OLED SSD1306
 * Arduino-ESP32; bibliotecas: SparkFun SCD30 Arduino Library,
 * PubSubClient, Adafruit GFX Library, Adafruit SSD1306.
 * Copie config.example.h para config.h e configure Wi-Fi / broker.
 * MQTT: co2nect/{DEVICE_ID}/telemetry e co2nect/{DEVICE_ID}/status
 */
#include <Arduino.h>
#include <Wire.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include <SparkFun_SCD30_Arduino_Library.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <time.h>
#include <math.h>
#include "config.h"

constexpr uint8_t SDA_PIN = 8;
constexpr uint8_t SCL_PIN = 9;
constexpr uint8_t OLED_ADDR = 0x3C;
constexpr uint32_t SENSOR_RETRY_MS = 5000;
constexpr uint32_t SENSOR_POLL_MS = 2000;
constexpr uint32_t SENSOR_STALE_MS = 15000;
constexpr uint32_t MQTT_SEND_MS = 5000;
constexpr uint32_t WIFI_RETRY_MS = 10000;
constexpr uint32_t MQTT_RETRY_MS = 5000;
constexpr uint32_t OLED_REFRESH_MS = 1000;
constexpr uint32_t SERIAL_BAUD = 115200;

SCD30 scd30;
Adafruit_SSD1306 display(128, 64, &Wire, -1);
WiFiClient wifiClient;
PubSubClient mqtt(wifiClient);

bool sensorReady = false;
bool oledReady = false;
bool hasReading = false;
uint16_t lastCO2 = 0;
float lastTemp = NAN;
float lastHumidity = NAN;
uint32_t lastSensorAttempt = 0;
uint32_t lastSensorPoll = 0;
uint32_t lastReadingMs = 0;
uint32_t lastWifiAttempt = 0;
uint32_t lastMqttAttempt = 0;
uint32_t lastPublishMs = 0;
uint32_t lastOledMs = 0;
String telemetryTopic;
String statusTopic;
String mqttClientId;

bool timeIsValid() {
  time_t now = time(nullptr);
  return now > 1700000000; // Relogio sincronizado (posterior a 2023)
}

bool timestampUtc(char* out, size_t len) {
  if (!timeIsValid()) return false;
  time_t now = time(nullptr);
  struct tm utc;
  if (gmtime_r(&now, &utc) == nullptr) return false;
  return strftime(out, len, "%Y-%m-%dT%H:%M:%SZ", &utc) > 0;
}

void connectWifiIfNeeded(uint32_t now) {
  if (WiFi.status() == WL_CONNECTED) return;
  if (lastWifiAttempt != 0 && now - lastWifiAttempt < WIFI_RETRY_MS) return;
  lastWifiAttempt = now;
  Serial.println("[WiFi] Tentando conectar...");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
}

void connectMqttIfNeeded(uint32_t now) {
  if (WiFi.status() != WL_CONNECTED || mqtt.connected()) return;
  if (lastMqttAttempt != 0 && now - lastMqttAttempt < MQTT_RETRY_MS) return;
  lastMqttAttempt = now;
  // LWT: broker publica '0' retido quando conexao MQTT cai inesperadamente.
  bool ok = mqtt.connect(mqttClientId.c_str(), statusTopic.c_str(), 1, true, "0");
  if (!ok) {
    Serial.printf("[MQTT] Falha ao conectar, state=%d\n", mqtt.state());
    return;
  }
  mqtt.publish(statusTopic.c_str(), "1", true);
  Serial.println("[MQTT] Conectado; status online publicado.");
}

void initSensorIfNeeded(uint32_t now) {
  if (sensorReady) return;
  if (lastSensorAttempt != 0 && now - lastSensorAttempt < SENSOR_RETRY_MS) return;
  lastSensorAttempt = now;
  sensorReady = scd30.begin(Wire); // Biblioteca SparkFun; endereco I2C 0x61
  if (sensorReady) {
    Serial.println("[SCD30] Inicializado.");
    // A taxa padrao e 2 s; configura explicitamente.
    scd30.setMeasurementInterval(2);
  } else {
    Serial.println("[SCD30] Ausente; nova tentativa em 5 s.");
  }
}

void pollSensor(uint32_t now) {
  if (!sensorReady || now - lastSensorPoll < SENSOR_POLL_MS) return;
  lastSensorPoll = now;
  if (!scd30.dataAvailable()) {
    if (hasReading && now - lastReadingMs > SENSOR_STALE_MS) {
      hasReading = false;
      sensorReady = false;
      Serial.println("[SCD30] Sem dados recentes; reinicializando.");
    }
    return;
  }
  const uint16_t co2 = scd30.getCO2();
  const float temp = scd30.getTemperature();
  const float hum = scd30.getHumidity();
  if (co2 == 0 || !isfinite(temp) || !isfinite(hum) ||
      temp < -40 || temp > 100 || hum < 0 || hum > 100) {
    Serial.println("[SCD30] Leitura invalida descartada.");
    return;
  }
  lastCO2 = co2;
  lastTemp = temp;
  lastHumidity = hum;
  hasReading = true;
  lastReadingMs = now;
  Serial.printf("[SCD30] CO2=%u ppm | T=%.1f C | UR=%.1f %%\n", co2, temp, hum);
}

void publishReading(uint32_t now) {
  if (now - lastPublishMs < MQTT_SEND_MS) return;
  lastPublishMs = now;
  if (!hasReading || now - lastReadingMs > SENSOR_STALE_MS || !mqtt.connected()) return;
  char timestamp[25];
  if (!timestampUtc(timestamp, sizeof(timestamp))) {
    Serial.println("[MQTT] Aguardando sincronizacao NTP; medicao nao enviada.");
    return;
  }
  char json[256];
  int n = snprintf(json, sizeof(json),
      "{\"deviceId\":\"%s\",\"co2\":%u,\"temperature\":%.2f,\"humidity\":%.2f,\"measuredAt\":\"%s\"}",
      DEVICE_ID, lastCO2, lastTemp, lastHumidity, timestamp);
  if (n < 0 || static_cast<size_t>(n) >= sizeof(json)) {
    Serial.println("[MQTT] Payload excedeu buffer.");
    return;
  }
  if (mqtt.publish(telemetryTopic.c_str(), json)) {
    Serial.printf("[MQTT] %s -> %s\n", telemetryTopic.c_str(), json);
  } else {
    Serial.println("[MQTT] Falha ao publicar medicao.");
  }
}

void refreshOled(uint32_t now) {
  if (!oledReady || now - lastOledMs < OLED_REFRESH_MS) return;
  lastOledMs = now;
  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);
  display.setTextSize(1);
  display.setCursor(0, 0);
  display.print("CO2NNECT  ");
  display.println(mqtt.connected() ? "MQTT OK" : "LOCAL");
  display.drawLine(0, 11, 127, 11, SSD1306_WHITE);
  if (!hasReading || now - lastReadingMs > SENSOR_STALE_MS) {
    display.setCursor(0, 23);
    display.println("SCD30 SEM LEITURA");
  } else {
    display.setCursor(0, 17);
    display.setTextSize(2);
    display.print(lastCO2);
    display.setTextSize(1);
    display.println(" ppm");
    display.setCursor(0, 42);
    display.print("Temp: "); display.print(lastTemp, 1); display.println(" C");
    display.setCursor(0, 54);
    display.print("UR:   "); display.print(lastHumidity, 1); display.println(" %");
  }
  display.display();
}

void setup() {
  Serial.begin(SERIAL_BAUD);
  delay(200);
  Wire.begin(SDA_PIN, SCL_PIN);
  Wire.setClock(100000);
  oledReady = display.begin(SSD1306_SWITCHCAPVCC, OLED_ADDR);
  if (!oledReady) Serial.println("[OLED] Nao detectado; seguindo sem tela.");
  telemetryTopic = String("co2nect/") + DEVICE_ID + "/telemetry";
  statusTopic = String("co2nect/") + DEVICE_ID + "/status";
  mqttClientId = String("co2nnect-") + DEVICE_ID;
  mqtt.setServer(MQTT_HOST, MQTT_PORT);
  mqtt.setBufferSize(512);
  mqtt.setKeepAlive(20);
  mqtt.setSocketTimeout(2);
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  // SNTP nativo do ESP32, com data/hora sempre em UTC.
  configTime(0, 0, "pool.ntp.org", "time.google.com");
  initSensorIfNeeded(millis());
  refreshOled(millis());
  Serial.println("[CO2NNECT] Firmware inicializado.");
}

void loop() {
  uint32_t now = millis();
  initSensorIfNeeded(now);
  pollSensor(now);
  connectWifiIfNeeded(now);
  connectMqttIfNeeded(now);
  if (mqtt.connected()) mqtt.loop();
  publishReading(now);
  refreshOled(now);
  delay(5);
}
