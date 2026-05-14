import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { city } = req.query;
  const apiKey = process.env.OPENWEATHER_API_KEY;

  // Nếu không có API key thực, trả về dữ liệu mặc định (Ho Chi Minh City)
  if (!apiKey || apiKey === 'MY_OPENWEATHER_API_KEY') {
    return res.json({
      name: city || 'Ho Chi Minh City',
      main: { temp: 30, temp_max: 34, temp_min: 26, humidity: 65 },
      wind: { speed: 3.5 }
    });
  }

  try {
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&appid=${apiKey}`
    );
    if (!response.ok) throw new Error('Weather API error');
    const data = await response.json();
    return res.json(data);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch weather data' });
  }
}
