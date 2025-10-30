import React, { useEffect, useRef, useState } from 'react';

const Host: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [wsStatus, setWsStatus] = useState<string>('disconnected');
  const [pcStatus, setPcStatus] = useState<string>('idle');
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    const defaultWs = `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}`;
    const wsUrl = process.env.REACT_APP_WSS_URL || defaultWs;
    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => {
      console.log('Connected to signaling server');
      setWsStatus('connected');
    };

    ws.current.onerror = (err) => {
      console.error('WebSocket error', err);
      setWsStatus('error');
    };

    ws.current.onclose = () => {
      console.log('WebSocket closed');
      setWsStatus('closed');
    };

    ws.current.onmessage = async (message) => {
      const data = JSON.parse(message.data);
      if (data.type === 'id') {
        setSessionId(data.id);
      }
      if (data.type === 'viewer-connected') {
        console.log(`Viewer ${data.viewerId} connected. Starting session.`);
        startSession(data.viewerId);
      }
      if (data.type === 'answer') {
        if (peerConnection.current) {
          await peerConnection.current.setRemoteDescription(data);
        }
      }
      if (data.type === 'ice-candidate') {
        if (peerConnection.current) {
          await peerConnection.current.addIceCandidate(data.candidate);
        }
      }
    };

    return () => {
      ws.current?.close();
    };
  }, []);

  const startSession = async (viewerId: string) => {
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      console.log('Screen sharing stream acquired successfully.', stream);
    } catch (error) {
      console.error('Error acquiring screen sharing stream:', error);
      alert('Failed to start screen sharing. Please ensure you grant permissions.');
      return;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }

    peerConnection.current = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    });

    if (peerConnection.current) {
      setPcStatus('connecting');
      peerConnection.current.onconnectionstatechange = () => {
        setPcStatus(peerConnection.current?.connectionState || 'unknown');
      };
    }

    stream.getTracks().forEach(track => {
      peerConnection.current?.addTrack(track, stream);
    });

    peerConnection.current.onicecandidate = (event) => {
      if (event.candidate) {
        ws.current?.send(JSON.stringify({ type: 'ice-candidate', candidate: event.candidate, to: viewerId }));
      }
    };

    const offer = await peerConnection.current.createOffer();
    await peerConnection.current.setLocalDescription(offer);

    ws.current?.send(JSON.stringify({ type: 'offer', sdp: offer.sdp, to: viewerId }));
    setPcStatus('offer-sent');
  };

  return (
    <div className="container">
      <h1 className="my-4">Host Session</h1>
      {sessionId ? (
        <div>
          <h3>Your Session ID: {sessionId}</h3>
          <button className="btn btn-primary">Waiting for Viewer...</button>
        </div>
      ) : (
        <p>Connecting to signaling server...</p>
      )}
      <video ref={videoRef} autoPlay muted style={{ width: '100%' }} />
      <div className="mt-3">
        <strong>WebSocket:</strong> {wsStatus} {' '} <strong>Peer:</strong> {pcStatus}
      </div>
    </div>
  );
};

export default Host;
