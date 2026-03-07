// PWM Fade Example
// Demonstrates analogWrite for LED brightness control

int ledPin = 9;  // Pin with PWM support
int brightness = 0;
int fadeAmount = 5;

void setup() {
  Serial.begin(115200);
  Serial.println("PWM Fade Example");
  Serial.println("Fading LED on pin 9...");
  
  pinMode(ledPin, OUTPUT);
}

void loop() {
  // Set LED brightness
  analogWrite(ledPin, brightness);
  Serial.print("Brightness: ");
  Serial.println(brightness);
  
  // Change brightness for next iteration
  brightness = brightness + fadeAmount;
  
  // Reverse direction at the ends of the fade
  if (brightness <= 0 || brightness >= 255) {
    fadeAmount = -fadeAmount;
  }
  
  delay(30);  // Wait 30ms for smooth fade
}
