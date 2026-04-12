// @ts-nocheck
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { supabase } from '../components/supabase';
import FloatingLiveIndicator from "../components/FloatingLiveIndicator";

interface LiveStreamState {
  communityId: string | null;
  liveStreamId: string | null;
  isActive: boolean;
  viewerCount: number;
  likeCount: number;
  isMinimized: boolean;
}

interface LiveStreamContextType {
  liveStream: LiveStreamState;
  minimizeLiveStream: (streamInfo: Omit<LiveStreamState, "isMinimized">) => void;
  resumeLiveStream: () => void;
  endLiveStream: () => void;
}

const LiveStreamContext = createContext<LiveStreamContextType | undefined>(undefined);

export const useLiveStream = () => {
  const context = useContext(LiveStreamContext);
  if (!context) {
    throw new Error("useLiveStream must be used within a LiveStreamProvider");
  }
  return context;
};

interface LiveStreamProviderProps {
  children: React.ReactNode;
}

export const LiveStreamProvider: React.FC<LiveStreamProviderProps> = ({ children }) => {
  const [liveStream, setLiveStream] = useState<LiveStreamState>({
    communityId: null,
    liveStreamId: null,
    isActive: false,
    viewerCount: 0,
    likeCount: 0,
    isMinimized: false,
  });

  const minimizeLiveStream = useCallback(
    (streamInfo: Omit<LiveStreamState, "isMinimized">) => {
      setLiveStream({ ...streamInfo, isMinimized: true });
    },
    []
  );

  const resumeLiveStream = useCallback(() => {
    setLiveStream((prev) => ({ ...prev, isMinimized: false }));
  }, []);

  const endLiveStream = useCallback(async () => {
    try {
      if (liveStream.liveStreamId) {
        await supabase
          .from("live_streams")
          .update({
            is_active: false,
            ended_at: new Date().toISOString(),
            viewer_count: liveStream.viewerCount,
            like_count: liveStream.likeCount,
          })
          .eq("id", liveStream.liveStreamId);
      }
      setLiveStream({
        communityId: null,
        liveStreamId: null,
        isActive: false,
        viewerCount: 0,
        likeCount: 0,
        isMinimized: false,
      });
    } catch (error) {
      console.error("Error ending live stream:", error);
    }
  }, [liveStream.liveStreamId, liveStream.viewerCount, liveStream.likeCount]);

  const contextValue: LiveStreamContextType = useMemo(
    () => ({ liveStream, minimizeLiveStream, resumeLiveStream, endLiveStream }),
    [liveStream, minimizeLiveStream, resumeLiveStream, endLiveStream]
  );

  return (
    <LiveStreamContext.Provider value={contextValue}>
      {children}
      <FloatingLiveIndicator
        visible={liveStream.isMinimized && liveStream.isActive}
        onReturn={resumeLiveStream}
        onEnd={endLiveStream}
        viewerCount={liveStream.viewerCount}
        communityId={liveStream.communityId || undefined}
      />
    </LiveStreamContext.Provider>
  );
};
