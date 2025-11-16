import request from 'supertest';
import { app } from '../app';

export const signin = async (): Promise<string[]> => {
  const email = 'test@test.com';
  const password = 'password';

  const response = await request(app)
    .post('/api/users/signup')
    .send({
      email,
      password
    })
    .expect(201);

  const cookie = response.get('Set-Cookie');
  if (!cookie) {
    throw new Error('Set-Cookie header is missing in the response');
  }

  return cookie;
};
