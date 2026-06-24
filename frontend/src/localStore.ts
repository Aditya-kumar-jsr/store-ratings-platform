import { DashboardStats, OwnerStore, Role, Store, User } from './types';

type RatingRecord = {
  userId: number;
  storeId: number;
  rating: number;
  ratedAt: string;
};

type BrowserDb = {
  users: User[];
  stores: Omit<Store, 'overallRating' | 'ratingCount' | 'userRating'>[];
  ratings: RatingRecord[];
};

const dbKey = 'store-ratings-browser-db';
const sessionKey = 'store-ratings-browser-user-id';
const adminEmail = 'adityakumar140102@gmail.com';

const seedDb: BrowserDb = {
  users: [
    {
      id: 1,
      name: 'Aditya Kumar',
      email: adminEmail,
      address: 'Head Office',
      role: 'admin',
      created_at: new Date().toISOString(),
    },
    {
      id: 2,
      name: 'Demo User',
      email: 'user@store-ratings.local',
      address: '18 Market Road',
      role: 'user',
      created_at: new Date().toISOString(),
    },
    {
      id: 3,
      name: 'Demo Owner',
      email: 'owner@store-ratings.local',
      address: '42 Commerce Street',
      role: 'owner',
      created_at: new Date().toISOString(),
    },
  ],
  stores: [
    {
      id: 1,
      name: 'Urban Daily Store',
      email: 'urban@example.com',
      address: '11 Central Avenue',
      ownerId: 3,
    },
    {
      id: 2,
      name: 'Fresh Corner',
      email: 'fresh@example.com',
      address: '8 Lake View Road',
      ownerId: null,
    },
  ],
  ratings: [{ userId: 2, storeId: 1, rating: 4, ratedAt: new Date().toISOString() }],
};

function readDb(): BrowserDb {
  const raw = localStorage.getItem(dbKey);
  if (!raw) {
    const normalized = normalizeDb(seedDb);
    writeDb(normalized);
    return normalized;
  }

  try {
    const normalized = normalizeDb(JSON.parse(raw) as BrowserDb);
    writeDb(normalized);
    return normalized;
  } catch {
    const normalized = normalizeDb(seedDb);
    writeDb(normalized);
    return normalized;
  }
}

function writeDb(db: BrowserDb) {
  localStorage.setItem(dbKey, JSON.stringify(db));
}

function normalizeDb(db: BrowserDb): BrowserDb {
  const hasAdmin = db.users.some((user) => user.email.toLowerCase() === adminEmail);
  const adminUser: User = {
    id: nextId(db.users),
    name: 'Aditya Kumar',
    email: adminEmail,
    address: 'Head Office',
    role: 'admin',
    created_at: new Date().toISOString(),
  };

  return {
    ...db,
    users: (hasAdmin ? db.users : [adminUser, ...db.users]).map((user) => {
      const email = user.email.toLowerCase();
      if (email === adminEmail) return { ...user, email, role: 'admin' };
      if (user.role === 'admin') return { ...user, role: 'user' };
      return { ...user, email };
    }),
  };
}

function nextId(items: { id: number }[]) {
  return Math.max(0, ...items.map((item) => item.id)) + 1;
}

function average(values: number[]) {
  if (!values.length) return 0;
  return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2));
}

function hydrateStore(
  db: BrowserDb,
  store: BrowserDb['stores'][number],
  currentUserId?: number,
): Store {
  const ratings = db.ratings.filter((rating) => rating.storeId === store.id);
  return {
    ...store,
    overallRating: average(ratings.map((rating) => rating.rating)),
    ratingCount: ratings.length,
    userRating: ratings.find((rating) => rating.userId === currentUserId)?.rating ?? null,
  };
}

function ownerRating(db: BrowserDb, ownerId: number) {
  const storeIds = db.stores.filter((store) => store.ownerId === ownerId).map((store) => store.id);
  const ratings = db.ratings.filter((rating) => storeIds.includes(rating.storeId));
  return ratings.length ? average(ratings.map((rating) => rating.rating)) : null;
}

function allowedRoleForEmail(email: string, role: Role): Role {
  if (email.toLowerCase() === adminEmail) return 'admin';
  return role === 'admin' ? 'user' : role;
}

export function getCurrentUser() {
  const id = Number(localStorage.getItem(sessionKey));
  if (!id) return null;
  return readDb().users.find((user) => user.id === id) ?? null;
}

export function upsertOAuthUser(input: { name: string; email: string }) {
  const db = readDb();
  const email = input.email.toLowerCase();
  const existing = db.users.find((user) => user.email.toLowerCase() === email);
  const isAdmin = email === adminEmail;

  if (!existing && !isAdmin) {
    throw new Error('This Google account has not been added by the admin.');
  }

  const user =
    existing ??
    ({
      id: nextId(db.users),
      name: input.name || email.split('@')[0],
      email,
      address: 'Head Office',
      role: 'admin' as Role,
      created_at: new Date().toISOString(),
    } satisfies User);

  const users = existing
    ? db.users.map((candidate) =>
        candidate.id === existing.id
          ? {
              ...candidate,
              name: input.name || candidate.name,
              role: isAdmin ? 'admin' : candidate.role,
            }
          : candidate,
      )
    : [...db.users, user];

  writeDb({ ...db, users });
  localStorage.setItem(sessionKey, String(user.id));
  return users.find((candidate) => candidate.id === user.id)!;
}

export function logoutLocal() {
  localStorage.removeItem(sessionKey);
}

export function dashboardStats(): DashboardStats {
  const db = readDb();
  return {
    totalUsers: db.users.length,
    totalStores: db.stores.length,
    totalRatings: db.ratings.length,
  };
}

export function listUsers(filters = { name: '', email: '', address: '', role: '' }) {
  const db = readDb();
  return db.users
    .map((user) => ({
      ...user,
      rating: user.role === 'owner' ? ownerRating(db, user.id) : user.rating,
    }))
    .filter((user) => {
      const nameMatch = user.name.toLowerCase().includes(filters.name.toLowerCase());
      const emailMatch = user.email.toLowerCase().includes(filters.email.toLowerCase());
      const addressMatch = user.address.toLowerCase().includes(filters.address.toLowerCase());
      const roleMatch = !filters.role || user.role === filters.role;
      return nameMatch && emailMatch && addressMatch && roleMatch;
    });
}

export function createUser(input: Omit<User, 'id' | 'created_at'>) {
  const db = readDb();
  if (db.users.some((user) => user.email.toLowerCase() === input.email.toLowerCase())) {
    throw new Error('A user with this email already exists.');
  }
  const email = input.email.toLowerCase();
  const user: User = {
    ...input,
    email,
    role: allowedRoleForEmail(email, input.role),
    id: nextId(db.users),
    created_at: new Date().toISOString(),
  };
  writeDb({ ...db, users: [...db.users, user] });
  return user;
}

export function updateUserRole(id: number, role: Role) {
  const db = readDb();
  let updated: User | undefined;
  const users = db.users.map((user) => {
    if (user.id !== id) return user;
    updated = { ...user, role: allowedRoleForEmail(user.email, role) };
    return updated;
  });
  if (!updated) throw new Error('User not found.');
  writeDb({ ...db, users });
  return updated;
}

export function deleteUser(id: number) {
  const db = readDb();
  writeDb({
    users: db.users.filter((user) => user.id !== id),
    stores: db.stores.map((store) => (store.ownerId === id ? { ...store, ownerId: null } : store)),
    ratings: db.ratings.filter((rating) => rating.userId !== id),
  });
  if (getCurrentUser()?.id === id) logoutLocal();
}

export function listStores(filters: Partial<{ name: string; email: string; address: string }> = {}) {
  const db = readDb();
  const currentUserId = getCurrentUser()?.id;
  const normalized = {
    name: filters.name ?? '',
    email: filters.email ?? '',
    address: filters.address ?? '',
  };
  return db.stores
    .map((store) => hydrateStore(db, store, currentUserId))
    .filter((store) => {
      const nameMatch = store.name.toLowerCase().includes(normalized.name.toLowerCase());
      const emailMatch = store.email.toLowerCase().includes(normalized.email.toLowerCase());
      const addressMatch = store.address.toLowerCase().includes(normalized.address.toLowerCase());
      return nameMatch && emailMatch && addressMatch;
    });
}

export function createStore(input: Omit<Store, 'id' | 'overallRating' | 'ratingCount' | 'userRating'>) {
  const db = readDb();
  if (db.stores.some((store) => store.email.toLowerCase() === input.email.toLowerCase())) {
    throw new Error('A store with this email already exists.');
  }
  const users = input.ownerId
    ? db.users.map((user) => (user.id === input.ownerId ? { ...user, role: 'owner' as Role } : user))
    : db.users;
  const store = { ...input, id: nextId(db.stores) };
  const nextDb = { ...db, users, stores: [...db.stores, store] };
  writeDb(nextDb);
  return hydrateStore(nextDb, store);
}

export function updateStoreOwner(storeId: number, ownerId: number | null) {
  const db = readDb();
  if (ownerId && !db.users.some((user) => user.id === ownerId)) {
    throw new Error('Selected owner was not found.');
  }

  const stores = db.stores.map((store) =>
    store.id === storeId ? { ...store, ownerId } : store,
  );
  if (!stores.some((store) => store.id === storeId)) {
    throw new Error('Store not found.');
  }

  const users = ownerId
    ? db.users.map((user) => (user.id === ownerId ? { ...user, role: 'owner' as Role } : user))
    : db.users;

  writeDb({ ...db, users, stores });
  const updatedStore = stores.find((store) => store.id === storeId)!;
  return hydrateStore({ ...db, users, stores }, updatedStore);
}

export function deleteStore(id: number) {
  const db = readDb();
  writeDb({
    ...db,
    stores: db.stores.filter((store) => store.id !== id),
    ratings: db.ratings.filter((rating) => rating.storeId !== id),
  });
}

export function rateStore(storeId: number, rating: number) {
  const user = getCurrentUser();
  if (!user) throw new Error('Authentication required.');
  const db = readDb();
  const nextRating = { userId: user.id, storeId, rating, ratedAt: new Date().toISOString() };
  writeDb({
    ...db,
    ratings: [
      ...db.ratings.filter(
        (existing) => existing.userId !== user.id || existing.storeId !== storeId,
      ),
      nextRating,
    ],
  });
}

export function ownerDashboard(ownerId: number): OwnerStore[] {
  const db = readDb();
  return db.stores
    .filter((store) => store.ownerId === ownerId)
    .map((store) => {
      const ratings = db.ratings.filter((rating) => rating.storeId === store.id);
      return {
        id: store.id,
        name: store.name,
        email: store.email,
        address: store.address,
        averageRating: average(ratings.map((rating) => rating.rating)),
        ratingCount: ratings.length,
        raters: ratings.map((rating) => {
          const user = db.users.find((candidate) => candidate.id === rating.userId);
          return {
            userId: rating.userId,
            name: user?.name ?? 'Unknown user',
            email: user?.email ?? 'unknown@example.com',
            address: user?.address ?? '',
            rating: rating.rating,
            ratedAt: rating.ratedAt,
          };
        }),
      };
    });
}
