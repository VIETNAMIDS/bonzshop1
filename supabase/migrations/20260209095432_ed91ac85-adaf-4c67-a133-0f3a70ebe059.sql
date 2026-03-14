-- Insert primary admin user id for payment settings
INSERT INTO site_settings (key, value) 
VALUES ('primary_admin_user_id', 'cb36ab29-ee7d-4031-81ff-e6e02c936d53')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;