# eBlocks Online - Code Examples

Pre-built examples to help you get started with eBlocks Online.

## Available Examples

### 1. Basic LED Blink (`blink.cpp`)
The classic "Hello World" of embedded programming. Demonstrates:
- `pinMode()` - Setting pin modes
- `digitalWrite()` - Digital output control
- `delay()` - Timing control
- Serial output for debugging

**Hardware:** Built-in LED on pin 13

---

### 2. Serial Echo (`serial-echo.cpp`)
Demonstrates serial communication. Features:
- `Serial.begin()` - Initialize serial
- `Serial.available()` - Check for incoming data
- `Serial.read()` - Read incoming data
- `Serial.print()` - Send data back

**Usage:** Type in the serial console and see it echo back

---

### 3. PWM Fade (`pwm-fade.cpp`)
Shows PWM (Pulse Width Modulation) for LED brightness control:
- `analogWrite()` - PWM output
- Variable brightness control
- Direction reversal at limits
- Smooth fading effect

**Hardware:** LED on pin 9 (PWM-capable pin)

---

## How to Use Examples

1. Click the "Load" button in the IDE
2. Select an example file from this directory
3. Click "Run Code" to execute
4. Monitor output in the serial console

## Creating Your Own Examples

Examples should follow this structure:

```cpp
// Description of what the example does

void setup() {
  // Initialization code
  Serial.begin(115200);
  pinMode(...);
}

void loop() {
  // Main code that runs repeatedly
}
```

## Tips

- Always include Serial.begin() for debugging
- Use Serial.println() to track program execution
- Start simple and build complexity gradually
- Test each function individually before combining

## Need More Examples?

Check out:
- Arduino Official Examples: https://www.arduino.cc/en/Tutorial/BuiltInExamples
- Firmata Documentation: https://github.com/firmata/protocol
- eBlocks Community: (link to community forum)
