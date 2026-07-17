import { useState, useRef, useEffect, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface ScanResult {
  exg: number;
  mt: number;
  healthLabel: string;
  healthStatus: "healthy" | "warning" | "unhealthy";
  potLabel: string;
  potStatus: "new" | "moderate" | "decomposed";
  timestamp: string;
}

interface Props {
  darkMode?: boolean;
}

const SCAN_DURATION_MS = 1200;

// ─── Pixel Analysis ───────────────────────────────────────────────────────────
function analyzeFrame(canvas: HTMLCanvasElement): ScanResult {
  const ctx = canvas.getContext("2d")!;
  const { width, height } = canvas;
  const x0 = Math.floor(width * 0.2);
  const y0 = Math.floor(height * 0.2);
  const w = Math.floor(width * 0.6);
  const h = Math.floor(height * 0.6);
  const imageData = ctx.getImageData(x0, y0, w, h);
  const data = imageData.data;
  const totalPixels = w * h;
  let sumExG = 0;
  let brownCount = 0;

  for (let i = 0; i < data.length; i += 4) {
    const R = data[i], G = data[i + 1], B = data[i + 2];
    sumExG += 2 * G - R - B;
    if (R > 120 && G > 60 && G < 160 && B < 80 && R > G && R > B) brownCount++;
  }

  const avgExG = sumExG / totalPixels;
  const mt = Math.min(1, brownCount / totalPixels / 0.15);

  let healthLabel: string, healthStatus: ScanResult["healthStatus"];
  if (avgExG > 20) { healthLabel = "Cây Khỏe Mạnh 🌱"; healthStatus = "healthy"; }
  else if (avgExG > 5) { healthLabel = "Cây Trung Bình ⚡"; healthStatus = "warning"; }
  else { healthLabel = "Cây Yếu ⚠️"; healthStatus = "unhealthy"; }

  let potLabel: string, potStatus: ScanResult["potStatus"];
  if (mt > 0.6) { potLabel = "Phân Hủy Cao 🟤"; potStatus = "decomposed"; }
  else if (mt > 0.3) { potLabel = "Phân Hủy Vừa 🟡"; potStatus = "moderate"; }
  else { potLabel = "Chậu Mới / Tốt 🟢"; potStatus = "new"; }

  return { exg: Math.round(avgExG * 10) / 10, mt: Math.round(mt * 100), healthLabel, healthStatus, potLabel, potStatus, timestamp: new Date().toLocaleTimeString("vi-VN") };
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function MetricCard({ label, value, unit, color, sub, dark }: { label: string; value: string | number; unit?: string; color: string; sub?: string; dark: boolean }) {
  return (
    <div style={{
      background: dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
      border: dark ? "1px solid rgba(72,255,150,0.15)" : "1px solid rgba(46,125,50,0.12)",
      borderRadius: 12, padding: "14px 16px", flex: 1,
    }}>
      <div style={{ fontSize: 11, color: dark ? "#8ab" : "#6a8a7a", letterSpacing: 1, marginBottom: 6, textTransform: "uppercase" }}>{label}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
        <span style={{ fontSize: 32, fontWeight: 800, color, fontFamily: "monospace" }}>{value}</span>
        {unit && <span style={{ fontSize: 13, color: dark ? "#8ab" : "#999" }}>{unit}</span>}
      </div>
      {sub && <div style={{ fontSize: 12, color: "#6a8", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function StatusBadge({ status, label }: { status: string; label: string }) {
  const colors: Record<string, string> = { healthy: "#48ff96", warning: "#ffd048", unhealthy: "#ff5a5a", new: "#48ff96", moderate: "#ffd048", decomposed: "#ff8a5a" };
  const color = colors[status] ?? "#8ab";
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: `${color}18`, border: `1px solid ${color}55`, borderRadius: 20, padding: "6px 14px", fontSize: 13, color, fontWeight: 600 }}>
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, boxShadow: `0 0 8px ${color}`, flexShrink: 0 }} />
      {label}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function CameraScanner({ darkMode = true }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number>(0);

  const [cameraOn, setCameraOn] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanProgress, setScanProgress] = useState(0);

  const bg = darkMode ? "#0d1117" : "#f5f5ef";
  const cardBg = darkMode ? "#0a0f14" : "#e8ede8";
  const textPrimary = darkMode ? "#e0f0e8" : "#1b3022";
  const textMuted = darkMode ? "#6a9a7a" : "#5a7a6a";
  const accentGreen = "#48ff96";
  const borderColor = darkMode ? "rgba(72,255,150,0.2)" : "rgba(46,125,50,0.2)";

  const startCamera = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraOn(true);
    } catch {
      setError("Không thể truy cập camera. Vui lòng cấp quyền và thử lại.");
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOn(false);
    setResult(null);
    cancelAnimationFrame(animFrameRef.current);
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  const runScan = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !overlayCanvasRef.current) return;
    setScanning(true);
    setResult(null);

    const video = videoRef.current;
    const captureCanvas = canvasRef.current;
    const overlayCanvas = overlayCanvasRef.current;
    const overlayCtx = overlayCanvas.getContext("2d")!;
    const W = video.videoWidth || 640;
    const H = video.videoHeight || 480;
    captureCanvas.width = W;
    captureCanvas.height = H;
    overlayCanvas.width = overlayCanvas.offsetWidth;
    overlayCanvas.height = overlayCanvas.offsetHeight;

    const startTime = performance.now();
    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / SCAN_DURATION_MS, 1);
      setScanProgress(progress);
      const oW = overlayCanvas.width, oH = overlayCanvas.height;
      overlayCtx.clearRect(0, 0, oW, oH);

      // Corner brackets
      const bLen = 28, bThick = 3;
      overlayCtx.strokeStyle = accentGreen;
      overlayCtx.lineWidth = bThick;
      overlayCtx.shadowColor = accentGreen;
      overlayCtx.shadowBlur = 10;
      const corners = [[20,20,1,1],[oW-20,20,-1,1],[20,oH-20,1,-1],[oW-20,oH-20,-1,-1]] as const;
      corners.forEach(([x,y,dx,dy]) => {
        overlayCtx.beginPath();
        overlayCtx.moveTo(x, y); overlayCtx.lineTo(x + dx * bLen, y);
        overlayCtx.moveTo(x, y); overlayCtx.lineTo(x, y + dy * bLen);
        overlayCtx.stroke();
      });

      // Laser
      const laserY = progress * oH;
      const gradient = overlayCtx.createLinearGradient(0, laserY - 24, 0, laserY + 8);
      gradient.addColorStop(0, "rgba(72,255,150,0)");
      gradient.addColorStop(0.6, "rgba(72,255,150,0.35)");
      gradient.addColorStop(1, "rgba(72,255,150,0.9)");
      overlayCtx.fillStyle = gradient;
      overlayCtx.shadowBlur = 20;
      overlayCtx.fillRect(0, laserY - 24, oW, 32);
      overlayCtx.beginPath();
      overlayCtx.moveTo(0, laserY); overlayCtx.lineTo(oW, laserY);
      overlayCtx.strokeStyle = accentGreen;
      overlayCtx.lineWidth = 2;
      overlayCtx.shadowColor = accentGreen;
      overlayCtx.shadowBlur = 16;
      overlayCtx.stroke();
      overlayCtx.shadowBlur = 0;
      overlayCtx.fillStyle = "rgba(72,255,150,0.85)";
      overlayCtx.font = "bold 11px monospace";
      overlayCtx.fillText(`SCANNING ${Math.round(progress * 100)}%`, oW - 110, oH - 14);

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        overlayCtx.clearRect(0, 0, oW, oH);
        const captureCtx = captureCanvas.getContext("2d")!;
        captureCtx.drawImage(video, 0, 0, W, H);
        setResult(analyzeFrame(captureCanvas));
        setScanning(false);
        setScanProgress(0);
      }
    };
    animFrameRef.current = requestAnimationFrame(animate);
  }, []);

  return (
    <div style={{
      width: "100%",
      height: "100%",
      background: bg,
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
      color: textPrimary,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      overflowY: "auto",
      paddingBottom: 80,
    }}>

      {/* ── HydroSense sub-header ── */}
      <div style={{ width: "100%", maxWidth: 540, padding: "18px 20px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
          <div style={{ width: 42, height: 42, background: accentGreen, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>🌿</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, letterSpacing: 1, color: textPrimary }}>HYDROsense</div>
            <div style={{ fontSize: 9, color: textMuted, letterSpacing: 2 }}>HỆ SINH THÁI LÕI HOẠT ĐỘNG</div>
          </div>
          <div style={{ marginLeft: "auto", background: "rgba(72,255,150,0.12)", border: `1px solid ${accentGreen}44`, borderRadius: 20, padding: "4px 12px", fontSize: 10, color: accentGreen, fontWeight: 700, display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: accentGreen, display: "inline-block" }} />
            CHẾ ĐỘ ẢO
          </div>
        </div>

        {/* Tab bar */}
        <div style={{ display: "flex", background: darkMode ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.05)", borderRadius: 10, padding: 4, marginBottom: 16, border: `1px solid ${borderColor}` }}>
          {["📈  Giám Sát FAO-56", "📷  Quét AI Vision"].map((tab, i) => (
            <button key={tab} style={{ flex: 1, padding: "9px 0", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 13, transition: "all 0.2s", background: i === 1 ? accentGreen : "transparent", color: i === 1 ? "#0d1117" : textMuted }}>
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* ── Camera viewport ── */}
      <div style={{ width: "100%", maxWidth: 540, padding: "0 20px" }}>
        <div style={{ position: "relative", borderRadius: 16, overflow: "hidden", background: cardBg, border: `1px solid ${borderColor}`, aspectRatio: "4/3" }}>
          <video ref={videoRef} autoPlay playsInline muted style={{ width: "100%", height: "100%", objectFit: "cover", display: cameraOn ? "block" : "none" }} />

          {/* Placeholder */}
          {!cameraOn && (
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: darkMode ? "#3a5a4a" : "#8aaa8a", gap: 12 }}>
              <div style={{ fontSize: 48 }}>📷</div>
              <div style={{ fontSize: 12, letterSpacing: 2 }}>CAMERA CHƯA BẬT</div>
              <div style={{ width: 80, height: 80, border: `2px dashed ${borderColor}`, borderRadius: 12, position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)" }} />
            </div>
          )}

          {/* Overlay canvas for laser */}
          <canvas ref={overlayCanvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }} />

          {/* Reticle label */}
          {cameraOn && !scanning && (
            <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", background: "rgba(0,0,0,0.6)", border: `1px solid ${accentGreen}44`, borderRadius: 8, padding: "6px 14px", fontSize: 11, color: accentGreen, letterSpacing: 1, fontWeight: 700, whiteSpace: "nowrap" }}>
              ĐẶT CHẬU CÂY VÀO KHUNG QUÉT
            </div>
          )}

          {scanning && (
            <div style={{ position: "absolute", top: 12, left: 12, background: "rgba(0,0,0,0.7)", border: `1px solid ${accentGreen}66`, borderRadius: 6, padding: "4px 10px", fontSize: 10, color: accentGreen, letterSpacing: 2, fontWeight: 700 }}>
              ● ANALYZING...
            </div>
          )}
        </div>

        <canvas ref={canvasRef} style={{ display: "none" }} />

        {/* Error */}
        {error && (
          <div style={{ marginTop: 10, padding: "10px 14px", background: "rgba(255,90,90,0.1)", border: "1px solid rgba(255,90,90,0.3)", borderRadius: 10, fontSize: 13, color: "#ff8a8a" }}>
            ⚠️ {error}
          </div>
        )}

        {/* ── Controls ── */}
        <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
          <button
            onClick={cameraOn ? stopCamera : startCamera}
            style={{
              flexShrink: 0,
              padding: "13px 20px",
              borderRadius: 12,
              border: `1px solid ${cameraOn ? "rgba(255,90,90,0.3)" : borderColor}`,
              background: cameraOn ? "rgba(255,90,90,0.12)" : darkMode ? "rgba(72,255,150,0.08)" : "rgba(46,125,50,0.07)",
              color: cameraOn ? "#ff8a8a" : accentGreen,
              cursor: "pointer",
              fontWeight: 700,
              fontSize: 13,
              display: "flex", alignItems: "center", gap: 8,
            }}
          >
            ⏻ {cameraOn ? "Máy ảnh" : "Máy ảnh"}
          </button>

          <button
            onClick={runScan}
            disabled={!cameraOn || scanning}
            style={{
              flex: 1,
              padding: "13px 20px",
              borderRadius: 12,
              border: "none",
              background: !cameraOn || scanning ? (darkMode ? "rgba(72,255,150,0.15)" : "rgba(46,125,50,0.1)") : `linear-gradient(135deg, #2ecc71, ${accentGreen})`,
              color: !cameraOn || scanning ? (darkMode ? "#4a7a5a" : "#8aaa8a") : "#0d1117",
              cursor: !cameraOn || scanning ? "not-allowed" : "pointer",
              fontWeight: 800,
              fontSize: 14,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              boxShadow: !cameraOn || scanning ? "none" : "0 4px 20px rgba(72,255,150,0.3)",
            }}
          >
            {scanning ? <>⟳ ĐANG QUÉT...</> : <>📷 CHỤP & PHÂN TÍCH</>}
          </button>
        </div>

        {/* ── Results ── */}
        {result && (
          <div style={{ marginTop: 18, background: darkMode ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.7)", border: `1px solid ${borderColor}`, borderRadius: 16, padding: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={{ fontWeight: 800, fontSize: 13, letterSpacing: 1, color: accentGreen }}>KẾT QUẢ PHÂN TÍCH AI</div>
              <div style={{ fontSize: 11, color: textMuted }}>{result.timestamp}</div>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
              <StatusBadge status={result.healthStatus} label={result.healthLabel} />
              <StatusBadge status={result.potStatus} label={result.potLabel} />
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <MetricCard label="Chỉ Số ExG" value={result.exg} unit="ExG" color={result.healthStatus === "healthy" ? accentGreen : result.healthStatus === "warning" ? "#ffd048" : "#ff5a5a"} sub={result.exg > 20 ? "Xanh lá vượt trội" : result.exg > 5 ? "Xanh lá trung bình" : "Thiếu diệp lục"} dark={darkMode} />
              <MetricCard label="Độ Phân Hủy Mₜ" value={result.mt} unit="%" color={result.mt < 30 ? accentGreen : result.mt < 60 ? "#ffd048" : "#ff8a5a"} sub={result.potStatus === "new" ? "Chậu còn tốt" : result.potStatus === "moderate" ? "Đang phân hủy" : "Phân hủy cao"} dark={darkMode} />
            </div>

            {/* Health bar */}
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 11, color: textMuted, marginBottom: 6, letterSpacing: 1 }}>CHỈ SỐ SỨC KHỎE CÂY</div>
              <div style={{ background: darkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)", borderRadius: 6, height: 8, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${Math.min(100, Math.max(0, ((result.exg + 30) / 80) * 100))}%`, background: result.healthStatus === "healthy" ? `linear-gradient(90deg,#2ecc71,${accentGreen})` : result.healthStatus === "warning" ? "linear-gradient(90deg,#f39c12,#ffd048)" : "linear-gradient(90deg,#c0392b,#ff5a5a)", borderRadius: 6, transition: "width 0.8s ease" }} />
              </div>
            </div>

            {/* Pot bar */}
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 11, color: textMuted, marginBottom: 6, letterSpacing: 1 }}>MỨC ĐỘ PHÂN HỦY CHẬU (Mₜ)</div>
              <div style={{ background: darkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)", borderRadius: 6, height: 8, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${result.mt}%`, background: result.mt < 30 ? `linear-gradient(90deg,#2ecc71,${accentGreen})` : result.mt < 60 ? "linear-gradient(90deg,#f39c12,#ffd048)" : "linear-gradient(90deg,#e67e22,#ff8a5a)", borderRadius: 6, transition: "width 0.8s ease" }} />
              </div>
            </div>

            <div style={{ marginTop: 14, padding: "8px 12px", background: darkMode ? "rgba(72,255,150,0.05)" : "rgba(46,125,50,0.05)", borderRadius: 8, fontSize: 11, color: textMuted, lineHeight: 1.6 }}>
              📊 Phân tích dựa trên <strong style={{ color: "#6aaa8a" }}>Excess Green Index (ExG)</strong> và <strong style={{ color: "#6aaa8a" }}>Brown Pixel Detection</strong> — xử lý 100% trên thiết bị.
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ marginTop: 28, fontSize: 10, color: textMuted, letterSpacing: 1, textAlign: "center" }}>
        © 2026 HydroSense · BioPot · FAO-56
      </div>
    </div>
  );
}
