import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import TestRunner from './pages/TestRunner';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/test/:testId" element={<TestRunner />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
