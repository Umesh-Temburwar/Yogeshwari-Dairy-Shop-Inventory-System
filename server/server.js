import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// API health endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    system: 'Yogeshwari Dairy Shop ERP & Inventory Backend',
    timestamp: new Date().toISOString()
  });
});

// Supabase environment config endpoint (public safe info)
app.get('/api/config', (req, res) => {
  res.json({
    supabaseConfigured: Boolean(process.env.VITE_SUPABASE_URL && process.env.VITE_SUPABASE_ANON_KEY),
    supabaseUrl: process.env.VITE_SUPABASE_URL || null
  });
});

// Serve frontend build if dist folder exists
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));

app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🥛 Yogeshwari Dairy Shop Inventory & ERP Server Running`);
  console.log(`🚀 Access application at: http://localhost:${PORT}`);
  console.log(`======================================================\n`);
});

