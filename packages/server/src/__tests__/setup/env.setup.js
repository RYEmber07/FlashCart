process.env.NODE_ENV = 'test';
process.env.PORT ||= '5001';
process.env.CORS_ORIGIN ||= 'http://localhost:3000';
process.env.ACCESS_TOKEN_SECRET ||=
  'a_very_long_dummy_secret_for_testing_purposes_only';
process.env.REFRESH_TOKEN_SECRET ||=
  'a_very_long_different_dummy_secret_for_testing_purposes_only';
process.env.ACCESS_TOKEN_EXPIRY_MS ||= '900000';
process.env.REFRESH_TOKEN_EXPIRY_MS ||= '604800000';
process.env.STRIPE_SECRET_KEY ||= 'sk_test_dummy_key_for_testing';
process.env.STRIPE_WEBHOOK_SECRET ||= 'whsec_dummy_secret_for_testing';
