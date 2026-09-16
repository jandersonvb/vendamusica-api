import { Prisma, PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const storeEmail = 'loja.demo@vendamusica.com';
const personalEmail = 'vendedor.demo@vendamusica.com';
const adminEmail = 'admin@vendamusica.com';

/**
 * Planos da vitrine. Os preços são hipótese inicial — a ideia é validar com
 * 5 a 10 lojas antes de ligar cobrança. Trocar de plano é mudar linha aqui.
 */
const plans = [
  {
    slug: 'free',
    name: 'Grátis',
    description: 'Para quem quer vender o próprio instrumento.',
    priceCents: 0,
    listingLimit: 5,
    photoLimit: 8,
    allowsVideo: false,
    highlightHome: false,
    seesWantedList: false,
    searchPriority: 0,
    audience: 'both',
    trialDays: 0,
    sortOrder: 0,
  },
  {
    slug: 'store-start',
    name: 'Loja Start',
    description: 'Vitrine da loja com painel de contatos.',
    priceCents: 7900,
    listingLimit: 30,
    photoLimit: 10,
    allowsVideo: false,
    highlightHome: false,
    seesWantedList: false,
    searchPriority: 10,
    audience: 'store',
    trialDays: 30,
    sortOrder: 1,
  },
  {
    slug: 'store-pro',
    name: 'Loja Pro',
    description: 'Prioridade na busca, vídeo no anúncio e lista de quem procura.',
    priceCents: 14900,
    listingLimit: 150,
    photoLimit: 15,
    allowsVideo: true,
    highlightHome: false,
    seesWantedList: true,
    searchPriority: 20,
    audience: 'store',
    trialDays: 30,
    sortOrder: 2,
  },
  {
    slug: 'store-premium',
    name: 'Loja Premium',
    description: 'Anúncios ilimitados e destaque na home e na cidade.',
    priceCents: 29900,
    listingLimit: null,
    photoLimit: 20,
    allowsVideo: true,
    highlightHome: true,
    seesWantedList: true,
    searchPriority: 30,
    audience: 'store',
    trialDays: 30,
    sortOrder: 3,
  },
];

const guitarImages = [
  'https://images.unsplash.com/photo-1516924962500-2b4b3b99ea02?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1525201548942-d8732f6617a0?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=1200&q=80',
];

const bassImages = [
  'https://images.unsplash.com/photo-1541992008-0662a22344bd?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1516924962500-2b4b3b99ea02?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=1200&q=80',
];

const pedalImages = [
  'https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1516924962500-2b4b3b99ea02?auto=format&fit=crop&w=1200&q=80',
];

const keyboardImages = [
  'https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1525201548942-d8732f6617a0?auto=format&fit=crop&w=1200&q=80',
];

const drumImages = [
  'https://images.unsplash.com/photo-1519892300165-cb5542fb47c7?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1507838153414-b4b713384a76?auto=format&fit=crop&w=1200&q=80',
];

const microphoneImages = [
  'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=1200&q=80',
];

const storeListings = [
  {
    title: 'Fender Stratocaster Player Sunburst',
    description:
      'Guitarra nova, lacrada, com garantia da loja e regulagem inclusa na entrega.',
    price: 749000,
    comparePrice: 829000,
    category: 'Guitarras',
    condition: 'novo',
    brand: 'Fender',
    model: 'Player Stratocaster',
    year: 2025,
    color: '3-Color Sunburst',
    tags: ['stratocaster', 'fender', 'guitarra'],
    includedItems: ['Guitarra', 'Bag', 'Certificado de garantia'],
    specifications: { Captadores: '3 single-coil', Escala: 'Maple', Cordas: '6' },
    images: guitarImages,
    city: 'Belo Horizonte',
    state: 'MG',
  },
  {
    title: 'Teclado Roland FP-30X com suporte',
    description:
      'Piano digital 88 teclas pesadas. Loja física, aceitamos troca e temos assistência própria.',
    price: 549000,
    category: 'Teclados',
    condition: 'novo',
    brand: 'Roland',
    model: 'FP-30X',
    year: 2025,
    tags: ['teclado', 'roland', 'piano-digital'],
    includedItems: ['Teclado', 'Fonte', 'Pedal sustain', 'Suporte'],
    specifications: { Teclas: '88', Tipo: 'Pesadas' },
    acceptsTrade: true,
    images: keyboardImages,
    city: 'Belo Horizonte',
    state: 'MG',
  },
  {
    title: 'Bateria Pearl Export Completa',
    description:
      'Kit completo com ferragens e pratos. Montagem inclusa para quem retira na loja.',
    price: 650000,
    category: 'Baterias',
    condition: 'novo',
    brand: 'Pearl',
    model: 'Export EXX',
    tags: ['bateria', 'pearl', 'completa'],
    includedItems: ['Tons', 'Surdo', 'Caixa', 'Ferragens', 'Pratos'],
    allowsPickup: true,
    images: drumImages,
    city: 'Belo Horizonte',
    state: 'MG',
  },
  {
    title: 'Microfone Shure SM58 (sob consulta)',
    description:
      'Temos em estoque com nota fiscal. Consulte condição para compra em quantidade.',
    price: null,
    category: 'Audio',
    condition: 'novo',
    brand: 'Shure',
    model: 'SM58',
    tags: ['microfone', 'shure', 'sm58'],
    includedItems: ['Microfone', 'Cachimbo', 'Bag'],
    images: microphoneImages,
    city: 'Belo Horizonte',
    state: 'MG',
  },
];

const personalListings = [
  {
    title: 'Baixo Yamaha TRBX304 Ativo',
    description:
      'Baixo em ótimo estado, usado em ensaios. Aceito proposta e troca por pedais.',
    price: 279000,
    category: 'Baixos',
    condition: 'usado',
    brand: 'Yamaha',
    model: 'TRBX304',
    year: 2020,
    tags: ['baixo', 'yamaha', 'ativo'],
    includedItems: ['Baixo', 'Chave allen'],
    acceptsTrade: true,
    allowsPickup: true,
    images: bassImages,
    city: 'Contagem',
    state: 'MG',
  },
  {
    title: 'Pedal Boss Blues Driver BD-2',
    description:
      'Overdrive clássico, pouco uso, funcionando perfeitamente. Retirada em mãos.',
    price: 62000,
    comparePrice: 79000,
    category: 'Pedais',
    condition: 'usado',
    brand: 'Boss',
    model: 'BD-2 Blues Driver',
    year: 2019,
    tags: ['pedal', 'boss', 'overdrive'],
    includedItems: ['Pedal'],
    allowsPickup: true,
    images: pedalImages,
    city: 'Belo Horizonte',
    state: 'MG',
  },
];

const wantedItems = [
  {
    title: 'Procuro Stratocaster até R$ 5.000',
    category: 'Guitarras',
    brand: 'Fender',
    maxPrice: 500000,
    state: 'MG',
    description: 'De preferência sunburst, aceito seminova em bom estado.',
  },
  {
    title: 'Teclado 88 teclas pesadas',
    category: 'Teclados',
    maxPrice: 600000,
    state: 'MG',
    description: 'Para estudo em casa. Roland, Yamaha ou Casio.',
  },
  {
    title: 'Pedal de overdrive',
    category: 'Pedais',
    maxPrice: 80000,
    state: 'MG',
  },
];

async function main() {
  const password = await bcrypt.hash('demo123456', 10);

  // 1. Planos
  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { slug: plan.slug },
      update: plan,
      create: plan,
    });
  }
  const proPlan = await prisma.plan.findUniqueOrThrow({
    where: { slug: 'store-pro' },
  });

  // 2. Contas demo: loja, pessoa física, compradores e admin
  const store = await prisma.user.upsert({
    where: { email: storeEmail },
    update: {},
    create: {
      email: storeEmail,
      name: 'Rodrigo Alves',
      password,
      accountType: 'store',
      document: '12345678000190',
      city: 'Belo Horizonte',
      state: 'MG',
      bio: 'Loja de instrumentos desde 2008. Assistência própria e entrega para todo o Brasil.',
      storeName: 'Casa do Músico BH',
      storeSlug: 'casa-do-musico-bh',
      storeAddress: 'Av. Afonso Pena, 1500 - Centro, Belo Horizonte/MG',
      storeHours: 'Seg a Sex 9h-18h · Sáb 9h-13h',
      storeWebsite: 'https://casadomusicobh.com.br',
      storeBanner:
        'https://images.unsplash.com/photo-1511735111819-9a3f7709049c?w=1200',
      whatsapp: '5531999998888',
      publicPhone: '(31) 3333-4444',
      isVerified: true,
    },
  });

  await prisma.subscription.upsert({
    where: { userId: store.id },
    update: { planId: proPlan.id, status: 'active' },
    create: {
      userId: store.id,
      planId: proPlan.id,
      status: 'active',
      currentPeriodEnd: new Date(Date.now() + 30 * 86_400_000),
    },
  });
  await prisma.user.update({
    where: { id: store.id },
    data: { searchPriority: proPlan.searchPriority },
  });

  const personal = await prisma.user.upsert({
    where: { email: personalEmail },
    update: {},
    create: {
      email: personalEmail,
      name: 'Marcos Silva',
      password,
      accountType: 'personal',
      city: 'Belo Horizonte',
      state: 'MG',
      bio: 'Músico há 15 anos, vendendo equipamentos que não uso mais.',
      whatsapp: '5531988887777',
      isVerified: true,
    },
  });

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { isAdmin: true },
    create: {
      email: adminEmail,
      name: 'Admin VendaMúsica',
      password,
      isAdmin: true,
    },
  });

  const buyersData = [
    { email: 'carlos.demo@vendamusica.com', name: 'Carlos M.' },
    { email: 'juliana.demo@vendamusica.com', name: 'Juliana P.' },
    { email: 'rafael.demo@vendamusica.com', name: 'Rafael T.' },
  ];
  const buyers: { id: string }[] = [];
  for (const data of buyersData) {
    const buyer = await prisma.user.upsert({
      where: { email: data.email },
      update: { name: data.name },
      create: {
        email: data.email,
        name: data.name,
        password,
        city: 'Belo Horizonte',
        state: 'MG',
      },
    });
    buyers.push(buyer);
  }

  // 3. Limpa o conteúdo demo anterior antes de recriar
  const sellerIds = [store.id, personal.id];
  const oldListings = await prisma.listing.findMany({
    where: { sellerId: { in: sellerIds } },
    select: { id: true },
  });
  const oldIds = oldListings.map((listing) => listing.id);

  if (oldIds.length > 0) {
    const conversations = await prisma.conversation.findMany({
      where: { listingId: { in: oldIds } },
      select: { id: true },
    });
    const conversationIds = conversations.map((conversation) => conversation.id);

    await prisma.messageReaction.deleteMany({
      where: { message: { conversationId: { in: conversationIds } } },
    });
    await prisma.message.deleteMany({
      where: { conversationId: { in: conversationIds } },
    });
    await prisma.offer.deleteMany({
      where: { conversationId: { in: conversationIds } },
    });
    await prisma.conversation.deleteMany({
      where: { id: { in: conversationIds } },
    });
    await prisma.lead.deleteMany({ where: { sellerId: { in: sellerIds } } });
    await prisma.review.deleteMany({ where: { sellerId: { in: sellerIds } } });
    await prisma.follow.deleteMany({ where: { sellerId: { in: sellerIds } } });
    await prisma.favorite.deleteMany({ where: { listingId: { in: oldIds } } });
    await prisma.wantedMatch.deleteMany({ where: { listingId: { in: oldIds } } });
    await prisma.report.deleteMany({ where: { listingId: { in: oldIds } } });
    await prisma.listing.deleteMany({ where: { id: { in: oldIds } } });
  }
  await prisma.wantedItem.deleteMany({
    where: { userId: { in: buyers.map((buyer) => buyer.id) } },
  });

  // 4. Anúncios
  const now = new Date();
  await prisma.listing.createMany({
    data: storeListings.map((listing) => ({
      ...listing,
      sellerId: store.id,
      status: 'active',
      publishedAt: now,
    })),
  });
  await prisma.listing.createMany({
    data: personalListings.map((listing) => ({
      ...listing,
      sellerId: personal.id,
      status: 'active',
      publishedAt: now,
    })),
  });

  // Um anúncio esperando curadoria, para a tela de admin ter conteúdo
  await prisma.listing.create({
    data: {
      title: 'Violão Takamine GD30 (aguardando aprovação)',
      description:
        'Anúncio de demonstração parado na fila de curadoria do administrador.',
      price: 189000,
      category: 'Violões',
      condition: 'seminovo',
      brand: 'Takamine',
      model: 'GD30',
      tags: ['violao', 'takamine'],
      images: [guitarImages[0]],
      city: 'Belo Horizonte',
      state: 'MG',
      status: 'pending_review',
      sellerId: personal.id,
    },
  });

  const activeListings = await prisma.listing.findMany({
    where: { sellerId: { in: sellerIds }, status: 'active' },
    select: { id: true, sellerId: true, category: true, price: true },
  });

  // 5. Procuras ("Procura-se") + cruzamento com os anúncios no ar
  for (const [index, wanted] of wantedItems.entries()) {
    const created = await prisma.wantedItem.create({
      data: { ...wanted, userId: buyers[index % buyers.length].id },
    });

    const matches = activeListings.filter(
      (listing) =>
        listing.category === created.category &&
        (created.maxPrice === undefined ||
          created.maxPrice === null ||
          listing.price === null ||
          listing.price <= created.maxPrice),
    );

    if (matches.length > 0) {
      await prisma.wantedMatch.createMany({
        data: matches.map((listing) => ({
          wantedItemId: created.id,
          listingId: listing.id,
        })),
        skipDuplicates: true,
      });
    }
  }

  // 6. Conversas (habilitam avaliação) + avaliações + seguidores
  const channels = ['whatsapp', 'phone', 'chat', 'store_page'];
  for (const [index, buyer] of buyers.entries()) {
    const listing = activeListings[index % activeListings.length];

    const conversation = await prisma.conversation.create({
      data: {
        listingId: listing.id,
        buyerId: buyer.id,
        sellerId: listing.sellerId,
        lastMessageAt: new Date(),
      },
    });

    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderId: buyer.id,
        content: 'Olá! Esse instrumento ainda está disponível?',
      },
    });

    await prisma.review.create({
      data: {
        authorId: buyer.id,
        sellerId: listing.sellerId,
        listingId: listing.id,
        rating: 5,
        comment:
          'Atendimento excelente, respondeu rápido e o instrumento era exatamente como no anúncio.',
      },
    });

    await prisma.follow.upsert({
      where: { followerId_sellerId: { followerId: buyer.id, sellerId: store.id } },
      update: {},
      create: { followerId: buyer.id, sellerId: store.id },
    });
  }

  // 7. Leads espalhados nos últimos 30 dias, para o painel ter gráfico
  const leadsData: Prisma.LeadCreateManyInput[] = [];
  for (let day = 0; day < 30; day++) {
    const createdAt = new Date(now.getTime() - day * 86_400_000);
    const count = (day % 4) + 1;

    for (let i = 0; i < count; i++) {
      const listing = activeListings[(day + i) % activeListings.length];
      leadsData.push({
        sellerId: listing.sellerId,
        listingId: listing.id,
        visitorId: buyers[(day + i) % buyers.length].id,
        channel: channels[(day + i) % channels.length],
        source: 'listing_page',
        createdAt,
      });
    }
  }
  await prisma.lead.createMany({ data: leadsData });

  // 8. Contadores agregados
  for (const sellerId of sellerIds) {
    const [rating, followers] = await Promise.all([
      prisma.review.aggregate({
        where: { sellerId },
        _avg: { rating: true },
        _count: { _all: true },
      }),
      prisma.follow.count({ where: { sellerId } }),
    ]);

    await prisma.user.update({
      where: { id: sellerId },
      data: {
        ratingAverage: Math.round((rating._avg.rating ?? 0) * 10) / 10,
        ratingCount: rating._count._all,
        followersCount: followers,
      },
    });
  }

  console.log('Seed concluído (modelo vitrine):');
  console.log(`  ${plans.length} planos`);
  console.log(`  Loja:   ${storeEmail} / demo123456 (plano Loja Pro)`);
  console.log(`  Pessoa: ${personalEmail} / demo123456 (plano grátis)`);
  console.log(`  Admin:  ${adminEmail} / demo123456`);
  console.log(`  ${leadsData.length} leads e ${wantedItems.length} procuras`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
