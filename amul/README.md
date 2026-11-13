# 🥛 Amul All Products In-Stock Inventory Setup

This directory contains the database setup and stock inward configuration for the **43 Flagship Amul Products** (Milk, Dahi, Buttermilk, Paneer, Butter, Ghee, Cheese, Fresh Cream, Shrikhand, and Sweets).

---

## 📁 File Information
- **Directory**: `amul/`
- **Main SQL Files**:
  - [`amul/instock.sql`](file:///d:/Projects/Yogeshwari%20Dairy%20Shop%20Inventory%20System/amul/instock.sql)
  - [`amul/amul_instock.sql`](file:///d:/Projects/Yogeshwari%20Dairy%20Shop%20Inventory%20System/amul/amul_instock.sql)
- **Supabase Phase Migration File**:
  - [`supabase/32_phase32_amul_in_stock_inventory.sql`](file:///d:/Projects/Yogeshwari%20Dairy%20Shop%20Inventory%20System/supabase/32_phase32_amul_in_stock_inventory.sql)

---

## 📋 Complete Catalog of 43 Amul Products

| # | Product Name | Category | Unit | Buy Rate (₹) | Sell Rate (₹) | Inward Stock | Shelf Life |
|---|--------------|----------|------|--------------|---------------|--------------|------------|
| 1 | **Amul Gold Full Cream Milk 500ml** | Milk | Packet (500ml) | ₹32.00 | ₹34.00 | 60 Packet | 2 Days |
| 2 | **Amul Gold Full Cream Milk 1L** | Milk | Packet (1L) | ₹63.00 | ₹68.00 | 40 Packet | 2 Days |
| 3 | **Amul Taaza Toned Milk 500ml** | Milk | Packet (500ml) | ₹26.00 | ₹28.00 | 60 Packet | 2 Days |
| 4 | **Amul Taaza Toned Milk 1L** | Milk | Packet (1L) | ₹51.00 | ₹56.00 | 40 Packet | 2 Days |
| 5 | **Amul Cow Milk 500ml** | Milk | Packet (500ml) | ₹27.00 | ₹29.00 | 50 Packet | 2 Days |
| 6 | **Amul Cow Milk 1L** | Milk | Packet (1L) | ₹53.00 | ₹58.00 | 30 Packet | 2 Days |
| 7 | **Amul Slim n Trim Milk 500ml** | Milk | Packet (500ml) | ₹24.00 | ₹26.00 | 30 Packet | 2 Days |
| 8 | **Amul Buffalo Milk 500ml** | Milk | Packet (500ml) | ₹34.00 | ₹37.00 | 40 Packet | 2 Days |
| 9 | **Amul Taaza Homogenised Toned Milk 1L Tetra** | Milk | Piece | ₹68.00 | ₹75.00 | 24 Piece | 180 Days |
| 10 | **Amul Masti Dahi Pouch 400g** | Curd & Chaas | Packet (500ml) | ₹32.00 | ₹36.00 | 40 Packet | 7 Days |
| 11 | **Amul Masti Dahi Cup 200g** | Curd & Chaas | Piece | ₹21.00 | ₹25.00 | 30 Piece | 15 Days |
| 12 | **Amul Masti Dahi Cup 400g** | Curd & Chaas | Piece | ₹40.00 | ₹47.00 | 25 Piece | 15 Days |
| 13 | **Amul Masti Dahi Tub 1kg** | Curd & Chaas | Kg | ₹95.00 | ₹110.00 | 15 Kg | 15 Days |
| 14 | **Amul Masti Spiced Buttermilk 200ml Pouch** | Curd & Chaas | Piece | ₹12.00 | ₹15.00 | 50 Piece | 7 Days |
| 15 | **Amul Masti Spiced Buttermilk 500ml Tetra** | Curd & Chaas | Packet (500ml) | ₹28.00 | ₹32.00 | 30 Packet | 180 Days |
| 16 | **Amul Lassi Rose 200ml Tetra** | Curd & Chaas | Piece | ₹22.00 | ₹25.00 | 30 Piece | 180 Days |
| 17 | **Amul Lassi Mango 200ml Tetra** | Curd & Chaas | Piece | ₹22.00 | ₹25.00 | 30 Piece | 180 Days |
| 18 | **Amul Kool Cafe 200ml Can** | Curd & Chaas | Piece | ₹35.00 | ₹40.00 | 24 Piece | 180 Days |
| 19 | **Amul Kool Badam 200ml Bottle** | Curd & Chaas | Piece | ₹25.00 | ₹30.00 | 24 Piece | 180 Days |
| 20 | **Amul Fresh Malai Paneer 200g** | Paneer & Butter | Piece | ₹85.00 | ₹95.00 | 30 Piece | 30 Days |
| 21 | **Amul Fresh Malai Paneer 500g** | Paneer & Butter | Piece | ₹200.00 | ₹225.00 | 20 Piece | 30 Days |
| 22 | **Amul Fresh Malai Paneer 1kg Block** | Paneer & Butter | Kg | ₹380.00 | ₹430.00 | 15 Kg | 30 Days |
| 23 | **Amul Salted Butter 100g** | Paneer & Butter | Piece | ₹52.00 | ₹60.00 | 40 Piece | 180 Days |
| 24 | **Amul Salted Butter 500g** | Paneer & Butter | Piece | ₹250.00 | ₹285.00 | 25 Piece | 180 Days |
| 25 | **Amul White Butter 500g** | Paneer & Butter | Piece | ₹240.00 | ₹275.00 | 20 Piece | 90 Days |
| 26 | **Amul Garlic and Herbs Butter 100g** | Paneer & Butter | Piece | ₹56.00 | ₹65.00 | 20 Piece | 180 Days |
| 27 | **Amul Cheese Slices 200g (10 Slices)** | Paneer & Butter | Piece | ₹135.00 | ₹155.00 | 25 Piece | 270 Days |
| 28 | **Amul Cheese Cubes 200g (8 Cubes)** | Paneer & Butter | Piece | ₹130.00 | ₹150.00 | 25 Piece | 270 Days |
| 29 | **Amul Cheese Block 500g** | Paneer & Butter | Piece | ₹290.00 | ₹330.00 | 15 Piece | 270 Days |
| 30 | **Amul Diced Mozzarella Pizza Cheese 200g** | Paneer & Butter | Piece | ₹115.00 | ₹130.00 | 20 Piece | 180 Days |
| 31 | **Amul Diced Mozzarella Pizza Cheese 1kg** | Paneer & Butter | Kg | ₹460.00 | ₹520.00 | 10 Kg | 180 Days |
| 32 | **Amul Fresh Cream 250ml** | Paneer & Butter | Piece | ₹60.00 | ₹70.00 | 25 Piece | 90 Days |
| 33 | **Amul Pure Ghee 500ml Pouch** | Ghee | Packet (500ml) | ₹295.00 | ₹335.00 | 20 Packet | 270 Days |
| 34 | **Amul Pure Ghee 1L Pouch** | Ghee | Packet (1L) | ₹580.00 | ₹650.00 | 20 Packet | 270 Days |
| 35 | **Amul Pure Ghee 1L Tin** | Ghee | Kg | ₹620.00 | ₹690.00 | 15 Kg | 270 Days |
| 36 | **Amul Cow Ghee 500ml Jar** | Ghee | Piece | ₹310.00 | ₹355.00 | 20 Piece | 270 Days |
| 37 | **Amul Cow Ghee 1L Jar** | Ghee | Kg | ₹610.00 | ₹680.00 | 15 Kg | 270 Days |
| 38 | **Amul Elaichi Shrikhand 500g** | Sweets/Mithai | Piece | ₹105.00 | ₹125.00 | 20 Piece | 30 Days |
| 39 | **Amul Kesar Shrikhand 500g** | Sweets/Mithai | Piece | ₹115.00 | ₹135.00 | 20 Piece | 30 Days |
| 40 | **Amul Amrakhand (Mango) 500g** | Sweets/Mithai | Piece | ₹110.00 | ₹130.00 | 20 Piece | 30 Days |
| 41 | **Amul Mithai Mate Condensed Milk 200g** | Sweets/Mithai | Piece | ₹58.00 | ₹66.00 | 30 Piece | 180 Days |
| 42 | **Amul Gulab Jamun 1kg Tin** | Sweets/Mithai | Kg | ₹215.00 | ₹250.00 | 15 Kg | 180 Days |
| 43 | **Amul Rasgulla 1kg Tin** | Sweets/Mithai | Kg | ₹205.00 | ₹240.00 | 15 Kg | 180 Days |

---

## 🚀 How to Run in Supabase SQL Editor

1. Open your **Supabase Dashboard** -> **SQL Editor**.
2. Click **"+ New Query"**.
3. Copy all lines from [`amul/instock.sql`](file:///d:/Projects/Yogeshwari%20Dairy%20Shop%20Inventory%20System/amul/instock.sql) (or paste the code provided).
4. Click **"Run"** (or press `Ctrl + Enter`).
5. All 43 items will be added to `products` and `batches` with active FEFO tracking, and Supabase will output a verified in-stock summary table.

