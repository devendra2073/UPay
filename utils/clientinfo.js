
import { UAParser } from 'ua-parser-js';

export default async function handler(req, res) {
  try {
    // 1. IP एड्रेस
    const forwarded = req.headers['x-forwarded-for'];
    const clientIp = typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : req.socket.remoteAddress;

    // 2. User-Agent पार्सिंग
    const parser = new UAParser(req.headers['user-agent'] || '');
    const ua = parser.getResult();

    // 3. IP Geolocation (ip-api.com)
    let geo = {};
    if (clientIp && clientIp !== '127.0.0.1' && clientIp !== '::1') {
      const geoResponse = await fetch(`http://ip-api.com/json/${clientIp}?fields=country,regionName,city,zip,lat,lon,timezone,isp`);
      if (geoResponse.ok) {
        geo = await geoResponse.json();
      }
    }

    // 4. कंबाइंड आउटपुट
    return ({
      ip: clientIp,
      device: {
        type: ua.device.type || 'desktop',
        brand: ua.device.vendor || 'Unknown',
        model: ua.device.model || 'Unknown'
      },
      os: {
        name: ua.os.name || 'Unknown',
        version: ua.os.version || 'Unknown'
      },
      browser: {
        name: ua.browser.name || 'Unknown',
        version: ua.browser.version || 'Unknown'
      },
      location: {
        country: geo.country || req.headers['x-vercel-ip-country'] || 'Unknown',
        region: geo.regionName || req.headers['x-vercel-ip-country-region'] || 'Unknown',
        city: geo.city || req.headers['x-vercel-ip-city'] || 'Unknown',
        zip: geo.zip || 'Unknown',
        latitude: geo.lat || req.headers['x-vercel-ip-latitude'] || null,
        longitude: geo.lon || req.headers['x-vercel-ip-longitude'] || null,
        timezone: geo.timezone || 'Unknown',
        isp: geo.isp || 'Unknown'
      }
    });
  } catch (error) {
    return ({ error: 'Internal Server Error' });
  }
}
