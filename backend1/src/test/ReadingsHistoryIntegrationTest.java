package src.test;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import org.junit.AfterClass;
import org.junit.Assume;
import org.junit.BeforeClass;
import org.junit.Test;

import com.google.gson.JsonArray;
import com.google.gson.JsonParser;

import src.Comum.Leitura;
import src.Servidor.DatabaseManager;
import src.Servidor.DatabaseManager.SensorReading;
import src.Servidor.ReadingsApiServer;

/**
 * H05.3 - integração com PostgreSQL REAL: leituras gravadas pelo saveRead (CT2)
 * aparecem no histórico (CT5) da mais recente para a mais antiga.
 *
 * Precisa do banco com o schema database/init/01-schema.sql aplicado
 * (docker compose up -d). Se o banco não estiver disponível, os testes são IGNORADOS
 * (não falham), para o `mvn test` continuar passando em máquinas sem Docker.
 *
 * Usa um deviceId único por execução e apaga o que criou ao final.
 */
public class ReadingsHistoryIntegrationTest {
    private static final String URL = env("DB_URL", "jdbc:postgresql://localhost:5432/co2nect_db");
    private static final String USER = env("DB_USER", "co2nect_user");
    private static final String PASSWORD = env("DB_PASSWORD", "");

    private static final String DEVICE = "TEST-H053-" + UUID.randomUUID().toString().substring(0, 8);
    private static final String OTHER_DEVICE = DEVICE + "-OUTRO";

    private static DatabaseManager db;
    private static final List<Long> ids = new ArrayList<>(); // ids na ORDEM DE GRAVAÇÃO

    private static String env(String key, String fallback) {
        String value = System.getenv(key);
        if (value == null || value.isBlank()) {
            value = System.getProperty(key);
        }
        return value == null || value.isBlank() ? fallback : value.trim();
    }

    private static boolean exigeBancoReal() {
        String valor = System.getProperty("RUN_DB_INTEGRATION");

        if (valor == null) {
            valor = System.getenv("RUN_DB_INTEGRATION");
        }

        return Boolean.parseBoolean(valor);
    }

    @BeforeClass
public static void gravaLeiturasForaDeOrdem() throws Exception {

    boolean bancoObrigatorio = exigeBancoReal();

    if (PASSWORD.isBlank()) {
        String mensagem = "Defina DB_PASSWORD para executar a integração com PostgreSQL.";
        if (bancoObrigatorio) {
            throw new IllegalStateException(mensagem);
        }
        Assume.assumeTrue(mensagem, false);
    }

    db = new DatabaseManager(URL, USER, PASSWORD);

    try {
        if (!db.checkConnection()) {

            if (bancoObrigatorio) {
                throw new IllegalStateException(
                    "PostgreSQL não está respondendo."
                );
            }

            Assume.assumeTrue(
                "PostgreSQL indisponível",
                false
            );
        }

        try (
            Connection c = DriverManager.getConnection(URL, USER, PASSWORD);
            ResultSet rs = c.createStatement().executeQuery(
                "SELECT to_regclass('public.sensor_device') IS NOT NULL "
                + "AND to_regclass('public.sensor_reading') IS NOT NULL"
            )
        ) {
            rs.next();

            boolean schemaExiste = rs.getBoolean(1);

            if (!schemaExiste) {

                if (bancoObrigatorio) {
                    throw new IllegalStateException(
                        "Schema H01.2 não aplicado. "
                        + "Verifique sensor_device e sensor_reading."
                    );
                }

                Assume.assumeTrue(
                    "Schema H01.2 não aplicado",
                    false
                );
            }
        }

    } catch (SQLException banco) {

        String sqlState = banco.getSQLState();

        // Erros de autenticação nunca devem ser escondidos como teste ignorado.
        boolean erroAutenticacao =
            sqlState != null && sqlState.startsWith("28");

        if (bancoObrigatorio || erroAutenticacao) {
            throw banco;
        }

        Assume.assumeNoException(
            "PostgreSQL indisponível",
            banco
        );
    }

    // Ordem de chegada propositalmente diferente da ordem cronológica.

    ids.add(db.saveRead(
        new Leitura(
            DEVICE,
            800,
            24.5,
            50.0,
            "2026-10-13T12:00:00Z"
        )
    ));

    ids.add(db.saveRead(
        new Leitura(
            DEVICE,
            810,
            24.6,
            50.1,
            "2026-10-13T12:00:10Z"
        )
    ));

    ids.add(db.saveRead(
        new Leitura(
            DEVICE,
            805,
            24.7,
            50.2,
            "2026-10-13T12:00:05Z"
        )
    ));

    ids.add(db.saveRead(
        new Leitura(
            DEVICE,
            815,
            24.8,
            50.3,
            "2026-10-13T12:00:10Z"
        )
    ));

    db.saveRead(
        new Leitura(
            OTHER_DEVICE,
            999,
            20.0,
            40.0,
            "2026-10-13T12:00:07Z"
        )
    );
}

    @AfterClass
    public static void limpa() throws Exception {
        if (ids.isEmpty()) {
            return; // testes ignorados: nada foi criado
        }
        try (Connection c = DriverManager.getConnection(URL, USER, PASSWORD)) {
            for (String device : new String[] { DEVICE, OTHER_DEVICE }) {
                try (PreparedStatement s = c.prepareStatement("DELETE FROM sensor_reading WHERE device_id = ?")) {
                    s.setString(1, device);
                    s.executeUpdate();
                }
                try (PreparedStatement s = c.prepareStatement("DELETE FROM sensor_device WHERE device_id = ?")) {
                    s.setString(1, device);
                    s.executeUpdate();
                }
            }
        }
    }

    private static List<Integer> co2Of(List<SensorReading> readings) {
        List<Integer> values = new ArrayList<>();
        for (SensorReading reading : readings) {
            values.add(reading.co2());
        }
        return values;
    }

    @Test
    public void historico_vemDaMaisRecenteParaAMaisAntiga_comDesempatePorId() throws Exception {
        List<SensorReading> readings = db.listReadings(DEVICE,
                Instant.parse("2026-10-13T00:00:00Z"), Instant.parse("2026-10-13T23:59:59Z"), 100);

        // 12:00:10 (id maior, 815) -> 12:00:10 (id menor, 810) -> 12:00:05 (805) -> 12:00:00 (800)
        assertEquals(List.of(815, 810, 805, 800), co2Of(readings));
        assertEquals(ids.get(3).longValue(), readings.get(0).id());
        assertEquals(ids.get(1).longValue(), readings.get(1).id());
        for (int i = 1; i < readings.size(); i++) {
            assertFalse("measured_at deve ser decrescente",
                    readings.get(i).measuredAt().isAfter(readings.get(i - 1).measuredAt()));
        }
    }

    @Test
    public void historico_devolveTodosOsCamposGravados() throws Exception {
        SensorReading newest = db.listReadings(DEVICE,
                Instant.parse("2026-10-13T00:00:00Z"), Instant.parse("2026-10-13T23:59:59Z"), 1).get(0);
        assertEquals(DEVICE, newest.deviceId());
        assertEquals(815, newest.co2());
        assertEquals(0, new java.math.BigDecimal("24.8").compareTo(newest.temperature()));
        assertEquals(0, new java.math.BigDecimal("50.3").compareTo(newest.humidity()));
        assertEquals(Instant.parse("2026-10-13T12:00:10Z"), newest.measuredAt().toInstant());
        assertTrue(newest.receivedAt() != null);
    }

    @Test
    public void historico_respeitaIntervaloInclusivoELimit() throws Exception {
        List<SensorReading> middle = db.listReadings(DEVICE,
                Instant.parse("2026-10-13T12:00:05Z"), Instant.parse("2026-10-13T12:00:10Z"), 100);
        assertEquals(List.of(815, 810, 805), co2Of(middle));

        List<SensorReading> limited = db.listReadings(DEVICE,
                Instant.parse("2026-10-13T00:00:00Z"), Instant.parse("2026-10-13T23:59:59Z"), 2);
        assertEquals("o limit mantém as MAIS RECENTES", List.of(815, 810), co2Of(limited));

        assertTrue(db.listReadings(DEVICE,
                Instant.parse("2026-10-14T00:00:00Z"), Instant.parse("2026-10-14T23:59:59Z"), 100).isEmpty());
    }

    @Test
    public void historico_naoMisturaDispositivos_eDeviceExistsFunciona() throws Exception {
        assertFalse(co2Of(db.listReadings(DEVICE,
                Instant.parse("2026-10-13T00:00:00Z"), Instant.parse("2026-10-13T23:59:59Z"), 100)).contains(999));
        assertEquals(List.of(999), co2Of(db.listReadings(OTHER_DEVICE,
                Instant.parse("2026-10-13T00:00:00Z"), Instant.parse("2026-10-13T23:59:59Z"), 100)));

        assertTrue(db.deviceExists(DEVICE));
        assertFalse(db.deviceExists("NAO-EXISTE-" + UUID.randomUUID()));
    }

    @Test
    public void api_devolveAsLeiturasGravadasNaOrdemCerta() throws Exception {
        ReadingsApiServer api = new ReadingsApiServer(0, db);
        api.start();
        try {
            HttpClient http = HttpClient.newHttpClient();
            String url = "http://127.0.0.1:" + api.getPort() + "/api/readings?deviceId=" + enc(DEVICE)
                    + "&startDate=" + enc("2026-10-13T00:00:00Z") + "&endDate=" + enc("2026-10-13T23:59:59Z");
            HttpResponse<String> ok = http.send(HttpRequest.newBuilder(URI.create(url)).GET().build(),
                    HttpResponse.BodyHandlers.ofString());

            assertEquals(200, ok.statusCode());
            JsonArray readings = JsonParser.parseString(ok.body()).getAsJsonObject().getAsJsonArray("readings");
            List<Integer> co2 = new ArrayList<>();
            readings.forEach(item -> co2.add(item.getAsJsonObject().get("co2").getAsInt()));
            assertEquals(List.of(815, 810, 805, 800), co2);

            String unknown = "http://127.0.0.1:" + api.getPort() + "/api/readings?deviceId=NAO-EXISTE-" + UUID.randomUUID()
                    + "&startDate=" + enc("2026-10-13T00:00:00Z") + "&endDate=" + enc("2026-10-13T23:59:59Z");
            assertEquals(404, http.send(HttpRequest.newBuilder(URI.create(unknown)).GET().build(),
                    HttpResponse.BodyHandlers.ofString()).statusCode());
        } finally {
            api.stop();
        }
    }

    private static String enc(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }
}
