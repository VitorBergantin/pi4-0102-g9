package src.test;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertTrue;

import java.math.BigDecimal;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.sql.SQLException;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

import org.junit.After;
import org.junit.Before;
import org.junit.Test;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

import src.Servidor.DatabaseManager;
import src.Servidor.DatabaseManager.SensorReading;
import src.Servidor.ReadingsApiServer;

/**
 * Testa o contrato CT5 (GET /api/readings) sem precisar de PostgreSQL:
 * o DatabaseManager é substituído por uma versão em memória.
 */
public class ReadingsApiServerTest {
    private static final String DEAD_URL = "jdbc:postgresql://localhost:1/co2nect";

    /** Banco falso: guarda os argumentos recebidos e devolve o que o teste mandar. */
    private static class FakeDatabase extends DatabaseManager {
        boolean deviceExists = true;
        boolean failWithSqlError = false;
        List<SensorReading> result = new ArrayList<>();
        String lastDeviceId;
        Instant lastStart;
        Instant lastEnd;
        int lastLimit;
        int listCalls = 0;

        FakeDatabase() {
            super(DEAD_URL, "u", "p");
        }

        @Override
        public boolean deviceExists(String deviceId) throws SQLException {
            if (failWithSqlError) {
                throw new SQLException("banco fora do ar");
            }
            return deviceExists;
        }

        @Override
        public List<SensorReading> listReadings(String deviceId, Instant start, Instant end, int limit)
                throws SQLException {
            if (failWithSqlError) {
                throw new SQLException("banco fora do ar");
            }
            listCalls++;
            lastDeviceId = deviceId;
            lastStart = start;
            lastEnd = end;
            lastLimit = limit;
            return result;
        }
    }

    private FakeDatabase db;
    private ReadingsApiServer api;
    private final HttpClient http = HttpClient.newHttpClient();

    @Before
    public void setUp() throws Exception {
        db = new FakeDatabase();
        api = new ReadingsApiServer(0, db); // porta 0 = o sistema escolhe uma porta livre
        api.start();
    }

    @After
    public void tearDown() {
        api.stop();
    }

    private static SensorReading reading(long id, int co2, String measuredAtUtc) {
        OffsetDateTime at = OffsetDateTime.parse(measuredAtUtc);
        return new SensorReading(id, "ESP32-SALA-01", co2, new BigDecimal("24.50"), new BigDecimal("45.20"), at, at);
    }

    private static String enc(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    private HttpResponse<String> send(String method, String pathAndQuery) throws Exception {
        HttpRequest request = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + api.getPort() + pathAndQuery))
                .method(method, HttpRequest.BodyPublishers.noBody())
                .build();
        return http.send(request, HttpResponse.BodyHandlers.ofString());
    }

    private HttpResponse<String> get(String pathAndQuery) throws Exception {
        return send("GET", pathAndQuery);
    }

    private static String query(String deviceId, String start, String end) {
        return "/api/readings?deviceId=" + enc(deviceId) + "&startDate=" + enc(start) + "&endDate=" + enc(end);
    }

    @Test
    public void ok_devolveReadingsNaMesmaOrdemDoBanco_eNoFormatoDoContrato() throws Exception {
        db.result = List.of(
                reading(3, 900, "2026-10-13T19:20:10Z"),
                reading(2, 880, "2026-10-13T19:20:05Z"),
                reading(1, 850, "2026-10-13T19:20:00Z"));

        HttpResponse<String> response = get(query("ESP32-SALA-01", "2026-10-13T00:00:00Z", "2026-10-13T23:59:59Z"));

        assertEquals(200, response.statusCode());
        assertTrue(response.headers().firstValue("Content-Type").orElse("").startsWith("application/json"));

        JsonObject body = JsonParser.parseString(response.body()).getAsJsonObject();
        JsonArray readings = body.getAsJsonArray("readings");
        assertEquals(3, readings.size());
        assertEquals(3L, readings.get(0).getAsJsonObject().get("id").getAsLong());
        assertEquals(2L, readings.get(1).getAsJsonObject().get("id").getAsLong());
        assertEquals(1L, readings.get(2).getAsJsonObject().get("id").getAsLong());

        JsonObject first = readings.get(0).getAsJsonObject();
        // Campos exatos do objeto Reading do CT5: nada a mais, nada a menos.
        assertEquals(Set.of("id", "co2", "temperature", "humidity", "measuredAt"), first.keySet());
        assertEquals(900, first.get("co2").getAsInt());
        assertEquals(0, new BigDecimal("24.5").compareTo(first.get("temperature").getAsBigDecimal()));
        assertEquals(0, new BigDecimal("45.2").compareTo(first.get("humidity").getAsBigDecimal()));
        // measuredAt precisa ser ISO-8601 com offset e representar o mesmo instante gravado.
        assertEquals(Instant.parse("2026-10-13T19:20:10Z"),
                OffsetDateTime.parse(first.get("measuredAt").getAsString()).toInstant());
    }

    @Test
    public void ok_semLeituras_devolveListaVaziaEStatus200() throws Exception {
        db.result = List.of();
        HttpResponse<String> response = get(query("ESP32-SALA-01", "2026-10-13T00:00:00Z", "2026-10-13T23:59:59Z"));
        assertEquals(200, response.statusCode());
        assertEquals(0, JsonParser.parseString(response.body()).getAsJsonObject().getAsJsonArray("readings").size());
    }

    @Test
    public void repassaParametrosAoBanco_comOffsetEComFusoDaAplicacao() throws Exception {
        get(query("ESP32-SALA-01", "2026-10-13T10:00:00Z", "2026-10-13T11:00:00-03:00"));
        assertEquals("ESP32-SALA-01", db.lastDeviceId);
        assertEquals(Instant.parse("2026-10-13T10:00:00Z"), db.lastStart);
        assertEquals(Instant.parse("2026-10-13T14:00:00Z"), db.lastEnd);
        assertEquals(DatabaseManager.MAX_LIMIT, db.lastLimit);

        // Sem offset (formato do exemplo do CT5): vale o fuso da aplicação.
        get(query("ESP32-SALA-01", "2026-10-10T00:00:00", "2026-10-13T23:59:59"));
        assertEquals(LocalDateTime.parse("2026-10-10T00:00:00").atZone(DatabaseManager.appZone()).toInstant(), db.lastStart);
        assertEquals(LocalDateTime.parse("2026-10-13T23:59:59").atZone(DatabaseManager.appZone()).toInstant(), db.lastEnd);
    }

    @Test
    public void aceitaMaisSemCodificarNoOffset() throws Exception {
        // curl "…startDate=2026-10-13T10:00:00+03:00" envia o '+' como espaço.
        get("/api/readings?deviceId=ESP32-SALA-01&startDate=2026-10-13T10:00:00+03:00&endDate=2026-10-13T12:00:00+03:00");
        assertEquals(Instant.parse("2026-10-13T07:00:00Z"), db.lastStart);
    }

    @Test
    public void aceitaLimitOpcional() throws Exception {
        get(query("ESP32-SALA-01", "2026-10-13T00:00:00Z", "2026-10-13T23:59:59Z") + "&limit=50");
        assertEquals(50, db.lastLimit);
    }

    @Test
    public void badRequest_quandoFaltaParametroOuFormatoDeDataInvalido() throws Exception {
        String[] invalidas = {
                "/api/readings",
                "/api/readings?startDate=2026-10-13T00:00:00Z&endDate=2026-10-13T23:59:59Z",
                "/api/readings?deviceId=%20&startDate=2026-10-13T00:00:00Z&endDate=2026-10-13T23:59:59Z",
                "/api/readings?deviceId=X&endDate=2026-10-13T23:59:59Z",
                "/api/readings?deviceId=X&startDate=2026-10-13T00:00:00Z",
                query("X", "13/10/2026", "2026-10-13T23:59:59Z"),
                query("X", "2026-10-13T00:00:00Z", "ontem"),
                query("X", "2026-10-13", "2026-10-14"),
                query("X", "2026-13-45T00:00:00Z", "2026-10-14T00:00:00Z"),
                query("X", "2026-10-13T00:00:00Z", "2026-10-14T00:00:00Z") + "&limit=0",
                query("X", "2026-10-13T00:00:00Z", "2026-10-14T00:00:00Z") + "&limit=1001",
                query("X", "2026-10-13T00:00:00Z", "2026-10-14T00:00:00Z") + "&limit=abc",
        };
        for (String path : invalidas) {
            HttpResponse<String> response = get(path);
            assertEquals("esperava 400 para " + path, 400, response.statusCode());
            assertNotNull(JsonParser.parseString(response.body()).getAsJsonObject().get("error"));
        }
        assertEquals("nenhuma consulta pode chegar ao banco com pedido inválido", 0, db.listCalls);
    }

    @Test
    public void badRequest_quandoStartDateMaiorQueEndDate() throws Exception {
        HttpResponse<String> response = get(query("X", "2026-10-14T00:00:00Z", "2026-10-13T00:00:00Z"));
        assertEquals(400, response.statusCode());
        assertEquals(0, db.listCalls);
    }

    @Test
    public void notFound_quandoDispositivoNaoExiste() throws Exception {
        db.deviceExists = false;
        HttpResponse<String> response = get(query("NAO-EXISTE", "2026-10-13T00:00:00Z", "2026-10-13T23:59:59Z"));
        assertEquals(404, response.statusCode());
        assertEquals(0, db.listCalls);
    }

    @Test
    public void notFound_paraCaminhoDesconhecido() throws Exception {
        assertEquals(404, get("/api/readings/outra-coisa").statusCode());
    }

    @Test
    public void metodoNaoPermitido_paraPostComAllow() throws Exception {
        HttpResponse<String> response = send("POST", query("X", "2026-10-13T00:00:00Z", "2026-10-13T23:59:59Z"));
        assertEquals(405, response.statusCode());
        assertTrue(response.headers().firstValue("Allow").orElse("").contains("GET"));
    }

    @Test
    public void cors_liberaOFrontend_eRespondeAoPreflight() throws Exception {
        HttpResponse<String> response = get(query("X", "2026-10-13T00:00:00Z", "2026-10-13T23:59:59Z"));
        assertTrue(response.headers().firstValue("Access-Control-Allow-Origin").isPresent());

        HttpResponse<String> preflight = send("OPTIONS", "/api/readings");
        assertEquals(204, preflight.statusCode());
        assertTrue(preflight.headers().firstValue("Access-Control-Allow-Origin").isPresent());
        assertTrue(preflight.headers().firstValue("Access-Control-Allow-Methods").orElse("").contains("GET"));
    }

    @Test
    public void serviceUnavailable_quandoOBancoEstaForaDoAr() throws Exception {
        db.failWithSqlError = true;
        HttpResponse<String> response = get(query("X", "2026-10-13T00:00:00Z", "2026-10-13T23:59:59Z"));
        assertEquals(503, response.statusCode());

        // Banco voltou: a mesma instância da API volta a responder sem reiniciar.
        db.failWithSqlError = false;
        assertEquals(200, get(query("X", "2026-10-13T00:00:00Z", "2026-10-13T23:59:59Z")).statusCode());
    }

    @Test
    public void measuredAt_eDevolvidoSemPerderOInstante_mesmoComOffsetDiferenteNoBanco() throws Exception {
        // O PostgreSQL devolve em UTC; a API converte para o fuso da aplicação, mas o instante é o mesmo.
        OffsetDateTime utc = OffsetDateTime.of(2026, 10, 13, 22, 20, 0, 0, ZoneOffset.UTC);
        db.result = List.of(new SensorReading(7, "X", 850, new BigDecimal("24.50"), new BigDecimal("45.20"), utc, utc));
        HttpResponse<String> response = get(query("X", "2026-10-13T00:00:00Z", "2026-10-14T00:00:00Z"));
        String measuredAt = JsonParser.parseString(response.body()).getAsJsonObject()
                .getAsJsonArray("readings").get(0).getAsJsonObject().get("measuredAt").getAsString();
        assertEquals(utc.toInstant(), OffsetDateTime.parse(measuredAt).toInstant());
    }
}