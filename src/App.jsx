import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import TrackPage from './pages/TrackPage';
import HelpCenter from './pages/HelpCenter';
import NotFound from './pages/NotFound';
import './styles/globals.css';

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        {/* Home — tracking ID entry */}
        <Route path="/" element={<TrackPage />} />

        {/* Direct link from SMS — goes straight to live map */}
        <Route path="/track/:trackingId" element={<TrackPage />} />

        {/* Help Center + Bug Report */}
        <Route path="/help" element={<HelpCenter />} />

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
