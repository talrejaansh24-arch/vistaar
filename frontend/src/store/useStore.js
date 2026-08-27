import { create } from 'zustand';
import { configAPI } from '../api/client';

const safeJSONParse = (item, fallback) => {
  if (!item || item === 'undefined') return fallback;
  try { return JSON.parse(item); } catch (e) { return fallback; }
};

const useStore = create((set, get) => ({
  // Auth
  user: safeJSONParse(localStorage.getItem('vistaarwater_user'), null),
  token: localStorage.getItem('vistaarwater_token') || null,
  setAuth: (user, token) => {
    localStorage.setItem('vistaarwater_user', JSON.stringify(user));
    localStorage.setItem('vistaarwater_token', token);
    set({ user, token });
  },
  logout: () => {
    localStorage.removeItem('vistaarwater_user');
    localStorage.removeItem('vistaarwater_token');
    set({ user: null, token: null });
  },

  // Generated designs
  generatedDesigns: [],
  setGeneratedDesigns: (designs) => set({ generatedDesigns: designs }),
  designInput: null,
  setDesignInput: (input) => set({ designInput: input }),

  // Current editor design
  currentDesign: null,
  setCurrentDesign: (design) => set({ currentDesign: design }),

  // Cart
  cart: safeJSONParse(localStorage.getItem('vistaarwater_cart'), []),
  addToCart: (item) => {
    const cart = [...get().cart, { ...item, cartId: Date.now() }];
    localStorage.setItem('vistaarwater_cart', JSON.stringify(cart));
    set({ cart });
  },
  removeFromCart: (cartId) => {
    const cart = get().cart.filter((i) => i.cartId !== cartId);
    localStorage.setItem('vistaarwater_cart', JSON.stringify(cart));
    set({ cart });
  },
  updateCartQuantity: (cartId, quantity) => {
    const cart = get().cart.map((i) => i.cartId === cartId ? { ...i, quantity } : i);
    localStorage.setItem('vistaarwater_cart', JSON.stringify(cart));
    set({ cart });
  },
  clearCart: () => {
    localStorage.removeItem('vistaarwater_cart');
    set({ cart: [] });
  },

  // Site Configurations (Dynamic Homepage Content)
  siteConfig: {},
  fetchSiteConfig: async () => {
    try {
      const res = await configAPI.get();
      set({ siteConfig: res.data });
    } catch (e) {
      console.error("Failed to fetch site configurations", e);
    }
  },
  updateSiteConfig: async (configs) => {
    await configAPI.update(configs);
    set((state) => ({ siteConfig: { ...state.siteConfig, ...configs } }));
  },

  // Loading
  loading: false,
  setLoading: (loading) => set({ loading }),
}));

export default useStore;
