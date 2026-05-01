/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  Download, 
  Image as ImageIcon, 
  Trash2, 
  Copy, 
  Loader2, 
  Layers,
  Library,
  Play,
  ChevronRight
} from 'lucide-react';
import promptLibrary from './data/promptLibrary.json';
import { generateImage, generateMultiViewImages, GeneratedImage } from './services/geminiService';

const ASPECT_RATIOS = [
  { id: '1:1', label: 'Square', icon: '1:1' },
  { id: '16:9', label: 'Widescreen', icon: '16:9' },
  { id: '4:3', label: 'Standard', icon: '4:3' },
  { id: '3:4', label: 'Portrait', icon: '3:4' },
  { id: '9:16', label: 'Story', icon: '9:16' }
];

export default function App() {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentImages, setCurrentImages] = useState<GeneratedImage[]>([]);
  const [history, setHistory] = useState<GeneratedImage[]>([]);
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const scrollRef = useRef<HTMLDivElement>(null);

  // Load history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('dreamgen_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
  }, []);

  // Save history to localStorage with quota safety
  useEffect(() => {
    try {
      localStorage.setItem('dreamgen_history', JSON.stringify(history));
    } catch (e) {
      console.warn("Storage quota exceeded. Pruning history...");
      // If quota exceeded, keep only the 5 most recent items to recover space
      if (history.length > 5) {
        setHistory(prev => prev.slice(0, 5));
      }
    }
  }, [history]);

  const handleDownload = (img: GeneratedImage) => {
    const link = document.createElement('a');
    link.href = img.url;
    link.download = `dreamgen-${Date.now()}.png`;
    link.click();
  };

  const removeFromHistory = (timestamp: number) => {
    setHistory(prev => prev.filter(img => img.timestamp !== timestamp));
    setCurrentImages(prev => prev.filter(img => img.timestamp !== timestamp));
  };

  const handleCopyPrompt = (img: GeneratedImage) => {
    navigator.clipboard.writeText(img.prompt);
  };

  const selectFromHistory = (img: GeneratedImage) => {
    setCurrentImages([img]);
    setPrompt(img.prompt);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLibraryAction = async (promptText: string, autoGenerate: boolean = false) => {
    setPrompt(promptText);
    if (autoGenerate) {
      // Small delay to ensure state is updated if needed, though handleGenerate uses the local prompt if passed
      // But handleGenerate currently uses the 'prompt' state. 
      // I'll modify handleGenerate to accept an optional prompt or just use a timeout.
      // Better: pass the prompt directly to handleGenerate.
      await handleGenerateInternal(promptText);
    }
  };

  const handleGenerateInternal = async (overridePrompt?: string) => {
    const targetPrompt = overridePrompt || prompt;
    if (!targetPrompt.trim() || isGenerating) return;

    setIsGenerating(true);
    setError(null);

    try {
      const views = ["Cinematic Wide Shot", "Side Profile", "Macro Close-up"];
      const newImages = await generateMultiViewImages(targetPrompt, views, aspectRatio);
      
      setCurrentImages(newImages);
      setHistory(prev => [...newImages, ...prev].slice(0, 30));
    } catch (err: any) {
      setError(err.message || "Failed to generate images. Please check your API key.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Replace original handleGenerate
  const handleGenerate = () => handleGenerateInternal();

  const categories = ['All', ...new Set(promptLibrary.map(p => p.category))];
  const filteredPrompts = selectedCategory === 'All' 
    ? promptLibrary 
    : promptLibrary.filter(p => p.category === selectedCategory);

  return (
    <div className="min-h-screen relative pb-20 px-4 md:px-8">
      <div className="atmosphere" />
      
      {/* Header */}
      <header className="max-w-7xl mx-auto pt-12 pb-16 flex flex-col items-center">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 mb-4"
        >
          <div className="p-2 bg-accent/10 rounded-xl">
            <Sparkles className="w-8 h-8 text-accent" />
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-black tracking-tight italic text-zinc-900">
            DreamGen
          </h1>
        </motion.div>
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-zinc-500 text-center max-w-xl"
        >
          Unleash your imagination. Professional-grade image synthesis 
          powered by advanced neural architectures.
        </motion.p>
      </header>

      <main className="max-w-7xl mx-auto space-y-12">
        
        {/* Top Section: Library and Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          
          {/* Left Column: Prompt Library */}
          <section className="flex flex-col gap-6">
            <div className="glass p-6 md:p-8 flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                  <Library className="w-4 h-4" />
                  Prompt Library
                </h2>
                <div className="flex gap-1 overflow-x-auto no-scrollbar max-w-[200px]">
                  {categories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`text-[10px] px-3 py-1.5 rounded-lg transition-all whitespace-nowrap ${
                        selectedCategory === cat 
                          ? 'bg-accent text-white shadow-lg shadow-accent/20' 
                          : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                {filteredPrompts.map((item) => (
                  <div 
                    key={item.id}
                    className="group p-4 bg-zinc-50/50 border border-zinc-100 hover:border-zinc-200 rounded-2xl transition-all"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="text-sm font-semibold text-zinc-800">{item.title}</h4>
                      <span className="text-[10px] px-2 py-1 bg-zinc-100 text-zinc-500 rounded-lg uppercase tracking-tighter">
                        {item.category}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 line-clamp-2 mb-4 italic leading-relaxed">
                      "{item.prompt}"
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleLibraryAction(item.prompt, false)}
                        className="flex-1 py-2 bg-zinc-100/50 hover:bg-zinc-100 text-zinc-600 rounded-xl text-xs font-medium transition-all"
                      >
                        Use Template
                      </button>
                      <button
                        onClick={() => handleLibraryAction(item.prompt, true)}
                        className="px-4 py-2 bg-accent/5 hover:bg-accent text-accent hover:text-white rounded-xl transition-all flex items-center justify-center group/btn"
                        title="Instant Generate"
                      >
                        <Play className="w-3.5 h-3.5 fill-current group-hover/btn:scale-110 transition-transform" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-6 border-t border-zinc-100">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-4 flex items-center gap-2">
                  <ImageIcon className="w-3 h-3" />
                  Recent History
                </h3>
                <div className="grid grid-cols-6 gap-2">
                  {history.slice(0, 6).map((img) => (
                    <motion.div
                      key={img.timestamp}
                      layout
                      whileHover={{ scale: 1.1 }}
                      onClick={() => selectFromHistory(img)}
                      className="aspect-square glass overflow-hidden cursor-pointer border-zinc-100 hover:border-accent/50 transition-all relative group/hist shadow-sm"
                    >
                      <img src={img.url} className="w-full h-full object-cover" />
                      <button 
                        onClick={(e) => { e.stopPropagation(); removeFromHistory(img.timestamp); }}
                        className="absolute inset-0 bg-red-500/90 flex items-center justify-center opacity-0 group-hover/hist:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-3 h-3 text-white" />
                      </button>
                    </motion.div>
                  ))}
                  {history.length === 0 && <div className="col-span-6 h-8 border border-dashed border-zinc-200 rounded-lg" />}
                </div>
              </div>
            </div>
          </section>

          {/* Right Column: Prompt Box and Controls */}
          <section className="flex flex-col gap-6">
            <div className="glass p-6 md:p-8 flex flex-col gap-8">
              <div className="space-y-4">
                <label htmlFor="prompt-input" className="text-xs font-bold uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                  <Layers className="w-4 h-4" />
                  Conceptual Prompt Box
                </label>
                <textarea
                  id="prompt-input"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe your vision in detail..."
                  className="w-full h-48 bg-white/50 border border-zinc-200 rounded-2xl p-6 text-zinc-800 placeholder:text-zinc-400 resize-none input-focus-ring text-xl leading-relaxed shadow-inner"
                />
              </div>

              <div className="space-y-8">
                <div className="space-y-4 w-full">
                  <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">Ratio Configuration</span>
                  <div className="flex flex-wrap gap-2">
                    {ASPECT_RATIOS.map((ratio) => (
                      <button
                        key={ratio.id}
                        onClick={() => setAspectRatio(ratio.id)}
                        className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all border ${
                          aspectRatio === ratio.id 
                            ? 'bg-accent text-white border-accent shadow-lg shadow-accent/20' 
                            : 'bg-zinc-100 text-zinc-500 border-zinc-200 hover:bg-zinc-200'
                        }`}
                      >
                        {ratio.label}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleGenerate}
                  disabled={isGenerating || !prompt.trim()}
                  className="w-full py-6 bg-accent hover:opacity-90 disabled:opacity-50 disabled:grayscale transition-all rounded-2xl flex items-center justify-center gap-3 text-xl font-bold text-white group shadow-2xl shadow-accent/20"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-7 h-7 animate-spin" />
                      Synthesizing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-6 h-6 group-hover:scale-125 transition-transform" />
                      Generate Masterpiece
                    </>
                  )}
                </button>
              </div>

              {error && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-4 bg-red-500/5 border border-red-500/20 text-red-600 rounded-xl text-sm flex items-center gap-3"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  {error}
                </motion.div>
              )}
            </div>
          </section>
        </div>

        {/* Bottom Section: Result View */}
        <section className="space-y-8 pt-8">
          <div className="flex items-center gap-4">
            <div className="h-px flex-1 bg-zinc-200" />
            <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Visual synthesis Output</h2>
            <div className="h-px flex-1 bg-zinc-200" />
          </div>

          <AnimatePresence mode="wait">
            {currentImages.length > 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
              >
                {currentImages.map((img) => (
                  <section 
                    key={img.timestamp} 
                    className="glass overflow-hidden group flex flex-col"
                  >
                    <div 
                      className="relative w-full bg-zinc-50 border-b border-zinc-100"
                      style={{ aspectRatio: (aspectRatio || '1:1').replace(':', '/') }}
                    >
                      <img
                        src={img.url}
                        alt={img.prompt}
                        className="w-full h-full object-contain"
                        referrerPolicy="no-referrer"
                      />
                      
                      {/* Action Overlay */}
                      <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button 
                          onClick={() => handleCopyPrompt(img)}
                          className="p-3 bg-white/80 backdrop-blur-md border border-zinc-200 hover:bg-white rounded-xl text-zinc-800 transition-all shadow-xl"
                        >
                          <Copy className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => handleDownload(img)}
                          className="p-3 bg-zinc-900 text-white hover:bg-zinc-800 rounded-xl transition-all shadow-xl flex items-center gap-2 font-bold"
                        >
                          <Download className="w-5 h-5" />
                          <span className="hidden sm:inline text-sm">Save</span>
                        </button>
                      </div>
                    </div>

                    <div className="p-6 space-y-4">
                      <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">
                        {img.prompt.match(/\(([^)]+)\)/)?.[1] || "Original View"}
                      </h3>
                      <p className="text-zinc-700 text-xs italic line-clamp-2 leading-relaxed">
                        "{img.prompt}"
                      </p>
                    </div>
                  </section>
                ))}
              </motion.div>
            ) : (
              <section className="glass min-h-[500px] flex flex-col items-center justify-center p-12 text-center text-zinc-400 border-dashed">
                {isGenerating ? (
                  <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                    className="w-32 h-32 border-2 border-dashed border-accent/20 rounded-full flex items-center justify-center mb-8"
                  >
                    <Sparkles className="w-12 h-12 text-accent/20" />
                  </motion.div>
                ) : (
                  <div className="w-32 h-32 bg-zinc-100 rounded-full flex items-center justify-center mb-8 outline outline-1 outline-zinc-200 outline-offset-8">
                    <ImageIcon className="w-12 h-12 opacity-30" />
                  </div>
                )}
                <h3 className="text-xl font-medium text-zinc-800 mb-3 font-display">
                  {isGenerating ? "Synthesizing Neuronal Pathways..." : "Awaiting Inspiration"}
                </h3>
                <p className="max-w-xs text-sm leading-relaxed">
                  {isGenerating 
                    ? "The model is currently projecting your linguistic vector into latent space. This usually takes 15-20 seconds for 3 views." 
                    : "Select a prompt from the library or type your own concept to begin."}
                </p>
              </section>
            )}
          </AnimatePresence>

          {/* Mobile History View */}
          <section className="lg:hidden">
            <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-400 flex items-center gap-2 mb-4 px-2">
              <ImageIcon className="w-4 h-4" />
              Recent Visions
            </h2>
            <div className="flex gap-4 overflow-x-auto pb-6 -mx-4 px-4 snap-x no-scrollbar">
              {history.map((img) => (
                <div 
                  key={img.timestamp}
                  onClick={() => selectFromHistory(img)}
                  className="snap-start flex-none w-56 aspect-square glass overflow-hidden rounded-3xl"
                >
                  <img src={img.url} alt={img.prompt} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </section>
        </section>
      </main>

      <footer className="max-w-7xl mx-auto mt-20 pt-8 border-t border-zinc-200 flex flex-col md:flex-row justify-between items-center gap-4 text-zinc-400 text-xs tracking-widest uppercase font-mono">
        <p>© 2026 DREAMGEN NEURAL LABS</p>
        <div className="flex gap-6">
          <a href="#" className="hover:text-zinc-600 transition-colors">Documentation</a>
          <a href="#" className="hover:text-zinc-600 transition-colors">Architecture</a>
          <a href="#" className="hover:text-zinc-600 transition-colors">Latency Report</a>
        </div>
      </footer>
    </div>
  );
}

