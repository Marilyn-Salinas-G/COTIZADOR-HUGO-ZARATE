const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Database connection middleware for serverless environment
app.use(async (req, res, next) => {
  if (MONGODB_URI && !db && useMongo) {
    try {
      await initDb();
    } catch (err) {
      console.error("Database connection middleware error:", err);
    }
  }
  next();
});

// Paths
const DATA_DIR = __dirname;
const QUOTES_FILE = path.join(DATA_DIR, 'quotes.json');
const CONSECUTIVO_FILE = path.join(DATA_DIR, 'consecutivo.json');
const UPLOADS_DIR = path.join(__dirname, 'public', 'uploads');

// Ensure uploads folder exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Ensure database files exist
if (!fs.existsSync(QUOTES_FILE)) {
  fs.writeFileSync(QUOTES_FILE, JSON.stringify([], null, 2));
}
if (!fs.existsSync(CONSECUTIVO_FILE)) {
  fs.writeFileSync(CONSECUTIVO_FILE, JSON.stringify({ next: 1029 }, null, 2));
}

// Multer storage configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOADS_DIR);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname) || '.png';
    cb(null, 'visual-' + uniqueSuffix + ext);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB max limit
});

// Helper functions to read/write JSON files
function getQuotes() {
  try {
    const data = fs.readFileSync(QUOTES_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error("Error reading quotes file:", err);
    return [];
  }
}

function saveQuotes(quotes) {
  try {
    fs.writeFileSync(QUOTES_FILE, JSON.stringify(quotes, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error("Error writing quotes file:", err);
    return false;
  }
}

function getNextConsecutivo() {
  try {
    const data = fs.readFileSync(CONSECUTIVO_FILE, 'utf8');
    const obj = JSON.parse(data);
    return obj.next || 1029;
  } catch (err) {
    console.error("Error reading consecutivo file:", err);
    return 1029;
  }
}

function incrementConsecutivo() {
  try {
    const current = getNextConsecutivo();
    fs.writeFileSync(CONSECUTIVO_FILE, JSON.stringify({ next: current + 1 }, null, 2), 'utf8');
    return current;
  } catch (err) {
    console.error("Error incrementing consecutivo:", err);
    return null;
  }
}

// MongoDB Database Configuration
const MONGODB_URI = process.env.MONGODB_URI;
let db = null;
let useMongo = false;
let client = null;

if (MONGODB_URI) {
  try {
    const { MongoClient } = require('mongodb');
    client = new MongoClient(MONGODB_URI);
    useMongo = true;
    console.log("[DATABASE] Configurada la URI de MongoDB. Conectando...");
  } catch (err) {
    console.error("[DATABASE] Error cargando el driver de MongoDB o conectando:", err);
    useMongo = false;
  }
}

let connectingPromise = null;

async function initDb() {
  if (db) return;
  if (connectingPromise) {
    return connectingPromise;
  }
  
  connectingPromise = (async () => {
    if (useMongo && client) {
      try {
        await client.connect();
        // Use database specified in URI or default to 'cotizador'
        db = client.db();
        console.log("[DATABASE] Conectado exitosamente a MongoDB Atlas.");
        
        // Auto-migrate quotes if database collection is empty
        const quotesColl = db.collection('quotes');
        const count = await quotesColl.countDocuments();
        if (count === 0) {
          console.log("[DATABASE] Colección 'quotes' vacía. Migrando datos locales...");
          const localQuotes = getQuotes();
          if (localQuotes.length > 0) {
            await quotesColl.insertMany(localQuotes);
            console.log(`[DATABASE] Se importaron ${localQuotes.length} cotizaciones locales a MongoDB.`);
          }
        }
        
        // Auto-migrate consecutivo if empty
        const configColl = db.collection('config');
        const nextDoc = await configColl.findOne({ _id: 'consecutivo' });
        if (!nextDoc) {
          console.log("[DATABASE] Inicializando consecutivo en MongoDB...");
          const localNext = getNextConsecutivo();
          await configColl.insertOne({ _id: 'consecutivo', next: localNext });
        }
      } catch (err) {
        console.error("[DATABASE] Fallo al conectar a MongoDB. Usando almacenamiento local JSON:", err);
        useMongo = false;
        throw err;
      }
    }
  })();
  
  try {
    await connectingPromise;
  } finally {
    connectingPromise = null;
  }
}

// Async wrappers for database actions

async function getNextConsecutivoAsync() {
  if (useMongo && db) {
    try {
      const doc = await db.collection('config').findOne({ _id: 'consecutivo' });
      return doc ? doc.next : 1029;
    } catch (err) {
      console.error("Error leyendo consecutivo en MongoDB:", err);
      return 1029;
    }
  }
  return getNextConsecutivo();
}

async function setConsecutivoAsync(next) {
  if (useMongo && db) {
    try {
      await db.collection('config').updateOne(
        { _id: 'consecutivo' },
        { $set: { next: parseInt(next) } },
        { upsert: true }
      );
      return true;
    } catch (err) {
      console.error("Error escribiendo consecutivo en MongoDB:", err);
      return false;
    }
  }
  try {
    fs.writeFileSync(CONSECUTIVO_FILE, JSON.stringify({ next: parseInt(next) }, null, 2), 'utf8');
    return true;
  } catch (err) {
    return false;
  }
}

async function incrementConsecutivoAsync() {
  if (useMongo && db) {
    try {
      const current = await getNextConsecutivoAsync();
      await setConsecutivoAsync(current + 1);
      return current;
    } catch (err) {
      console.error("Error incrementando consecutivo en MongoDB:", err);
      return null;
    }
  }
  return incrementConsecutivo();
}

async function getQuotesAsync(queryStr = null) {
  if (useMongo && db) {
    try {
      const quotesColl = db.collection('quotes');
      let quotes = [];
      if (!queryStr) {
        quotes = await quotesColl.find({}).toArray();
      } else {
        const regex = new RegExp(queryStr, 'i');
        const queryNum = parseInt(queryStr);
        const queryFilter = {
          $or: [
            { client: regex },
            { requestor: regex },
            { agent: regex },
            { date: regex },
            { 'items.description': regex }
          ]
        };
        if (!isNaN(queryNum)) {
          queryFilter.$or.push({ number: queryNum });
          queryFilter.$or.push({ id: queryNum });
        }
        quotes = await quotesColl.find(queryFilter).toArray();
      }
      // Return sorted descending by number
      return quotes.sort((a, b) => b.number - a.number);
    } catch (err) {
      console.error("Error leyendo cotizaciones en MongoDB:", err);
      return [];
    }
  }
  
  // Local JSON Mode
  const quotes = getQuotes();
  if (!queryStr) {
    return [...quotes].reverse();
  }
  const query = queryStr.toLowerCase();
  const filtered = quotes.filter(quote => {
    return (
      (quote.number && quote.number.toString().includes(query)) ||
      (quote.client && quote.client.toLowerCase().includes(query)) ||
      (quote.requestor && quote.requestor.toLowerCase().includes(query)) ||
      (quote.agent && quote.agent.toLowerCase().includes(query)) ||
      (quote.date && quote.date.includes(query)) ||
      (quote.items && quote.items.some(item => item.description && item.description.toLowerCase().includes(query)))
    );
  });
  return filtered.reverse();
}

async function createQuoteAsync(quote) {
  const nextNum = await incrementConsecutivoAsync();
  if (!nextNum) {
    throw new Error("No se pudo obtener o incrementar el consecutivo");
  }
  
  quote.number = nextNum;
  quote.id = nextNum; // Use consecutive as ID
  quote.createdAt = new Date().toISOString();
  
  if (useMongo && db) {
    try {
      await db.collection('quotes').insertOne(quote);
      return quote;
    } catch (err) {
      console.error("Error guardando cotización en MongoDB:", err);
      throw err;
    }
  }
  
  // Local file mode
  const quotes = getQuotes();
  quotes.push(quote);
  if (saveQuotes(quotes)) {
    return quote;
  }
  throw new Error("Error al escribir la cotización localmente");
}

async function updateQuoteAsync(id, updatedQuote) {
  if (useMongo && db) {
    try {
      const original = await db.collection('quotes').findOne({ id });
      if (!original) return null;
      
      updatedQuote.id = id;
      updatedQuote.number = id;
      updatedQuote.createdAt = original.createdAt;
      updatedQuote.updatedAt = new Date().toISOString();
      
      await db.collection('quotes').replaceOne({ id }, updatedQuote);
      return updatedQuote;
    } catch (err) {
      console.error("Error actualizando cotización en MongoDB:", err);
      return null;
    }
  }
  
  // Local file mode
  const quotes = getQuotes();
  const index = quotes.findIndex(q => q.id === id);
  if (index === -1) return null;
  
  updatedQuote.id = id;
  updatedQuote.number = id;
  updatedQuote.createdAt = quotes[index].createdAt;
  updatedQuote.updatedAt = new Date().toISOString();
  
  quotes[index] = updatedQuote;
  if (saveQuotes(quotes)) {
    return updatedQuote;
  }
  return null;
}

async function deleteQuoteAsync(id) {
  if (useMongo && db) {
    try {
      const result = await db.collection('quotes').deleteOne({ id });
      return result.deletedCount > 0;
    } catch (err) {
      console.error("Error eliminando cotización en MongoDB:", err);
      return false;
    }
  }
  
  // Local file mode
  let quotes = getQuotes();
  const exists = quotes.some(q => q.id === id);
  if (!exists) return false;
  
  quotes = quotes.filter(q => q.id !== id);
  return saveQuotes(quotes);
}

// API Routes

// 1. Get next consecutivo
app.get('/api/consecutivo', async (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  const next = await getNextConsecutivoAsync();
  res.json({ next });
});

// 2. Set next consecutivo manually if needed (admin/utility)
app.post('/api/consecutivo', async (req, res) => {
  const { next } = req.body;
  if (next === undefined || isNaN(parseInt(next))) {
    return res.status(400).json({ error: 'Número inválido' });
  }
  const success = await setConsecutivoAsync(parseInt(next));
  if (success) {
    res.json({ success: true, next: parseInt(next) });
  } else {
    res.status(500).json({ error: 'Error al actualizar el consecutivo' });
  }
});

// 3. Get all quotes / search quotes
app.get('/api/quotes', async (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  const { q } = req.query;
  const filtered = await getQuotesAsync(q);
  res.json(filtered);
});

// 4. Create new quote
app.post('/api/quotes', async (req, res) => {
  const quote = req.body;
  
  if (!quote.client || !quote.items || !Array.isArray(quote.items)) {
    return res.status(400).json({ error: 'Datos de cotización incompletos o inválidos' });
  }
  
  try {
    const created = await createQuoteAsync(quote);
    if (created) {
      res.json({ success: true, quote: created });
    } else {
      res.status(500).json({ error: 'Error al guardar la cotización: No se pudo crear.' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Update existing quote
app.put('/api/quotes/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  const updatedQuote = req.body;
  
  if (isNaN(id)) {
    return res.status(400).json({ error: 'ID inválido' });
  }
  
  const updated = await updateQuoteAsync(id, updatedQuote);
  if (updated) {
    res.json({ success: true, quote: updated });
  } else {
    res.status(500).json({ error: 'Error al actualizar la cotización' });
  }
});

// 6. Delete a quote
app.delete('/api/quotes/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    return res.status(400).json({ error: 'ID inválido' });
  }
  
  const success = await deleteQuoteAsync(id);
  if (success) {
    res.json({ success: true });
  } else {
    res.status(500).json({ error: 'Error al eliminar la cotización' });
  }
});

// 7. Image Upload Endpoint
app.post('/api/upload', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No se subió ningún archivo' });
  }
  const fileUrl = '/uploads/' + req.file.filename;
  res.json({ success: true, url: fileUrl });
});

// Function to get local network IP address
function getLocalIpAddress() {
  const os = require('os');
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      const isIPv4 = iface.family === 'IPv4' || iface.family === 4;
      if (isIPv4 && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

// Start Server after DB initialization
initDb().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    const localIp = getLocalIpAddress();
    console.log('==========================================================');
    console.log('   SERVIDOR DE COTIZACIONES HUGO ZÁRATE PUBLICIDAD');
    console.log('==========================================================');
    console.log(`  * Local (esta PC):  http://localhost:${PORT}`);
    console.log(`  * Red local (Celulares/Otros equipos conectados a tu Wi-Fi):`);
    console.log(`    http://${localIp}:${PORT}`);
    console.log('==========================================================');
  });
});

// Export app for serverless environments (e.g. Vercel)
module.exports = app;
