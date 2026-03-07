// Basic LED Blink Example
// Demonstrates digitalWrite and delay functions

void setup() {
  // Initialize serial communication
  Serial.begin(115200);
  Serial.println("LED Blink Example Starting...");
  
  // Set pin 13 (built-in LED) as output
  pinMode(13, OUTPUT);
}

void loop() {
  // Turn LED on
  digitalWrite(13, HIGH);
  Serial.println("LED ON");
  delay(1000);  // Wait 1 second
  
  // Turn LED off
  digitalWrite(13, LOW);
  Serial.println("LED OFF");
  delay(1000);  // Wait 1 second
}
