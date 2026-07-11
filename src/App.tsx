import { BrowserRouter } from 'react-router-dom'
import { AppRouter } from './router'
import { ConnectionStatus } from '@/components/ui/ConnectionStatus'

function App() {
  return (
    <BrowserRouter>
      <ConnectionStatus />
      <AppRouter />
    </BrowserRouter>
  )
}

export default App
