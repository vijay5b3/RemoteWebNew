import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Host from './components/Host';
import Viewer from './components/Viewer';
import Home from './components/Home';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/host" element={<Host />} />
          <Route path="/viewer" element={<Viewer />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
