/**
 * Checkout Store - Zustand with Persistence
 * Multi-step wizard state management
 * Fields:
 *  - contact: { phone, firstName, lastName, email }
 *  - delivery: { city, cityRef, branch, branchRef }
 *  - payment: 'card' | 'cash'
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useCheckoutStore = create(
  persist(
    (set, get) => ({
      step: 1,

      contact: {
        phone: '',
        firstName: '',
        lastName: '',
        email: '',
      },

      delivery: {
        city: '',
        cityRef: '',
        branch: '',
        branchRef: '',
      },

      payment: 'card',

      nextStep: () => {
        const currentStep = get().step;
        if (currentStep < 4) set({ step: currentStep + 1 });
      },
      prevStep: () => {
        const currentStep = get().step;
        if (currentStep > 1) set({ step: currentStep - 1 });
      },
      setStep: (step) => set({ step }),

      updateContact: (data) => set({ contact: { ...get().contact, ...data } }),
      updateDelivery: (data) => set({ delivery: { ...get().delivery, ...data } }),
      updatePayment: (method) => set({ payment: method }),

      reset: () =>
        set({
          step: 1,
          contact: { phone: '', firstName: '', lastName: '', email: '' },
          delivery: { city: '', cityRef: '', branch: '', branchRef: '' },
          payment: 'card',
        }),
    }),
    { name: 'tma-checkout-storage', version: 2 }
  )
);

export default useCheckoutStore;
