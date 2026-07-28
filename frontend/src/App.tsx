import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { HashRouter, Route, Routes } from 'react-router-dom'
import './App.css'
import { TooltipProvider } from '@/components/ui/tooltip'
import { MapView } from './map/MapView'
import { SchoolDetailPage } from './school-detail/SchoolDetailPage'

const queryClient = new QueryClient()

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <HashRouter>
          <Routes>
            <Route path="/" element={<MapView />} />
            <Route path="/schools/:slug" element={<SchoolDetailPage />} />
          </Routes>
        </HashRouter>
      </TooltipProvider>
    </QueryClientProvider>
  )
}
