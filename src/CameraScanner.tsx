import { useState, useRef, useCallback } from "react";

const SCAN_DURATION_MS = 1200;

// ─── Core pixel analysis ──────────────────────────────────────────────────────
function extractPixelData(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d");
  if (!ctx || !canvas.width || !canvas.height) return { avgExG: 0, greenRatio: 0, mt: 0, notFound: true };

  const x0 = Math.floor(canvas.width * 0.15);
  const y0 = Math.floor(canvas.height * 0.15);
  const w = Math.floor(canvas.width * 0.7);
  const h = Math.floor(canvas.height * 0.7);
  const data = ctx.getImageData(x0, y0, w, h).data;
  const total = w * h;

  let sumExG = 0, greenCount = 0, brownCount = 0, nonBlack = 0;
  for (let i = 0; i < data.length; i += 4) {
    const R = data[i], G = data[i + 1], B = data[i + 2];
    sumExG += 2 * G - R - B;
    if (G > R + 10 && G > B + 10 && G > 40) greenCount++;
    if (R > 110 && G > 55 && G < 165 && B < 85 && R > G) brownCount++;
    if (R + G + B > 30) nonBlack++;
  }

  if (nonBlack / total < 0.05) return { avgExG: 0, greenRatio: 0, mt: 0, notFound: true };

  const avgExG = sumExG / total;
  const greenRatio = greenCount / total;
  const mt = Math.min(1, brownCount / total / 0.15);
  const notFound = avgExG < 3 && greenRatio < 0.04 && mt < 0.05;
  return { avgExG, greenRatio, mt, notFound };
}

// ─── Vision analysis ──────────────────────────────────────────────────────────
function buildVisionResult(px: any, ts: string, t: (k: string) => string) {
  const { avgExG, mt } = px;
  let healthLabel: string, healthStatus: string;
  if (avgExG > 20) { healthLabel = t("cam_health_good"); healthStatus = "healthy"; }
  else if (avgExG > 5) { healthLabel = t("cam_health_medium"); healthStatus = "warning"; }
  else { healthLabel = t("cam_health_weak"); healthStatus = "unhealthy"; }

  let potLabel: string, potStatus: string;
  if (mt > 0.6) { potLabel = t("cam_pot_high"); potStatus = "decomposed"; }
  else if (mt > 0.3) { potLabel = t("cam_pot_medium"); potStatus = "moderate"; }
  else { potLabel = t("cam_pot_new"); potStatus = "new"; }

  return { exg: Math.round(avgExG * 10) / 10, mt: Math.round(mt * 100), healthLabel, healthStatus, potLabel, potStatus, timestamp: ts };
}

// ─── FAO-56 from pigment ──────────────────────────────────────────────────────
function buildFAOResult(px: any, t: (k: string) => string) {
  const { avgExG, mt } = px;
  const ndvi_proxy = Math.max(0, Math.min(1, (avgExG + 30) / 100));
  const kc = Math.max(0.5, Math.min(1.15, 0.5 + ndvi_proxy * 0.65));
  const temp_equiv = 25 + (1 - ndvi_proxy) * 13 + mt * 5;
  const humidity = 65, wind = 2;
  let ET0 = (0.2 * temp_equiv) + (0.5 * wind) + (2.5 * (100 - humidity) / 100);
  if (temp_equiv > 30) ET0 += (temp_equiv - 30) * 0.15;
  ET0 = Math.max(2, Math.min(7, ET0));
  const ETc = ET0 * kc;
  let stress = 1.0 + (1 - ndvi_proxy) * 0.25 + mt * 0.1;
  stress = Math.max(0.85, Math.min(1.4, stress));

  const k_pot_normal = 1.0, k_pot_bio = 0.65;
  let v_loss_normal = Math.max(1.5, Math.min(12, ETc * k_pot_normal * stress));
  let v_loss_bio    = Math.max(1.0, Math.min(8,  ETc * k_pot_bio    * stress));

  const refill = kc >= 1.0 ? 70 : kc >= 0.7 ? 60 : 40;
  const days_to_rewater = (100 - refill) / v_loss_normal;
  const pot_efficiency = Math.round(((v_loss_normal / v_loss_bio) - 1) * 100);
  const moisture_now = Math.max(0, 100 - v_loss_normal * 2);

  let statusLabel: string, statusColor: string;
  if (ndvi_proxy > 0.65)      { statusLabel = t("cam_status_good");     statusColor = "#48ff96"; }
  else if (ndvi_proxy > 0.35) { statusLabel = t("cam_status_stress");   statusColor = "#ffd048"; }
  else                        { statusLabel = t("cam_status_critical");  statusColor = "#ff5a5a"; }

  return {
    ndvi_proxy: Math.round(ndvi_proxy * 100) / 100,
    stress_factor: Math.round(stress * 100) / 100,
    ET0: Math.round(ET0 * 10) / 10,
    ETc: Math.round(ETc * 10) / 10,
    v_loss: Math.round(v_loss_normal * 10) / 10,
    days_to_rewater: Math.round(days_to_rewater * 10) / 10,
    moisture_now: Math.round(moisture_now),
    kc: Math.round(kc * 100) / 100,
    pot_efficiency,
    statusLabel,
    statusColor,
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function MetricCard({ label, value, unit, color, sub, dark }: any) {
  return (
    <div style={{ background: dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)", border: dark ? "1px solid rgba(72,255,150,0.15)" : "1px solid rgba(46,125,50,0.12)", borderRadius: 12, padding: "14px 16px", flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 10, color: dark ? "#8ab" : "#6a8a7a", letterSpacing: 1, marginBottom: 6, textTransform: "uppercase" }}>{label}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
        <span style={{ fontSize: 26, fontWeight: 800, color, fontFamily: "monospace" }}>{value}</span>
        {unit && <span style={{ fontSize: 12, color: dark ? "#8ab" : "#999" }}>{unit}</span>}
      </div>
      {sub && <div style={{ fontSize: 11, color: "#6a8", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function StatusBadge({ color, label }: any) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: `${color}18`, border: `1px solid ${color}55`, borderRadius: 20, padding: "6px 14px", fontSize: 13, color, fontWeight: 600 }}>
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, boxShadow: `0 0 8px ${color}`, flexShrink: 0 }} />
      {label}
    </div>
  );
}

function ProgressBar({ value, max = 100, color, dark }: any) {
  return (
    <div style={{ background: dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)", borderRadius: 6, height: 8, overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${Math.min(100, Math.max(0, (value / max) * 100))}%`, background: color, borderRadius: 6, transition: "width 0.8s ease" }} />
    </div>
  );
}

// ─── i18n strings cho CameraScanner ──────────────────────────────────────────
const camStrings: Record<string, Record<string, string>> = {
  en: {
    title: "HYDROsense",
    subtitle: "FAO-56 + AI VISION · SINGLE SHOT",
    camera_real: "REAL CAMERA",
    camera_off: "CAMERA OFF",
    place_plant: "PLACE POT IN SCAN FRAME",
    scanning: "● ANALYSING FAO-56 + AI VISION...",
    btn_start: "Start Camera",
    btn_stop: "Stop Camera",
    btn_scan: "CAPTURE & ANALYSE",
    btn_scanning: "⟳ ANALYSING...",
    not_found_title: "No plant detected",
    not_found_desc: "Please place the pot in the frame and try again. Ensure sufficient lighting and the object is within the scan area. FAO-56 will not run without plant detection.",
    btn_retry: "↺ Scan Again",
    tab_fao: "📈 FAO-56",
    tab_vision: "📷 AI Vision",
    fao_title: "FAO-56 MONITORING",
    vision_title: "AI PIXEL ANALYSIS",
    metric_moisture: "Current Moisture",
    metric_vloss: "Water Loss Rate",
    metric_days: "Days to Water",
    metric_ndvi: "Pigment NDVI",
    metric_et0: "Reference ET₀",
    metric_kc: "Kc Coefficient",
    metric_ndvi_sub: "From pixel analysis",
    metric_et0_sub: "Estimated from pigment",
    metric_kc_sub: "From leaf pigment",
    bar_moisture: "ESTIMATED SOIL MOISTURE",
    bar_stress: "PLANT STRESS LEVEL",
    biopot_label: "BIOPOT COMPARISON",
    biopot_text: "BioPot extends watering time by",
    biopot_eff: "efficiency",
    fao_note: "📐 FAO-56 calculated from",
    fao_note2: "leaf pigment NDVI",
    fao_note3: "instead of temperature/wind sensors — based on single capture with ExG =",
    fao_note4: "actual pixel analysis.",
    vision_note: "📊 Based on",
    vision_note2: "Excess Green Index (ExG = 2G−R−B)",
    vision_note3: "and",
    vision_note4: "Brown Pixel Detection",
    vision_note5: "— 100% client-side, same data source as FAO-56.",
    exg_label: "ExG Index",
    mt_label: "Decomposition Mₜ",
    exg_sub_high: "Strong green",
    exg_sub_mid: "Moderate green",
    exg_sub_low: "Chlorophyll deficient",
    pot_sub_new: "Pot still good",
    pot_sub_decomp: "Decomposing",
    leaf_health: "LEAF HEALTH (ExG INDEX)",
    pot_decomp: "POT DECOMPOSITION (Mₜ)",
    unit_day: "day",
    unit_pct_day: "%/day",
    unit_mm_day: "mm/day",
    cam_health_good: "Healthy Plant 🌱",
    cam_health_medium: "Average Plant ⚡",
    cam_health_weak: "Weak Plant ⚠️",
    cam_pot_high: "High Decomposition 🟤",
    cam_pot_medium: "Moderate Decomposition 🟡",
    cam_pot_new: "New / Good Pot 🟢",
    cam_status_good: "Plant Growing Well ✅",
    cam_status_stress: "Plant Under Stress ⚡",
    cam_status_critical: "Plant Severely Water-Stressed 🚨",
    error_camera: "Cannot access camera. Please grant permission and try again.",
    footer: "© 2026 HydroSense · BioPot · FAO-56",
  },
  vi: {
    title: "HYDROsense",
    subtitle: "FAO-56 + AI VISION · MỘT LẦN CHỤP",
    camera_real: "CAMERA THẬT",
    camera_off: "CAMERA CHƯA BẬT",
    place_plant: "ĐẶT CHẬU CÂY VÀO KHUNG QUÉT",
    scanning: "● ĐANG PHÂN TÍCH FAO-56 + AI VISION...",
    btn_start: "Bật Camera",
    btn_stop: "Tắt Camera",
    btn_scan: "CHỤP & PHÂN TÍCH",
    btn_scanning: "⟳ ĐANG PHÂN TÍCH...",
    not_found_title: "Không tìm thấy đối tượng thực vật",
    not_found_desc: "Vui lòng đưa cây hoặc chậu cây vào khung hình và thử lại. Đảm bảo ánh sáng đủ và đối tượng nằm trong vùng quét. FAO-56 sẽ không chạy khi chưa phát hiện cây.",
    btn_retry: "↺ Quét Lại",
    tab_fao: "📈 FAO-56",
    tab_vision: "📷 AI Vision",
    fao_title: "GIÁM SÁT FAO-56",
    vision_title: "PHÂN TÍCH PIXEL AI",
    metric_moisture: "Độ Ẩm Hiện Tại",
    metric_vloss: "Tốc Độ Mất Nước",
    metric_days: "Ngày Cần Tưới",
    metric_ndvi: "NDVI Sắc Tố",
    metric_et0: "ET₀ Tham Chiếu",
    metric_kc: "Hệ Số Kc",
    metric_ndvi_sub: "Từ phân tích pixel",
    metric_et0_sub: "Ước tính từ sắc tố",
    metric_kc_sub: "Từ sắc tố lá",
    bar_moisture: "ĐỘ ẨM ĐẤT ƯỚC TÍNH",
    bar_stress: "MỨC ĐỘ STRESS CÂY",
    biopot_label: "SO SÁNH BIOPOT",
    biopot_text: "BioPot giúp kéo dài thời gian tưới thêm",
    biopot_eff: "hiệu quả",
    fao_note: "📐 FAO-56 tính từ",
    fao_note2: "NDVI sắc tố lá",
    fao_note3: "thay vì cảm biến nhiệt độ/gió — dựa trên cùng một lần chụp với ExG =",
    fao_note4: "phân tích pixel thực tế.",
    vision_note: "📊 Dựa trên",
    vision_note2: "Excess Green Index (ExG = 2G−R−B)",
    vision_note3: "và",
    vision_note4: "Brown Pixel Detection",
    vision_note5: "— 100% xử lý phía client, cùng nguồn dữ liệu với FAO-56.",
    exg_label: "Chỉ Số ExG",
    mt_label: "Độ Phân Hủy Mₜ",
    exg_sub_high: "Xanh lá vượt trội",
    exg_sub_mid: "Xanh lá trung bình",
    exg_sub_low: "Thiếu diệp lục",
    pot_sub_new: "Chậu còn tốt",
    pot_sub_decomp: "Đang phân hủy",
    leaf_health: "SỨC KHỎE LÁ (ExG INDEX)",
    pot_decomp: "PHÂN HỦY CHẬU (Mₜ)",
    unit_day: "ngày",
    unit_pct_day: "%/ngày",
    unit_mm_day: "mm/ngày",
    cam_health_good: "Cây Khỏe Mạnh 🌱",
    cam_health_medium: "Cây Trung Bình ⚡",
    cam_health_weak: "Cây Yếu ⚠️",
    cam_pot_high: "Phân Hủy Cao 🟤",
    cam_pot_medium: "Phân Hủy Vừa 🟡",
    cam_pot_new: "Chậu Mới / Tốt 🟢",
    cam_status_good: "Cây Phát Triển Tốt ✅",
    cam_status_stress: "Cây Đang Stress ⚡",
    cam_status_critical: "Cây Thiếu Nước Nghiêm Trọng 🚨",
    error_camera: "Không thể truy cập camera. Vui lòng cấp quyền và thử lại.",
    footer: "© 2026 HydroSense · BioPot · FAO-56",
  }
};

// ─── Main Component ───────────────────────────────────────────────────────────
// FIX: nhận `language` prop từ App để re-render khi đổi ngôn ngữ
export default function CameraScanner({ darkMode = true, language = "vi" }: { darkMode?: boolean; language?: string }) {
  // t() dùng nội bộ camStrings, không phụ thuộc i18next hook
  const lang = language === "en" ? "en" : "vi";
  const t = (key: string) => camStrings[lang][key] ?? key;

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animRef = useRef<number>(0);

  const [activeTab, setActiveTab] = useState("fao");
  const [cameraOn, setCameraOn] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const bg = darkMode ? "#0d1117" : "#f5f5ef";
  const cardBg = darkMode ? "#0a0f14" : "#e8ede8";
  const textPrimary = darkMode ? "#e0f0e8" : "#1b3022";
  const textMuted = darkMode ? "#6a9a7a" : "#5a7a6a";
  const accent = "#48ff96";
  const border = darkMode ? "rgba(72,255,150,0.2)" : "rgba(46,125,50,0.2)";

  // ── Camera ────────────────────────────────────────────────────────────────
  const startCamera = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
      setCameraOn(true);
    } catch { setError(t("error_camera")); }
  }, [lang]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(tr => tr.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOn(false);
    setResult(null);
    cancelAnimationFrame(animRef.current);
  }, []);

  // ── Scan ──────────────────────────────────────────────────────────────────
  const runScan = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !overlayRef.current) return;
    setScanning(true);
    setResult(null);

    const video = videoRef.current;
    const capture = canvasRef.current;
    const overlay = overlayRef.current;
    const oc = overlay.getContext("2d")!;
    const W = video.videoWidth || 640, H = video.videoHeight || 480;
    capture.width = W; capture.height = H;
    overlay.width = overlay.offsetWidth; overlay.height = overlay.offsetHeight;

    const t0 = performance.now();
    const animate = (now: number) => {
      const p = Math.min((now - t0) / SCAN_DURATION_MS, 1);
      const oW = overlay.width, oH = overlay.height;
      oc.clearRect(0, 0, oW, oH);

      oc.strokeStyle = accent; oc.lineWidth = 3; oc.shadowColor = accent; oc.shadowBlur = 10;
      [[20,20,1,1],[oW-20,20,-1,1],[20,oH-20,1,-1],[oW-20,oH-20,-1,-1]].forEach(([x,y,dx,dy]) => {
        oc.beginPath(); oc.moveTo(x,y); oc.lineTo(x+dx*28,y); oc.moveTo(x,y); oc.lineTo(x,y+dy*28); oc.stroke();
      });

      const ly = p * oH;
      const grad = oc.createLinearGradient(0, ly-24, 0, ly+8);
      grad.addColorStop(0, "rgba(72,255,150,0)"); grad.addColorStop(0.6, "rgba(72,255,150,0.35)"); grad.addColorStop(1, "rgba(72,255,150,0.9)");
      oc.fillStyle = grad; oc.shadowBlur = 20; oc.fillRect(0, ly-24, oW, 32);
      oc.beginPath(); oc.moveTo(0,ly); oc.lineTo(oW,ly);
      oc.strokeStyle = accent; oc.lineWidth = 2; oc.shadowColor = accent; oc.shadowBlur = 16; oc.stroke();
      oc.shadowBlur = 0; oc.fillStyle = "rgba(72,255,150,0.85)"; oc.font = "bold 11px monospace";
      oc.fillText(`SCANNING ${Math.round(p * 100)}%`, oW - 110, oH - 14);

      if (p < 1) { animRef.current = requestAnimationFrame(animate); return; }

      oc.clearRect(0, 0, oW, oH);
      const cc = capture.getContext("2d")!;
      cc.drawImage(video, 0, 0, W, H);

      const px = extractPixelData(capture);
      const ts = new Date().toLocaleTimeString(lang === "en" ? "en-US" : "vi-VN");

      if (px.notFound) {
        setResult({ notFound: true, timestamp: ts, vision: null, fao: null });
      } else {
        setResult({ notFound: false, timestamp: ts, vision: buildVisionResult(px, ts, t), fao: buildFAOResult(px, t) });
      }
      setScanning(false);
    };
    animRef.current = requestAnimationFrame(animate);
  }, [lang]);

  // ── Render helpers ────────────────────────────────────────────────────────
  const renderFAO = (fao: any, vision: any) => (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
        <div style={{ fontWeight: 800, fontSize: 13, letterSpacing: 1, color: accent }}>{t("fao_title")}</div>
        <StatusBadge color={fao.statusColor} label={fao.statusLabel} />
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
        <MetricCard label={t("metric_moisture")} value={fao.moisture_now} unit="%" color={fao.moisture_now > 60 ? accent : fao.moisture_now > 35 ? "#ffd048" : "#ff5a5a"} dark={darkMode} />
        <MetricCard label={t("metric_vloss")} value={fao.v_loss} unit={t("unit_pct_day")} color="#f97316" dark={darkMode} />
        <MetricCard label={t("metric_days")} value={fao.days_to_rewater} unit={t("unit_day")} color={fao.days_to_rewater > 4 ? accent : "#ff5a5a"} dark={darkMode} />
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        <MetricCard label={t("metric_ndvi")} value={fao.ndvi_proxy} color={fao.ndvi_proxy > 0.6 ? accent : "#ffd048"} sub={t("metric_ndvi_sub")} dark={darkMode} />
        <MetricCard label={t("metric_et0")} value={fao.ET0} unit={t("unit_mm_day")} color="#60a5fa" sub={t("metric_et0_sub")} dark={darkMode} />
        <MetricCard label={t("metric_kc")} value={fao.kc} color="#c084fc" sub={t("metric_kc_sub")} dark={darkMode} />
      </div>

      <div style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
          <span style={{ fontSize: 11, color: textMuted, letterSpacing: 1 }}>{t("bar_moisture")}</span>
          <span style={{ fontSize: 11, color: accent, fontWeight: 700 }}>{fao.moisture_now}%</span>
        </div>
        <ProgressBar value={fao.moisture_now} color={`linear-gradient(90deg,#2ecc71,${accent})`} dark={darkMode} />
      </div>

      <div style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
          <span style={{ fontSize: 11, color: textMuted, letterSpacing: 1 }}>{t("bar_stress")}</span>
          <span style={{ fontSize: 11, color: "#ffd048", fontWeight: 700 }}>{Math.round((fao.stress_factor - 1) * 100)}%</span>
        </div>
        <ProgressBar value={(fao.stress_factor - 1) * 100} max={40} color="linear-gradient(90deg,#f39c12,#ffd048)" dark={darkMode} />
      </div>

      <div style={{ padding: "12px 14px", background: darkMode ? "rgba(72,255,150,0.06)" : "rgba(46,125,50,0.05)", border: `1px solid ${border}`, borderRadius: 10, display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ fontSize: 28 }}>🪴</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: textMuted, letterSpacing: 1, marginBottom: 3 }}>{t("biopot_label")}</div>
          <div style={{ fontSize: 13, color: textPrimary, fontWeight: 600 }}>
            {t("biopot_text")} <span style={{ color: accent, fontWeight: 800 }}>+{fao.pot_efficiency}%</span>
          </div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 26, fontWeight: 900, color: accent }}>+{fao.pot_efficiency}%</div>
          <div style={{ fontSize: 10, color: textMuted }}>{t("biopot_eff")}</div>
        </div>
      </div>

      <div style={{ marginTop: 12, padding: "8px 12px", background: darkMode ? "rgba(72,255,150,0.04)" : "rgba(46,125,50,0.04)", borderRadius: 8, fontSize: 11, color: textMuted, lineHeight: 1.6 }}>
        {t("fao_note")} <strong style={{ color: "#6aaa8a" }}>{t("fao_note2")}</strong> {t("fao_note3")} {vision ? vision.exg : "—"}, {t("fao_note4")}
      </div>
    </div>
  );

  const renderVision = (v: any) => (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ fontWeight: 800, fontSize: 13, letterSpacing: 1, color: accent }}>{t("vision_title")}</div>
        <div style={{ fontSize: 11, color: textMuted }}>{v.timestamp}</div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
        <StatusBadge color={v.healthStatus === "healthy" ? accent : v.healthStatus === "warning" ? "#ffd048" : "#ff5a5a"} label={v.healthLabel} />
        <StatusBadge color={v.potStatus === "new" ? accent : v.potStatus === "moderate" ? "#ffd048" : "#ff8a5a"} label={v.potLabel} />
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        <MetricCard
          label={t("exg_label")} value={v.exg} unit="ExG"
          color={v.healthStatus === "healthy" ? accent : v.healthStatus === "warning" ? "#ffd048" : "#ff5a5a"}
          sub={v.exg > 20 ? t("exg_sub_high") : v.exg > 5 ? t("exg_sub_mid") : t("exg_sub_low")}
          dark={darkMode}
        />
        <MetricCard
          label={t("mt_label")} value={v.mt} unit="%"
          color={v.mt < 30 ? accent : v.mt < 60 ? "#ffd048" : "#ff8a5a"}
          sub={v.potStatus === "new" ? t("pot_sub_new") : t("pot_sub_decomp")}
          dark={darkMode}
        />
      </div>

      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: textMuted, marginBottom: 5, letterSpacing: 1 }}>{t("leaf_health")}</div>
        <ProgressBar value={Math.min(100, Math.max(0, ((v.exg + 30) / 80) * 100))} color={v.healthStatus === "healthy" ? `linear-gradient(90deg,#2ecc71,${accent})` : v.healthStatus === "warning" ? "linear-gradient(90deg,#f39c12,#ffd048)" : "linear-gradient(90deg,#c0392b,#ff5a5a)"} dark={darkMode} />
      </div>

      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: textMuted, marginBottom: 5, letterSpacing: 1 }}>{t("pot_decomp")}</div>
        <ProgressBar value={v.mt} color={v.mt < 30 ? `linear-gradient(90deg,#2ecc71,${accent})` : v.mt < 60 ? "linear-gradient(90deg,#f39c12,#ffd048)" : "linear-gradient(90deg,#e67e22,#ff8a5a)"} dark={darkMode} />
      </div>

      <div style={{ padding: "8px 12px", background: darkMode ? "rgba(72,255,150,0.04)" : "rgba(46,125,50,0.04)", borderRadius: 8, fontSize: 11, color: textMuted, lineHeight: 1.6 }}>
        {t("vision_note")} <strong style={{ color: "#6aaa8a" }}>{t("vision_note2")}</strong> {t("vision_note3")} <strong style={{ color: "#6aaa8a" }}>{t("vision_note4")}</strong> {t("vision_note5")}
      </div>
    </div>
  );

  // ── JSX ───────────────────────────────────────────────────────────────────
  return (
    <div style={{ width: "100%", height: "100%", background: bg, fontFamily: "'Inter','Segoe UI',sans-serif", color: textPrimary, display: "flex", flexDirection: "column", alignItems: "center", overflowY: "auto", paddingBottom: 80 }}>

      <div style={{ width: "100%", maxWidth: 580, padding: "18px 20px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <div style={{ width: 42, height: 42, background: accent, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>🌿</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, letterSpacing: 1 }}>{t("title")}</div>
            <div style={{ fontSize: 9, color: textMuted, letterSpacing: 2 }}>{t("subtitle")}</div>
          </div>
          <div style={{ marginLeft: "auto", background: "rgba(72,255,150,0.12)", border: `1px solid ${accent}44`, borderRadius: 20, padding: "4px 12px", fontSize: 10, color: accent, fontWeight: 700, display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: accent, display: "inline-block" }} />
            {t("camera_real")}
          </div>
        </div>
      </div>

      <div style={{ width: "100%", maxWidth: 580, padding: "0 20px" }}>
        <div style={{ position: "relative", borderRadius: 16, overflow: "hidden", background: cardBg, border: `1px solid ${border}`, aspectRatio: "4/3" }}>
          <video ref={videoRef} autoPlay playsInline muted style={{ width: "100%", height: "100%", objectFit: "cover", display: cameraOn ? "block" : "none" }} />
          {!cameraOn && (
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: darkMode ? "#3a5a4a" : "#8aaa8a", gap: 12 }}>
              <div style={{ fontSize: 48 }}>📷</div>
              <div style={{ fontSize: 12, letterSpacing: 2 }}>{t("camera_off")}</div>
              <div style={{ width: 80, height: 80, border: `2px dashed ${border}`, borderRadius: 12, position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)" }} />
            </div>
          )}
          <canvas ref={overlayRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }} />
          {cameraOn && !scanning && !result && (
            <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", background: "rgba(0,0,0,0.6)", border: `1px solid ${accent}44`, borderRadius: 8, padding: "6px 14px", fontSize: 11, color: accent, letterSpacing: 1, fontWeight: 700, whiteSpace: "nowrap" }}>
              {t("place_plant")}
            </div>
          )}
          {scanning && (
            <div style={{ position: "absolute", top: 12, left: 12, background: "rgba(0,0,0,0.75)", border: `1px solid ${accent}66`, borderRadius: 6, padding: "4px 10px", fontSize: 10, color: accent, letterSpacing: 2, fontWeight: 700 }}>
              {t("scanning")}
            </div>
          )}
        </div>

        <canvas ref={canvasRef} style={{ display: "none" }} />

        {error && (
          <div style={{ marginTop: 10, padding: "10px 14px", background: "rgba(255,90,90,0.1)", border: "1px solid rgba(255,90,90,0.3)", borderRadius: 10, fontSize: 13, color: "#ff8a8a" }}>
            ⚠️ {error}
          </div>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
          <button
            onClick={cameraOn ? stopCamera : startCamera}
            style={{ flexShrink: 0, padding: "13px 20px", borderRadius: 12, border: `1px solid ${cameraOn ? "rgba(255,90,90,0.3)" : border}`, background: cameraOn ? "rgba(255,90,90,0.12)" : darkMode ? "rgba(72,255,150,0.08)" : "rgba(46,125,50,0.07)", color: cameraOn ? "#ff8a8a" : accent, cursor: "pointer", fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}
          >
            ⏻ {cameraOn ? t("btn_stop") : t("btn_start")}
          </button>
          <button
            onClick={runScan}
            disabled={!cameraOn || scanning}
            style={{ flex: 1, padding: "13px 20px", borderRadius: 12, border: "none", background: !cameraOn || scanning ? (darkMode ? "rgba(72,255,150,0.15)" : "rgba(46,125,50,0.1)") : `linear-gradient(135deg,#2ecc71,${accent})`, color: !cameraOn || scanning ? (darkMode ? "#4a7a5a" : "#8aaa8a") : "#0d1117", cursor: !cameraOn || scanning ? "not-allowed" : "pointer", fontWeight: 800, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: !cameraOn || scanning ? "none" : "0 4px 20px rgba(72,255,150,0.3)" }}
          >
            {scanning ? t("btn_scanning") : <>📷 {t("btn_scan")}</>}
          </button>
        </div>

        {result && result.notFound && (
          <div style={{ marginTop: 18, background: "rgba(255,90,90,0.07)", border: "1px solid rgba(255,90,90,0.25)", borderRadius: 16, padding: 24, display: "flex", flexDirection: "column", alignItems: "center", gap: 12, textAlign: "center" }}>
            <div style={{ fontSize: 42 }}>🔍</div>
            <div style={{ fontWeight: 800, fontSize: 15, color: "#ff7a7a" }}>{t("not_found_title")}</div>
            <div style={{ fontSize: 13, color: textMuted, lineHeight: 1.6, maxWidth: 320 }}>{t("not_found_desc")}</div>
            <button onClick={() => setResult(null)} style={{ marginTop: 4, padding: "9px 20px", borderRadius: 10, border: "1px solid rgba(255,90,90,0.3)", background: "rgba(255,90,90,0.1)", color: "#ff8a8a", cursor: "pointer", fontWeight: 700, fontSize: 13 }}>
              {t("btn_retry")}
            </button>
          </div>
        )}

        {result && !result.notFound && (
          <div style={{ marginTop: 18, background: darkMode ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.7)", border: `1px solid ${border}`, borderRadius: 16, padding: 18 }}>
            <div style={{ display: "flex", background: darkMode ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.05)", borderRadius: 8, padding: 3, marginBottom: 16, border: `1px solid ${border}` }}>
              {[["fao", t("tab_fao")], ["vision", t("tab_vision")]].map(([id, label]) => (
                <button key={id} onClick={() => setActiveTab(id)} style={{ flex: 1, padding: "7px 0", borderRadius: 6, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 12, transition: "all 0.2s", background: activeTab === id ? (darkMode ? "rgba(72,255,150,0.15)" : "rgba(46,125,50,0.12)") : "transparent", color: activeTab === id ? accent : textMuted }}>
                  {label}
                </button>
              ))}
            </div>
            {activeTab === "fao" ? renderFAO(result.fao, result.vision) : renderVision(result.vision)}
          </div>
        )}
      </div>

      <div style={{ marginTop: 28, fontSize: 10, color: textMuted, letterSpacing: 1, textAlign: "center" }}>
        {t("footer")}
      </div>
    </div>
  );
}
