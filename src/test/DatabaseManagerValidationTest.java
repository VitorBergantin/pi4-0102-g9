package src.test;

import static org.junit.Assert.assertTrue;
import static org.junit.Assert.fail;

import java.sql.SQLException;
import java.time.Instant;

import org.junit.Before;
import org.junit.Test;

import src.Comum.Leitura;
import src.Servidor.DatabaseManager;

/**
 * Testes que NÃO precisam de banco: a validação acontece antes de abrir conexão.
 * Rodam sempre, inclusive no `mvn test` de um PR.
 */
public class DatabaseManagerValidationTest {
    // Porta 1 não tem nada escutando: qualquer tentativa de conexão falha.
    private static final String DEAD_URL = "jdbc:postgresql://localhost:1/co2nect";
    private DatabaseManager db;

    @Before
    public void setUp() {
        db = new DatabaseManager(DEAD_URL, "u", "p");
    }

    private static Leitura valid() {
        return new Leitura("ESP32-SALA-01", 850, 24.5, 45.2, "2026-10-13T19:20:00Z");
    }

    private void assertRejected(String motivo, Leitura data) throws SQLException {
        try {
            db.saveRead(data);
            fail("Deveria rejeitar: " + motivo);
        } catch (IllegalArgumentException esperado) {
            // ok: rejeitado antes de tocar no banco
        }
    }

    @Test
    public void construtor_exigeUrlUsuarioESenha() {
        String[][] casos = { {null, "u", "p"}, {"", "u", "p"}, {DEAD_URL, " ", "p"}, {DEAD_URL, "u", null} };
        for (String[] c : casos) {
            try {
                new DatabaseManager(c[0], c[1], c[2]);
                fail("Deveria exigir URL, usuário e senha");
            } catch (IllegalArgumentException esperado) {
                // ok
            }
        }
    }

    @Test
    public void saveRead_rejeitaLeituraNula() throws Exception {
        assertRejected("leitura nula", null);
    }

    @Test
    public void saveRead_rejeitaTemperaturaForaDaFaixaDoBanco() throws Exception {
        // A classe Leitura aceita até -273 °C, mas a tabela (CT2) só aceita -40..100.
        assertRejected("abaixo de -40", new Leitura("X", 850, -40.1, 45.0, "2026-10-13T19:20:00Z"));
    }

    @Test
    public void saveRead_rejeitaDataInvalida() throws Exception {
        assertRejected("data fora do ISO 8601", new Leitura("X", 850, 24.5, 45.0, "ontem à tarde"));
        assertRejected("data no formato brasileiro", new Leitura("X", 850, 24.5, 45.0, "13/10/2026 19:20"));
    }

    @Test
    public void saveRead_rejeitaDeviceIdMaiorQue100Caracteres() throws Exception {
        assertRejected("deviceId > 100 caracteres", new Leitura("X".repeat(101), 850, 24.5, 45.0, "2026-10-13T19:20:00Z"));
    }

    @Test
    public void saveRead_aceitaTemperaturaNegativaDentroDaFaixaDoSensor() throws Exception {
        Leitura d = new Leitura("ESP32-SALA-01", 850, -5.0, 45.0, "2026-10-13T19:20:00Z");
        try {
            db.saveRead(d);
            fail("Sem banco, deveria falhar com SQLException (e não com IllegalArgumentException)");
        } catch (SQLException esperado) {
            // passou da validação e só falhou ao conectar
        }
    }

    @Test
    public void saveRead_aceitaDataSemOffsetEComOffset() throws Exception {
        String[] datas = { "2026-10-13T19:20:00", "2026-10-13T19:20:00Z", "2026-10-13T19:20:00-03:00" };
        for (String data : datas) {
            try {
                db.saveRead(new Leitura("ESP32-SALA-01", 850, 24.5, 45.0, data));
                fail("Sem banco, deveria falhar com SQLException para " + data);
            } catch (SQLException esperado) {
                // passou da validação da data
            }
        }
    }

    @Test
    public void listReadings_validaParametrosAntesDeAbrirConexao() throws Exception {
        Instant a = Instant.parse("2026-10-13T00:00:00Z");
        Instant b = Instant.parse("2026-10-14T00:00:00Z");
        try { db.listReadings("X", b, a, 10); fail("início depois do fim"); } catch (IllegalArgumentException ok) { }
        try { db.listReadings("X", null, b, 10); fail("início nulo"); } catch (IllegalArgumentException ok) { }
        try { db.listReadings("X", a, null, 10); fail("fim nulo"); } catch (IllegalArgumentException ok) { }
        try { db.listReadings("X", a, b, 0); fail("limit 0"); } catch (IllegalArgumentException ok) { }
        try { db.listReadings("X", a, b, DatabaseManager.MAX_LIMIT + 1); fail("limit acima do máximo"); } catch (IllegalArgumentException ok) { }
        try { db.listReadings(" ", a, b, 10); fail("deviceId em branco"); } catch (IllegalArgumentException ok) { }
        try { db.listReadings(null, a, b, 10); fail("deviceId nulo"); } catch (IllegalArgumentException ok) { }
        try { db.deviceExists("  "); fail("deviceId em branco"); } catch (IllegalArgumentException ok) { }
    }

    @Test
    public void listReadings_comParametrosValidosSoFalhaPorFaltaDeBanco() throws Exception {
        Instant a = Instant.parse("2026-10-13T00:00:00Z");
        Instant b = Instant.parse("2026-10-14T00:00:00Z");
        try {
            db.listReadings("X", a, b, 10);
            fail("Sem banco, deveria falhar com SQLException");
        } catch (SQLException esperado) {
            // passou da validação e só falhou ao conectar
        }
    }

    @Test(timeout = 20000)
    public void bancoForaDoAr_falhaRapidoComSQLException() throws Exception {
        long inicio = System.nanoTime();
        try {
            db.checkConnection();
            fail("Não deveria conectar");
        } catch (SQLException esperado) {
            long segundos = (System.nanoTime() - inicio) / 1_000_000_000L;
            assertTrue("deveria falhar em poucos segundos, levou " + segundos, segundos < 10);
        }
    }
}