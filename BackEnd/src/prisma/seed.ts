import {  Role } from '@prisma/client';
import 'dotenv/config'
import { createPrismaClient } from './prisma.config.js';
import argon2 from 'argon2';
import { faker } from '@faker-js/faker';
const prisma= createPrismaClient();

async function main(){
  // Idempotency: all operations use upsert so seed can be re-run safely.
  // Never truncate — you'd lose local data you might be inspecting
    
  // 1. Admin user
  const adminPassword=await argon2.hash('admin_dev_password_change_me',
                                        {type:argon2.argon2id});
  const admin=await prisma.user.upsert({
    where:{email:'admin@rushly.local'},
    update:{},
    create:{
        email:'admin@rushly.local',
        passwordHash:adminPassword,
        name:'Admin User',
        role:Role.ADMIN
    },
  });
  console.log('✅ Admin user:', admin.email);

// 2. A test customer
    const customerPassword=await argon2.hash('customer_dev_password_change_me',
                                            {type:argon2.argon2id,});
    const customer=await prisma.user.upsert({
        where:{email:'customer@rushly.local'},
        update:{},
        create:{
            email:'customer@rushly.local',
            passwordHash:customerPassword,
            name:'Test Customer',
            role:Role.CUSTOMER
        },
    });
     console.log('✅ Customer user:', customer.email);    

 // 3. Categories
    const demoCategories=[
      { slug: 'sneakers', name: 'Sneakers', description: 'Limited-drop sneakers' },
      { slug: 'apparel', name: 'Apparel', description: 'Streetwear tops and hoodies' },
      { slug: 'accessories', name: 'Accessories', description: 'Bags, caps, small goods' },
    ]
    const categories=await Promise.all (demoCategories.map((c)=>
        prisma.category.upsert({
            where:{slug:c.slug},
            update:{},
            create:{
                slug:c.slug,
                description:c.description,
                name:c.name},})));
    console.log(`✅ Categories: ${categories.length}`);
    // 4. Products with inventory (one transaction per product for atomicity)
    const productSeeds = [
    { slug: 'phantom-runner-og', name: 'Phantom Runner OG', price: 12999, stock: 100, categorySlug: 'sneakers' },
    { slug: 'phantom-runner-black', name: 'Phantom Runner Black', price: 12999, stock: 50, categorySlug: 'sneakers' },
    { slug: 'core-hoodie-heather', name: 'Core Hoodie Heather', price: 4999, stock: 200, categorySlug: 'apparel' },
    { slug: 'core-hoodie-black', name: 'Core Hoodie Black', price: 4999, stock: 200, categorySlug: 'apparel' },
    { slug: 'boxlogo-tee-white', name: 'Box Logo Tee White', price: 2499, stock: 500, categorySlug: 'apparel' },
    { slug: 'dad-cap-black', name: 'Dad Cap Black', price: 1499, stock: 300, categorySlug: 'accessories' },
    { slug: 'crossbody-bag-olive', name: 'Crossbody Bag Olive', price: 3999, stock: 75, categorySlug: 'accessories' },
    { slug: 'drop-tee-limited', name: 'Drop Tee Limited', price: 3499, stock: 10, categorySlug: 'apparel' }, // low stock — good for testing oversell
  ];
  // Updating Products and Categories atomically
   for (const seed of productSeeds) {
    const category = categories.find((c) => c.slug === seed.categorySlug)!;
    // Upsert wraps create + inventory in one call. If the product exists, we skip
    // inventory reset — you don't want re-seeding to reset stock during dev testing.
    const product = await prisma.product.upsert({
      where: { slug: seed.slug },
      update: { name: seed.name, price: seed.price, categoryId: category.id },
      create: {
        slug: seed.slug,
        name: seed.name,
        description: faker.commerce.productDescription(),
        price: seed.price,
        categoryId: category.id,
        images: {
          create: [
            { url: `https://picsum.photos/seed/${seed.slug}-1/600/600`, position: 0 },
            { url: `https://picsum.photos/seed/${seed.slug}-2/600/600`, position: 1 },
          ],
        },
        inventory: {
          create: { totalStock: seed.stock, availableStock: seed.stock },
        },
      },
    });
    console.log(`✅ Product: ${product.slug} (stock: ${seed.stock})`);
  }
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
