# Save the script
cat > fix_ports.sh << 'SCRIPT'
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
SCRIPT

chmod +x fix_ports.sh
./fix_ports.sh
```

**Expected Output:**
```
📊 Current port allocations:
 port_type |  min  |  max  | total 
-----------+-------+-------+-------
 vnc       |  5901 |  5920 |    20  ← OLD (wrong)
 novnc     |  6080 |  6099 |    20  ← OLD (wrong)

🗑️  Deleting old port allocations...
DELETE 40

🧹 Cleaning up user_containers...
DELETE X

✅ Creating new port ranges...
NOTICE:  Created 20 VNC ports (15901-15920) and 20 noVNC ports (16080-16099)

✅ NEW port allocations:
 port_type |  min  |  max  | total 
-----------+-------+-------+-------
 novnc     | 16080 | 16099 |    20  ← NEW (correct!)
 vnc       | 15901 | 15920 |    20  ← NEW (correct!)

📋 Sample available ports:
  port  | port_type | is_available 
--------+-----------+--------------
  16080 | novnc     | t
  16081 | novnc     | t
  16082 | novnc     | t
  15901 | vnc       | t
  15902 | vnc       | t
  15903 | vnc       | t