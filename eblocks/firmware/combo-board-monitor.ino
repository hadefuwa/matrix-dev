/*
  Title:     E-Blocks 3 Mega + Combo Board Serial Monitor Example
  Company:   Matrix TSL (E-Blocks 3 System)
  Date:      11 November 2025
  Author:    Example Program for Educational Use

  Description:
  -------------------------------------------------------------
  This example program demonstrates how to read all 8 digital
  inputs from Port A and Port B on an E-Blocks 3 Combo Board
  (EB083) when connected to an E-Blocks 3 Arduino Mega board.

  The input states are sent over Serial2, since the E-Blocks 3
  Mega board routes its USB connection to UART2 instead of Serial0.

  Port A and Port B each provide 8 digital I/O lines.
  The program continuously reads all pins and prints their
  HIGH (1) or LOW (0) logic states in order.

  Notes:
  - Connect the Combo Board directly to Port A and Port B headers
    on the E-Blocks 3 Mega.
  - The leftmost switch corresponds to bit 0 (LSB).
  - The rightmost switch corresponds to bit 7 (MSB).
  - Open the app serial monitor at 115200 baud.
  - Each line shows the full port state, updating every 0.5 s.

  Serial output format (parsed by the web app):
    Port A: 1 0 1 1 0 1 0 1 | Port B: 0 0 1 1 0 0 1 1
  -------------------------------------------------------------
*/

// Port A pin mapping (bit 0 = leftmost switch, bit 7 = rightmost)
int portA[] = {29, 28, 27, 26, 25, 24, 23, 22};

// Port B pin mapping (leftmost switch = bit 0, rightmost = bit 7)
int portB[] = {13, 12, 11, 10, 50, 51, 52, 53};

void setup() {
  // E-Blocks 3 Mega uses Serial2 for its USB-to-PC connection
  Serial2.begin(115200);
  delay(2000);

  Serial2.println("=== E-Blocks 3 Mega + Combo Board ===");
  Serial2.println("Digital Input Monitor Example");
  Serial2.println("Port A and Port B Logic States");
  Serial2.println("Baud: 115200");
  Serial2.println("-------------------------------------");
  Serial2.println();

  for (int i = 0; i < 8; i++) {
    pinMode(portA[i], INPUT);
    pinMode(portB[i], INPUT);
  }
}

void loop() {
  Serial2.print("Port A: ");
  for (int i = 0; i < 8; i++) {
    Serial2.print(digitalRead(portA[i]));
    Serial2.print(" ");
  }

  Serial2.print("| Port B: ");
  for (int i = 0; i < 8; i++) {
    Serial2.print(digitalRead(portB[i]));
    Serial2.print(" ");
  }

  Serial2.println();
  delay(500);
}
