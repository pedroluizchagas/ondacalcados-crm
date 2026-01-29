-- Onda Calcados HR System Database Schema
-- This migration creates all tables with Row Level Security (RLS)

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- STORES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.stores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  cnpj TEXT UNIQUE,
  city TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read stores
CREATE POLICY "stores_select" ON public.stores 
  FOR SELECT TO authenticated USING (true);

-- Only admins can insert/update/delete stores
CREATE POLICY "stores_insert" ON public.stores 
  FOR INSERT TO authenticated WITH CHECK (
    (SELECT (raw_user_meta_data->>'role')::text FROM auth.users WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "stores_update" ON public.stores 
  FOR UPDATE TO authenticated USING (
    (SELECT (raw_user_meta_data->>'role')::text FROM auth.users WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "stores_delete" ON public.stores 
  FOR DELETE TO authenticated USING (
    (SELECT (raw_user_meta_data->>'role')::text FROM auth.users WHERE id = auth.uid()) = 'admin'
  );

-- =====================================================
-- POSITIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.positions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  cbo TEXT,
  base_salary DECIMAL(12,2) NOT NULL DEFAULT 0,
  store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "positions_select" ON public.positions 
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "positions_insert" ON public.positions 
  FOR INSERT TO authenticated WITH CHECK (
    (SELECT (raw_user_meta_data->>'role')::text FROM auth.users WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "positions_update" ON public.positions 
  FOR UPDATE TO authenticated USING (
    (SELECT (raw_user_meta_data->>'role')::text FROM auth.users WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "positions_delete" ON public.positions 
  FOR DELETE TO authenticated USING (
    (SELECT (raw_user_meta_data->>'role')::text FROM auth.users WHERE id = auth.uid()) = 'admin'
  );

-- =====================================================
-- EMPLOYEES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  phone TEXT,
  cpf TEXT UNIQUE NOT NULL,
  role TEXT,
  department TEXT,
  store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL,
  position_id UUID REFERENCES public.positions(id) ON DELETE SET NULL,
  salary DECIMAL(12,2) NOT NULL DEFAULT 0,
  hire_date DATE NOT NULL,
  birth_date DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'vacation', 'terminated')),
  address_street TEXT,
  address_number TEXT,
  address_city TEXT,
  address_state TEXT,
  address_zip_code TEXT,
  termination_date DATE,
  termination_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "employees_select" ON public.employees 
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "employees_insert" ON public.employees 
  FOR INSERT TO authenticated WITH CHECK (
    (SELECT (raw_user_meta_data->>'role')::text FROM auth.users WHERE id = auth.uid()) IN ('admin', 'hr')
  );

CREATE POLICY "employees_update" ON public.employees 
  FOR UPDATE TO authenticated USING (
    (SELECT (raw_user_meta_data->>'role')::text FROM auth.users WHERE id = auth.uid()) IN ('admin', 'hr')
  );

CREATE POLICY "employees_delete" ON public.employees 
  FOR DELETE TO authenticated USING (
    (SELECT (raw_user_meta_data->>'role')::text FROM auth.users WHERE id = auth.uid()) = 'admin'
  );

-- =====================================================
-- VACATIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.vacations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days INTEGER NOT NULL,
  paid_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in-progress', 'completed', 'cancelled')),
  acquisition_period_start DATE NOT NULL,
  acquisition_period_end DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.vacations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vacations_select" ON public.vacations 
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "vacations_insert" ON public.vacations 
  FOR INSERT TO authenticated WITH CHECK (
    (SELECT (raw_user_meta_data->>'role')::text FROM auth.users WHERE id = auth.uid()) IN ('admin', 'hr')
  );

CREATE POLICY "vacations_update" ON public.vacations 
  FOR UPDATE TO authenticated USING (
    (SELECT (raw_user_meta_data->>'role')::text FROM auth.users WHERE id = auth.uid()) IN ('admin', 'hr')
  );

CREATE POLICY "vacations_delete" ON public.vacations 
  FOR DELETE TO authenticated USING (
    (SELECT (raw_user_meta_data->>'role')::text FROM auth.users WHERE id = auth.uid()) IN ('admin', 'hr')
  );

-- =====================================================
-- MEDICAL CERTIFICATES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.medical_certificates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  days INTEGER NOT NULL,
  cid TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.medical_certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "medical_certificates_select" ON public.medical_certificates 
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "medical_certificates_insert" ON public.medical_certificates 
  FOR INSERT TO authenticated WITH CHECK (
    (SELECT (raw_user_meta_data->>'role')::text FROM auth.users WHERE id = auth.uid()) IN ('admin', 'hr')
  );

CREATE POLICY "medical_certificates_update" ON public.medical_certificates 
  FOR UPDATE TO authenticated USING (
    (SELECT (raw_user_meta_data->>'role')::text FROM auth.users WHERE id = auth.uid()) IN ('admin', 'hr')
  );

CREATE POLICY "medical_certificates_delete" ON public.medical_certificates 
  FOR DELETE TO authenticated USING (
    (SELECT (raw_user_meta_data->>'role')::text FROM auth.users WHERE id = auth.uid()) IN ('admin', 'hr')
  );

-- =====================================================
-- RESIGNATIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.resignations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL,
  exit_date DATE NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('pedido', 'sem_justa_causa', 'justa_causa', 'acordo', 'termino_contrato')),
  total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.resignations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "resignations_select" ON public.resignations 
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "resignations_insert" ON public.resignations 
  FOR INSERT TO authenticated WITH CHECK (
    (SELECT (raw_user_meta_data->>'role')::text FROM auth.users WHERE id = auth.uid()) IN ('admin', 'hr')
  );

CREATE POLICY "resignations_update" ON public.resignations 
  FOR UPDATE TO authenticated USING (
    (SELECT (raw_user_meta_data->>'role')::text FROM auth.users WHERE id = auth.uid()) IN ('admin', 'hr')
  );

CREATE POLICY "resignations_delete" ON public.resignations 
  FOR DELETE TO authenticated USING (
    (SELECT (raw_user_meta_data->>'role')::text FROM auth.users WHERE id = auth.uid()) = 'admin'
  );

-- =====================================================
-- PAYROLL ITEMS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.payroll_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL,
  position_id UUID REFERENCES public.positions(id) ON DELETE SET NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL,
  base_salary DECIMAL(12,2) NOT NULL DEFAULT 0,
  commissions DECIMAL(12,2) NOT NULL DEFAULT 0,
  employee_purchases DECIMAL(12,2) NOT NULL DEFAULT 0,
  vouchers DECIMAL(12,2) NOT NULL DEFAULT 0,
  advances DECIMAL(12,2) NOT NULL DEFAULT 0,
  inss DECIMAL(12,2) NOT NULL DEFAULT 0,
  fgts DECIMAL(12,2) NOT NULL DEFAULT 0,
  gross_salary DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_deductions DECIMAL(12,2) NOT NULL DEFAULT 0,
  net_salary DECIMAL(12,2) NOT NULL DEFAULT 0,
  payment_type TEXT NOT NULL DEFAULT 'contabil' CHECK (payment_type IN ('contabil', 'nao_contabil')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
  payment_date DATE,
  settlement_date DATE,
  settlement_location TEXT,
  custom_events JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(employee_id, month, year)
);

ALTER TABLE public.payroll_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payroll_items_select" ON public.payroll_items 
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "payroll_items_insert" ON public.payroll_items 
  FOR INSERT TO authenticated WITH CHECK (
    (SELECT (raw_user_meta_data->>'role')::text FROM auth.users WHERE id = auth.uid()) IN ('admin', 'hr', 'finance')
  );

CREATE POLICY "payroll_items_update" ON public.payroll_items 
  FOR UPDATE TO authenticated USING (
    (SELECT (raw_user_meta_data->>'role')::text FROM auth.users WHERE id = auth.uid()) IN ('admin', 'hr', 'finance')
  );

CREATE POLICY "payroll_items_delete" ON public.payroll_items 
  FOR DELETE TO authenticated USING (
    (SELECT (raw_user_meta_data->>'role')::text FROM auth.users WHERE id = auth.uid()) = 'admin'
  );

-- =====================================================
-- USER PROFILES TABLE (linked to auth.users)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'hr', 'finance', 'viewer')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select" ON public.profiles 
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "profiles_update_own" ON public.profiles 
  FOR UPDATE TO authenticated USING (auth.uid() = id);

-- =====================================================
-- TRIGGER: Auto-create profile on user signup
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'viewer')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- TRIGGER: Update updated_at timestamp
-- =====================================================
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Apply updated_at trigger to all tables
CREATE TRIGGER update_stores_updated_at BEFORE UPDATE ON public.stores FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_positions_updated_at BEFORE UPDATE ON public.positions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON public.employees FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_vacations_updated_at BEFORE UPDATE ON public.vacations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_medical_certificates_updated_at BEFORE UPDATE ON public.medical_certificates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_resignations_updated_at BEFORE UPDATE ON public.resignations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_payroll_items_updated_at BEFORE UPDATE ON public.payroll_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =====================================================
-- INDEXES for better performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_employees_store_id ON public.employees(store_id);
CREATE INDEX IF NOT EXISTS idx_employees_position_id ON public.employees(position_id);
CREATE INDEX IF NOT EXISTS idx_employees_status ON public.employees(status);
CREATE INDEX IF NOT EXISTS idx_vacations_employee_id ON public.vacations(employee_id);
CREATE INDEX IF NOT EXISTS idx_vacations_status ON public.vacations(status);
CREATE INDEX IF NOT EXISTS idx_medical_certificates_employee_id ON public.medical_certificates(employee_id);
CREATE INDEX IF NOT EXISTS idx_resignations_employee_id ON public.resignations(employee_id);
CREATE INDEX IF NOT EXISTS idx_payroll_items_employee_id ON public.payroll_items(employee_id);
CREATE INDEX IF NOT EXISTS idx_payroll_items_month_year ON public.payroll_items(month, year);
CREATE INDEX IF NOT EXISTS idx_payroll_items_status ON public.payroll_items(status);
