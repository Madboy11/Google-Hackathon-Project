import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { NexusProvider } from './context/NexusContext';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Fleet } from './pages/Fleet';
import { Inventory } from './pages/Inventory';
import { Security } from './pages/Security';
import './index.css';

export default function App() {
  return (
    <NexusProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="logger" element={<Fleet />} />
            <Route path="inventory" element={<Inventory />} />
            <Route path="security" element={<Security />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </NexusProvider>
  );
}
