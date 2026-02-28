import { Link } from "react-router-dom";
import { Shield, QrCode, Link as LinkIcon, ArrowRight } from "lucide-react";
import { motion } from "motion/react";

export default function Home() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto py-12"
    >
      <div className="text-center mb-16">
        <div className="inline-flex items-center justify-center p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 mb-6">
          <Shield className="w-10 h-10 text-emerald-400" />
        </div>
        <h1 className="text-5xl font-bold tracking-tight text-white mb-6">
          Security Suite
        </h1>
        <p className="text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed">
          A suite of advanced tools to analyze, preview, and protect against modern web threats.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Link
          to="/qr"
          className="group relative bg-zinc-900 border border-zinc-800 rounded-3xl p-8 hover:bg-zinc-800/50 transition-all hover:border-emerald-500/30 overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110 duration-500">
            <QrCode className="w-32 h-32" />
          </div>
          <div className="relative z-10">
            <div className="w-12 h-12 bg-zinc-800 rounded-xl flex items-center justify-center mb-6 group-hover:bg-emerald-500/20 group-hover:text-emerald-400 transition-colors">
              <QrCode className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-semibold text-white mb-3">QR Code Risk Analyzer</h2>
            <p className="text-zinc-400 mb-8 leading-relaxed">
              Upload any QR code to extract its destination URL and analyze it for phishing, typosquatting, and suspicious patterns before you scan it with your phone.
            </p>
            <div className="flex items-center text-emerald-400 font-medium text-sm">
              Try Analyzer <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </Link>

        <Link
          to="/link"
          className="group relative bg-zinc-900 border border-zinc-800 rounded-3xl p-8 hover:bg-zinc-800/50 transition-all hover:border-violet-500/30 overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110 duration-500">
            <LinkIcon className="w-32 h-32" />
          </div>
          <div className="relative z-10">
            <div className="w-12 h-12 bg-zinc-800 rounded-xl flex items-center justify-center mb-6 group-hover:bg-violet-500/20 group-hover:text-violet-400 transition-colors">
              <LinkIcon className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-semibold text-white mb-3">SecureLink Proxy</h2>
            <p className="text-zinc-400 mb-8 leading-relaxed">
              Paste a suspicious link to safely trace its redirect chain, capture a screenshot of the final destination, and analyze the page for hidden threats.
            </p>
            <div className="flex items-center text-violet-400 font-medium text-sm">
              Try SecureLink <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </Link>
      </div>
    </motion.div>
  );
}
