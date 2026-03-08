/**
 * EB3Display Bridge Firmware
 *
 * Flash this sketch onto the board ONCE using Arduino IDE.
 * After that, the web IDE can send EB3Display commands directly
 * over USB serial — the bridge forwards them to the display UART.
 *
 * Wiring (as per EB3Display README):
 *   Arduino Mega 2560 : Display TX → pin 14 (RX3), Display RX → pin 15 (TX3)
 *   ESP32S3           : Display TX → GPIO 18,       Display RX → GPIO 17
 */

#define USB_BAUD     115200
#define DISPLAY_BAUD 115200

// ESP32S3 Serial2 pins — change if your wiring differs
#define ESP32_RX_PIN 18
#define ESP32_TX_PIN 17

void setup() {
  Serial.begin(USB_BAUD);

#if defined(ARDUINO_AVR_MEGA2560)
  Serial3.begin(DISPLAY_BAUD);

#elif defined(ARDUINO_ESP32S3_DEV) || defined(CONFIG_IDF_TARGET_ESP32S3) || defined(ARDUINO_ARCH_ESP32)
  Serial2.begin(DISPLAY_BAUD, SERIAL_8N1, ESP32_RX_PIN, ESP32_TX_PIN);

#else
  #error "Unsupported board. Add your board's UART setup here."
#endif
}

void loop() {
#if defined(ARDUINO_AVR_MEGA2560)
  if (Serial.available())  Serial3.write(Serial.read());
  if (Serial3.available()) Serial.write(Serial3.read());

#elif defined(ARDUINO_ESP32S3_DEV) || defined(CONFIG_IDF_TARGET_ESP32S3) || defined(ARDUINO_ARCH_ESP32)
  if (Serial.available())  Serial2.write(Serial.read());
  if (Serial2.available()) Serial.write(Serial2.read());
#endif
}
