import React, { useEffect, useRef, useState } from 'react';

const Viewer: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hostId, setHostId] = useState('');
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
      if (data.type === 'offer') {
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
        peerConnection.current.onicecandidate = (event) => {
          if (event.candidate) {
            ws.current?.send(JSON.stringify({ type: 'ice-candidate', candidate: event.candidate, to: data.from }));
          }
        };

        peerConnection.current.ontrack = (event) => {
          if (videoRef.current) {
            videoRef.current.srcObject = event.streams[0];
            console.log('Stream received and assigned to video element.', event.streams[0]);
          }
          setPcStatus('connected');
        };

        await peerConnection.current.setRemoteDescription(data);
        const answer = await peerConnection.current.createAnswer();
        await peerConnection.current.setLocalDescription(answer);
        ws.current?.send(JSON.stringify({ type: 'answer', sdp: answer.sdp, to: data.from }));
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

  const connectToHost = () => {
    const target = hostId.trim();
    if (!target) {
      alert('Please enter a valid Host ID');
      return;
    }
    if (ws.current && target) {
      ws.current.send(JSON.stringify({ type: 'connect', hostId: target }));
    }
  };

  return (
    <div className="container">
      <h1 className="my-4">Viewer</h1>
      <div className="input-group mb-3">
        <input type="text" className="form-control" placeholder="Enter Host ID" value={hostId} onChange={(e) => setHostId(e.target.value)} />
        <button className="btn btn-primary" onClick={connectToHost}>Connect</button>
      </div>
      <video ref={videoRef} autoPlay style={{ width: '100%' }} />
      <div className="mt-3">
        <strong>WebSocket:</strong> {wsStatus} {' '} <strong>Peer:</strong> {pcStatus}
      </div>
    </div>
  );
};

export default Viewer;
