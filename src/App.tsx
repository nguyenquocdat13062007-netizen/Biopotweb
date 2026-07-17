import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Leaf, 
  Droplets, 
  Wind, 
  Settings, 
  ChevronDown, 
  Info, 
  Zap, 
  Plus, 
  Minus, 
  Globe,
  Flower2,
  Activity,
  Check,
  Home,
  TestTube2,
  Calendar,
  MapPin,
  Thermometer,
  Menu,
  X,
  Moon,
  Sun
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import handImg from './BIO_IMAGE/hand.jpg';
import humanImg from './BIO_IMAGE/Human.jpg';
import leafImg from './BIO_IMAGE/leaf.jpg';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import './i18n';
import CameraScanner from './CameraScanner';
import ErrorBoundary from './ErrorBoundary';

// Constants
const POT_TYPES = [
  { id: 'plastic', key: 'pot_plastic' },
  { id: 'ceramic', key: 'pot_ceramic' },
  { id: 'clay', key: 'pot_clay' },
  { id: 'biopot', key: 'pot_biopot' }
];

const PLANT_GROUPS = [
  { id: 'Leafy', key: 'leafy' },
  { id: 'Herbs', key: 'herbs' },
  { id: 'Flower', key: 'flower' },
  { id: 'Ornamental', key: 'ornamental' },
  { id: 'Succulent', key: 'succulent' }
];

const DEFAULT_CHART_DATA = Array.from({ length: 11 }).map((_, i) => ({
  day: i,
  normal: 100,
  biopot: 100,
  name: `${i}d`
}));

type AppView = 'home' | 'realtime' | 'simulation' | 'camera';

const CustomNumberInput = ({
  label,
  value,
  unit,
  onChange,
  min = 0,
  max = 100,
  step = 1,
}: {
  label: string;
  value: string;
  unit: string;
  onChange: React.Dispatch<React.SetStateAction<string>>;
  min?: number;
  max?: number;
  step?: number;
}) => {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const repeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup khi unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (repeatRef.current) clearInterval(repeatRef.current);
    };
  }, []);

  const handleIncrement = () => {
    onChange((prev: string) => {
      const next = (parseFloat(prev) || 0) + step;
      return String(Math.min(max, parseFloat(next.toFixed(2))));
    });
  };

  const handleDecrement = () => {
    onChange((prev: string) => {
      const next = (parseFloat(prev) || 0) - step;
      return String(Math.max(min, parseFloat(next.toFixed(2))));
    });
  };

  const startContinuousChange = (action: () => void) => {
    action(); // Thực hiện ngay lập tức lần đầu
    // Sau 450ms mới bắt đầu lặp lại
    timerRef.current = setTimeout(() => {
      repeatRef.current = setInterval(action, 100);
    }, 450);
  };

  const stopContinuousChange = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (repeatRef.current) {
      clearInterval(repeatRef.current);
      repeatRef.current = null;
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === "" || val === "-" || /^-?\d*\.?\d*$/.test(val)) {
      onChange(val);
    }
  };

  const handleBlur = () => {
    const parsed = parseFloat(value);
    if (isNaN(parsed)) {
      onChange("0");
    } else {
      // Clamp khi blur
      onChange(String(Math.min(max, Math.max(min, parsed))));
    }
  };

  return (
    <div className="space-y-3">
      <label className="text-xs font-black uppercase tracking-[0.2em] text-[#1b3022] ml-4 flex items-center gap-3">
        <div className="w-2 h-2 rounded-full bg-[#81a68d]" />
        {label}
      </label>
      <div className="flex items-center gap-2 sm:gap-4">
        <button
          type="button"
          onMouseDown={() => startContinuousChange(handleDecrement)}
          onMouseUp={stopContinuousChange}
          onMouseLeave={stopContinuousChange}
          onTouchStart={(e) => { e.preventDefault(); startContinuousChange(handleDecrement); }}
          onTouchEnd={stopContinuousChange}
          className="w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center bg-white rounded-2xl sm:rounded-3xl border border-slate-100 shadow-sm hover:shadow-md text-[#1b3022] transition-all active:scale-90 touch-none select-none"
        >
          <Minus size={20} className="stroke-[3] sm:size-6" />
        </button>

        <div className="flex-1 relative h-16 sm:h-20">
          <input
            type="text"
            value={value}
            onChange={handleInputChange}
            onBlur={handleBlur}
            className="w-full h-full px-6 sm:px-10 bg-white/40 border-2 border-slate-50/50 focus:border-primary/20 focus:bg-white rounded-[1.5rem] sm:rounded-[2.5rem] outline-none transition-all font-black text-xl sm:text-3xl text-center tabular-nums shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]"
          />
          <span className="absolute right-4 sm:right-8 top-1/2 -translate-y-1/2 text-[8px] sm:text-[10px] font-black text-slate-300 pointer-events-none uppercase tracking-tighter">
            {unit}
          </span>
        </div>

        <button
          type="button"
          onMouseDown={() => startContinuousChange(handleIncrement)}
          onMouseUp={stopContinuousChange}
          onMouseLeave={stopContinuousChange}
          onTouchStart={(e) => { e.preventDefault(); startContinuousChange(handleIncrement); }}
          onTouchEnd={stopContinuousChange}
          className="w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center bg-white rounded-2xl sm:rounded-3xl border border-slate-100 shadow-sm hover:shadow-md text-[#2e7d32] transition-all active:scale-90 touch-none select-none"
        >
          <Plus size={20} className="stroke-[3] sm:size-6" />
        </button>
      </div>
    </div>
  );
};

  const CustomDropdown = ({ 
    label, 
    value, 
    options, 
    isOpen, 
    setIsOpen, 
    onSelect, 
    placeholder,
    icon: Icon 
  }: any) => (
    <div className="relative w-full space-y-2">
      <label className="text-[10px] font-black uppercase tracking-widest text-[#2e7d32] ml-4 flex items-center gap-2">
        <Icon size={12} className="text-[#2e7d32]" /> {label}
      </label>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-6 py-4 rounded-2xl border-2 transition-all flex items-center justify-between text-left ${
          isOpen ? 'border-[#2e7d32] bg-white ring-4 ring-green-100' : 'border-transparent bg-white/50 hover:bg-white transition-all'
        }`}
      >
        <span className={`font-bold ${value ? 'text-slate-900' : 'text-slate-400'}`}>
          {value || placeholder}
        </span>
        <ChevronDown size={18} className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="absolute z-[100] w-full mt-2 bg-white rounded-[1.5rem] shadow-2xl border border-green-50 overflow-hidden max-h-[250px] overflow-y-auto"
          >
            {options.map((opt: any) => (
              <button
                key={opt.id}
                onClick={() => {
                  onSelect(opt.id);
                  setIsOpen(false);
                }}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-green-50 transition-colors text-left"
              >
                <span className={`font-bold ${value === opt.label ? 'text-[#2e7d32]' : 'text-slate-600'}`}>
                  {opt.label}
                </span>
                {value === opt.label && <Check size={16} className="text-[#2e7d32]" />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

function App() {
  const { t, i18n } = useTranslation();
  const [view, setView] = useState<AppView>('home');
  const [darkMode, setDarkMode] = useState(false);
  
  const [resetKey, setResetKey] = useState(0);

  // Location state
  const [location, setLocation] = useState('Ho Chi Minh City, VN');
  const [selectedCoords, setSelectedCoords] = useState<{lat: number, lon: number} | null>({lat: 10.7626, lon: 106.6601}); // HCM default
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Logic states
  const [selectedGroup, setSelectedGroup] = useState<string | null>('Leafy');
  const [selectedPlantId, setSelectedPlantId] = useState<string | null>(null);
  const [selectedPotId, setSelectedPotId] = useState<string | null>('plastic');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<any>(null);
  const [weather, setWeather] = useState<any>(null);
  const [plants, setPlants] = useState<any[]>([]);

  // Simulation controls
  const [manualTemp, setManualTemp] = useState("0");
  const [manualHumidity, setManualHumidity] = useState("0");
  const [manualWind, setManualWind] = useState("0");

  // Dropdown states
  const [isGroupOpen, setIsGroupOpen] = useState(false);
  const [isPlantOpen, setIsPlantOpen] = useState(false);
  const [isPotOpen, setIsPotOpen] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const isSelectionMade = useRef(false);

  useEffect(() => {
    const fetchPlants = async () => {
      try {
        const res = await axios.get('/api/plants');
        setPlants(res.data);
      } catch (e) {
        console.error("Failed to load plants", e);
      }
    };
    fetchPlants();

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsGroupOpen(false);
        setIsPlantOpen(false);
        setIsPotOpen(false);
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Location Autocomplete Effect
  useEffect(() => {
    if (isSelectionMade.current) {
      isSelectionMade.current = false;
      setSuggestions([]);
      return;
    }

    if (location.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await axios.get(`/api/geo?q=${encodeURIComponent(location)}`);
        setSuggestions(res.data);
      } catch (err) {
        console.error("Geo fetch error:", err);
      } finally {
        setIsSearching(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [location]);

  const handleResetState = () => {
    setResults(null);
    setSelectedGroup(null);
    setSelectedPlantId(null);
    setSelectedPotId(null);
    setLocation('Ho Chi Minh City, VN');
    setSelectedCoords({lat: 10.7626, lon: 106.6601});
    setManualTemp("0");
    setManualHumidity("0");
    setManualWind("0");
    setWeather(null);
    setError(null);
    setLoading(false);
    setResetKey(prev => prev + 1);
  };

  const handleViewChange = (newView: AppView) => {
    handleResetState();
    setView(newView);
    if (newView === 'home') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const fetchDataAndCalculate = async () => {
    if (!selectedPlantId || !selectedPotId) return;
    setLoading(true);
    setError(null);
    // Keep existing results while loading for a smoother update
    try {
      let currentTmax, currentTmin, currentHumidity, currentWind;

      if (view === 'realtime') {
        try {
          let url = `/api/weather?city=${encodeURIComponent(location)}`;
          if (selectedCoords) {
             url = `/api/weather?lat=${selectedCoords.lat}&lon=${selectedCoords.lon}`;
          }
          const weatherRes = await axios.get(url);
          const w = weatherRes.data;
          
          // Use temp as fallback for Tmax/Tmin if they are identical or weird
          currentTmax = w.main.temp_max;
          currentTmin = w.main.temp_min;
          currentHumidity = w.main.humidity;
          currentWind = w.wind.speed;
          
          setWeather(w);
        } catch (err: any) {
          setError(t('weather_error') || "Could not find weather for this location.");
          setLoading(false);
          return;
        }
      } else {
        const tVal = parseFloat(manualTemp) || 0;
        currentTmax = tVal;
        currentTmin = tVal; // In simulation, assume Tmax = Tmin = current temp
        currentHumidity = parseFloat(manualHumidity) || 0;
        currentWind = parseFloat(manualWind) || 0;
      }

      const calcRes = await axios.post('/api/calculate', {
        plantId: selectedPlantId,
        pot_type: selectedPotId,
        Tmax: currentTmax,
        Tmin: currentTmin,
        humidity: currentHumidity,
        wind: currentWind,
        time: 0
      });
      
      setResults(calcRes.data);
    } catch (error) {
      console.error("Calculation Error:", error);
      // alert or show error if needed
    } finally {
      setLoading(false);
    }
  };

  const filteredPlants = useMemo(() => {
    return plants.filter(p => p.group === selectedGroup);
  }, [plants, selectedGroup]);

  const toggleLanguage = () => {
    const nextLng = i18n.language === 'en' ? 'vi' : 'en';
    i18n.changeLanguage(nextLng);
  };

  const processedChartData = useMemo(() => {
    if (!results || !results.chart_data) {
       return DEFAULT_CHART_DATA.map(d => ({
         ...d,
         name: `${d.day}${t('days_unit')}`,
         [t(POT_TYPES.find(p => p.id === selectedPotId)?.key || 'pot_plastic')]: 100,
         [t('pot_biopot')]: 100,
       }));
    }
    const potLabel = t(POT_TYPES.find(p => p.id === selectedPotId)?.key || 'pot_plastic');
    const biopotLabel = t('pot_biopot');

    return results.chart_data.map((d: any) => ({
      name: `${d.day}${t('days_unit')}`,
      [potLabel]: Number(d.normal.toFixed(1)),
      [biopotLabel]: Number(d.biopot.toFixed(1)),
    }));
  }, [results, t, selectedPotId]);

  const selectedPlant = useMemo(() => plants.find(p => p.id === selectedPlantId), [plants, selectedPlantId]);

//////

  return (
    <div className={`min-h-screen font-sans selection:bg-green-200 ${darkMode ? 'bg-[#0d1117] text-slate-100' : 'bg-beige text-slate-800'}`}>
      {/* Navbar */}
      <nav className={`fixed top-0 w-full z-[100] backdrop-blur-md border-b flex justify-between items-center px-4 sm:px-6 md:px-12 py-3 sm:py-5 ${darkMode ? 'bg-[#0d1117]/90 border-white/10' : 'bg-white/80 border-white/20'}`}>
        <button 
          onClick={() => handleViewChange('home')}
          className="flex items-center gap-2 sm:gap-3 hover:opacity-80 transition-opacity"
        >
          <Leaf className="text-primary" size={24} />
          <h1 className="text-xl sm:text-2xl font-black tracking-tighter text-primary">BIOPOT</h1>
        </button>

        {/* Desktop Nav */}
        <div className="hidden lg:flex items-center gap-2">
          <button 
            onClick={() => handleViewChange('home')}
            className={`px-8 py-3 rounded-2xl font-bold text-sm transition-all flex items-center gap-2 ${
                view === 'home' ? 'bg-primary text-white shadow-lg' : 'text-slate-500 hover:text-primary hover:bg-white/50'
            }`}
          >
            <Home size={16} />
            {t('home')}
          </button>
          <button 
            onClick={() => handleViewChange('realtime')}
            className={`px-8 py-3 rounded-2xl font-bold text-sm transition-all flex items-center gap-2 ${
                view === 'realtime' ? 'bg-primary text-white shadow-lg' : 'text-slate-500 hover:text-primary hover:bg-white/50'
            }`}
          >
            <Leaf size={16} />
            {t('realtime_nav')}
          </button>
          <button 
            onClick={() => handleViewChange('simulation')}
            className={`px-8 py-3 rounded-2xl font-bold text-sm transition-all flex items-center gap-2 ${
                view === 'simulation' ? 'bg-primary text-white shadow-lg' : 'text-slate-500 hover:text-primary hover:bg-white/50'
            }`}
          >
            <TestTube2 size={16} />
            {t('simulation_nav')}
          </button>
          <button 
            onClick={() => handleViewChange('camera')}
            className={`px-8 py-3 rounded-2xl font-bold text-sm transition-all flex items-center gap-2 ${
                view === 'camera' ? 'bg-primary text-white shadow-lg' : 'text-slate-500 hover:text-primary hover:bg-white/50'
            }`}
          >
            📷 Quét AI Vision
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Dark mode toggle */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-3 rounded-xl sm:rounded-2xl border font-bold text-xs sm:text-sm transition-all shadow-sm ${
              darkMode
                ? 'bg-[#1a2332] border-white/10 text-yellow-400 hover:bg-[#243044]'
                : 'bg-white border-white text-slate-700 hover:bg-green-50'
            }`}
          >
            {darkMode ? <Sun size={16} className="text-yellow-400" /> : <Moon size={16} className="text-slate-500" />}
          </button>

          {/* Language toggle */}
          <button 
            onClick={toggleLanguage}
            className={`flex items-center gap-2 sm:gap-3 px-3 sm:px-6 py-2 sm:py-3 rounded-xl sm:rounded-2xl border font-bold text-xs sm:text-sm transition-all shadow-sm ${
              darkMode
                ? 'bg-[#1a2332] border-white/10 text-slate-200 hover:bg-[#243044]'
                : 'bg-white border-white text-slate-700 hover:bg-green-50'
            }`}
          >
            <Globe size={16} className="text-primary" />
            <span className="hidden xs:inline">{i18n.language === 'en' ? 'English' : 'Tiếng Việt'}</span>
            <span className="xs:hidden">{i18n.language === 'en' ? 'EN' : 'VI'}</span>
            <ChevronDown size={12} className="opacity-30" />
          </button>
        </div>
      </nav>

      {/* Mobile Bottom Navigation */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-[100] bg-white/90 backdrop-blur-xl border-t border-slate-100 px-6 py-3 pb-safe-offset-2 flex justify-around items-center rounded-t-[2.5rem] shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
        <button 
          onClick={() => handleViewChange('home')}
          className={`flex flex-col items-center gap-1 p-2 rounded-2xl transition-all ${
            view === 'home' ? 'text-primary' : 'text-slate-400'
          }`}
        >
          <Home size={22} className={view === 'home' ? 'fill-primary/20' : ''} />
          <span className="text-[10px] font-black uppercase tracking-widest">{t('home')}</span>
          {view === 'home' && <motion.div layoutId="nav-pill" className="w-1 h-1 rounded-full bg-primary mt-0.5" />}
        </button>
        <button 
          onClick={() => handleViewChange('realtime')}
          className={`flex flex-col items-center gap-1 p-2 rounded-2xl transition-all ${
            view === 'realtime' ? 'text-primary' : 'text-slate-400'
          }`}
        >
          <Globe size={22} className={view === 'realtime' ? 'fill-primary/20' : ''} />
          <span className="text-[10px] font-black uppercase tracking-widest">{t('realtime_nav')}</span>
          {view === 'realtime' && <motion.div layoutId="nav-pill" className="w-1 h-1 rounded-full bg-primary mt-0.5" />}
        </button>
        <button 
          onClick={() => handleViewChange('simulation')}
          className={`flex flex-col items-center gap-1 p-2 rounded-2xl transition-all ${
            view === 'simulation' ? 'text-primary' : 'text-slate-400'
          }`}
        >
          <TestTube2 size={22} className={view === 'simulation' ? 'fill-primary/20' : ''} />
          <span className="text-[10px] font-black uppercase tracking-widest">{t('simulation_nav')}</span>
          {view === 'simulation' && <motion.div layoutId="nav-pill" className="w-1 h-1 rounded-full bg-primary mt-0.5" />}
        </button>
        <button 
          onClick={() => handleViewChange('camera')}
          className={`flex flex-col items-center gap-1 p-2 rounded-2xl transition-all ${
            view === 'camera' ? 'text-primary' : 'text-slate-400'
          }`}
        >
          <span style={{ fontSize: 22 }}>📷</span>
          <span className="text-[10px] font-black uppercase tracking-widest">AI Scan</span>
          {view === 'camera' && <motion.div layoutId="nav-pill" className="w-1 h-1 rounded-full bg-primary mt-0.5" />}
        </button>
      </div>

      <AnimatePresence mode="wait">
        {view === 'camera' ? (
          // Camera is rendered in the fixed overlay below — nothing needed here
          <motion.div key="camera-placeholder" initial={{ opacity: 0 }} animate={{ opacity: 0 }} exit={{ opacity: 0 }} />
        ) : view === 'home' ? (
          <motion.section
            key="home"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative pt-24 sm:pt-40 pb-12 sm:pb-20 px-4 sm:px-6 max-w-[1400px] mx-auto min-h-screen flex flex-col justify-center"
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 items-center mb-12 sm:mb-16 relative">
              <div className="space-y-6 sm:space-y-10 z-10 text-center lg:text-left">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100/50 rounded-full">
                  <Leaf size={14} className="text-primary" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary">{t('evolution_tag')}</span>
                </div>
                <h2 className="text-4xl sm:text-5xl md:text-7xl font-black text-[#1b3022] tracking-[0.1em] sm:tracking-[0.15em] leading-[1.1] uppercase">
                    {t('welcome_title').split('BIOPOT')[0]} <br /> <span className="text-primary">BIOPOT</span>
                </h2>
                <div className="space-y-6 max-w-xl mx-auto lg:mx-0">
                    <p className="text-lg sm:text-xl text-slate-700 font-medium leading-relaxed opacity-80 px-4 sm:px-0">
                        {t('welcome_desc')}
                    </p>
                </div>
                
                <div className="relative pt-4">
                  <motion.div
                     initial={{ rotate: -15 }}
                     animate={{ rotate: 15 }}
                     transition={{ duration: 5, repeat: Infinity, alternate: true, ease: "easeInOut" }}
                     className="absolute -top-10 left-40 opacity-30 -z-10"
                  >
                    <Leaf size={120} className="text-primary" fill="currentColor" />
                  </motion.div>
                </div>
              </div>

              {/* Compositional Images in Circles/Organic shapes - MATCHING THE REF IMAGE */}
              <div className="relative h-[400px] sm:h-[450px] lg:h-[650px] w-full flex items-center justify-center lg:justify-end overflow-hidden lg:overflow-visible scale-90 sm:scale-100">
                 {/* Main Organic Shape (Planting Hands) - Parallel to text */}
                 <div className="absolute right-1/2 translate-x-1/2 lg:translate-x-0 lg:right-0 top-1/2 -translate-y-1/2 w-[350px] sm:w-[550px] h-[350px] sm:h-[550px] z-10">
                   {/* ... content ... */}
                   <div 
                      className="w-full h-full border-[6px] sm:border-[10px] border-white shadow-2xl shadow-green-900/10 overflow-hidden"
                      style={{ 
                        borderRadius: '30% 70% 70% 30% / 30% 30% 70% 70%' 
                      }}
                    >
                      <img 
                        src={handImg} 
                        alt="Planting" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                 </div>
                 
                 {/* Floating Bubble 1 (Woman Gardener) - Higher up */}
                 <div className="absolute -top-4 sm:top-10 -right-4 sm:right-4 w-[160px] sm:w-[240px] h-[160px] sm:h-[240px] rounded-full border-[6px] sm:border-[8px] border-white shadow-2xl overflow-hidden z-20">
                    <img 
                      src={humanImg} 
                      alt="Gardener" 
                      className="w-full h-full object-cover"
                    />
                 </div>

                 {/* Floating Bubble 2 (Seedling) - Centered-left of the main shape */}
                 <div className="absolute bottom-4 sm:bottom-1/4 left-0 sm:left-10 w-[140px] sm:w-[200px] h-[140px] sm:h-[200px] rounded-full border-[6px] sm:border-[8px] border-white shadow-2xl overflow-hidden z-20">
                    <img 
                      src={leafImg} 
                      alt="Seedling" 
                      className="w-full h-full object-cover"
                    />
                 </div>

                 {/* Organic Green Decoration */}
                 <div className="absolute -bottom-10 right-1/4 opacity-10 -z-10 rotate-12 scale-150">
                    <Leaf size={300} className="text-green-800" />
                 </div>
              </div>
            </div>

            {/* Feature Blocks at bottom - Parallel with images */}
            <div className="bg-white/95 backdrop-blur-xl p-3 sm:p-6 rounded-[2rem] sm:rounded-[2.5rem] border border-white shadow-[0_20px_50px_rgba(0,0,0,0.05)] flex flex-col md:flex-row items-stretch relative z-20 mx-2 sm:mx-4">
                <div className="flex-1 flex gap-4 sm:gap-5 p-4 sm:p-6 items-center">
                  <div className="p-3 sm:p-4 bg-[#f1f8e9] rounded-full flex-shrink-0 shadow-inner">
                    <Droplets className="text-[#33691e]" size={24} sm:size={32} />
                  </div>
                  <div className="space-y-0.5">
                    <h3 className="text-base sm:text-lg font-black text-[#1b3022] leading-tight">{t('feat1_title')}</h3>
                    <p className="text-[10px] sm:text-xs font-bold text-slate-500 leading-snug max-w-[200px]">{t('feat1_desc')}</p>
                  </div>
                </div>

                <div className="hidden md:block w-px bg-slate-100 my-6" />

                <div className="flex-1 flex gap-4 sm:gap-5 p-4 sm:p-6 items-center border-t border-slate-50 md:border-t-0">
                  <div className="p-3 sm:p-4 bg-[#f1f8e9] rounded-full flex-shrink-0 shadow-inner">
                    <Leaf className="text-[#33691e]" size={24} sm:size={32} fill="currentColor" />
                  </div>
                  <div className="space-y-0.5">
                    <h3 className="text-base sm:text-lg font-black text-[#1b3022] leading-tight">{t('feat2_title')}</h3>
                    <p className="text-[10px] sm:text-xs font-bold text-slate-500 leading-snug max-w-[200px]">{t('feat2_desc')}</p>
                  </div>
                </div>

                <div className="hidden md:block w-px bg-slate-100 my-6" />

                <div className="flex-1 flex gap-4 sm:gap-5 p-4 sm:p-6 items-center border-t border-slate-50 md:border-t-0">
                  <div className="p-3 sm:p-4 bg-[#f1f8e9] rounded-full flex-shrink-0 shadow-inner">
                    <Calendar className="text-[#33691e]" size={24} sm:size={32} />
                  </div>
                  <div className="space-y-0.5">
                    <h3 className="text-base sm:text-lg font-black text-[#1b3022] leading-tight">{t('feat3_title')}</h3>
                    <p className="text-[10px] sm:text-xs font-bold text-slate-500 leading-snug max-w-[200px]">{t('feat3_desc')}</p>
                  </div>
                </div>
            </div>
            
            <div className="mt-20 flex justify-center opacity-10">
                <Leaf size={400} className="rotate-45" />
            </div>
          </motion.section>
        ) : (
          <motion.main 
            key="calculator"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            className="max-w-[1400px] mx-auto px-4 sm:px-6 pt-24 sm:pt-40 pb-20 grid grid-cols-12 gap-6 sm:gap-12"
          >
            {/* INPUT PANEL */}
            <aside className="col-span-12 lg:col-span-4 space-y-6 sm:space-y-8" ref={dropdownRef}>
              <div className="bg-white/60 backdrop-blur-md p-6 sm:p-10 rounded-[2rem] sm:rounded-[3rem] shadow-2xl border border-white space-y-8 sm:space-y-10">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4 sm:pb-6">
                    <div className="p-3 bg-primary/10 rounded-2xl">
                        {view === 'realtime' ? <Globe className="text-primary" size={24} /> : <TestTube2 className="text-primary" size={24} />}
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-[#1b3022] uppercase tracking-wider">{view === 'realtime' ? t('real_mode') : t('sim_mode')}</h2>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('configuration')}</p>
                    </div>
                </div>

                <div className="space-y-8">
                  {view === 'realtime' ? (
                    <div className="space-y-3 relative">
                      <label className="text-[10px] font-black uppercase tracking-widest text-primary ml-4 flex items-center gap-2">
                        <MapPin size={12} className="text-primary" /> {t('location_label')}
                      </label>
                      <div className="relative group">
                        <input 
                          type="text" 
                          value={location}
                          onChange={(e) => {
                            setLocation(e.target.value);
                            setShowSuggestions(true);
                          }}
                          onFocus={() => setShowSuggestions(true)}
                          className="w-full px-6 sm:px-8 py-4 sm:py-5 bg-white/50 border-2 border-transparent focus:border-primary focus:bg-white rounded-[1.5rem] sm:rounded-3xl outline-none transition-all font-bold text-base sm:text-lg pr-12"
                          placeholder={t('location_placeholder')}
                        />
                        {isSearching && (
                          <div className="absolute right-6 top-1/2 -translate-y-1/2">
                            <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                          </div>
                        )}
                      </div>

                      {/* Suggestions Dropdown */}
                      <AnimatePresence>
                        {showSuggestions && suggestions.length > 0 && (
                          <motion.div
                            initial={{ opacity: 0, y: -10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -10, scale: 0.95 }}
                            className="absolute z-[110] w-full mt-2 bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden"
                          >
                            {suggestions.map((s, idx) => (
                              <button
                                key={`${s.name}-${s.lat}-${idx}`}
                                onClick={() => {
                                  const name = `${s.name}${s.state && s.state !== s.name ? `, ${s.state}` : ''}, ${s.country}`;
                                  isSelectionMade.current = true;
                                  setLocation(name);
                                  setSelectedCoords({ lat: s.lat, lon: s.lon });
                                  setShowSuggestions(false);
                                }}
                                className="w-full px-6 py-4 text-left hover:bg-green-50 transition-colors flex items-center gap-3 border-b border-slate-50 last:border-0"
                              >
                                <MapPin size={14} className="text-primary/40" />
                                <div>
                                  <p className="font-bold text-slate-800 text-sm leading-none">{s.name}</p>
                                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">
                                    {s.state && s.state !== s.name ? `${s.state}, ` : ''}{s.country}
                                  </p>
                                </div>
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ) : (
                    <div className="space-y-6" key={resetKey}>
                      <CustomNumberInput 
                        label={t('temp_label')}
                        value={manualTemp}
                        min={-20}
                        max={60}
                        unit="°C"
                        onChange={setManualTemp}
                      />
                      
                      <CustomNumberInput 
                        label={t('humidity_label')}
                        value={manualHumidity}
                        min={0}
                        max={100}
                        unit="%"
                        onChange={setManualHumidity}
                      />

                      <CustomNumberInput 
                        label={t('wind_label')}
                        value={manualWind}
                        min={0}
                        max={100}
                        unit="m/s"
                        onChange={setManualWind}
                        step={0.5}
                      />
                    </div>
                  )}

                  <CustomDropdown 
                    label={t('plant_group_label')}
                    value={selectedGroup ? t(PLANT_GROUPS.find(g => g.id === selectedGroup)?.key || '') : null}
                    placeholder={t('select_group_placeholder')}
                    options={PLANT_GROUPS.map(g => ({ id: g.id, label: t(g.key) }))}
                    isOpen={isGroupOpen}
                    setIsOpen={(val: boolean) => {
                      setIsGroupOpen(val);
                      setIsPlantOpen(false);
                      setIsPotOpen(false);
                    }}
                    onSelect={(id: string) => {
                      setSelectedGroup(id);
                      setSelectedPlantId(null);
                    }}
                    icon={Plus}
                  />

                  <CustomDropdown 
                    label={t('plant_label')}
                    value={selectedPlant ? (i18n.language === 'en' ? selectedPlant.name_en : selectedPlant.name_vi) : null}
                    placeholder={t('select_plant_placeholder')}
                    options={filteredPlants.map(p => ({ id: p.id, label: i18n.language === 'en' ? p.name_en : p.name_vi }))}
                    isOpen={isPlantOpen}
                    setIsOpen={(val: boolean) => {
                      setIsPlantOpen(val);
                      setIsGroupOpen(false);
                      setIsPotOpen(false);
                    }}
                    onSelect={(id: string) => setSelectedPlantId(id)}
                    icon={Flower2}
                  />

                  <CustomDropdown 
                    label={t('pot_label')}
                    value={selectedPotId ? t(POT_TYPES.find(p => p.id === selectedPotId)?.key || '') : null}
                    placeholder={t('select_pot_placeholder')}
                    options={POT_TYPES.filter(p => p.id !== 'biopot').map(p => ({ id: p.id, label: t(p.key) }))}
                    isOpen={isPotOpen}
                    setIsOpen={(val: boolean) => {
                      setIsPotOpen(val);
                      setIsGroupOpen(false);
                      setIsPlantOpen(false);
                    }}
                    onSelect={(id: string) => setSelectedPotId(id)}
                    icon={Settings}
                  />

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={fetchDataAndCalculate}
                    disabled={(view === 'realtime' && !location.trim()) || !selectedPlantId || !selectedPotId || loading}
                    className={`w-full py-6 text-white rounded-[2rem] font-bold text-lg uppercase tracking-widest shadow-2xl transition-all flex items-center justify-center gap-3 relative z-10 ${
                      results ? 'bg-orange-600 shadow-orange-900/40 hover:bg-orange-700' : 'bg-primary shadow-green-900/40 hover:bg-green-800'
                    } disabled:opacity-50 disabled:grayscale`}
                  >
                    {loading ? (
                      <div className="flex items-center gap-3">
                        <div className="w-5 h-5 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                        <span className="animate-pulse">{results ? t('updating_label') || "Đang cập nhật..." : t('calculating_label') || "Đang tính toán..."}</span>
                      </div>
                    ) : (
                      <>
                        <Zap size={24} fill={results ? "none" : "currentColor"} className={results ? "animate-bounce" : ""} />
                        {results ? t('update_btn') || "CẬP NHẬT KẾT QUẢ" : t('calculate_btn')}
                      </>
                    )}
                  </motion.button>

                  <button
                    onClick={handleResetState}
                    className="w-full py-4 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-primary transition-colors flex items-center justify-center gap-2"
                  >
                    <Activity size={14} />
                    {t('reset_btn') || "Làm mới cấu hình"}
                  </button>

                  <AnimatePresence>
                    {error && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="p-4 bg-red-50 rounded-2xl text-red-500 text-[10px] font-bold uppercase tracking-widest text-center border border-red-100"
                      >
                        {error}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {selectedPlant && (
                 <div className="bg-[#1b3022] p-8 rounded-[2.5rem] text-white overflow-hidden relative shadow-2xl">
                    <div className="relative z-10 space-y-4">
                        <div className="flex items-center gap-2">
                            <Flower2 className="text-secondary" size={20} />
                            <span className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-60">{t('botanical_info')}</span>
                        </div>
                        <h3 className="text-3xl font-black">
                            {i18n.language === 'en' ? selectedPlant.name_en : selectedPlant.name_vi}
                        </h3>
                        <div className="flex flex-wrap gap-3">
                            <span className="px-5 py-2 bg-white/10 rounded-xl text-xs font-bold">{t('kc_label')}: {selectedPlant.Kc}</span>
                            <span className="px-5 py-2 bg-secondary/20 text-secondary rounded-xl text-xs font-bold uppercase">{selectedPlant.water_need} {t('water_need_suffix')}</span>
                        </div>
                    </div>
                    <Leaf size={240} className="absolute -right-20 -bottom-20 opacity-5 rotate-45 scale-150" />
                 </div>
              )}
            </aside>

            {/* RESULTS PANEL */}
            <div className="col-span-12 lg:col-span-8 space-y-12">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="bg-white p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] shadow-xl border border-white flex flex-col justify-between min-h-[180px] sm:min-h-[220px]">
                  <div className="flex justify-between items-start">
                    <div className="p-3 sm:p-4 bg-blue-50 rounded-2xl"><Droplets className="text-blue-500" size={24} sm:size={32} /></div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('current_moisture')}</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl sm:text-7xl font-black text-primary leading-none">{results?.selected_pot.moisture.toFixed(0) || 0}</span>
                    <span className="text-base sm:text-lg font-bold text-slate-300">%</span>
                  </div>
                </div>

                <div className="bg-white p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] shadow-xl border border-white flex flex-col justify-between min-h-[180px] sm:min-h-[220px]">
                  <div className="flex justify-between items-start">
                    <div className="p-3 sm:p-4 bg-orange-50 rounded-2xl"><Wind className="text-orange-500" size={24} sm:size={32} /></div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('dehydration_rate')}</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl sm:text-6xl font-black text-orange-600 leading-none">{results?.selected_pot.v_loss.toFixed(2) || 0}</span>
                    <span className="text-xs sm:text-sm font-bold text-slate-300">% / {t('days').toLowerCase()}</span>
                  </div>
                </div>

                <div className="bg-primary p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl text-white flex flex-col justify-between min-h-[180px] sm:min-h-[220px] relative overflow-hidden">
                    <div className="relative z-10 flex justify-between items-start">
                      <div className="p-3 sm:p-4 bg-white/20 rounded-2xl"><Calendar className="text-white" size={24} sm:size={32} /></div>
                      <span className="text-[10px] font-black text-white/50 uppercase tracking-widest">{t('days_left')}</span>
                    </div>
                    <div className="relative z-10 flex items-baseline gap-2 sm:gap-3">
                      <span className="text-6xl sm:text-8xl font-black leading-none">{results?.selected_pot.days_to_rewater.toFixed(1) || 0}</span>
                      <span className="text-base sm:text-lg font-bold opacity-40 uppercase">{t('days')}</span>
                    </div>
                    <Leaf className="absolute -right-6 -bottom-6 sm:-right-10 sm:-bottom-10 opacity-10 rotate-12" size={120} sm:size={180} />
                </div>
              </div>

              {weather && results && (
                <div className="space-y-8">
                  <div className="flex items-center gap-3 px-8">
                    <MapPin size={16} className="text-primary" />
                    <span className="text-xs font-black text-slate-400 tracking-widest uppercase">
                      Weather data for: <span className="text-primary">{weather.name}{weather.sys?.country ? `, ${weather.sys.country}` : ''}</span>
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="flex items-center gap-4 p-8 bg-white rounded-[2.5rem] shadow-xl border border-white">
                    <div className="p-4 bg-red-50 rounded-2xl text-red-500"><Activity size={24} /></div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest leading-none">{t('temp_label')}</p>
                        {weather.main.feels_like && (
                          <span className="text-[9px] font-bold text-slate-300">({t('feels_like')} {weather.main.feels_like.toFixed(0)}°)</span>
                        )}
                      </div>
                      <p className="text-2xl font-black text-[#1b3022]">{weather.main.temp.toFixed(1)}°C</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 p-8 bg-white rounded-[2.5rem] shadow-xl border border-white">
                    <div className="p-4 bg-blue-50 rounded-2xl text-blue-500"><Droplets size={24} /></div>
                    <div>
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest leading-none mb-2">{t('humidity_label')}</p>
                      <p className="text-2xl font-black text-[#1b3022]">{weather.main.humidity}%</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 p-8 bg-white rounded-[2.5rem] shadow-xl border border-white">
                    <div className="p-4 bg-orange-50 rounded-2xl text-orange-500"><Wind size={24} /></div>
                    <div>
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest leading-none mb-2">{t('wind_label')}</p>
                      <p className="text-2xl font-black text-[#1b3022]">{weather.wind.speed.toFixed(1)} m/s</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

              {/* Chart Section */}
              <div className="bg-white p-6 sm:p-12 rounded-[2rem] sm:rounded-[3.5rem] shadow-2xl border border-white space-y-8 sm:space-y-12">
                 <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="space-y-1 text-center md:text-left">
                        <h2 className="text-2xl sm:text-3xl font-black text-[#1b3022] tracking-tighter">{t('compare_title')}</h2>
                        <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest">{t('moisture_trend_sub')}</p>
                    </div>
                    <div className="flex flex-wrap justify-center gap-4 sm:gap-6 p-4 bg-slate-50 rounded-2xl sm:rounded-3xl border border-slate-100">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-red-500 shadow-lg shadow-red-500/20" />
                        <span className="text-[10px] sm:text-xs font-black text-slate-600 uppercase">{t(POT_TYPES.find(p => p.id === (selectedPotId || 'plastic'))?.key || 'pot_plastic')}</span>
                      </div>
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-primary shadow-lg shadow-primary/20" />
                        <span className="text-[10px] sm:text-xs font-black text-primary uppercase">{t('pot_biopot')}</span>
                      </div>
                    </div>
                 </div>

                 <div className="h-[300px] sm:h-[450px] w-full">
                   <ResponsiveContainer width="100%" height="100%">
                     <LineChart data={processedChartData} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="10 10" vertical={false} stroke="#f1f5f9" />
                        <XAxis 
                            dataKey="name" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 12, fontWeight: 800, fill: '#94a3b8' }}
                            dy={20}
                        />
                        <YAxis 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 12, fontWeight: 800, fill: '#94a3b8' }} 
                            unit="%" 
                            domain={[0, 100]}
                        />
                        <Tooltip 
                            contentStyle={{ 
                                borderRadius: '24px', 
                                border: 'none', 
                                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)', 
                                padding: '20px',
                                fontWeight: 900, 
                                backgroundColor: 'white' 
                            }} 
                        />
                        <Line 
                            type="monotone" 
                            dataKey={t(POT_TYPES.find(p => p.id === (selectedPotId || 'plastic'))?.key || 'pot_plastic')} 
                            stroke="#ef4444" 
                            strokeWidth={5} 
                            dot={{ r: 6, fill: '#ef4444', strokeWidth: 3, stroke: '#fff' }} 
                            activeDot={{ r: 10 }}
                        />
                        <Line 
                            type="monotone" 
                            dataKey={t('pot_biopot')} 
                            stroke="#2e7d32" 
                            strokeWidth={5} 
                            dot={{ r: 6, fill: '#2e7d32', strokeWidth: 3, stroke: '#fff' }} 
                            activeDot={{ r: 10 }}
                        />
                     </LineChart>
                   </ResponsiveContainer>
                 </div>

                 {results && (
                   <div className="bg-primary/5 p-6 sm:p-10 rounded-[2rem] sm:rounded-[2.5rem] border border-primary/10 flex flex-col md:flex-row items-center gap-6 sm:gap-10">
                      <div className="bg-primary p-4 sm:p-6 rounded-[1.5rem] shadow-xl shadow-primary/20">
                        <Zap className="text-white" size={32} sm:size={40} fill="currentColor" />
                      </div>
                      <div className="flex-1 text-center md:text-left space-y-2">
                        <h4 className="font-black text-primary uppercase text-[10px] sm:text-xs tracking-widest">{t('performance_insight')}</h4>
                        <p className="font-bold text-[#1b3022] text-lg sm:text-xl leading-snug">
                          {t('insight_text', { 
                            percentage: results.comparison.water_saved_percent, 
                            potType: t(POT_TYPES.find(p => p.id === selectedPotId)?.key || '') 
                          })}
                        </p>
                      </div>
                      <div className="bg-white px-6 sm:px-10 py-4 sm:py-6 rounded-2xl sm:rounded-3xl border border-primary/10 shadow-lg flex flex-col items-center">
                         <span className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase mb-1">{t('boost_label')}</span>
                         <span className="text-4xl sm:text-6xl font-black text-primary leading-none">+{results.comparison.water_saved_percent}%</span>
                      </div>
                   </div>
                  )}
                </div>
             </div>
           </motion.main>
         )}
      </AnimatePresence>

      {/* Camera View — fullscreen, replaces everything below nav */}
      {view === 'camera' && (
        <div className="fixed inset-0 z-[50] pt-[60px] lg:pt-[72px]">
          <ErrorBoundary darkMode={darkMode}>
            <CameraScanner darkMode={darkMode} />
          </ErrorBoundary>
        </div>
      )}

      {/* Footer — hidden when camera is active */}
      {view !== 'camera' && (
      <footer className={`py-16 border-t ${darkMode ? 'bg-[#0d1117] border-white/5' : 'bg-white border-slate-50'}`}>
        <div className="max-w-[1400px] mx-auto px-6 flex flex-col items-center gap-8">
            <div className="flex items-center gap-4 text-primary bg-beige p-6 rounded-full shadow-inner">
                <Leaf size={32} />
                <h4 className="text-2xl font-black tracking-tighter uppercase">BIOPOT</h4>
            </div>
            <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.8em] text-center max-w-lg leading-loose">
                {t('footer_desc')} &bull; &copy; 2026 BioPot Technologies
            </p>
            <div className="flex gap-8 text-primary opacity-20">
                <Settings size={20} />
                <Plus size={20} />
                <Globe size={20} />
            </div>
        </div>
      </footer>
      )}
    </div>
  );
}

export default App;
