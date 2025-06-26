from flask import Flask, render_template, request, jsonify
from config import AVAILABLE_BUSES, DISTRICT_MAP, AVAILABLE_COUNT, TOTAL_BUSES
from flask_cors import CORS
import re
from flask_cors import CORS
import json
import os
from datetime import datetime, timedelta
import uuid

app = Flask(__name__)
CORS(app)

# In-memory storage for demo (replace with Firebase in production)
buses_data = {}
active_trackers = {}


import random

# Updated bus info with random number plates for 19 buses as per user request
all_buses = {}

# User's 19 buses with slno and location
bus_info_list = [
    (11, "Tadepalligudem"),
    (12, "Tadepalligudem"),
    (24, "Tadepalligudem"),
    (7,  "Tadepalligudem"),
    (83, "Tadepalligudem"),
    (41, "Tadepalligudem"),
    (68, "Tadepalligudem"),
    (15, "Tanuku"),
    (28, "Tanuku"),
    (17, "Tanuku"),
    (72, "Velivennu"),
    (29, "Penugonda"),
    (78, "Eluru"),
    (75, "Eluru"),
    (9,  "Rajahmundry"),
    (4,  "Bhimavaram"),
    (67, "Bhimavaram"),
    (34, "Bhimavaram"),
    (69, "Nidadavole"),
]

def generate_random_plate():
    # Generate random number plate like AP37XXNNNN (X=letter, N=number)
    letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    digits = "0123456789"
    plate = "AP37"
    plate += ''.join(random.choices(letters, k=2))
    plate += ''.join(random.choices(digits, k=4))
    return plate

for slno, location in bus_info_list:
    bus_num = generate_random_plate()
    all_buses[bus_num] = {
        "slno": slno,
        "bus_id": slno,
        "route_id": bus_num,
        "route_name": f"{location} Route",
        "current_location": location,
        "district": "Eluru" if location == "Eluru" else ("East Godavari" if location == "Rajahmundry" else "West Godavari"),
        "status": "stopped",
        "last_updated": datetime.now().isoformat(),
        "tracker_count": 0,
        "max_trackers": 4
    }

@app.route('/')
def home():
    return render_template('index.html')

@app.route("/api/buses_live")
def buses_live():
    return jsonify([
        {"bus_number": str(i), "current_lat": 16.71 + i*0.01, "current_lng": 81.09 + i*0.01,
         "trackers": i % 4 + 1, "last_crossed": "Tadepalligudem", "status": "tracking"}
        for i in range(1, 20)
    ])

@app.route("/chat", methods=["POST"])
def chat():
    data = request.get_json()
    msg = data.get("message", "").lower().strip()

    if not msg:
        return jsonify({"reply": "Please type something to begin."})

    # 🔍 Tracking
    if "track" in msg or "how to track" in msg or "find bus" in msg:
        return jsonify({"reply": "To track your bus, click the 'Track Bus' tab and enter your bus number or district."})

    # 🛣️ Routes
    if "routes" in msg or "which bus" in msg or "available buses" in msg:
        return jsonify({"reply": "Check the 'Routes' tab to see all buses by district and start location."})

    # 📊 Bus stats
    if "how many buses" in msg or "total buses" in msg:
        return jsonify({"reply": "We operate 83 buses in total. About 45 are active at a given time."})

    if "active" in msg or "available now" in msg or "currently running" in msg:
        return jsonify({"reply": "Currently, around 45 buses are active and available for tracking."})

    # 📍 Districts/areas served
    if "district" in msg or "areas covered" in msg:
        return jsonify({"reply": "We serve Eluru, West Godavari, East Godavari, Tadepalligudem, Bhimavaram, Tanuku, and more."})

    # 🎓 College
    if "college" in msg or "svec" in msg:
        return jsonify({"reply": "Sri Vasavi Engineering College (SVEC), Pedatadepalli, is the main destination of all bus routes."})

    # 📞 Contact
    if "contact" in msg or "phone" in msg or "reach" in msg or "who to contact" in msg:
        return jsonify({"reply": "You can contact the SVEC Transport Desk at 📞 08818-444627 or visit the office in Pedatadepalli TPG-2."})

    # 📦 Lost and found
    if "lost" in msg or "left item" in msg or "forget" in msg:
        return jsonify({"reply": "If you lost an item, please report it to the transport desk immediately at the SVEC campus."})

    # 💸 Fee info
    if "fee" in msg or "bus fee" in msg or "charges" in msg:
        return jsonify({"reply": "Bus fees vary based on location. Contact the accounts section or transport desk for details."})

    # 🕐 Timings
    if "timing" in msg or "when" in msg or "bus time" in msg:
        return jsonify({"reply": "Buses usually depart from their respective towns by 6:30 AM and leave college around 4:30 PM."})

    # 📅 Holidays/Sundays
    if "holiday" in msg or "sunday" in msg or "non working" in msg:
        return jsonify({"reply": "Buses do not run on general holidays or Sundays unless there is a special schedule."})

    # 🚨 Emergency
    if "emergency" in msg or "urgent" in msg:
        return jsonify({"reply": "In emergencies, contact the main office immediately at 📞 08818-444627."})

    # 💺 Bus facilities
    if "ac" in msg or "wifi" in msg or "features" in msg or "facilities" in msg:
        return jsonify({"reply": "Buses are well-maintained with proper seating and ventilation. No AC/WiFi currently provided."})

    # 🤝 General help
    if "help" in msg or "what can you do" in msg or "how to use" in msg:
        return jsonify({"reply": "I can help you with:\n• Tracking buses\n• Routes & availability\n• Contact info\n• Fees, timings, districts\n• Lost & found and more!"})

    # ❌ Fallback
    return jsonify({"reply": "Sorry, I didn’t understand that. Try asking about routes, tracking, contact, or buses."})

@app.route('/track')
def track():
    return render_template('track.html')

@app.route('/routes')
def routes():
    return render_template('routes.html')

@app.route('/api/buses')
def get_all_buses():
    # Return list of bus objects with slno and district info for frontend
    return jsonify(list(all_buses.values()))

@app.route('/api/bus/<bus_number>')
def get_bus_info(bus_number):
    if bus_number in all_buses:
        return jsonify(all_buses[bus_number])
    return jsonify({"error": "Bus not found"}), 404

@app.route('/api/routes')
def get_all_routes():
    # Return routes based on current all_buses
    routes = {}
    for bus_num, bus_info in all_buses.items():
        route_id = bus_info["route_id"]
        if route_id not in routes:
            routes[route_id] = {
                "route_name": bus_info["route_name"],
                "start_location": bus_info["current_location"],
                "end_location": "Sri Vasavi Engineering College, Pedatadepalli",
                "stops": [],
                "district": bus_info["district"],
                "bus_numbers": []
            }
        routes[route_id]["bus_numbers"].append(bus_num)
    return jsonify(routes)

@app.route('/api/routes/<district>')
def get_routes_by_district(district):
    # Return routes filtered by district based on current all_buses
    routes = {}
    for bus_num, bus_info in all_buses.items():
        if bus_info["district"].lower() == district.lower():
            route_id = bus_info["route_id"]
            if route_id not in routes:
                routes[route_id] = {
                    "route_name": bus_info["route_name"],
                    "start_location": bus_info["current_location"],
                    "end_location": "Sri Vasavi Engineering College, Pedatadepalli",
                    "stops": [],
                    "district": bus_info["district"],
                    "bus_numbers": []
                }
            routes[route_id]["bus_numbers"].append(bus_num)
    return jsonify(routes)

@app.route('/api/start_tracking', methods=['POST'])
def start_tracking():
    data = request.json
    bus_number = data.get('bus_number')
    tracker_id = str(uuid.uuid4())
    
    if bus_number not in all_buses:
        return jsonify({"error": "Bus not found"}), 404
    
    if all_buses[bus_number]["tracker_count"] >= all_buses[bus_number]["max_trackers"]:
        return jsonify({"error": "Maximum trackers reached for this bus"}), 400
    
    all_buses[bus_number]["tracker_count"] += 1
    all_buses[bus_number]["status"] = "tracking"
    all_buses[bus_number]["last_updated"] = datetime.now().isoformat()
    
    active_trackers[tracker_id] = {
        "bus_number": bus_number,
        "started_at": datetime.now().isoformat()
    }
    
    return jsonify({
        "success": True,
        "tracker_id": tracker_id,
        "message": f"Started tracking {bus_number}"
    })

@app.route('/api/stop_tracking', methods=['POST'])
def stop_tracking():
    data = request.json
    tracker_id = data.get('tracker_id')
    
    if tracker_id not in active_trackers:
        return jsonify({"error": "Invalid tracker ID"}), 404
    
    bus_number = active_trackers[tracker_id]["bus_number"]
    all_buses[bus_number]["tracker_count"] -= 1
    
    if all_buses[bus_number]["tracker_count"] == 0:
        all_buses[bus_number]["status"] = "stopped"
    
    del active_trackers[tracker_id]
    
    return jsonify({
        "success": True,
        "message": f"Stopped tracking {bus_number}"
    })

@app.route('/api/update_location', methods=['POST'])
def update_location():
    data = request.json
    tracker_id = data.get('tracker_id')
    latitude = data.get('latitude')
    longitude = data.get('longitude')
    
    if tracker_id not in active_trackers:
        return jsonify({"error": "Invalid tracker ID"}), 404
    
    bus_number = active_trackers[tracker_id]["bus_number"]
    all_buses[bus_number]["current_lat"] = latitude
    all_buses[bus_number]["current_lng"] = longitude
    all_buses[bus_number]["last_updated"] = datetime.now().isoformat()
    
    return jsonify({"success": True})

@app.route('/api/search')
def search_buses():
    query = request.args.get('q', '').lower()
    results = []
    
    # Check if query matches an area (district or location)
    areas = set()
    for bus_info in all_buses.values():
        areas.add(bus_info["district"].lower())
        areas.add(bus_info["current_location"].lower())
    
    if query in areas:
        # Return special response to indicate area navigation
        return jsonify({
            "navigate": True,
            "area": query
        })
    
    for bus_num, bus_info in all_buses.items():
        # Check if query matches bus serial number (slno) or plate number (bus_num)
        if (query == str(bus_info["slno"]).lower() or
            query in bus_num.lower() or 
            query in bus_info["route_name"].lower() or
            query in bus_info["current_location"].lower()):
            results.append({
                "bus_number": bus_num,
                "route_name": bus_info["route_name"],
                "current_location": bus_info["current_location"],
                "status": bus_info["status"]
            })
    
    if not results:
        # No match found
        return jsonify({
            "not_available": True
        })
    
    return jsonify(results)

@app.route('/api/stats')
def get_stats():
    total_buses = 83
    active_buses = len(all_buses)
    maintenance_buses = total_buses - active_buses
    available_buses = active_buses  # Assuming all active are available
    
    return jsonify({
        "total_buses": total_buses,
        "active_buses": active_buses,
        "available_buses": available_buses,
        "maintenance_buses": maintenance_buses
    })

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
