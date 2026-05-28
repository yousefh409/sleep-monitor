import mqtt from "mqtt";

const url = `mqtts://${process.env.HIVEMQ_URL}:${process.env.HIVEMQ_PORT ?? 8883}`;
const topic = process.env.MQTT_TOPIC ?? "yousef/sleep01/telemetry";

const client = mqtt.connect(url, {
  username: process.env.HIVEMQ_USER,
  password: process.env.HIVEMQ_PASSWORD,
});

client.on("connect", () => {
  const payload = {
    t: Math.floor(Date.now() / 1000),
    dev: "sleep01",
    presence: 1,
    in_bed: 1,
    sleep_state: 2,
    breathing: 16,
    heart_rate: 62,
    turnover: 0,
    body_move_large: 1,
    body_move_small: 3,
    apnea_events: 0,
    temp_c: 22.1,
    humidity: 45.2,
    pressure_hpa: 1013.2,
    db_spl: 32.5,
    light_raw: 245,
  };
  client.publish(topic, JSON.stringify(payload), { qos: 1 }, (err) => {
    if (err) console.error("pub error:", err);
    else console.log("published:", payload);
    client.end();
  });
});

client.on("error", (e) => {
  console.error("client error:", e);
  process.exit(1);
});
