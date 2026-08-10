import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { sembrarSiHaceFalta } from './db/seed'
import { prepararPantalla } from './lib/nativo'
import './index.css'

await sembrarSiHaceFalta()
void prepararPantalla()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
