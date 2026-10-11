"""Fetch 3 years of real hourly weather for the 3 deserts and save one small JSON per place.

Run:  python3 dashboard/tools/fetch_weather.py            (all places)
      python3 dashboard/tools/fetch_weather.py gobi       (one place)

Sources (free, no key):
  - Open-Meteo archive (ERA5 reanalysis): temperature, rain, snow, clouds, sunlight, wind, humidity,
    weather code.  https://archive-api.open-meteo.com/v1/archive
  - Open-Meteo air quality (CAMS): "dust", micrograms per m3 near the ground. It only exists from
    about mid 2022, so older hours stay null.  https://air-quality-api.open-meteo.com/v1/air-quality

Output: dashboard/data/weather/<id>.json. To keep the files small every value is stored as an
integer. Real value = stored value / scale (scales are written in the file under "scale").
Hour i is at start + i * step_s (start is UTC). Missing hours are null.
Standard library only, so it runs anywhere with Python 3.
"""
import datetime as dt
import json
import pathlib
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

OUT = pathlib.Path(__file__).resolve().parent.parent / "data" / "weather"
ARCHIVE = "https://archive-api.open-meteo.com/v1/archive"
AIR = "https://air-quality-api.open-meteo.com/v1/air-quality"
START, END = dt.date(2023, 1, 1), dt.date(2025, 12, 31)

PLACES = {
    "cholistan": {"name": "Cholistan Desert, near Bahawalpur", "lat": 29.0, "lon": 71.9},
    "thar": {"name": "Thar Desert, near Jaisalmer", "lat": 26.9, "lon": 70.9},
    "gobi": {"name": "Gobi Desert, near Dalanzadgad", "lat": 43.6, "lon": 104.4},
}

# short name in the file: (Open-Meteo variable, scale, unit of the real value)
FIELDS = {
    "temp": ("temperature_2m", 10, "C"),
    "precip": ("precipitation", 10, "mm per h"),
    "rain": ("rain", 10, "mm per h"),
    "snow": ("snowfall", 100, "cm per h"),
    "cloud": ("cloud_cover", 1, "%"),
    "ghi": ("shortwave_radiation", 1, "W per m2"),
    "dir": ("direct_radiation", 1, "W per m2 on flat ground"),
    "dhi": ("diffuse_radiation", 1, "W per m2"),
    "dni": ("direct_normal_irradiance", 1, "W per m2 facing the sun"),
    "wind": ("wind_speed_10m", 10, "km per h"),
    "gust": ("wind_gusts_10m", 10, "km per h"),
    "wdir": ("wind_direction_10m", 1, "compass deg, where the wind comes from"),
    "rh": ("relative_humidity_2m", 1, "%"),
    "code": ("weather_code", 1, "WMO code"),
}
DUST_SCALE = 1


def get_json(url, params, tries=4):
    """GET with a few polite retries (waits longer each time)."""
    full = url + "?" + urllib.parse.urlencode(params)
    for attempt in range(tries):
        try:
            req = urllib.request.Request(full, headers={"User-Agent": "solar-tracker-demo/1.0"})
            with urllib.request.urlopen(req, timeout=120) as r:
                return json.loads(r.read().decode("utf-8"))
        except (urllib.error.URLError, TimeoutError) as e:
            wait = 5 * (attempt + 1)
            print(f"    request failed ({e}), retry in {wait} s")
            time.sleep(wait)
    raise RuntimeError(f"giving up on {url}")


def chunks(months):
    """Date ranges of a few months each, covering START..END."""
    a = START
    while a <= END:
        m = a.month - 1 + months
        b = dt.date(a.year + m // 12, m % 12 + 1, 1) - dt.timedelta(days=1)
        yield a, min(b, END)
        a = b + dt.timedelta(days=1)


def fetch_series(url, place, hourly, months):
    """Fetch every chunk and join them into {local time string: {var: value}} plus the meta."""
    rows, meta = {}, None
    for a, b in chunks(months):
        print(f"    {a} to {b}")
        data = get_json(url, {
            "latitude": place["lat"], "longitude": place["lon"], "start_date": a.isoformat(),
            "end_date": b.isoformat(), "hourly": ",".join(hourly), "timezone": "auto"})
        if "hourly" not in data:
            print(f"    no data: {data.get('reason', data)}")
            continue
        meta = meta or data
        h = data["hourly"]
        for i, t in enumerate(h["time"]):
            rows.setdefault(t, {}).update({v: h[v][i] for v in hourly if v in h})
        time.sleep(1.0)
    return rows, meta


def pack(values, scale):
    return [None if v is None else int(round(v * scale)) for v in values]


def build(pid):
    place = PLACES[pid]
    print(f"{pid}: weather")
    wx, meta = fetch_series(ARCHIVE, place, [f[0] for f in FIELDS.values()], 12)
    print(f"{pid}: dust")
    try:
        dust, _ = fetch_series(AIR, place, ["dust"], 3)
    except RuntimeError as e:
        print(f"    dust skipped: {e}")
        dust = {}
    off = meta["utc_offset_seconds"]
    local0 = dt.datetime.combine(START, dt.time())
    n = int((dt.datetime.combine(END, dt.time()) - local0).total_seconds() // 3600) + 24
    times = [(local0 + dt.timedelta(hours=i)).strftime("%Y-%m-%dT%H:%M") for i in range(n)]
    out = {
        "id": pid, "name": place["name"], "source": "Open-Meteo archive (ERA5) and air quality (CAMS dust)",
        "lat": place["lat"], "lon": place["lon"], "elevation": meta.get("elevation"),
        "tz": meta["timezone"], "utc_offset_s": off,
        "start": (local0 - dt.timedelta(seconds=off)).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "start_local": times[0], "step_s": 3600, "n": n,
        "note": "real value = stored value / scale; null = missing",
        "scale": {k: f[1] for k, f in FIELDS.items()} | {"dust": DUST_SCALE},
        "units": {k: f[2] for k, f in FIELDS.items()} | {"dust": "micrograms per m3 (CAMS, near the ground)"},
    }
    for k, (var, scale, _) in FIELDS.items():
        out[k] = pack([wx.get(t, {}).get(var) for t in times], scale)
    out["dust"] = pack([dust.get(t, {}).get("dust") for t in times], DUST_SCALE)
    OUT.mkdir(parents=True, exist_ok=True)
    path = OUT / f"{pid}.json"
    path.write_text(json.dumps(out, separators=(",", ":")))
    have = {k: sum(v is not None for v in out[k]) / n for k in list(FIELDS) + ["dust"]}
    print(f"{pid}: {path.stat().st_size / 1e6:.2f} MB, {n} hours, coverage "
          + ", ".join(f"{k} {100 * c:.0f}%" for k, c in have.items()))


if __name__ == "__main__":
    for pid in (sys.argv[1:] or list(PLACES)):
        build(pid)
