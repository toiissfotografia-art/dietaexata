// server.js
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const mercadopago = require('mercadopago');

const app = express();
app.use(bodyParser.json());
app.use(express.static('public'));

mercadopago.configure({
  access_token: process.env.MP_ACCESS_TOKEN
});

// em memória — para exemplo. Em produção use DB
const payments = {};

app.post('/create_payment', async (req, res) => {
  const { amount, external_reference } = req.body;
  try {
    const payment = await mercadopago.payment.create({
      transaction_amount: amount,
      payment_method_id: 'pix',
      payer: {
        email: req.body.email || 'cliente@example.com'
      },
      external_reference: external_reference
    });
    // salva estado como pendente
    payments[payment.body.id] = { status: payment.body.status };
    res.json({ id: payment.body.id, qr: payment.body.point_of_interaction });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erro ao criar pagamento' });
  }
});

// webhook — configure na sua conta Mercado Pago
app.post('/webhook', (req, res) => {
  const { data, type } = req.body;
  if (type === 'payment') {
    const paymentId = data.id;
    // marca como aprovado
    payments[paymentId] = { status: 'approved' };
    console.log('Pagamento aprovado:', paymentId);
  }
  res.sendStatus(200);
});

app.get('/check_payment/:id', (req, res) => {
  const p = payments[req.params.id];
  if (p && p.status === 'approved') {
    return res.json({ approved: true });
  }
  res.json({ approved: false });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
