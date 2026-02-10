This activity is for IOT Project 2.1. Documentation on how to set this up:

============================================================
HARDWARE:
1. ESP32 DEV BOARD (WIFI-BT SoC, ISM2.4G 802.11/b/g/n)
2. DHT11 or HDT11 Temp/Humidity Sensor
3. Jumper Wires (Female-Female)
4. USB-C Cable

**Connect the jumper wires** accordingly to each specific pin as labeled in the Dev Board and Sensor:

DHT11 Sensor | ESP32 Board
VCC          | 3V3
DATA         | P4 (This can be changed to any pin (P), as long as you adjust  
               the CPP code in Arduino.)
GND          | GND

============================================================
INSTALLATIONS/TOOL PREP:
1.**Mosquitto (MQTT):** Refer to the DOCX file in the directory. (To read DOCX files in VS Code, can download the extension 'Docx/ODT Viewer' by Shahil Kumar.)
   1. Edit **mosquitto.conf** and add these two lines at the end of the whole config: 
      `listener 1883 0.0.0.0`
      `allow_anonymous true`
      This is to allow anonymous wifi connections since the server (the PC) and the dev board must have the same wifi connection. **Also note** that you will need the SSID, password, and ipv4 address of your connection. It is very case-sensitive, so you might get stuck in trying to connect later on if there are incorrect values in the ESP32 code.
      There may also be Firewall fixes here to allow freedom in connection.
2. **Node-RED:** Refer to the DOCX file in the directory.
   1. Hamburger Icon (Menu) > Manage Palette > Install
      1. @flowfuse/node-red-dashboard
      2. node-red-contrib-google-sheets
      3. node-red-iot-mqtt-api
   2. Menu > Import > Copy and paste 'ESP32_NODERED_TEMPSENSOR.json'. Then a flow will be seen in the space.
3. **Arduino** (https://docs.arduino.cc/software/ide/)
   1. Tools > Board Manager > ESP32 by Espressif Systems > DOIT ESP32 DEVKIT V1
   2. Port > Set to COMX (COM5 usually. This will appear if you have the appropriate USB-C cable. Will be wrong if your port is still set to Serial Ports.)
   3. Left Side Bar > Library Manager
      1.  Adafruit Unified Sensor by Adafruit
      2.  DHT sensor library by Adafruit
      3.  PubSubClient by Nick O'Leary (for the MQTT data transfers) 
  1.  Transfer the code to your Arduino sketch file (.ino) and edit the necessary wi-fi settings.
4. **Google Sheets**
   1. Create file named 'DHT11 Data Logger'. Add plain columns titled: Timestamp | Temperature | Humidity
   2. Open Apps Script Extension > Copy the 'ESP32_TEMPSENSOR_APPSCRIPT.gs' content into the Code.gs
      1. Click Deploy > New Deployment > Select Type: Web App > Execute as 'Me' > Who has access: Anyone (very important!)
      2. Get generated Web App URL and paste it into **NODE-RED** by double clicking [Post -> Google Sheets] and changing the sample script URL to your set Apps Script URL.

============================================================
STEPS:
1. Prepare all the necessary installations and set-ups.
2. Wire the hardware and connect it to the PC. Check if LEDs are lighting up.
3. Make sure all tools are ready.
   1. Go to Task Manager > Services > Scroll for 'mosquitto' and check if running. If yes, then good.
   2. Go to Node-Red localhost server > Check if ESP32 DHT11 node has a green dot at the bottom with 'connected'.
4. Go to Arduino IDE.
   1. Check if you have DOIT ESP32 DEVKIT V1 as board.
   2. Check if you have COMX as port. (Mine is COM5).
   3. If all is properly connected, you'll see at the bottom bar that your board is connected on your selected port.
   4. Click the *Left Top Bar Arrow (Upload)* button to transfer your .ino code to the ESP32 dev board.
   5. Once uploading, your terminal will show 'Connecting...'. Click the 'boot' button on the ESP32 board, usually labeled as T00? Idfk. It's definitely NOT 'En'. It will fail if you click this while connecting. When 00x000... shows up, you can stop holding boot.
   6. You may be an idiot like me who thinks I should still wait after the message 'Hard Resetting via RTS pin'. No. There is nothing to wait for. It's done.
   7. Go to your Serial Monitor (Ctrl + Shift + M) > Set the baud from 9600 to 115200. If it's in 9600, you'll see no results or random ass words.
   8. Click 'EN' button on your ESP32 dev board. Now you should be able to see your ESP32 connecting to wi-fi, and then promptly updating results on your GSheets every 10 seconds. As reflected on your Serial Monitor.
   9. **Note:** If you have a .cpp file in the same directory as your .ino, Arduino would read all of it so you might encounter an error. Just remove the other unnecessary file and leave your main file (.ino).
5.  If you want a UI for this...
    1.  Go to Node-RED.
    2.  From the left side-bar, search for UI nodes. Preferably 'Gauge' and 'Chart'
        1.  Drag out 2 gauge node and a chart node.
        2.  Connect them accordingly to the Enrich + Route node.
            1.  The top wire = Temp
            2.  The mid wire = Humidity
            3.  The bottom wire = Temp + Humidity
        3.  Go to http://localhost/ui (Change 'localhost' your node-red server address and that's it)