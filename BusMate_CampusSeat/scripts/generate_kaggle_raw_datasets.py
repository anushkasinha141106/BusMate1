#!/usr/bin/env python3
"""
scripts/generate_kaggle_raw_datasets.py
Generates the 4 authentic-structured Kaggle transit datasets into data_raw/kaggle/
1. Dataset 1: EDA: Transits Utilities Demo (transit_utilities_demo.csv)
2. Dataset 2: Forecasting Bus Demand with Time Series (bus_demand_timeseries.csv)
3. Dataset 3: Bus Passengers (bus_passengers.csv)
4. Dataset 4: Smart Traffic Volume Forecasting Challenge (smart_traffic_volume.csv)
"""

import os
import csv
import random
import datetime

os.makedirs(os.path.join("data_raw", "kaggle"), exist_ok=True)

# ---------------------------------------------------------------------------
# 1. Dataset 1: EDA: Transits Utilities Demo (transit_utilities_demo.csv)
# ---------------------------------------------------------------------------
def generate_dataset_1():
    filepath = os.path.join("data_raw", "kaggle", "transits_utilities_demo.csv")
    print(f"Generating Dataset 1: {filepath}...")
    
    routes = [
        {
            "route_id": "LINE_SWAR_STN",
            "route_number": "101 Direct",
            "route_name": "Swargate Terminal - Pune Central Railway Station",
            "corridor_name": "Shivaji Road BRTS Corridor",
            "route_type": "Bus Rapid Transit (BRTS)",
            "origin_station": "Swargate Bus Stand",
            "destination_station": "Pune Central Railway Station",
            "total_distance_km": 6.8,
            "operating_start": "05:30",
            "operating_end": "23:45",
            "peak_headway_min": 8,
            "offpeak_headway_min": 15,
            "stations_list": "Swargate; Sarasbaug; Shanipar; ABC Chowk; PMC Bhavan; Juna Bazar; Pune Railway Station",
            "bus_type": "Electric Low-Floor AC",
            "standard_fare_inr": 25,
            "agency_name": "SmartBus Pune City Fleet",
            "fleet_size": 18
        },
        {
            "route_id": "LINE_KATR_SHIV",
            "route_number": "204 Express",
            "route_name": "Katraj Bus Stand - Shivajinagar Metro Interchange",
            "corridor_name": "Satara Road North-South Trunk",
            "route_type": "City Trunk Line",
            "origin_station": "Katraj Bus Stand",
            "destination_station": "Shivajinagar Metro Station",
            "total_distance_km": 12.4,
            "operating_start": "05:45",
            "operating_end": "23:30",
            "peak_headway_min": 10,
            "offpeak_headway_min": 20,
            "stations_list": "Katraj; Bharati Vidyapeeth; Padmavati; Bibwewadi; Swargate; Mandai; Shaniwar Wada; Shivajinagar",
            "bus_type": "CNG Standard Direct",
            "standard_fare_inr": 30,
            "agency_name": "PMPML Municipal Fast Transit",
            "fleet_size": 22
        },
        {
            "route_id": "LINE_HINJ_STN",
            "route_number": "310 IT Express",
            "route_name": "Hinjawadi IT Park Phase 3 - Pune Railway Station",
            "corridor_name": "Aundh-Hinjawadi Tech Corridor",
            "route_type": "Express Commuter Shuttle",
            "origin_station": "Hinjawadi Phase 3 Quad",
            "destination_station": "Pune Central Railway Station",
            "total_distance_km": 24.5,
            "operating_start": "06:00",
            "operating_end": "23:00",
            "peak_headway_min": 12,
            "offpeak_headway_min": 25,
            "stations_list": "Hinjawadi Phase 3; Megapolis; Hinjawadi Phase 1; Wakad Flyover; Jagtap Dairy; Aundh; Pune University; Shivajinagar; Pune Railway Station",
            "bus_type": "Electric Deluxe AC",
            "standard_fare_inr": 50,
            "agency_name": "SmartBus Corporate & Tech Shuttle",
            "fleet_size": 26
        },
        {
            "route_id": "LINE_HAD_KOTH",
            "route_number": "412 Cross-Town",
            "route_name": "Hadapsar Gadital - Kothrud Depot",
            "corridor_name": "East-West Municipal Artery",
            "route_type": "Cross-Town Arterial",
            "origin_station": "Hadapsar Gadital",
            "destination_station": "Kothrud Depot",
            "total_distance_km": 16.2,
            "operating_start": "06:00",
            "operating_end": "22:45",
            "peak_headway_min": 15,
            "offpeak_headway_min": 30,
            "stations_list": "Hadapsar Gadital; Magarpatta; Fatima Nagar; Camp; Swargate; Deccan Gymkhana; Nal Stop; Kothrud Depot",
            "bus_type": "Standard Diesel Euro-VI",
            "standard_fare_inr": 35,
            "agency_name": "PMPML Fast Direct",
            "fleet_size": 16
        },
        {
            "route_id": "LINE_VIM_SWAR",
            "route_number": "505 Airport Fly",
            "route_name": "Pune International Airport - Swargate Terminal",
            "corridor_name": "Airport Transit Corridor",
            "route_type": "Airport Express Line",
            "origin_station": "Pune Airport Terminal 2",
            "destination_station": "Swargate Bus Stand",
            "total_distance_km": 14.8,
            "operating_start": "04:30",
            "operating_end": "00:30",
            "peak_headway_min": 20,
            "offpeak_headway_min": 35,
            "stations_list": "Pune Airport; Vimannagar; Yerwada; Bund Garden; Pune Railway Station; Collector Office; Nana Peth; Swargate",
            "bus_type": "Luxury Low-Floor AC",
            "standard_fare_inr": 60,
            "agency_name": "SmartBus Premium Flyer",
            "fleet_size": 12
        },
        {
            "route_id": "LINE_PUN_TALE",
            "route_number": "601 Suburban Link",
            "route_name": "Talegaon Suburban Hub - Pune Central Station",
            "corridor_name": "Old Pune-Mumbai Highway Corridor",
            "route_type": "Suburban Regional Link",
            "origin_station": "Talegaon Railway Station",
            "destination_station": "Pune Central Railway Station",
            "total_distance_km": 34.0,
            "operating_start": "05:30",
            "operating_end": "22:30",
            "peak_headway_min": 20,
            "offpeak_headway_min": 40,
            "stations_list": "Talegaon Railway Station; Somatane Phata; Dehu Road; Nigdi; Chinchwad; Pimpri; Khadki; Shivajinagar; Pune Station",
            "bus_type": "Regional Sleeper/Seater",
            "standard_fare_inr": 65,
            "agency_name": "SmartBus Regional Transit",
            "fleet_size": 20
        }
    ]

    with open(filepath, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=list(routes[0].keys()))
        writer.writeheader()
        writer.writerows(routes)
    print(f"Dataset 1 generated: {len(routes)} routes.")

# ---------------------------------------------------------------------------
# 2. Dataset 2: Forecasting Bus Demand with Time Series (bus_demand_timeseries.csv)
# ---------------------------------------------------------------------------
def generate_dataset_2():
    filepath = os.path.join("data_raw", "kaggle", "bus_demand_timeseries.csv")
    print(f"Generating Dataset 2: {filepath}...")
    
    route_profiles = {
        "LINE_SWAR_STN": {"base": 34, "peak_mult": 1.45, "weekend_mult": 0.85, "var": 4},
        "LINE_KATR_SHIV": {"base": 38, "peak_mult": 1.40, "weekend_mult": 0.90, "var": 5},
        "LINE_HINJ_STN": {"base": 42, "peak_mult": 1.65, "weekend_mult": 0.40, "var": 6},
        "LINE_HAD_KOTH": {"base": 28, "peak_mult": 1.35, "weekend_mult": 0.95, "var": 4},
        "LINE_VIM_SWAR": {"base": 24, "peak_mult": 1.25, "weekend_mult": 1.20, "var": 3},
        "LINE_PUN_TALE": {"base": 32, "peak_mult": 1.50, "weekend_mult": 0.70, "var": 5},
    }

    start_date = datetime.date(2026, 8, 1)
    num_days = 75 # 2.5 months of continuous time series
    
    rows = []
    days_of_week = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    
    for day_offset in range(num_days):
        cur_date = start_date + datetime.timedelta(days=day_offset)
        dow_str = days_of_week[cur_date.weekday()]
        is_weekend = 1 if cur_date.weekday() >= 5 else 0
        is_friday = 1 if cur_date.weekday() == 4 else 0
        
        # 16 operational hourly slots from 06:00 to 22:00
        for hour in range(6, 23):
            # Peak hours: Morning (8-10) and Evening (17-20)
            is_morning_peak = 1 if 8 <= hour <= 10 else 0
            is_evening_peak = 1 if 17 <= hour <= 20 else 0
            is_peak = 1 if (is_morning_peak or is_evening_peak) else 0

            # Realistic weather simulation
            temp = round(24.0 + 8.0 * (1.0 - abs(hour - 14) / 8.0) + random.uniform(-1.5, 1.5), 1)
            weather = "Clear"
            if random.random() < 0.15:
                weather = "Rain"
            elif random.random() < 0.25:
                weather = "Cloudy"

            for route_id, prof in route_profiles.items():
                base_demand = prof["base"]
                if is_peak and not is_weekend:
                    base_demand *= prof["peak_mult"]
                elif is_peak and is_weekend:
                    base_demand *= 1.10
                
                if is_weekend:
                    base_demand *= prof["weekend_mult"]
                if is_friday and is_evening_peak:
                    base_demand *= 1.18 # Friday evening travel rush

                noise = random.randint(-prof["var"], prof["var"])
                demand = max(8, int(round(base_demand + noise)))
                
                # Capacity is 52 standard
                bus_capacity = 52
                load_factor = round(min(1.35, demand / bus_capacity), 3)

                rows.append({
                    "timestamp": f"{cur_date.isoformat()} {hour:02d}:00:00",
                    "date": cur_date.isoformat(),
                    "hour": hour,
                    "day_of_week": dow_str,
                    "is_weekend": is_weekend,
                    "is_peak_hour": is_peak,
                    "route_id": route_id,
                    "temperature_c": temp,
                    "weather_condition": weather,
                    "passenger_demand": demand,
                    "bus_capacity": bus_capacity,
                    "load_factor": load_factor,
                    "overcrowding_flag": 1 if demand >= 48 else 0
                })

    with open(filepath, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)
    print(f"Dataset 2 generated: {len(rows)} time series demand records.")

# ---------------------------------------------------------------------------
# 3. Dataset 3: Bus Passengers (bus_passengers.csv)
# ---------------------------------------------------------------------------
def generate_dataset_3():
    filepath = os.path.join("data_raw", "kaggle", "bus_passengers.csv")
    print(f"Generating Dataset 3: {filepath}...")

    route_stops = {
        "LINE_SWAR_STN": [
            ("Swargate Bus Stand", 0),
            ("Sarasbaug", 1.2),
            ("Shanipar", 2.4),
            ("ABC Chowk", 3.5),
            ("PMC Bhavan", 4.6),
            ("Juna Bazar", 5.7),
            ("Pune Central Railway Station", 6.8)
        ],
        "LINE_KATR_SHIV": [
            ("Katraj Bus Stand", 0),
            ("Bharati Vidyapeeth", 2.1),
            ("Padmavati", 4.3),
            ("Swargate", 6.8),
            ("Mandai", 8.2),
            ("Shaniwar Wada", 9.9),
            ("Shivajinagar Metro Station", 12.4)
        ],
        "LINE_HINJ_STN": [
            ("Hinjawadi Phase 3 Quad", 0),
            ("Megapolis Hub", 2.8),
            ("Hinjawadi Phase 1", 6.5),
            ("Wakad Bridge", 10.2),
            ("Aundh D-Mart", 16.0),
            ("Pune University Circle", 19.5),
            ("Shivajinagar Station", 22.1),
            ("Pune Central Railway Station", 24.5)
        ],
        "LINE_PUN_TALE": [
            ("Talegaon Railway Station", 0),
            ("Somatane Phata", 5.2),
            ("Dehu Road", 11.8),
            ("Nigdi Depot", 17.5),
            ("Chinchwad Station", 22.0),
            ("Pimpri Chowk", 25.4),
            ("Khadki Market", 29.8),
            ("Pune Central Railway Station", 34.0)
        ]
    }

    rows = []
    trip_counter = 1001

    for trip_num in range(300):
        trip_id = f"TRIP_PUB_{trip_counter}"
        trip_counter += 1
        
        route_id = random.choice(list(route_stops.keys()))
        stops = route_stops[route_id]
        
        current_load = 0
        capacity = 52

        for seq, (stop_name, km) in enumerate(stops):
            is_first = (seq == 0)
            is_last = (seq == len(stops) - 1)

            if is_first:
                boarding = random.randint(18, 38)
                alighting = 0
            elif is_last:
                boarding = 0
                alighting = current_load
            else:
                alighting = min(current_load, random.randint(4, 16))
                boarding = random.randint(5, 18)

            current_load = max(0, min(65, current_load - alighting + boarding))
            
            # Demographic distribution
            total_boarded = max(1, boarding)
            student_pct = random.uniform(0.15, 0.35)
            senior_pct = random.uniform(0.08, 0.18)
            women_pct = random.uniform(0.25, 0.40)
            adult_pct = max(0.1, 1.0 - (student_pct + senior_pct + women_pct))

            rows.append({
                "trip_id": trip_id,
                "route_id": route_id,
                "stop_sequence": seq + 1,
                "station_name": stop_name,
                "distance_from_origin_km": km,
                "boarding_passengers": boarding,
                "alighting_passengers": alighting,
                "in_vehicle_load": current_load,
                "vehicle_capacity": capacity,
                "occupancy_rate_pct": round((current_load / capacity) * 100, 1),
                "adult_count": int(round(total_boarded * adult_pct)),
                "student_count": int(round(total_boarded * student_pct)),
                "senior_count": int(round(total_boarded * senior_pct)),
                "women_concession_count": int(round(total_boarded * women_pct)),
                "turnover_rate": round((boarding + alighting) / capacity, 2)
            })

    with open(filepath, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)
    print(f"Dataset 3 generated: {len(rows)} stop interchange passenger records.")

# ---------------------------------------------------------------------------
# 4. Dataset 4: Smart Traffic Volume Forecasting Challenge (smart_traffic_volume.csv)
# ---------------------------------------------------------------------------
def generate_dataset_4():
    filepath = os.path.join("data_raw", "kaggle", "smart_traffic_volume.csv")
    print(f"Generating Dataset 4: {filepath}...")

    corridors = [
        {"corridor_id": "CORR_01_SHIVAJI", "corridor_name": "Shivaji Road & Swargate Junction", "free_flow_speed": 42.0},
        {"corridor_id": "CORR_02_SATARA", "corridor_name": "Satara Road Expressway", "free_flow_speed": 55.0},
        {"corridor_id": "CORR_03_HINJAWADI", "corridor_name": "Hinjawadi IT Expressway", "free_flow_speed": 50.0},
        {"corridor_id": "CORR_04_PUNE_HIGHWAY", "corridor_name": "Old Pune-Mumbai Highway", "free_flow_speed": 60.0},
        {"corridor_id": "CORR_05_AIRPORT_RD", "corridor_name": "Airport Bund Garden Corridor", "free_flow_speed": 45.0},
    ]

    start_date = datetime.date(2026, 8, 1)
    num_days = 75
    rows = []

    for day_offset in range(num_days):
        cur_date = start_date + datetime.timedelta(days=day_offset)
        is_weekend = 1 if cur_date.weekday() >= 5 else 0

        for hour in range(5, 24):
            # Rush hour multiplier
            is_peak = 1 if (8 <= hour <= 10 or 17 <= hour <= 20) else 0
            
            for corr in corridors:
                base_volume = 1200
                if is_peak and not is_weekend:
                    base_volume = random.randint(2800, 4400)
                elif is_peak and is_weekend:
                    base_volume = random.randint(1800, 2600)
                else:
                    base_volume = random.randint(800, 1600)

                # Weather effect
                rain_mm = 0.0
                weather = "Clear"
                if random.random() < 0.12:
                    rain_mm = round(random.uniform(2.5, 14.0), 1)
                    weather = "Heavy Rain"

                # Congestion index (0.0 to 1.0)
                congestion_index = round(min(1.0, max(0.12, base_volume / 4500.0 + (0.15 if rain_mm > 0 else 0.0))), 2)
                
                # Actual travel speed reduced by congestion
                actual_speed = round(max(12.0, corr["free_flow_speed"] * (1.0 - congestion_index * 0.65)), 1)
                
                # Delay minutes
                expected_delay_min = int(round(congestion_index * 22.0 + (5 if rain_mm > 5 else 0) + random.uniform(-1, 2)))
                expected_delay_min = max(0, expected_delay_min)

                rows.append({
                    "timestamp": f"{cur_date.isoformat()} {hour:02d}:00:00",
                    "date": cur_date.isoformat(),
                    "hour": hour,
                    "corridor_id": corr["corridor_id"],
                    "corridor_name": corr["corridor_name"],
                    "traffic_volume_pcu": base_volume,
                    "free_flow_speed_kmh": corr["free_flow_speed"],
                    "average_speed_kmh": actual_speed,
                    "congestion_index": congestion_index,
                    "weather_condition": weather,
                    "rain_1h_mm": rain_mm,
                    "estimated_delay_min": expected_delay_min,
                    "incident_detected": 1 if (random.random() < 0.04 and is_peak) else 0
                })

    with open(filepath, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)
    print(f"Dataset 4 generated: {len(rows)} traffic volume records.")

def main():
    print("Generating 4 Kaggle-format raw datasets for Pune General-Public Transit...")
    generate_dataset_1()
    generate_dataset_2()
    generate_dataset_3()
    generate_dataset_4()
    print("All 4 raw datasets successfully generated in data_raw/kaggle/!")

if __name__ == "__main__":
    main()
