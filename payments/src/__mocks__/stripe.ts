export const stripe = {
  charges: {
    create: jest.fn().mockResolvedValue({
      id: 'test_stripe_charge_id',
      currency: 'usd',
      amount: 2000,
      source: 'tok_visa',
    }),
  },
};
