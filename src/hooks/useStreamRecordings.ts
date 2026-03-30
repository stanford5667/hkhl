import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface StreamRecording {
  id: string;
  room_id: string;
  recorded_by: string;
  title: string | null;
  duration_seconds: number | null;
  file_path: string;
  file_size: number | null;
  created_at: string;
}

export function useStreamRecordings(roomId: string) {
  const [recordings, setRecordings] = useState<StreamRecording[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchRecordings = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('stream_recordings')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setRecordings(data as StreamRecording[]);
    }
    setLoading(false);
  }, [roomId]);

  useEffect(() => {
    fetchRecordings();
  }, [fetchRecordings]);

  const saveRecording = useCallback(async (
    blob: Blob,
    durationSeconds: number,
    title?: string,
  ) => {
    if (!user) throw new Error('Not authenticated');

    const fileName = `${roomId}/${Date.now()}.webm`;
    const { error: uploadError } = await supabase.storage
      .from('stream-recordings')
      .upload(fileName, blob, { contentType: 'video/webm' });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('stream-recordings')
      .getPublicUrl(fileName);

    const { error: insertError } = await supabase
      .from('stream_recordings')
      .insert({
        room_id: roomId,
        recorded_by: user.id,
        title: title || `Stream ${new Date().toLocaleDateString()}`,
        duration_seconds: Math.round(durationSeconds),
        file_path: publicUrl,
        file_size: blob.size,
      });

    if (insertError) throw insertError;
    await fetchRecordings();
  }, [roomId, user, fetchRecordings]);

  const deleteRecording = useCallback(async (id: string, filePath: string) => {
    // Extract storage path from public URL
    const urlParts = filePath.split('/stream-recordings/');
    const storagePath = urlParts[1];
    
    if (storagePath) {
      await supabase.storage.from('stream-recordings').remove([storagePath]);
    }
    
    await supabase.from('stream_recordings').delete().eq('id', id);
    await fetchRecordings();
  }, [fetchRecordings]);

  return { recordings, loading, saveRecording, deleteRecording, refetch: fetchRecordings };
}
