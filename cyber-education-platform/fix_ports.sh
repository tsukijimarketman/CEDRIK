#!/bin/bash
echo "🚨 EMERGENCY DATABASE FIX - Port Range Correction"
echo "=================================================="

docker exec -i cyber-db psql -U cyber_admin -d cyber_education << 'EOF'
-- Check current allocations
\echo '📊 Current port allocations:'
SELECT port_type, MIN(port) as min, MAX(port) as max, COUNT(*) as total 
FROM port_allocations 
GROUP BY port_type;

-- Delete ALL old port allocations
\echo ''
\echo '🗑️  Deleting old port allocations...'
DELETE FROM port_allocations;

-- Clean up containers table
\echo '🧹 Cleaning up user_containers...'
DELETE FROM user_containers;

-- Insert NEW port ranges
\echo ''
\echo '✅ Creating new port ranges...'
DO $$
BEGIN
    FOR i IN 15901..15920 LOOP
        INSERT INTO port_allocations (port, port_type, is_available, allocated_to, allocated_at)
        VALUES (i, 'vnc', TRUE, NULL, NULL);
    END LOOP;
    
    FOR i IN 16080..16099 LOOP
        INSERT INTO port_allocations (port, port_type, is_available, allocated_to, allocated_at)
        VALUES (i, 'novnc', TRUE, NULL, NULL);
    END LOOP;
    
    RAISE NOTICE 'Created 20 VNC ports (15901-15920) and 20 noVNC ports (16080-16099)';
END
$$;

-- Verify new allocations
\echo ''
\echo '✅ NEW port allocations:'
SELECT port_type, MIN(port) as min, MAX(port) as max, COUNT(*) as total 
FROM port_allocations 
GROUP BY port_type
ORDER BY port_type;

-- Show sample ports
\echo ''
\echo '📋 Sample available ports:'
SELECT port, port_type, is_available 
FROM port_allocations 
WHERE is_available = TRUE 
ORDER BY port_type, port 
LIMIT 6;
EOF

echo ""
echo "=================================================="
echo "✅ Database fixed!"
