-- Stock Easy: Initial Schema with Row Level Security
-- Run this in Supabase SQL Editor or via Supabase CLI

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enums
CREATE TYPE user_role AS ENUM ('central_admin', 'shop_owner', 'shop_staff');
CREATE TYPE verification_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE subscription_status AS ENUM ('trial', 'active', 'expired', 'cancelled');

-- Shops (multi-tenant root)
CREATE TABLE shops (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT DEFAULT 'Maharashtra',
  pincode TEXT,
  drug_license_no TEXT,
  pan_no TEXT,
  gst_no TEXT,
  drug_license_url TEXT,
  pan_url TEXT,
  gst_url TEXT,
  shop_photo_url TEXT,
  verification_status verification_status NOT NULL DEFAULT 'pending',
  verification_notes TEXT,
  verified_at TIMESTAMPTZ,
  verified_by UUID,
  subscription_status subscription_status NOT NULL DEFAULT 'trial',
  subscription_expires_at TIMESTAMPTZ,
  owner_user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'shop_owner',
  shop_id UUID REFERENCES shops(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add FK from shops to owner after users table exists
ALTER TABLE shops
  ADD CONSTRAINT shops_owner_user_id_fkey
  FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE shops
  ADD CONSTRAINT shops_verified_by_fkey
  FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL;

-- Dealers (shop-scoped)
CREATE TABLE dealers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  gst_no TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Master medicines catalog (shop-scoped for custom entries)
CREATE TABLE medicines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  generic_name TEXT,
  manufacturer TEXT,
  category TEXT,
  unit TEXT DEFAULT 'strip',
  hsn_code TEXT DEFAULT '3004',
  gst_rate NUMERIC(5,2) NOT NULL DEFAULT 5.00,
  min_stock_level INTEGER NOT NULL DEFAULT 10,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(shop_id, name)
);

-- Stock batches (FEFO core)
CREATE TABLE batches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  medicine_id UUID NOT NULL REFERENCES medicines(id) ON DELETE CASCADE,
  dealer_id UUID REFERENCES dealers(id) ON DELETE SET NULL,
  batch_no TEXT NOT NULL,
  expiry_date DATE NOT NULL,
  quantity_initial INTEGER NOT NULL CHECK (quantity_initial > 0),
  quantity_remaining INTEGER NOT NULL CHECK (quantity_remaining >= 0),
  cost_price NUMERIC(12,2) NOT NULL CHECK (cost_price >= 0),
  selling_price NUMERIC(12,2) NOT NULL CHECK (selling_price >= 0),
  mrp NUMERIC(12,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(shop_id, medicine_id, batch_no)
);

-- Bills
CREATE TABLE bills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  bill_no TEXT NOT NULL,
  customer_name TEXT,
  customer_phone TEXT,
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  taxable_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  cgst_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  sgst_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_mode TEXT DEFAULT 'cash',
  is_return BOOLEAN NOT NULL DEFAULT FALSE,
  original_bill_id UUID REFERENCES bills(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(shop_id, bill_no)
);

-- Bill line items (linked to specific batch for FEFO traceability)
CREATE TABLE bill_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  medicine_id UUID NOT NULL REFERENCES medicines(id) ON DELETE RESTRICT,
  batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE RESTRICT,
  medicine_name TEXT NOT NULL,
  batch_no TEXT NOT NULL,
  expiry_date DATE NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(12,2) NOT NULL,
  discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  gst_rate NUMERIC(5,2) NOT NULL DEFAULT 5.00,
  cgst_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  sgst_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  line_total NUMERIC(12,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- AI query audit log
CREATE TABLE ai_query_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_question TEXT NOT NULL,
  generated_sql TEXT,
  query_result JSONB,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_shop_id ON users(shop_id);
CREATE INDEX idx_shops_verification ON shops(verification_status);
CREATE INDEX idx_batches_shop_medicine ON batches(shop_id, medicine_id);
CREATE INDEX idx_batches_fefo ON batches(shop_id, medicine_id, expiry_date ASC)
  WHERE quantity_remaining > 0;
CREATE INDEX idx_batches_expiry ON batches(shop_id, expiry_date);
CREATE INDEX idx_bills_shop_created ON bills(shop_id, created_at DESC);
CREATE INDEX idx_bill_items_bill ON bill_items(bill_id);
CREATE INDEX idx_medicines_shop ON medicines(shop_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER shops_updated_at BEFORE UPDATE ON shops
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER dealers_updated_at BEFORE UPDATE ON dealers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER medicines_updated_at BEFORE UPDATE ON medicines
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER batches_updated_at BEFORE UPDATE ON batches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS helper: read session context set by the app server
CREATE OR REPLACE FUNCTION auth_shop_id()
RETURNS UUID AS $$
BEGIN
  RETURN NULLIF(current_setting('app.current_shop_id', TRUE), '')::UUID;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION auth_user_role()
RETURNS TEXT AS $$
BEGIN
  RETURN NULLIF(current_setting('app.current_user_role', TRUE), '');
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION auth_user_id()
RETURNS UUID AS $$
BEGIN
  RETURN NULLIF(current_setting('app.current_user_id', TRUE), '')::UUID;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_central_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN auth_user_role() = 'central_admin';
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Enable RLS on all shop-scoped tables
ALTER TABLE shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE dealers ENABLE ROW LEVEL SECURITY;
ALTER TABLE medicines ENABLE ROW LEVEL SECURITY;
ALTER TABLE batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE bill_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_query_logs ENABLE ROW LEVEL SECURITY;

-- Shops policies
CREATE POLICY shops_admin_all ON shops
  FOR ALL USING (is_central_admin());

CREATE POLICY shops_owner_read ON shops
  FOR SELECT USING (id = auth_shop_id());

CREATE POLICY shops_owner_update ON shops
  FOR UPDATE USING (id = auth_shop_id() AND auth_user_role() IN ('shop_owner', 'shop_staff'));

CREATE POLICY shops_insert_registration ON shops
  FOR INSERT WITH CHECK (auth_user_role() IS NULL OR is_central_admin());

-- Users policies
CREATE POLICY users_admin_all ON users
  FOR ALL USING (is_central_admin());

CREATE POLICY users_self_read ON users
  FOR SELECT USING (id = auth_user_id() OR shop_id = auth_shop_id());

CREATE POLICY users_shop_owner_manage ON users
  FOR ALL USING (shop_id = auth_shop_id() AND auth_user_role() = 'shop_owner');

-- Dealers policies
CREATE POLICY dealers_shop_isolation ON dealers
  FOR ALL USING (shop_id = auth_shop_id() OR is_central_admin());

-- Medicines policies
CREATE POLICY medicines_shop_isolation ON medicines
  FOR ALL USING (shop_id = auth_shop_id() OR is_central_admin());

-- Batches policies
CREATE POLICY batches_shop_isolation ON batches
  FOR ALL USING (shop_id = auth_shop_id() OR is_central_admin());

-- Bills policies
CREATE POLICY bills_shop_isolation ON bills
  FOR ALL USING (shop_id = auth_shop_id() OR is_central_admin());

-- Bill items policies
CREATE POLICY bill_items_shop_isolation ON bill_items
  FOR ALL USING (shop_id = auth_shop_id() OR is_central_admin());

-- AI query logs policies
CREATE POLICY ai_logs_shop_isolation ON ai_query_logs
  FOR ALL USING (shop_id = auth_shop_id() OR is_central_admin());

-- Bill number sequence per shop (helper function)
CREATE OR REPLACE FUNCTION generate_bill_no(p_shop_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_count INTEGER;
  v_date TEXT;
BEGIN
  v_date := TO_CHAR(NOW(), 'YYYYMMDD');
  SELECT COUNT(*) + 1 INTO v_count
  FROM bills
  WHERE shop_id = p_shop_id
    AND created_at::DATE = CURRENT_DATE;
  RETURN 'BILL-' || v_date || '-' || LPAD(v_count::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;
