package src.test;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.ObjectInputStream;
import java.io.ObjectOutputStream;
import java.io.OutputStream;
import java.net.ServerSocket;
import java.net.Socket;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;

import org.junit.Test;

import src.Comum.Leitura;
import src.Servidor.AceitadorDeConexao;
import src.Servidor.DatabaseManager;
import src.Servidor.Parceiro;
import src.Servidor.SupervisoraDeConexao;

/**
 * Garante o caminho Cliente -> Servidor (TCP) -> banco, sem precisar de PostgreSQL:
 *  1) o servidor NÃO fecha a conexão logo após aceitá-la;
 *  2) uma falha de banco (contêiner parado) descarta só aquela leitura e a MESMA conexão
 *     volta a gravar quando o banco volta, sem reiniciar o servidor (H03.2).
 */
public class ServidorIngestaoTest {
    private static final String DEAD_URL = "jdbc:postgresql://localhost:1/co2nect";

    /** Banco falso: a 1ª gravação falha (banco parado) e as seguintes são registradas. */
    private static class BancoQueCai extends DatabaseManager {
        final List<Leitura> gravadas = Collections.synchronizedList(new ArrayList<>());
        final CountDownLatch gravouDuas = new CountDownLatch(2);
        final CountDownLatch falhouUmaVez = new CountDownLatch(1);
        volatile boolean parado = true;

        BancoQueCai() {
            super(DEAD_URL, "u", "p");
        }

        @Override
        public long saveRead(Leitura data) throws SQLException {
            if (parado) {
                falhouUmaVez.countDown();
                throw new SQLException("Connection refused (banco parado)");
            }
            gravadas.add(data);
            gravouDuas.countDown();
            return gravadas.size();
        }
    }

    private static int portaLivre() throws Exception {
        try (ServerSocket socket = new ServerSocket(0)) {
            return socket.getLocalPort();
        }
    }

    private static class UsuariosMonitorados extends ArrayList<Parceiro> {
        volatile Thread supervisora;

        @Override
        public boolean add(Parceiro usuario) {
            supervisora = Thread.currentThread();
            return super.add(usuario);
        }
    }

    private static AceitadorDeConexao sobe(int porta, BancoQueCai banco, UsuariosMonitorados usuarios) throws Exception {
        AceitadorDeConexao aceitador = new AceitadorDeConexao(String.valueOf(porta), usuarios, banco);
        aceitador.setDaemon(true); // não segura a JVM de teste
        aceitador.start();
        return aceitador;
    }

    private static void verificaEncerramento(AceitadorDeConexao aceitador, UsuariosMonitorados usuarios) throws Exception {
        aceitador.join(5000);
        assertFalse("a thread aceitadora deveria terminar após fechar o listener", aceitador.isAlive());
        Thread supervisora = usuarios.supervisora;
        if (supervisora != null) {
            supervisora.join(5000);
            assertFalse("a supervisora deveria terminar após fechar o cliente", supervisora.isAlive());
        }
        synchronized (usuarios) {
            assertTrue("nenhum parceiro deveria permanecer registrado", usuarios.isEmpty());
        }
    }

    @Test(timeout = 20000)
    public void supervisoraFechaSocketMesmoQuandoAdeusFalha() throws Exception {
        ByteArrayOutputStream entrada = new ByteArrayOutputStream();
        try (ObjectOutputStream out = new ObjectOutputStream(entrada)) {
            out.writeObject(null); // encerra normalmente o loop de comunicação
        }
        AtomicBoolean falhouAoFecharStream = new AtomicBoolean();
        UsuariosMonitorados usuarios = new UsuariosMonitorados();
        try (Socket conexao = new Socket() {
            @Override
            public InputStream getInputStream() {
                return new ByteArrayInputStream(entrada.toByteArray());
            }

            @Override
            public OutputStream getOutputStream() {
                return new ByteArrayOutputStream() {
                    @Override
                    public void close() throws IOException {
                        falhouAoFecharStream.set(true);
                        throw new IOException("falha simulada ao fechar o stream");
                    }
                };
            }
        }) {
            SupervisoraDeConexao supervisora = new SupervisoraDeConexao(conexao, usuarios, new BancoQueCai());
            supervisora.start();
            supervisora.join(5000);

            assertFalse("a supervisora deveria terminar mesmo com falha no adeus", supervisora.isAlive());
            assertTrue("o fechamento do stream deveria falhar", falhouAoFecharStream.get());
            assertTrue("o socket deveria estar fechado antes da limpeza do teste", conexao.isClosed());
            synchronized (usuarios) {
                assertTrue("o parceiro deveria ser removido", usuarios.isEmpty());
            }
        }
    }

    @Test(timeout = 20000)
    public void servidorMantemAConexaoAbertaEGravaAsLeituras() throws Exception {
        BancoQueCai banco = new BancoQueCai();
        banco.parado = false;
        int porta = portaLivre();
        UsuariosMonitorados usuarios = new UsuariosMonitorados();
        AceitadorDeConexao aceitador = sobe(porta, banco, usuarios);

        try (aceitador; Socket socket = new Socket("127.0.0.1", porta)) {
            ObjectOutputStream out = new ObjectOutputStream(socket.getOutputStream());
            out.flush();
            new ObjectInputStream(socket.getInputStream()); // handshake: falha com EOF se o servidor fechar o socket

            out.writeObject(new Leitura("ESP32-SALA-01", 850, 24.5, 45.2, "2026-10-13T19:20:00Z"));
            out.flush();
            out.reset();
            out.writeObject(new Leitura("ESP32-SALA-01", 860, 24.6, 45.3, "2026-10-13T19:20:05Z"));
            out.flush();

            assertTrue("as duas leituras deveriam ser gravadas", banco.gravouDuas.await(5, TimeUnit.SECONDS));
            assertEquals(850, banco.gravadas.get(0).getCo2());
            assertEquals(860, banco.gravadas.get(1).getCo2());
        } finally {
            verificaEncerramento(aceitador, usuarios);
        }
    }

    @Test(timeout = 20000)
    public void bancoParadoDescartaSoUmaLeituraEAMesmaConexaoVoltaAGravar() throws Exception {
        BancoQueCai banco = new BancoQueCai();
        int porta = portaLivre();
        UsuariosMonitorados usuarios = new UsuariosMonitorados();
        AceitadorDeConexao aceitador = sobe(porta, banco, usuarios);

        try (aceitador; Socket socket = new Socket("127.0.0.1", porta)) {
            ObjectOutputStream out = new ObjectOutputStream(socket.getOutputStream());
            out.flush();
            new ObjectInputStream(socket.getInputStream());

            // 1) banco parado: a leitura se perde, mas a conexão com o cliente continua de pé
            out.writeObject(new Leitura("ESP32-SALA-01", 999, 25.0, 51.0, "2026-10-13T19:20:00Z"));
            out.flush();
            out.reset();
            assertTrue("a primeira leitura deveria falhar antes da recuperação",
                    banco.falhouUmaVez.await(5, TimeUnit.SECONDS));

            // 2) banco religado: as próximas leituras na MESMA conexão são gravadas
            banco.parado = false;
            out.writeObject(new Leitura("ESP32-SALA-01", 850, 24.5, 45.2, "2026-10-13T19:20:05Z"));
            out.flush();
            out.reset();
            out.writeObject(new Leitura("ESP32-SALA-01", 860, 24.6, 45.3, "2026-10-13T19:20:10Z"));
            out.flush();

            assertTrue("o servidor deveria voltar a gravar sem reiniciar",
                    banco.gravouDuas.await(5, TimeUnit.SECONDS));
            assertEquals("a leitura feita com o banco parado não pode aparecer", 2, banco.gravadas.size());
            assertEquals(850, banco.gravadas.get(0).getCo2());
        } finally {
            verificaEncerramento(aceitador, usuarios);
        }
    }
}
