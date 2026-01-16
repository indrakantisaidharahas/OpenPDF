import { Routes, Route } from 'react-router-dom';
import Login from './login.jsx';
import Signup from './signin.jsx';
import Navbar from './home.jsx';
import Pdf from './s1.jsx'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/" element={<Navbar />} />
      <Route path="/pdftotext" element={<Pdf />} />
    </Routes>
  );
}
