package src.Configuracao;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.io.IOException;
import java.nio.charset.StandardCharsets;

public class Configuracao {

    private Configuracao() {}

    public static void carregarEnv() {
        File arquivo = new File(".env");

        if (!arquivo.exists()) {
            throw new IllegalStateException(
                "Arquivo .env não encontrado na raiz do projeto."
            );
        }

        try (BufferedReader leitor = new BufferedReader(
                new FileReader(arquivo, StandardCharsets.UTF_8))) {

            String linha;

            while ((linha = leitor.readLine()) != null) {
                linha = linha.trim();

                if (linha.isEmpty() || linha.startsWith("#")) {
                    continue;
                }

                int separador = linha.indexOf('=');

                if (separador <= 0) {
                    continue;
                }

                String chave = linha.substring(0, separador).trim();
                String valor = linha.substring(separador + 1).trim();

                if ((valor.startsWith("\"") && valor.endsWith("\"")) ||
                    (valor.startsWith("'") && valor.endsWith("'"))) {
                    valor = valor.substring(1, valor.length() - 1);
                }

                if (System.getenv(chave) == null &&
                    System.getProperty(chave) == null) {
                    System.setProperty(chave, valor);
                }
            }

        } catch (IOException e) {
            throw new IllegalStateException(
                "Erro ao carregar o arquivo .env", e
            );
        }
    }

    public static String obter(String chave, String padrao) {
        String valor = System.getenv(chave);

        if (valor == null || valor.isBlank()) {
            valor = System.getProperty(chave);
        }

        return (valor != null && !valor.isBlank()) ? valor : padrao;
    }
}
