/**
 * Database Initialization Script
 *
 * This script:
 * 1. Validates environment variables for database connections
 * 2. Checks if required collections exist
 * 3. Creates collections with MongoDB schema validation
 * 4. Sets up indexes for optimal query performance
 *
 * Usage: node scripts/init-database.js
 *
 * Compatible with future cloud migration (no local-only assumptions)
 */

require('dotenv').config();
const mongoose = require('mongoose');

// MongoDB JSON Schema validators for collections
const schemaValidators = {
  groups: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['name', 'type', 'createdBy'],
      properties: {
        name: {
          bsonType: 'string',
          minLength: 1,
          maxLength: 100,
          description: 'Group name is required and must be 1-100 characters'
        },
        description: {
          bsonType: 'string',
          maxLength: 500,
          description: 'Description must not exceed 500 characters'
        },
        type: {
          enum: ['public', 'private'],
          description: 'Type must be public or private'
        },
        createdBy: {
          bsonType: 'objectId',
          description: 'Creator user ID is required'
        },
        admins: {
          bsonType: 'array',
          items: { bsonType: 'objectId' },
          description: 'Array of admin user IDs'
        },
        moderators: {
          bsonType: 'array',
          items: { bsonType: 'objectId' },
          description: 'Array of moderator user IDs'
        },
        members: {
          bsonType: 'array',
          items: { bsonType: 'objectId' },
          description: 'Array of member user IDs'
        },
        memberCount: {
          bsonType: 'int',
          minimum: 0,
          description: 'Cached member count'
        },
        inviteCode: {
          bsonType: 'string',
          description: 'Unique invite code for joining'
        },
        settings: {
          bsonType: 'object',
          properties: {
            allowJobSharing: { bsonType: 'bool' },
            allowChat: { bsonType: 'bool' },
            requireApproval: { bsonType: 'bool' },
            allowGuestView: { bsonType: 'bool' }
          }
        },
        stats: {
          bsonType: 'object',
          properties: {
            totalJobsShared: { bsonType: 'int', minimum: 0 },
            totalApplications: { bsonType: 'int', minimum: 0 },
            totalMessages: { bsonType: 'int', minimum: 0 }
          }
        },
        isActive: {
          bsonType: 'bool',
          description: 'Whether the group is active'
        },
        deletedAt: {
          bsonType: ['date', 'null'],
          description: 'When the group was deleted'
        },
        deletedBy: {
          bsonType: ['objectId', 'null'],
          description: 'User who deleted the group'
        }
      }
    }
  },

  groupmembers: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['groupId', 'userId', 'role'],
      properties: {
        groupId: {
          bsonType: 'objectId',
          description: 'Reference to group'
        },
        userId: {
          bsonType: 'objectId',
          description: 'Reference to user'
        },
        role: {
          enum: ['admin', 'moderator', 'member'],
          description: 'Member role in the group'
        },
        stats: {
          bsonType: 'object',
          properties: {
            jobsShared: { bsonType: 'int', minimum: 0 },
            messagesPosted: { bsonType: 'int', minimum: 0 },
            applicationsTracked: { bsonType: 'int', minimum: 0 },
            jobsSaved: { bsonType: 'int', minimum: 0 }
          }
        },
        notifications: {
          bsonType: 'object',
          properties: {
            newJobs: { bsonType: 'bool' },
            newMessages: { bsonType: 'bool' },
            mentions: { bsonType: 'bool' },
            applications: { bsonType: 'bool' }
          }
        },
        joinedAt: { bsonType: 'date' },
        lastActiveAt: { bsonType: 'date' }
      }
    }
  },

  chatmessages: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['groupId', 'userId', 'content', 'messageType'],
      properties: {
        groupId: {
          bsonType: 'objectId',
          description: 'Reference to group'
        },
        userId: {
          bsonType: 'objectId',
          description: 'Message sender'
        },
        messageType: {
          enum: ['text', 'job_share', 'system'],
          description: 'Type of message'
        },
        content: {
          bsonType: 'string',
          minLength: 1,
          maxLength: 2000,
          description: 'Message content (1-2000 chars)'
        },
        sharedJobId: {
          bsonType: 'objectId',
          description: 'Optional reference to shared job'
        },
        jobData: {
          bsonType: ['object', 'null'],
          description: 'Inline job data for job_share messages'
        },
        mentions: {
          bsonType: 'array',
          items: { bsonType: 'objectId' }
        },
        reactions: {
          bsonType: 'object',
          properties: {
            thumbsUp: { bsonType: 'array', items: { bsonType: 'objectId' } },
            heart: { bsonType: 'array', items: { bsonType: 'objectId' } },
            fire: { bsonType: 'array', items: { bsonType: 'objectId' } },
            laugh: { bsonType: 'array', items: { bsonType: 'objectId' } }
          }
        },
        replyTo: { bsonType: 'objectId' },
        replyCount: { bsonType: 'int', minimum: 0 },
        edited: { bsonType: 'bool' },
        editedAt: { bsonType: 'date' },
        deleted: { bsonType: 'bool' },
        deletedAt: { bsonType: 'date' }
      }
    }
  },

  sharedjobs: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['groupId', 'sharedBy', 'company', 'title'],
      properties: {
        groupId: {
          bsonType: 'objectId',
          description: 'Reference to group'
        },
        sharedBy: {
          bsonType: 'objectId',
          description: 'User who shared the job'
        },
        company: {
          bsonType: 'string',
          minLength: 1,
          description: 'Company name is required'
        },
        title: {
          bsonType: 'string',
          minLength: 1,
          description: 'Job title is required'
        },
        description: { bsonType: 'string' },
        descriptionHtml: { bsonType: 'string' },
        location: { bsonType: 'string' },
        workType: {
          enum: ['Remote', 'On-site', 'Onsite', 'Hybrid', 'Not specified']
        },
        salary: { bsonType: 'string' },
        linkedinUrl: { bsonType: 'string' },
        jobUrl: { bsonType: 'string' },
        linkedinJobId: { bsonType: 'string' },
        source: {
          enum: ['LinkedIn', 'Indeed', 'Glassdoor', 'Company Website', 'Referral', 'Other', 'Manual']
        },
        jobPostedHoursAgo: { bsonType: 'int' },
        applicantCount: { bsonType: 'int' },
        timeToApplyBucket: { bsonType: 'string' },
        competitionBucket: { bsonType: 'string' },
        sharedAt: { bsonType: 'date' },
        sharedNote: { bsonType: 'string', maxLength: 500 },
        stats: {
          bsonType: 'object',
          properties: {
            views: { bsonType: 'int', minimum: 0 },
            saves: { bsonType: 'int', minimum: 0 },
            applications: { bsonType: 'int', minimum: 0 },
            comments: { bsonType: 'int', minimum: 0 }
          }
        },
        isActive: { bsonType: 'bool' }
      }
    }
  },

  comments: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['sharedJobId', 'userId', 'content'],
      properties: {
        sharedJobId: {
          bsonType: 'objectId',
          description: 'Reference to shared job'
        },
        userId: {
          bsonType: 'objectId',
          description: 'Commenter user ID'
        },
        content: {
          bsonType: 'string',
          minLength: 1,
          maxLength: 1000,
          description: 'Comment content (1-1000 chars)'
        },
        reactions: {
          bsonType: 'object',
          properties: {
            thumbsUp: { bsonType: 'array', items: { bsonType: 'objectId' } },
            heart: { bsonType: 'array', items: { bsonType: 'objectId' } }
          }
        },
        replyTo: { bsonType: 'objectId' },
        edited: { bsonType: 'bool' },
        editedAt: { bsonType: 'date' },
        deleted: { bsonType: 'bool' },
        deletedAt: { bsonType: 'date' }
      }
    }
  }
};

// Index definitions for each collection
const collectionIndexes = {
  groups: [
    { key: { type: 1, isActive: 1 }, name: 'type_isActive' },
    { key: { members: 1 }, name: 'members' },
    { key: { createdBy: 1 }, name: 'createdBy' },
    { key: { inviteCode: 1 }, name: 'inviteCode', unique: true, sparse: true },
    { key: { isActive: 1, deletedAt: 1 }, name: 'isActive_deletedAt' }
  ],
  groupmembers: [
    { key: { groupId: 1, userId: 1 }, name: 'groupId_userId', unique: true },
    { key: { userId: 1, lastActiveAt: -1 }, name: 'userId_lastActiveAt' }
  ],
  chatmessages: [
    { key: { groupId: 1, createdAt: -1 }, name: 'groupId_createdAt' },
    { key: { userId: 1, createdAt: -1 }, name: 'userId_createdAt' }
  ],
  sharedjobs: [
    { key: { groupId: 1, sharedAt: -1 }, name: 'groupId_sharedAt' },
    { key: { groupId: 1, company: 1 }, name: 'groupId_company' },
    { key: { groupId: 1, workType: 1 }, name: 'groupId_workType' },
    { key: { sharedBy: 1 }, name: 'sharedBy' },
    { key: { linkedinJobId: 1 }, name: 'linkedinJobId', sparse: true }
  ],
  comments: [
    { key: { sharedJobId: 1, createdAt: -1 }, name: 'sharedJobId_createdAt' },
    { key: { userId: 1 }, name: 'userId' }
  ]
};

// Validate environment variables
function validateEnvironment() {
  console.log('\n📋 Validating environment variables...\n');

  const required = ['MONGODB_URI'];
  const optional = ['MONGODB_CHAT_URI'];
  const errors = [];

  for (const varName of required) {
    if (!process.env[varName]) {
      errors.push(`Missing required environment variable: ${varName}`);
    } else {
      console.log(`  ✅ ${varName} is set`);
    }
  }

  for (const varName of optional) {
    if (process.env[varName]) {
      console.log(`  ✅ ${varName} is set`);
    } else {
      console.log(`  ⚠️  ${varName} not set (will use MONGODB_URI for all collections)`);
    }
  }

  if (errors.length > 0) {
    console.error('\n❌ Environment validation failed:');
    errors.forEach(e => console.error(`   - ${e}`));
    process.exit(1);
  }

  console.log('\n✅ Environment variables validated\n');
}

// Connect to MongoDB
async function connectToDatabase() {
  console.log('🔗 Connecting to databases...\n');

  const mainUri = process.env.MONGODB_URI;
  const chatUri = process.env.MONGODB_CHAT_URI || mainUri;

  try {
    // Main connection
    const mainConn = await mongoose.connect(mainUri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
    console.log(`  ✅ Production MongoDB connected: ${mainConn.connection.host}`);

    // Chat/Groups connection (may be same as main)
    let chatConn;
    if (chatUri === mainUri) {
      chatConn = mainConn.connection;
      console.log(`  ✅ Using production MongoDB for groups/chat`);
    } else {
      chatConn = await mongoose.createConnection(chatUri, {
        maxPoolSize: 5,
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000,
      }).asPromise();
      console.log(`  ✅ Local MongoDB connected: ${chatConn.host}`);
    }

    return { mainConn, chatConn };
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  }
}

// Check and create collection with schema validation
async function ensureCollection(db, collectionName, validator) {
  const collections = await db.listCollections({ name: collectionName }).toArray();

  if (collections.length === 0) {
    console.log(`  📦 Creating collection: ${collectionName}`);
    await db.createCollection(collectionName, {
      validator: validator,
      validationLevel: 'moderate', // Allows existing docs that don't match
      validationAction: 'warn' // Log warnings instead of rejecting
    });
    console.log(`     ✅ Created with schema validation`);
  } else {
    console.log(`  📦 Collection exists: ${collectionName}`);
    // Update validator on existing collection
    try {
      await db.command({
        collMod: collectionName,
        validator: validator,
        validationLevel: 'moderate',
        validationAction: 'warn'
      });
      console.log(`     ✅ Schema validation updated`);
    } catch (error) {
      console.log(`     ⚠️  Could not update validator: ${error.message}`);
    }
  }
}

// Create indexes for a collection
async function ensureIndexes(db, collectionName, indexes) {
  const collection = db.collection(collectionName);

  for (const indexDef of indexes) {
    try {
      await collection.createIndex(indexDef.key, {
        name: indexDef.name,
        unique: indexDef.unique || false,
        sparse: indexDef.sparse || false,
        background: true
      });
      console.log(`     ✅ Index: ${indexDef.name}`);
    } catch (error) {
      if (error.code === 85 || error.code === 86) {
        // Index already exists with different options - drop and recreate
        console.log(`     ⚠️  Index ${indexDef.name} exists with different options`);
      } else {
        console.log(`     ❌ Index ${indexDef.name} failed: ${error.message}`);
      }
    }
  }
}

// Initialize all collections
async function initializeCollections(chatConn) {
  console.log('\n📂 Initializing collections...\n');

  // Get the native MongoDB driver database object
  const db = chatConn.db ? chatConn.db : chatConn.connection.db;

  for (const [collectionName, validator] of Object.entries(schemaValidators)) {
    await ensureCollection(db, collectionName, validator);

    if (collectionIndexes[collectionName]) {
      await ensureIndexes(db, collectionName, collectionIndexes[collectionName]);
    }
  }

  console.log('\n✅ All collections initialized\n');
}

// Print summary
async function printSummary(chatConn) {
  console.log('📊 Database Summary:\n');

  const db = chatConn.db ? chatConn.db : chatConn.connection.db;
  const collections = await db.listCollections().toArray();

  console.log(`   Total collections: ${collections.length}`);
  console.log('   Collections:');

  for (const coll of collections) {
    const stats = await db.collection(coll.name).countDocuments();
    console.log(`     - ${coll.name}: ${stats} documents`);
  }
}

// Main execution
async function main() {
  console.log('╔════════════════════════════════════════════════╗');
  console.log('║       MongoDB Database Initialization          ║');
  console.log('║         JobsExt Group Features                 ║');
  console.log('╚════════════════════════════════════════════════╝');

  validateEnvironment();

  const { mainConn, chatConn } = await connectToDatabase();

  await initializeCollections(chatConn);

  await printSummary(chatConn);

  console.log('═'.repeat(50));
  console.log('✅ Database initialization complete!');
  console.log('═'.repeat(50));
  console.log('\nNext steps:');
  console.log('  1. Start your server: npm start');
  console.log('  2. Test group features in the extension');
  console.log('  3. For cloud migration, update MONGODB_CHAT_URI\n');

  // Close connections
  await mongoose.disconnect();
  if (chatConn !== mainConn.connection && chatConn.close) {
    await chatConn.close();
  }

  process.exit(0);
}

main().catch(error => {
  console.error('❌ Initialization failed:', error);
  process.exit(1);
});
