# 🥛 Gramilk Dairy In-Stock Inventory Setup

This directory contains the database setup and stock inward configuration for the **17 Gramilk Dairy Products**.

---

## 📁 File Information
- **Directory**: `gramilk/`
- **Main SQL Files**:
  - [`gramilk/instock.sql`](file:///d:/Projects/Yogeshwari%20Dairy%20Shop%20Inventory%20System/gramilk/instock.sql)
  - [`gramilk/gramilk_instock.sql`](file:///d:/Projects/Yogeshwari%20Dairy%20Shop%20Inventory%20System/gramilk/gramilk_instock.sql)
- **Supabase Phase Migration File**:
  - [`supabase/30_phase30_gramilk_in_stock_inventory.sql`](file:///d:/Projects/Yogeshwari%20Dairy%20Shop%20Inventory%20System/supabase/30_phase30_gramilk_in_stock_inventory.sql)

---

## 📋 Complete Catalog of 17 Gramilk Products

| # | Product Name | Category | Unit | Buy Rate (₹) | Sell Rate (₹) | Initial Stock | Shelf Life |
|---|--------------|----------|------|--------------|---------------|---------------|------------|
| 1 | **Gramilk Full Cream Milk** | Milk | Litre | ₹60.00 | ₹66.00 | 50 Litre | 2 Days |
| 2 | **Gramilk Chai Special Milk** | Milk | Litre | ₹56.00 | ₹62.00 | 50 Litre | 2 Days |
| 3 | **Gramilk Curd 500 gm** | Curd & Chaas | Packet (500ml) | ₹40.00 | ₹48.00 | 30 Packet | 7 Days |
| 4 | **Gramilk Slim Curd 180 gm** | Curd & Chaas | Piece | ₹18.00 | ₹22.00 | 30 Piece | 7 Days |
| 5 | **Gramilk Malai Paneer 100 gm** | Paneer & Butter | Piece | ₹40.00 | ₹48.00 | 25 Piece | 15 Days |
| 6 | **Gramilk Malai Paneer 200 gm** | Paneer & Butter | Piece | ₹78.00 | ₹90.00 | 25 Piece | 15 Days |
| 7 | **Gramilk Tikka Special Paneer 1kg** | Paneer & Butter | Kg | ₹360.00 | ₹420.00 | 15 Kg | 15 Days |
| 8 | **Gramilk Shrikhand 100 gm** | Sweets/Mithai | Piece | ₹28.00 | ₹35.00 | 20 Piece | 14 Days |
| 9 | **Gramilk Shrikhand 250 gm** | Sweets/Mithai | Piece | ₹68.00 | ₹80.00 | 20 Piece | 14 Days |
| 10 | **Gramilk Shrikhand 500 gm** | Sweets/Mithai | Piece | ₹130.00 | ₹155.00 | 15 Piece | 14 Days |
| 11 | **Gramilk Lassi Vanilla** | Curd & Chaas | Piece | ₹20.00 | ₹25.00 | 30 Piece | 10 Days |
| 12 | **Gramilk Lassi Mango** | Curd & Chaas | Piece | ₹20.00 | ₹25.00 | 30 Piece | 10 Days |
| 13 | **Gramilk Butter Milk** | Curd & Chaas | Packet (500ml) | ₹12.00 | ₹15.00 | 40 Packet | 5 Days |
| 14 | **Gramilk Cow Ghee 500gm** | Ghee | Piece | ₹320.00 | ₹375.00 | 15 Piece | 180 Days |
| 15 | **Gramilk Cow Ghee 1000 gm** | Ghee | Kg | ₹620.00 | ₹720.00 | 15 Kg | 180 Days |
| 16 | **Gramilk Buffalo Ghee 500 gm** | Ghee | Piece | ₹340.00 | ₹395.00 | 15 Piece | 180 Days |
| 17 | **Gramilk Buffalo Ghee 1000 gm** | Ghee | Kg | ₹660.00 | ₹760.00 | 15 Kg | 180 Days |

---

## 🚀 How to Run in Supabase SQL Editor

1. Open your **Supabase Dashboard** (`https://supabase.com/dashboard/project/...`).
2. Go to **SQL Editor** on the left menu.
3. Click **"+ New Query"**.
4. Open [`gramilk/instock.sql`](file:///d:/Projects/Yogeshwari%20Dairy%20Shop%20Inventory%20System/gramilk/instock.sql), copy all lines, and paste them into the SQL Editor.
5. Click **"Run"** (or press `Ctrl + Enter`).
6. All 17 items will be added to `products` and `batches` with active FEFO tracking, and Supabase will output a verified in-stock summary table.

