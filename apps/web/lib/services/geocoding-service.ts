/**
 * Simple Geocoding Service
 * 
 * Provides basic geocoding for common cities and locations
 * This is a simplified implementation for Milestone 2
 */

interface Coordinates {
  latitude: number;
  longitude: number;
}

interface CityCoordinates {
  [key: string]: Coordinates;
}

// Common city coordinates database
const CITY_COORDINATES: CityCoordinates = {
  // United States
  'new york': { latitude: 40.7128, longitude: -74.0060 },
  'los angeles': { latitude: 34.0522, longitude: -118.2437 },
  'chicago': { latitude: 41.8781, longitude: -87.6298 },
  'houston': { latitude: 29.7604, longitude: -95.3698 },
  'phoenix': { latitude: 33.4484, longitude: -112.0740 },
  'philadelphia': { latitude: 39.9526, longitude: -75.1652 },
  'san antonio': { latitude: 29.4241, longitude: -98.4936 },
  'san diego': { latitude: 32.7157, longitude: -117.1611 },
  'dallas': { latitude: 32.7767, longitude: -96.7970 },
  'san jose': { latitude: 37.3382, longitude: -121.8863 },
  'austin': { latitude: 30.2672, longitude: -97.7431 },
  'jacksonville': { latitude: 30.3322, longitude: -81.6557 },
  'fort worth': { latitude: 32.7555, longitude: -97.3308 },
  'columbus': { latitude: 39.9612, longitude: -82.9988 },
  'charlotte': { latitude: 35.2271, longitude: -80.8431 },
  'san francisco': { latitude: 37.7749, longitude: -122.4194 },
  'indianapolis': { latitude: 39.7684, longitude: -86.1581 },
  'seattle': { latitude: 47.6062, longitude: -122.3321 },
  'denver': { latitude: 39.7392, longitude: -104.9903 },
  'washington': { latitude: 38.9072, longitude: -77.0369 },
  'boston': { latitude: 42.3601, longitude: -71.0589 },
  'el paso': { latitude: 31.7619, longitude: -106.4850 },
  'detroit': { latitude: 42.3314, longitude: -83.0458 },
  'nashville': { latitude: 36.1627, longitude: -86.7816 },
  'portland': { latitude: 45.5152, longitude: -122.6784 },
  'memphis': { latitude: 35.1495, longitude: -90.0490 },
  'oklahoma city': { latitude: 35.4676, longitude: -97.5164 },
  'las vegas': { latitude: 36.1699, longitude: -115.1398 },
  'louisville': { latitude: 38.2527, longitude: -85.7585 },
  'baltimore': { latitude: 39.2904, longitude: -76.6122 },
  'milwaukee': { latitude: 43.0389, longitude: -87.9065 },
  'albuquerque': { latitude: 35.0844, longitude: -106.6504 },
  'tucson': { latitude: 32.2226, longitude: -110.9747 },
  'fresno': { latitude: 36.7378, longitude: -119.7871 },
  'sacramento': { latitude: 38.5816, longitude: -121.4944 },
  'kansas city': { latitude: 39.0997, longitude: -94.5786 },
  'mesa': { latitude: 33.4152, longitude: -111.8315 },
  'atlanta': { latitude: 33.7490, longitude: -84.3880 },
  'colorado springs': { latitude: 38.8339, longitude: -104.8214 },
  'raleigh': { latitude: 35.7796, longitude: -78.6382 },
  'omaha': { latitude: 41.2565, longitude: -95.9345 },
  'miami': { latitude: 25.7617, longitude: -80.1918 },
  'long beach': { latitude: 33.7701, longitude: -118.1937 },
  'virginia beach': { latitude: 36.8529, longitude: -75.9780 },
  'oakland': { latitude: 37.8044, longitude: -122.2711 },
  'minneapolis': { latitude: 44.9778, longitude: -93.2650 },
  'tulsa': { latitude: 36.1540, longitude: -95.9928 },
  'tampa': { latitude: 27.9506, longitude: -82.4572 },
  'arlington': { latitude: 32.7357, longitude: -97.1081 },
  'new orleans': { latitude: 29.9511, longitude: -90.0715 },
  'wichita': { latitude: 37.6872, longitude: -97.3301 },
  'cleveland': { latitude: 41.4993, longitude: -81.6944 },
  'bakersfield': { latitude: 35.3733, longitude: -119.0187 },
  'aurora': { latitude: 39.7294, longitude: -104.8319 },
  'anaheim': { latitude: 33.8366, longitude: -117.9143 },
  'honolulu': { latitude: 21.3099, longitude: -157.8581 },
  'santa ana': { latitude: 33.7455, longitude: -117.8677 },
  'corpus christi': { latitude: 27.8006, longitude: -97.3964 },
  'riverside': { latitude: 33.9533, longitude: -117.3962 },
  'lexington': { latitude: 38.0406, longitude: -84.5037 },
  'stockton': { latitude: 37.9577, longitude: -121.2908 },
  'henderson': { latitude: 36.0395, longitude: -114.9817 },
  'saint paul': { latitude: 44.9537, longitude: -93.0900 },
  'st. louis': { latitude: 38.6270, longitude: -90.1994 },
  'cincinnati': { latitude: 39.1031, longitude: -84.5120 },
  'pittsburgh': { latitude: 40.4406, longitude: -79.9959 },
  'greensboro': { latitude: 36.0726, longitude: -79.7920 },
  'lincoln': { latitude: 40.8136, longitude: -96.7026 },
  'plano': { latitude: 33.0198, longitude: -96.6989 },
  'anchorage': { latitude: 61.2181, longitude: -149.9003 },
  'buffalo': { latitude: 42.8864, longitude: -78.8784 },
  'fort wayne': { latitude: 41.0793, longitude: -85.1394 },
  'jersey city': { latitude: 40.7178, longitude: -74.0431 },
  'chula vista': { latitude: 32.6401, longitude: -117.0842 },
  'orlando': { latitude: 28.5383, longitude: -81.3792 },
  'norfolk': { latitude: 36.8508, longitude: -76.2859 },
  'chandler': { latitude: 33.3062, longitude: -111.8413 },
  'laredo': { latitude: 27.5306, longitude: -99.4803 },
  'madison': { latitude: 43.0731, longitude: -89.4012 },
  'lubbock': { latitude: 33.5779, longitude: -101.8552 },
  'winston-salem': { latitude: 36.0999, longitude: -80.2442 },
  'garland': { latitude: 32.9126, longitude: -96.6389 },
  'glendale': { latitude: 33.5387, longitude: -112.1860 },
  'hialeah': { latitude: 25.8576, longitude: -80.2781 },
  'reno': { latitude: 39.5296, longitude: -119.8138 },
  'baton rouge': { latitude: 30.4515, longitude: -91.1871 },
  'irvine': { latitude: 33.6846, longitude: -117.8265 },
  'chesapeake': { latitude: 36.7682, longitude: -76.2875 },
  'irving': { latitude: 32.8140, longitude: -96.9489 },
  'scottsdale': { latitude: 33.4942, longitude: -111.9261 },
  'north las vegas': { latitude: 36.1989, longitude: -115.1175 },
  'fremont': { latitude: 37.5485, longitude: -121.9886 },
  'gilbert': { latitude: 33.3528, longitude: -111.7890 },
  'san bernardino': { latitude: 34.1083, longitude: -117.2898 },
  'boise': { latitude: 43.6150, longitude: -116.2023 },
  'birmingham': { latitude: 33.5207, longitude: -86.8025 },

  // International
  'london': { latitude: 51.5074, longitude: -0.1278 },
  'paris': { latitude: 48.8566, longitude: 2.3522 },
  'berlin': { latitude: 52.5200, longitude: 13.4050 },
  'madrid': { latitude: 40.4168, longitude: -3.7038 },
  'rome': { latitude: 41.9028, longitude: 12.4964 },
  'amsterdam': { latitude: 52.3676, longitude: 4.9041 },
  'brussels': { latitude: 50.8503, longitude: 4.3517 },
  'vienna': { latitude: 48.2082, longitude: 16.3738 },
  'zurich': { latitude: 47.3769, longitude: 8.5417 },
  'stockholm': { latitude: 59.3293, longitude: 18.0686 },
  'oslo': { latitude: 59.9139, longitude: 10.7522 },
  'copenhagen': { latitude: 55.6761, longitude: 12.5683 },
  'helsinki': { latitude: 60.1699, longitude: 24.9384 },
  'dublin': { latitude: 53.3498, longitude: -6.2603 },
  'lisbon': { latitude: 38.7223, longitude: -9.1393 },
  'athens': { latitude: 37.9838, longitude: 23.7275 },
  'warsaw': { latitude: 52.2297, longitude: 21.0122 },
  'prague': { latitude: 50.0755, longitude: 14.4378 },
  'budapest': { latitude: 47.4979, longitude: 19.0402 },
  'bucharest': { latitude: 44.4268, longitude: 26.1025 },
  'sofia': { latitude: 42.6977, longitude: 23.3219 },
  'zagreb': { latitude: 45.8150, longitude: 15.9819 },
  'ljubljana': { latitude: 46.0569, longitude: 14.5058 },
  'bratislava': { latitude: 48.1486, longitude: 17.1077 },
  'tallinn': { latitude: 59.4370, longitude: 24.7536 },
  'riga': { latitude: 56.9496, longitude: 24.1052 },
  'vilnius': { latitude: 54.6872, longitude: 25.2797 },
  'moscow': { latitude: 55.7558, longitude: 37.6176 },
  'st. petersburg': { latitude: 59.9311, longitude: 30.3609 },
  'kiev': { latitude: 50.4501, longitude: 30.5234 },
  'minsk': { latitude: 53.9006, longitude: 27.5590 },
  'tokyo': { latitude: 35.6762, longitude: 139.6503 },
  'osaka': { latitude: 34.6937, longitude: 135.5023 },
  'kyoto': { latitude: 35.0116, longitude: 135.7681 },
  'yokohama': { latitude: 35.4437, longitude: 139.6380 },
  'seoul': { latitude: 37.5665, longitude: 126.9780 },
  'busan': { latitude: 35.1796, longitude: 129.0756 },
  'beijing': { latitude: 39.9042, longitude: 116.4074 },
  'shanghai': { latitude: 31.2304, longitude: 121.4737 },
  'guangzhou': { latitude: 23.1291, longitude: 113.2644 },
  'shenzhen': { latitude: 22.5431, longitude: 114.0579 },
  'hong kong': { latitude: 22.3193, longitude: 114.1694 },
  'taipei': { latitude: 25.0330, longitude: 121.5654 },
  'singapore': { latitude: 1.3521, longitude: 103.8198 },
  'kuala lumpur': { latitude: 3.1390, longitude: 101.6869 },
  'bangkok': { latitude: 13.7563, longitude: 100.5018 },
  'jakarta': { latitude: -6.2088, longitude: 106.8456 },
  'manila': { latitude: 14.5995, longitude: 120.9842 },
  'mumbai': { latitude: 19.0760, longitude: 72.8777 },
  'delhi': { latitude: 28.7041, longitude: 77.1025 },
  'bangalore': { latitude: 12.9716, longitude: 77.5946 },
  'chennai': { latitude: 13.0827, longitude: 80.2707 },
  'kolkata': { latitude: 22.5726, longitude: 88.3639 },
  'hyderabad': { latitude: 17.3850, longitude: 78.4867 },
  'pune': { latitude: 18.5204, longitude: 73.8567 },
  'ahmedabad': { latitude: 23.0225, longitude: 72.5714 },
  'sydney': { latitude: -33.8688, longitude: 151.2093 },
  'melbourne': { latitude: -37.8136, longitude: 144.9631 },
  'brisbane': { latitude: -27.4698, longitude: 153.0251 },
  'perth': { latitude: -31.9505, longitude: 115.8605 },
  'adelaide': { latitude: -34.9285, longitude: 138.6007 },
  'toronto': { latitude: 43.6532, longitude: -79.3832 },
  'montreal': { latitude: 45.5017, longitude: -73.5673 },
  'vancouver': { latitude: 49.2827, longitude: -123.1207 },
  'calgary': { latitude: 51.0447, longitude: -114.0719 },
  'ottawa': { latitude: 45.4215, longitude: -75.6972 },
  'edmonton': { latitude: 53.5461, longitude: -113.4938 },
  'winnipeg': { latitude: 49.8951, longitude: -97.1384 },
  'quebec city': { latitude: 46.8139, longitude: -71.2080 },
  'hamilton': { latitude: 43.2557, longitude: -79.8711 },
  'kitchener': { latitude: 43.4516, longitude: -80.4925 },
  'mexico city': { latitude: 19.4326, longitude: -99.1332 },
  'guadalajara': { latitude: 20.6597, longitude: -103.3496 },
  'monterrey': { latitude: 25.6866, longitude: -100.3161 },
  'puebla': { latitude: 19.0414, longitude: -98.2063 },
  'tijuana': { latitude: 32.5149, longitude: -117.0382 },
  'leon': { latitude: 21.1619, longitude: -101.6921 },
  'juarez': { latitude: 31.6904, longitude: -106.4245 },
  'zapopan': { latitude: 20.7214, longitude: -103.3918 },
  'nezahualcoyotl': { latitude: 19.4003, longitude: -99.0145 },
  'chihuahua': { latitude: 28.6353, longitude: -106.0889 },
  'naucalpan': { latitude: 19.4779, longitude: -99.2386 },
  'merida': { latitude: 20.9674, longitude: -89.5926 },
  'san luis potosi': { latitude: 22.1565, longitude: -100.9855 },
  'aguascalientes': { latitude: 21.8853, longitude: -102.2916 },
  'hermosillo': { latitude: 29.0729, longitude: -110.9559 },
  'saltillo': { latitude: 25.4232, longitude: -101.0053 },
  'mexicali': { latitude: 32.6245, longitude: -115.4523 },
  'culiacan': { latitude: 24.7999, longitude: -107.3943 },
  'sao paulo': { latitude: -23.5505, longitude: -46.6333 },
  'rio de janeiro': { latitude: -22.9068, longitude: -43.1729 },
  'brasilia': { latitude: -15.8267, longitude: -47.9218 },
  'salvador': { latitude: -12.9714, longitude: -38.5014 },
  'fortaleza': { latitude: -3.7319, longitude: -38.5267 },
  'belo horizonte': { latitude: -19.9191, longitude: -43.9386 },
  'manaus': { latitude: -3.1190, longitude: -60.0217 },
  'curitiba': { latitude: -25.4284, longitude: -49.2733 },
  'recife': { latitude: -8.0476, longitude: -34.8770 },
  'porto alegre': { latitude: -30.0346, longitude: -51.2177 },
  'buenos aires': { latitude: -34.6118, longitude: -58.3960 },
  'cordoba': { latitude: -31.4201, longitude: -64.1888 },
  'rosario': { latitude: -32.9442, longitude: -60.6505 },
  'mendoza': { latitude: -32.8895, longitude: -68.8458 },
  'tucuman': { latitude: -26.8083, longitude: -65.2176 },
  'la plata': { latitude: -34.9215, longitude: -57.9545 },
  'mar del plata': { latitude: -38.0055, longitude: -57.5426 },
  'salta': { latitude: -24.7821, longitude: -65.4232 },
  'santa fe': { latitude: -31.6333, longitude: -60.7000 },
  'san juan': { latitude: -31.5375, longitude: -68.5364 },
  'santiago': { latitude: -33.4489, longitude: -70.6693 },
  'valparaiso': { latitude: -33.0472, longitude: -71.6127 },
  'concepcion': { latitude: -36.8201, longitude: -73.0444 },
  'antofagasta': { latitude: -23.6509, longitude: -70.3975 },
  'temuco': { latitude: -38.7359, longitude: -72.5904 },
  'rancagua': { latitude: -34.1701, longitude: -70.7436 },
  
  // Add some key cities that might appear in Stepan data
  'stalybridge': { latitude: 53.4848, longitude: -2.0594 }, // UK
  'manizales': { latitude: 5.0703, longitude: -75.5138 }, // Colombia
  'maywood': { latitude: 40.9026, longitude: -74.0618 }, // NJ, USA
  'vlissingen': { latitude: 51.4426, longitude: 3.5736 }, // Netherlands
  'northfield': { latitude: 44.4583, longitude: -93.1616 } // Minnesota, USA
};

export class GeocodingService {
  /**
   * Get coordinates for a city name
   */
  static getCoordinates(cityName: string): Coordinates | null {
    if (!cityName) return null;
    
    const normalizedCity = cityName.toLowerCase().trim();
    
    // Direct lookup
    if (CITY_COORDINATES[normalizedCity]) {
      return CITY_COORDINATES[normalizedCity];
    }
    
    // Try partial matches for compound city names
    for (const [key, coords] of Object.entries(CITY_COORDINATES)) {
      if (normalizedCity.includes(key) || key.includes(normalizedCity)) {
        return coords;
      }
    }
    
    return null;
  }
  
  /**
   * Get coordinates from location data
   */
  static getCoordinatesFromLocation(locationData: any): Coordinates | null {
    // First check if coordinates are already provided
    if (locationData.coordinates) {
      const coords = locationData.coordinates;
      if (coords.latitude && coords.longitude) {
        return {
          latitude: coords.latitude,
          longitude: coords.longitude
        };
      }
      if (coords.lat && coords.lng) {
        return {
          latitude: coords.lat,
          longitude: coords.lng
        };
      }
    }
    
    // Try to geocode from city name
    if (locationData.city) {
      const coords = this.getCoordinates(locationData.city);
      if (coords) return coords;
    }
    
    // Try to geocode from address
    if (locationData.address) {
      // Extract city from address
      const addressParts = locationData.address.split(',');
      for (const part of addressParts) {
        const coords = this.getCoordinates(part.trim());
        if (coords) return coords;
      }
    }
    
    return null;
  }
  
  /**
   * Check if coordinates are valid
   */
  static isValidCoordinates(lat: number, lng: number): boolean {
    return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
  }
}
