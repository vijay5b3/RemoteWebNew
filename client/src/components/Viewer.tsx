import React, { useEffect, useRef, useState } from 'react';

const Viewer: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hostId, setHostId] = useState('');
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    const wsUrl = process.env.REACT_APP_WSS_URL || `ws://${window.location.hostname}:8080`;
    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => {
      console.log('Connected to signaling server');
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
        peerConnection.current.onicecandidate = (event) => {
          if (event.candidate) {
            ws.current?.send(JSON.stringify({ type: 'ice-candidate', candidate: event.candidate, to: data.from }));
          }
        };

        peerConnection.current.ontrack = (event) => {
          if (videoRef.current) {
            videoRef.current.srcObject = event.streams[0];
          }
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
    if (ws.current && hostId) {
      ws.current.send(JSON.stringify({ type: 'connect', hostId }));
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
    </div>
  );
};

export default Viewer;
