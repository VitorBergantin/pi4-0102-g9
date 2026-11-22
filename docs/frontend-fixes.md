# Ajustes de robustez do frontend CO₂NNECT

## Objetivos

- Aplicar filtros de dispositivo, intervalo e CO₂ crítico diretamente na consulta Supabase **antes** do limite de 100 leituras. O limite de 100 continua válido e as médias representam somente os registros retornados, não necessariamente todo o período.
- Distinguir falha na consulta de ausência real de resultados.
- Exibir mensagens de falha, tentativa de recuperação e aviso sobre dados possivelmente desatualizados.
- Não manter status "Online" após o navegador perder a conexão com o broker MQTT.
- Preservar o processamento da telemetria e a validação por timestamps da H06.5.
- Usar a mesma leitura mais recente para o card de CO₂ e a classificação do banner, preservando estados opcionais de testes da H06.5.
- Remover identificadores fictícios do seletor e preservar o dispositivo escolhido quando a lista de medições mudar.
- Mostrar dados MQTT mesmo enquanto a primeira consulta Supabase está pendente.
- Manter as variáveis reais exclusivamente no `.env.local` local (fora do Git).

## Limitações deliberadas

- Não há paginação. O histórico mostra até 100 leituras após aplicar os filtros no banco.
- `sensor_device` requer permissão de leitura via RLS para popular o seletor completo. Se indisponível, os IDs presentes nas respostas de leitura e o ID previamente selecionado são mantidos como alternativa.
- A conexão direta do navegador usa WebSocket (`ws://` local ou `wss://` remoto). `NEXT_PUBLIC_MQTT_WS_URL` precisa estar configurada fora dos testes automatizados; não há fallback de produção para um broker arbitrário. `localhost` só alcança o próprio computador; em outro computador na mesma rede use o IPv4 do host do Mosquitto.
- Um evento de desconexão do broker torna o status dos sensores desconhecido. Sem novas mensagens MQTT não há como confirmar o estado físico atualizado do ESP32.
- O backend Java deve gravar no mesmo banco Supabase que o frontend consulta.
- Mudança de semântica do banner: a leitura mais recente exibida pode ser Supabase ou MQTT. Revisar com o responsável pela H06.5.

## Arquivos alterados

- `lib/services/supabase.ts`
- `lib/services/mqtt.ts`
- `components/history/HistoryTab.tsx`
- `components/dashboard/DashboardTab.tsx`
- `components/EspSelector.tsx`
- `app/page.tsx`
- `.env.exemple`
- `vitest.config.mts` (inclui novos testes, preserva os anteriores)

## Testes recomendados

1. `pnpm.cmd test`
2. `pnpm.cmd exec next typegen`
3. `pnpm.cmd exec tsc --noEmit`
4. `pnpm.cmd build`
5. `pnpm.cmd lint`
6. Conferir no Histórico: período antigo, dispositivo, apenas críticas, limpeza dos filtros e resposta vazia.
7. Simular Supabase inacessível e confirmar mensagem visível de falha sem confundí-la com ausência de dados.
8. Desconectar o broker e conferir que o Dashboard não mostra o último "Online" como atual.
9. Testar o broker real + ESP32 quando disponível.
