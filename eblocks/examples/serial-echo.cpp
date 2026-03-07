// Serial Echo Example
// Echoes back anything received on serial port

void setup() {
  // Initialize serial communication at 115200 baud
  Serial.begin(115200);
  Serial.println("Serial Echo Example");
  Serial.println("Type something and press Enter...");
}

void loop() {
  // Check if data is available to read
  if (Serial.available() > 0) {
    // Read the incoming byte
    char incomingByte = Serial.read();
    
    // Echo it back
    Serial.print("You sent: ");
    Serial.println(incomingByte);
  }
}
