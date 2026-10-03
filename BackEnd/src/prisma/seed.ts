import {  Role } from '../generated/prisma/client.js';
import 'dotenv/config'
import { createPrismaClient } from './prisma.config.js';
import argon2 from 'argon2';
import { Redis } from 'ioredis';
import { categorySeeds, eventSeeds, productSeeds, type ProductSeed } from './seed-data.js';
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
    const categories=await Promise.all (categorySeeds.map((c)=>
        prisma.category.upsert({
            where:{slug:c.slug},
            update:{name:c.name,description:c.description},
            create:{
                slug:c.slug,
                description:c.description,
                name:c.name},})));
    console.log(`✅ Categories: ${categories.length}`);
    const categoryId = (slug: string) => categories.find((c) => c.slug === slug)!.id;

  // 4. Products with inventory (catalog data lives in seed-data.ts)
  // The storefront lists newest first, so stagger createdAt round-robin across
  // categories — otherwise "Latest releases" would be one category's wall.
  const releaseRank = interleaveByCategory(productSeeds);
  const seededAt = Date.now();
  for (const seed of productSeeds) {
    const images = seed.images.map((id, i) => ({ url: unsplash(id), alt: seed.name, position: i }));
    const fields = {
      name: seed.name,
      description: seed.description,
      price: seed.price,
      categoryId: categoryId(seed.categorySlug),
      isDropExclusive: seed.isDropExclusive ?? false,
      createdAt: new Date(seededAt - releaseRank.get(seed.slug)! * 60_000),
    };
    // Upsert wraps create + inventory in one call. If the product exists, we skip
    // inventory reset — you don't want re-seeding to reset stock during dev testing.
    // Images ARE replaced, so re-seeding picks up photo changes.
    await prisma.product.upsert({
      where: { slug: seed.slug },
      update: { ...fields, isActive: true, images: { deleteMany: {}, create: images } },
      create: {
        slug: seed.slug,
        ...fields,
        images: { create: images },
        inventory: {
          create: { totalStock: allocationFor(seed.slug, seed.stock), availableStock: seed.stock },
        },
      },
    });
  }
  console.log(`✅ Products: ${productSeeds.length}`);

  // 5. Flash events (weekly recurring sale windows, IST)
  for (const e of eventSeeds) {
    const fields = {
      title: e.title,
      tagline: e.tagline,
      image: unsplash(e.image),
      categoryId: categoryId(e.categorySlug),
      daysOfWeek: e.daysOfWeek,
      startTime: e.startTime,
      durationMinutes: e.durationMinutes,
      isActive: true,
    };
    await prisma.flashEvent.upsert({ where: { slug: e.slug }, update: fields, create: { slug: e.slug, ...fields } });
  }
  console.log(`✅ Flash events: ${eventSeeds.length}`);

  // 6. Retire products from the first seed that no longer have a matching photo.
  // Soft-delete (isActive=false) like the admin API — past orders reference them.
  const retired = await prisma.product.updateMany({
    where: { slug: { in: ['core-hoodie-black', 'dad-cap-black', 'crossbody-bag-olive'] } },
    data: { isActive: false, categoryId: categoryId('accessories') },
  });
  // Old categories are now empty — drop them so they don't show up as filter chips
  await prisma.category.deleteMany({
    where: { slug: { in: ['sneakers', 'apparel'] }, products: { none: {} } },
  });
  console.log(`✅ Retired ${retired.count} legacy products`);

  // 7. Product lists/details and event rules are cached in Redis — clear them
  // so the new catalog shows up immediately. Stock is synced to Redis on
  // server boot, so restart the backend after seeding to make new products
  // purchasable.
  if (process.env.REDIS_URL) {
    const redis = new Redis(process.env.REDIS_URL);
    try {
      const keys = [...(await redis.keys('products:*')), ...(await redis.keys('events:*'))];
      if (keys.length) await redis.del(...keys);
      console.log(`✅ Cleared ${keys.length} cached keys`);
    } catch (err) {
      console.warn('⚠️  Could not clear cache (entries expire within 5 min):', err);
    } finally {
      redis.disconnect();
    }
  }
}

/** slug → position when categories are taken in turn (0 = newest). */
function interleaveByCategory(seeds: ProductSeed[]) {
  const byCategory = new Map<string, ProductSeed[]>();
  for (const seed of seeds) byCategory.set(seed.categorySlug, [...(byCategory.get(seed.categorySlug) ?? []), seed]);
  const queues = [...byCategory.values()];
  const rank = new Map<string, number>();
  for (let i = 0; rank.size < seeds.length; i++) {
    for (const queue of queues) if (queue[i]) rank.set(queue[i].slug, rank.size);
  }
  return rank;
}

/**
 * Demo realism: each product's drop allocation (totalStock) is bigger than
 * what's left, so the storefront's "% claimed" bars aren't all empty on a
 * fresh database. Deterministic per slug, so re-runs agree.
 */
function allocationFor(slug: string, remaining: number) {
  let hash = 0;
  for (const ch of slug) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  if (remaining === 0) return 20 + (hash % 40); // sold out: whole allocation claimed
  const claimed = 0.1 + (hash % 70) / 100; // 10%–79% already claimed
  return Math.round(remaining / (1 - claimed));
}

function unsplash(photoId: string) {
  return `https://images.unsplash.com/photo-${photoId}?auto=format&fit=crop&w=1000&q=80`;
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
