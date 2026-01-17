import { Routes, Route } from 'react-router-dom';
import Login from './login.jsx';
import Signup from './signin.jsx';
import Home from './home.jsx';
import Pdf from './s1.jsx'
import Jobs from './jobs.jsx'
export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/" element={<Home />} />
      <Route path="/pdftotext" element={<Pdf />} />
      <Route path="/jobs" element={<Jobs />} />
    </Routes>
  );
}
