const Docker = require('dockerode');
const { Pool } = require('pg');

const docker = new Docker({ socketPath: '/var/run/docker.sock' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const serverUrl = process.env.SERVERURL || 'http://localhost';

class KaliManager {
  constructor() {
    this.maxContainers = parseInt(process.env.MAX_CONCURRENT_CONTAINERS) || 10;
    this.idleTimeout = parseInt(process.env.CONTAINER_IDLE_TIMEOUT) || 1800000;
    this.poolSize = parseInt(process.env.POOL_SIZE) || 3;
    this.kaliImage = process.env.KALI_IMAGE || 'kali-custom:latest';
    this.networkName = 'hack-lab-network';
    
    this.initialize();
    setInterval(() => this.cleanupIdle(), 5 * 60 * 1000);
  }

  async initialize() {
    try {
      console.log('🔧 Initializing KaliManager...');
      
      await this.ensureNetwork();
      await this.syncPortAllocations();
      await this.cleanupOldPoolContainers();
      await this.initializePool();
      
      console.log('✅ KaliManager initialization complete');
    } catch (error) {
      console.error('❌ KaliManager initialization failed:', error.message);
    }
  }

  // Sync port allocations with reality
async syncPortAllocations() {
  console.log('🔄 Syncing port allocations with Docker reality...');
  
  try {
    // Get all running containers with our ports
    const containers = await docker.listContainers();
    const usedPorts = new Set();
    
    for (const container of containers) {
      const ports = container.Ports || [];
      for (const portMapping of ports) {
        if (portMapping.PublicPort >= 15901 && portMapping.PublicPort <= 16099) {
          usedPorts.add(portMapping.PublicPort);
        }
      }
    }
    
    // Reset all ports first
    await pool.query(`UPDATE port_allocations SET is_available = TRUE, allocated_to = NULL`);
    
    // Mark used ports as unavailable
    if (usedPorts.size > 0) {
      const portArray = Array.from(usedPorts);
      await pool.query(
        `UPDATE port_allocations 
         SET is_available = FALSE, allocated_to = 'existing-container'
         WHERE port = ANY($1::int[])`,
        [portArray]
      );
      console.log(`   ⚠️  Found ${usedPorts.size} ports in use: ${portArray.join(', ')}`);
    }
    
    console.log('✅ Port allocations synced');
  } catch (error) {
    console.error('❌ Port sync failed:', error.message);
  }
}

  async ensureNetwork() {
    try {
      console.log(`🔍 Checking for network: ${this.networkName}`);
      
      const networks = await docker.listNetworks({
        filters: { name: [this.networkName] }
      });

      if (networks.length === 0) {
        console.error(`❌ Network ${this.networkName} not found!`);
        throw new Error(`Network ${this.networkName} does not exist. Start docker-compose first.`);
      }
      
      console.log(`✅ Network ${this.networkName} found`);
      return networks[0];
    } catch (error) {
      console.error(`❌ Network check failed:`, error.message);
      throw error;
    }
  }

  async cleanupOldPoolContainers() {
    console.log('🧹 Cleaning up old pool containers...');
    
    try {
      const containers = await docker.listContainers({ all: true });
      const poolContainers = containers.filter(c => 
        c.Names.some(name => name.includes('kali-pool-'))
      );

      console.log(`Found ${poolContainers.length} old pool containers to clean`);

      for (const containerInfo of poolContainers) {
        try {
          const container = docker.getContainer(containerInfo.Id);
          
          if (containerInfo.State === 'running') {
            console.log(`  ⏹️  Stopping ${containerInfo.Names[0]}`);
            await container.stop({ t: 5 });
          }
          
          console.log(`  🗑️  Removing ${containerInfo.Names[0]}`);
          await container.remove({ force: true });
          
          await this.cleanupContainer(containerInfo.Id);
          
        } catch (err) {
          console.error(`  ⚠️  Error cleaning ${containerInfo.Id}:`, err.message);
        }
      }

      // Reset port allocations
      await pool.query(
        `UPDATE port_allocations SET is_available = TRUE, allocated_to = NULL`
      );
      
      console.log('✅ Cleanup complete');
    } catch (error) {
      console.error('❌ Cleanup error:', error.message);
    }
  }

  async initializePool() {
    console.log(`🏊 Initializing container pool (${this.poolSize} containers)...`);
    
    for (let i = 0; i < this.poolSize; i++) {
      try {
        await this.createKaliContainer(`pool-${Date.now()}-${i}`, 'pool');
        console.log(`✅ Pool container ${i + 1}/${this.poolSize} ready`);
        
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.error(`❌ Failed to create pool container ${i}:`, error.message);
      }
    }
    
    console.log(`✅ Container pool initialized`);
  }

  async allocatePort(type = 'vnc') {
    const client = await pool.connect();
    
    try {
      console.log(`🔍 Attempting to allocate ${type} port...`);
      
      const result = await client.query(
        `UPDATE port_allocations 
         SET is_available = FALSE, 
             allocated_at = CURRENT_TIMESTAMP,
             allocated_to = 'allocating'
         WHERE port = (
           SELECT port FROM port_allocations 
           WHERE port_type = $1 AND is_available = TRUE 
           ORDER BY port 
           LIMIT 1
           FOR UPDATE SKIP LOCKED
         )
         RETURNING port`,
        [type]
      );
      
      if (result.rows.length === 0) {
        throw new Error(`No ${type} ports available`);
      }
      
      const allocatedPort = result.rows[0].port;
      console.log(`✅ Allocated ${type} port: ${allocatedPort}`);
      return allocatedPort;
      
    } catch (error) {
      console.error(`❌ Port allocation error:`, error.message);
      throw error;
    } finally {
      client.release();
    }
  }

  async releasePort(port) {
    await pool.query(
      `UPDATE port_allocations 
       SET is_available = TRUE, allocated_to = NULL 
       WHERE port = $1`,
      [port]
    );
  }

  async getUserContainer(userId) {
    const result = await pool.query(
      `SELECT * FROM user_containers 
       WHERE user_id = $1 AND status = 'running'`,
      [userId]
    );

    if (result.rows.length === 0) return null;

    const container = result.rows[0];
    
    try {
      const dockerContainer = docker.getContainer(container.container_id);
      const inspect = await dockerContainer.inspect();
      
      if (!inspect.State.Running) {
        await this.cleanupContainer(container.container_id);
        return null;
      }
      
      return container;
    } catch (error) {
      await this.cleanupContainer(container.container_id);
      return null;
    }
  }

  async assignContainer(userId, scenarioId) {
  // Check if user already has a container
  let existing = await this.getUserContainer(userId);
  if (existing) {
    await this.updateActivity(userId);
    return {
      ...existing,
      reused: true,
      vncUrl: `${serverUrl}:${existing.vnc_port}`,
      novncUrl: `${serverUrl}:${existing.novnc_port}/vnc.html?password=kali123`
    };
  }

  // Try to get a container from the pool
  const poolContainer = await pool.query(
    `SELECT * FROM user_containers 
     WHERE user_id LIKE 'pool-%' AND status = 'running' 
     LIMIT 1`
  );

  if (poolContainer.rows.length > 0) {
    const container = poolContainer.rows[0];
    
    // ✅ DELETE old pool record, INSERT new user record in a transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Delete the pool container record
      await client.query(
        `DELETE FROM user_containers WHERE container_id = $1`,
        [container.container_id]
      );
      
      // Insert new record for the actual user
      await client.query(
        `INSERT INTO user_containers 
         (user_id, container_id, container_name, vnc_port, novnc_port, status, current_scenario_id, created_at, last_activity)
         VALUES ($1, $2, $3, $4, $5, 'running', $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         ON CONFLICT (user_id) DO UPDATE SET
         container_id = $2,
         container_name = $3,
         vnc_port = $4,
         novnc_port = $5,
         status = 'running',
         current_scenario_id = $6,
         created_at = CURRENT_TIMESTAMP,
         last_activity = CURRENT_TIMESTAMP`,
        [userId, container.container_id, container.container_name, 
         container.vnc_port, container.novnc_port, scenarioId]
      );
      
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    // Refill the pool in the background
    this.refillPool();

    return {
      container_id: container.container_id,
      container_name: container.container_name,
      vnc_port: container.vnc_port,
      novnc_port: container.novnc_port,
      user_id: userId,
      reused: false,
      fromPool: true,
      vncUrl: `${serverUrl}:${container.vnc_port}`,
      novncUrl: `${serverUrl}:${container.novnc_port}/vnc.html?password=kali123`
    };
  }

  // No pool containers available, check capacity
  const activeCount = await this.getActiveCount();
  if (activeCount >= this.maxContainers) {
    throw new Error(`Server at capacity (${activeCount}/${this.maxContainers} containers)`);
  }

  // Create a new container
  return await this.createKaliContainer(userId, scenarioId);
}

  async createKaliContainer(userId, scenarioId) {
    let vncPort = null;
    let novncPort = null;
    
    try {
      // ✅ ALLOCATE UNIQUE HOST PORTS
      vncPort = await this.allocatePort('vnc');
      novncPort = await this.allocatePort('novnc');
      const containerName = `kali-${userId}-${Date.now()}`;

      console.log(`🐳 Creating container: ${containerName}`);
      console.log(`   VNC Port: ${vncPort}, NoVNC Port: ${novncPort}`);
      
      // ✅ CRITICAL FIX: Use allocated ports for HOST binding
      // Container ALWAYS uses internal ports 5901 and 6080
      // But HOST ports are dynamically allocated from the pool
      const container = await docker.createContainer({
        Image: this.kaliImage,
        name: containerName,
        Hostname: containerName,
        Env: [
          `USER_ID=${userId}`,
          `SCENARIO_ID=${scenarioId}`,
          `DISPLAY=:1`,
          `VNC_PASSWORD=kali123`
        ],
        ExposedPorts: { 
          '5901/tcp': {},  // VNC - container internal port (always 5901)
          '6080/tcp': {}   // noVNC - container internal port (always 6080)
        },
        HostConfig: {
          PortBindings: {
            // Map container's internal 5901 to allocated HOST port
            // revert to localhost nginx will map to each port
            '5901/tcp': [{ HostPort: vncPort.toString(), HostIp: '127.0.0.1' }],
            // Map container's internal 6080 to allocated HOST port
            '6080/tcp': [{ HostPort: novncPort.toString(), HostIp: '127.0.0.1' }]
          },
          NetworkMode: this.networkName,
          Memory: 2 * 1024 * 1024 * 1024,
          MemorySwap: 2 * 1024 * 1024 * 1024,
          CpuQuota: 50000,
          CpuPeriod: 100000,
          CapAdd: ['NET_RAW', 'NET_ADMIN'],
          SecurityOpt: ['no-new-privileges:true']
        },
        Labels: {
          'cedrik.user': userId,
          'cedrik.scenario': scenarioId
        }
      });

      await container.start();
      console.log(`✅ Container started: ${containerName}`);
      
      const info = await container.inspect();

      // ✅ Save with allocated ports (not hardcoded 5901/6080)
      await pool.query(
        `INSERT INTO user_containers 
         (user_id, container_id, container_name, vnc_port, novnc_port, status, current_scenario_id, created_at)
         VALUES ($1, $2, $3, $4, $5, 'running', $6, CURRENT_TIMESTAMP)
         ON CONFLICT (user_id) DO UPDATE SET
         container_id = $2,
         container_name = $3,
         vnc_port = $4,
         novnc_port = $5,
         status = 'running',
         current_scenario_id = $6,
         created_at = CURRENT_TIMESTAMP`,
        [userId, info.Id, containerName, vncPort, novncPort, scenarioId]
      );

      // Mark ports as allocated
      await pool.query(
        `UPDATE port_allocations SET allocated_to = $1 WHERE port IN ($2, $3)`,
        [userId, vncPort, novncPort]
      );

      console.log(`✅ Created container for ${userId}: ${containerName}`);

      return {
        container_id: info.Id,
        container_name: containerName,
        vnc_port: vncPort,
        novnc_port: novncPort,
        user_id: userId,
        vncUrl: `${serverUrl}:${vncPort}`,
        novncUrl: `${serverUrl}:${novncPort}/vnc.html?password=kali123`,
        reused: false
      };

    } catch (error) {
      console.error(`❌ Container creation failed:`, error.message);
      
      // Release ports on failure
      if (vncPort) {
        await this.releasePort(vncPort).catch(err => 
          console.error(`Failed to release VNC port ${vncPort}:`, err.message)
        );
      }
      if (novncPort) {
        await this.releasePort(novncPort).catch(err => 
          console.error(`Failed to release noVNC port ${novncPort}:`, err.message)
        );
      }
      
      // Clean up failed container
      try {
        const containers = await docker.listContainers({ all: true });
        const orphan = containers.find(c => 
          c.Names.some(n => n.includes(`kali-${userId}`))
        );
        if (orphan) {
          console.log(`🧹 Cleaning up failed container`);
          await docker.getContainer(orphan.Id).remove({ force: true });
        }
      } catch (cleanupErr) {
        console.error('Cleanup error:', cleanupErr.message);
      }
      
      throw error;
    }
  }

  async refillPool() {
    const poolCount = await pool.query(
      `SELECT COUNT(*) FROM user_containers WHERE user_id LIKE 'pool-%' AND status = 'running'`
    );

    const current = parseInt(poolCount.rows[0].count);
    const needed = this.poolSize - current;

    for (let i = 0; i < needed; i++) {
      try {
        await this.createKaliContainer(`pool-${Date.now()}-${i}`, 'pool');
      } catch (error) {
        console.error('Failed to refill pool:', error.message);
      }
    }
  }

  async updateActivity(userId) {
    await pool.query(
      `UPDATE user_containers 
       SET last_activity = CURRENT_TIMESTAMP 
       WHERE user_id = $1`,
      [userId]
    );
  }

  async cleanupIdle() {
    const threshold = new Date(Date.now() - this.idleTimeout);
    
    const idle = await pool.query(
      `SELECT * FROM user_containers 
       WHERE status = 'running' 
       AND last_activity < $1 
       AND user_id NOT LIKE 'pool-%'`,
      [threshold]
    );

    for (const row of idle.rows) {
      try {
        const container = docker.getContainer(row.container_id);
        await container.stop({ t: 10 });
        await container.remove();
        await this.cleanupContainer(row.container_id);
        console.log(`🧹 Cleaned up idle container: ${row.container_name}`);
      } catch (error) {
        console.error(`Error cleaning ${row.container_id}:`, error.message);
      }
    }
  }

  async cleanupContainer(containerId) {
    const result = await pool.query(
      `UPDATE user_containers 
       SET status = 'stopped', stopped_at = CURRENT_TIMESTAMP
       WHERE container_id = $1
       RETURNING vnc_port, novnc_port`,
      [containerId]
    );

    if (result.rows.length > 0) {
      await this.releasePort(result.rows[0].vnc_port);
      await this.releasePort(result.rows[0].novnc_port);
    }
  }

  async getActiveCount() {
    const result = await pool.query(
      `SELECT COUNT(*) FROM user_containers WHERE status = 'running'`
    );
    return parseInt(result.rows[0].count);
  }

  async stopUserContainer(userId) {
    const container = await this.getUserContainer(userId);
    if (!container) return { success: false, message: 'No container found' };

    try {
      const dockerContainer = docker.getContainer(container.container_id);
      await dockerContainer.stop({ t: 10 });
      await dockerContainer.remove();
      await this.cleanupContainer(container.container_id);
      
      return { success: true, message: 'Container stopped' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }
}

module.exports = new KaliManager();
