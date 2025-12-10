-- Security Logs Table
-- Stores security-relevant events for monitoring and auditing
-- Safe for production - no sensitive data (passwords, tokens, emails) stored

CREATE TABLE IF NOT EXISTS security_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL CHECK (event_type IN (
    'failed_login',
    'csrf_failure',
    'rate_limit_exceeded',
    'authorization_failure',
    'validation_failure',
    'suspicious_activity'
  )),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ip_address TEXT,
  user_agent TEXT,
  path TEXT,
  method TEXT,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_security_logs_event_type ON security_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_security_logs_user_id ON security_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_security_logs_ip_address ON security_logs(ip_address);
CREATE INDEX IF NOT EXISTS idx_security_logs_created_at ON security_logs(created_at);

-- Row Level Security: Only admins can read security logs
ALTER TABLE security_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can read all security logs
CREATE POLICY "Admins can read security logs"
  ON security_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Policy: Service role can insert (for logging)
-- Note: Service role bypasses RLS, so this is implicit
-- But we document it here for clarity

-- Retention policy: Logs older than 90 days can be cleaned up
-- (This is a comment - actual cleanup should be done via scheduled job)
-- DELETE FROM security_logs WHERE created_at < NOW() - INTERVAL '90 days';

