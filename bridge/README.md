# Deye Solarman Bridge Setup

## Installation

1. Create a Python virtual environment:
```bash
cd bridge
python3 -m venv venv
```

2. Activate the virtual environment:
```bash
source venv/bin/activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Create configuration file:
```bash
cp solarman-config.json.sample solarman-config.json
```

5. Edit `solarman-config.json` with your settings:
   - Solarman logger IP address
   - Solarman logger serial number (found on the device or app)
   - MQTT broker settings (same as your existing setup)

## Running the Bridge

1. Activate the virtual environment (if not already activated):
```bash
cd bridge
source venv/bin/activate
```

2. Run the bridge:
```bash
python deye-solarman-bridge.py
```

## Running as a Service

To keep the bridge running permanently, you can create a systemd service or use a process manager like PM2.

## Deactivating the Virtual Environment

When you're done:
```bash
deactivate
```
