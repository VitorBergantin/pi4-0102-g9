# Montagem elétrica e mecânica

## Barramento I²C

O ESP32-S3 usa GPIO8 (SDA) e GPIO9 (SCL). O SCD30 usa endereço 0x61; o OLED SSD1306 normalmente 0x3C. Compartilhe SDA, SCL e GND por derivações soldadas e isoladas com termorretrátil. Alimente cada módulo conforme as especificações do breakout; não ligue automaticamente a alimentação em paralelo sem conferir as tensões suportadas. Use fios curtos e evite tração nas soldas.

## Caixa

Fixe o ESP32 por trilhos ou presilhas isolantes, sem pressionar antena ou componentes. Mantenha acesso ao USB, espaço para fios e ventilação ao redor do SCD30. Não encoste o sensor na região mais quente do ESP32. A base impressa não possui pads condutivos; soldas precisam de isolamento e alívio de tração.

## Antes de energizar

Confira continuidade, ausência de curto entre 3V3 e GND, polaridade e tensão nominal de cada módulo. Confirme a placa ESP32-S3 real e pinagem do conector. Não solde com os módulos energizados.
