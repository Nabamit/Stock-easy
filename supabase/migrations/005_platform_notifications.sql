-- Create platform_notifications table
CREATE TABLE IF NOT EXISTS platform_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES users(id) ON DELETE SET NULL,
  recipient_type TEXT NOT NULL CHECK (recipient_type IN ('all', 'admin', 'owner', 'custom')),
  recipient_email TEXT, -- for custom single recipient
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create platform_notification_reads table to track read status per user
CREATE TABLE IF NOT EXISTS platform_notification_reads (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  notification_id UUID REFERENCES platform_notifications(id) ON DELETE CASCADE,
  read_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (user_id, notification_id)
);
