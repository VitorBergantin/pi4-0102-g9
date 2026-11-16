package src.Cliente;

//Para mandar a leitura para o Cliente
import src.Comum.Leitura;
import java.util.concurrent.BlockingQueue;
import java.util.UUID;

import org.eclipse.paho.client.mqttv3.MqttCallbackExtended;
import org.eclipse.paho.client.mqttv3.MqttClient;
import org.eclipse.paho.client.mqttv3.MqttException;
import org.eclipse.paho.client.mqttv3.MqttMessage;
import org.eclipse.paho.client.mqttv3.IMqttDeliveryToken;
import org.eclipse.paho.client.mqttv3.MqttConnectOptions;
import org.eclipse.paho.client.mqttv3.persist.MemoryPersistence;
import java.nio.charset.StandardCharsets;

public class LeitorMqtt implements MqttCallbackExtended {

    private static final String TOPICO_TELEMETRIA = "co2nect/+/telemetry";
    private static final String TOPICO_STATUS = "co2nect/+/status";

    private MqttClient cliente;
    private BlockingQueue<Leitura> fila;
    private final String enderecoBroker;
    private final String usuario;
    private final String senha;
    private final String caminhoCertificado;

    public LeitorMqtt(BlockingQueue<Leitura> fila, String enderecoBroker, String usuario, String senha, String caminhoCertificado) {

        this.fila = fila;
        this.enderecoBroker = enderecoBroker;
        this.usuario = usuario;
        this.senha = senha;
        this.caminhoCertificado = caminhoCertificado;
    }

    public void iniciar() throws MqttException {

        String clientId = "servidor-java-" + UUID.randomUUID();

        cliente = new MqttClient(enderecoBroker, clientId, new MemoryPersistence());

        MqttConnectOptions options = new MqttConnectOptions();

        options.setAutomaticReconnect(true);
        options.setCleanSession(true);
        options.setConnectionTimeout(10);
        options.setKeepAliveInterval(60);

        if (usuario != null && !usuario.isBlank()) {
            options.setUserName(usuario);
        }

        if (senha != null && !senha.isBlank()) {
            options.setPassword(senha.toCharArray());
        }


        // Configuração TLS, quando utilizada
        if (enderecoBroker.startsWith("ssl://") && caminhoCertificado != null && !caminhoCertificado.isBlank()) {

            try {
                options.setSocketFactory(MqttSslUtils.getSocketFactory(caminhoCertificado));
            } catch (Exception e) {
                throw new MqttException(new Exception("Erro ao configurar certificado TLS", e));
            }
        }

        cliente.setCallback(this);
        cliente.connect(options);

    }

   @Override
    public void connectComplete(boolean reconectando, String endereco) {
        try {
            System.out.println("Conectado ao broker MQTT: " + endereco);

            cliente.subscribe(TOPICO_TELEMETRIA, 1);
            cliente.subscribe(TOPICO_STATUS, 1);

            System.out.println("Inscrito nos tópicos MQTT:");
            System.out.println("- " + TOPICO_TELEMETRIA);
            System.out.println("- " + TOPICO_STATUS);

        } catch (MqttException e) {
            System.err.println("Erro ao assinar tópicos MQTT: " + e.getMessage());
        }
    }

    @Override
    public void messageArrived(String topic, MqttMessage mensagem) throws Exception {

        String conteudo = new String(
            mensagem.getPayload(),
            java.nio.charset.StandardCharsets.UTF_8
        );

        if (topic.endsWith("/telemetry")) {

            Leitura leitura = Leitura.pegaLeitura(mensagem);
            fila.put(leitura);

            System.out.println("Leitura recebida de " + topic);

        } else if (topic.endsWith("/status")) {
            if ("1".equals(conteudo)) {
                System.out.println("Dispositivo online: " + topic);
            } else if ("0".equals(conteudo)) {
                System.out.println("Dispositivo offline: " + topic);
            } else {
                System.err.println("Status desconhecido: " + conteudo);
            }
        }
    }

    @Override
    public void connectionLost(Throwable causa) {
        System.err.println("Conexão MQTT perdida: " + (causa != null ? causa.getMessage() : "Causa desconhecida"));

        System.out.println("Aguardando reconexão automática...");
    }

    @Override
    public void deliveryComplete(IMqttDeliveryToken token) {
        // Utilizado para confirmar entregas de mensagens publicadas.
    }

    public void close() throws MqttException {
        if (cliente != null) {
            if (cliente.isConnected()) {
                cliente.disconnect();
            }

            cliente.close();
        }
    }
}
