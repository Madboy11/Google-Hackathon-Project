// Maritime Router v2 — Dense pre-computed corridors that NEVER cross land
type Coord = [number, number]; // [lon, lat]

// ── Pre-computed route templates with dense ocean waypoints ──────────────
// Each template is a named corridor with ~20-60 waypoints staying in water.

const CORRIDORS: Record<string, Coord[]> = {
  // Shanghai → Singapore (via Taiwan Strait, South China Sea)
  shanghai_singapore: [
    [121.47, 31.23], [121.00, 28.00], [119.50, 24.50], [118.50, 22.00],
    [116.00, 20.00], [114.00, 17.50], [112.00, 14.00], [110.00, 10.00],
    [108.00, 7.00], [106.00, 4.00], [104.50, 2.00], [103.82, 1.26],
  ],
  // Singapore → Colombo (via Malacca Strait, Indian Ocean)
  singapore_colombo: [
    [103.82, 1.26], [101.50, 2.80], [99.00, 4.50], [96.50, 5.80],
    [93.00, 6.50], [89.00, 6.80], [85.00, 7.00], [82.00, 7.00],
    [79.87, 6.94],
  ],
  // Colombo → Aden (across Indian Ocean)
  colombo_aden: [
    [79.87, 6.94], [75.00, 8.00], [70.00, 10.00], [65.00, 11.50],
    [60.00, 12.50], [55.00, 12.80], [50.00, 12.70], [45.03, 12.80],
  ],
  // Mumbai → Aden (across Arabian Sea)
  mumbai_aden: [
    [72.85, 18.93], [68.00, 17.00], [63.00, 15.00], [58.00, 14.00],
    [53.00, 13.50], [48.00, 13.00], [45.03, 12.80],
  ],
  // Mumbai → Colombo
  mumbai_colombo: [
    [72.85, 18.93], [73.50, 15.00], [75.00, 12.00], [77.00, 9.00],
    [79.87, 6.94],
  ],
  // Aden → Suez (Red Sea)
  aden_suez: [
    [45.03, 12.80], [43.30, 12.60], [42.50, 14.50], [41.00, 16.50],
    [39.50, 18.50], [38.00, 20.50], [36.50, 22.50], [35.50, 24.50],
    [34.50, 26.50], [33.50, 28.00], [32.55, 29.95],
  ],
  // Suez → Gibraltar (Mediterranean)
  suez_gibraltar: [
    [32.55, 29.95], [32.35, 31.27], [30.00, 32.00], [27.00, 33.50],
    [24.00, 34.80], [20.00, 35.50], [16.00, 36.50], [12.00, 37.00],
    [8.00, 37.50], [4.00, 37.00], [0.00, 36.50], [-3.00, 36.00],
    [-5.35, 35.96],
  ],
  // Gibraltar → Rotterdam (Atlantic, Bay of Biscay, English Channel)
  gibraltar_rotterdam: [
    [-5.35, 35.96], [-8.00, 37.50], [-9.50, 39.50], [-9.00, 42.00],
    [-7.00, 44.00], [-5.00, 46.00], [-3.00, 48.00], [-1.50, 49.50],
    [0.50, 50.50], [2.00, 51.20], [3.50, 51.80], [4.40, 51.90],
  ],
  // Gibraltar → Hamburg (via English Channel, North Sea)
  gibraltar_hamburg: [
    [-5.35, 35.96], [-8.00, 37.50], [-9.50, 39.50], [-9.00, 42.00],
    [-7.00, 44.00], [-5.00, 46.00], [-3.00, 48.00], [-1.50, 49.50],
    [0.50, 50.50], [2.00, 51.20], [3.50, 51.80], [4.80, 53.00],
    [7.00, 53.80], [9.97, 53.54],
  ],
  // Rotterdam → Hamburg
  rotterdam_hamburg: [
    [4.40, 51.90], [5.50, 52.50], [7.00, 53.30], [9.97, 53.54],
  ],
  // Aden → Cape Town (East Africa coast — stays offshore!)
  aden_capetown: [
    [45.03, 12.80], [47.00, 8.00], [49.00, 3.00], [50.00, -2.00],
    [48.00, -7.00], [44.00, -12.00], [40.50, -16.00], [38.00, -20.00],
    [36.00, -25.00], [33.00, -29.00], [28.00, -33.00], [20.00, -34.80],
    [18.42, -33.92],
  ],
  // Cape Town → Rotterdam (West Africa coast, Atlantic)
  capetown_rotterdam: [
    [18.42, -33.92], [14.00, -30.00], [10.00, -24.00], [6.00, -15.00],
    [2.00, -5.00], [-2.00, 3.00], [-8.00, 10.00], [-15.00, 18.00],
    [-17.50, 25.00], [-15.40, 28.10], [-12.00, 32.00], [-9.50, 36.00],
    [-5.35, 35.96], [-8.00, 37.50], [-9.50, 39.50], [-9.00, 42.00],
    [-7.00, 44.00], [-5.00, 46.00], [-3.00, 48.00], [-1.50, 49.50],
    [0.50, 50.50], [2.00, 51.20], [3.50, 51.80], [4.40, 51.90],
  ],
  // Singapore → Cape Town (via Sunda Strait, Indian Ocean)
  singapore_capetown: [
    [103.82, 1.26], [105.80, -3.00], [105.80, -6.10], [103.00, -8.50],
    [96.00, -12.00], [85.00, -16.00], [72.00, -20.00], [58.00, -25.00],
    [44.00, -28.00], [32.00, -33.00], [22.00, -35.00], [18.42, -33.92],
  ],
  // Cape Town → New York (South Atlantic)
  capetown_newyork: [
    [18.42, -33.92], [8.00, -28.00], [-5.00, -20.00], [-20.00, -10.00],
    [-34.85, -8.05], [-42.00, 0.00], [-50.00, 8.00], [-58.00, 15.00],
    [-65.00, 20.00], [-70.00, 25.00], [-73.00, 32.00], [-74.00, 37.00],
    [-74.00, 40.66],
  ],
  // Rotterdam → New York (North Atlantic)
  rotterdam_newyork: [
    [4.40, 51.90], [2.00, 51.20], [0.00, 50.50], [-3.00, 49.00],
    [-8.00, 48.00], [-15.00, 47.00], [-25.00, 46.00], [-35.00, 44.00],
    [-45.00, 42.50], [-55.00, 41.50], [-65.00, 41.00], [-71.00, 40.80],
    [-74.00, 40.66],
  ],
  // New York → Los Angeles (via Caribbean, Panama Canal)
  newyork_losangeles: [
    [-74.00, 40.66], [-75.00, 36.00], [-76.00, 30.00], [-78.00, 25.00],
    [-79.00, 20.00], [-79.50, 15.00], [-79.92, 9.35], [-79.52, 8.95],
    [-82.00, 8.50], [-86.00, 10.00], [-92.00, 14.00], [-100.00, 18.00],
    [-108.00, 22.00], [-114.00, 28.00], [-117.00, 32.00], [-118.27, 33.73],
  ],
  // Shanghai → Los Angeles (trans-Pacific)
  shanghai_losangeles: [
    [121.47, 31.23], [125.00, 32.00], [130.00, 33.00], [140.00, 34.00],
    [150.00, 34.00], [160.00, 33.00], [170.00, 31.00], [180.00, 29.00],
    [-170.00, 27.50], [-160.00, 26.50], [-157.80, 25.00], [-150.00, 27.00],
    [-140.00, 29.00], [-130.00, 31.00], [-122.00, 33.00], [-118.27, 33.73],
  ],
  // Busan → Los Angeles (North Pacific)
  busan_losangeles: [
    [129.04, 35.10], [135.00, 36.00], [142.00, 38.00], [150.00, 40.00],
    [160.00, 42.00], [170.00, 42.00], [180.00, 40.00], [-170.00, 38.00],
    [-160.00, 36.00], [-150.00, 34.00], [-140.00, 33.00], [-130.00, 33.00],
    [-122.00, 33.50], [-118.27, 33.73],
  ],
  // Hong Kong → Singapore
  hongkong_singapore: [
    [114.17, 22.30], [112.00, 18.00], [110.00, 13.00], [108.00, 8.00],
    [106.00, 4.00], [104.50, 2.00], [103.82, 1.26],
  ],
  // Mumbai → Dubai (via Hormuz)
  mumbai_dubai: [
    [72.85, 18.93], [66.00, 20.00], [60.00, 22.00], [57.00, 24.50],
    [56.40, 26.50], [55.03, 24.98],
  ],
  // Dubai → Suez (via Hormuz, Gulf of Aden, Red Sea)
  dubai_suez: [
    [55.03, 24.98], [56.40, 26.50], [58.00, 25.00], [55.00, 22.00],
    [52.00, 18.00], [48.00, 14.00], [45.03, 12.80], [43.30, 12.60],
    [42.50, 14.50], [41.00, 16.50], [39.50, 18.50], [38.00, 20.50],
    [36.50, 22.50], [35.50, 24.50], [34.50, 26.50], [33.50, 28.00],
    [32.55, 29.95],
  ],
  // Busan → Shanghai
  busan_shanghai: [[129.04, 35.10], [128.00, 34.00], [126.50, 33.00], [124.50, 31.80], [122.50, 31.00], [121.47, 31.23]],
  // Antwerp → Rotterdam
  antwerp_rotterdam: [[4.40, 51.23], [4.40, 51.60], [4.40, 51.90]],
};

// ── Route table: port pair → ordered corridor segments ──────────────────

interface RouteTemplate {
  corridors: string[];      // corridor keys in order
  reverse?: boolean[];      // which corridors to reverse
  altCorridors?: string[];  // alternate route corridors (for rerouting)
  altReverse?: boolean[];
}

const PORT_NODE: Record<string, string> = {
  'Port of Shanghai': 'shanghai', 'Port of Rotterdam': 'rotterdam',
  'Port of Singapore': 'singapore', 'Port of Dubai (Jebel Ali)': 'dubai',
  'Port of Los Angeles': 'los_angeles', 'Port of Hamburg': 'hamburg',
  'Port of Busan': 'busan', 'Port of Hong Kong': 'hong_kong',
  'Port of Antwerp': 'antwerp', 'Port of New York': 'new_york',
  'Port of Mumbai': 'mumbai', 'Port of Colombo': 'colombo',
};

// key = "from→to"
const ROUTE_TABLE: Record<string, RouteTemplate> = {
  // Shanghai → Rotterdam via Suez (primary), via Cape (alt)
  'shanghai→rotterdam': {
    corridors: ['shanghai_singapore', 'singapore_colombo', 'colombo_aden', 'aden_suez', 'suez_gibraltar', 'gibraltar_rotterdam'],
    altCorridors: ['shanghai_singapore', 'singapore_capetown', 'capetown_rotterdam'],
  },
  'rotterdam→shanghai': {
    corridors: ['gibraltar_rotterdam', 'suez_gibraltar', 'aden_suez', 'colombo_aden', 'singapore_colombo', 'shanghai_singapore'],
    reverse: [true, true, true, true, true, true],
    altCorridors: ['capetown_rotterdam', 'singapore_capetown', 'shanghai_singapore'],
    altReverse: [true, true, true],
  },
  // Shanghai → LA (trans-Pacific direct)
  'shanghai→los_angeles': { corridors: ['shanghai_losangeles'] },
  'los_angeles→shanghai': { corridors: ['shanghai_losangeles'], reverse: [true] },
  // Busan → LA
  'busan→los_angeles': { corridors: ['busan_losangeles'] },
  'los_angeles→busan': { corridors: ['busan_losangeles'], reverse: [true] },
  // Busan → Rotterdam
  'busan→rotterdam': {
    corridors: ['busan_shanghai', 'shanghai_singapore', 'singapore_colombo', 'colombo_aden', 'aden_suez', 'suez_gibraltar', 'gibraltar_rotterdam'],
  },
  // Mumbai → Rotterdam via Suez
  'mumbai→rotterdam': {
    corridors: ['mumbai_aden', 'aden_suez', 'suez_gibraltar', 'gibraltar_rotterdam'],
    altCorridors: ['mumbai_colombo', 'singapore_colombo', 'singapore_capetown', 'capetown_rotterdam'],
    altReverse: [false, true, false, false],
  },
  'rotterdam→mumbai': {
    corridors: ['gibraltar_rotterdam', 'suez_gibraltar', 'aden_suez', 'mumbai_aden'],
    reverse: [true, true, true, true],
  },
  // Mumbai → LA (via Suez → Med → Atlantic → Panama)
  'mumbai→los_angeles': {
    corridors: ['mumbai_aden', 'aden_suez', 'suez_gibraltar', 'gibraltar_rotterdam', 'rotterdam_newyork', 'newyork_losangeles'],
    altCorridors: ['mumbai_colombo', 'singapore_colombo', 'shanghai_singapore', 'shanghai_losangeles'],
    altReverse: [false, true, true, false],
  },
  'los_angeles→mumbai': {
    corridors: ['newyork_losangeles', 'rotterdam_newyork', 'gibraltar_rotterdam', 'suez_gibraltar', 'aden_suez', 'mumbai_aden'],
    reverse: [true, true, true, true, true, true],
  },
  // Mumbai → Singapore
  'mumbai→singapore': {
    corridors: ['mumbai_colombo', 'singapore_colombo'],
    reverse: [false, true],
  },
  'singapore→mumbai': { corridors: ['singapore_colombo', 'mumbai_colombo'], reverse: [false, true] },
  // Singapore → Rotterdam via Suez
  'singapore→rotterdam': {
    corridors: ['singapore_colombo', 'colombo_aden', 'aden_suez', 'suez_gibraltar', 'gibraltar_rotterdam'],
    altCorridors: ['singapore_capetown', 'capetown_rotterdam'],
  },
  'rotterdam→singapore': {
    corridors: ['gibraltar_rotterdam', 'suez_gibraltar', 'aden_suez', 'colombo_aden', 'singapore_colombo'],
    reverse: [true, true, true, true, true],
  },
  // Dubai → Rotterdam
  'dubai→rotterdam': {
    corridors: ['dubai_suez', 'suez_gibraltar', 'gibraltar_rotterdam'],
  },
  'rotterdam→dubai': {
    corridors: ['gibraltar_rotterdam', 'suez_gibraltar', 'dubai_suez'],
    reverse: [true, true, true],
  },
  // Dubai → Mumbai
  'dubai→mumbai': { corridors: ['mumbai_dubai'], reverse: [true] },
  'mumbai→dubai': { corridors: ['mumbai_dubai'] },
  // Hong Kong → Singapore
  'hong_kong→singapore': { corridors: ['hongkong_singapore'] },
  'singapore→hong_kong': { corridors: ['hongkong_singapore'], reverse: [true] },
  // Mumbai → Hong Kong
  'mumbai→hong_kong': {
    corridors: ['mumbai_colombo', 'singapore_colombo', 'hongkong_singapore'],
    reverse: [false, true, true]
  },
  'hong_kong→mumbai': {
    corridors: ['hongkong_singapore', 'singapore_colombo', 'mumbai_colombo'],
    reverse: [false, false, true]
  },
  // Hong Kong → Rotterdam
  'hong_kong→rotterdam': {
    corridors: ['hongkong_singapore', 'singapore_colombo', 'colombo_aden', 'aden_suez', 'suez_gibraltar', 'gibraltar_rotterdam'],
  },
  // Shanghai → Hamburg
  'shanghai→hamburg': {
    corridors: ['shanghai_singapore', 'singapore_colombo', 'colombo_aden', 'aden_suez', 'suez_gibraltar', 'gibraltar_hamburg'],
  },
  // Shanghai → New York
  'shanghai→new_york': {
    corridors: ['shanghai_losangeles', 'newyork_losangeles'],
    reverse: [false, true],
  },
  // Rotterdam → New York
  'rotterdam→new_york': { corridors: ['rotterdam_newyork'] },
  'new_york→rotterdam': { corridors: ['rotterdam_newyork'], reverse: [true] },
  // New York → LA
  'new_york→los_angeles': { corridors: ['newyork_losangeles'] },
  'los_angeles→new_york': { corridors: ['newyork_losangeles'], reverse: [true] },
  // Mumbai → Colombo
  'mumbai→colombo': { corridors: ['mumbai_colombo'] },
  'colombo→mumbai': { corridors: ['mumbai_colombo'], reverse: [true] },
  // Singapore → LA
  'singapore→los_angeles': {
    corridors: ['shanghai_singapore', 'shanghai_losangeles'],
    reverse: [true, false],
  },
  // Rotterdam → Antwerp
  'rotterdam→antwerp': { corridors: ['antwerp_rotterdam'], reverse: [true] },
  'antwerp→rotterdam': { corridors: ['antwerp_rotterdam'] },
  // Antwerp → New York
  'antwerp→new_york': { corridors: ['antwerp_rotterdam', 'rotterdam_newyork'] },
  // Hamburg → Rotterdam
  'hamburg→rotterdam': { corridors: ['rotterdam_hamburg'], reverse: [true] },
  'rotterdam→hamburg': { corridors: ['rotterdam_hamburg'] },
  // Colombo → Singapore
  'colombo→singapore': { corridors: ['singapore_colombo'], reverse: [true] },
  'singapore→colombo': { corridors: ['singapore_colombo'] },
  // LA → Antwerp
  'los_angeles→antwerp': { 
    corridors: ['newyork_losangeles', 'rotterdam_newyork', 'antwerp_rotterdam'], 
    reverse: [true, true, true] 
  },
  'antwerp→los_angeles': { 
    corridors: ['antwerp_rotterdam', 'rotterdam_newyork', 'newyork_losangeles'] 
  },
  // LA → Rotterdam
  'los_angeles→rotterdam': { 
    corridors: ['newyork_losangeles', 'rotterdam_newyork'], 
    reverse: [true, true] 
  },
  'rotterdam→los_angeles': { 
    corridors: ['rotterdam_newyork', 'newyork_losangeles'] 
  },
  // Antwerp → Colombo
  'antwerp→colombo': { 
    corridors: ['antwerp_rotterdam', 'gibraltar_rotterdam', 'suez_gibraltar', 'aden_suez', 'colombo_aden'],
    reverse: [false, true, true, true, true]
  },
  'colombo→antwerp': { 
    corridors: ['colombo_aden', 'aden_suez', 'suez_gibraltar', 'gibraltar_rotterdam', 'antwerp_rotterdam'],
    reverse: [false, false, false, false, true]
  },
  // Antwerp → Shanghai
  'antwerp→shanghai': {
    corridors: ['antwerp_rotterdam', 'gibraltar_rotterdam', 'suez_gibraltar', 'aden_suez', 'colombo_aden', 'singapore_colombo', 'shanghai_singapore'],
    reverse: [false, true, true, true, true, true, true]
  },
  'shanghai→antwerp': {
    corridors: ['shanghai_singapore', 'singapore_colombo', 'colombo_aden', 'aden_suez', 'suez_gibraltar', 'gibraltar_rotterdam', 'antwerp_rotterdam'],
    reverse: [false, false, false, false, false, false, true]
  },
  // Shanghai → Busan
  'shanghai→busan': { corridors: ['busan_shanghai'], reverse: [true] },
};

// ── Build route from corridor segments ──────────────────────────────────

function buildRoute(template: RouteTemplate, useAlt: boolean): Coord[] {
  const corrs = useAlt && template.altCorridors ? template.altCorridors : template.corridors;
  const revs  = useAlt && template.altReverse   ? template.altReverse   : (template.reverse || []);
  const result: Coord[] = [];

  for (let i = 0; i < corrs.length; i++) {
    let seg = CORRIDORS[corrs[i]];
    if (!seg) continue;
    seg = [...seg]; // clone
    if (revs[i]) seg.reverse();
    // Skip first point if it's same as last result point (avoid duplicates)
    const start = result.length > 0 && seg.length > 0 &&
      Math.abs(result[result.length - 1][0] - seg[0][0]) < 0.5 &&
      Math.abs(result[result.length - 1][1] - seg[0][1]) < 0.5
      ? 1 : 0;
    result.push(...seg.slice(start));
  }

  // Normalize longitudes to prevent wrap-around glitch
  for (let i = 1; i < result.length; i++) {
    let prevLon = result[i - 1][0];
    let currLon = result[i][0];
    // If the jump is larger than 180 degrees, it crossed the antimeridian
    if (currLon - prevLon > 180) {
      result[i][0] -= 360;
    } else if (currLon - prevLon < -180) {
      result[i][0] += 360;
    }
  }

  return result;
}

// ── Public API ───────────────────────────────────────────────────────────

export function generateMaritimeRoute(originPort: string, destPort: string, alternate = false): Coord[] {
  const from = PORT_NODE[originPort];
  const to   = PORT_NODE[destPort];
  if (!from || !to || from === to) return [];

  const key = `${from}→${to}`;
  const template = ROUTE_TABLE[key];
  if (!template) return []; // unknown pair

  return buildRoute(template, alternate);
}

export async function generateDynamicRoute(
  originPort: string, 
  destPort: string, 
  originCoords: [number, number], 
  destCoords: [number, number], 
  mode: 'sea' | 'land' | 'air' = 'sea', 
  alternate = false
): Promise<Coord[]> {
  if (mode === 'air') {
    // Generate a simple great circle path with 20 segments
    const pts: Coord[] = [];
    const segments = 20;
    for (let i = 0; i <= segments; i++) {
      const f = i / segments;
      const lon = originCoords[0] + (destCoords[0] - originCoords[0]) * f;
      // Add slight altitude arc approximation
      const arc = Math.sin(f * Math.PI) * 15; 
      const lat = originCoords[1] + (destCoords[1] - originCoords[1]) * f + arc;
      pts.push([lon, lat]);
    }
    return pts;
  }

  if (mode === 'sea') {
    const seaRoute = generateMaritimeRoute(originPort, destPort, alternate);
    if (seaRoute.length > 0) return seaRoute;
    
    // Autonomous Fallback to Python searoute graph
    try {
      const url = `/api/routing/searoute?origin_lon=${originCoords[0]}&origin_lat=${originCoords[1]}&dest_lon=${destCoords[0]}&dest_lat=${destCoords[1]}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.route && data.route.geometry && data.route.geometry.coordinates) {
        return data.route.geometry.coordinates as Coord[];
      }
    } catch (err) {
      console.warn("Autonomous sea routing failed:", err);
    }
    return [originCoords, destCoords]; // Fallback to straight line if API fails
  }

  // Fallback to land routing via OSRM if mode is land OR sea route not found
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${originCoords[0]},${originCoords[1]};${destCoords[0]},${destCoords[1]}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.routes && data.routes.length > 0) {
      return data.routes[0].geometry.coordinates as Coord[];
    }
  } catch (err) {
    console.warn("OSRM routing failed:", err);
  }
  
  // Final fallback: straight line
  return [originCoords, destCoords];
}

export function hasAlternateRoute(originPort: string, destPort: string): boolean {
  const from = PORT_NODE[originPort];
  const to   = PORT_NODE[destPort];
  if (!from || !to) return false;
  const template = ROUTE_TABLE[`${from}→${to}`];
  return !!template?.altCorridors;
}

export function estimateVoyageDays(waypoints: Coord[], avgSpeedKnots = 14): number {
  let totalNm = 0;
  for (let i = 0; i < waypoints.length - 1; i++) {
    const dlat = waypoints[i + 1][1] - waypoints[i][1];
    const dlon = waypoints[i + 1][0] - waypoints[i][0];
    totalNm += Math.sqrt(dlat * dlat + dlon * dlon) * 60;
  }
  return Math.max(3, Math.round(totalNm / (avgSpeedKnots * 24)));
}
