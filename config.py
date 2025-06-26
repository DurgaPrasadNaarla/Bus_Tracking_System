# config.py

# Buses enabled for tracking (by serial number 1-83)
# Currently available buses (others in maintenance)
AVAILABLE_BUSES = {
    7: "Tadepalligudem",
    11: "Tadepalligudem", 
    12: "Tadepalligudem",
    24: "Tadepalligudem",
    41: "Tadepalligudem",
    68: "Tadepalligudem",
    83: "Tadepalligudem",

    15: "Tanuku",
    17: "Tanuku", 
    28: "Tanuku",

    72: "Velivennu",
    29: "Penugonda",

    75: "Eluru",
    78: "Eluru",

    9: "Rajahmundry",

    4: "Bhimavaram",
    34: "Bhimavaram",
    67: "Bhimavaram",

    69: "Nidadavole"
}

# District for each place
DISTRICT_MAP = {
    "Eluru": "Eluru",
    "Rajahmundry": "East Godavari",
    "Tadepalligudem": "West Godavari",
    "Tanuku": "West Godavari",
    "Velivennu": "West Godavari",
    "Penugonda": "West Godavari",
    "Bhimavaram": "West Godavari",
    "Nidadavole": "West Godavari"
}

# Construct routes per bus
ROUTES = {
    str(bus): {
        "route_name": f"{place} to SVEC",
        "district": DISTRICT_MAP[place],
        "bus_numbers": [str(bus)],
        "start_location": place,
        "end_location": "SVEC",
        "stops": []  # no stops for now
    }
    for bus, place in AVAILABLE_BUSES.items()
}

# District list for dropdowns/filters
DISTRICTS = sorted(set(DISTRICT_MAP.values()))

# Tracker limit
MAX_TRACKERS = 4

# Total bus count (1-83, but only available buses are active)
TOTAL_BUSES = 83
AVAILABLE_COUNT = len(AVAILABLE_BUSES)