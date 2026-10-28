import { copyFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { extname, join } from 'node:path';
import { hashPassword } from '../common/utils/password.js';
import { slugify } from '../common/utils/slugify.js';
import { Category } from '../menu/entities/category.entity.js';
import { OptionGroup } from '../menu/entities/option-group.entity.js';
import { Option } from '../menu/entities/option.entity.js';
import { Product } from '../menu/entities/product.entity.js';
import { Store } from '../stores/entities/store.entity.js';
import { UPLOADS_DIR } from '../uploads/image-upload.js';
import { UserRole } from '../users/entities/user-role.enum.js';
import { User } from '../users/entities/user.entity.js';
import dataSource from './data-source.js';

/**
 * Sample data for development. Safe to run again: users are skipped if the email
 * exists, stores/menu only if their tables are empty.
 * Run with `npm run seed` (after `npm run migration:run`).
 */

const DEMO_PASSWORD = 'Password@123';

const image = (seed: string) =>
  `https://picsum.photos/seed/brew-${seed}/600/600`;

const SIZE = {
  name: 'Size',
  minSelect: 1,
  maxSelect: 1,
  options: [
    { name: 'S', priceDelta: 0 },
    { name: 'M', priceDelta: 6_000 },
    { name: 'L', priceDelta: 10_000 },
  ],
};
const SUGAR = {
  name: 'Đường',
  minSelect: 1,
  maxSelect: 1,
  options: [
    { name: '100%', priceDelta: 0 },
    { name: '70%', priceDelta: 0 },
    { name: '50%', priceDelta: 0 },
    { name: 'Không đường', priceDelta: 0 },
  ],
};
const TOPPING = {
  name: 'Topping',
  minSelect: 0,
  maxSelect: 3,
  options: [
    { name: 'Trân châu đen', priceDelta: 8_000 },
    { name: 'Thạch cà phê', priceDelta: 8_000 },
    { name: 'Kem cheese', priceDelta: 12_000 },
  ],
};

type GroupSeed = typeof SIZE;
type ProductSeed = {
  name: string;
  description: string;
  basePrice: number;
  groups: GroupSeed[];
};

const MENU: { name: string; products: ProductSeed[] }[] = [
  {
    name: 'Cà phê',
    products: [
      {
        name: 'Cà phê sữa đá',
        description: 'Robusta pha phin, sữa đặc.',
        basePrice: 29_000,
        groups: [SIZE, SUGAR],
      },
      {
        name: 'Bạc xỉu',
        description: 'Nhiều sữa, ít cà phê.',
        basePrice: 35_000,
        groups: [SIZE, SUGAR],
      },
      {
        name: 'Americano',
        description: 'Espresso pha loãng.',
        basePrice: 39_000,
        groups: [SIZE],
      },
      {
        name: 'Latte',
        description: 'Espresso và sữa tươi đánh nóng.',
        basePrice: 49_000,
        groups: [SIZE, SUGAR],
      },
    ],
  },
  {
    name: 'Trà',
    products: [
      {
        name: 'Trà đào cam sả',
        description: 'Trà đen, đào miếng, cam, sả.',
        basePrice: 45_000,
        groups: [SIZE, SUGAR, TOPPING],
      },
      {
        name: 'Trà sữa trân châu',
        description: 'Trà đen, sữa, trân châu đen.',
        basePrice: 42_000,
        groups: [SIZE, SUGAR, TOPPING],
      },
      {
        name: 'Trà vải',
        description: 'Trà xanh nhài, vải thiều.',
        basePrice: 45_000,
        groups: [SIZE, SUGAR],
      },
    ],
  },
  {
    name: 'Đá xay',
    products: [
      {
        name: 'Cookie đá xay',
        description: 'Bánh quy socola xay cùng sữa và kem.',
        basePrice: 55_000,
        groups: [SIZE],
      },
      {
        name: 'Matcha đá xay',
        description: 'Matcha Nhật, sữa, kem tươi.',
        basePrice: 59_000,
        groups: [SIZE],
      },
    ],
  },
  {
    name: 'Bánh',
    products: [
      {
        name: 'Croissant bơ',
        description: 'Nướng mới mỗi sáng.',
        basePrice: 35_000,
        groups: [],
      },
      {
        name: 'Tiramisu',
        description: 'Mascarpone, cà phê, cacao.',
        basePrice: 45_000,
        groups: [],
      },
    ],
  },
];

const DAILY = { open: '07:00', close: '22:00' };
const STORES = [
  {
    name: 'Brew Nguyễn Huệ',
    address: '42 Nguyễn Huệ, Bến Nghé, Quận 1, TP.HCM',
    latitude: 10.7739,
    longitude: 106.7036,
    phone: '028 3822 0001',
  },
  {
    name: 'Brew Thảo Điền',
    address: '12 Quốc Hương, Thảo Điền, TP. Thủ Đức, TP.HCM',
    latitude: 10.8032,
    longitude: 106.7335,
    phone: '028 3822 0002',
  },
];

async function seedUsers() {
  const users = dataSource.getRepository(User);
  const accounts = [
    {
      email: (process.env.SEED_ADMIN_EMAIL ?? 'admin@brew.local').toLowerCase(),
      password: process.env.SEED_ADMIN_PASSWORD ?? 'Admin@12345',
      fullName: 'Brew Admin',
      role: UserRole.Admin,
    },
    {
      email: 'staff@brew.local',
      password: DEMO_PASSWORD,
      fullName: 'Nhân viên Brew',
      role: UserRole.Staff,
    },
    {
      email: 'customer@brew.local',
      password: DEMO_PASSWORD,
      fullName: 'Khách hàng Demo',
      role: UserRole.Customer,
    },
  ];
  for (const account of accounts) {
    if (await users.existsBy({ email: account.email })) {
      console.log(`  skip user ${account.email} (exists)`);
      continue;
    }
    await users.save(
      users.create({
        email: account.email,
        passwordHash: await hashPassword(account.password),
        fullName: account.fullName,
        role: account.role,
      }),
    );
    console.log(
      `  user ${account.email} / ${account.password} (${account.role})`,
    );
  }
}

async function seedStores() {
  const stores = dataSource.getRepository(Store);
  if (await stores.count()) return console.log('  skip stores (not empty)');
  await stores.save(
    STORES.map((s, i) =>
      stores.create({
        ...s,
        imageUrl: image(`store-${i}`),
        openingHours: {
          mon: DAILY,
          tue: DAILY,
          wed: DAILY,
          thu: DAILY,
          fri: DAILY,
          sat: DAILY,
          sun: DAILY,
        },
      }),
    ),
  );
  console.log(`  ${STORES.length} stores`);
}

async function seedMenu() {
  if (await dataSource.getRepository(Category).count()) {
    return console.log('  skip menu (not empty)');
  }
  await dataSource.transaction(async (manager) => {
    let productCount = 0;
    for (const [ci, categorySeed] of MENU.entries()) {
      const category = await manager.save(
        manager.create(Category, {
          name: categorySeed.name,
          slug: slugify(categorySeed.name),
          imageUrl: image(slugify(categorySeed.name)),
          sortOrder: ci,
        }),
      );
      for (const [pi, p] of categorySeed.products.entries()) {
        const product = await manager.save(
          manager.create(Product, {
            categoryId: category.id,
            name: p.name,
            description: p.description,
            basePrice: p.basePrice,
            imageUrl: image(slugify(p.name)),
            sortOrder: pi,
          }),
        );
        productCount++;
        for (const [gi, g] of p.groups.entries()) {
          const group = await manager.save(
            manager.create(OptionGroup, {
              productId: product.id,
              name: g.name,
              minSelect: g.minSelect,
              maxSelect: g.maxSelect,
              sortOrder: gi,
            }),
          );
          await manager.save(
            g.options.map((o, oi) =>
              manager.create(Option, {
                ...o,
                optionGroupId: group.id,
                sortOrder: oi,
              }),
            ),
          );
        }
      }
    }
    console.log(`  ${MENU.length} categories, ${productCount} products`);
  });
}

/**
 * Real photos for the sample products: seed-images/products/<product slug>.jpg
 * (e.g. ca-phe-sua-da.jpg for "Cà phê sữa đá"). Copied to uploads/ and served by the
 * backend like an admin upload. Only replaces placeholder images, never one an admin
 * uploaded, so it is safe to run again (also on an existing database).
 */
async function seedProductImages() {
  const dir = join(process.cwd(), 'seed-images', 'products');
  if (!existsSync(dir)) return;
  const publicUrl = (process.env.PUBLIC_URL ?? 'http://localhost:3100').replace(
    /\/$/,
    '',
  );
  const target = join(UPLOADS_DIR, 'products');
  mkdirSync(target, { recursive: true });

  const products = dataSource.getRepository(Product);
  const bySlug = new Map(
    (await products.find()).map((p) => [slugify(p.name), p]),
  );
  let count = 0;
  for (const file of readdirSync(dir)) {
    const product = bySlug.get(file.slice(0, -extname(file).length));
    if (!product || !isPlaceholder(product.imageUrl)) continue;
    const name = `seed-${file}`;
    copyFileSync(join(dir, file), join(target, name));
    product.imageUrl = `${publicUrl}/uploads/products/${name}`;
    await products.save(product);
    count++;
  }
  console.log(`  ${count} product photos`);
}

const isPlaceholder = (url: string | null) =>
  !url || url.startsWith('https://picsum.photos/');

await dataSource.initialize();
try {
  console.log('Seeding...');
  await seedUsers();
  await seedStores();
  await seedMenu();
  await seedProductImages();
  console.log('Done.');
} finally {
  await dataSource.destroy();
}
