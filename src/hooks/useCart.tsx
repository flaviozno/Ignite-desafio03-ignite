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
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const updatedCart = [...cart]
      const exist = updatedCart.find(product => product.id === productId)

      const stock = await api.get(`/stock/${productId}`)
        .then(response => response.data.amount)

      const thisAmount = exist ? exist.amount : 0

      if ((thisAmount + 1) > stock) {
        toast.error('Estoque insuficiente')
        return
      }

      if (exist) {
        exist.amount = thisAmount + 1;
      } else {
        const newProduct = await api.get(`/products/${productId}`)
        const newCart = {
          ...newProduct.data,
          amount: 1
        }

        updatedCart.push(newCart)
      }

      setCart(updatedCart)
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart))

    } catch {
      toast.error('Erro ao adicionar um produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const updatedCart = [...cart];
      const productIndex = updatedCart.findIndex(product => product.id === productId);

      if (productIndex >= 0) {
        updatedCart.splice(productIndex, 1);
        setCart(updatedCart);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
      } else {
        toast.error('Erro na remoção do produto');
      }

    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) {
        return;
      }

      const stock = await api.get(`/stock/${productId}`).then(response => response.data.amount);

      if (amount >= stock) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const updatedCart = [...cart];
      const exist = updatedCart.find(product => product.id === productId);

      if (exist) {
        exist.amount = amount;
        setCart(updatedCart);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
      } else {
        toast.error('Erro ao alterar a quantidade do produto');
      }
    } catch {
      toast.error('Erro ao alterar a quantidade do produto');
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
