import 'dotenv/config';
import connectDB from '../db/index.js';
import {
  User,
  Category,
  Product,
  DarkStore,
  Rider,
  StoreInventory,
} from '../models/index.js';

const seedDatabase = async () => {
  try {
    await connectDB();
    console.log('🔄 Connected to database for seeding...\n');

    // Clear existing data
    console.log('🧹 Clearing existing data...');
    await Promise.all([
      User.deleteMany({}),
      Category.deleteMany({}),
      Product.deleteMany({}),
      DarkStore.deleteMany({}),
      Rider.deleteMany({}),
      StoreInventory.deleteMany({}),
    ]);

    // Create Users
    console.log('👥 Creating users...');
    await User.create({
      name: 'System Admin',
      contactNumber: '9999999999',
      password: 'AdminPassword123',
      role: 'admin',
    });

    await User.insertMany([
      {
        name: 'Rahul Kumar',
        contactNumber: '9876543210',
        password: 'UserPassword123',
        addresses: [
          {
            label: 'Home',
            addressLine1: 'Plot 123, Sector 50',
            city: 'Gurugram',
            pincode: '122001',
            coordinates: [77.0425, 28.4089],
            isDefault: true,
          },
        ],
      },
      {
        name: 'Priya Singh',
        contactNumber: '9988776655',
        password: 'UserPassword123',
        addresses: [
          {
            label: 'Office',
            addressLine1: 'Tower A, Cyber City',
            city: 'Gurugram',
            pincode: '122002',
            coordinates: [77.0845, 28.4595],
            isDefault: true,
          },
        ],
      },
      {
        name: 'Amit Patel',
        contactNumber: '9123456789',
        password: 'UserPassword123',
        addresses: [
          {
            label: 'Home',
            addressLine1: 'Apt 456, DLF Phase 3',
            city: 'Gurugram',
            pincode: '122022',
            coordinates: [77.0891, 28.4159],
            isDefault: true,
          },
        ],
      },
    ]);

    console.log('   ✅ Created 1 admin + 3 test users');

    // Create Categories
    console.log('📁 Creating categories...');
    const categories = await Category.insertMany([
      {
        name: 'Milk & Dairy',
        image: 'https://via.placeholder.com/200?text=Dairy',
        description: 'Fresh milk and dairy products',
      },
      {
        name: 'Bakery & Bread',
        image: 'https://via.placeholder.com/200?text=Bakery',
        description: 'Fresh baked goods',
      },
      {
        name: 'Fruits & Vegetables',
        image: 'https://via.placeholder.com/200?text=Fresh',
        description: 'Fresh produce delivered daily',
      },
      {
        name: 'Snacks & Beverages',
        image: 'https://via.placeholder.com/200?text=Snacks',
        description: 'Chips, chocolates, and drinks',
      },
    ]);
    console.log('   ✅ Created 4 categories');

    // Create Dark Stores
    console.log('🏪 Creating dark stores...');
    const stores = await DarkStore.insertMany([
      {
        name: 'GGN Sector 50 Hub',
        address: 'Sector 50, Gurugram',
        location: {
          type: 'Point',
          coordinates: [77.04, 28.41],
        },
        serviceRadius: 10,
      },
      {
        name: 'GGN Cyber City Hub',
        address: 'Cyber City, Gurugram',
        location: {
          type: 'Point',
          coordinates: [77.09, 28.46],
        },
        serviceRadius: 8,
      },
      {
        name: 'DLF Phase 3 Hub',
        address: 'DLF Phase 3, Gurugram',
        location: {
          type: 'Point',
          coordinates: [77.09, 28.42],
        },
        serviceRadius: 7,
      },
    ]);
    console.log('   ✅ Created 3 dark stores');

    // Create Products
    console.log('📦 Creating products...');
    const products = await Product.insertMany([
      // Dairy Products
      {
        name: 'Amul Toned Milk 500ml',
        description: 'Fresh toned milk from Amul',
        price: 28,
        unit: '500ml',
        image: 'https://via.placeholder.com/200?text=Milk',
        category: categories[0]._id,
      },
      {
        name: 'Paneer 200g',
        description: 'Fresh cottage cheese',
        price: 80,
        unit: '200g',
        image: 'https://via.placeholder.com/200?text=Paneer',
        category: categories[0]._id,
      },
      {
        name: 'Yogurt 500g',
        description: 'Creamy Greek yogurt',
        price: 60,
        unit: '500g',
        image: 'https://via.placeholder.com/200?text=Yogurt',
        category: categories[0]._id,
      },
      // Bakery
      {
        name: 'Wheat Bread 400g',
        description: 'Whole wheat bread',
        price: 40,
        unit: '400g',
        image: 'https://via.placeholder.com/200?text=Bread',
        category: categories[1]._id,
      },
      {
        name: 'Croissant',
        description: 'Butter croissant',
        price: 50,
        unit: '1 pc',
        image: 'https://via.placeholder.com/200?text=Croissant',
        category: categories[1]._id,
      },
      // Fruits & Vegetables
      {
        name: 'Apple (Red) 6 Pc',
        description: 'Fresh red apples',
        price: 90,
        unit: '6 pc',
        image: 'https://via.placeholder.com/200?text=Apple',
        category: categories[2]._id,
      },
      {
        name: 'Spinach Bundle 500g',
        description: 'Fresh green spinach',
        price: 35,
        unit: '500g',
        image: 'https://via.placeholder.com/200?text=Spinach',
        category: categories[2]._id,
      },
      // Snacks & Beverages
      {
        name: "Lay's Classic 45g",
        description: 'Classic salted potato chips',
        price: 20,
        unit: '45g',
        image: 'https://via.placeholder.com/200?text=Lays',
        category: categories[3]._id,
      },
      {
        name: 'Coca Cola 250ml',
        description: 'Cold cola drink',
        price: 25,
        unit: '250ml',
        image: 'https://via.placeholder.com/200?text=CocaCola',
        category: categories[3]._id,
      },
    ]);
    console.log('   ✅ Created 9 products');

    // Create Inventory for stores
    console.log('📊 Creating store inventory...');
    const inventoryData = [];

    // Store 1 - all products
    stores.forEach((store) => {
      products.forEach((product) => {
        inventoryData.push({
          storeId: store._id,
          productId: product._id,
          stock: 50 + Math.random() * 150,
          price: product.price,
        });
      });
    });

    await StoreInventory.insertMany(inventoryData);
    console.log('   ✅ Created inventory for all stores');

    // Create Riders
    console.log('🚗 Creating riders...');
    await Rider.insertMany([
      {
        name: 'Rahul Delivery',
        phone: '8888877777',
        password: 'RiderPassword123',
        store: stores[0]._id,
        status: 'offline',
      },
      {
        name: 'Priya Express',
        phone: '8888877778',
        password: 'RiderPassword123',
        store: stores[0]._id,
        status: 'offline',
      },
      {
        name: 'Amit Fast',
        phone: '8888877779',
        password: 'RiderPassword123',
        store: stores[1]._id,
        status: 'offline',
      },
      {
        name: 'Deepak Speed',
        phone: '8888877780',
        password: 'RiderPassword123',
        store: stores[2]._id,
        status: 'offline',
      },
    ]);
    console.log('   ✅ Created 4 riders');

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('✅ Database seeded successfully!');
    console.log('='.repeat(50));
    console.log(`📊 Summary:
  • Users: 1 admin + 3 customers (total: 4)
  • Categories: 4
  • Products: 9
  • Dark Stores: 3
  • Store Inventories: ${inventoryData.length}
  • Riders: 4`);
    console.log('='.repeat(50));
    console.log('\n📝 Test Credentials:');
    console.log('   Admin:    9999999999 / AdminPassword123');
    console.log('   User 1:   9876543210 / UserPassword123');
    console.log('   User 2:   9988776655 / UserPassword123');
    console.log('   User 3:   9123456789 / UserPassword123');
    console.log('   Rider 1:  8888877777 / RiderPassword123');
    console.log('   Rider 2:  8888877778 / RiderPassword123');
    console.log('   Rider 3:  8888877779 / RiderPassword123');
    console.log('   Rider 4:  8888877780 / RiderPassword123');
    console.log('='.repeat(50) + '\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error.message);
    process.exit(1);
  }
};

seedDatabase();
