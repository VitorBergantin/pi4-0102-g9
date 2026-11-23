### CT5 — listReadings

| Campo | Valor |
|---|---|
| Fronteira | HTTP/REST |
| Quem fornece | Backend Java |
| Consumidor originalmente previsto | Frontend |
| Consumidor efetivo da API | Não identificado no fluxo atual do Histórico web |
| Atende | E6 — Consulta das medições |
| Como chamar | GET `/api/readings` |
| Situação | Implementado no código do backend Java |
| Utilização pelo frontend | O Histórico consulta diretamente o Supabase, sem chamar este endpoint |

### Observação sobre a implementação

O endpoint HTTP `GET /api/readings` está implementado na classe `ReadingsApiServer.java`, e sua inicialização está prevista na classe `Servidor.java`.

Entretanto, o Histórico do frontend utiliza a função `fetchReadings`, definida em `lib/services/supabase.ts`, para consultar diretamente a tabela `sensor_reading` do Supabase.

Assim, a CT5 permanece documentando a API Java existente, mas não deve afirmar que ela é utilizada pela tela de Histórico da aplicação web.
