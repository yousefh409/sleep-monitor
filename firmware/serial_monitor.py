"""
Reads JSON lines from the Feather V2 over USB serial and pretty-prints them.

Usage:
  python3 serial_monitor.py                 # auto-detect Feather port
  python3 serial_monitor.py /dev/cu.usb...   # explicit port

Install once:
  pip install pyserial
"""
import sys
import time
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


def render(data: dict, port: str) -> None:
    sys.stdout.write("\033[2J\033[H")
    print(f"  Feather V2 sensor test    \033[2m{port}\033[0m")
    print()

    def row(label, key, unit=""):
        v = data.get(key)
        v_str = f"{v}" if v is not None else "–"
        if unit and v is not None:
            v_str += f" {unit}"
        print(f"  {label:<20} {v_str}")

    state_names = {0: "out", 1: "awake", 2: "light", 3: "deep"}
    sleep_state = data.get("sleep_state")
    state_label = state_names.get(sleep_state, "?")

    print("  \033[1mC1001 radar\033[0m")
    row("presence",        "presence")
    row("in bed",          "in_bed")
    print(f"  {'sleep state':<20} {sleep_state} ({state_label})")
    row("breathing",       "breathing", "bpm")
    row("heart rate",      "heart_rate", "bpm")
    row("turnover",        "turnover")
    row("body move large", "body_move_large", "%")
    row("body move small", "body_move_small", "%")
    row("apnea events",    "apnea_events")
    print()
    print("  \033[1mBME280\033[0m")
    row("temperature",     "temp_c", "°C")
    row("humidity",        "humidity", "%")
    row("pressure",        "pressure_hpa", "hPa")
    print()
    print("  \033[1mAudio + light\033[0m")
    row("dB SPL",          "db_spl", "dB")
    row("light (raw ADC)", "light_raw")
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
