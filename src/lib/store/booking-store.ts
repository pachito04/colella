import { create } from 'zustand'

interface BookingState {
  selectedDate: Date | undefined
  selectedSlot: string | null
  isDoubleSession: boolean
  step: 'date' | 'slot' | 'details' | 'confirmation'
  setDate: (date: Date | undefined) => void
  setSlot: (slot: string | null) => void
  setDoubleSession: (isDouble: boolean) => void
  setStep: (step: 'date' | 'slot' | 'details' | 'confirmation') => void
  reset: () => void
}

export const useBookingStore = create<BookingState>((set) => ({
  selectedDate: undefined,
  selectedSlot: null,
  isDoubleSession: false,
  step: 'date',
  setDate: (date) => set({ selectedDate: date, step: date ? 'slot' : 'date', selectedSlot: null }),
  setSlot: (slot) => set({ selectedSlot: slot, step: 'details' }),
  setDoubleSession: (isDouble) => set({ isDoubleSession: isDouble, selectedSlot: null }),
  setStep: (step) => set({ step }),
  reset: () => set({ selectedDate: undefined, selectedSlot: null, isDoubleSession: false, step: 'date' }),
}))
