#!/usr/bin/env python3
"""
Register Discovery Tool for Deye/Solarman
Scans common register ranges to find actual data
"""

import json
from pysolarmanv5 import PySolarmanV5

# Load configuration
with open('solarman-config.json', 'r') as f:
    config = json.load(f)

SOLARMAN_IP = config['solarman']['ip']
SOLARMAN_SERIAL = config['solarman']['serial']
SOLARMAN_PORT = config['solarman'].get('port', 8899)
SOLARMAN_MB_SLAVE_ID = config['solarman'].get('mb_slave_id', 1)

# Common register ranges for Deye inverters
REGISTER_RANGES = [
    (0, 100, "System Info"),
    (100, 200, "Low Range 100-200"),
    (200, 300, "Low Range 200-300"),
    (300, 400, "Low Range 300-400"),
    (400, 500, "Low Range 400-500"),
    (500, 600, "Medium Range 500-600"),
    (600, 700, "Medium Range 600-700"),
    (700, 800, "Medium Range 700-800"),
]

def to_signed(value):
    """Convert unsigned 16-bit value to signed"""
    if value > 32767:
        return value - 65536
    return value

def scan_registers():
    print(f"Connecting to Solarman at {SOLARMAN_IP}...")
    modbus = PySolarmanV5(
        SOLARMAN_IP,
        SOLARMAN_SERIAL,
        port=SOLARMAN_PORT,
        mb_slave_id=SOLARMAN_MB_SLAVE_ID,
        verbose=False
    )

    print("\nScanning registers for non-zero values...\n")

    for start, end, description in REGISTER_RANGES:
        print(f"\n=== {description} ({start}-{end}) ===")
        try:
            count = end - start
            data = modbus.read_holding_registers(start, count)

            for i, value in enumerate(data):
                if value != 0:
                    reg_addr = start + i
                    signed_val = to_signed(value)

                    # Show various interpretations
                    print(f"Register {reg_addr:4d}: "
                          f"raw={value:5d} (0x{value:04X}), "
                          f"signed={signed_val:6d}, "
                          f"×0.1={value*0.1:8.1f}, "
                          f"×0.01={value*0.01:8.2f}")

        except Exception as e:
            print(f"Error reading {description}: {e}")

    print("\n\nNow try reading some common single registers:")

    # Test specific common registers
    test_registers = {
        'Battery SOC': [184, 588],
        'Battery Voltage': [183, 587, 182],
        'PV1 Voltage': [109, 672],
        'PV1 Power': [186, 672],
        'Grid Voltage': [79, 598],
        'Load Power': [178, 653],
        'Daily Energy': [108, 502, 529],
    }

    for name, addrs in test_registers.items():
        print(f"\n{name}:")
        for addr in addrs:
            try:
                value = modbus.read_holding_registers(addr, 1)[0]
                if value != 0:
                    signed_val = to_signed(value)
                    print(f"  Reg {addr}: raw={value}, ×0.1={value*0.1:.1f}, ×0.01={value*0.01:.2f}, signed={signed_val}")
            except Exception as e:
                print(f"  Reg {addr}: Error - {e}")

if __name__ == "__main__":
    scan_registers()
