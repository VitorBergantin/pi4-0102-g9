package src.Servidor;

import java.io.*;
import java.net.*;
import java.util.*;

import src.Comum.Comunicado;
import src.Comum.Leitura;

import java.sql.SQLException;

public class SupervisoraDeConexao extends Thread {
    private Socket conexao;
    private ArrayList<Parceiro> usuarios;
    private Parceiro usuario;
    private DatabaseManager databaseManager;

    public SupervisoraDeConexao(Socket conexao, ArrayList<Parceiro> usuarios, DatabaseManager manager) throws Exception {
        if (conexao == null)
            throw new Exception("Conexão ausente");
        if (usuarios == null)
            throw new Exception("Usuários ausentes");

        this.conexao = conexao;
        this.usuarios = usuarios;
        this.databaseManager = manager;
    }

    @Override
    public void run() {
        ObjectOutputStream transmissor = null;
        try {
            transmissor = new ObjectOutputStream(this.conexao.getOutputStream());
        } catch (Exception erro) {
            try {
                this.conexao.close();
            } catch (Exception ignored) {}
            return;
        }

        ObjectInputStream receptor = null;
        try {
            receptor = new ObjectInputStream(this.conexao.getInputStream());
        } catch (Exception erro) {
            try {
                transmissor.close();
            } catch (Exception ignored) {}

            try {
                this.conexao.close();
            } catch (Exception ignored) {}

            return;
        }

        try {
            this.usuario = new Parceiro(this.conexao, receptor, transmissor);
        } catch (Exception erro) {
            try {
                receptor.close();
            } catch (Exception ignored) {}

            try {
                transmissor.close();
            } catch (Exception ignored) {}

            try {
                this.conexao.close();
            } catch (Exception ignored) {}

            return;
        }

        try {
            // Adiciona o parceiro à lista sincronizada
            synchronized (this.usuarios) {
                this.usuarios.add(this.usuario);
            }

            // Loop principal de comunicação com o cliente
            for (;;) {
                Comunicado comunicado = this.usuario.envie();
                if (comunicado == null)
                    return;

                // Adiciono a leitura ao banco
                if (comunicado instanceof Leitura leitura) {
                    try {
                        this.databaseManager.saveRead(leitura);
                    } catch (SQLException | IllegalArgumentException erroBanco) {
                        // Banco fora do ar ou leitura rejeitada: descarta só ESTA leitura e
                        // mantém a conexão com o cliente; a próxima leitura abre nova conexão JDBC.
                        System.err.println("[DB] Leitura não gravada (" + leitura.getDeviceId() + "): "
                                + erroBanco.getMessage());
                    }
                }
            }
        } catch (Exception erro) {
            // Cliente desconectou ou ocorreu erro de leitura
        } finally {
            // Remove o cliente da lista e encerra a conexão
            synchronized (this.usuarios) {
                this.usuarios.remove(this.usuario);
            }
            try {
                this.usuario.adeus();
            } catch (Exception ignored) {
            } finally {
                try {
                    this.conexao.close();
                } catch (IOException ignored) {}
            }
        }
    }
}
