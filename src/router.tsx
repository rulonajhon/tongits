import { Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from '@/components/ui/ProtectedRoute'
import { LoginPage } from '@/pages/LoginPage'
import { RegisterPage } from '@/pages/RegisterPage'
import { LobbyPage } from '@/pages/LobbyPage'
import { WaitingRoomPage } from '@/pages/WaitingRoomPage'
import { GamePage } from '@/pages/GamePage'

export function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/lobby"
        element={
          <ProtectedRoute>
            <LobbyPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/room/:roomId"
        element={
          <ProtectedRoute>
            <WaitingRoomPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/room/:roomId/game/:gameId"
        element={
          <ProtectedRoute>
            <GamePage />
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<Navigate to="/lobby" replace />} />
      <Route path="*" element={<Navigate to="/lobby" replace />} />
    </Routes>
  )
}
