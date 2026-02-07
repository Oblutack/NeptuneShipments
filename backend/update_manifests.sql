-- Update existing shipments with sample manifest items
UPDATE shipments
SET manifest_items = '[
  {
    "sku": "ELEC-001",
    "description": "PlayStation 5 Gaming Consoles",
    "quantity": 100,
    "unit_value": 499.99,
    "total_value": 49999.00
  },
  {
    "sku": "ELEC-002",
    "description": "4K OLED Televisions",
    "quantity": 50,
    "unit_value": 1299.99,
    "total_value": 64999.50
  }
]'::jsonb
WHERE tracking_number = 'TRK-TOK-ROT';

-- Update other shipments with different cargo types
UPDATE shipments
SET manifest_items = '[
  {
    "sku": "TEXT-001",
    "description": "Cotton T-Shirts",
    "quantity": 5000,
    "unit_value": 12.50,
    "total_value": 62500.00
  },
  {
    "sku": "TEXT-002",
    "description": "Denim Jeans",
    "quantity": 2000,
    "unit_value": 35.00,
    "total_value": 70000.00
  },
  {
    "sku": "TEXT-003",
    "description": "Winter Jackets",
    "quantity": 1000,
    "unit_value": 89.99,
    "total_value": 89990.00
  }
]'::jsonb
WHERE tracking_number != 'TRK-TOK-ROT' AND description ILIKE '%textile%';

-- Update machinery shipments
UPDATE shipments
SET manifest_items = '[
  {
    "sku": "MACH-001",
    "description": "Industrial Pumps",
    "quantity": 20,
    "unit_value": 15000.00,
    "total_value": 300000.00
  },
  {
    "sku": "MACH-002",
    "description": "Engine Components",
    "quantity": 100,
    "unit_value": 850.00,
    "total_value": 85000.00
  }
]'::jsonb
WHERE description ILIKE '%machinery%' OR description ILIKE '%equipment%';

-- Default for any remaining shipments
UPDATE shipments
SET manifest_items = '[
  {
    "sku": "GEN-001",
    "description": "General Cargo Pallets",
    "quantity": 50,
    "unit_value": 350.00,
    "total_value": 17500.00
  }
]'::jsonb
WHERE manifest_items = '[]'::jsonb OR manifest_items IS NULL;
