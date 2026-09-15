import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';

/**
 * E2E do fluxo de checkout com split (modo mock).
 * Auto-contido: cria seus próprios vendedor/comprador/anúncio/endereço,
 * então não depende do seed. Usa o banco de DATABASE_URL (.env).
 *
 * Pré-requisito: PAYMENTS_MODE=mock e banco acessível.
 */
describe('Checkout + Split (e2e)', () => {
  let app: INestApplication;
  let server: ReturnType<INestApplication['getHttpServer']>;

  const stamp = Date.now();
  const sellerEmail = `seller.e2e.${stamp}@test.com`;
  const buyerEmail = `buyer.e2e.${stamp}@test.com`;
  const password = 'senha123456';

  let sellerToken: string;
  let buyerToken: string;
  let listingId: string;
  let addressId: string;

  const PRICE = 100000; // R$ 1.000,00 — números redondos p/ conferir o split

  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
  const tokenOf = (body: { access_token?: string; token?: string }) =>
    body.access_token ?? body.token ?? '';

  beforeAll(async () => {
    process.env.PAYMENTS_MODE = 'mock';
    delete process.env.PLATFORM_COMMISSION_RATE; // garante 10%

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
    server = app.getHttpServer();

    // Cadastra (register não devolve token) e loga (login devolve access_token).
    const registerAndLogin = async (email: string, name: string) => {
      await request(server)
        .post('/api/auth/register')
        .send({ email, name, password });
      const loginRes = await request(server)
        .post('/api/auth/login')
        .send({ email, password });
      return tokenOf(loginRes.body);
    };

    sellerToken = await registerAndLogin(sellerEmail, 'Vendedor E2E');
    buyerToken = await registerAndLogin(buyerEmail, 'Comprador E2E');

    // Vendedor cadastra dados bancários (mock -> recipient active)
    await request(server)
      .post('/api/payments/recipients')
      .set(auth(sellerToken))
      .send({
        name: 'Vendedor E2E',
        email: sellerEmail,
        document: '12345678900',
        bankCode: '341',
        agency: '1234',
        account: '56789',
        accountType: 'checking',
      });

    // Vendedor cria um anúncio ativo
    const listingRes = await request(server)
      .post('/api/listings')
      .set(auth(sellerToken))
      .send({
        title: 'Guitarra E2E',
        description: 'Anuncio de teste automatizado e2e do split.',
        price: PRICE,
        category: 'Guitarras',
        condition: 'usado',
        images: ['https://example.com/g.jpg'],
        city: 'Sao Paulo',
        state: 'SP',
        status: 'active',
      });
    listingId = listingRes.body.id;

    // Comprador cria endereço
    const addrRes = await request(server)
      .post('/api/addresses')
      .set(auth(buyerToken))
      .send({
        recipientName: 'Comprador E2E',
        zipCode: '01311000',
        street: 'Av. Paulista',
        number: '1000',
        district: 'Bela Vista',
        city: 'Sao Paulo',
        state: 'SP',
      });
    addressId = addrRes.body.id;
  });

  afterAll(async () => {
    await app?.close();
  });

  it('cadastra o vendedor como recipient ativo (mock)', async () => {
    const res = await request(server)
      .get('/api/payments/recipients/me')
      .set(auth(sellerToken));

    expect(res.status).toBe(200);
    expect(res.body.connected).toBe(true);
    expect(res.body.status).toBe('active');
  });

  it('checkout cria pedido com split correto (vendedor + plataforma = total)', async () => {
    const res = await request(server)
      .post('/api/checkout')
      .set(auth(buyerToken))
      .send({
        listingId,
        addressId,
        shippingMethod: 'standard',
        paymentMethod: 'pix',
      });

    expect(res.status).toBe(201);
    const order = res.body;

    // Números esperados p/ price=100000, pix, frete standard:
    //   comissão (10%)      = 10000
    //   frete standard      =  3990
    //   serviceFee (2%)     =  2000
    //   buyerProtection .5% =   500
    //   pixDiscount (5%)    =  5000
    //   total = 100000 - 5000 + 3990 + 2000 + 500 = 101490
    //   plataforma = 10000 + 2000 + 500 - 5000     =  7500
    //   vendedor   = 100000 - 10000 + 3990         = 93990
    expect(order.commission).toBe(10000);
    expect(order.total).toBe(101490);
    expect(order.sellerAmount).toBe(93990);

    const platformAmount = order.total - order.sellerAmount;
    expect(platformAmount).toBe(7500);
    // Invariante do gateway: as partes somam o total.
    expect(order.sellerAmount + platformAmount).toBe(order.total);

    expect(order.status).toBe('pending');
    expect(order.gatewayPaymentId).toBeTruthy();
  });

  it('paga o pedido (mock) e ele vira paid', async () => {
    const checkout = await request(server)
      .post('/api/checkout')
      .set(auth(buyerToken))
      .send({
        listingId,
        addressId,
        shippingMethod: 'standard',
        paymentMethod: 'pix',
      });

    const orderId = checkout.body.id;

    const paid = await request(server)
      .post(`/api/orders/${orderId}/pay`)
      .set(auth(buyerToken));

    expect(paid.status).toBe(201);
    expect(paid.body.status).toBe('paid');
    expect(paid.body.paidAt).toBeTruthy();
  });

  it('bloqueia o vendedor de comprar o próprio anúncio', async () => {
    const res = await request(server)
      .post('/api/checkout')
      .set(auth(sellerToken))
      .send({
        listingId,
        addressId,
        shippingMethod: 'standard',
        paymentMethod: 'pix',
      });

    expect(res.status).toBe(400);
  });
});
