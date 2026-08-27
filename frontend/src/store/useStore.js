import { create } from 'zustand';
import { configAPI, designAPI, authAPI } from '../api/client';

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
  logout: async () => {
    try {
      await authAPI.logout();
    } catch (e) {
      console.warn("Server logout failed", e);
    }
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

  // Saved designs
  savedDesigns: [],
  fetchSavedDesigns: async () => {
    try {
      const res = await designAPI.list();
      set({ savedDesigns: res.data });
    } catch (e) {
      console.error("Failed to fetch saved designs", e);
    }
  },
  saveDesign: async (design) => {
    try {
      const payload = {
        name: design.name || "Custom Design",
        canvas_json: design.canvas_json || JSON.stringify(design),
        preview_url: design.preview_url,
        template_id: design.template_id || null
      };
      const res = await designAPI.save(payload);
      set((state) => ({ savedDesigns: [res.data, ...state.savedDesigns] }));
      return res.data;
    } catch (e) {
      console.error("Failed to save design", e);
      throw e;
    }
  },
  deleteSavedDesign: async (designId) => {
    try {
      await designAPI.delete(designId);
      set((state) => ({ savedDesigns: state.savedDesigns.filter(d => d.id !== designId) }));
    } catch (e) {
      console.error("Failed to delete saved design", e);
    }
  },

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
