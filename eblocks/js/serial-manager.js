/**
 * Serial Manager - Web Serial API wrapper
 * Handles serial port connection, reading, and writing
 */

export class SerialManager {
  constructor() {
    this.port = null;
    this.reader = null;
    this.writer = null;
    this.isConnected = false;
    this.listeners = new Map();
    this.readLoop = null;
  }

  /**
   * Register event listener
   * Events: 'connected', 'disconnected', 'data', 'error'
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  /**
   * Emit event to all registered listeners
   */
  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => callback(data));
    }
  }

  /**
   * Connect to a serial port
   */
  async connect(baudRate = 115200) {
    if (!('serial' in navigator)) {
      throw new Error('Web Serial API not supported in this browser');
    }

    try {
      // Request port from user
      this.port = await navigator.serial.requestPort();
      
      // Open the port with specified baud rate
      await this.port.open({ 
        baudRate,
        dataBits: 8,
        stopBits: 1,
        parity: 'none',
        flowControl: 'none'
      });

      this.isConnected = true;
      
      // Get port info
      const info = this.port.getInfo();
      
      // Start reading
      this.startReading();
      
      // Get writer for sending data
      this.writer = this.port.writable.getWriter();
      
      this.emit('connected', {
        vendorId: info.usbVendorId,
        productId: info.usbProductId,
        baudRate
      });
      
      console.log('Serial port connected:', info);
      
    } catch (error) {
      this.isConnected = false;
      this.emit('error', error.message);
      throw error;
    }
  }

  /**
   * Disconnect from serial port
   */
  async disconnect() {
    if (!this.isConnected) return;

    try {
      // Cancel reading
      if (this.reader) {
        await this.reader.cancel();
        this.reader.releaseLock();
        this.reader = null;
      }

      // Release writer
      if (this.writer) {
        this.writer.releaseLock();
        this.writer = null;
      }

      // Close port
      if (this.port) {
        await this.port.close();
        this.port = null;
      }

      this.isConnected = false;
      this.emit('disconnected');
      
      console.log('Serial port disconnected');
      
    } catch (error) {
      console.error('Error disconnecting:', error);
      this.emit('error', error.message);
    }
  }

  /**
   * Start reading from serial port
   */
  async startReading() {
    if (!this.port || !this.port.readable) {
      console.error('Port not readable');
      return;
    }

    try {
      const textDecoder = new TextDecoderStream();
      const readableStreamClosed = this.port.readable.pipeTo(textDecoder.writable);
      this.reader = textDecoder.readable.getReader();

      // Read loop
      while (true) {
        const { value, done } = await this.reader.read();
        
        if (done) {
          console.log('Reader closed');
          break;
        }
        
        if (value) {
          this.emit('data', value);
        }
      }
    } catch (error) {
      if (error.name !== 'NetworkError') {
        console.error('Read error:', error);
        this.emit('error', error.message);
      }
    }
  }

  /**
   * Send data to serial port
   */
  async send(data) {
    if (!this.isConnected || !this.writer) {
      throw new Error('Not connected to serial port');
    }

    try {
      const encoder = new TextEncoder();
      const encoded = encoder.encode(data);
      await this.writer.write(encoded);
      console.log('Sent:', data);
    } catch (error) {
      console.error('Send error:', error);
      this.emit('error', error.message);
      throw error;
    }
  }

  /**
   * Send raw bytes to serial port
   */
  async sendBytes(bytes) {
    if (!this.isConnected || !this.writer) {
      throw new Error('Not connected to serial port');
    }

    try {
      const uint8Array = new Uint8Array(bytes);
      await this.writer.write(uint8Array);
      console.log('Sent bytes:', bytes);
    } catch (error) {
      console.error('Send bytes error:', error);
      this.emit('error', error.message);
      throw error;
    }
  }
}
