import { TitleBar } from "./components/TitleBar";
import "./App.css";

function App() {
  return (
    <div className="app">
      <TitleBar />
      <main className="app__main">
        <p className="app__placeholder">UniLaunch — squelette de l'application.</p>
      </main>
    </div>
  );
}

export default App;
