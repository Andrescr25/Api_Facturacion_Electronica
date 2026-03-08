import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout/Layout';
import Dashboard from './pages/Dashboard/Dashboard';
import ApiDocs from './pages/ApiDocs/ApiDocs';
import Playground from './pages/Playground/Playground';
import Historial from './pages/Historial/Historial';
import Configuracion from './pages/Configuracion/Configuracion';
import ApiKeys from './pages/ApiKeys/ApiKeys';
import Login from './pages/Login/Login';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/docs" element={<ApiDocs />} />
              <Route path="/playground" element={<Playground />} />
              <Route path="/historial" element={<Historial />} />
              <Route path="/configuracion" element={<Configuracion />} />
              <Route path="/api-keys" element={<ApiKeys />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
