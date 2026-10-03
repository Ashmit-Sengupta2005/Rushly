import {  Role } from '../generated/prisma/client.js';
import 'dotenv/config'
import { createPrismaClient } from './prisma.config.js';
import argon2 from 'argon2';
import { Redis } from 'ioredis';
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

 // 3. Categories — slugs must match the event schedule in FrontEnd/src/features/events/events.ts
    const demoCategories=[
      { slug: 'shoes', name: 'Shoes', description: 'Runners, court classics and limited sneaker drops' },
      { slug: 't-shirts', name: 'T-Shirts', description: 'Heavyweight basics and graphic tees' },
      { slug: 'hoodies', name: 'Hoodies & Jackets', description: 'Hoodies, sweatshirts and outerwear' },
      { slug: 'accessories', name: 'Accessories', description: 'Caps, bags, eyewear and small goods' },
      { slug: 'goodies', name: 'Goodies', description: 'Mugs, totes, stickers and desk merch' },
      { slug: 'tech', name: 'Tech', description: 'Audio, wearables and gear' },
    ]
    const categories=await Promise.all (demoCategories.map((c)=>
        prisma.category.upsert({
            where:{slug:c.slug},
            update:{name:c.name,description:c.description},
            create:{
                slug:c.slug,
                description:c.description,
                name:c.name},})));
    console.log(`✅ Categories: ${categories.length}`);
    // 4. Products with inventory. Prices in paise (₹12,999 → 1299900).
    // Images are Unsplash photo ids; a few products get a second gallery shot.
    const productSeeds: ProductSeed[] = [
    // Shoes
    { slug: 'phantom-runner-og', name: 'Phantom Runner OG', price: 1299900, stock: 40, categorySlug: 'shoes', images: ['1542291026-7eec264c27ff'],
      description: 'Our signature knit runner in crimson. A sock-like upper hugs the foot while the springy foam midsole keeps every stride light — built for long city miles.' },
    { slug: 'phantom-runner-black', name: 'Phantom Runner Stealth', price: 1299900, stock: 8, categorySlug: 'shoes', images: ['1491553895911-0055eca6402d'],
      description: 'The Phantom Runner, blacked out. Engineered mesh, a sculpted heel counter and a volt pull-tab for a little attitude.' },
    { slug: 'triple-white-court', name: 'Triple White Court', price: 949900, stock: 60, categorySlug: 'shoes', images: ['1600269452121-4f2416e55c28'],
      description: 'The all-white court classic every rotation needs. Full-grain leather upper, perforated toe box and a cupsole that only gets better with wear.' },
    { slug: 'wheat-leather-court', name: 'Wheat Leather Court', price: 1149900, stock: 18, categorySlug: 'shoes', images: ['1549298916-b41d501d3772'],
      description: 'Rich wheat nubuck on a gum-tone sole. A seasonal colourway that pairs with denim, cargos and everything in between.' },
    { slug: 'chicago-high-top', name: 'Chicago High-Top', price: 1699900, stock: 5, categorySlug: 'shoes', images: ['1597045566677-8cf032ed6634'],
      description: 'Heritage high-top in the colour-block that started it all. Padded ankle collar, leather overlays and a limited allocation per drop.' },
    { slug: 'peach-dunk-low', name: 'Peach Cream Low', price: 1049900, stock: 22, categorySlug: 'shoes', images: ['1584735175315-9d5df23860e6'],
      description: 'Soft peach and sky-blue panels on a cream base. A low-top skate silhouette with a padded tongue for all-day comfort.' },
    { slug: 'pastel-platform', name: 'Pastel Shadow Platform', price: 899900, stock: 30, categorySlug: 'shoes', images: ['1595950653106-6c9ebd614d3a'],
      description: 'Layered pastel overlays and a stacked platform sole. Adds a little height and a lot of colour.' },
    { slug: 'sunset-air-runner', name: 'Sunset Air Runner', price: 1249900, stock: 25, categorySlug: 'shoes', images: ['1600185365926-3a2ce3cdb9eb'],
      description: 'Visible air cushioning with a sunset-orange gradient. Retro running DNA, modern comfort.' },
    { slug: 'volt-trainer', name: 'Volt Trainer', price: 799900, stock: 45, categorySlug: 'shoes', images: ['1606107557195-0e29a4b5b4aa'],
      description: 'A stable, grippy trainer for the gym floor. Wide base, flexible forefoot and a volt upper you will not lose in the locker room.' },
    { slug: 'blush-retro-runner', name: 'Blush Retro Runner', price: 999900, stock: 14, categorySlug: 'shoes', images: ['1551107696-a4b0c5a0d9a2'],
      description: "A '90s-inspired runner in blush suede and mesh with a chunky, lightweight sole." },
    { slug: 'cloud-chunky-trainer', name: 'Cloud Chunky Trainer', price: 1399900, stock: 0, categorySlug: 'shoes', images: ['1560769629-975ec94e6a86'],
      description: 'Our boldest silhouette yet — layered panels, splashes of coral and teal, and a sculpted chunky sole. Sold out in the last drop; restocks are announced on the Events page.' },
    { slug: 'maroon-skate-classic', name: 'Maroon Skate Classic', price: 549900, stock: 70, categorySlug: 'shoes', images: ['1525966222134-fcfa99b8ae77'],
      description: 'Canvas-and-suede skate shoe with the iconic side stripe and a waffle grip outsole.' },
    { slug: 'clean-court-white', name: 'Clean Court White', price: 699900, stock: 55, categorySlug: 'shoes', images: ['1608231387042-66d1773070a5'],
      description: 'Minimal tennis-inspired low-top in perforated white leather. No fuss, all clean lines.' },

    // T-Shirts
    { slug: 'boxlogo-tee-white', name: 'Essential Crew Tee — White', price: 129900, stock: 300, categorySlug: 't-shirts', images: ['1521572163474-6864f9cf17ab', '1586790170083-2f9ceadc732d'],
      description: '220 GSM combed cotton with a ribbed crew neck and a relaxed, boxy fit. The white tee you will wear on repeat.' },
    { slug: 'drop-tee-limited', name: 'Rushly 705 Badge Tee', price: 179900, stock: 10, categorySlug: 't-shirts', images: ['1618354691373-d851c5c3a990'], // low stock — good for testing oversell
      description: 'Drop-exclusive black tee with the 705 chest badge. Only a handful made — once they go, they go.' },
    { slug: 'skeleton-peace-tee', name: 'Skeleton Peace Tee', price: 149900, stock: 80, categorySlug: 't-shirts', images: ['1503341504253-dff4815485f1'],
      description: 'Screen-printed bone-hand peace sign on a washed black tee. Soft hand-feel, slightly oversized.' },
    { slug: 'lucky-cat-tee', name: 'Lucky Cat Graphic Tee', price: 159900, stock: 35, categorySlug: 't-shirts', images: ['1576566588028-4147f3842f27'],
      description: 'Bold cobalt maneki-neko print on an off-white base. Good fortune, sold separately.' },
    { slug: 'hotel-embroidered-tee', name: '(Hotel) Embroidered Tee', price: 139900, stock: 60, categorySlug: 't-shirts', images: ['1529374255404-311a2a4f1fd9'],
      description: 'Tonal chest embroidery on a crisp white tee. Quiet branding for loud days.' },
    { slug: 'script-logo-tee', name: 'Script Logo Tee — Black', price: 149900, stock: 90, categorySlug: 't-shirts', images: ['1583743814966-8936f5b7be1a'],
      description: 'Spaced-out chest script in white on a heavyweight black tee.' },
    { slug: 'oversized-tee-ash', name: 'Oversized Tee — Ash', price: 119900, stock: 120, categorySlug: 't-shirts', images: ['1622445275463-afa2ab738c34'],
      description: 'Dropped shoulders, longer body and a light ash colourway. Made for warm afternoons.' },
    { slug: 'summer-linen-tee', name: 'Summer Linen-Blend Tee', price: 169900, stock: 40, categorySlug: 't-shirts', images: ['1618677603286-0ec56cb6e1b5'],
      description: 'Breathable linen-cotton blend with a relaxed drape — the holiday tee.' },
    { slug: 'essentials-tee-3-pack', name: 'Essentials Tee 3-Pack', price: 299900, stock: 25, categorySlug: 't-shirts', images: ['1562157873-818bc0726f68'],
      description: 'Three everyday crew tees in rotating core colours. Stock up and save the morning decision.' },

    // Hoodies & Jackets
    { slug: 'core-hoodie-heather', name: 'Core Hoodie — Heather', price: 349900, stock: 80, categorySlug: 'hoodies', images: ['1556821840-3a63f95609a7'],
      description: '400 GSM brushed fleece, double-lined hood and a kangaroo pocket. Heather grey that goes with everything.' },
    { slug: 'signal-orange-hoodie', name: 'Signal Orange Hoodie', price: 379900, stock: 6, categorySlug: 'hoodies', images: ['1509942774463-acf339cf87d5'],
      description: 'High-visibility orange in our heaviest fleece. Impossible to miss, impossible to take off.' },
    { slug: 'sand-oversized-hoodie', name: 'Sand Oversized Hoodie', price: 399900, stock: 35, categorySlug: 'hoodies', images: ['1564557287817-3785e38ec1f5'],
      description: 'An oversized fit in a muted sand tone with dropped shoulders and ribbed cuffs.' },
    { slug: 'tangerine-crewneck', name: 'Tangerine Crewneck', price: 289900, stock: 40, categorySlug: 'hoodies', images: ['1578587018452-892bacefd3f2'],
      description: 'A cosy crewneck sweatshirt in a warm tangerine. Loopback cotton, relaxed fit.' },
    { slug: 'cloud-white-sweatshirt', name: 'Cloud White Sweatshirt', price: 269900, stock: 50, categorySlug: 'hoodies', images: ['1620799140408-edc6dcb6d633'],
      description: 'Clean, bright white crewneck with a soft brushed interior. Layer it or wear it solo.' },
    { slug: 'moto-leather-jacket', name: 'Moto Leather Jacket', price: 1299900, stock: 7, categorySlug: 'hoodies', images: ['1551028719-00167b16eac5'],
      description: 'Classic asymmetric-zip biker jacket in buttery black leather with silver hardware.' },
    { slug: 'rust-bomber-jacket', name: 'Rust Bomber Jacket', price: 549900, stock: 20, categorySlug: 'hoodies', images: ['1591047139829-d91aecb6caea'],
      description: 'Lightweight bomber in a rust satin finish with a ribbed collar and utility sleeve pocket.' },
    { slug: 'sherpa-denim-jacket', name: 'Sherpa-Collar Denim Jacket', price: 699900, stock: 15, categorySlug: 'hoodies', images: ['1611312449408-fcece27cdbb7'],
      description: 'Rigid indigo denim with a corduroy collar and warm lining. A forever jacket.' },

    // Accessories
    { slug: 'navy-daypack', name: 'Navy Commuter Daypack', price: 349900, stock: 45, categorySlug: 'accessories', images: ['1553062407-98eeb64c6a62'],
      description: 'Water-resistant 22L backpack with a padded laptop sleeve and hidden back pocket.' },
    { slug: 'grey-trucker-cap', name: 'Grey Trucker Cap', price: 129900, stock: 60, categorySlug: 'accessories', images: ['1556306535-0f09a537f0a3'],
      description: 'Structured heather-grey trucker with a woven box patch and snapback closure.' },
    { slug: 'white-mesh-trucker', name: 'White Mesh Trucker', price: 99900, stock: 75, categorySlug: 'accessories', images: ['1588850561407-ed78c282e89b'],
      description: 'An all-white mesh-back trucker cap. Breathable, adjustable, summer-ready.' },
    { slug: 'sand-dad-cap', name: 'Sand Dad Cap', price: 89900, stock: 9, categorySlug: 'accessories', images: ['1575428652377-a2d80e2277fc'],
      description: 'Unstructured washed-cotton cap with a small embroidered motif and a brass buckle strap.' },
    { slug: 'wayfarer-sunglasses', name: 'Classic Wayfarer Sunglasses', price: 249900, stock: 30, categorySlug: 'accessories', images: ['1572635196237-14b3f281503f'],
      description: 'Glossy black acetate frames with UV400 polarised lenses.' },
    { slug: 'browline-sunglasses', name: 'Browline Sunglasses', price: 279900, stock: 20, categorySlug: 'accessories', images: ['1589782182703-2aaa69037b5b'],
      description: 'Retro browline frames with a metal rim and dark green lenses.' },
    { slug: 'leather-bifold-wallet', name: 'Leather Bifold Wallet', price: 149900, stock: 50, categorySlug: 'accessories', images: ['1627123424574-724758594e93'],
      description: 'Full-grain leather bifold with six card slots. Develops a rich patina over time.' },
    { slug: 'pearl-pendant-necklace', name: 'Pearl Pendant Necklace', price: 189900, stock: 12, categorySlug: 'accessories', images: ['1611085583191-a3b181a88401'],
      description: 'A single freshwater pearl on a fine 18K gold-plated chain.' },

    // Goodies
    { slug: 'rushly-ceramic-mug', name: 'Rushly Ceramic Mug', price: 49900, stock: 150, categorySlug: 'goodies', images: ['1514228742587-6b1558fcca3d'],
      description: 'A 350 ml matte-glaze mug for your morning chai. Dishwasher and microwave safe.' },
    { slug: 'dotted-notes-journal', name: 'Dotted Notes Journal', price: 39900, stock: 120, categorySlug: 'goodies', images: ['1517842645767-c639042777db'],
      description: 'A5 lay-flat journal with 160 pages of 100 GSM dotted paper.' },
    { slug: 'kraft-canvas-tote', name: 'Kraft Canvas Tote', price: 59900, stock: 90, categorySlug: 'goodies', images: ['1544816155-12df9643f363'],
      description: 'Heavy cotton-canvas tote with long handles. Fits a laptop, groceries or both.' },
    { slug: 'street-sticker-pack', name: 'Street Sticker Pack', price: 29900, stock: 400, categorySlug: 'goodies', images: ['1572375992501-4b0892d50c69'],
      description: '25 weatherproof vinyl stickers for laptops, bottles and skateboards. Every pack is a little different.' },
    { slug: 'sage-steel-bottle', name: 'Sage Steel Bottle', price: 99900, stock: 70, categorySlug: 'goodies', images: ['1602143407151-7111542de6e8'],
      description: 'Double-walled 750 ml bottle — cold for 24 hours, hot for 12. Powder-coated sage finish.' },
    { slug: 'lips-crew-socks', name: 'Lips Print Crew Socks', price: 34900, stock: 200, categorySlug: 'goodies', images: ['1586350977771-b3b0abd50c82'],
      description: 'Combed-cotton crew socks with an all-over lips print. Cushioned sole.' },
    { slug: 'ribbed-beanie', name: 'Ribbed Knit Beanie', price: 69900, stock: 4, categorySlug: 'goodies', images: ['1576871337632-b9aef4c17ab9'],
      description: 'Chunky rib-knit beanie with a woven label. Assorted winter colours.' },

    // Tech
    { slug: 'studio-wireless-headphones', name: 'Studio Wireless Headphones', price: 1499900, stock: 16, categorySlug: 'tech', images: ['1505740420928-5e560c06d30e'],
      description: 'Over-ear headphones with active noise cancelling, 40-hour battery and plush memory-foam cushions.' },
    { slug: 'pulse-smartwatch', name: 'Pulse Smartwatch', price: 1899900, stock: 10, categorySlug: 'tech', images: ['1546868871-7041f2a55e12'],
      description: 'Always-on display, heart-rate and SpO2 tracking, and up to 7 days of battery.' },
    { slug: 'minimal-white-watch', name: 'Minimal White Watch', price: 599900, stock: 25, categorySlug: 'tech', images: ['1523275335684-37898b6baf30'],
      description: 'A clean black dial on a white silicone strap. Quartz movement, 5 ATM water resistance.' },
    { slug: 'pocket-bass-speaker', name: 'Pocket Bass Speaker', price: 899900, stock: 30, categorySlug: 'tech', images: ['1608043152269-423dbba4e7e1'],
      description: 'IP67 waterproof Bluetooth speaker with punchy bass and 12 hours of playback.' },
    { slug: 'arctic-white-controller', name: 'Arctic White Controller', price: 549900, stock: 20, categorySlug: 'tech', images: ['1600080972464-8e5f35f63d08'],
      description: 'Wireless gamepad with textured grips, hybrid D-pad and USB-C. Works with PC and console.' },
  ];
  for (const seed of productSeeds) {
    const category = categories.find((c) => c.slug === seed.categorySlug)!;
    const images = seed.images.map((id, i) => ({ url: unsplash(id), alt: seed.name, position: i }));
    // Upsert wraps create + inventory in one call. If the product exists, we skip
    // inventory reset — you don't want re-seeding to reset stock during dev testing.
    // Images ARE replaced, so re-seeding upgrades old placeholder images.
    const product = await prisma.product.upsert({
      where: { slug: seed.slug },
      update: {
        name: seed.name,
        description: seed.description,
        price: seed.price,
        categoryId: category.id,
        isActive: true,
        images: { deleteMany: {}, create: images },
      },
      create: {
        slug: seed.slug,
        name: seed.name,
        description: seed.description,
        price: seed.price,
        categoryId: category.id,
        images: { create: images },
        inventory: {
          create: { totalStock: seed.stock, availableStock: seed.stock },
        },
      },
    });
    console.log(`✅ Product: ${product.slug} (stock: ${seed.stock})`);
  }

  // 5. Retire products from the old seed that no longer have a matching photo.
  // Soft-delete (isActive=false) like the admin API — past orders reference them.
  const accessories = categories.find((c) => c.slug === 'accessories')!;
  const retired = await prisma.product.updateMany({
    where: { slug: { in: ['core-hoodie-black', 'dad-cap-black', 'crossbody-bag-olive'] } },
    data: { isActive: false, categoryId: accessories.id },
  });
  // Old categories are now empty — drop them so they don't show up as filter chips
  await prisma.category.deleteMany({
    where: { slug: { in: ['sneakers', 'apparel'] }, products: { none: {} } },
  });
  console.log(`✅ Retired ${retired.count} legacy products`);

  // 6. Product lists/details are cached in Redis — clear them so the new
  // catalog shows up immediately. Stock is synced to Redis on server boot,
  // so restart the backend after seeding to make new products purchasable.
  if (process.env.REDIS_URL) {
    const redis = new Redis(process.env.REDIS_URL);
    try {
      const keys = await redis.keys('products:*');
      if (keys.length) await redis.del(...keys);
      console.log(`✅ Cleared ${keys.length} cached product keys`);
    } catch (err) {
      console.warn('⚠️  Could not clear product cache (it expires within 5 min):', err);
    } finally {
      redis.disconnect();
    }
  }
}

interface ProductSeed {
  slug: string;
  name: string;
  description: string;
  price: number; // paise
  stock: number;
  categorySlug: string;
  images: string[]; // Unsplash photo ids
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
