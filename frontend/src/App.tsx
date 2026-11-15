import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import { RequireAuth } from '@/components/RequireAuth'
import { HealthScreen } from '@/screens/HealthScreen'
import { MagicLinkConfirmScreen } from '@/screens/MagicLinkConfirmScreen'
import { SignInScreen } from '@/screens/SignInScreen'
import { TripsScreen } from '@/screens/TripsScreen'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/trips" replace />} />
        <Route path="/health" element={<HealthScreen />} />
        <Route path="/sign-in" element={<SignInScreen />} />
        <Route path="/sign-in/confirm" element={<MagicLinkConfirmScreen />} />
        <Route
          path="/trips"
          element={
            <RequireAuth>
              <TripsScreen />
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to="/trips" replace />} />
      </Routes>
    </BrowserRouter>
  )
}