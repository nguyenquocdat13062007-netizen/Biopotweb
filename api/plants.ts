import type { VercelRequest, VercelResponse } from '@vercel/node';

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

export default function handler(req: VercelRequest, res: VercelResponse) {
  // Allow CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { group } = req.query;
  if (group) {
    return res.json(plants.filter(p => p.group === group));
  }
  return res.json(plants);
}
