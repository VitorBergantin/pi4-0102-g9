
package src.Servidor;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;

import src.Configuracao.Configuracao;

public class Servidor {

    public static String PORTA_PADRAO = "3000";

    public static void main(String[] args) {

        if (args.length > 1) {
            System.err.println(
                "Erro na passagem de valores. Uso esperado: java Servidor [PORTA]"
            );
            return;
        }

        // Carrega o .env antes de inicializar o DatabaseManager.
        // Isso também garante que APP_TIMEZONE seja definido antes
        // da inicialização do fuso estático da classe DatabaseManager.
        try {
            if (Files.isRegularFile(Path.of(".env"))) {
                Configuracao.carregarEnv();
            }
        } catch (RuntimeException erro) {
            System.err.println(
                "Erro ao carregar as configurações: " + erro.getMessage()
            );
            return;
        }

        String porta = PORTA_PADRAO;

        if (args.length == 1) {
            porta = args[0];
        }

        DatabaseManager databaseManager = new DatabaseManager();

        ArrayList<Parceiro> usuarios = new ArrayList<>();

        try {
            AceitadorDeConexao aceitador =
                new AceitadorDeConexao(porta, usuarios, databaseManager);

            aceitador.start();

            System.out.println(
                "Servidor executado na porta " + porta + "..."
            );

        } catch (Exception erro) {
            System.err.println(
                "Erro ao iniciar o aceitador: " + erro.getMessage()
            );
            return;
        }

        // Inicialização da API HTTP do histórico (CT5).
        // Uma falha na API não interrompe a ingestão das leituras.
        try {
            int portaHttp = Integer.parseInt(
                Configuracao.obter(
                    "HTTP_PORT",
                    String.valueOf(ReadingsApiServer.DEFAULT_PORT)
                )
            );

            ReadingsApiServer api =
                new ReadingsApiServer(portaHttp, databaseManager);

            api.start();

            System.out.println(
                "API HTTP no ar: http://localhost:"
                + portaHttp
                + ReadingsApiServer.PATH
            );

        } catch (Exception erro) {
            System.err.println(
                "Erro ao iniciar a API HTTP: " + erro.getMessage()
            );
        }
    }
}