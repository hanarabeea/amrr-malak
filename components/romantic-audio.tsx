'use client';

import { useState, useRef, useEffect } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/translations';

export function RomanticAudio() {
  const [isMuted, setIsMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const wasPlayingRef = useRef(false); // Track if music was playing before tab switch
  const t = useTranslation();

  // Handle first user interaction to start audio
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleFirstInteraction = async () => {
      if (audioRef.current && !isPlaying) {
        try {
          const audio = audioRef.current;
          // Ensure src is set (required for Android)
          if (!audio.getAttribute('src') || !audio.src) {
            audio.src = '/romantic-piano.mp3';
            audio.load();
          }
          audio.muted = false;
          // Wait for audio to be ready before playing (important for Android)
          if (audio.readyState < 2) {
            await new Promise((resolve) => {
              audio.addEventListener('canplay', resolve, { once: true });
            });
          }
          await audio.play();
          setIsPlaying(true);
        } catch (err) {
          console.log('Autoplay prevented, user can click button to start:', err);
        }
      }
    };

    // Add event listeners for first user interaction (more comprehensive for Android)
    const events = ['click', 'touchstart', 'touchend', 'mousedown'];
    events.forEach(event => {
      document.addEventListener(event, handleFirstInteraction, { once: true, passive: true });
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleFirstInteraction);
      });
    };
  }, [isPlaying]);

  // Initialize audio settings
  useEffect(() => {
    if (!audioRef.current) return;

    const audio = audioRef.current;

    // Set initial volume and mute state
    audio.volume = 0.25;
    audio.muted = isMuted;

    // Ensure src is present (required for Android - must be set in JSX or here)
    if (!audio.getAttribute('src') || !audio.src) {
      audio.src = '/romantic-piano.mp3';
      audio.load();
    }

    // Try to play automatically (works on some browsers, not Android)
    const handleCanPlay = async () => {
      try {
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          await playPromise;
          setIsPlaying(true);
          wasPlayingRef.current = true;
        }
      } catch (err) {
        // Autoplay prevented - user will need to interact (especially on Android)
        console.log('Autoplay prevented, waiting for user interaction');
      }
    };

    // Add event listener for when audio is ready
    audio.addEventListener('canplay', handleCanPlay, { once: true });
    audio.addEventListener('canplaythrough', handleCanPlay, { once: true });

    // If audio is already ready, trigger immediately
    if (audio.readyState >= 3) {
      handleCanPlay();
    }

    return () => {
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('canplaythrough', handleCanPlay);
      if (audio && !audio.paused) {
        audio.pause();
      }
    };
  }, []);

  // Handle mute state changes
  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.muted = isMuted;
  }, [isMuted]);

  // Pause music when user leaves the browser/tab
  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    const pauseIfPlaying = () => {
      if (!audioRef.current) return;
      const a = audioRef.current;
      try {
        // Force stop and silence in background across browsers
        a.muted = true;
        a.pause();
        try { a.currentTime = 0; } catch {}
        // Don't remove src on Android as it causes issues - just pause
        wasPlayingRef.current = false;
        setIsPlaying(false);
        // Best effort: clear media session playback indicator when supported
        try { (navigator as any)?.mediaSession && ((navigator as any).mediaSession.playbackState = 'none'); } catch {}
      } catch (error) {
        console.error('Error while pausing audio:', error);
      }
    };

    const isDocumentHidden = () => {
      const d = document as any;
      return d.hidden === true || d.visibilityState === 'hidden' || d.webkitHidden === true;
    };

    const handleVisibilityChange = () => {
      if (isDocumentHidden()) {
        pauseIfPlaying();
      }
    };

    const handlePageHide = () => {
      // iOS Safari reliably fires pagehide on app switch/back/close
      pauseIfPlaying();
    };

    const handleBeforeUnload = () => {
      pauseIfPlaying();
    };

    const handleBlur = () => {
      // Some browsers only fire blur when switching tabs
      pauseIfPlaying();
    };

    const handleFreeze = () => {
      // Chrome Page Lifecycle: tab is frozen
      pauseIfPlaying();
    };

    try {
      document.addEventListener('visibilitychange', handleVisibilityChange);
      // Safari older versions
      (document as any).addEventListener?.('webkitvisibilitychange', handleVisibilityChange as EventListener);
      document.addEventListener('freeze', handleFreeze as EventListener);
      // pagehide on both window and document for broader coverage
      document.addEventListener('pagehide', handlePageHide as EventListener);
      window.addEventListener('pagehide', handlePageHide);
      window.addEventListener('beforeunload', handleBeforeUnload);
      window.addEventListener('blur', handleBlur);
    } catch (error) {
      console.error('Error adding pause listeners:', error);
    }

    return () => {
      try {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        (document as any).removeEventListener?.('webkitvisibilitychange', handleVisibilityChange as EventListener);
        document.removeEventListener('freeze', handleFreeze as EventListener);
        document.removeEventListener('pagehide', handlePageHide as EventListener);
        window.removeEventListener('pagehide', handlePageHide);
        window.removeEventListener('beforeunload', handleBeforeUnload);
        window.removeEventListener('blur', handleBlur);
      } catch (error) {
        console.error('Error removing pause listeners:', error);
      }
    };
  }, [isMuted]);

  const toggleMute = async () => {
    if (!audioRef.current) return;
    
    const audio = audioRef.current;
    
    // If audio is not playing, try to start it (required for Android)
    if (!isPlaying) {
      try {
        // Ensure src is set
        if (!audio.getAttribute('src')) {
          audio.src = '/romantic-piano.mp3';
          audio.load();
        }
        audio.muted = false;
        await audio.play();
        setIsPlaying(true);
        setIsMuted(false);
        return;
      } catch (err) {
        console.log('Failed to play audio:', err);
        // If play fails, just toggle mute state
      }
    }
    
    // Toggle mute state if already playing
    setIsMuted(!isMuted);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleMute}
        className="
          rounded-full w-12 h-12 
          bg-pink-100 hover:bg-pink-200 
          active:bg-pink-300
          transition-all duration-200 
          flex items-center justify-center
          shadow-md
          text-pink-700
        "
        aria-label={isMuted ? t('unmuteMusic') : t('muteMusic')}
        title={isMuted ? t('unmuteMusic') : t('muteMusic')}
      >
        {isMuted ? (
          <VolumeX className="h-6 w-6" aria-hidden="true" />
        ) : (
          <Volume2 className="h-6 w-6" aria-hidden="true" />
        )}
      </Button>
      
      <audio
        ref={audioRef}
        src="/romantic-piano.mp3"
        loop
        playsInline
        preload="auto"
        crossOrigin="anonymous"
        className="hidden"
      />
    </div>
  );
}