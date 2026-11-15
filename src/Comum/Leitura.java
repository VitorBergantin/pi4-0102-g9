package src.Cliente;

import org.eclipse.paho.client.mqttv3.MqttMessage;

import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

import java.nio.charset.StandardCharsets;

public class Leitura extends Comunicado {
    private String deviceId;
    private int co2;
    private double temperature;
    private double humidity;
    private String measuredAt;

    protected void validaDouble(double num) {
        if (num < 0 || !Double.isFinite(num))
            throw new IllegalArgumentException("Valor de leitura inválido");
        return;
    }

    protected void validaString(String str) {
        if (str == null || str.isBlank())
            throw new IllegalArgumentException("Valor de leitura inválido");
        return;
    }

    public Leitura(String devId, int co2, double temp, double hum, String measure) {
        setDeviceId(devId);
        setCo2(co2);
        setTemperature(temp);
        setHumidity(hum);
        setMeasuredAt(measure);
    }

    public void setDeviceId(String deviceId) {
        validaString(deviceId);
        this.deviceId = deviceId;
    }

    public void setCo2(int co2) {
        // co2 é medido em ppm (partes por milhão)
        if (co2 > 1000000 || co2 < 0)
            throw new IllegalArgumentException("Valor de co2 fora dos limites");

        this.co2 = co2;
    }

    public void setTemperature(double temperature) { // temperatura pode ser negativa
        if (temperature < -273 || temperature > 100 || !Double.isFinite(temperature))
            throw new IllegalArgumentException("Valores extremos de temperatura detectados");
        this.temperature = temperature;
    }

    public void setHumidity(double humidity) {
        validaDouble(humidity);

        if (humidity > 100)
            throw new IllegalArgumentException("Humidade maior que 100% é impossível");
        this.humidity = humidity;
    }

    public void setMeasuredAt(String measuredAt) {
        validaString(measuredAt);
        this.measuredAt = measuredAt;
    }

    public String getDeviceId() {
        return deviceId;
    }

    public double getCo2() {
        return co2;
    }

    public double getTemperature() {
        return temperature;
    }

    public double getHumidity() {
        return humidity;
    }

    public String getMeasuredAt() {
        return measuredAt;
    }

    public static Leitura pegaLeitura(MqttMessage mensagem) {

        String json = new String(mensagem.getPayload(), StandardCharsets.UTF_8);

        JsonObject leitura = JsonParser.parseString(json).getAsJsonObject();

        String devId = leitura.get("deviceId").getAsString();
        int co2 = leitura.get("co2").getAsInt();
        double temp = leitura.get("temperature").getAsDouble();
        double umidade = leitura.get("humidity").getAsDouble();
        String measure = leitura.get("measuredAt").getAsString();

        return new Leitura(devId, co2, temp, umidade, measure);
    }
}
