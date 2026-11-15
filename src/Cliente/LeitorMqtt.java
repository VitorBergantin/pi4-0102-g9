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

public class LeitorMqtt implements MqttCallbackExtended {

    // TODO: Verificar se é este caminho mesmo
    private static final String TOPICO = "ar/sala01/leituras";

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

        options.setUserName(usuario);
        options.setPassword(senha.toCharArray());

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

        System.out.println(reconectando ? "Reconectado ao broker MQTT!" : "Conectado ao broker MQTT!");

        try {
            cliente.subscribe(TOPICO, 1);
            System.out.println("Aguardando leituras do ESP32...");
        } catch (MqttException e) {
            System.err.println("Erro ao assinar tópico: " + e.getMessage());
        }
    }

    @Override
    public void messageArrived(String topic, MqttMessage mensagem) throws Exception {

        System.out.println("Mensagem recebida no tópico: " + topic);

        try {
            Leitura leitura = Leitura.pegaLeitura(mensagem);
            fila.put(leitura);

            System.out.println("Leitura convertida com sucesso!");

        } catch (RuntimeException e) {
            System.err.println("Erro ao interpretar ou validar a leitura: " + e.getMessage());
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
