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

// ─── Constants ────────────────────────────────────────────────────────────────
const SCAN_DURATION_MS = 1200;

// ─── Pixel Analysis ───────────────────────────────────────────────────────────
function analyzeFrame(canvas: HTMLCanvasElement): ScanResult {
  const ctx = canvas.getContext("2d")!;
  const { width, height } = canvas;

  // Sample central 60% region for stability
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
    const R = data[i];
    const G = data[i + 1];
    const B = data[i + 2];

    // Excess Green Index
    const exg = 2 * G - R - B;
    sumExG += exg;

    // Brown pixel detection: R high, G medium, B low
    if (R > 120 && G > 60 && G < 160 && B < 80 && R > G && R > B) {
      brownCount++;
    }
  }

  const avgExG = sumExG / totalPixels;
  const mt = Math.min(1, brownCount / totalPixels / 0.15); // normalize to 0-1

  // Plant health classification
  let healthLabel: string;
  let healthStatus: ScanResult["healthStatus"];
  if (avgExG > 20) {
    healthLabel = "Cây Khỏe Mạnh 🌱";
    healthStatus = "healthy";
  } else if (avgExG > 5) {
    healthLabel = "Cây Trung Bình ⚡";
    healthStatus = "warning";
  } else {
    healthLabel = "Cây Yếu ⚠️";
    healthStatus = "unhealthy";
  }

  // Pot decomposition
  let potLabel: string;
  let potStatus: ScanResult["potStatus"];
  if (mt > 0.6) {
    potLabel = "Phân Hủy Cao 🟤";
    potStatus = "decomposed";
  } else if (mt > 0.3) {
    potLabel = "Phân Hủy Vừa 🟡";
    potStatus = "moderate";
  } else {
    potLabel = "Chậu Mới / Tốt 🟢";
    potStatus = "new";
  }

  return {
    exg: Math.round(avgExG * 10) / 10,
    mt: Math.round(mt * 100),
    healthLabel,
    healthStatus,
    potLabel,
    potStatus,
    timestamp: new Date().toLocaleTimeString("vi-VN"),
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function MetricCard({
  label,
  value,
  unit,
  color,
  sub,
}: {
  label: string;
  value: string | number;
  unit?: string;
  color: string;
  sub?: string;
}) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(72,255,150,0.15)",
        borderRadius: 12,
        padding: "14px 16px",
        flex: 1,
      }}
    >
      <div style={{ fontSize: 11, color: "#8ab", letterSpacing: 1, marginBottom: 6, textTransform: "uppercase" }}>
        {label}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
        <span style={{ fontSize: 32, fontWeight: 800, color, fontFamily: "monospace" }}>{value}</span>
        {unit && <span style={{ fontSize: 13, color: "#8ab" }}>{unit}</span>}
      </div>
      {sub && <div style={{ fontSize: 12, color: "#6a8", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function StatusBadge({ status, label }: { status: string; label: string }) {
  const colors: Record<string, string> = {
    healthy: "#48ff96",
    warning: "#ffd048",
    unhealthy: "#ff5a5a",
    new: "#48ff96",
    moderate: "#ffd048",
    decomposed: "#ff8a5a",
  };
  const color = colors[status] ?? "#8ab";
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        background: `${color}18`,
        border: `1px solid ${color}55`,
        borderRadius: 20,
        padding: "6px 14px",
        fontSize: 13,
        color,
        fontWeight: 600,
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: color,
          boxShadow: `0 0 8px ${color}`,
          flexShrink: 0,
        }}
      />
      {label}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function CameraScanner() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number>(0);

  const [cameraOn, setCameraOn] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanProgress, setScanProgress] = useState(0); // 0–1 for laser position

  // ── Camera control ──────────────────────────────────────────────────────────
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

  // ── Laser scan animation + capture ─────────────────────────────────────────
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

      const oW = overlayCanvas.width;
      const oH = overlayCanvas.height;
      overlayCtx.clearRect(0, 0, oW, oH);

      // Corner brackets
      const bLen = 28, bThick = 3;
      overlayCtx.strokeStyle = "#48ff96";
      overlayCtx.lineWidth = bThick;
      overlayCtx.shadowColor = "#48ff96";
      overlayCtx.shadowBlur = 10;
      const corners = [
        [20, 20, 1, 1], [oW - 20, 20, -1, 1],
        [20, oH - 20, 1, -1], [oW - 20, oH - 20, -1, -1],
      ] as const;
      corners.forEach(([x, y, dx, dy]) => {
        overlayCtx.beginPath();
        overlayCtx.moveTo(x, y);
        overlayCtx.lineTo(x + dx * bLen, y);
        overlayCtx.moveTo(x, y);
        overlayCtx.lineTo(x, y + dy * bLen);
        overlayCtx.stroke();
      });

      // Laser line
      const laserY = progress * oH;
      const gradient = overlayCtx.createLinearGradient(0, laserY - 24, 0, laserY + 8);
      gradient.addColorStop(0, "rgba(72,255,150,0)");
      gradient.addColorStop(0.6, "rgba(72,255,150,0.35)");
      gradient.addColorStop(1, "rgba(72,255,150,0.9)");
      overlayCtx.fillStyle = gradient;
      overlayCtx.shadowBlur = 20;
      overlayCtx.fillRect(0, laserY - 24, oW, 32);

      // Solid laser line
      overlayCtx.beginPath();
      overlayCtx.moveTo(0, laserY);
      overlayCtx.lineTo(oW, laserY);
      overlayCtx.strokeStyle = "#48ff96";
      overlayCtx.lineWidth = 2;
      overlayCtx.shadowColor = "#48ff96";
      overlayCtx.shadowBlur = 16;
      overlayCtx.stroke();

      // Progress text
      overlayCtx.shadowBlur = 0;
      overlayCtx.fillStyle = "rgba(72,255,150,0.85)";
      overlayCtx.font = "bold 11px monospace";
      overlayCtx.fillText(`SCANNING ${Math.round(progress * 100)}%`, oW - 110, oH - 14);

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        // Capture & analyze
        overlayCtx.clearRect(0, 0, oW, oH);
        const captureCtx = captureCanvas.getContext("2d")!;
        captureCtx.drawImage(video, 0, 0, W, H);
        const res = analyzeFrame(captureCanvas);
        setResult(res);
        setScanning(false);
        setScanProgress(0);
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);
  }, []);

  // ── UI ──────────────────────────────────────────────────────────────────────
  const accentGreen = "#48ff96";

  return (
    <div
      style={{
        background: "#0d1117",
        minHeight: "100vh",
        fontFamily: "'Inter', 'Segoe UI', sans-serif",
        color: "#e0f0e8",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "0 0 40px",
      }}
    >
      {/* ── Header ── */}
      <div
        style={{
          width: "100%",
          maxWidth: 480,
          padding: "20px 20px 0",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
          <div
            style={{
              width: 40, height: 40,
              background: accentGreen,
              borderRadius: 10,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 20,
            }}
          >
            🌿
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16, letterSpacing: 1 }}>HYDROSENSE</div>
            <div style={{ fontSize: 10, color: "#6a9a7a", letterSpacing: 2 }}>ACTIVE-CORE ECOSYSTEM</div>
          </div>
          <div
            style={{
              marginLeft: "auto",
              background: "rgba(72,255,150,0.12)",
              border: `1px solid ${accentGreen}44`,
              borderRadius: 20,
              padding: "4px 12px",
              fontSize: 11,
              color: accentGreen,
              fontWeight: 700,
              display: "flex", alignItems: "center", gap: 6,
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: accentGreen, display: "inline-block" }} />
            VIRTUAL MODE
          </div>
        </div>

        {/* Tab bar */}
        <div
          style={{
            display: "flex",
            background: "rgba(255,255,255,0.04)",
            borderRadius: 10,
            padding: 4,
            marginTop: 16,
            marginBottom: 16,
            border: "1px solid rgba(72,255,150,0.1)",
          }}
        >
          {["Giám Sát FAO-56", "Quét AI Vision"].map((tab, i) => (
            <button
              key={tab}
              style={{
                flex: 1,
                padding: "9px 0",
                borderRadius: 8,
                border: "none",
                cursor: "pointer",
                fontWeight: 700,
                fontSize: 13,
                transition: "all 0.2s",
                background: i === 1 ? accentGreen : "transparent",
                color: i === 1 ? "#0d1117" : "#6a9a7a",
              }}
            >
              {i === 0 ? "📈 " : "📷 "}{tab}
            </button>
          ))}
        </div>
      </div>

      {/* ── Camera viewport ── */}
      <div
        style={{
          width: "100%",
          maxWidth: 480,
          padding: "0 20px",
        }}
      >
        <div
          style={{
            position: "relative",
            borderRadius: 16,
            overflow: "hidden",
            background: "#0a0f14",
            border: `1px solid rgba(72,255,150,0.2)`,
            aspectRatio: "4/3",
          }}
        >
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: cameraOn ? "block" : "none",
            }}
          />

          {/* Placeholder when camera is off */}
          {!cameraOn && (
            <div
              style={{
                position: "absolute", inset: 0,
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center",
                color: "#3a5a4a",
                gap: 12,
              }}
            >
              <div style={{ fontSize: 48 }}>📷</div>
              <div style={{ fontSize: 13, letterSpacing: 1 }}>CAMERA CHƯA BẬT</div>
              <div
                style={{
                  width: 80, height: 80,
                  border: "2px dashed rgba(72,255,150,0.2)",
                  borderRadius: 12,
                  position: "absolute",
                  top: "50%", left: "50%",
                  transform: "translate(-50%,-50%)",
                }}
              />
            </div>
          )}

          {/* Scan overlay canvas */}
          <canvas
            ref={overlayCanvasRef}
            style={{
              position: "absolute", inset: 0,
              width: "100%", height: "100%",
              pointerEvents: "none",
            }}
          />

          {/* Center reticle label */}
          {cameraOn && !scanning && (
            <div
              style={{
                position: "absolute",
                top: "50%", left: "50%",
                transform: "translate(-50%,-50%)",
                background: "rgba(0,0,0,0.6)",
                border: "1px solid rgba(72,255,150,0.4)",
                borderRadius: 8,
                padding: "6px 14px",
                fontSize: 11,
                color: accentGreen,
                letterSpacing: 1,
                fontWeight: 700,
                whiteSpace: "nowrap",
              }}
            >
              ĐẶT CHẬU CÂY VÀO KHUNG QUÉT
            </div>
          )}

          {/* Scanning indicator */}
          {scanning && (
            <div
              style={{
                position: "absolute",
                top: 12, left: 12,
                background: "rgba(0,0,0,0.7)",
                border: `1px solid ${accentGreen}66`,
                borderRadius: 6,
                padding: "4px 10px",
                fontSize: 10,
                color: accentGreen,
                letterSpacing: 2,
                fontWeight: 700,
              }}
            >
              ● ANALYZING...
            </div>
          )}
        </div>

        {/* Hidden capture canvas */}
        <canvas ref={canvasRef} style={{ display: "none" }} />

        {/* Error */}
        {error && (
          <div
            style={{
              marginTop: 10,
              padding: "10px 14px",
              background: "rgba(255,90,90,0.1)",
              border: "1px solid rgba(255,90,90,0.3)",
              borderRadius: 10,
              fontSize: 13,
              color: "#ff8a8a",
            }}
          >
            ⚠️ {error}
          </div>
        )}

        {/* ── Controls ── */}
        <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
          <button
            onClick={cameraOn ? stopCamera : startCamera}
            style={{
              flex: "0 0 auto",
              padding: "13px 20px",
              borderRadius: 12,
              border: `1px solid rgba(72,255,150,0.3)`,
              background: cameraOn ? "rgba(255,90,90,0.12)" : "rgba(72,255,150,0.08)",
              color: cameraOn ? "#ff8a8a" : accentGreen,
              cursor: "pointer",
              fontWeight: 700,
              fontSize: 13,
              display: "flex", alignItems: "center", gap: 8,
            }}
          >
            <span>{cameraOn ? "⏻" : "⏻"}</span>
            {cameraOn ? "Tắt Camera" : "Bật Camera"}
          </button>

          <button
            onClick={runScan}
            disabled={!cameraOn || scanning}
            style={{
              flex: 1,
              padding: "13px 20px",
              borderRadius: 12,
              border: "none",
              background: !cameraOn || scanning
                ? "rgba(72,255,150,0.15)"
                : `linear-gradient(135deg, #2ecc71, ${accentGreen})`,
              color: !cameraOn || scanning ? "#4a7a5a" : "#0d1117",
              cursor: !cameraOn || scanning ? "not-allowed" : "pointer",
              fontWeight: 800,
              fontSize: 14,
              letterSpacing: 0.5,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              transition: "all 0.2s",
              boxShadow: !cameraOn || scanning ? "none" : `0 4px 20px rgba(72,255,150,0.3)`,
            }}
          >
            {scanning ? (
              <>
                <span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>⟳</span>
                ĐANG QUÉT...
              </>
            ) : (
              <> 📷 CHỤP & PHÂN TÍCH </>
            )}
          </button>
        </div>

        {/* ── Results ── */}
        {result && (
          <div
            style={{
              marginTop: 18,
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(72,255,150,0.18)",
              borderRadius: 16,
              padding: 18,
              animation: "fadeIn 0.4s ease",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={{ fontWeight: 800, fontSize: 13, letterSpacing: 1, color: accentGreen }}>
                KẾT QUẢ PHÂN TÍCH AI
              </div>
              <div style={{ fontSize: 11, color: "#5a7a6a" }}>{result.timestamp}</div>
            </div>

            {/* Status badges */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
              <StatusBadge status={result.healthStatus} label={result.healthLabel} />
              <StatusBadge status={result.potStatus} label={result.potLabel} />
            </div>

            {/* Metric cards */}
            <div style={{ display: "flex", gap: 10 }}>
              <MetricCard
                label="Chỉ Số ExG"
                value={result.exg}
                unit="ExG"
                color={result.healthStatus === "healthy" ? accentGreen : result.healthStatus === "warning" ? "#ffd048" : "#ff5a5a"}
                sub={result.exg > 20 ? "Xanh lá vượt trội" : result.exg > 5 ? "Xanh lá trung bình" : "Thiếu diệp lục"}
              />
              <MetricCard
                label="Độ Phân Hủy Mₜ"
                value={result.mt}
                unit="%"
                color={result.mt < 30 ? accentGreen : result.mt < 60 ? "#ffd048" : "#ff8a5a"}
                sub={result.potStatus === "new" ? "Chậu còn tốt" : result.potStatus === "moderate" ? "Đang phân hủy" : "Phân hủy cao"}
              />
            </div>

            {/* Health bar */}
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 11, color: "#6a9a7a", marginBottom: 6, letterSpacing: 1 }}>
                CHỈ SỐ SỨC KHỎE CÂY
              </div>
              <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 6, height: 8, overflow: "hidden" }}>
                <div
                  style={{
                    height: "100%",
                    width: `${Math.min(100, Math.max(0, ((result.exg + 30) / 80) * 100))}%`,
                    background: result.healthStatus === "healthy"
                      ? `linear-gradient(90deg, #2ecc71, ${accentGreen})`
                      : result.healthStatus === "warning"
                      ? "linear-gradient(90deg, #f39c12, #ffd048)"
                      : "linear-gradient(90deg, #c0392b, #ff5a5a)",
                    borderRadius: 6,
                    transition: "width 0.8s ease",
                    boxShadow: `0 0 10px rgba(72,255,150,0.4)`,
                  }}
                />
              </div>
            </div>

            {/* Pot decomp bar */}
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 11, color: "#6a9a7a", marginBottom: 6, letterSpacing: 1 }}>
                MỨC ĐỘ PHÂN HỦY CHẬU (Mₜ)
              </div>
              <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 6, height: 8, overflow: "hidden" }}>
                <div
                  style={{
                    height: "100%",
                    width: `${result.mt}%`,
                    background: result.mt < 30
                      ? `linear-gradient(90deg, #2ecc71, ${accentGreen})`
                      : result.mt < 60
                      ? "linear-gradient(90deg, #f39c12, #ffd048)"
                      : "linear-gradient(90deg, #e67e22, #ff8a5a)",
                    borderRadius: 6,
                    transition: "width 0.8s ease",
                  }}
                />
              </div>
            </div>

            {/* Footer note */}
            <div
              style={{
                marginTop: 14,
                padding: "8px 12px",
                background: "rgba(72,255,150,0.05)",
                borderRadius: 8,
                fontSize: 11,
                color: "#5a8a6a",
                lineHeight: 1.6,
              }}
            >
              📊 Phân tích dựa trên <strong style={{ color: "#6aaa8a" }}>Excess Green Index (ExG)</strong> và{" "}
              <strong style={{ color: "#6aaa8a" }}>Brown Pixel Detection</strong> — xử lý 100% trên thiết bị, không cần AI API.
            </div>
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <div
        style={{
          marginTop: 30,
          fontSize: 10,
          color: "#3a5a4a",
          letterSpacing: 1,
          textAlign: "center",
        }}
      >
        © 2026 HydroSense · BioPot · FAO-56
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
