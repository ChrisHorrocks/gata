import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import { RequireAuth } from '@/components/RequireAuth'
import { HealthScreen } from '@/screens/HealthScreen'
import { CreateTripScreen } from '@/screens/CreateTripScreen'
import { GearScreen } from '@/screens/GearScreen'
import { MagicLinkConfirmScreen } from '@/screens/MagicLinkConfirmScreen'
import { MapScreen } from '@/screens/MapScreen'
import { ProfileScreen } from '@/screens/ProfileScreen'
import { SignInScreen } from '@/screens/SignInScreen'
import { ItineraryScreen } from '@/screens/ItineraryScreen'
import { TripSettingsScreen } from '@/screens/TripSettingsScreen'
import { TripsScreen } from '@/screens/TripsScreen'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/trips" replace />} />
        <Route path="/health" element={<HealthScreen />} />
        <Route path="/map" element={<MapScreen />} />
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
        <Route
          path="/trips/new"
          element={
            <RequireAuth>
              <CreateTripScreen />
            </RequireAuth>
          }
        />
        <Route
          path="/trips/:tripId/itinerary"
          element={
            <RequireAuth>
              <ItineraryScreen />
            </RequireAuth>
          }
        />
        <Route
          path="/trips/:tripId/settings"
          element={
            <RequireAuth>
              <TripSettingsScreen />
            </RequireAuth>
          }
        />
        <Route
          path="/profile"
          element={
            <RequireAuth>
              <ProfileScreen />
            </RequireAuth>
          }
        />
        <Route
          path="/gear"
          element={
            <RequireAuth>
              <GearScreen />
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to="/trips" replace />} />
      </Routes>
    </BrowserRouter>
  )
}