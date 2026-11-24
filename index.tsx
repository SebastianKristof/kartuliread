
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { progressStorage } from './lib/storage';
import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-700.css';
import '@fontsource/inter/latin-800.css';
import '@fontsource/inter/latin-900.css';
import '@fontsource/noto-sans-georgian/georgian-400.css';
import '@fontsource/noto-sans-georgian/georgian-700.css';
import '@fortawesome/fontawesome-free/css/fontawesome.css';
import '@fortawesome/fontawesome-free/css/solid.css';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
async function start() {
  try {
    await progressStorage.initialize();
    root.render(<React.StrictMode><App /></React.StrictMode>);
  } catch (error) {
    console.error('Unable to load progress', error);
    root.render(
      <main className="app-shell min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="text-2xl font-bold">KartuliRead</h1>
        <p>Your saved progress could not be loaded. Please try again.</p>
        <button className="rounded-xl bg-indigo-600 px-6 py-3 font-bold text-white" onClick={() => void start()}>Try again</button>
      </main>
    );
  }
}

void start();
