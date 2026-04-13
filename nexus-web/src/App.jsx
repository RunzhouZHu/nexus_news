import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import GraphPage from './pages/GraphPage'
import LoginPage from './pages/LoginPage'
import NotFoundPage from './pages/NotFoundPage'
import AuthGuard from './components/Auth/AuthGuard'
import Header from './components/Common/Header'
import ErrorBoundary from './components/Common/ErrorBoundary'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000,
    },
  },
})

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <div className="h-screen flex flex-col">
            <Header />
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route
                path="/"
                element={
                  <AuthGuard fallback={<Navigate to="/login" />}>
                    <GraphPage />
                  </AuthGuard>
                }
              />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </div>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}
