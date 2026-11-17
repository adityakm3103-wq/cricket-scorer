import { useEffect } from 'react';
import { supabase } from '../lib/supabase.js';

/**
 * Broadcast match update across Supabase Realtime channel
 */
export async function broadcastMatchUpdate(matchId: string, updatedMatch: any) {
  try {
    const channel = supabase.channel(`match:${matchId}`);
    await channel.send({
      type: 'broadcast',
      event: 'match:updated',
      payload: updatedMatch,
    });
  } catch (err) {
    console.warn('Realtime broadcast notice:', err);
  }
}

/**
 * Hook to listen for live match updates using Supabase Realtime
 */
export function useMatchSocket(
  matchId?: string,
  onMatchUpdate?: (data: any) => void
) {
  useEffect(() => {
    if (!matchId || !onMatchUpdate) return;

    const channel = supabase.channel(`match:${matchId}`, {
      config: {
        broadcast: { ack: false, self: false },
      },
    });

    // 1. Listen for instant broadcast updates sent by scorer
    channel.on('broadcast', { event: 'match:updated' }, payload => {
      if (payload?.payload) {
        onMatchUpdate(payload.payload);
      }
    });

    // 2. Listen for Postgres changes on deliveries table for this match
    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'deliveries',
      },
      () => {
        // Trigger refetch by passing empty signal or callback
        onMatchUpdate({ __refetch: true });
      }
    );

    // 3. Listen for Postgres changes on gully_deliveries table
    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'gully_deliveries',
      },
      () => {
        onMatchUpdate({ __refetch: true });
      }
    );

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId, onMatchUpdate]);
}
