/**
 * Firmata Controller - Translates Arduino commands to Firmata protocol
 * Implements StandardFirmata protocol for Arduino/ESP32 boards
 */

export class FirmataController {
  constructor() {
    this.port = null;
    this.pinModes = new Map();
    this.pinStates = new Map();
    
    // Firmata protocol constants
    this.FIRMATA = {
      // Message types
      DIGITAL_MESSAGE: 0x90,
      ANALOG_MESSAGE: 0xE0,
      REPORT_ANALOG: 0xC0,
      REPORT_DIGITAL: 0xD0,
      SET_PIN_MODE: 0xF4,
      SET_DIGITAL_PIN_VALUE: 0xF5,
      START_SYSEX: 0xF0,
      END_SYSEX: 0xF7,
      
      // Pin modes
      INPUT: 0x00,
      OUTPUT: 0x01,
      ANALOG: 0x02,
      PWM: 0x03,
      SERVO: 0x04,
      
      // Sysex commands
      SERVO_CONFIG: 0x70,
      STRING_DATA: 0x71,
      REPORT_FIRMWARE: 0x79,
      SAMPLING_INTERVAL: 0x7A,
      SYSEX_NON_REALTIME: 0x7E,
      SYSEX_REALTIME: 0x7F
    };
  }

  /**
   * Set the serial port for communication
   */
  setPort(port) {
    this.port = port;
  }

  /**
   * Execute an Arduino command and translate to Firmata
   */
  async executeCommand(command, args) {
    if (!this.port) {
      console.warn('No serial port connected');
      return;
    }

    try {
      switch (command) {
        case 'pinMode':
          await this.pinMode(args[0], args[1]);
          break;
          
        case 'digitalWrite':
          await this.digitalWrite(args[0], args[1]);
          break;
          
        case 'digitalRead':
          return await this.digitalRead(args[0]);
          
        case 'analogWrite':
          await this.analogWrite(args[0], args[1]);
          break;
          
        case 'analogRead':
          return await this.analogRead(args[0]);
          
        default:
          console.warn(`Unknown Firmata command: ${command}`);
      }
    } catch (error) {
      console.error(`Firmata command error (${command}):`, error);
    }
  }

  /**
   * Set pin mode (INPUT, OUTPUT, PWM, etc.)
   */
  async pinMode(pin, mode) {
    const firmataMode = this.arduinoModeToFirmata(mode);
    
    const bytes = [
      this.FIRMATA.SET_PIN_MODE,
      pin,
      firmataMode
    ];
    
    await this.sendBytes(bytes);
    this.pinModes.set(pin, firmataMode);
    
    console.log(`pinMode(${pin}, ${mode}) -> Firmata mode ${firmataMode}`);
  }

  /**
   * Write digital value to pin (HIGH/LOW)
   */
  async digitalWrite(pin, value) {
    const bytes = [
      this.FIRMATA.SET_DIGITAL_PIN_VALUE,
      pin,
      value ? 1 : 0
    ];
    
    await this.sendBytes(bytes);
    this.pinStates.set(pin, value ? 1 : 0);
    
    console.log(`digitalWrite(${pin}, ${value ? 'HIGH' : 'LOW'})`);
  }

  /**
   * Read digital value from pin
   */
  async digitalRead(pin) {
    // In Firmata, digital reads are reported asynchronously
    // For simplicity, return cached state or 0
    return this.pinStates.get(pin) || 0;
  }

  /**
   * Write analog/PWM value to pin
   */
  async analogWrite(pin, value) {
    // Ensure pin is in PWM mode
    if (this.pinModes.get(pin) !== this.FIRMATA.PWM) {
      await this.pinMode(pin, this.FIRMATA.PWM);
    }
    
    // Firmata analog message: 0xE0 | pin, value & 0x7F, (value >> 7) & 0x7F
    const bytes = [
      this.FIRMATA.ANALOG_MESSAGE | (pin & 0x0F),
      value & 0x7F,
      (value >> 7) & 0x7F
    ];
    
    await this.sendBytes(bytes);
    
    console.log(`analogWrite(${pin}, ${value})`);
  }

  /**
   * Read analog value from pin
   */
  async analogRead(pin) {
    // Analog reads are reported asynchronously in Firmata
    // Would need to implement response parsing
    return 0;
  }

  /**
   * Convert Arduino pin mode to Firmata mode
   */
  arduinoModeToFirmata(mode) {
    const modeMap = {
      0: this.FIRMATA.INPUT,      // INPUT
      1: this.FIRMATA.OUTPUT,     // OUTPUT
      2: this.FIRMATA.INPUT,      // INPUT_PULLUP (treat as INPUT)
      3: this.FIRMATA.PWM,        // PWM
      4: this.FIRMATA.SERVO       // SERVO
    };
    
    return modeMap[mode] !== undefined ? modeMap[mode] : this.FIRMATA.OUTPUT;
  }

  /**
   * Send bytes to serial port
   */
  async sendBytes(bytes) {
    if (!this.port) {
      throw new Error('No serial port connected');
    }

    try {
      const writer = this.port.writable.getWriter();
      const uint8Array = new Uint8Array(bytes);
      await writer.write(uint8Array);
      writer.releaseLock();
      
      console.log('Sent Firmata bytes:', bytes.map(b => '0x' + b.toString(16)).join(' '));
    } catch (error) {
      console.error('Error sending Firmata bytes:', error);
      throw error;
    }
  }

  /**
   * Initialize Firmata connection
   * Request firmware version and configure sampling
   */
  async initialize() {
    // Request firmware version
    const versionRequest = [
      this.FIRMATA.START_SYSEX,
      this.FIRMATA.REPORT_FIRMWARE,
      this.FIRMATA.END_SYSEX
    ];
    
    await this.sendBytes(versionRequest);
    
    // Set sampling interval to 19ms (default)
    const samplingInterval = [
      this.FIRMATA.START_SYSEX,
      this.FIRMATA.SAMPLING_INTERVAL,
      19 & 0x7F,
      (19 >> 7) & 0x7F,
      this.FIRMATA.END_SYSEX
    ];
    
    await this.sendBytes(samplingInterval);
    
    console.log('Firmata initialized');
  }

  /**
   * Enable reporting for digital port
   */
  async enableDigitalReporting(port) {
    const bytes = [
      this.FIRMATA.REPORT_DIGITAL | (port & 0x0F),
      1
    ];
    
    await this.sendBytes(bytes);
  }

  /**
   * Enable reporting for analog pin
   */
  async enableAnalogReporting(pin) {
    const bytes = [
      this.FIRMATA.REPORT_ANALOG | (pin & 0x0F),
      1
    ];
    
    await this.sendBytes(bytes);
  }
}
