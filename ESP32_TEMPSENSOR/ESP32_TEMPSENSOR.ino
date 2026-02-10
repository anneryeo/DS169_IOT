#include <WiFi.h>
#include <PubSubClient.h>
#include "DHT.h"

#define DHTPIN 4
#define DHTTYPE DHT11

const char* ssid = "ABC"; //change x (ssid) to name of wifi network
const char* password = "123"; // change x (password) to password of wifi network
const char* mqtt_server = "123"; //change x (mqtt_server) to ipv4 address of wifi network

WiFiClient espClient;
PubSubClient client(espClient);
DHT dht(DHTPIN, DHTTYPE);

void setup_wifi() {
  Serial.print("Connecting to ");
  Serial.println(ssid);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi connected");
}

void reconnect() {
  while (!client.connected()) {
    Serial.print("Attempting MQTT connection...");
    // It's better to give the ESP32 a unique ID
    if (client.connect("ESP32_DHT_Sensor")) {
      Serial.println("connected");
    } else {
      Serial.print("failed, rc=");
      Serial.print(client.state());
      Serial.println(" try again in 5 seconds");
      delay(5000);
    }
  }
}

void setup() {
  Serial.begin(115200);
  dht.begin();
  setup_wifi();
  client.setServer(mqtt_server, 1883); 
}

void loop() {
  if (!client.connected()) reconnect();
  client.loop();

  float h = dht.readHumidity();
  float t = dht.readTemperature();

  // Check if any reads failed and exit early (to try again).
  if (isnan(h) || isnan(t)) {
    Serial.println("Failed to read from DHT sensor!");
    delay(2000);
    return;
  }

  char payload[64];
  // Using JSON format is great for Node-RED's "json" node
  snprintf(payload, sizeof(payload), "{\"temp\": %.1f, \"hum\": %.1f}", t, h);
  
  Serial.print("Publishing: ");
  Serial.println(payload);
  client.publish("esp32/dht11", payload);

  delay(10000); // 10 seconds is usually enough for room monitoring
}