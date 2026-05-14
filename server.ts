import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// --- Database ---
const plants = [
  // Leafy (Rau ăn lá)
  { id: "water-spinach", name_vi: "Rau muống", name_en: "Water Spinach", group: "Leafy", Kc: 1.05, water_need: "High", description_vi: "Cần nước cao, phát triển nhanh", description_en: "High water requirement, fast growing" },
  { id: "lettuce", name_vi: "Xà lách", name_en: "Lettuce", group: "Leafy", Kc: 1.0, water_need: "Medium", description_vi: "Ưa mát, dồi dào dinh dưỡng", description_en: "Likes cool weather, nutrient dense" },
  { id: "mustard-greens", name_vi: "Cải xanh", name_en: "Mustard Greens", group: "Leafy", Kc: 1.1, water_need: "High", description_vi: "Phát triển rất nhanh", description_en: "Grows very fast" },
  { id: "amaranth", name_vi: "Rau dền", name_en: "Amaranth", group: "Leafy", Kc: 1.05, water_need: "Medium", description_vi: "Chịu nhiệt tốt", description_en: "Heat tolerant" },
  { id: "malabar-spinach", name_vi: "Mồng tơi", name_en: "Malabar Spinach", group: "Leafy", Kc: 1.1, water_need: "High", description_vi: "Cần nhiều nước để leo giàn", description_en: "Needs plenty of water for climbing" },
  
  // Herbs (Gia vị)
  { id: "basil", name_vi: "Húng quế", name_en: "Basil", group: "Herbs", Kc: 0.85, water_need: "Medium", description_vi: "Mùi thơm đặc trưng", description_en: "Characteristic aroma" },
  { id: "coriander", name_vi: "Rau mùi", name_en: "Coriander", group: "Herbs", Kc: 0.8, water_need: "Medium", description_vi: "Dễ trồng trong chậu", description_en: "Easy to grow in pots" },
  { id: "perilla", name_vi: "Tía tô", name_en: "Perilla", group: "Herbs", Kc: 0.85, water_need: "Medium", description_vi: "Công dụng dược liệu cao", description_en: "High medicinal value" },
  { id: "green-onion", name_vi: "Hành lá", name_en: "Green Onion", group: "Herbs", Kc: 0.9, water_need: "Medium", description_vi: "Cần tưới nước đều đặn", description_en: "Needs regular watering" },
  { id: "vietnamese-coriander", name_vi: "Rau răm", name_en: "Vietnamese Coriander", group: "Herbs", Kc: 0.8, water_need: "High", description_vi: "Chịu ẩm cực tốt", description_en: "Excellent moisture tolerance" },
  
  // Flower
  { id: "rose", name_vi: "Hoa hồng", name_en: "Rose", group: "Flower", Kc: 1.1, water_need: "High", description_vi: "Cần dinh dưỡng và nước cao", description_en: "High nutrient and water needs" },
  { id: "chrysanthemum", name_vi: "Hoa cúc", name_en: "Chrysanthemum", group: "Flower", Kc: 1.0, water_need: "Medium", description_vi: "Bền màu và dễ chăm", description_en: "Colorfast and easy care" },
  { id: "petunia", name_vi: "Dạ yến thảo", name_en: "Petunia", group: "Flower", Kc: 1.1, water_need: "High", description_vi: "Hoa nở rộ khi đủ nước", description_en: "Blooms profusely with enough water" },
  { id: "bougainvillea", name_vi: "Hoa giấy", name_en: "Bougainvillea", group: "Flower", Kc: 0.8, water_need: "Low", description_vi: "Chịu hạn và nắng gắt", description_en: "Drought and intense sun tolerant" },
  { id: "moss-rose", name_vi: "Hoa mười giờ", name_en: "Portulaca", group: "Flower", Kc: 0.9, water_need: "Low", description_vi: "Siêu chịu hạn", description_en: "Super drought tolerant" },
  
  // Ornamental
  { id: "pothos", name_vi: "Trầu bà", name_en: "Pothos", group: "Ornamental", Kc: 0.7, water_need: "Medium", description_vi: "Thanh lọc không khí", description_en: "Air purifying" },
  { id: "snake-plant", name_vi: "Lưỡi hổ", name_en: "Snake Plant", group: "Ornamental", Kc: 0.6, water_need: "Low", description_vi: "Ít cần chăm sóc", description_en: "Low maintenance" },
  { id: "zamioculcas", name_vi: "Kim tiền", name_en: "ZZ Plant", group: "Ornamental", Kc: 0.65, water_need: "Low", description_vi: "Phong thủy tốt", description_en: "Good feng shui" },
  { id: "parlor-palm", name_vi: "Cau tiểu trâm", name_en: "Dwarf Areca", group: "Ornamental", Kc: 0.75, water_need: "Medium", description_vi: "Ưa bóng râm", description_en: "Shade loving" },
  { id: "dracaena", name_vi: "Phát tài", name_en: "Fortune Plant", group: "Ornamental", Kc: 0.7, water_need: "Medium", description_vi: "Dễ trồng nội thất", description_en: "Easy indoor growth" },
  
  // Succulent
  { id: "cactus", name_vi: "Xương rồng", name_en: "Cactus", group: "Succulent", Kc: 0.3, water_need: "Very Low", description_vi: "Tránh tưới quá nhiều", description_en: "Avoid overwatering" },
  { id: "succulent", name_vi: "Sen đá", name_en: "Echeveria", group: "Succulent", Kc: 0.3, water_need: "Very Low", description_vi: "Cần nắng và thoáng gió", description_en: "Needs sun and ventilation" },
  { id: "aloe-vera", name_vi: "Nha đam", name_en: "Aloe Vera", group: "Succulent", Kc: 0.4, water_need: "Low", description_vi: "Mọng nước và hữu ích", description_en: "Succulent and useful" },
  { id: "haworthia", name_vi: "Sò đo", name_en: "Haworthia", group: "Succulent", Kc: 0.25, water_need: "Very Low", description_vi: "Họa tiết sọc trắng", description_en: "White striped pattern" },
];

const POT_COEFFICIENTS: Record<string, number> = {
  plastic: 1.0,
  ceramic: 0.9,
  clay: 1.1,
  biopot: 0.65
};

// --- API Routes ---

app.get('/api/plants', (req, res) => {
  const { group } = req.query;
  if (group) {
    return res.json(plants.filter(p => p.group === group));
  }
  res.json(plants);
});

app.get('/api/weather', async (req, res) => {
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
    if (lat && lon) {
      url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`;
    } else {
      url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&appid=${apiKey}`;
    }
    const response = await axios.get(url);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch weather data' });
  }
});

app.get('/api/geo', async (req, res) => {
  const { q } = req.query;
  const apiKey = process.env.OPENWEATHER_API_KEY;

  const qStr = q as string;
  if (!qStr || qStr.length < 2) return res.json([]);

  if (!apiKey || apiKey === 'MY_OPENWEATHER_API_KEY') {
    // Return mock data if no API key
    const mocks = [
      { name: 'Ho Chi Minh City', country: 'VN', state: 'Ho Chi Minh City' },
      { name: 'Hanoi', country: 'VN', state: 'Hanoi' },
      { name: 'Da Nang', country: 'VN', state: 'Da Nang' },
      { name: 'London', country: 'GB' },
      { name: 'New York', country: 'US', state: 'New York' }
    ];
    return res.json(mocks.filter(m => m.name.toLowerCase().includes((q as string).toLowerCase())));
  }

  try {
    const response = await axios.get(`https://api.openweathermap.org/geo/1.0/direct?q=${q}&limit=5&appid=${apiKey}`);
    const suggestions = response.data;

    // Filter suggestions by verifying weather data availability
    const verifiedSuggestions = await Promise.all(
      suggestions.map(async (s: any) => {
        try {
          // Check if weather data is reachable for this lat/lon
          const wRes = await axios.get(`https://api.openweathermap.org/data/2.5/weather?lat=${s.lat}&lon=${s.lon}&appid=${apiKey}`);
          const w = wRes.data;
          
          // Verify required fields exist and are valid
          if (w && w.main && typeof w.main.temp !== 'undefined' && 
              typeof w.main.humidity !== 'undefined' && 
              w.wind && typeof w.wind.speed !== 'undefined') {
            return s;
          }
          return null;
        } catch (e) {
          return null; // Skip if weather fetch fails for this suggestion
        }
      })
    );

    res.json(verifiedSuggestions.filter(s => s !== null));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch location suggestions' });
  }
});

app.post('/api/calculate', (req, res) => {
  const { plantId, pot_type, Tmax, Tmin, humidity, wind, time = 5 } = req.body;
  const plant = plants.find(p => p.id === plantId);
  
  if (!plant) return res.status(404).json({ error: 'Plant not found' });

  const performCalculation = (k_pot: number) => {
    // Step 1: Calculate Tmean
    const Tmean = (Tmax + Tmin) / 2;

    // Step 2: Base Evaporation (More responsive Penman-Monteith approximation)
    // Weight humidity and wind more realistically
    const vpd = (100 - humidity) / 100; // Simplified vapor pressure deficit factor
    let ET0 = (0.2 * Tmean) + (0.5 * wind) + (2.5 * vpd);
    
    // Solar/Heat boost
    if (Tmax > 30) {
      ET0 += (Tmax - 30) * 0.15;
    }
    
    // Step 3: Plant Water Demand
    const Kc = plant.Kc || 1.0;
    let ETc = ET0 * Kc;

    // Step 5: Environmental stress factor
    let stress = 1.0;
    // Temperature stress (exponential-ish boost at high temp)
    if (Tmean > 28) {
      stress += Math.pow((Tmean - 28) / 10, 2) * 0.5;
    }
    // Wind stress
    stress += wind * 0.05;
    
    // Step 6: Final Water Loss (% per day)
    let v_loss = ETc * k_pot * stress;
    
    // Adjustment for pot material specifics (clay is porous)
    if (pot_type === 'clay') {
       v_loss *= 1.15;
    }

    // Clamp v_loss to a wider, more realistic range (1% to 15% per day)
    v_loss = Math.max(1.0, Math.min(v_loss, 15.0));

    // Step 7: Refill threshold calculation
    // High Kc plants need more water and have higher threshold
    let refill_threshold = 50; 
    if (Kc >= 1.0) refill_threshold = 70;
    else if (Kc >= 0.7) refill_threshold = 60;
    else if (Kc < 0.4) refill_threshold = 30; // Succulents can go low
    
    const usable_water = 100 - refill_threshold;

    // Step 8: Days to rewater
    const days_to_rewater = usable_water / v_loss;

    return { 
      v_loss, 
      moisture: Math.max(0, 100 - v_loss * time), 
      days_to_rewater,
      debug: {
        ET0,
        ETc,
        stress,
        usable_water,
        refill_threshold
      }
    };
  };

  const selected_pot_data = performCalculation(POT_COEFFICIENTS[pot_type] || 1.0);
  const biopot_data = performCalculation(POT_COEFFICIENTS['biopot']);

  // Debug Log
  console.log('Calculation results:', {
    plant: plant.name_en,
    Tmax, Tmin, humidity, wind,
    v_loss_normal: selected_pot_data.v_loss,
    v_loss_biopot: biopot_data.v_loss
  });

  // Comparison improvement logic based on evaporation rate and days to rewater
  // Extension: how much longer moisture is retained (%)
  const improvement = selected_pot_data.v_loss > biopot_data.v_loss && biopot_data.v_loss > 0
    ? Math.round(((selected_pot_data.v_loss / biopot_data.v_loss) - 1) * 100)
    : 0;

  // Generate chart data for 10 days
  const chart_data = Array.from({ length: 11 }).map((_, i) => ({
    day: i,
    normal: Math.max(0, 100 - selected_pot_data.v_loss * i),
    biopot: Math.max(0, 100 - biopot_data.v_loss * i)
  }));

  res.json({
    selected_pot: { type: pot_type, ...selected_pot_data },
    biopot: biopot_data,
    comparison: {
      water_saved_percent: improvement,
      message_vi: `BioPot giúp kéo dài thời gian cần tưới lại thêm ${improvement}%`,
      message_en: `BioPot extends rewatering time by ${improvement}%`
    },
    chart_data
  });
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
