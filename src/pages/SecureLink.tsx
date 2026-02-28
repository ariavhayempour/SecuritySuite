import React, { useState } from "react";
import { Link as LinkIcon, ShieldAlert, AlertTriangle, CheckCircle, Search, Loader2, ArrowRight } from "lucide-react";
import { motion } from "motion/react";
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

interface TraceResult {
  redirects: string[];
  finalUrl: string;
  htmlSnippet: string;
}

interface AnalysisResult {
  suspiciousElements: string[];
  riskScore: number;
  explanation: string;
  isPhishing: boolean;
}

export default function SecureLink() {
  const [url, setUrl] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [traceResult, setTraceResult] = useState<TraceResult | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const analyzeLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;

    setIsAnalyzing(true);
    setError(null);
    setTraceResult(null);
    setAnalysisResult(null);

    try {
      // 1. Trace redirects via backend
      const traceRes = await fetch("/api/trace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      if (!traceRes.ok) {
        throw new Error("Failed to trace URL redirects");
      }

      const traceData: TraceResult = await traceRes.json();
      setTraceResult(traceData);

      // 2. Analyze with Gemini
      const prompt = `
        Analyze the following URL redirect chain and the final HTML snippet for security risks.
        
        Redirect Chain:
        ${traceData.redirects.join(" -> ")}
        
        Final URL: ${traceData.finalUrl}
        
        HTML Snippet (first 5000 chars):
        ${traceData.htmlSnippet}
        
        Provide a risk score from 0 to 100 (100 is extremely dangerous).
        List any suspicious elements (e.g., hidden iframes, obfuscated scripts, fake login forms, typosquatting in the final URL).
        Determine if it's likely a phishing attempt.
        Provide a brief explanation.
        Return strictly in JSON format.
      `;

      const aiResponse = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              suspiciousElements: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "List of suspicious elements found",
              },
              riskScore: { type: Type.NUMBER, description: "Risk score from 0 to 100" },
              explanation: { type: Type.STRING, description: "Brief explanation" },
              isPhishing: { type: Type.BOOLEAN, description: "True if likely phishing" },
            },
            required: ["suspiciousElements", "riskScore", "explanation", "isPhishing"],
          },
        },
      });

      const jsonStr = aiResponse.text?.trim() || "{}";
      const parsed = JSON.parse(jsonStr) as AnalysisResult;
      setAnalysisResult(parsed);
    } catch (err: any) {
      console.error("Analysis failed:", err);
      setError(err.message || "Failed to analyze the link. Please try again.");
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
          <LinkIcon className="w-8 h-8 text-violet-400" />
          SecureLink Proxy
        </h1>
        <p className="text-zinc-400">
          Paste a suspicious link to safely trace its redirect chain and analyze the final destination.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <form onSubmit={analyzeLink} className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 lg:p-8">
            <h2 className="text-xl font-semibold text-white mb-6">Analyze Link</h2>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="url" className="block text-sm font-medium text-zinc-400 mb-2">
                  Suspicious URL
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <LinkIcon className="h-5 w-5 text-zinc-500" />
                  </div>
                  <input
                    type="url"
                    id="url"
                    required
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="block w-full pl-11 pr-4 py-4 bg-zinc-950 border border-zinc-800 rounded-2xl text-white placeholder-zinc-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                    placeholder="https://example.com/suspicious-link"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isAnalyzing || !url}
                className="w-full py-4 bg-violet-500 hover:bg-violet-400 text-white font-semibold rounded-2xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Tracing & Analyzing...
                  </>
                ) : (
                  <>
                    <Search className="w-5 h-5" />
                    Analyze Link
                  </>
                )}
              </button>
            </div>

            {error && (
              <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                <p className="text-sm">{error}</p>
              </div>
            )}
          </form>

          {traceResult && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 lg:p-8"
            >
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <ArrowRight className="w-5 h-5 text-zinc-400" />
                Redirect Chain
              </h3>
              <div className="space-y-3">
                {traceResult.redirects.map((redirectUrl, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="flex flex-col items-center mt-1">
                      <div className="w-2 h-2 rounded-full bg-violet-500" />
                      {index < traceResult.redirects.length - 1 && (
                        <div className="w-0.5 h-8 bg-zinc-800 my-1" />
                      )}
                    </div>
                    <div className="flex-1 p-3 bg-zinc-950 rounded-xl border border-zinc-800 break-all text-sm font-mono text-zinc-300">
                      {redirectUrl}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 lg:p-8 flex flex-col">
          <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-zinc-400" />
            Analysis Results
          </h2>

          {analysisResult && traceResult ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-6 flex-1"
            >
              <div className="relative aspect-video rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-950 group">
                <div className="absolute inset-0 flex items-center justify-center text-zinc-500">
                  <Loader2 className="w-8 h-8 animate-spin" />
                </div>
                <img
                  src={`https://image.thum.io/get/width/1200/crop/800/${traceResult.finalUrl}`}
                  alt="Website Preview"
                  className="absolute inset-0 w-full h-full object-cover z-10"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 to-transparent z-20 pointer-events-none" />
                <div className="absolute bottom-4 left-4 z-30">
                  <div className="text-xs font-semibold text-white uppercase tracking-wider mb-1">Final Destination Preview</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-zinc-950 rounded-2xl border border-zinc-800">
                  <div className="text-xs text-zinc-500 uppercase tracking-wider font-semibold mb-2">Risk Score</div>
                  <div className="flex items-end gap-2">
                    <span className={`text-4xl font-bold ${
                      analysisResult.riskScore < 30 ? "text-emerald-400" :
                      analysisResult.riskScore < 70 ? "text-amber-400" : "text-red-400"
                    }`}>
                      {analysisResult.riskScore}
                    </span>
                    <span className="text-zinc-500 mb-1">/ 100</span>
                  </div>
                </div>

                <div className="p-4 bg-zinc-950 rounded-2xl border border-zinc-800">
                  <div className="text-xs text-zinc-500 uppercase tracking-wider font-semibold mb-2">Phishing Risk</div>
                  <div className="flex items-center gap-2 mt-2">
                    {analysisResult.isPhishing ? (
                      <><AlertTriangle className="w-5 h-5 text-red-400" /><span className="text-red-400 font-medium">Likely Phishing</span></>
                    ) : (
                      <><CheckCircle className="w-5 h-5 text-emerald-400" /><span className="text-emerald-400 font-medium">Low Risk</span></>
                    )}
                  </div>
                </div>
              </div>

              {analysisResult.suspiciousElements.length > 0 && (
                <div className="p-4 bg-red-500/5 rounded-2xl border border-red-500/10">
                  <div className="text-xs text-red-500/70 uppercase tracking-wider font-semibold mb-3">Suspicious Elements</div>
                  <ul className="space-y-2">
                    {analysisResult.suspiciousElements.map((element, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-red-400/90">
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-red-500/50 shrink-0" />
                        {element}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="p-4 bg-zinc-950 rounded-2xl border border-zinc-800">
                <div className="text-xs text-zinc-500 uppercase tracking-wider font-semibold mb-2">Summary</div>
                <p className="text-sm text-zinc-300 leading-relaxed">{analysisResult.explanation}</p>
              </div>
            </motion.div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 min-h-[300px]">
              <Search className="w-16 h-16 mb-4 opacity-20" />
              <p className="text-center max-w-xs">Enter a URL to trace its redirects and analyze the final destination.</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
