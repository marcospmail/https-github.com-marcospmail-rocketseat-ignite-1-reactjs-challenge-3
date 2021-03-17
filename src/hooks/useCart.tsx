import { useCallback, useEffect } from 'react';
import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart')

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const saveCartToLocalStorage = (cart: Product[]) => {
    localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart))
  }

  const fetchProduct = async (productId: number): Promise<Product> => {
    const response = await api.get(`/products/${productId}`)
    return response.data
  }

  async function fetchProductStock(productId: number): Promise<Stock> {
    const productStock = await api.get<Stock>(`/stock/${productId}`)
    return productStock.data
  }

  const addProduct = async (productId: number) => {
    try {
      const productInCart = cart.find(c => c.id === productId);

      const requestedAmount = productInCart ? productInCart.amount + 1 : 1;

      const hasStock = await checkForStock({ productId, requestedAmount })

      if (!hasStock) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      if (productInCart) {
        const updatedProductInCart = { ...productInCart, amount: requestedAmount }

        const newCart = cart.map(c => c.id === productId ? updatedProductInCart : c)
        setCart(newCart)
        saveCartToLocalStorage(newCart)

      }
      else {
        const product = await fetchProduct(productId)
        product.amount = requestedAmount

        const newCart = [...cart, product]
        setCart(newCart)
        saveCartToLocalStorage(newCart)
      }

    } catch (err) {
      toast.error('Erro na adição do produto')
    }
  };

  const removeProduct = (productId: number) => {
    const productFound = cart.find(c => c.id === productId)

    if (!productFound) {
      toast.error('Erro na remoção do produto')
      return
    }

    const newCart = cart.filter(p => p.id !== productId)
    setCart(oldCart => newCart);
    saveCartToLocalStorage(newCart)
  };

  const checkForStock = async ({ productId, requestedAmount }: { productId: number, requestedAmount: number }): Promise<boolean> => {
    const productStock = await fetchProductStock(productId);
    return productStock && productStock.amount >= requestedAmount;
  }

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) {
        return;
      }

      const hasStock = await checkForStock({ productId, requestedAmount: amount })

      if (!hasStock) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const newCart = cart.map(p => p.id === productId ? { ...p, amount } : p)
      setCart(newCart)
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart))

    } catch {
      toast.error('Erro na alteração de quantidade do produto')
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
