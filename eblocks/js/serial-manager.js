/**
 * Serial Manager - Web Serial API wrapper
 * Handles serial port connection, reading, and writing
 */

export class SerialManager {
  constructor() {
    this.port = null;
    this.reader = null;
    this.isConnected = false;
    this.listeners = new Map();
    this.readLoopPromise = null;
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
   * Get previously authorized ports (no picker required)
   */
  async getAvailablePorts() {
    if (!('serial' in navigator)) return [];
    return navigator.serial.getPorts();
  }

  /**
   * Connect to a serial port — optionally pass an existing port object to skip the picker
   */
  async connect(baudRate = 115200, port = null) {
    if (!('serial' in navigator)) {
      throw new Error('Web Serial API not supported in this browser');
    }

    try {
      this.port = port || await navigator.serial.requestPort();

      await this.port.open({
        baudRate,
        dataBits: 8,
        stopBits: 1,
        parity: 'none',
        flowControl: 'none'
      });

      this.isConnected = true;

      const info = this.port.getInfo();

      // Start read loop — store promise so disconnect() can await it
      this.readLoopPromise = this.startReading();

      this.emit('connected', {
        vendorId: info.usbVendorId,
        productId: info.usbProductId,
        baudRate,
        port: this.port
      });

      console.log('Serial port connected:', info);

    } catch (error) {
      this.isConnected = false;
      this.port = null;
      this.emit('error', error.message);
      throw error;
    }
  }

  /**
   * Disconnect from serial port
   */
  async disconnect() {
    if (!this.isConnected) return;

    this.isConnected = false;

    try {
      // Cancel the reader first — this unblocks the read() call in the loop
      if (this.reader) {
        await this.reader.cancel().catch(() => {});
        this.reader = null;
      }

      // Wait for the read loop's finally block to release the stream lock
      if (this.readLoopPromise) {
        await this.readLoopPromise.catch(() => {});
        this.readLoopPromise = null;
      }

      // Stream lock is now released — safe to close the port
      if (this.port) {
        await this.port.close();
        this.port = null;
      }

      this.emit('disconnected');
      console.log('Serial port disconnected');

    } catch (error) {
      console.error('Error disconnecting:', error);
      this.emit('error', error.message);
    }
  }

  /**
   * Read loop using a raw reader (avoids pipeTo stream lock issues on disconnect)
   */
  async startReading() {
    if (!this.port || !this.port.readable) return;

    const textDecoder = new TextDecoder();
    try {
      this.reader = this.port.readable.getReader();

      while (true) {
        const { value, done } = await this.reader.read();
        if (done) break;
        if (value) {
          this.emit('data', textDecoder.decode(value));
        }
      }
    } catch (error) {
      if (error.name !== 'NetworkError' && error.name !== 'AbortError') {
        console.error('Read error:', error);
        this.emit('error', error.message);
      }
    } finally {
      // Always release the lock so the port can be closed afterwards
      if (this.reader) {
        try { this.reader.releaseLock(); } catch {}
        this.reader = null;
      }
    }
  }

  /**
   * Send text data to serial port
   * Gets and releases the writer lock per-call so FirmataController can also write
   */
  async send(data) {
    if (!this.isConnected || !this.port) {
      throw new Error('Not connected to serial port');
    }

    const writer = this.port.writable.getWriter();
    try {
      await writer.write(new TextEncoder().encode(data));
      console.log('Sent:', data);
    } catch (error) {
      console.error('Send error:', error);
      this.emit('error', error.message);
      throw error;
    } finally {
      writer.releaseLock();
    }
  }

  /**
   * Send raw bytes to serial port
   */
  async sendBytes(bytes) {
    if (!this.isConnected || !this.port) {
      throw new Error('Not connected to serial port');
    }

    const writer = this.port.writable.getWriter();
    try {
      await writer.write(new Uint8Array(bytes));
      console.log('Sent bytes:', bytes);
    } catch (error) {
      console.error('Send bytes error:', error);
      this.emit('error', error.message);
      throw error;
    } finally {
      writer.releaseLock();
    }
  }
}
