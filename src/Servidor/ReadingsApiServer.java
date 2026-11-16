package src.Servidor;

import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.sql.SQLException;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import com.google.gson.Gson;
import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;

import src.Configuracao.Configuracao;
import src.Servidor.DatabaseManager.SensorReading;

/**
 * API HTTP do histórico (contrato CT5 - listReadings).
 *
 * GET /api/readings?deviceId=ESP32-SALA-01&startDate=2026-10-10T00:00:00&endDate=2026-10-13T23:59:59
 *
 * Respostas:
 *   200 {"readings":[{id, co2, temperature, humidity, measuredAt}, ...]}  (mais recente primeiro)
 *   400 formato de data inválido, parâmetro ausente ou startDate maior que endDate
 *   404 deviceId inexistente em sensor_device
 *   503 banco de dados indisponível
 *
 * Usa apenas o com.sun.net.httpserver do JDK: não exige nenhuma dependência nova no pom.xml.
 */
public class ReadingsApiServer {
    public static final String PATH = "/api/readings";
    public static final int DEFAULT_PORT = 8080;

    private static final Gson GSON = new Gson();

    private final DatabaseManager database;
    private final HttpServer server;
    private final ExecutorService executor = Executors.newVirtualThreadPerTaskExecutor();

    public ReadingsApiServer(int port, DatabaseManager database) throws IOException {
        if (database == null) {
            throw new IllegalArgumentException("DatabaseManager é obrigatório.");
        }
        this.database = database;
        this.server = HttpServer.create(new InetSocketAddress(port), 0);
        this.server.createContext(PATH, this::handleReadings);
        this.server.setExecutor(executor);
    }

    public void start() {
        server.start();
    }

    public void stop() {
        server.stop(0);
        executor.shutdownNow();
    }

    /** Porta realmente em uso (útil quando criado com a porta 0 nos testes). */
    public int getPort() {
        return server.getAddress().getPort();
    }

    private void handleReadings(HttpExchange exchange) throws IOException {
        try {
            addCorsHeaders(exchange);
            String method = exchange.getRequestMethod();

            if ("OPTIONS".equalsIgnoreCase(method)) {
                exchange.sendResponseHeaders(204, -1);
                return;
            }

            String path = exchange.getRequestURI().getPath();
            if (!PATH.equals(path) && !(PATH + "/").equals(path)) {
                sendError(exchange, 404, "Recurso não encontrado.");
                return;
            }
            if (!"GET".equalsIgnoreCase(method)) {
                exchange.getResponseHeaders().set("Allow", "GET, OPTIONS");
                sendError(exchange, 405, "Método não permitido. Use GET.");
                return;
            }

            Map<String, String> params = parseQuery(exchange.getRequestURI().getRawQuery());

            String deviceId = params.get("deviceId");
            if (deviceId == null || deviceId.isBlank()) {
                throw new IllegalArgumentException("deviceId é obrigatório.");
            }
            Instant start = parseDateTime("startDate", params.get("startDate"));
            Instant end = parseDateTime("endDate", params.get("endDate"));
            if (start.isAfter(end)) {
                throw new IllegalArgumentException("startDate não pode ser posterior a endDate.");
            }
            int limit = parseLimit(params.get("limit"));

            if (!database.deviceExists(deviceId)) {
                sendError(exchange, 404, "deviceId não encontrado: " + deviceId.trim());
                return;
            }

            List<SensorReading> readings = database.listReadings(deviceId, start, end, limit);
            sendJson(exchange, 200, toJson(readings));
        } catch (IllegalArgumentException invalidRequest) {
            sendError(exchange, 400, invalidRequest.getMessage());
        } catch (SQLException databaseError) {
            System.err.println("[API] Falha no banco ao listar leituras: " + databaseError.getMessage());
            sendError(exchange, 503, "Banco de dados indisponível. Tente novamente.");
        } catch (RuntimeException unexpected) {
            System.err.println("[API] Erro inesperado em " + PATH + ": " + unexpected);
            sendError(exchange, 500, "Erro interno.");
        } finally {
            exchange.close();
        }
    }

    /** Monta o corpo do CT5: {"readings":[{id, co2, temperature, humidity, measuredAt}]}. */
    static String toJson(List<SensorReading> readings) {
        JsonArray array = new JsonArray();
        for (SensorReading reading : readings) {
            JsonObject item = new JsonObject();
            item.addProperty("id", reading.id());
            item.addProperty("co2", reading.co2());
            item.addProperty("temperature", reading.temperature());
            item.addProperty("humidity", reading.humidity());
            // ISO-8601 com offset no fuso da aplicação, ex.: 2026-10-13T19:20:00-03:00
            item.addProperty("measuredAt", DateTimeFormatter.ISO_OFFSET_DATE_TIME.format(
                    reading.measuredAt().atZoneSameInstant(DatabaseManager.appZone()).toOffsetDateTime()));
            array.add(item);
        }
        JsonObject body = new JsonObject();
        body.add("readings", array);
        return GSON.toJson(body);
    }

    /**
     * Aceita ISO-8601 com offset/Z (ex.: 2026-10-13T19:20:00Z) ou sem offset
     * (ex.: 2026-10-13T19:20:00, interpretado em APP_TIMEZONE).
     */
    static Instant parseDateTime(String name, String value) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(name + " é obrigatório (ISO-8601, ex.: 2026-10-13T19:20:00).");
        }
        // Em query string um '+' sem codificar chega como espaço; datas válidas não têm espaço.
        String normalized = value.trim().replace(' ', '+');
        try {
            return OffsetDateTime.parse(normalized).toInstant();
        } catch (DateTimeParseException notOffset) {
            try {
                return LocalDateTime.parse(normalized).atZone(DatabaseManager.appZone()).toInstant();
            } catch (DateTimeParseException invalid) {
                throw new IllegalArgumentException(
                        name + " inválido: use ISO-8601, ex.: 2026-10-13T19:20:00", invalid);
            }
        }
    }

    private static int parseLimit(String value) {
        if (value == null || value.isBlank()) {
            return DatabaseManager.MAX_LIMIT;
        }
        try {
            int limit = Integer.parseInt(value.trim());
            if (limit < 1 || limit > DatabaseManager.MAX_LIMIT) {
                throw new IllegalArgumentException("limit deve estar entre 1 e " + DatabaseManager.MAX_LIMIT + ".");
            }
            return limit;
        } catch (NumberFormatException invalid) {
            throw new IllegalArgumentException("limit deve ser um número inteiro.", invalid);
        }
    }

    private static Map<String, String> parseQuery(String rawQuery) {
        Map<String, String> params = new HashMap<>();
        if (rawQuery == null || rawQuery.isBlank()) {
            return params;
        }
        for (String pair : rawQuery.split("&")) {
            if (pair.isEmpty()) {
                continue;
            }
            int equals = pair.indexOf('=');
            String key = equals < 0 ? pair : pair.substring(0, equals);
            String value = equals < 0 ? "" : pair.substring(equals + 1);
            try {
                params.put(URLDecoder.decode(key, StandardCharsets.UTF_8),
                        URLDecoder.decode(value, StandardCharsets.UTF_8));
            } catch (IllegalArgumentException malformed) {
                throw new IllegalArgumentException("Query string malformada.", malformed);
            }
        }
        return params;
    }

    /** Libera o acesso do frontend (Vite, outra porta). Restrinja com CORS_ALLOW_ORIGIN em produção. */
    private static void addCorsHeaders(HttpExchange exchange) {
        exchange.getResponseHeaders().set("Access-Control-Allow-Origin",
                Configuracao.obter("CORS_ALLOW_ORIGIN", "*"));
        exchange.getResponseHeaders().set("Access-Control-Allow-Methods", "GET, OPTIONS");
        exchange.getResponseHeaders().set("Access-Control-Allow-Headers", "Content-Type");
    }

    private static void sendError(HttpExchange exchange, int status, String message) throws IOException {
        JsonObject body = new JsonObject();
        body.addProperty("error", message);
        sendJson(exchange, status, GSON.toJson(body));
    }

    private static void sendJson(HttpExchange exchange, int status, String json) throws IOException {
        byte[] bytes = json.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type", "application/json; charset=utf-8");
        exchange.sendResponseHeaders(status, bytes.length);
        try (OutputStream out = exchange.getResponseBody()) {
            out.write(bytes);
        }
    }
}