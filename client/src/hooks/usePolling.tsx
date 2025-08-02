import { useEffect, useRef, useCallback } from 'react';

interface UsePollingOptions {
  interval: number; // Polling interval in milliseconds
  enabled: boolean; // Whether polling is enabled
  immediate?: boolean; // Whether to run immediately on mount
}

interface UsePollingReturn {
  start: () => void;
  stop: () => void;
  isRunning: boolean;
}

export const usePolling = (
  callback: () => Promise<void> | void,
  options: UsePollingOptions
): UsePollingReturn => {
  const { interval, enabled, immediate = true } = options;
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const callbackRef = useRef(callback);
  const isRunningRef = useRef(false);

  // Update callback ref when callback changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // Start polling
  const start = useCallback(() => {
    if (isRunningRef.current) return;

    isRunningRef.current = true;

    const runCallback = async () => {
      try {
        await callbackRef.current();
      } catch (error) {
        console.error('Polling callback error:', error);
      }
    };

    // Run immediately if requested
    if (immediate) {
      runCallback();
    }

    // Set up interval
    intervalRef.current = setInterval(runCallback, interval);
  }, [interval, immediate]);

  // Stop polling
  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    isRunningRef.current = false;
  }, []);

  // Effect to handle enabled state
  useEffect(() => {
    if (enabled) {
      start();
    } else {
      stop();
    }

    return stop;
  }, [enabled, start, stop]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return {
    start,
    stop,
    isRunning: isRunningRef.current,
  };
};

// Hook for room sync polling
export const useRoomPolling = (
  roomId: string | null,
  onUpdate: (data: any) => void,
  options: Partial<UsePollingOptions> = {}
) => {
  const defaultOptions: UsePollingOptions = {
    interval: 3000, // 3 seconds
    enabled: !!roomId,
    immediate: true,
    ...options,
  };

  const lastUpdateRef = useRef<number>(0);

  const pollCallback = useCallback(async () => {
    if (!roomId) return;

    try {
      const { roomService } = await import('../services/room.service');
      const syncData = await roomService.getSyncData(roomId, lastUpdateRef.current);

      if (syncData.has_updates) {
        lastUpdateRef.current = syncData.last_update;
        onUpdate(syncData);
      }
    } catch (error) {
      console.error('Room polling error:', error);
    }
  }, [roomId, onUpdate]);

  return usePolling(pollCallback, defaultOptions);
};

// Hook for adaptive polling (adjusts interval based on activity)
export const useAdaptivePolling = (
  callback: () => Promise<void> | void,
  options: UsePollingOptions & {
    fastInterval?: number;
    slowInterval?: number;
    activityThreshold?: number;
  }
) => {
  const {
    fastInterval = 2000,
    slowInterval = 5000,
    activityThreshold = 30000, // 30 seconds
    ...pollingOptions
  } = options;

  const lastActivityRef = useRef<number>(Date.now());
  const currentIntervalRef = useRef<number>(fastInterval);

  // Update activity timestamp
  const updateActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    currentIntervalRef.current = fastInterval;
  }, [fastInterval]);

  // Adaptive callback that adjusts interval
  const adaptiveCallback = useCallback(async () => {
    const now = Date.now();
    const timeSinceActivity = now - lastActivityRef.current;

    // Switch to slow polling if no recent activity
    if (timeSinceActivity > activityThreshold && currentIntervalRef.current === fastInterval) {
      currentIntervalRef.current = slowInterval;
      // Restart polling with new interval
      return;
    }

    await callback();
  }, [callback, activityThreshold, fastInterval, slowInterval]);

  const polling = usePolling(adaptiveCallback, {
    ...pollingOptions,
    interval: currentIntervalRef.current,
  });

  return {
    ...polling,
    updateActivity,
    currentInterval: currentIntervalRef.current,
  };
};

// Hook for exponential backoff polling (for error recovery)
export const useBackoffPolling = (
  callback: () => Promise<void> | void,
  options: UsePollingOptions & {
    maxRetries?: number;
    backoffMultiplier?: number;
    maxInterval?: number;
  }
) => {
  const {
    maxRetries = 5,
    backoffMultiplier = 2,
    maxInterval = 30000, // 30 seconds max
    ...pollingOptions
  } = options;

  const retriesRef = useRef<number>(0);
  const currentIntervalRef = useRef<number>(pollingOptions.interval);

  const backoffCallback = useCallback(async () => {
    try {
      await callback();
      // Reset on success
      retriesRef.current = 0;
      currentIntervalRef.current = pollingOptions.interval;
    } catch (error) {
      console.error('Polling error:', error);
      
      retriesRef.current += 1;
      
      if (retriesRef.current <= maxRetries) {
        // Exponential backoff
        currentIntervalRef.current = Math.min(
          pollingOptions.interval * Math.pow(backoffMultiplier, retriesRef.current),
          maxInterval
        );
      } else {
        // Stop polling after max retries
        console.error('Max polling retries reached');
        return;
      }
    }
  }, [callback, pollingOptions.interval, maxRetries, backoffMultiplier, maxInterval]);

  return usePolling(backoffCallback, {
    ...pollingOptions,
    interval: currentIntervalRef.current,
  });
};

export default usePolling;