export default {
  async fetch(request, env) {
    const ua = request.headers.get('User-Agent') || '';

    // Google AdSense crawlers: bypass any Worker-level processing, serve assets directly
    if (
      ua.includes('Mediapartners-Google') ||
      ua.includes('AdsBot-Google') ||
      ua.includes('Google-Display-Ads-Bot')
    ) {
      return env.ASSETS.fetch(request);
    }

    return env.ASSETS.fetch(request);
  },
};
