import React, { useState, useRef, useEffect } from "react";
import { Upload, QrCode, AlertTriangle, CheckCircle, Search, Loader2, ShieldAlert, Camera, X } from "lucide-react";
import { motion } from "motion/react";
import { GoogleGenAI, Type } from "@google/genai";
import jsQR from "jsqr";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

interface AnalysisResult {
  url: string;
  domainAge: string;
  suspiciousPatterns: string[];
  typosquatting: boolean;
  riskScore: number;
  explanation: string;
}

export default function QRAnalyzer() {
  const [image, setImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"upload" | "camera">("upload");
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!cameraStream) return;
    if (videoRef.current) videoRef.current.srcObject = cameraStream;

    const intervalId = setInterval(() => {
      if (!videoRef.current || !canvasRef.current) return;
      const video = videoRef.current;
      if (video.readyState < video.HAVE_ENOUGH_DATA || video.videoWidth === 0) return;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(video, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height);
      if (code) {
        setImage(canvas.toDataURL("image/png"));
        setResult(null);
        setError(null);
        setCameraStream(null);
        setMode("upload");
      }
    }, 200);

    return () => {
      clearInterval(intervalId);
      cameraStream.getTracks().forEach(t => t.stop());
    };
  }, [cameraStream]);

  const startCamera = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      setCameraStream(stream);
      setMode("camera");
    } catch {
      setError("Could not access camera. Please allow camera permissions and try again.");
    }
  };

  const stopCamera = () => {
    cameraStream?.getTracks().forEach(t => t.stop());
    setCameraStream(null);
    setMode("upload");
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext("2d")?.drawImage(videoRef.current, 0, 0);
    setImage(canvas.toDataURL("image/png"));
    setResult(null);
    setError(null);
    stopCamera();
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
        setResult(null);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const decodeQRFromImage = (dataUrl: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas unavailable"));
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        if (code) resolve(code.data);
        else reject(new Error("No QR code found in the image. Please ensure the image contains a clear, well-lit QR code."));
      };
      img.onerror = () => reject(new Error("Failed to load image."));
      img.src = dataUrl;
    });
  };

  const analyzeQR = async () => {
    if (!image) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      const url = await decodeQRFromImage(image);

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: {
          parts: [
            {
              text: `Analyze this URL extracted from a QR code for potential security risks: "${url}"\n\nProvide a risk score from 0 to 100 (where 100 is extremely dangerous). Check for suspicious patterns like excessive subdomains, unusual TLDs, or obfuscation. Check if it looks like typosquatting of a popular domain. Estimate the domain age if possible, or state 'Unknown'. Return the result strictly in JSON format.`,
            },
          ],
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              url: { type: Type.STRING, description: "The URL being analyzed" },
              domainAge: { type: Type.STRING, description: "Estimated domain age or 'Unknown'" },
              suspiciousPatterns: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "List of suspicious patterns found in the URL",
              },
              typosquatting: { type: Type.BOOLEAN, description: "True if it looks like typosquatting" },
              riskScore: { type: Type.NUMBER, description: "Risk score from 0 to 100" },
              explanation: { type: Type.STRING, description: "Brief explanation of the risk score" },
            },
            required: ["url", "domainAge", "suspiciousPatterns", "typosquatting", "riskScore", "explanation"],
          },
        },
      });

      const jsonStr = response.text?.trim() || "{}";
      const parsed = JSON.parse(jsonStr) as AnalysisResult;
      parsed.url = url; // always use the jsQR-decoded URL, not Gemini's
      setResult(parsed);
    } catch (err: any) {
      console.error("Analysis failed:", err);
      const msg: string = err?.message ?? "";
      if (msg.includes("429") || msg.includes("quota") || msg.includes("RESOURCE_EXHAUSTED")) {
        setError("API quota exceeded. Please wait a minute and try again.");
      } else {
        setError(msg || "Failed to analyze the QR code. Please ensure the image contains a clear QR code.");
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-5xl mx-auto"
    >
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
          <QrCode className="w-8 h-8 text-emerald-400" />
          QR Code Risk Analyzer
        </h1>
        <p className="text-zinc-400">
          Upload a QR code to extract its destination and analyze it for potential threats before scanning.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          {/* Mode toggle */}
          {!image && (
            <div className="flex gap-2 p-1 bg-zinc-900 border border-zinc-800 rounded-2xl">
              <button
                onClick={stopCamera}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  mode === "upload" ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                <Upload className="w-4 h-4" /> Upload
              </button>
              <button
                onClick={startCamera}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  mode === "camera" ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                <Camera className="w-4 h-4" /> Camera
              </button>
            </div>
          )}

          {/* Camera view */}
          {mode === "camera" && !image && (
            <div className="relative rounded-3xl overflow-hidden border-2 border-zinc-700 bg-zinc-950">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full aspect-square object-cover scale-x-[-1]"
              />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-48 h-48 border-2 border-emerald-400/60 rounded-2xl animate-pulse" />
              </div>
              <div className="absolute bottom-4 inset-x-0 flex flex-col items-center gap-3">
                <span className="text-xs text-emerald-400/80 bg-zinc-900/70 px-3 py-1 rounded-full backdrop-blur-sm">
                  Point at a QR code to scan automatically
                </span>
                <button
                  onClick={stopCamera}
                  className="p-3 bg-zinc-900/80 backdrop-blur-sm text-zinc-300 rounded-full hover:bg-red-500/80 hover:text-white transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* Upload dropzone */}
          {mode === "upload" && (
            <div
              className={`border-2 border-dashed rounded-3xl p-8 text-center transition-all ${
                image ? "border-zinc-700 bg-zinc-900/50" : "border-zinc-800 hover:border-emerald-500/50 hover:bg-zinc-900/50 cursor-pointer"
              }`}
              onClick={() => !image && fileInputRef.current?.click()}
            >
              {image ? (
                <div className="relative aspect-square max-w-xs mx-auto rounded-2xl overflow-hidden border border-zinc-800 bg-white p-4">
                  <img src={image} alt="Uploaded QR" className="w-full h-full object-contain" />
                  <button
                    onClick={(e: React.MouseEvent) => {
                      e.stopPropagation();
                      setImage(null);
                      setResult(null);
                    }}
                    className="absolute top-2 right-2 bg-zinc-900/80 text-white p-2 rounded-lg hover:bg-red-500/80 transition-colors backdrop-blur-sm"
                  >
                    <Upload className="w-4 h-4 rotate-180" />
                  </button>
                </div>
              ) : (
                <div className="py-12">
                  <div className="w-16 h-16 bg-zinc-800 rounded-2xl flex items-center justify-center mx-auto mb-4 text-zinc-400">
                    <Upload className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-medium text-zinc-200 mb-2">Upload QR Code</h3>
                  <p className="text-sm text-zinc-500">PNG, JPG, or WEBP up to 5MB</p>
                </div>
              )}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                accept="image/*"
                className="hidden"
              />
            </div>
          )}

          <canvas ref={canvasRef} className="hidden" />

          {image && !result && (
            <button
              onClick={analyzeQR}
              disabled={isAnalyzing}
              className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold rounded-2xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Analyzing QR Code...
                </>
              ) : (
                <>
                  <Search className="w-5 h-5" />
                  Analyze Risk
                </>
              )}
            </button>
          )}

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="text-sm">{error}</p>
            </div>
          )}
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 lg:p-8 flex flex-col">
          <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-zinc-400" />
            Analysis Results
          </h2>

          {result ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-6 flex-1"
            >
              <div className="p-4 bg-zinc-950 rounded-2xl border border-zinc-800 break-all">
                <div className="text-xs text-zinc-500 uppercase tracking-wider font-semibold mb-1">Extracted URL</div>
                <div className="font-mono text-emerald-400">{result.url}</div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-zinc-950 rounded-2xl border border-zinc-800">
                  <div className="text-xs text-zinc-500 uppercase tracking-wider font-semibold mb-2">Risk Score</div>
                  <div className="flex items-end gap-2">
                    <span className={`text-4xl font-bold ${
                      result.riskScore < 30 ? "text-emerald-400" :
                      result.riskScore < 70 ? "text-amber-400" : "text-red-400"
                    }`}>
                      {result.riskScore}
                    </span>
                    <span className="text-zinc-500 mb-1">/ 100</span>
                  </div>
                </div>

                <div className="p-4 bg-zinc-950 rounded-2xl border border-zinc-800">
                  <div className="text-xs text-zinc-500 uppercase tracking-wider font-semibold mb-2">Domain Age</div>
                  <div className="text-lg font-medium text-zinc-200">{result.domainAge}</div>
                </div>
              </div>

              <div className="p-4 bg-zinc-950 rounded-2xl border border-zinc-800">
                <div className="text-xs text-zinc-500 uppercase tracking-wider font-semibold mb-2">Typosquatting Risk</div>
                <div className="flex items-center gap-2">
                  {result.typosquatting ? (
                    <><AlertTriangle className="w-5 h-5 text-red-400" /><span className="text-red-400 font-medium">High Risk (Possible Typosquatting)</span></>
                  ) : (
                    <><CheckCircle className="w-5 h-5 text-emerald-400" /><span className="text-emerald-400 font-medium">No obvious typosquatting detected</span></>
                  )}
                </div>
              </div>

              {result.suspiciousPatterns.length > 0 && (
                <div className="p-4 bg-red-500/5 rounded-2xl border border-red-500/10">
                  <div className="text-xs text-red-500/70 uppercase tracking-wider font-semibold mb-3">Suspicious Patterns</div>
                  <ul className="space-y-2">
                    {result.suspiciousPatterns.map((pattern, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-red-400/90">
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-red-500/50 shrink-0" />
                        {pattern}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="p-4 bg-zinc-950 rounded-2xl border border-zinc-800">
                <div className="text-xs text-zinc-500 uppercase tracking-wider font-semibold mb-2">Summary</div>
                <p className="text-sm text-zinc-300 leading-relaxed">{result.explanation}</p>
              </div>
            </motion.div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 min-h-[300px]">
              <QrCode className="w-16 h-16 mb-4 opacity-20" />
              <p>Upload a QR code and analyze it to see results here.</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
