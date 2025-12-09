import { Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Learn from "./pages/Learn";
import Quiz from "./pages/Quiz";
import Review from "./pages/Review";
import Categories from "./pages/Categories";
import Settings from "./pages/Settings";
import Games from "./pages/Games";
import QuickMatch from "./pages/games/QuickMatch";
import SprintMCQ from "./pages/games/SprintMCQ";
import TypeIt from "./pages/games/TypeIt";
import ListeningChallenge from "./pages/games/ListeningChallenge";

const App = () => (
  <Routes>
    <Route element={<Layout />}>
      <Route path="/" element={<Home />} />
      <Route path="/learn" element={<Learn />} />
      <Route path="/quiz" element={<Quiz />} />
      <Route path="/review" element={<Review />} />
      <Route path="/categories" element={<Categories />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/games" element={<Games />} />
      <Route path="/games/quick-match" element={<QuickMatch />} />
      <Route path="/games/sprint" element={<SprintMCQ />} />
      <Route path="/games/type-it" element={<TypeIt />} />
      <Route path="/games/listening" element={<ListeningChallenge />} />
    </Route>
  </Routes>
);

export default App;


