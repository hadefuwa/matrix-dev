/**
 * EB3Display Bridge Firmware
 *
 * Flash this sketch onto the board ONCE using Arduino IDE.
 * After that, the web IDE can send EB3Display commands directly
 * over USB serial — the bridge forwards them to the display UART.
 *
 * IMPORTANT: The E-Blocks 3 Mega routes its USB connection to
 * Serial2 (UART2, pins 16/17), NOT Serial0. This firmware
 * bridges Serial2 (USB) ↔ Serial3 (display).
 *
 * Wiring (as per EB3Display README):
 *   E-Blocks 3 Mega 2560 : Display TX → pin 14 (RX3), Display RX → pin 15 (TX3)
 *   ESP32S3              : Display TX → GPIO 18,       Display RX → GPIO 17
 */

#define BAUD 115200

// ESP32S3 Serial2 pins — change if your wiring differs
#define ESP32_RX_PIN 18
#define ESP32_TX_PIN 17

void setup() {
#if defined(ARDUINO_AVR_MEGA2560)
  // E-Blocks 3 Mega: USB is on Serial2, display is on Serial3
  Serial2.begin(BAUD);  // USB ↔ PC
  Serial3.begin(BAUD);  // Display UART

#elif defined(ARDUINO_ESP32S3_DEV) || defined(CONFIG_IDF_TARGET_ESP32S3) || defined(ARDUINO_ARCH_ESP32)
  // ESP32S3: USB is on Serial (USB-OTG or CDC), display on Serial2
  Serial.begin(BAUD);
  Serial2.begin(BAUD, SERIAL_8N1, ESP32_RX_PIN, ESP32_TX_PIN);

#else
  #error "Unsupported board. Add your board's UART setup here."
#endif
}

void loop() {
#if defined(ARDUINO_AVR_MEGA2560)
  if (Serial2.available()) Serial3.write(Serial2.read());
  if (Serial3.available()) Serial2.write(Serial3.read());

#elif defined(ARDUINO_ESP32S3_DEV) || defined(CONFIG_IDF_TARGET_ESP32S3) || defined(ARDUINO_ARCH_ESP32)
  if (Serial.available())  Serial2.write(Serial.read());
  if (Serial2.available()) Serial.write(Serial2.read());
#endif
}
