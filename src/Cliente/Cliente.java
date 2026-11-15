package src.Cliente;

import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;

import src.Configuracao.Configuracao;
import src.Comum.Comunicado;
import src.Comum.Leitura;

import java.net.*;
import java.io.*;

public class Cliente {
    public static final String HOST_PADRAO = "localhost";
    public static final int PORTA_PADRAO = 3000;

    public static void main(String[] args) {
        if (args.length > 2) {
            System.err.println("Erro: muitas informações passadas para [HOST[PORTA]]");
            return;
        }

        Socket conexao = null;

        try {
            String host = Cliente.HOST_PADRAO;
            int porta = Cliente.PORTA_PADRAO;

            // foram passadas informações sobre host
            if (args.length > 0)
                host = args[0];

            if (args.length == 2)
                porta = Integer.parseInt(args[1]);

            conexao = new Socket(host, porta);

        } catch (Exception e) {
            System.err.println("Erro ao conectar com o servidor, verifique o host e porta passados");
            return;
        }

        ObjectOutputStream output = null;

        try {
            output = new ObjectOutputStream(conexao.getOutputStream());
        } catch (Exception e) {
            System.err.println("Erro ao conectar com o servidor, verifique o host e porta passados");
            return;
        }

        ObjectInputStream input = null;

        try {
            input = new ObjectInputStream(conexao.getInputStream());
        } catch (Exception e) {
            System.err.println("Erro ao conectar com o servidor, verifique o host e porta passados");
            return;
        }

        Parceiro servidor = null;

        try {
            servidor = new Parceiro(conexao, input, output);
        } catch (Exception e) {
            System.err.println("Erro ao conectar com o servidor, verifique o host e porta passados");
            return;
        }

        DesligamentoHandler desligamento = null;

        try {
            desligamento = new DesligamentoHandler(servidor);
        } catch (Exception e) {
        }

        BlockingQueue<Leitura> fila = new LinkedBlockingQueue<>();
        try {
            Configuracao.carregarEnv();

            String broker = Configuracao.obter("MQTT_BROKER_URL", "tcp://localhost:1883");
            String usuario = Configuracao.obter("MQTT_USER", null);
            String senha = Configuracao.obter("MQTT_PASSWORD", null);
            String certificado = Configuracao.obter("MQTT_CA_CERT", null);

            // TODO: Conferir se o caminho do mqtt_ca_cert está correto como: certs/emqxsl-ca.crt
            LeitorMqtt leitor = new LeitorMqtt(fila, broker, usuario, senha, certificado);
            leitor.iniciar();
        } catch (Exception e) {
            System.out.println("Erro com o Leitor Mqtt");
        }

        do {
            try {
               // LeitorMqtt lança as Leituras no BlockingQueue
                Leitura leitura = fila.take();

                servidor.receba(leitura); 

            } catch (InterruptedException e) {
                System.out.println("Conexão com o cliente interrompida");
                Thread.currentThread().interrupt();
                break;
            } catch (Exception e) {
                System.err.println("Erro ao enviar leitura ao servidor: " + e.getMessage());
            }

        } while (true);
    }
}
