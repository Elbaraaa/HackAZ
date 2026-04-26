export type ApproxLocation = {
  longitude: number;
  latitude: number;
  accuracyMeters: number;
  privacyRadiusMiles: number;
  source: "device";
};

export function requestApproxLocation(): Promise<ApproxLocation> {
  if (!("geolocation" in navigator)) {
    return Promise.reject(new Error("Location is not available in this browser."));
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const privacyRadiusMiles = privacyRadiusFor(position.coords.accuracy);
        const blurred = blurCoordinate(
          position.coords.longitude,
          position.coords.latitude,
          privacyRadiusMiles,
        );
        resolve({
          ...blurred,
          accuracyMeters: position.coords.accuracy,
          privacyRadiusMiles,
          source: "device",
        });
      },
      (error) => reject(new Error(error.message || "Location permission was denied.")),
      {
        enableHighAccuracy: false,
        maximumAge: 1000 * 60 * 10,
        timeout: 10000,
      },
    );
  });
}

function privacyRadiusFor(accuracyMeters: number) {
  const accuracyMiles = accuracyMeters / 1609.344;
  return Math.max(0.25, Math.min(1.25, accuracyMiles + 0.2));
}

function blurCoordinate(longitude: number, latitude: number, radiusMiles: number) {
  const angle = randomUnit() * Math.PI * 2;
  const distanceMiles = Math.sqrt(randomUnit()) * radiusMiles;
  const latitudeMiles = 69;
  const longitudeMiles = latitudeMiles * Math.cos(latitude * Math.PI / 180);

  return {
    longitude: longitude + Math.cos(angle) * distanceMiles / longitudeMiles,
    latitude: latitude + Math.sin(angle) * distanceMiles / latitudeMiles,
  };
}

function randomUnit() {
  const cryptoApi = globalThis.crypto;
  if (!cryptoApi?.getRandomValues) return Math.random();

  const values = new Uint32Array(1);
  cryptoApi.getRandomValues(values);
  return values[0] / 4294967295;
}
