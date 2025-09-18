const { Pool } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config();

async function seedDatabase() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('🌱 Starting database seeding...');

    // Create test users
    const testUsers = [
      {
        username: 'alice',
        email: 'alice@example.com',
        password: 'password123'
      },
      {
        username: 'bob',
        email: 'bob@example.com',
        password: 'password123'
      },
      {
        username: 'charlie',
        email: 'charlie@example.com',
        password: 'password123'
      }
    ];

    const userIds = [];

    for (const user of testUsers) {
      const passwordHash = await bcrypt.hash(user.password, 10);

      const result = await pool.query(`
        INSERT INTO users (username, email, password_hash)
        VALUES ($1, $2, $3)
        ON CONFLICT (email) DO UPDATE SET
          username = EXCLUDED.username,
          password_hash = EXCLUDED.password_hash
        RETURNING id
      `, [user.username, user.email, passwordHash]);

      userIds.push(result.rows[0].id);
      console.log(`✅ Created user: ${user.username}`);
    }

    // Create additional chat rooms
    const chatRooms = [
      {
        id: 'random',
        name: 'Random',
        description: 'Random discussions and off-topic conversations',
        type: 'public'
      },
      {
        id: 'tech-talk',
        name: 'Tech Talk',
        description: 'Technology discussions and programming help',
        type: 'public'
      }
    ];

    for (const room of chatRooms) {
      await pool.query(`
        INSERT INTO chat_rooms (id, name, description, type)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description
      `, [room.id, room.name, room.description, room.type]);

      console.log(`✅ Created chat room: ${room.name}`);
    }

    // Add users to all public rooms
    const allRooms = ['general', 'random', 'tech-talk'];

    for (const userId of userIds) {
      for (const roomId of allRooms) {
        await pool.query(`
          INSERT INTO room_memberships (user_id, room_id, role)
          VALUES ($1, $2, 'member')
          ON CONFLICT (user_id, room_id) DO NOTHING
        `, [userId, roomId]);
      }
    }

    console.log('✅ Added users to chat rooms');

    // Add some sample messages
    const sampleMessages = [
      {
        roomId: 'general',
        userId: userIds[0],
        content: 'Welcome to the general chat! 👋',
        type: 'text'
      },
      {
        roomId: 'general',
        userId: userIds[1],
        content: 'Hey everyone! Great to be here.',
        type: 'text'
      },
      {
        roomId: 'tech-talk',
        userId: userIds[2],
        content: 'What do you think about the new TypeScript features?',
        type: 'text'
      },
      {
        roomId: 'random',
        userId: userIds[0],
        content: 'Anyone have weekend plans?',
        type: 'text'
      }
    ];

    for (const message of sampleMessages) {
      await pool.query(`
        INSERT INTO messages (room_id, user_id, content, type)
        VALUES ($1, $2, $3, $4)
      `, [message.roomId, message.userId, message.content, message.type]);
    }

    console.log('✅ Added sample messages');
    console.log('🎉 Database seeding completed successfully');

    // Display login credentials
    console.log('\n📝 Test user credentials:');
    testUsers.forEach(user => {
      console.log(`  Email: ${user.email}, Password: ${user.password}`);
    });

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase };