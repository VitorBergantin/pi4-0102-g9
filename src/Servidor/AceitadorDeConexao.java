package src.Servidor;

import java.net.*;
import java.util.*;

public class AceitadorDeConexao extends Thread {
    private ServerSocket pedido;
    private ArrayList<Parceiro> usuarios;
    private DatabaseManager databaseManager;

    public AceitadorDeConexao(String porta, ArrayList<Parceiro> users, DatabaseManager manager) throws Exception {
        if (porta == null)
            throw new Exception("Porta ausente");

        try {
            this.pedido = new ServerSocket(Integer.parseInt(porta));
        } catch (Exception e){
            throw new Exception("Porta invalida");
        }

        if (users == null)
            throw new Exception("Usuarios ausentes");

        this.usuarios = users;

        this.databaseManager = manager;
    }
    @Override
    public void run() {
        for (;;) {
            Socket conexao = null;

            try {
                conexao = this.pedido.accept();
            } catch (Exception e) {
                continue;
            }

            SupervisoraDeConexao supervisoraDeConexao = null;

            try {
                supervisoraDeConexao = new SupervisoraDeConexao(conexao, this.usuarios, this.databaseManager);
                //inicio da thread da supervisora para o cliente
                supervisoraDeConexao.start();
            } catch (Exception e) {}
            try {
                conexao.close();
            } catch (Exception erroClose) {}
            continue;
        }
    }
}
