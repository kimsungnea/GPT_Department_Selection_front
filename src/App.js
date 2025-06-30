import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';

import MainPage from './Pages/Main/MainPage';
import NavigationPage from './Pages/Navigation/NavigationPage';

function App() {
  return (
    <Router>
      <main style={{ padding: '20px' }}>
        <Routes>
          <Route path="/main" element={<MainPage />} />
          <Route path="/navigation" element={<NavigationPage />} />
          <Route path="/nav" element={<NavigationPage />} />
          <Route path="*" element={<MainPage />} />
        </Routes>
      </main>
    </Router>
  );
}

export default App;