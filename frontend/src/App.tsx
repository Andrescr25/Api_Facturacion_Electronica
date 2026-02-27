import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout/Layout';
import Dashboard from './pages/Dashboard/Dashboard';
import ApiDocs from './pages/ApiDocs/ApiDocs';
import Playground from './pages/Playground/Playground';
import Historial from './pages/Historial/Historial';
import Configuracion from './pages/Configuracion/Configuracion';
import ApiKeys from './pages/ApiKeys/ApiKeys';
import Login from './pages/Login/Login';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/docs" element={<ApiDocs />} />
          <Route path="/playground" element={<Playground />} />
          <Route path="/historial" element={<Historial />} />
          <Route path="/configuracion" element={<Configuracion />} />
          <Route path="/api-keys" element={<ApiKeys />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
