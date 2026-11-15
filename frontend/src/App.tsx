import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import { HealthScreen } from '@/screens/HealthScreen'
import { MapScreen } from '@/screens/MapScreen'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HealthScreen />} />
        <Route path="/map" element={<MapScreen />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}