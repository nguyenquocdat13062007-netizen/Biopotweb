import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { city, lat, lon } = req.query;
  const apiKey = process.env.OPENWEATHER_API_KEY;

  if (!apiKey || apiKey === 'MY_OPENWEATHER_API_KEY') {
    return res.json({
      name: city || 'Ho Chi Minh City',
      main: { temp: 30, temp_max: 34, temp_min: 26, humidity: 65 },
      wind: { speed: 3.5 }
    });
  }

  try {
    let url = '';

    // Ưu tiên dùng lat/lon vì chính xác hơn tên thành phố
    if (lat && lon) {
      url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`;
    } else if (city) {
      // Làm sạch tên thành phố: bỏ phần ", VN" hoặc ", US" ở cuối nếu có
      const cleanCity = (city as string).replace(/,\s*[A-Z]{2}$/, '').trim();
      url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(cleanCity)}&units=metric&appid=${apiKey}`;
    } else {
      return res.status(400).json({ error: 'Missing city or lat/lon parameter' });
    }

    const response = await fetch(url);
    const data = await response.json();

    // OpenWeather trả về cod=404 khi không tìm thấy
    if (!response.ok || data.cod === 404 || data.cod === '404') {
      return res.status(404).json({ error: 'City not found', cod: 404 });
    }

    return res.json(data);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch weather data' });
  }
}
