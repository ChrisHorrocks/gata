/**
 * Throwaway UI prototype — How should the itinerary and kit screens look and behave? (gata #6)
 */
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { TripPrototypeProvider } from '@/prototype/TripPrototypeContext'
import { ItineraryPrototypePage } from '@/pages/ItineraryPrototypePage'
import { KitPrototypePage } from '@/pages/KitPrototypePage'

export default function App() {
  return (
    <TripPrototypeProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/prototype/itinerary" replace />} />
          <Route path="/prototype/itinerary" element={<ItineraryPrototypePage />} />
          <Route path="/prototype/kit" element={<KitPrototypePage />} />
        </Routes>
      </HashRouter>
    </TripPrototypeProvider>
  )
}
