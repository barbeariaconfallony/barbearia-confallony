import React, { useState, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, X, Minimize2, Maximize2 } from 'lucide-react';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { cn } from '@/lib/utils';

interface SpotifyPlayerProps {
  isOpen: boolean;
  isMinimized: boolean;
  onToggleMinimize: () => void;
  onClose: () => void;
}

const SpotifyPlayer: React.FC<SpotifyPlayerProps> = ({ isOpen, isMinimized, onToggleMinimize, onClose }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration] = useState(183); // 3:03 duration
  const [isExpanded, setIsExpanded] = useState(false);

  // Simulate progress when playing
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying && currentTime < duration) {
      interval = setInterval(() => {
        setCurrentTime(prev => Math.min(prev + 1, duration));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, currentTime, duration]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickPosition = (e.clientX - rect.left) / rect.width;
    setCurrentTime(Math.floor(clickPosition * duration));
  };

  if (!isOpen) return null;

  // Player minimizado - não renderiza mais a bolinha aqui pois está no SocialMediaCard
  if (isMinimized) {
    return null;
  }

  // Player redimensionável no canto superior esquerdo
  return (
    <div className="fixed top-4 left-4 z-[70] animate-fade-in">
      <ResizablePanelGroup
        direction="horizontal"
        className={cn(
          "bg-gradient-to-br from-gray-900 via-green-900 to-black rounded-lg shadow-2xl border border-green-500/20 animate-scale-in",
          isExpanded ? "w-screen h-screen !fixed !top-0 !left-0 rounded-none z-[80]" : "min-w-[280px] min-h-[200px] max-w-[600px] max-h-[500px]"
        )}
      >
        <ResizablePanel defaultSize={100} minSize={30}>
          <ResizablePanelGroup direction="vertical">
            <ResizablePanel defaultSize={100} minSize={30}>
              <div className="h-full flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-2 sm:p-3 border-b border-green-500/20 flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 sm:w-6 sm:h-6 text-green-500" viewBox="0 0 496 512" fill="currentColor">
                      <path d="M248 8C111.1 8 0 119.1 0 256s111.1 248 248 248 248-111.1 248-248S384.9 8 248 8zm100.7 364.9c-4.2 0-6.8-1.3-10.7-3.6-62.4-37.6-135-39.2-206.7-24.5-3.9 1-9 2.6-11.9 2.6-9.7 0-15.8-7.7-15.8-15.8 0-10.3 6.1-15.2 13.6-16.8 81.9-18.1 165.6-16.5 237 26.2 6.1 3.9 9.7 7.4 9.7 16.5s-7.1 15.4-15.2 15.4zm26.9-65.6c-5.2 0-8.7-2.3-12.3-4.2-62.5-37-155.7-51.9-238.6-29.4-4.8 1.3-7.4 2.6-11.9 2.6-10.7 0-19.4-8.7-19.4-19.4s5.2-17.8 15.5-20.7c27.8-7.8 56.2-13.6 97.8-13.6 64.9 0 127.6 16.1 177 45.5 8.1 4.8 11.3 11 11.3 19.7-.1 10.8-8.5 19.5-19.4 19.5zm31-76.2c-5.2 0-8.4-1.3-12.9-3.9-71.2-42.5-198.5-52.7-280.9-29.7-3.6 1-8.1 2.6-12.9 2.6-13.2 0-23.3-10.3-23.3-23.6 0-13.6 8.4-21.3 17.4-23.9 35.2-10.3 74.6-15.2 117.5-15.2 73 0 149.5 15.2 205.4 47.8 7.8 4.5 12.9 10.7 12.9 22.6 0 13.6-11 23.3-23.2 23.3z" />
                    </svg>
                    <span className="text-green-500 font-semibold text-sm sm:text-base truncate">Spotify Player</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setIsExpanded(!isExpanded)}
                      className="text-white/60 hover:text-white transition-colors p-1 rounded hover:bg-white/10"
                      title={isExpanded ? "Sair da tela cheia" : "Tela cheia"}
                    >
                      <Maximize2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={onToggleMinimize}
                      className="text-white/60 hover:text-white transition-colors p-1 rounded hover:bg-white/10"
                      title="Minimizar"
                    >
                      <Minimize2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={onClose}
                      className="text-white/60 hover:text-white transition-colors p-1 rounded hover:bg-white/10"
                      title="Fechar"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Main Content */}
                <div className="p-3 sm:p-4 flex-1 flex flex-col justify-center">
                  {/* Track Info */}
                  <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                        <path d="12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-white font-semibold text-sm sm:text-base truncate">Barbershop Blues</div>
                      <div className="text-white/70 text-xs sm:text-sm truncate">Confallony Sessions</div>
                    </div>
                  </div>

                  {/* Controls */}
                  <div className="flex items-center justify-center gap-3 sm:gap-4 mb-3 sm:mb-4">
                    <button className="text-white/60 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10">
                      <SkipBack className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                    <button
                      onClick={() => setIsPlaying(!isPlaying)}
                      className="bg-white text-black rounded-full p-2 sm:p-2.5 hover:scale-105 transition-transform shadow-lg"
                    >
                      {isPlaying ? (
                        <Pause className="w-4 h-4 sm:w-5 sm:h-5" />
                      ) : (
                        <Play className="w-4 h-4 sm:w-5 sm:h-5 ml-0.5" />
                      )}
                    </button>
                    <button className="text-white/60 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10">
                      <SkipForward className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                  </div>

                  {/* Progress Bar */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-white/60 tabular-nums">{formatTime(currentTime)}</span>
                    <div
                      onClick={handleProgressClick}
                      className="flex-1 h-1 sm:h-1.5 bg-white/20 rounded-full cursor-pointer group"
                    >
                      <div
                        className="h-full bg-green-500 rounded-full relative group-hover:bg-green-400 transition-colors"
                        style={{ width: `${(currentTime / duration) * 100}%` }}
                      >
                        <div className="absolute right-0 top-1/2 transform translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg" />
                      </div>
                    </div>
                    <span className="text-xs text-white/60 tabular-nums">{formatTime(duration)}</span>
                  </div>
                </div>
              </div>
            </ResizablePanel>
            <ResizableHandle withHandle />
          </ResizablePanelGroup>
        </ResizablePanel>
        <ResizableHandle withHandle />
      </ResizablePanelGroup>
    </div>
  );
};

export default SpotifyPlayer;