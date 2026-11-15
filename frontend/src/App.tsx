import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import { HealthScreen } from '@/screens/HealthScreen'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HealthScreen />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}