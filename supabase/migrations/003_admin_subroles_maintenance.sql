-- Alter users table to support Super Admin vs Regular Admin
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_super BOOLEAN NOT NULL DEFAULT FALSE;

-- Update the default admin account to be a Super Admin
UPDATE users SET is_super = TRUE WHERE email = 'nabamitdutta14@gmail.com';

-- Alter shops table to support deactivation, auto-renew, alternate contacts
ALTER TABLE shops ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS auto_renew BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS alternate_phone TEXT;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS alternate_email TEXT;

-- Create platform_settings table
CREATE TABLE IF NOT EXISTS platform_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  maintenance_mode BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on platform_settings
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

-- Create policy to allow anyone to read maintenance mode
CREATE POLICY platform_settings_read ON platform_settings
  FOR SELECT USING (TRUE);

-- Create policy to allow central admins to edit settings
CREATE POLICY platform_settings_admin ON platform_settings
  FOR ALL USING (is_central_admin());

-- Insert a default row if it doesn't exist
INSERT INTO platform_settings (id, maintenance_mode)
VALUES ('00000000-0000-0000-0000-000000000001', FALSE)
ON CONFLICT DO NOTHING;

-- Create admin_tasks table
CREATE TABLE IF NOT EXISTS admin_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  task_description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on admin_tasks
ALTER TABLE admin_tasks ENABLE ROW LEVEL SECURITY;

-- Allow admins to see their own tasks or allow central admin (Super Admin) to see all
CREATE POLICY admin_tasks_policy ON admin_tasks
  FOR ALL USING (
    admin_id = auth_user_id() OR is_central_admin()
  );

-- Create chat_messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES users(id) ON DELETE SET NULL, -- NULL means broadcast
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on chat_messages
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Allow central admins to see chat messages (both broadcast and 1:1)
CREATE POLICY chat_messages_policy ON chat_messages
  FOR ALL USING (
    is_central_admin() AND (
      sender_id = auth_user_id() OR
      receiver_id = auth_user_id() OR
      receiver_id IS NULL
    )
  );

-- Add triggers for update_updated_at on platform_settings and admin_tasks
CREATE TRIGGER platform_settings_updated_at BEFORE UPDATE ON platform_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER admin_tasks_updated_at BEFORE UPDATE ON admin_tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
