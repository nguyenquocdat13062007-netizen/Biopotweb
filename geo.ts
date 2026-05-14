import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { q } = req.query;
  const apiKey = process.env.OPENWEATHER_API_KEY;
  const qStr = q as string;

  if (!qStr || qStr.length < 2) return res.json([]);

  if (!apiKey || apiKey === 'MY_OPENWEATHER_API_KEY') {
    const mocks = [
      { name: 'Ho Chi Minh City', country: 'VN', lat: 10.7626, lon: 106.6601 },
      { name: 'Hanoi', country: 'VN', lat: 21.0245, lon: 105.8412 },
      { name: 'Da Nang', country: 'VN', lat: 16.0544, lon: 108.2022 },
    ];
    return res.json(mocks.filter(m => m.name.toLowerCase().includes(qStr.toLowerCase())));
  }

  try {
    const response = await fetch(
      `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(qStr)}&limit=5&appid=${apiKey}`
    );
    const data = await response.json();
    return res.json(data);
  } catch {
    return res.status(500).json({ error: 'Failed to fetch geo data' });
  }
}
