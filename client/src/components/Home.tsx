import React from 'react';
import { Link } from 'react-router-dom';

function Home() {
  return (
    <div className="container">
      <h1 className="my-4">Web Remote Desktop</h1>
      <div className="d-grid gap-2">
        <Link to="/host" className="btn btn-primary">Become a Host</Link>
        <Link to="/viewer" className="btn btn-secondary">Become a Viewer</Link>
      </div>
    </div>
  );
}

export default Home;
