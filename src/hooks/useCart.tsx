import { createContext, ReactNode, useContext, useState } from 'react'
import { toast } from 'react-toastify'
import { api } from '../services/api'
import { Product } from '../types'

interface CartProviderProps {
  children: ReactNode
}

interface UpdateProductAmount {
  productId: number
  amount: number
}

interface CartContextData {
  cart: Product[]
  addProduct: (productId: number) => Promise<void>
  removeProduct: (productId: number) => void
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void
}

const CartContext = createContext<CartContextData>({} as CartContextData)

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart')

    if (storagedCart) return JSON.parse(storagedCart)

    return []
  })

  const addProduct = async (productId: number) => {
    try {
      const { data: product } = await api.get(`products/${productId}`)
      if (!product) throw Error(`Product ${productId} not found`)

      const cartProduct = cart.find((p: Product) => p.id === productId)

      const { data: stock } = await api.get(`stock/${productId}`)

      if (stock.amount < (cartProduct ? cartProduct.amount + 1 : 1)) {
        toast.error('Quantidade solicitada fora de estoque')
        return
      }

      let cartUpdated: Product[]
      if (cartProduct) {
        cartUpdated = cart.map((product) =>
          product.id === cartProduct.id ? { ...product, amount: product.amount + 1 } : product
        )
      } else {
        cartUpdated = [...cart, { ...product, amount: 1 }]
      }

      updateCart(cartUpdated)
    } catch {
      toast.error('Erro na adição do produto')
      return
    }
  }

  const updateCart = (cartUpdated: Product[]) => {
    setCart(cartUpdated)
    localStorage.setItem('@RocketShoes:cart', JSON.stringify(cartUpdated))
  }

  const removeProduct = (productId: number) => {
    try {
      const cartProduct = cart.find((product) => product.id === productId)
      if (!cartProduct) throw Error('Product not found')

      const cartUpdated = [...cart.filter((product) => product.id !== productId)]

      updateCart(cartUpdated)
    } catch {
      toast.error('Erro na remoção do produto')
    }
  }

  const updateProductAmount = async ({ productId, amount }: UpdateProductAmount) => {
    try {
      if (amount <= 0) return

      const { data: stock } = await api.get(`stock/${productId}`)

      if (stock.amount < amount) {
        toast.error('Quantidade solicitada fora de estoque')
        return
      }

      const cartProduct = cart.find((p: Product) => p.id === productId)
      if (!cartProduct) throw Error(`Product ${productId} not found`)

      const cartUpdated = cart.map((p: Product) => (p.id === productId ? { ...p, amount: amount } : p))
      updateCart(cartUpdated)
    } catch {
      toast.error('Erro na alteração de quantidade do produto')
    }
  }

  return (
    <CartContext.Provider value={{ cart, addProduct, removeProduct, updateProductAmount }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart(): CartContextData {
  const context = useContext(CartContext)

  return context
}
