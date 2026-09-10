/**
 * Service to fetch 100% free pedestrian walking route & turn-by-turn steps via OSRM
 * No API key required.
 */
export async function getWalkingRoute(userLat, userLng, storeLat, storeLng) {
  try {
    const url = `https://router.project-osrm.org/route/v1/walking/${userLng},${userLat};${storeLng},${storeLat}?overview=full&geometries=geojson&steps=true`;
    
    const response = await fetch(url);
    if (!response.ok) throw new Error('OSRM routing failed');
    const data = await response.json();

    if (!data.routes || data.routes.length === 0) {
      throw new Error('No walking route found');
    }

    const route = data.routes[0];
    // GeoJSON coordinates are [longitude, latitude], convert to Leaflet [latitude, longitude]
    const coordinates = route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);

    // Extract turn-by-turn steps
    const steps = [];
    if (route.legs && route.legs[0] && route.legs[0].steps) {
      route.legs[0].steps.forEach((step, idx) => {
        const distM = Math.round(step.distance);
        if (distM > 0 || idx === 0) {
          const name = step.name || 'Walkway';
          let instruction = step.maneuver.type;

          if (step.maneuver.type === 'depart') {
            instruction = `Head ${step.maneuver.modifier || 'forward'} on ${name}`;
          } else if (step.maneuver.type === 'arrive') {
            instruction = `Arrive at destination on your ${step.maneuver.modifier || 'side'}`;
          } else if (step.maneuver.type === 'turn') {
            instruction = `Turn ${step.maneuver.modifier || ''} onto ${name}`;
          } else if (step.maneuver.type === 'new name') {
            instruction = `Continue onto ${name}`;
          } else {
            instruction = `${step.maneuver.type} ${step.maneuver.modifier || ''} onto ${name}`;
          }

          steps.push({
            id: `step_${idx}`,
            instruction: instruction.trim(),
            name,
            distanceMeters: distM,
            modifier: step.maneuver.modifier || 'straight',
            type: step.maneuver.type
          });
        }
      });
    }

    return {
      success: true,
      coordinates,
      distanceMeters: Math.round(route.distance),
      durationMinutes: Math.max(1, Math.round(route.duration / 60)),
      steps
    };
  } catch (err) {
    console.warn('OSRM network route failed, falling back to direct route points:', err.message);

    // Fallback: direct interpolated street points
    const directDistanceM = calculateDirectDistance(userLat, userLng, storeLat, storeLng);
    const coords = [
      [userLat, userLng],
      [(userLat + storeLat) / 2 + 0.0003, (userLng + storeLng) / 2],
      [storeLat, storeLng]
    ];

    return {
      success: true,
      coordinates: coords,
      distanceMeters: directDistanceM,
      durationMinutes: Math.max(1, Math.ceil(directDistanceM / 75)),
      steps: [
        {
          id: 'step_fallback_1',
          instruction: 'Walk towards print store counter',
          distanceMeters: directDistanceM,
          modifier: 'straight',
          type: 'depart'
        },
        {
          id: 'step_fallback_2',
          instruction: 'Arrive at print shop entrance',
          distanceMeters: 0,
          modifier: 'straight',
          type: 'arrive'
        }
      ]
    };
  }
}

function calculateDirectDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}
