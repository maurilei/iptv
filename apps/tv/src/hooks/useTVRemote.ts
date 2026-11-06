import { useState, useCallback } from 'react';
import { useTVEventHandler } from 'react-native';

export interface TVRemoteEvent {
  eventType: string;
  tag?: number;
  timestamp: number;
}

export const useTVRemote = () => {
  const [lastEvent, setLastEvent] = useState<TVRemoteEvent | null>(null);
  const [eventCount, setEventCount] = useState<number>(0);

  const handleTVEvent = useCallback((evt: any) => {
    if (evt && evt.eventType) {
      setLastEvent({
        eventType: evt.eventType,
        tag: evt.tag,
        timestamp: Date.now(),
      });
      setEventCount((prev) => prev + 1);
    }
  }, []);

  // In react-native-tvos, useTVEventHandler is the standard official hook
  if (typeof useTVEventHandler === 'function') {
    useTVEventHandler(handleTVEvent);
  }

  return { lastEvent, eventCount };
};
