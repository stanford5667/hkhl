import { useState, useCallback, useRef } from 'react';
import {
  Room,
  RoomEvent,
  Track,
  LocalTrack,
  RemoteTrack,
  RemoteTrackPublication,
  Participant,
  ConnectionState,
  createLocalTracks,
} from 'livekit-client';
import { supabase } from '@/integrations/supabase/client';

export interface LiveKitState {
  connectionState: ConnectionState | 'disconnected';
  isPublishing: boolean;
  participantCount: number;
  error: string | null;
}

export function useLiveKit() {
  const roomRef = useRef<Room | null>(null);
  const [state, setState] = useState<LiveKitState>({
    connectionState: 'disconnected' as ConnectionState,
    isPublishing: false,
    participantCount: 0,
    error: null,
  });
  const [remoteVideoEl, setRemoteVideoEl] = useState<HTMLVideoElement | null>(null);

  const getToken = useCallback(async (roomId: string, isPublisher: boolean) => {
    const { data, error } = await supabase.functions.invoke('livekit-token', {
      body: { roomId, isPublisher },
    });
    if (error) throw new Error(error.message || 'Failed to get token');
    if (data?.error) throw new Error(data.error);
    return data as { token: string; wsUrl: string; room: string };
  }, []);

  const startPublishing = useCallback(async (
    roomId: string,
    videoElement: HTMLVideoElement,
    screenShare: boolean = false,
  ) => {
    try {
      setState(s => ({ ...s, error: null }));

      // IMPORTANT: Capture media BEFORE any async calls to preserve user gesture context.
      // Browsers require getDisplayMedia/getUserMedia to be called synchronously from a click handler.
      let preAcquiredStream: MediaStream | null = null;
      if (screenShare) {
        preAcquiredStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      } else {
        preAcquiredStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      }

      // Show preview immediately while we connect
      videoElement.srcObject = preAcquiredStream;

      const { token, wsUrl } = await getToken(roomId, true);

      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
      });
      roomRef.current = room;

      room.on(RoomEvent.ParticipantConnected, () => {
        setState(s => ({ ...s, participantCount: room.numParticipants }));
      });
      room.on(RoomEvent.ParticipantDisconnected, () => {
        setState(s => ({ ...s, participantCount: room.numParticipants }));
      });
      room.on(RoomEvent.Disconnected, () => {
        setState(s => ({ ...s, connectionState: 'disconnected' as ConnectionState, isPublishing: false }));
      });
      room.on(RoomEvent.ConnectionStateChanged, (cs) => {
        setState(s => ({ ...s, connectionState: cs }));
      });

      await room.connect(wsUrl, token);
      setState(s => ({ ...s, participantCount: room.numParticipants }));

      // Publish the pre-acquired tracks directly to avoid re-prompting for media
      for (const track of preAcquiredStream.getTracks()) {
        const source = track.kind === 'video'
          ? (screenShare ? Track.Source.ScreenShare : Track.Source.Camera)
          : (screenShare ? Track.Source.ScreenShareAudio : Track.Source.Microphone);
        await room.localParticipant.publishTrack(track, { source });
      }

      // The video element already has srcObject set from pre-acquisition,
      // but re-attach via LiveKit for consistency
      const vidSource = screenShare ? Track.Source.ScreenShare : Track.Source.Camera;
      const camPub = room.localParticipant.getTrackPublication(vidSource);
      if (camPub?.track) {
        camPub.track.attach(videoElement);
      }

      setState(s => ({ ...s, isPublishing: true }));
    } catch (err: any) {
      // If user cancelled screen share picker, disconnect cleanly
      if (roomRef.current && !roomRef.current.localParticipant.getTrackPublication(Track.Source.Camera) 
          && !roomRef.current.localParticipant.getTrackPublication(Track.Source.ScreenShare)) {
        roomRef.current.disconnect();
        roomRef.current = null;
      }
      console.error('LiveKit publish error:', err);
      setState(s => ({ ...s, error: err.message }));
      throw err;
    }
  }, [getToken]);

  const joinAsViewer = useCallback(async (
    roomId: string,
    videoElement: HTMLVideoElement,
  ) => {
    try {
      setState(s => ({ ...s, error: null }));
      const { token, wsUrl } = await getToken(roomId, false);

      const room = new Room({ adaptiveStream: true, dynacast: true });
      roomRef.current = room;

      room.on(RoomEvent.TrackSubscribed, (
        track: RemoteTrack,
        publication: RemoteTrackPublication,
        participant: Participant,
      ) => {
        if (track.kind === Track.Kind.Video) {
          track.attach(videoElement);
        }
        if (track.kind === Track.Kind.Audio) {
          track.attach(videoElement);
        }
      });

      room.on(RoomEvent.ParticipantConnected, () => {
        setState(s => ({ ...s, participantCount: room.numParticipants }));
      });
      room.on(RoomEvent.ParticipantDisconnected, () => {
        setState(s => ({ ...s, participantCount: room.numParticipants }));
      });
      room.on(RoomEvent.Disconnected, () => {
        setState(s => ({ ...s, connectionState: 'disconnected' as ConnectionState }));
      });
      room.on(RoomEvent.ConnectionStateChanged, (cs) => {
        setState(s => ({ ...s, connectionState: cs }));
      });

      await room.connect(wsUrl, token);
      setState(s => ({ ...s, participantCount: room.numParticipants }));
    } catch (err: any) {
      console.error('LiveKit viewer error:', err);
      setState(s => ({ ...s, error: err.message }));
      throw err;
    }
  }, [getToken]);

  const disconnect = useCallback(() => {
    if (roomRef.current) {
      roomRef.current.disconnect();
      roomRef.current = null;
    }
    setState({
      connectionState: 'disconnected' as ConnectionState,
      isPublishing: false,
      participantCount: 0,
      error: null,
    });
  }, []);

  const toggleMute = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;
    const enabled = room.localParticipant.isMicrophoneEnabled;
    await room.localParticipant.setMicrophoneEnabled(!enabled);
  }, []);

  const toggleCamera = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;
    const enabled = room.localParticipant.isCameraEnabled;
    await room.localParticipant.setCameraEnabled(!enabled);
  }, []);

  return {
    state,
    startPublishing,
    joinAsViewer,
    disconnect,
    toggleMute,
    toggleCamera,
  };
}
