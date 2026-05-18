import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

function isHlsUrl(url: string): boolean {
  return /\.m3u8(\?|#|$)/i.test(url);
}

type CourseVideoPlayerProps = {
  src: string;
  className?: string;
  autoPlay?: boolean;
};

/**
 * Plays course videos including HLS (`.m3u8`) via hls.js; MP4/WebM use native playback.
 * Shows a loading state until the stream is ready — no empty player chrome first.
 */
export function CourseVideoPlayer({
  src,
  className,
  autoPlay = false,
}: CourseVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src.trim()) return;

    setError(null);
    setIsReady(false);
    video.removeAttribute("src");

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const markReady = () => {
      setIsReady(true);
      if (autoPlay) {
        void video.play().catch(() => {
          /* autoplay may be blocked until user taps */
        });
      }
    };

    const onCanPlay = () => markReady();
    const onLoadedData = () => {
      if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        markReady();
      }
    };

    video.addEventListener("canplay", onCanPlay);
    video.addEventListener("loadeddata", onLoadedData);

    if (isHlsUrl(src)) {
      if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = src;
      } else if (Hls.isSupported()) {
        const hls = new Hls({ enableWorker: true });
        hlsRef.current = hls;
        hls.loadSource(src);
        hls.attachMedia(video);
        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal) {
            setError("Could not play this video stream. Check your connection and try again.");
          }
        });
      } else {
        setError("HLS video is not supported in this browser.");
      }
    } else {
      video.src = src;
    }

    return () => {
      video.removeEventListener("canplay", onCanPlay);
      video.removeEventListener("loadeddata", onLoadedData);
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [src, autoPlay]);

  const showLoading = !error && !isReady;

  return (
    <div className="relative flex w-full min-h-[min(50vh,320px)] items-center justify-center">
      {showLoading ? (
        <div
          className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-black"
          role="status"
          aria-live="polite"
          aria-label="Loading video"
        >
          <Loader2 className="h-10 w-10 animate-spin text-white/90" aria-hidden />
          <p className="text-sm font-medium text-white/70">Loading video…</p>
        </div>
      ) : null}

      {error ? (
        <p className="px-4 text-center text-sm text-red-300" role="alert">
          {error}
        </p>
      ) : null}

      <video
        ref={videoRef}
        controls={isReady}
        playsInline
        className={cn(
          className,
          !isReady && "pointer-events-none absolute opacity-0",
          isReady && "relative opacity-100"
        )}
        onError={() => {
          if (!error) {
            setError("Could not load this video.");
          }
        }}
      />
    </div>
  );
}
