import { create } from 'zustand'

interface BookingState {
  selectedDate: Date | undefined
  selectedSlot: string | null
  step: 'date' | 'slot' | 'details' | 'confirmation'
  setDate: (date: Date | undefined) => void
  setSlot: (slot: string | null) => void
  setStep: (step: 'date' | 'slot' | 'details' | 'confirmation') => void
  reset: () => void
}

export const useBookingStore = create<BookingState>((set) => ({
  selectedDate: undefined,
  selectedSlot: null,
  step: 'date',
  setDate: (date) => set({ selectedDate: date, step: date ? 'slot' : 'date', selectedSlot: null }),
  setSlot: (slot) => set({ selectedSlot: slot, step: 'details' }),
  setStep: (step) => set({ step }),
  reset: () => set({ selectedDate: undefined, selectedSlot: null, step: 'date' }),
}))
