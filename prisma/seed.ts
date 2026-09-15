import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const demoSellerEmail = 'vendedor.demo@vendamusica.com';

const guitarImages = [
  'https://images.unsplash.com/photo-1516924962500-2b4b3b99ea02?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1525201548942-d8732f6617a0?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1507838153414-b4b713384a76?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=1200&q=80',
];

const bassImages = [
  'https://images.unsplash.com/photo-1541992008-0662a22344bd?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1516924962500-2b4b3b99ea02?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1525201548942-d8732f6617a0?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1507838153414-b4b713384a76?auto=format&fit=crop&w=1200&q=80',
];

const pedalImages = [
  'https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1516924962500-2b4b3b99ea02?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1525201548942-d8732f6617a0?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1507838153414-b4b713384a76?auto=format&fit=crop&w=1200&q=80',
];

const keyboardImages = [
  'https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1525201548942-d8732f6617a0?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1507838153414-b4b713384a76?auto=format&fit=crop&w=1200&q=80',
];

const drumImages = [
  'https://images.unsplash.com/photo-1519892300165-cb5542fb47c7?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1507838153414-b4b713384a76?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1525201548942-d8732f6617a0?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1516924962500-2b4b3b99ea02?auto=format&fit=crop&w=1200&q=80',
];

const microphoneImages = [
  'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1525201548942-d8732f6617a0?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1507838153414-b4b713384a76?auto=format&fit=crop&w=1200&q=80',
];

const listings = [
  {
    title: 'Fender Stratocaster Standard Sunburst',
    description:
      'Guitarra em excelente estado, regulada recentemente, com captadores originais e bag inclusa.',
    price: 489000,
    comparePrice: 619000,
    category: 'Guitarras',
    condition: 'seminovo',
    brand: 'Fender',
    model: 'Stratocaster Standard',
    year: 2018,
    color: '3-Color Sunburst',
    tags: ['stratocaster', 'fender', 'guitarra', 'sunburst'],
    includedItems: ['Guitarra', 'Bag original', 'Alavanca (tremolo)', 'Manual'],
    specifications: {
      Captadores: '3 single-coil',
      Escala: 'Maple',
      Cordas: '6',
    },
    acceptsTrade: true,
    allowsPickup: true,
    installments: 12,
    images: guitarImages,
    city: 'Sao Paulo',
    state: 'SP',
  },
  {
    title: 'Baixo Yamaha TRBX304 Ativo',
    description:
      'Baixo versatil para palco e estudio, circuito ativo, quatro cordas e timbre moderno.',
    price: 279000,
    category: 'Baixos',
    condition: 'usado',
    brand: 'Yamaha',
    model: 'TRBX304',
    year: 2020,
    color: 'Preto',
    tags: ['baixo', 'yamaha', 'ativo', '4-cordas'],
    includedItems: ['Baixo', 'Chave allen'],
    specifications: { Cordas: '4', Circuito: 'Ativo' },
    acceptsTrade: false,
    allowsPickup: true,
    installments: 10,
    images: bassImages,
    city: 'Campinas',
    state: 'SP',
  },
  {
    title: 'Pedal Boss Blues Driver BD-2',
    description:
      'Overdrive classico com otima dinamica, pouco uso, funcionando perfeitamente.',
    price: 62000,
    comparePrice: 79000,
    category: 'Pedais',
    condition: 'usado',
    brand: 'Boss',
    model: 'BD-2 Blues Driver',
    year: 2019,
    tags: ['pedal', 'boss', 'overdrive'],
    includedItems: ['Pedal'],
    acceptsTrade: false,
    allowsPickup: false,
    installments: 6,
    images: pedalImages,
    city: 'Curitiba',
    state: 'PR',
  },
  {
    title: 'Teclado Roland FP-30X com suporte',
    description:
      'Piano digital com teclas pesadas, fonte original, pedal sustain e suporte reforcado.',
    price: 385000,
    category: 'Teclados',
    condition: 'seminovo',
    brand: 'Roland',
    model: 'FP-30X',
    year: 2021,
    color: 'Preto',
    tags: ['teclado', 'roland', 'piano-digital'],
    includedItems: ['Teclado', 'Fonte', 'Pedal sustain', 'Suporte', 'Estante'],
    specifications: { Teclas: '88', Tipo: 'Pesadas' },
    acceptsTrade: true,
    allowsPickup: true,
    installments: 12,
    images: keyboardImages,
    city: 'Belo Horizonte',
    state: 'MG',
  },
  {
    title: 'Bateria Pearl Export Completa',
    description:
      'Kit completo com tons, surdo, caixa, ferragens e pratos de entrada para estudo e shows.',
    price: 430000,
    category: 'Baterias',
    condition: 'usado',
    brand: 'Pearl',
    model: 'Export EXX',
    year: 2017,
    tags: ['bateria', 'pearl', 'acustica', 'completa'],
    includedItems: ['Tons', 'Surdo', 'Caixa', 'Ferragens', 'Pratos'],
    acceptsTrade: false,
    allowsPickup: true,
    installments: 12,
    images: drumImages,
    city: 'Rio de Janeiro',
    state: 'RJ',
  },
  {
    title: 'Microfone Shure SM58',
    description:
      'Microfone dinamico para voz, ideal para ensaios, igrejas, bares e pequenas producoes.',
    price: 74000,
    category: 'Audio',
    condition: 'seminovo',
    brand: 'Shure',
    model: 'SM58',
    year: 2022,
    tags: ['microfone', 'shure', 'sm58', 'vocal'],
    includedItems: ['Microfone', 'Cachimbo', 'Bag'],
    specifications: { Tipo: 'Dinamico', Padrao: 'Cardioide' },
    acceptsTrade: false,
    allowsPickup: false,
    installments: 8,
    images: microphoneImages,
    city: 'Porto Alegre',
    state: 'RS',
  },
];

async function main() {
  const password = await bcrypt.hash('demo123456', 10);

  const seller = await prisma.user.upsert({
    where: { email: demoSellerEmail },
    update: {
      name: 'Venda Musica Demo',
      phone: '+5511999999999',
      city: 'Sao Paulo',
      state: 'SP',
      bio: 'Perfil demo com instrumentos para popular a vitrine local. Mais de 10 anos conectando musicos aos melhores instrumentos.',
      asaasWalletId: 'mock_recipient_demo',
      bankDataCompleted: true,
      storeName: 'Studio Demo',
      storeSlug: 'studio-demo',
      storeBanner:
        'https://images.unsplash.com/photo-1511735111819-9a3f7709049c?w=1200',
      isVerified: true,
    },
    create: {
      email: demoSellerEmail,
      name: 'Venda Musica Demo',
      password,
      phone: '+5511999999999',
      city: 'Sao Paulo',
      state: 'SP',
      bio: 'Perfil demo com instrumentos para popular a vitrine local. Mais de 10 anos conectando musicos aos melhores instrumentos.',
      asaasWalletId: 'mock_recipient_demo',
      bankDataCompleted: true,
      storeName: 'Studio Demo',
      storeSlug: 'studio-demo',
      storeBanner:
        'https://images.unsplash.com/photo-1511735111819-9a3f7709049c?w=1200',
      isVerified: true,
    },
  });

  const demoListings = await prisma.listing.findMany({
    where: { sellerId: seller.id },
    select: { id: true },
  });

  const demoListingIds = demoListings.map((listing) => listing.id);

  if (demoListingIds.length > 0) {
    const demoConversations = await prisma.conversation.findMany({
      where: { listingId: { in: demoListingIds } },
      select: { id: true },
    });
    const demoConversationIds = demoConversations.map(
      (conversation) => conversation.id,
    );

    await prisma.message.deleteMany({
      where: { conversationId: { in: demoConversationIds } },
    });
    await prisma.offer.deleteMany({
      where: { conversationId: { in: demoConversationIds } },
    });
    await prisma.conversation.deleteMany({
      where: { id: { in: demoConversationIds } },
    });
    await prisma.order.deleteMany({
      where: { listingId: { in: demoListingIds } },
    });
    await prisma.review.deleteMany({
      where: { sellerId: seller.id },
    });
    await prisma.follow.deleteMany({
      where: { sellerId: seller.id },
    });
    await prisma.favorite.deleteMany({
      where: { listingId: { in: demoListingIds } },
    });
    await prisma.listing.deleteMany({
      where: { id: { in: demoListingIds } },
    });
  }

  await prisma.listing.createMany({
    data: listings.map((listing) => ({
      ...listing,
      sellerId: seller.id,
      status: 'active',
    })),
  });

  await prisma.listing.create({
    data: {
      title: 'Pedal Dunlop Cry Baby (rascunho)',
      description:
        'Anuncio em rascunho de demonstracao, ainda nao publicado na vitrine.',
      price: 45000,
      category: 'Pedais',
      condition: 'usado',
      brand: 'Dunlop',
      model: 'Cry Baby',
      tags: ['pedal', 'wah', 'dunlop'],
      images: [pedalImages[0]],
      city: 'Sao Paulo',
      state: 'SP',
      status: 'draft',
      sellerId: seller.id,
    },
  });

  const buyerPassword = await bcrypt.hash('demo123456', 10);
  const demoBuyersData = [
    { email: 'carlos.demo@vendamusica.com', name: 'Carlos M.' },
    { email: 'juliana.demo@vendamusica.com', name: 'Juliana P.' },
    { email: 'rafael.demo@vendamusica.com', name: 'Rafael T.' },
  ];

  const buyers: { id: string }[] = [];
  for (const data of demoBuyersData) {
    const buyer = await prisma.user.upsert({
      where: { email: data.email },
      update: { name: data.name },
      create: { email: data.email, name: data.name, password: buyerPassword },
    });
    buyers.push(buyer);
  }

  const createdListings = await prisma.listing.findMany({
    where: { sellerId: seller.id, status: 'active' },
    select: { id: true, price: true },
    orderBy: { createdAt: 'asc' },
    take: 3,
  });

  const reviewsData = [
    {
      authorId: buyers[0].id,
      listingId: createdListings[0]?.id ?? null,
      rating: 5,
      comment:
        'Produto impecavel, chegou super rapido e bem embalado. Vendedor atencioso, recomendo!',
    },
    {
      authorId: buyers[1].id,
      listingId: createdListings[1]?.id ?? null,
      rating: 5,
      comment:
        'Instrumento lindo e original. Vendedor confiavel, responde rapido e tira todas as duvidas.',
    },
    {
      authorId: buyers[2].id,
      listingId: createdListings[2]?.id ?? null,
      rating: 5,
      comment: 'Excelente experiencia! Segunda compra e sempre tudo perfeito.',
    },
    {
      authorId: buyers[0].id,
      listingId: null,
      rating: 4,
      comment: 'Tudo certo, entrega no prazo. Recomendo o vendedor.',
    },
    {
      authorId: buyers[1].id,
      listingId: null,
      rating: 5,
      comment: 'Otimo atendimento, voltarei a comprar.',
    },
  ];

  await prisma.review.createMany({
    data: reviewsData.map((review) => ({
      authorId: review.authorId,
      sellerId: seller.id,
      listingId: review.listingId,
      rating: review.rating,
      comment: review.comment,
    })),
  });

  const ratingAgg = await prisma.review.aggregate({
    where: { sellerId: seller.id },
    _avg: { rating: true },
    _count: { _all: true },
  });
  await prisma.user.update({
    where: { id: seller.id },
    data: {
      ratingAverage: Math.round((ratingAgg._avg.rating ?? 0) * 10) / 10,
      ratingCount: ratingAgg._count._all,
    },
  });

  await prisma.follow.createMany({
    data: buyers.map((buyer) => ({
      followerId: buyer.id,
      sellerId: seller.id,
    })),
  });

  const followersCount = await prisma.follow.count({
    where: { sellerId: seller.id },
  });
  await prisma.user.update({
    where: { id: seller.id },
    data: { followersCount },
  });

  const paidOrdersPlan = [
    { listing: createdListings[0], buyer: buyers[0], daysAgo: 2 },
    { listing: createdListings[1], buyer: buyers[1], daysAgo: 12 },
    { listing: createdListings[2], buyer: buyers[2], daysAgo: 22 },
  ];

  for (const plan of paidOrdersPlan) {
    if (!plan.listing) continue;
    const paidAt = new Date();
    paidAt.setDate(paidAt.getDate() - plan.daysAgo);
    const amount = plan.listing.price;
    const commission = Math.round(amount * 0.1);

    await prisma.order.create({
      data: {
        listingId: plan.listing.id,
        buyerId: plan.buyer.id,
        sellerId: seller.id,
        amount,
        total: amount,
        commission,
        sellerAmount: amount - commission,
        gatewayPaymentId: `mock_order_${plan.listing.id.slice(0, 8)}`,
        status: 'paid',
        paidAt,
        createdAt: paidAt,
      },
    });
  }

  const coupons = [
    { code: 'BEMVINDO10', type: 'percent', value: 10, maxDiscount: 100000 },
    { code: 'TOCAR50', type: 'fixed', value: 50000, minAmount: 200000 },
  ];
  for (const coupon of coupons) {
    await prisma.coupon.upsert({
      where: { code: coupon.code },
      update: { ...coupon, active: true },
      create: { ...coupon, active: true },
    });
  }

  await prisma.address.deleteMany({ where: { userId: buyers[0].id } });
  await prisma.address.create({
    data: {
      userId: buyers[0].id,
      label: 'Casa',
      recipientName: 'Carlos M.',
      zipCode: '01311-000',
      street: 'Av. Paulista',
      number: '1000',
      complement: 'Apto 50',
      district: 'Bela Vista',
      city: 'Sao Paulo',
      state: 'SP',
      phone: '+5511988887777',
      isDefault: true,
    },
  });

  console.log(
    `Seed concluido: ${listings.length} anuncios demo criados com 6 fotos cada.`,
  );
  console.log(`Vendedor demo: ${demoSellerEmail} / demo123456`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
