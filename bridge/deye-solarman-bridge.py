#!/usr/bin/env python3
"""
Deye Solarman Bridge
Reads inverter data from Solarman logger and publishes to MQTT
Replaces the Axpert inverter bridge functionality
"""

import json
import time
import logging
from datetime import datetime
from pysolarmanv5 import PySolarmanV5
import paho.mqtt.client as mqtt

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Load configuration
with open('solarman-config.json', 'r') as f:
    config = json.load(f)

# Solarman configuration
SOLARMAN_IP = config['solarman']['ip']
SOLARMAN_SERIAL = config['solarman']['serial']
SOLARMAN_PORT = config['solarman'].get('port', 8899)
SOLARMAN_MB_SLAVE_ID = config['solarman'].get('mb_slave_id', 1)

# MQTT configuration
MQTT_BROKER = config['mqtt']['server']
MQTT_PORT = config['mqtt']['port']
MQTT_USERNAME = config['mqtt'].get('username', '')
MQTT_PASSWORD = config['mqtt'].get('password', '')
MQTT_TOPIC = config['mqtt'].get('topic', '/solar')
PUBLISH_INTERVAL = config.get('publishStatusSeconds', 30)

# Deye inverter register addresses (discovered via register scan)
# Inverter: Single phase LV Hybrid with 3 strings, 16kW Deye
REGISTER_MAP = {
    # DC PV Input (3 strings)
    'pv1_voltage': 109,       # PV1 Voltage (0.1V)
    'pv1_current': 110,       # PV1 Current (0.01A)
    'pv1_power': 186,         # PV1 Power (W)
    'pv2_voltage': 111,       # PV2 Voltage (0.1V)
    'pv2_current': 112,       # PV2 Current (0.01A)
    'pv2_power': 187,         # PV2 Power (W)
    'pv3_voltage': 113,       # PV3 Voltage (0.1V)
    'pv3_current': 114,       # PV3 Current (0.01A)
    'pv3_power': 188,         # PV3 Power (W)

    # Battery
    'battery_voltage': 183,   # Battery Voltage (0.01V)
    'battery_current': 191,   # Battery Current (0.01A, signed)
    'battery_power': 190,     # Battery Power (W, signed)
    'battery_soc': 184,       # Battery SOC (%)
    'battery_temp': 328,      # Battery Temperature (0.1°C)

    # Grid (estimates - may need adjustment)
    'grid_voltage': 150,      # Grid Voltage (0.1V)
    'grid_current': 164,      # Grid Current (0.01A)
    'grid_power': 169,        # Grid Power (W, signed)
    'grid_frequency': 79,     # Grid Frequency (0.01Hz)

    # Load/Output
    'load_power': 178,        # Load Power (W)
    'load_voltage': 176,      # Load Voltage (0.1V)

    # Inverter Status
    'inverter_temp': 90,      # Inverter Temperature (0.1°C)
    'daily_energy': 108,      # Today's Generation (0.1kWh)
    'total_energy': 96,       # Total Generation (0.1kWh)
}


class SolarmanBridge:
    def __init__(self):
        self.modbus = None
        self.mqtt_client = None
        self.setup_solarman()
        self.setup_mqtt()

    def setup_solarman(self):
        """Initialize Solarman connection"""
        try:
            self.modbus = PySolarmanV5(
                SOLARMAN_IP,
                SOLARMAN_SERIAL,
                port=SOLARMAN_PORT,
                mb_slave_id=SOLARMAN_MB_SLAVE_ID,
                verbose=False
            )
            logger.info(f"Connected to Solarman at {SOLARMAN_IP}:{SOLARMAN_PORT}")
        except Exception as e:
            logger.error(f"Failed to initialize Solarman connection: {e}")
            raise

    def setup_mqtt(self):
        """Initialize MQTT connection"""
        if not MQTT_USERNAME:
            logger.warning("No MQTT username configured, skipping MQTT setup")
            return

        self.mqtt_client = mqtt.Client()

        if MQTT_USERNAME and MQTT_PASSWORD:
            self.mqtt_client.username_pw_set(MQTT_USERNAME, MQTT_PASSWORD)

        self.mqtt_client.on_connect = self.on_mqtt_connect
        self.mqtt_client.on_disconnect = self.on_mqtt_disconnect

        try:
            logger.info(f"Connecting to MQTT broker {MQTT_BROKER}:{MQTT_PORT}")
            self.mqtt_client.connect(MQTT_BROKER, MQTT_PORT, 60)
            self.mqtt_client.loop_start()
        except Exception as e:
            logger.error(f"Failed to connect to MQTT: {e}")
            raise

    def on_mqtt_connect(self, client, userdata, flags, rc):
        if rc == 0:
            logger.info("Connected to MQTT broker")
        else:
            logger.error(f"MQTT connection failed with code {rc}")

    def on_mqtt_disconnect(self, client, userdata, rc):
        logger.warning(f"Disconnected from MQTT broker with code {rc}")

    def read_registers(self, start_address, count):
        """Read modbus registers from Solarman"""
        try:
            return self.modbus.read_holding_registers(start_address, count)
        except Exception as e:
            logger.error(f"Error reading registers {start_address}-{start_address+count}: {e}")
            return None

    def get_inverter_data(self):
        """Read all inverter data and format it"""
        data = {}

        try:
            # Read PV data (registers 109-114 covers all 3 strings)
            pv_data = self.read_registers(109, 6)
            if pv_data:
                data['pv1_voltage'] = pv_data[0] * 0.1
                data['pv1_current'] = pv_data[1] * 0.01
                data['pv2_voltage'] = pv_data[2] * 0.1
                data['pv2_current'] = pv_data[3] * 0.01
                data['pv3_voltage'] = pv_data[4] * 0.1
                data['pv3_current'] = pv_data[5] * 0.01

            # Read PV power (registers 186-188)
            pv_power_data = self.read_registers(186, 3)
            if pv_power_data:
                data['pv1_power'] = pv_power_data[0]
                data['pv2_power'] = pv_power_data[1]
                data['pv3_power'] = pv_power_data[2]

            # Read battery data (registers 183-184)
            battery_data = self.read_registers(183, 2)
            if battery_data:
                data['battery_voltage'] = battery_data[0] * 0.01
                data['battery_soc'] = battery_data[1]

            # Read battery temperature (register 328)
            battery_temp = self.read_registers(328, 1)
            if battery_temp:
                data['battery_temp'] = battery_temp[0] * 0.1

            # Read battery current and power (registers 190-191)
            battery_power_data = self.read_registers(190, 2)
            if battery_power_data:
                data['battery_power'] = self.to_signed(battery_power_data[0])
                data['battery_current'] = self.to_signed(battery_power_data[1]) * 0.01

            # Read load data (registers 176, 178)
            load_voltage = self.read_registers(176, 1)
            if load_voltage:
                data['load_voltage'] = load_voltage[0] * 0.1

            load_power = self.read_registers(178, 1)
            if load_power:
                data['load_power'] = load_power[0] * 10  # Register stores in 10W units

            # Read grid data
            grid_voltage = self.read_registers(150, 1)
            if grid_voltage:
                data['grid_voltage'] = grid_voltage[0] * 0.1

            grid_current = self.read_registers(164, 1)
            if grid_current:
                data['grid_current'] = grid_current[0] * 0.01

            grid_power = self.read_registers(169, 1)
            if grid_power:
                data['grid_power'] = self.to_signed(grid_power[0])

            grid_frequency = self.read_registers(79, 1)
            if grid_frequency:
                data['grid_frequency'] = grid_frequency[0] * 0.01

            # Read energy data
            daily_energy = self.read_registers(108, 1)
            if daily_energy:
                data['daily_energy'] = daily_energy[0] * 0.1

            total_energy = self.read_registers(96, 1)
            if total_energy:
                data['total_energy'] = total_energy[0] * 0.1

            # Read inverter temperature
            inverter_temp = self.read_registers(90, 1)
            if inverter_temp:
                data['inverter_temp'] = inverter_temp[0] * 0.1

            # Calculate total PV input (all 3 strings)
            data['pv_input_voltage'] = max(
                data.get('pv1_voltage', 0),
                data.get('pv2_voltage', 0),
                data.get('pv3_voltage', 0)
            )
            data['pv_input_current'] = (
                data.get('pv1_current', 0) +
                data.get('pv2_current', 0) +
                data.get('pv3_current', 0)
            )
            data['pv_input_power'] = (
                data.get('pv1_power', 0) +
                data.get('pv2_power', 0) +
                data.get('pv3_power', 0)
            )

            return data

        except Exception as e:
            logger.error(f"Error getting inverter data: {e}")
            return None

    def to_signed(self, value):
        """Convert unsigned 16-bit value to signed"""
        if value > 32767:
            return value - 65536
        return value

    def format_status(self, data):
        """Format data to match Axpert format for compatibility"""
        return {
            'type': 'deye-solarman',
            'time': datetime.now().isoformat(),

            # Grid input
            'gridVoltage': round(data.get('grid_voltage', 0), 1),
            'gridFrequency': round(data.get('grid_frequency', 0), 2),

            # AC Output (for compatibility, using load values)
            'acOutputVoltage': round(data.get('load_voltage', 0), 1),
            'acOutputFrequency': round(data.get('grid_frequency', 0), 2),
            'acOutputApparentPower': int(data.get('load_power', 0)),
            'acOutputActivePower': int(data.get('load_power', 0)),
            'outputLoadPercent': 0,  # Calculate if needed

            # Battery
            'batteryVoltage': round(data.get('battery_voltage', 0), 2),
            'batteryChargingCurrent': round(data.get('battery_current', 0), 2),
            'batteryCapacity': int(data.get('battery_soc', 0)),
            'batteryTemp': round(data.get('battery_temp', 0), 1),

            # PV Input (3 strings)
            'pvInputVoltage': round(data.get('pv_input_voltage', 0), 1),
            'pvInputCurrent': round(data.get('pv_input_current', 0), 2),
            'pvInputPower': int(data.get('pv_input_power', 0)),
            'pv1Voltage': round(data.get('pv1_voltage', 0), 1),
            'pv1Current': round(data.get('pv1_current', 0), 2),
            'pv1Power': int(data.get('pv1_power', 0)),
            'pv2Voltage': round(data.get('pv2_voltage', 0), 1),
            'pv2Current': round(data.get('pv2_current', 0), 2),
            'pv2Power': int(data.get('pv2_power', 0)),
            'pv3Voltage': round(data.get('pv3_voltage', 0), 1),
            'pv3Current': round(data.get('pv3_current', 0), 2),
            'pv3Power': int(data.get('pv3_power', 0)),

            # Grid
            'gridPower': int(data.get('grid_power', 0)),
            'gridCurrent': round(data.get('grid_current', 0), 2),

            # Load
            'loadPower': int(data.get('load_power', 0)),

            # Energy
            'dailyEnergy': round(data.get('daily_energy', 0), 1),
            'totalEnergy': round(data.get('total_energy', 0), 1),

            # Temperature
            'inverterTemp': round(data.get('inverter_temp', 0), 1),

            # Raw data for debugging
            'raw': data
        }

    def publish_status(self):
        """Read inverter data and publish to MQTT"""
        logger.info("Reading inverter data...")

        try:
            data = self.get_inverter_data()
            if data is None:
                logger.error("Failed to read inverter data")
                return

            status = self.format_status(data)
            logger.info(f"Status: {json.dumps(status, indent=2)}")

            if self.mqtt_client:
                payload = json.dumps(status)
                self.mqtt_client.publish(MQTT_TOPIC, payload)
                logger.info(f"Published to {MQTT_TOPIC}")
            else:
                logger.warning("MQTT client not configured")

        except Exception as e:
            logger.error(f"Error in publish_status: {e}")

    def run(self):
        """Main loop"""
        logger.info(f"Starting Solarman bridge, polling every {PUBLISH_INTERVAL} seconds")

        # Publish immediately on startup
        self.publish_status()

        # Then poll at regular intervals
        while True:
            try:
                time.sleep(PUBLISH_INTERVAL)
                self.publish_status()
            except KeyboardInterrupt:
                logger.info("Shutting down...")
                break
            except Exception as e:
                logger.error(f"Error in main loop: {e}")
                time.sleep(5)  # Wait before retrying


if __name__ == "__main__":
    bridge = SolarmanBridge()
    bridge.run()
