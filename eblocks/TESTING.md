# eBlocks Online - Testing Guide

## Pre-Test Setup

### 1. Hardware Preparation

#### For Arduino Mega:
1. Connect Arduino Mega to computer via USB
2. Flash StandardFirmata:
   ```
   Arduino IDE → File → Examples → Firmata → StandardFirmata
   Upload to board
   ```
3. Note the COM port (Windows) or /dev/tty* (Mac/Linux)

#### For ESP32:
1. Connect ESP32 to computer via USB
2. Install Firmata for ESP32:
   ```
   Arduino IDE → Library Manager → Search "Firmata"
   Install "Firmata" library
   Examples → Firmata → StandardFirmataESP32
   Upload to board
   ```
3. Note the COM port

### 2. Browser Setup

**Supported Browsers:**
- Google Chrome 89+ ✅
- Microsoft Edge 89+ ✅
- Opera 75+ ✅
- Firefox ❌ (Web Serial not supported)
- Safari ❌ (Web Serial not supported)

**Required Permissions:**
- Allow serial port access when prompted
- Allow notifications (optional)

## Test Checklist

### ✅ Basic Functionality

- [ ] **Page Load**
  - [ ] Page loads without errors
  - [ ] Monaco Editor initializes
  - [ ] Browser compatibility message shows correctly
  - [ ] All UI elements visible

- [ ] **Editor Functionality**
  - [ ] Can type in editor
  - [ ] Syntax highlighting works (C++ keywords colored)
  - [ ] Minimap displays
  - [ ] Line numbers visible
  - [ ] Auto-complete works

- [ ] **File Operations**
  - [ ] Save button downloads .cpp file
  - [ ] Load button opens file picker
  - [ ] Can load .cpp, .ino, .txt files
  - [ ] Code persists in localStorage

### ✅ Serial Connection

- [ ] **Connection Flow**
  - [ ] Click "Connect to Board" shows port picker
  - [ ] Can select correct port
  - [ ] Status changes to "Connected"
  - [ ] Green dot appears in status indicator
  - [ ] Board info displays correctly

- [ ] **Disconnection**
  - [ ] Click "Disconnect" closes connection
  - [ ] Status changes to "Disconnected"
  - [ ] Can reconnect after disconnect

- [ ] **Error Handling**
  - [ ] Error shown if no port selected
  - [ ] Error shown if connection fails
  - [ ] Graceful handling of board unplugged

### ✅ Code Execution

- [ ] **Run Basic Code**
  - [ ] Load blink.cpp example
  - [ ] Click "Run Code"
  - [ ] No errors in execution
  - [ ] Serial output appears in console

- [ ] **Firmata Communication**
  - [ ] LED blinks when running blink.cpp
  - [ ] Serial monitor shows "LED ON/OFF" messages
  - [ ] Commands sent to board

- [ ] **Error Handling**
  - [ ] Syntax errors caught and displayed
  - [ ] Timeout protection works (>30s)
  - [ ] Error messages are readable

### ✅ Serial Console

- [ ] **Output Display**
  - [ ] Serial data appears in console
  - [ ] Timestamps visible
  - [ ] Auto-scroll works
  - [ ] Can disable auto-scroll

- [ ] **Input/Send**
  - [ ] Can type in console input
  - [ ] Send button sends data
  - [ ] Enter key sends data
  - [ ] Board receives data correctly

- [ ] **Console Controls**
  - [ ] Clear button empties console
  - [ ] Console scrolls smoothly

### ✅ UI/UX

- [ ] **Responsiveness**
  - [ ] Resizes with browser window
  - [ ] Works at different screen sizes
  - [ ] Sidebars remain visible/functional

- [ ] **Theme**
  - [ ] Dark theme consistent throughout
  - [ ] Text readable everywhere
  - [ ] Buttons have hover effects
  - [ ] Status colors correct (green=connected, red=error)

### ✅ Examples

- [ ] **Load Examples**
  - [ ] blink.cpp loads correctly
  - [ ] serial-echo.cpp loads correctly
  - [ ] pwm-fade.cpp loads correctly
  - [ ] Examples run without errors

## Test Scenarios

### Scenario 1: First-Time User

1. Open eBlocks Online in Chrome
2. See browser compatibility confirmation
3. Click "Connect to Board"
4. Select serial port from list
5. Connection established successfully
6. Click "Load" and select blink.cpp
7. Click "Run Code"
8. Observe LED blinking
9. See serial output in console

**Expected:** Smooth experience, LED blinks, serial output visible

---

### Scenario 2: Code Development

1. Write custom code in editor
2. Click "Save" to download
3. Make modifications
4. Click "Run Code"
5. Debug using serial output
6. Iterate until working

**Expected:** Edit-run-debug cycle works smoothly

---

### Scenario 3: Serial Communication

1. Load serial-echo.cpp
2. Run the code
3. Type message in console input
4. Click "Send"
5. Observe echoed response

**Expected:** Bidirectional communication works

---

### Scenario 4: Error Handling

1. Write code with syntax error
2. Click "Run Code"
3. Observe error message
4. Fix error
5. Run again successfully

**Expected:** Clear error messages, easy recovery

---

### Scenario 5: Disconnect/Reconnect

1. Connect to board
2. Unplug USB cable
3. Observe disconnect notification
4. Plug back in
5. Click "Connect" again
6. Resume work

**Expected:** Graceful handling of disconnection

## Performance Tests

### Code Execution Speed
- Simple loop (1000 iterations): < 1 second
- Complex calculations: < 5 seconds
- Maximum execution time: 30 seconds (timeout)

### Serial Throughput
- Data rate: Up to 115200 baud
- Latency: < 100ms for round-trip
- Buffer handling: No data loss at normal rates

### Browser Performance
- Page load time: < 3 seconds
- Memory usage: < 200MB
- No memory leaks after extended use

## Known Issues to Watch For

1. **Web Serial API Limitations**
   - Only works in Chrome/Edge/Opera
   - Requires HTTPS (or localhost)
   - May require permission grant

2. **JSCPP Limitations**
   - Not all C++ features supported
   - Limited standard library
   - Slower than native compilation

3. **Firmata Limitations**
   - Board must be pre-flashed
   - Async operations may have latency
   - Some advanced features not available

## Bug Report Template

If you find issues, report using this template:

```
**Browser:** Chrome 120.0
**OS:** Windows 11
**Board:** Arduino Mega
**Steps to Reproduce:**
1. ...
2. ...
3. ...

**Expected Behavior:**
...

**Actual Behavior:**
...

**Console Errors:**
...

**Screenshots:**
(attach if relevant)
```

## Success Criteria

✅ All basic functionality tests pass  
✅ Can connect to board successfully  
✅ Can run example code  
✅ LED responds to commands  
✅ Serial communication works both ways  
✅ Error handling is graceful  
✅ UI is responsive and usable  

## Next Steps After Testing

1. Document any issues found
2. Create GitHub issues for bugs
3. Prioritize fixes
4. Add more examples based on user needs
5. Implement advanced features (Web Workers, etc.)
