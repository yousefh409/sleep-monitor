"""
Reads JSON lines from the Feather V2 over USB serial and pretty-prints them.

Usage:
  python3 serial_monitor.py                 # auto-detect Feather port
  python3 serial_monitor.py /dev/cu.usb...   # explicit port

Install once:
  pip install pyserial
"""
import sys
import glob
import json
import serial


def find_port() -> str:
    candidates = (
        glob.glob("/dev/cu.usbserial-*")
        + glob.glob("/dev/cu.SLAB_USBtoUART*")
        + glob.glob("/dev/cu.usbmodem*")
        + glob.glob("/dev/ttyUSB*")
        + glob.glob("/dev/ttyACM*")
    )
    if not candidates:
        sys.exit("No serial port found. Plug in the Feather and retry, or pass a path.")
    return candidates[0]


SLEEP_STATES = {0: "deep", 1: "light", 2: "awake", 3: "none"}
BREATH_STATES = {1: "normal", 2: "too fast", 3: "too slow", 4: "none"}


def render(data: dict, port: str) -> None:
    sys.stdout.write("\033[2J\033[H")
    print(f"  Feather V2 sensor test    \033[2m{port}\033[0m")
    print()

    def row(label, key, unit="", lookup=None):
        v = data.get(key)
        if v is None:
            v_str = "–"
        elif lookup is not None:
            v_str = f"{v} ({lookup.get(v, '?')})"
        else:
            v_str = f"{v}"
            if unit:
                v_str += f" {unit}"
        print(f"  {label:<22} {v_str}")

    def section(name):
        print(f"  \033[1m{name}\033[0m")

    section("C1001 — composite")
    row("presence",         "presence")
    row("in bed",           "in_bed")
    row("sleep state",      "sleep_state", lookup=SLEEP_STATES)
    row("breathing (avg)",  "breathing", "bpm")
    row("heart rate (avg)", "heart_rate", "bpm")
    row("turnover",         "turnover")
    row("body move large",  "body_move_large", "%")
    row("body move small",  "body_move_small", "%")
    row("apnea events",     "apnea_events")
    print()

    section("C1001 — human data (low-level)")
    row("hum presence",     "hum_presence")
    row("hum motion",       "hum_motion")
    row("hum range",        "hum_range")
    row("distance",         "hum_dist_cm", "cm")
    print()

    section("C1001 — instant vitals")
    row("hr instant",       "hr_instant", "bpm")
    row("breath state",     "breath_state", lookup=BREATH_STATES)
    row("breath value",     "breath_value")
    print()

    section("C1001 — bed-state queries")
    row("wake duration",    "wake_dur")
    row("light sleep dur",  "light_sleep_dur")
    row("deep sleep dur",   "deep_sleep_dur")
    row("sleep quality",    "sleep_quality")
    row("disturbances",     "disturbances")
    row("quality rating",   "quality_rating")
    row("abnormal struggle", "abnormal_struggle")
    row("unattended state", "unattended_state")
    row("unattended time",  "unattended_time")
    print()

    section("C1001 — session statistics")
    row("sleep score",      "sleep_score", "/100")
    row("sleep time",       "sleep_time_min", "min")
    row("shallow %",        "shallow_pct", "%")
    row("deep %",           "deep_pct", "%")
    row("time out of bed",  "time_out_of_bed", "min")
    row("exit count",       "exit_count")
    row("turnover total",   "turnover_total")
    print()

    section("BME680")
    row("temperature",      "temp_c", "°C")
    row("humidity",         "humidity", "%")
    row("pressure",         "pressure_hpa", "hPa")
    row("gas resistance",   "gas_ohm", "Ω")
    print()

    section("Audio + light")
    row("dB SPL",           "db_spl", "dB")
    row("light (raw ADC)",  "light_raw")
    print()

    print(f"  \033[2muptime: {data.get('t', 0)}s\033[0m")


def main() -> None:
    port = sys.argv[1] if len(sys.argv) > 1 else find_port()
    print(f"Opening {port} @ 115200...")
    with serial.Serial(port, 115200, timeout=2) as s:
        while True:
            line = s.readline().decode(errors="replace").strip()
            if not line:
                continue
            try:
                data = json.loads(line)
                if isinstance(data, dict):
                    render(data, port)
            except json.JSONDecodeError:
                print(f"  \033[2m{line}\033[0m")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit(0)
