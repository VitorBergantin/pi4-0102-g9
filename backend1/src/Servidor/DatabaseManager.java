package src.Servidor;

import java.math.BigDecimal;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;

import src.Configuracao.Configuracao;
import src.Comum.Comunicado;
import src.Comum.Leitura;

import java.time.ZoneOffset;

/**
 * Camada de persistência PostgreSQL do CO2NNECT.
 *
 * Cada operação abre e fecha sua própria conexão JDBC. Isso evita manter uma
 * conexão inválida quando o contêiner PostgreSQL é reiniciado e permite que a
 * próxima leitura recebida volte a ser gravada sem reiniciar a aplicação Java.
 */
public class DatabaseManager {
    private static final String DEFAULT_URL = "jdbc:postgresql://localhost:5432/co2nect_db";
    private static final String DEFAULT_USER = "co2nect_user";
    private static final String DEFAULT_PASSWORD = "co2nect_pass";
    public static final int MAX_LIMIT = 1000;

    private final String url;
    private final String user;
    private final String password;
    private static final ZoneId APP_ZONE = resolveZone();

    public DatabaseManager() {
        this(
                setting("DB_URL", DEFAULT_URL),
                setting("DB_USER", DEFAULT_USER),
                setting("DB_PASSWORD", DEFAULT_PASSWORD));
    }

    /** Construtor configurável, também utilizado pelos testes automatizados. */
    public DatabaseManager(String url, String user, String password) {
        this.url = requireText(url, "DB_URL");
        this.user = requireText(user, "DB_USER");
        this.password = requireText(password, "DB_PASSWORD");
    }

    private static String setting(String key, String defaultValue) {
        String value = System.getenv(key);
        if (value == null || value.isBlank()) {
            value = System.getProperty(key);
        }
        return value == null || value.isBlank() ? defaultValue : value.trim();
    }

    private static ZoneId resolveZone() {
        String defaultZone = "America/Sao_Paulo";
        String configured = setting("APP_TIMEZONE", defaultZone);
        try {
            return ZoneId.of(configured);
        } catch (java.time.DateTimeException invalid) {
            System.err.println(
                "[DB] APP_TIMEZONE inválido (" + configured
                + "); usando " + defaultZone
            );
            return ZoneId.of(defaultZone);
        }
    }

    /** Fuso aplicado a datas ISO-8601 sem offset (escrita de measuredAt e filtros do CT5). */
    public static ZoneId appZone() {
        return APP_ZONE;
    }

    private static String requireText(String value, String fieldName) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(fieldName + " não pode ser nulo ou vazio.");
        }
        return value.trim();
    }

    private Connection openConnection() throws SQLException {
        try {
            Class.forName("org.postgresql.Driver");
        } catch (ClassNotFoundException e) {
            throw new SQLException(
                "Driver JDBC do PostgreSQL não encontrado. Verifique as dependências do Maven.",
                e
            );
        }

        return DriverManager.getConnection(url, user, password);
    }


    /** Abre uma conexão real e propaga SQLException caso o banco esteja indisponível. */
    public boolean checkConnection() throws SQLException {
        try (Connection connection = openConnection()) {
            return connection.isValid(3);
        }
    }

    /**
     * Persiste uma leitura de sensor e retorna o ID gerado pelo PostgreSQL.
     * O dispositivo é cadastrado/atualizado antes da leitura para respeitar a FK
     * sensor_reading.device_id -> sensor_device.device_id do schema atual.
     */
    public long saveRead(Leitura data) throws SQLException {
        ValidatedReading reading = validateAndNormalize(data);
        String upsertDeviceSql = """
                INSERT INTO sensor_device (device_id, display_name, is_online, last_seen_at, last_status_at)
                VALUES (?, ?, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                ON CONFLICT (device_id) DO UPDATE
                   SET is_online = TRUE,
                       last_seen_at = CURRENT_TIMESTAMP,
                       updated_at = CURRENT_TIMESTAMP
                """;
        String insertReadingSql = """
                INSERT INTO sensor_reading
                    (device_id, co2, temperature, humidity, measured_at)
                VALUES (?, ?, ?, ?, ?)
                RETURNING id
                """;

        try (Connection connection = openConnection()) {
            connection.setAutoCommit(false);
            try {
                try (PreparedStatement statement = connection.prepareStatement(upsertDeviceSql)) {
                    statement.setString(1, reading.deviceId());
                    statement.setString(2, reading.deviceId());
                    statement.executeUpdate();
                }

                long generatedId;
                try (PreparedStatement statement = connection.prepareStatement(insertReadingSql)) {
                    statement.setString(1, reading.deviceId());
                    statement.setInt(2, reading.co2());
                    statement.setBigDecimal(3, BigDecimal.valueOf(reading.temperature()));
                    statement.setBigDecimal(4, BigDecimal.valueOf(reading.humidity()));
                    statement.setObject(5, OffsetDateTime.ofInstant(reading.measuredAt(), ZoneOffset.UTC));

                    try (ResultSet resultSet = statement.executeQuery()) {
                        if (!resultSet.next()) {
                            throw new SQLException("O PostgreSQL não retornou o ID da leitura inserida.");
                        }
                        generatedId = resultSet.getLong("id");
                    }
                }

                connection.commit();
                System.out.printf("[DB] Leitura salva: id=%d, dispositivo=%s, CO2=%d ppm%n",
                        generatedId, reading.deviceId(), reading.co2());
                return generatedId;
            } catch (SQLException | RuntimeException exception) {
                rollbackQuietly(connection);
                throw exception;
            }
        }
    }

    /** Compatibilidade com o caminho WebSocket já existente no projeto. */
    public void insertReading(Leitura data) throws SQLException {
        saveRead(data);
    }

    /** Atualiza o estado de conectividade recebido no tópico MQTT /status. */
    public void updateDeviceStatus(String deviceId, boolean online) throws SQLException {
        String normalizedDeviceId = validateDeviceId(deviceId);
        String sql = """
                INSERT INTO sensor_device
                    (device_id, display_name, is_online, last_seen_at, last_status_at)
                VALUES (?, ?, ?, CASE WHEN ? THEN CURRENT_TIMESTAMP ELSE NULL END, CURRENT_TIMESTAMP)
                ON CONFLICT (device_id) DO UPDATE
                   SET is_online = EXCLUDED.is_online,
                       last_seen_at = CASE
                           WHEN EXCLUDED.is_online THEN CURRENT_TIMESTAMP
                           ELSE sensor_device.last_seen_at
                       END,
                       last_status_at = CURRENT_TIMESTAMP,
                       updated_at = CURRENT_TIMESTAMP
                """;

        try (Connection connection = openConnection();
             PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, normalizedDeviceId);
            statement.setString(2, normalizedDeviceId);
            statement.setBoolean(3, online);
            statement.setBoolean(4, online);
            statement.executeUpdate();
        }
    }

        /**
     * Lista as leituras de um dispositivo no intervalo [start, end], da MAIS RECENTE
     * para a mais antiga (CT5 / histórico). O segundo critério (id DESC) desempata
     * leituras com o mesmo horário e acompanha o índice
     * idx_sensor_reading_device_measured_at (device_id, measured_at DESC, id DESC).
     */
    public List<SensorReading> listReadings(String deviceId, Instant start,
                                            Instant end, int limit) throws SQLException {
        String normalizedDeviceId = validateDeviceId(deviceId);
        validateInterval(start, end);
        if (limit < 1 || limit > MAX_LIMIT) {
            throw new IllegalArgumentException("limit deve estar entre 1 e " + MAX_LIMIT + ".");
        }

        String sql = """
                SELECT id, device_id, co2, temperature, humidity, measured_at, received_at
                  FROM sensor_reading
                 WHERE device_id = ?
                   AND measured_at >= ?
                   AND measured_at <= ?
                 ORDER BY measured_at DESC, id DESC
                 LIMIT ?
                """;

        List<SensorReading> readings = new ArrayList<>();
        try (Connection connection = openConnection();
             PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, normalizedDeviceId);
            statement.setObject(2, OffsetDateTime.ofInstant(start, ZoneOffset.UTC));
            statement.setObject(3, OffsetDateTime.ofInstant(end, ZoneOffset.UTC));
            statement.setInt(4, limit);

            try (ResultSet resultSet = statement.executeQuery()) {
                while (resultSet.next()) {
                    readings.add(mapRow(resultSet));
                }
            }
        }
        return readings;
    }

    /** Informa se o dispositivo está cadastrado em sensor_device (base do HTTP 404 do CT5). */
    public boolean deviceExists(String deviceId) throws SQLException {
        String normalizedDeviceId = validateDeviceId(deviceId);
        String sql = "SELECT 1 FROM sensor_device WHERE device_id = ?";

        try (Connection connection = openConnection();
             PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, normalizedDeviceId);
            try (ResultSet resultSet = statement.executeQuery()) {
                return resultSet.next();
            }
        }
    }

    private static SensorReading mapRow(ResultSet resultSet) throws SQLException {
        return new SensorReading(
                resultSet.getLong("id"),
                resultSet.getString("device_id"),
                resultSet.getInt("co2"),
                resultSet.getBigDecimal("temperature"),
                resultSet.getBigDecimal("humidity"),
                resultSet.getObject("measured_at", OffsetDateTime.class),
                resultSet.getObject("received_at", OffsetDateTime.class));
    }

    private static void rollbackQuietly(Connection connection) {
        try {
            connection.rollback();
        } catch (SQLException rollbackError) {
            System.err.println("[DB] Falha ao desfazer transação: " + rollbackError.getMessage());
        }
    }

    private static ValidatedReading validateAndNormalize(Leitura data) {
        if (data == null) {
            throw new IllegalArgumentException("A leitura não pode ser nula.");
        }
        String deviceId = validateDeviceId(data.getDeviceId());

        if (data.getCo2() < 0) {
            throw new IllegalArgumentException("CO2 deve ser um inteiro maior ou igual a zero.");
        }
        if (!Double.isFinite(data.getTemperature()) || data.getTemperature() < -40.0 || data.getTemperature() > 100.0) {
            throw new IllegalArgumentException("Temperatura deve estar entre -40 e 100 °C.");
        }
        if (!Double.isFinite(data.getHumidity()) || data.getHumidity() < 0.0 || data.getHumidity() > 100.0) {
            throw new IllegalArgumentException("Umidade deve estar entre 0 e 100%.");
        }
        if (data.getMeasuredAt() == null || data.getMeasuredAt().isBlank()) {
            throw new IllegalArgumentException("measuredAt é obrigatório e deve estar no formato ISO-8601.");
        }

        return new ValidatedReading(deviceId, data.getCo2(), data.getTemperature(), data.getHumidity(), parseMeasuredAt(data.getMeasuredAt()));
    }

    private static String validateDeviceId(String deviceId) {
        if (deviceId == null || deviceId.isBlank()) {
            throw new IllegalArgumentException("deviceId é obrigatório.");
        }
        String normalized = deviceId.trim();
        if (normalized.length() > 100) {
            throw new IllegalArgumentException("deviceId deve ter no máximo 100 caracteres.");
        }
        return normalized;
    }

    private static void validateInterval(Instant start, Instant end) {
        if (start == null || end == null) {
            throw new IllegalArgumentException("As datas inicial e final são obrigatórias.");
        }
        if (start.isAfter(end)) {
            throw new IllegalArgumentException("A data inicial não pode ser posterior à data final.");
        }
    }

    /** Aceita ISO-8601 com offset/Z ou data-hora local (interpretada no fuso da JVM). */
    private static Instant parseMeasuredAt(String value) {
        String normalized = value.trim();
        try {
            return OffsetDateTime.parse(normalized).toInstant();
        } catch (DateTimeParseException ignored) {
            try {
                return Instant.parse(normalized);
            } catch (DateTimeParseException ignoredAgain) {
                try {
                    return LocalDateTime.parse(normalized)
                            .atZone(APP_ZONE)
                            .toInstant();
                } catch (DateTimeParseException invalid) {
                    throw new IllegalArgumentException(
                            "measuredAt deve seguir ISO-8601, por exemplo 2026-10-13T19:20:00Z.",
                            invalid);
                }
            }
        }
    }

        /** Linha da tabela sensor_reading (CT2) devolvida pelas consultas de histórico. */
    public record SensorReading(long id, String deviceId, int co2, BigDecimal temperature,
                                BigDecimal humidity, OffsetDateTime measuredAt,
                                OffsetDateTime receivedAt) {
    }

    private record ValidatedReading(String deviceId, int co2, double temperature,
                                    double humidity, Instant measuredAt) {
    }
}
