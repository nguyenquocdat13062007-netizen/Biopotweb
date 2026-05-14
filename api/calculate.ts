import type { VercelRequest, VercelResponse } from '@vercel/node';

const plants = [
  { id: "water-spinach", name_vi: "Rau muống", name_en: "Water Spinach", group: "Leafy", Kc: 1.05, water_need: "High" },
  { id: "lettuce", name_vi: "Xà lách", name_en: "Lettuce", group: "Leafy", Kc: 1.0, water_need: "Medium" },
  { id: "mustard-greens", name_vi: "Cải xanh", name_en: "Mustard Greens", group: "Leafy", Kc: 1.1, water_need: "High" },
  { id: "amaranth", name_vi: "Rau dền", name_en: "Amaranth", group: "Leafy", Kc: 1.05, water_need: "Medium" },
  { id: "malabar-spinach", name_vi: "Mồng tơi", name_en: "Malabar Spinach", group: "Leafy", Kc: 1.1, water_need: "High" },
  { id: "basil", name_vi: "Húng quế", name_en: "Basil", group: "Herbs", Kc: 0.85, water_need: "Medium" },
  { id: "coriander", name_vi: "Rau mùi", name_en: "Coriander", group: "Herbs", Kc: 0.8, water_need: "Medium" },
  { id: "perilla", name_vi: "Tía tô", name_en: "Perilla", group: "Herbs", Kc: 0.85, water_need: "Medium" },
  { id: "green-onion", name_vi: "Hành lá", name_en: "Green Onion", group: "Herbs", Kc: 0.9, water_need: "Medium" },
  { id: "vietnamese-coriander", name_vi: "Rau răm", name_en: "Vietnamese Coriander", group: "Herbs", Kc: 0.8, water_need: "High" },
  { id: "rose", name_vi: "Hoa hồng", name_en: "Rose", group: "Flower", Kc: 1.1, water_need: "High" },
  { id: "chrysanthemum", name_vi: "Hoa cúc", name_en: "Chrysanthemum", group: "Flower", Kc: 1.0, water_need: "Medium" },
  { id: "petunia", name_vi: "Dạ yến thảo", name_en: "Petunia", group: "Flower", Kc: 1.1, water_need: "High" },
  { id: "bougainvillea", name_vi: "Hoa giấy", name_en: "Bougainvillea", group: "Flower", Kc: 0.8, water_need: "Low" },
  { id: "moss-rose", name_vi: "Hoa mười giờ", name_en: "Portulaca", group: "Flower", Kc: 0.9, water_need: "Low" },
  { id: "pothos", name_vi: "Trầu bà", name_en: "Pothos", group: "Ornamental", Kc: 0.7, water_need: "Medium" },
  { id: "snake-plant", name_vi: "Lưỡi hổ", name_en: "Snake Plant", group: "Ornamental", Kc: 0.6, water_need: "Low" },
  { id: "zamioculcas", name_vi: "Kim tiền", name_en: "ZZ Plant", group: "Ornamental", Kc: 0.65, water_need: "Low" },
  { id: "parlor-palm", name_vi: "Cau tiểu trâm", name_en: "Dwarf Areca", group: "Ornamental", Kc: 0.75, water_need: "Medium" },
  { id: "dracaena", name_vi: "Phát tài", name_en: "Fortune Plant", group: "Ornamental", Kc: 0.7, water_need: "Medium" },
  { id: "cactus", name_vi: "Xương rồng", name_en: "Cactus", group: "Succulent", Kc: 0.3, water_need: "Very Low" },
  { id: "succulent", name_vi: "Sen đá", name_en: "Echeveria", group: "Succulent", Kc: 0.3, water_need: "Very Low" },
  { id: "aloe-vera", name_vi: "Nha đam", name_en: "Aloe Vera", group: "Succulent", Kc: 0.4, water_need: "Low" },
  { id: "haworthia", name_vi: "Sò đo", name_en: "Haworthia", group: "Succulent", Kc: 0.25, water_need: "Very Low" },
];

const POT_COEFFICIENTS: Record<string, number> = {
  plastic: 1.0,
  ceramic: 0.9,
  clay: 1.1,
  biopot: 0.65
};

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { plantId, pot_type, Tmax, Tmin, humidity, wind, time = 5 } = req.body;

  const plant = plants.find(p => p.id === plantId);
  if (!plant) return res.status(404).json({ error: 'Plant not found' });

  const performCalculation = (k_pot: number) => {
    const Tmean = (Tmax + Tmin) / 2;

    let ET0 = (0.22 * Tmean) + (0.035 * wind * 10) + (0.025 * (100 - humidity));
    if (Tmean > 32) ET0 += 0.6;
    ET0 = Math.max(2.5, Math.min(ET0, 6.5));

    const Kc = plant.Kc || 1.0;
    let ETc = ET0 * Kc;

    let stress = 1;
    stress += 0.015 * (Tmean - 25);
    if (humidity < 65) stress += 0.012 * (65 - humidity);
    stress += 0.035 * wind;
    stress = Math.max(0.85, Math.min(stress, 1.35));

    let v_loss = ETc * k_pot * stress;
    if (Kc >= 1.0) v_loss *= 1.25;
    v_loss = Math.max(3.5, Math.min(v_loss, 9));

    let refill_threshold = 45;
    if (Kc >= 1.0) refill_threshold = 75;
    else if (Kc >= 0.7) refill_threshold = 65;

    const usable_water = 100 - refill_threshold;
    const days_to_rewater = usable_water / v_loss;

    return {
      v_loss,
      moisture: Math.max(0, 100 - v_loss * time),
      days_to_rewater,
      debug: { ET0, ETc, stress, usable_water, refill_threshold }
    };
  };

  const selected_pot_data = performCalculation(POT_COEFFICIENTS[pot_type] || 1.0);
  const biopot_data = performCalculation(POT_COEFFICIENTS['biopot']);

  const improvement = selected_pot_data.v_loss > biopot_data.v_loss && biopot_data.v_loss > 0
    ? Math.round(((selected_pot_data.v_loss / biopot_data.v_loss) - 1) * 100)
    : 0;

  const chart_data = Array.from({ length: 11 }).map((_, i) => ({
    day: i,
    normal: Math.max(0, 100 - selected_pot_data.v_loss * i),
    biopot: Math.max(0, 100 - biopot_data.v_loss * i)
  }));

  return res.json({
    selected_pot: { type: pot_type, ...selected_pot_data },
    biopot: biopot_data,
    comparison: {
      water_saved_percent: improvement,
      message_vi: `BioPot giúp kéo dài thời gian cần tưới lại thêm ${improvement}%`,
      message_en: `BioPot extends rewatering time by ${improvement}%`
    },
    chart_data
  });
}
