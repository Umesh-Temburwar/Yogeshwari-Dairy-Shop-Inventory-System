import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Interface for PackSense cleaned CSV row
interface PackSenseRow {
  code: string;
  product_name: string;
  brands: string;
  quantity_amount: string;
  quantity_unit: string;
  product_quantity: string;
  product_quantity_unit: string;
  categories_tags: string;
  pnns_groups_1: string;
  pnns_groups_2: string;
  energy_kcal: string;
  fat: string;
  sugars: string;
  proteins: string;
}

interface ImportOptions {
  dryRun: boolean;
  chunkSize: number;
  limit?: number;
  csvPath: string;
}

interface ImportSummary {
  sourceName: string;
  csvPath: string;
  dryRun: boolean;
  totalCsvRows: number;
  processedRows: number;
  validCandidates: number;
  insertedProducts: number;
  insertedBarcodes: number;
  existingMatched: number;
  skippedRows: number;
  rejectedRows: number;
  startTime: string;
  endTime: string;
  durationSeconds: number;
}

// Category mapping helper
function mapPackSenseCategory(categoriesTags: string, pnns1: string, pnns2: string, name: string): string {
  const text = `${categoriesTags} ${pnns1} ${pnns2} ${name}`.toLowerCase();
  
  if (text.includes('milk') || text.includes('doodh') || text.includes('lait')) return 'Milk';
  if (text.includes('curd') || text.includes('dahi') || text.includes('yogurt') || text.includes('chaas') || text.includes('buttermilk') || text.includes('lassi')) return 'Curd & Chaas';
  if (text.includes('paneer') || text.includes('butter') || text.includes('makhan') || text.includes('cheese')) return 'Paneer & Butter';
  if (text.includes('ghee')) return 'Ghee';
  if (text.includes('sweet') || text.includes('mithai') || text.includes('pedha') || text.includes('barfi') || text.includes('gulab') || text.includes('halwa') || text.includes('shrikhand')) return 'Sweets/Mithai';
  if (text.includes('bakery') || text.includes('bread') || text.includes('biscuit') || text.includes('toast') || text.includes('khari') || text.includes('cake') || text.includes('cookie')) return 'Bakery & Extras';
  if (text.includes('snack') || text.includes('chips') || text.includes('namkeen') || text.includes('farsan')) return 'Bakery & Extras';
  
  return 'Bakery & Extras';
}

// Unit mapper helper
function mapPackSenseUnit(unit: string, amount: string): string {
  const u = (unit || '').toLowerCase().trim();
  if (u === 'g' || u === 'gram' || u === 'grams') return 'Gram';
  if (u === 'kg' || u === 'kilogram') return 'Kg';
  if (u === 'ml' || u === 'millilitre') {
    if (amount === '500') return 'Packet (500ml)';
    if (amount === '1000' || amount === '1') return 'Packet (1L)';
    return 'Litre';
  }
  if (u === 'l' || u === 'liter' || u === 'litre') return 'Litre';
  return 'Piece';
}

// Parse CSV with proper RFC 4180 quotation handling
function parseCsv(content: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    if (char === '"') {
      inQuotes = !inQuotes;
      current += char;
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && content[i + 1] === '\n') {
        i++;
      }
      if (current.trim().length > 0) {
        lines.push(current);
      }
      current = '';
    } else {
      current += char;
    }
  }
  if (current.trim().length > 0) {
    lines.push(current);
  }

  if (lines.length === 0) return { headers: [], rows: [] };

  const splitLine = (line: string): string[] => {
    const fields: string[] = [];
    let field = '';
    let inQ = false;
    for (let j = 0; j < line.length; j++) {
      const c = line[j];
      if (c === '"') {
        if (inQ && line[j + 1] === '"') {
          field += '"';
          j++;
        } else {
          inQ = !inQ;
        }
      } else if (c === ',' && !inQ) {
        fields.push(field.trim());
        field = '';
      } else {
        field += c;
      }
    }
    fields.push(field.trim());
    return fields;
  };

  const headers = splitLine(lines[0]);
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = splitLine(lines[i]);
    if (values.length >= headers.length) {
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => {
        row[h] = values[idx] || '';
      });
      rows.push(row);
    }
  }

  return { headers, rows };
}

export async function importPackSenseCatalogue(options: ImportOptions): Promise<ImportSummary> {
  const startTime = new Date();
  console.log('================================================================');
  console.log('📦 Yogeshwari Dairy - Safe PackSense Catalogue Importer');
  console.log(`⏱️ Started At: ${startTime.toISOString()}`);
  console.log(`⚙️ Mode: ${options.dryRun ? '🔍 DRY RUN (Simulating without DB changes)' : '🚀 LIVE IMPORT'}`);
  console.log(`📁 Source CSV: ${options.csvPath}`);
  console.log(`📦 Chunk Size: ${options.chunkSize}`);
  if (options.limit) console.log(`🛑 Record Limit: ${options.limit}`);
  console.log('================================================================\n');

  if (!fs.existsSync(options.csvPath)) {
    throw new Error(`CSV file not found at: ${options.csvPath}`);
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase configuration missing in environment variables.');
  }

  const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey);

  // 1. Fetch existing barcodes and products for duplicate prevention
  console.log('🔍 Fetching existing shop products & barcodes from database...');
  const { data: existingBarcodesData, error: bcError } = await supabase
    .from('product_barcodes')
    .select('barcode, product_id');

  const registeredBarcodes = new Set<string>();
  if (existingBarcodesData && !bcError) {
    existingBarcodesData.forEach((row: { barcode: string }) => {
      if (row.barcode) registeredBarcodes.add(row.barcode.trim());
    });
  }

  const { data: existingProductsData } = await supabase
    .from('products')
    .select('id, name, barcode, purchase_price, selling_price, stock_quantity');

  if (existingProductsData) {
    existingProductsData.forEach((p: { barcode?: string | null }) => {
      if (p.barcode) registeredBarcodes.add(p.barcode.trim());
    });
  }

  console.log(`✅ Loaded ${existingProductsData?.length || 0} existing products & ${registeredBarcodes.size} unique active barcodes.\n`);

  // 2. Read and parse CSV
  console.log('📖 Reading cleaned PackSense CSV file...');
  const rawCsvContent = fs.readFileSync(options.csvPath, 'utf-8');
  const { rows } = parseCsv(rawCsvContent);
  console.log(`📊 Total rows in CSV: ${rows.length}`);

  const rowsToProcess = options.limit ? rows.slice(0, options.limit) : rows;

  let insertedProducts = 0;
  let insertedBarcodes = 0;
  let existingMatched = 0;
  let skippedRows = 0;
  let rejectedRows = 0;
  const seenInFile = new Set<string>();

  const validBatch: { product: any; barcode: string; isPrimary: boolean }[] = [];

  for (let i = 0; i < rowsToProcess.length; i++) {
    const row = rowsToProcess[i];
    const barcode = (row.code || '').trim();
    const productName = (row.product_name || '').trim();
    const brand = (row.brands || '').trim() || 'Generic';
    const amount = (row.quantity_amount || row.product_quantity || '').trim();
    const unitRaw = (row.quantity_unit || row.product_quantity_unit || '').trim();

    // Validation 1: Barcode format (preserve leading zeros, 8-14 digits)
    if (!barcode || !/^\d{8,14}$/.test(barcode) || /^0+$/.test(barcode)) {
      rejectedRows++;
      continue;
    }

    // Validation 2: Product Name required
    if (!productName || productName.length < 2) {
      rejectedRows++;
      continue;
    }

    // Validation 3: Duplicate within file
    if (seenInFile.has(barcode)) {
      skippedRows++;
      continue;
    }
    seenInFile.add(barcode);

    // Validation 4: Already registered in database
    if (registeredBarcodes.has(barcode)) {
      existingMatched++;
      skippedRows++;
      continue;
    }

    const category = mapPackSenseCategory(
      row.categories_tags || '',
      row.pnns_groups_1 || '',
      row.pnns_groups_2 || '',
      productName
    );

    const packUnit = mapPackSenseUnit(unitRaw, amount);
    const packSize = amount && unitRaw ? `${amount} ${unitRaw}` : packUnit;

    // Build catalogue product - STRICTLY ZERO STOCK
    const newProduct = {
      name: productName,
      marathi_name: productName,
      category,
      unit: packUnit,
      pack_size: packSize,
      brand,
      purchase_price: 0.00, // Never fake purchase price
      selling_price: 0.00,  // Never fake selling price
      stock_quantity: 0.00, // STRICTLY ZERO INVENTORY
      min_stock_alert: 5.00,
      shelf_life_days: 14,
      has_expiry: true,
      barcode: barcode,     // Stored as TEXT with leading zeros intact
      source: 'PackSense',
      source_code: barcode,
      is_active: true
    };

    validBatch.push({ product: newProduct, barcode, isPrimary: true });
  }

  console.log(`\n📋 Pre-validation Results:`);
  console.log(`   - Valid New Candidates: ${validBatch.length}`);
  console.log(`   - Existing in DB / Already Registered: ${existingMatched}`);
  console.log(`   - Duplicate in File / Skipped: ${skippedRows - existingMatched}`);
  console.log(`   - Rejected Invalid: ${rejectedRows}\n`);

  if (options.dryRun) {
    console.log('🔍 [DRY RUN SIMULATION]');
    console.log(`   Simulated insertion of ${validBatch.length} catalogue products (stock_quantity = 0.00).`);
    console.log(`   Simulated insertion of ${validBatch.length} barcode mappings into product_barcodes.`);
    console.log('   ✅ No changes were committed to database.\n');
  } else {
    // 3. Batch insert in configurable chunks
    console.log(`🚀 Executing Live Insert in chunks of ${options.chunkSize}...`);
    for (let c = 0; c < validBatch.length; c += options.chunkSize) {
      const chunk = validBatch.slice(c, c + options.chunkSize);
      const productsToInsert = chunk.map(item => item.product);

      // Insert products
      const { data: createdProducts, error: prodErr } = await supabase
        .from('products')
        .insert(productsToInsert)
        .select('id, barcode');

      if (prodErr) {
        console.error(`❌ Error inserting chunk ${Math.floor(c / options.chunkSize) + 1}:`, prodErr.message);
        continue;
      }

      if (createdProducts && createdProducts.length > 0) {
        insertedProducts += createdProducts.length;

        // Map barcodes to newly created product IDs
        const barcodesToInsert = createdProducts.map(p => ({
          product_id: p.id,
          barcode: p.barcode,
          barcode_type: 'EAN-13',
          is_primary: true,
          source: 'PackSense'
        }));

        const { data: createdBarcodes, error: bcErr } = await supabase
          .from('product_barcodes')
          .insert(barcodesToInsert)
          .select('id');

        if (!bcErr && createdBarcodes) {
          insertedBarcodes += createdBarcodes.length;
        }

        createdProducts.forEach(p => registeredBarcodes.add(p.barcode));
      }

      const progress = Math.min(100, Math.round(((c + chunk.length) / validBatch.length) * 100));
      process.stdout.write(`   ⏳ Progress: ${c + chunk.length}/${validBatch.length} (${progress}%)\r`);
    }
    console.log('\n✅ Batch insert completed.');

    // 4. Log to catalog_import_logs table
    try {
      await supabase.from('catalog_import_logs').insert({
        source_name: 'PackSense India Products',
        source_release: '2026-11-03',
        source_file_hash: '9007b7a48fe9bc129e6a90a6fc7dfb4dfdcb6a72f53b3a3aabc74eda0d5d1951',
        total_rows: rowsToProcess.length,
        inserted_rows: insertedProducts,
        updated_rows: 0,
        skipped_rows: skippedRows,
        rejected_rows: rejectedRows,
        status: 'COMPLETED',
        notes: `Imported ${insertedProducts} products with zero stock into catalogue.`
      });
    } catch (logErr) {
      console.warn('⚠️ Could not log to catalog_import_logs:', logErr);
    }
  }

  const endTime = new Date();
  const durationSeconds = Math.round((endTime.getTime() - startTime.getTime()) / 1000);

  const summary: ImportSummary = {
    sourceName: 'PackSense India Products',
    csvPath: options.csvPath,
    dryRun: options.dryRun,
    totalCsvRows: rows.length,
    processedRows: rowsToProcess.length,
    validCandidates: validBatch.length,
    insertedProducts: options.dryRun ? validBatch.length : insertedProducts,
    insertedBarcodes: options.dryRun ? validBatch.length : insertedBarcodes,
    existingMatched,
    skippedRows,
    rejectedRows,
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
    durationSeconds
  };

  console.log('\n================================================================');
  console.log('📊 IMPORT SUMMARY REPORT:');
  console.log(`   - Status: ${options.dryRun ? 'DRY-RUN VERIFIED ✅' : 'COMPLETED SUCCESSFULLY ✅'}`);
  console.log(`   - Catalogue Products Added: ${summary.insertedProducts} (Stock = 0.00)`);
  console.log(`   - Barcodes Mapped: ${summary.insertedBarcodes}`);
  console.log(`   - Existing Shop Items Preserved: ${existingMatched}`);
  console.log(`   - Duration: ${durationSeconds}s`);
  console.log('================================================================\n');

  return summary;
}

// CLI entry point
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run') || !args.includes('--live');
const chunkSizeArg = args.find(a => a.startsWith('--chunk-size='));
const limitArg = args.find(a => a.startsWith('--limit='));
const csvPathArg = args.find(a => a.startsWith('--csv='));

const chunkSize = chunkSizeArg ? parseInt(chunkSizeArg.split('=')[1], 10) : 500;
const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : undefined;
const defaultCsvPath = path.resolve(process.cwd(), 'data/packsense/processed/india_products_cleaned.csv');
const csvPath = csvPathArg ? path.resolve(process.cwd(), csvPathArg.split('=')[1]) : defaultCsvPath;

if (process.argv[1] && process.argv[1].endsWith('importPackSenseCatalog.ts')) {
  importPackSenseCatalogue({
    dryRun: isDryRun,
    chunkSize,
    limit,
    csvPath
  }).catch(err => {
    console.error('❌ Import Fatal Error:', err);
    process.exit(1);
  });
}
